/**
 * Script to import indexer definitions from Prowlarr
 * 
 * This script can fetch indexer data from:
 * 1. Prowlarr API (if you have a running instance and API key)
 * 2. Prowlarr Web UI (web scraping with login credentials)
 * 3. Prowlarr's GitHub repository (Cardigann YAML files)
 * 4. Manual CSV/JSON data
 * 
 * Usage:
 *   # Using API (requires API key)
 *   node scripts/importIndexersFromProwlarr.js --source=api --url=http://localhost:9696 --apikey=YOUR_API_KEY
 * 
 *   # Using Web Scraping (requires username and password)
 *   node scripts/importIndexersFromProwlarr.js --source=web --url=https://prowlarr.portkeylabs.net --username=USER --password=PASS
 * 
 *   # From GitHub
 *   node scripts/importIndexersFromProwlarr.js --source=github
 * 
 *   # From manual file
 *   node scripts/importIndexersFromProwlarr.js --source=manual --file=indexers.csv
 */

const axios = require("axios");
const fs = require("fs").promises;
const path = require("path");
const yaml = require("js-yaml");
const cheerio = require("cheerio");
const { sequelize } = require("../config/database");
const AvailableIndexers = require("../models/AvailableIndexers");

// Parse command line arguments
const args = process.argv.slice(2);
const getArg = (name, defaultValue = null) => {
  const arg = args.find((a) => a.startsWith(`--${name}=`));
  return arg ? arg.split("=")[1] : defaultValue;
};

const source = getArg("source", "api");
const prowlarrUrl = getArg("url", "http://localhost:9696");
const prowlarrApiKey = getArg("apikey", "");
const manualFile = getArg("file", null);
const prowlarrUsername = getArg("username", "");
const prowlarrPassword = getArg("password", "");

/**
 * Fetch indexers from Prowlarr API
 */
async function fetchFromProwlarrAPI() {
  console.log(`Fetching indexers from Prowlarr API at ${prowlarrUrl}...`);
  
  try {
    const headers = {};
    if (prowlarrApiKey) {
      headers["X-Api-Key"] = prowlarrApiKey;
    }

    // Get all indexer schemas
    const schemasResponse = await axios.get(
      `${prowlarrUrl}/api/v1/indexer/schema`,
      { headers }
    );

    const indexers = [];
    
    for (const schema of schemasResponse.data) {
      try {
        // Get detailed schema for each indexer
        const detailResponse = await axios.get(
          `${prowlarrUrl}/api/v1/indexer/schema`,
          {
            params: {
              implementation: schema.implementation,
              configContract: schema.configContract,
              name: schema.name,
            },
            headers,
          }
        );

        const detail = detailResponse.data;
        
        // Extract base URLs
        const baseUrls = [
          ...(detail.indexerUrls || []),
          ...(detail.legacyUrls || []),
        ].filter(Boolean);

        // Extract categories from capabilities
        let categories = [];
        
        // Method 1: From capabilities.categories (array of category objects)
        if (detail.capabilities?.categories && Array.isArray(detail.capabilities.categories)) {
          categories = detail.capabilities.categories.map((c) => {
            // Categories can be objects with id/name or just strings
            if (typeof c === "string") return c;
            return c.name || c.id || String(c);
          });
        }
        
        // Method 2: From categorymappings (if categories array is empty)
        if (categories.length === 0 && detail.capabilities?.categorymappings) {
          const mappings = detail.capabilities.categorymappings;
          if (Array.isArray(mappings)) {
            categories = mappings.map((m) => {
              // Mapping can have: id, cat (category name), desc (description)
              return m.cat || m.name || String(m.id || "");
            }).filter(cat => cat && cat.length > 0);
          }
        }
        
        // Method 3: Extract unique category names from all category mappings
        if (categories.length === 0 && detail.capabilities?.categorymappings) {
          const mappings = detail.capabilities.categorymappings;
          if (Array.isArray(mappings)) {
            const uniqueCategories = new Set();
            mappings.forEach((m) => {
              if (m.cat) uniqueCategories.add(m.cat);
              if (m.name) uniqueCategories.add(m.name);
            });
            categories = Array.from(uniqueCategories);
          }
        }

        indexers.push({
          name: detail.name || schema.name,
          protocol: detail.protocol === "Usenet" ? "nzb" : "torrent",
          language: detail.language || "en-US",
          description: detail.description || "",
          privacy: detail.privacy || "Public",
          categories: categories,
          availableBaseUrls: baseUrls,
          indexerType: detail.implementation || "Cardigann",
          implementation: detail.implementation || "Cardigann",
          definitionData: detail,
        });
      } catch (err) {
        console.warn(`Failed to fetch details for ${schema.name}:`, err.message);
      }
    }

    console.log(`Fetched ${indexers.length} indexers from Prowlarr API`);
    return indexers;
  } catch (error) {
    console.error("Error fetching from Prowlarr API:", error.message);
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", error.response.data);
    }
    throw error;
  }
}

/**
 * Web scraping: Login to Prowlarr and get session cookie
 */
async function loginToProwlarr(baseUrl, username, password) {
  console.log(`Logging in to Prowlarr at ${baseUrl}...`);
  
  const client = axios.create({
    baseURL: baseUrl,
    withCredentials: true,
    maxRedirects: 0,
    validateStatus: (status) => status >= 200 && status < 400,
  });

  try {
    // Get login page first to get any CSRF tokens or cookies
    const loginPageResponse = await client.get("/login", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    // Extract cookies from initial response
    const cookies = loginPageResponse.headers["set-cookie"] || [];
    const cookieHeader = cookies.map(c => c.split(';')[0]).join('; ');

    // Perform login
    const loginPayload = new URLSearchParams();
    loginPayload.append("username", username);
    loginPayload.append("password", password);

    const loginResponse = await client.post("/login", loginPayload.toString(), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Cookie": cookieHeader,
        "Referer": `${baseUrl}/login`,
      },
      maxRedirects: 0,
      validateStatus: (status) => status >= 200 && status < 400,
    });

    // Extract authentication cookie
    const authCookies = loginResponse.headers["set-cookie"] || [];
    const authCookie = authCookies.find(c => c.includes("Auth="));
    
    if (!authCookie) {
      throw new Error("Authentication cookie not found. Login may have failed.");
    }

    const cookieValue = authCookie.split(';')[0];
    console.log("✅ Login successful");
    
    return { client, cookie: cookieValue };
  } catch (error) {
    console.error("❌ Login failed:", error.message);
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response headers:", error.response.headers);
    }
    throw error;
  }
}

/**
 * Extract API key from Prowlarr settings page
 */
async function extractApiKey(client, cookie) {
  try {
    console.log("Attempting to extract API key from settings...");
    
    const settingsResponse = await client.get("/settings/general", {
      headers: {
        "Cookie": cookie,
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    const $ = cheerio.load(settingsResponse.data);
    
    // Try to find API key in various places
    // 1. Look for input field with name containing "api" or "key"
    let apiKey = $('input[name*="api"][name*="key"]').val() || 
                 $('input[name*="ApiKey"]').val() ||
                 $('input[id*="api"][id*="key"]').val() ||
                 $('input[id*="ApiKey"]').val();
    
    // 2. Look in script tags for API key
    if (!apiKey) {
      $('script').each((i, elem) => {
        const scriptContent = $(elem).html() || '';
        const match = scriptContent.match(/api[_-]?key["\s:=]+["']?([a-f0-9]{32})["']?/i);
        if (match) {
          apiKey = match[1];
          return false; // break
        }
      });
    }

    if (apiKey) {
      console.log("✅ API key extracted from settings");
      return apiKey;
    } else {
      console.log("⚠️  API key not found in settings, will use web scraping");
      return null;
    }
  } catch (error) {
    console.warn("⚠️  Could not extract API key:", error.message);
    return null;
  }
}

/**
 * Fetch indexers by scraping the Prowlarr web UI
 */
async function fetchFromProwlarrWeb(baseUrl, username, password) {
  console.log(`Scraping indexers from Prowlarr web UI at ${baseUrl}...`);
  
  if (!username || !password) {
    throw new Error("Username and password required for web scraping. Use --username=USER --password=PASS");
  }

  // Login and get session
  const { client, cookie } = await loginToProwlarr(baseUrl, username, password);
  
  // Try to use API with session cookie first (most reliable)
  console.log("Attempting to use Prowlarr API with session cookie...");
  try {
    const indexers = await fetchFromProwlarrAPIWithCookie(client, cookie, baseUrl);
    if (indexers && indexers.length > 0) {
      console.log(`✅ Successfully fetched ${indexers.length} indexers via API`);
      return indexers;
    }
  } catch (error) {
    console.warn("API with cookie failed, trying API key extraction...", error.message);
  }

  // Try to get API key first (easier than scraping)
  let apiKey = await extractApiKey(client, cookie);
  
  // If we got an API key, use the API method (more reliable)
  if (apiKey) {
    console.log("Using API method with extracted API key...");
    try {
      return await fetchFromProwlarrAPIWithKey(baseUrl, apiKey);
    } catch (error) {
      console.warn("API method failed, falling back to web scraping:", error.message);
    }
  }

  // Fall back to web scraping
  console.log("Scraping 'Add Indexer' page...");
  const addIndexerResponse = await client.get("/add", {
    headers: {
      "Cookie": cookie,
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });

  const $ = cheerio.load(addIndexerResponse.data);
  const indexers = [];

  // Try multiple selectors based on Prowlarr's React-based UI
  // Based on the HTML structure: tr with class TableRowButton-row-*
  let rows = $("tbody tr.TableRowButton-row, tbody tr[class*='TableRowButton-row'], tbody tr[class*='TableRow']").filter((i, el) => {
    const $row = $(el);
    // Look for rows that have 6 cells (Protocol, Name, Language, Description, Privacy, Categories)
    const cellCount = $row.find("td").length;
    return cellCount >= 6 && !$row.hasClass("list-header");
  });

  // If no rows found, try looking for React-rendered content in script tags
  if (rows.length === 0) {
    console.log("No rows found in table, checking for React-rendered content...");
    
    // Look for script tags that might contain indexer data
    $('script[type="application/json"], script[type="text/json"]').each((i, el) => {
      try {
        const jsonData = JSON.parse($(el).html());
        if (Array.isArray(jsonData) && jsonData.length > 0 && jsonData[0].name) {
          console.log(`Found ${jsonData.length} indexers in JSON script tag`);
          // Process JSON data directly
          jsonData.forEach((item) => {
            indexers.push({
              name: item.name || "",
              protocol: (item.protocol || item.type || "torrent").toLowerCase() === "usenet" ? "nzb" : "torrent",
              language: item.language || "en-US",
              description: item.description || "",
              privacy: mapPrivacy(item.privacy || "Public"),
              categories: item.categories || [],
              availableBaseUrls: item.indexerUrls || item.links || [],
              indexerType: item.implementation || "Cardigann",
              implementation: item.implementation || "Cardigann",
            });
          });
          return false; // break
        }
      } catch (e) {
        // Not JSON or invalid, continue
      }
    });
  }

  console.log(`Found ${rows.length} potential indexer rows in HTML table`);

  // Only process HTML rows if we didn't already get data from JSON
  if (indexers.length === 0 && rows.length > 0) {
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const $row = $(row);

      try {
        // Extract indexer data from table row
        // Based on the HTML structure: Protocol, Name, Language, Description, Privacy, Categories
        const cells = $row.find("td");
        if (cells.length < 6) {
          console.warn(`Row ${i} has only ${cells.length} cells, skipping`);
          continue;
        }

        // Column 0: Protocol (in a span with class ProtocolLabel-*)
        const $protocolCell = $row.find("td:eq(0), td:first-child");
        const protocolText = $protocolCell.find("span[class*='ProtocolLabel'], .ProtocolLabel-torrent, .ProtocolLabel-nzb").text().trim().toLowerCase() || 
                            $protocolCell.text().trim().toLowerCase();
        const protocol = protocolText.includes("nzb") || protocolText.includes("usenet") ? "nzb" : "torrent";

        // Column 1: Name (plain text in td)
        const name = $row.find("td:eq(1), td:nth-child(2)").text().trim().replace(/\s+/g, " ");

        // Column 2: Language (plain text in td)
        const language = $row.find("td:eq(2), td:nth-child(3)").text().trim() || "en-US";

        // Column 3: Description (plain text in td)
        const description = $row.find("td:eq(3), td:nth-child(4)").text().trim() || "";

        // Column 4: Privacy (in a span with class PrivacyLabel-*)
        const $privacyCell = $row.find("td:eq(4), td:nth-child(5)");
        const privacyClass = $privacyCell.find("span[class*='PrivacyLabel']").attr("class") || "";
        let privacy = "Public";
        if (privacyClass.includes("privateLabel") && !privacyClass.includes("semi")) {
          privacy = "Private";
        } else if (privacyClass.includes("semiPrivateLabel") || privacyClass.includes("semi")) {
          privacy = "Semi-Private";
        } else {
          // Fallback to text content
          const privacyText = $privacyCell.text().trim().toLowerCase();
          if (privacyText.includes("private") && !privacyText.includes("semi")) {
            privacy = "Private";
          } else if (privacyText.includes("semi")) {
            privacy = "Semi-Private";
          }
        }

        // Column 5: Categories (spans with class Label-label, title attribute contains category ID)
        const $categoryCell = $row.find("td:eq(5), td:nth-child(6)");
        const categories = [];
        $categoryCell.find("span.Label-label, span[class*='Label-label']").each((idx, el) => {
          const $label = $(el);
          // Get category name from text content
          const catName = $label.text().trim();
          // Get category ID from title attribute (e.g., "2000" for Movies)
          const catId = $label.attr("title");
          
          if (catName && catName.length > 0) {
            // Store both name and ID if available
            if (catId) {
              categories.push({
                id: parseInt(catId) || catId,
                name: catName
              });
            } else {
              categories.push(catName);
            }
          }
        });

        if (!name || name.length === 0) {
          console.warn(`Skipping row ${i}: No name found`);
          continue;
        }

        // Try to get base URLs for this indexer
        // This might require clicking on the row or making an API call
        let baseUrls = [];
        try {
          baseUrls = await fetchIndexerBaseUrls(client, cookie, name, baseUrl);
        } catch (err) {
          console.warn(`Could not fetch base URLs for ${name}:`, err.message);
        }

        // Convert categories to array of strings (for compatibility)
        const categoryNames = categories.map(cat => typeof cat === "string" ? cat : cat.name);

        indexers.push({
          name: name,
          protocol: protocol,
          language: language,
          description: description,
          privacy: mapPrivacy(privacy),
          categories: categoryNames.length > 0 ? categoryNames : parseCategories(description),
          availableBaseUrls: baseUrls,
          indexerType: "Cardigann",
          implementation: "Cardigann",
        });

        console.log(`  ✓ ${name} (${protocol}) - ${categoryNames.length} categories`);
      } catch (err) {
        console.warn(`Error parsing row ${i}:`, err.message);
        console.warn(`Row HTML:`, $row.html().substring(0, 200));
      }
    }
  }

  console.log(`\nScraped ${indexers.length} indexers from web UI`);
  return indexers;
}

/**
 * Fetch base URLs for a specific indexer
 * Tries API first, then falls back to scraping
 */
async function fetchIndexerBaseUrls(client, cookie, indexerName, baseUrl) {
  // Try to get from API schema endpoint with all implementations
  try {
    // First, get all schemas to find the right one
    const allSchemasResponse = await client.get("/api/v1/indexer/schema", {
      headers: {
        "Cookie": cookie,
        "Accept": "application/json",
      },
    });

    // Find the schema matching this indexer name
    const matchingSchema = allSchemasResponse.data.find(
      (s) => s.name === indexerName
    );

    if (matchingSchema) {
      // Get detailed schema
      const detailResponse = await client.get("/api/v1/indexer/schema", {
        params: {
          implementation: matchingSchema.implementation,
          configContract: matchingSchema.configContract,
          name: matchingSchema.name,
        },
        headers: {
          "Cookie": cookie,
          "Accept": "application/json",
        },
      });

      if (detailResponse.data) {
        const baseUrls = [
          ...(detailResponse.data.indexerUrls || []),
          ...(detailResponse.data.legacyUrls || []),
        ].filter(Boolean);
        
        if (baseUrls.length > 0) {
          return baseUrls;
        }
      }
    }
  } catch (err) {
    // API failed, continue to scraping
    console.warn(`API fetch failed for ${indexerName}:`, err.message);
  }

  // Try scraping the indexer detail page or modal
  // This would require simulating a click or fetching a detail endpoint
  // For now, return empty array - base URLs can be added manually or via API later
  return [];
}

/**
 * Fetch from Prowlarr API using session cookie
 */
async function fetchFromProwlarrAPIWithCookie(client, cookie, baseUrl) {
  console.log(`Fetching indexers from Prowlarr API at ${baseUrl} using session cookie...`);
  
  try {
    const headers = {
      "Cookie": cookie,
      "Accept": "application/json",
    };

    // Get all indexer schemas
    const schemasResponse = await client.get("/api/v1/indexer/schema", { headers });

    if (!schemasResponse.data || !Array.isArray(schemasResponse.data)) {
      throw new Error("Invalid response from API");
    }

    const indexers = [];
    
    for (const schema of schemasResponse.data) {
      try {
        // Get detailed schema for each indexer
        const detailResponse = await client.get("/api/v1/indexer/schema", {
          params: {
            implementation: schema.implementation,
            configContract: schema.configContract,
            name: schema.name,
          },
          headers,
        });

        const detail = detailResponse.data;
        
        // Extract base URLs
        const baseUrls = [
          ...(detail.indexerUrls || []),
          ...(detail.legacyUrls || []),
        ].filter(Boolean);

        // Extract categories from capabilities
        let categories = [];
        
        // Method 1: From capabilities.categories (array of category objects)
        if (detail.capabilities?.categories && Array.isArray(detail.capabilities.categories)) {
          categories = detail.capabilities.categories.map((c) => {
            // Categories can be objects with id/name or just strings
            if (typeof c === "string") return c;
            return c.name || c.id || String(c);
          });
        }
        
        // Method 2: From categorymappings (if categories array is empty)
        if (categories.length === 0 && detail.capabilities?.categorymappings) {
          const mappings = detail.capabilities.categorymappings;
          if (Array.isArray(mappings)) {
            categories = mappings.map((m) => {
              // Mapping can have: id, cat (category name), desc (description)
              return m.cat || m.name || String(m.id || "");
            }).filter(cat => cat && cat.length > 0);
          }
        }
        
        // Method 3: Extract unique category names from all category mappings
        if (categories.length === 0 && detail.capabilities?.categorymappings) {
          const mappings = detail.capabilities.categorymappings;
          if (Array.isArray(mappings)) {
            const uniqueCategories = new Set();
            mappings.forEach((m) => {
              if (m.cat) uniqueCategories.add(m.cat);
              if (m.name) uniqueCategories.add(m.name);
            });
            categories = Array.from(uniqueCategories);
          }
        }

        indexers.push({
          name: detail.name || schema.name,
          protocol: detail.protocol === "Usenet" ? "nzb" : "torrent",
          language: detail.language || "en-US",
          description: detail.description || "",
          privacy: detail.privacy || "Public",
          categories: categories,
          availableBaseUrls: baseUrls,
          indexerType: detail.implementation || "Cardigann",
          implementation: detail.implementation || "Cardigann",
          definitionData: detail,
        });
      } catch (err) {
        console.warn(`Failed to fetch details for ${schema.name}:`, err.message);
      }
    }

    console.log(`Fetched ${indexers.length} indexers from Prowlarr API`);
    return indexers;
  } catch (error) {
    console.error("Error fetching from Prowlarr API with cookie:", error.message);
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", error.response.data);
    }
    throw error;
  }
}

/**
 * Fetch from Prowlarr API using provided API key
 */
async function fetchFromProwlarrAPIWithKey(baseUrl, apiKey) {
  console.log(`Fetching indexers from Prowlarr API at ${baseUrl}...`);
  
  try {
    const headers = {
      "X-Api-Key": apiKey,
    };

    // Get all indexer schemas
    const schemasResponse = await axios.get(
      `${baseUrl}/api/v1/indexer/schema`,
      { headers }
    );

    const indexers = [];
    
    for (const schema of schemasResponse.data) {
      try {
        // Get detailed schema for each indexer
        const detailResponse = await axios.get(
          `${baseUrl}/api/v1/indexer/schema`,
          {
            params: {
              implementation: schema.implementation,
              configContract: schema.configContract,
              name: schema.name,
            },
            headers,
          }
        );

        const detail = detailResponse.data;
        
        // Extract base URLs
        const baseUrls = [
          ...(detail.indexerUrls || []),
          ...(detail.legacyUrls || []),
        ].filter(Boolean);

        // Extract categories from capabilities
        let categories = [];
        
        // Method 1: From capabilities.categories (array of category objects)
        if (detail.capabilities?.categories && Array.isArray(detail.capabilities.categories)) {
          categories = detail.capabilities.categories.map((c) => {
            // Categories can be objects with id/name or just strings
            if (typeof c === "string") return c;
            return c.name || c.id || String(c);
          });
        }
        
        // Method 2: From categorymappings (if categories array is empty)
        if (categories.length === 0 && detail.capabilities?.categorymappings) {
          const mappings = detail.capabilities.categorymappings;
          if (Array.isArray(mappings)) {
            categories = mappings.map((m) => {
              // Mapping can have: id, cat (category name), desc (description)
              return m.cat || m.name || String(m.id || "");
            }).filter(cat => cat && cat.length > 0);
          }
        }
        
        // Method 3: Extract unique category names from all category mappings
        if (categories.length === 0 && detail.capabilities?.categorymappings) {
          const mappings = detail.capabilities.categorymappings;
          if (Array.isArray(mappings)) {
            const uniqueCategories = new Set();
            mappings.forEach((m) => {
              if (m.cat) uniqueCategories.add(m.cat);
              if (m.name) uniqueCategories.add(m.name);
            });
            categories = Array.from(uniqueCategories);
          }
        }

        indexers.push({
          name: detail.name || schema.name,
          protocol: detail.protocol === "Usenet" ? "nzb" : "torrent",
          language: detail.language || "en-US",
          description: detail.description || "",
          privacy: detail.privacy || "Public",
          categories: categories,
          availableBaseUrls: baseUrls,
          indexerType: detail.implementation || "Cardigann",
          implementation: detail.implementation || "Cardigann",
          definitionData: detail,
        });
      } catch (err) {
        console.warn(`Failed to fetch details for ${schema.name}:`, err.message);
      }
    }

    console.log(`Fetched ${indexers.length} indexers from Prowlarr API`);
    return indexers;
  } catch (error) {
    console.error("Error fetching from Prowlarr API:", error.message);
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", error.response.data);
    }
    throw error;
  }
}

/**
 * Recursively fetch YAML files from a GitHub directory
 */
async function fetchYamlFilesFromDir(dirUrl) {
  const files = [];
  
  try {
    const response = await axios.get(dirUrl, {
      headers: {
        Accept: "application/vnd.github.v3+json",
      },
    });

    for (const item of response.data) {
      if (item.type === "dir") {
        // Recursively fetch from subdirectories
        const subFiles = await fetchYamlFilesFromDir(item.url);
        files.push(...subFiles);
      } else if (item.type === "file" && (item.name.endsWith(".yml") || item.name.endsWith(".yaml"))) {
        files.push(item);
      }
    }
  } catch (error) {
    console.warn(`Error fetching directory ${dirUrl}:`, error.message);
  }
  
  return files;
}

/**
 * Fetch indexers from Prowlarr's GitHub repository
 */
async function fetchFromGitHub() {
  console.log("Fetching indexers from Prowlarr's GitHub repository...");
  
  try {
    // The definitions are organized in versioned directories (v1, v2, etc.)
    const repoUrl = "https://api.github.com/repos/Prowlarr/Indexers/contents/definitions";
    
    // Recursively fetch all YAML files
    console.log("Scanning repository structure...");
    const yamlFiles = await fetchYamlFilesFromDir(repoUrl);
    
    console.log(`Found ${yamlFiles.length} YAML files to process`);

    const indexers = [];
    let processed = 0;
    
    for (const file of yamlFiles) {
      try {
        // Fetch the file content
        const fileResponse = await axios.get(file.download_url, {
          headers: {
            Accept: "application/vnd.github.v3.raw",
          },
        });
        
        const yamlContent = fileResponse.data;
        const definition = yaml.load(yamlContent);

        // Extract data
        const name = definition.name || file.name.replace(/\.(yml|yaml)$/, "");
        const links = definition.links || [];
        
        // Extract categories from multiple possible locations in YAML
        let categories = [];
        
        // Method 1: Direct categories array
        if (definition.categories && Array.isArray(definition.categories)) {
          categories = definition.categories.map((cat) => {
            if (typeof cat === "string") return cat;
            return cat.name || cat.id || String(cat);
          });
        }
        
        // Method 2: From caps.categorymappings (more common in Cardigann definitions)
        if (definition.caps?.categorymappings && Array.isArray(definition.caps.categorymappings)) {
          const mappedCategories = definition.caps.categorymappings.map((mapping) => {
            // Mapping can have: id, cat (category name), desc (description)
            return mapping.cat || mapping.name || String(mapping.id || "");
          }).filter(cat => cat && cat.length > 0);
          
          if (mappedCategories.length > 0) {
            categories = mappedCategories;
          }
        }
        
        // Method 3: From caps.categories (less common)
        if (categories.length === 0 && definition.caps?.categories) {
          if (Array.isArray(definition.caps.categories)) {
            categories = definition.caps.categories.map((cat) => {
              if (typeof cat === "string") return cat;
              return cat.name || cat.id || String(cat);
            });
          } else if (typeof definition.caps.categories === "object") {
            // Categories might be an object with keys as category IDs
            categories = Object.keys(definition.caps.categories).map(key => {
              const cat = definition.caps.categories[key];
              return typeof cat === "string" ? cat : (cat.name || cat || key);
            });
          }
        }
        
        // Fallback: Extract from description if no categories found
        if (categories.length === 0 && definition.description) {
          categories = parseCategories(definition.description);
        }

        indexers.push({
          name: name,
          protocol: definition.type === "usenet" ? "nzb" : "torrent",
          language: definition.language || "en-US",
          description: definition.description || "",
          privacy: mapPrivacy(definition.privacymode || "public"),
          categories: categories,
          availableBaseUrls: links,
          indexerType: "Cardigann",
          implementation: "Cardigann",
          definitionData: definition,
        });
        
        processed++;
        if (processed % 50 === 0) {
          console.log(`  Processed ${processed}/${yamlFiles.length} files...`);
        }
      } catch (err) {
        console.warn(`Failed to parse ${file.name}:`, err.message);
      }
    }

    console.log(`Fetched ${indexers.length} indexers from GitHub`);
    return indexers;
  } catch (error) {
    console.error("Error fetching from GitHub:", error.message);
    throw error;
  }
}

/**
 * Import from manual CSV/JSON file
 */
async function fetchFromManualFile() {
  if (!manualFile) {
    throw new Error("--file parameter required when using --source=manual");
  }

  console.log(`Reading indexers from ${manualFile}...`);
  
  const fileContent = await fs.readFile(manualFile, "utf-8");
  const ext = path.extname(manualFile).toLowerCase();
  
  let data;
  if (ext === ".json") {
    data = JSON.parse(fileContent);
  } else if (ext === ".csv") {
    // Parse CSV (simple implementation)
    const lines = fileContent.split("\n").filter((l) => l.trim());
    const headers = lines[0].split("\t");
    data = lines.slice(1).map((line) => {
      const values = line.split("\t");
      const obj = {};
      headers.forEach((header, i) => {
        obj[header.trim()] = values[i]?.trim() || "";
      });
      return obj;
    });
  } else {
    throw new Error(`Unsupported file format: ${ext}`);
  }

  // Transform to our format
  const indexers = Array.isArray(data) ? data : [data];
  
  return indexers.map((item) => ({
    name: item.Name || item.name,
    protocol: (item.Protocol || item.protocol || "torrent").toLowerCase(),
    language: item.Language || item.language || "en-US",
    description: item.Description || item.description || "",
    privacy: mapPrivacy(item.Privacy || item.privacy || "Public"),
    categories: parseCategories(item.Categories || item.categories || ""),
    availableBaseUrls: [], // Will need to be fetched separately
    indexerType: "Cardigann",
    implementation: "Cardigann",
  }));
}

/**
 * Map privacy string to our enum
 */
function mapPrivacy(privacy) {
  const lower = (privacy || "").toLowerCase();
  if (lower.includes("private")) return "Private";
  if (lower.includes("semi")) return "Semi-Private";
  return "Public";
}

/**
 * Parse categories string (e.g., "MoviesAudioPCTVXXXBooksOther")
 */
function parseCategories(categoriesStr) {
  if (!categoriesStr) return [];
  if (Array.isArray(categoriesStr)) return categoriesStr;
  
  // Split by common delimiters or by capital letters
  return categoriesStr
    .split(/(?=[A-Z])/)
    .filter((c) => c.trim().length > 0);
}

/**
 * Save indexers to database
 */
async function saveIndexers(indexers) {
  console.log(`Saving ${indexers.length} indexers to database...`);
  
  let saved = 0;
  let updated = 0;
  let errors = 0;

  for (const indexer of indexers) {
    try {
      const [instance, created] = await AvailableIndexers.upsert(
        {
          name: indexer.name,
          protocol: indexer.protocol,
          language: indexer.language,
          description: indexer.description,
          privacy: indexer.privacy,
          categories: indexer.categories || [],
          availableBaseUrls: indexer.availableBaseUrls || [],
          indexerType: indexer.indexerType || "Cardigann",
          implementation: indexer.implementation || "Cardigann",
          definitionData: indexer.definitionData || null,
        },
        {
          returning: true,
        }
      );

      if (created) {
        saved++;
      } else {
        updated++;
      }
    } catch (err) {
      console.error(`Error saving ${indexer.name}:`, err.message);
      errors++;
    }
  }

  console.log(`\nImport complete:`);
  console.log(`  - Saved: ${saved}`);
  console.log(`  - Updated: ${updated}`);
  console.log(`  - Errors: ${errors}`);
}

/**
 * Main function
 */
async function main() {
  try {
    await sequelize.authenticate();
    console.log("Database connected");

    // Sync the model
    await AvailableIndexers.sync({ alter: true });
    console.log("AvailableIndexers model synced");

    let indexers;

    switch (source) {
      case "api":
        indexers = await fetchFromProwlarrAPI();
        break;
      case "web":
      case "scrape":
        if (!prowlarrUsername || !prowlarrPassword) {
          throw new Error("Username and password required for web scraping. Use --username=USER --password=PASS");
        }
        indexers = await fetchFromProwlarrWeb(prowlarrUrl, prowlarrUsername, prowlarrPassword);
        break;
      case "github":
        indexers = await fetchFromGitHub();
        break;
      case "manual":
        indexers = await fetchFromManualFile();
        break;
      default:
        throw new Error(`Unknown source: ${source}. Use 'api', 'web', 'github', or 'manual'`);
    }

    await saveIndexers(indexers);
    
    console.log("\n✅ Import completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Import failed:", error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { 
  fetchFromProwlarrAPI, 
  fetchFromProwlarrWeb,
  fetchFromGitHub, 
  fetchFromManualFile 
};

