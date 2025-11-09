const axios = require("axios");
const { XMLParser } = require("fast-xml-parser");
const cheerio = require("cheerio");

// Import our new scraper system
const scraperManager = require("../scrapers");

// Parse Torznab/Newznab XML response
function parseIndexerResponse(xmlData, indexerName, protocol) {
  try {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
      textNodeName: "#text",
    });
    const result = parser.parse(xmlData);

    const items = [];
    const rss = result.rss || result;
    const channel = rss.channel || rss;

    if (!channel || !channel.item) {
      return items;
    }

    const itemsArray = Array.isArray(channel.item) ? channel.item : [channel.item];

    itemsArray.forEach((item) => {
      const title = item.title || "";
      const link = item.link || "";
      const guid = item.guid?.["#text"] || item.guid || link;
      const pubDate = item.pubDate || "";
      const description = item.description || "";
      const enclosure = item.enclosure || {};
      const size = enclosure["@_length"] ? parseInt(enclosure["@_length"]) : 0;
      const category = item.category || [];

      // Parse categories
      const categories = Array.isArray(category)
        ? category.map((cat) => {
            const catId = typeof cat === "string" ? parseInt(cat) : (cat["@_id"] ? parseInt(cat["@_id"]) : parseInt(cat["#text"] || cat));
            return isNaN(catId) ? 0 : catId;
          })
        : [typeof category === "string" ? parseInt(category) : (category["@_id"] ? parseInt(category["@_id"]) : parseInt(category["#text"] || category)) || 0];

      // Parse attributes (Torznab extensions)
      const attributes = item["torznab:attr"] || item.attr || [];
      const attrsArray = Array.isArray(attributes) ? attributes : [attributes];
      
      let seeders = null;
      let leechers = null;
      let grabs = 0;
      let publishDate = new Date(pubDate);

      attrsArray.forEach((attr) => {
        const name = attr["@_name"];
        const value = attr["@_value"];
        
        if (name === "seeders") seeders = parseInt(value) || 0;
        if (name === "peers") leechers = parseInt(value) || 0;
        if (name === "grabs") grabs = parseInt(value) || 0;
        if (name === "publishdate") {
          try {
            publishDate = new Date(parseInt(value) * 1000);
          } catch (e) {
            publishDate = new Date(pubDate);
          }
        }
      });

      // Calculate age in days
      const now = new Date();
      const age = Math.floor((now - publishDate) / (1000 * 60 * 60 * 24));
      const ageFormatted = age === 0 ? "Today" : age === 1 ? "1 day" : `${age} days`;

      items.push({
        id: `${indexerName}-${guid}`,
        protocol: protocol,
        age: age,
        ageFormatted: ageFormatted,
        title: title,
        indexer: indexerName,
        size: size / (1024 * 1024 * 1024), // Convert bytes to GiB for sorting
        sizeFormatted: formatSize(size), // Formatted string for display
        grabs: grabs,
        peers: protocol === "torrent" && seeders !== null && leechers !== null ? `${seeders}/${leechers}` : null,
        seeders: seeders,
        leechers: leechers,
        categories: categories.filter(c => !isNaN(c) && c > 0),
        publishDate: publishDate.toISOString(),
        downloadUrl: link,
        guid: guid,
        description: description,
      });
    });

    return items;
  } catch (error) {
    console.error(`Error parsing response from ${indexerName}:`, error.message);
    return [];
  }
}

function formatSize(bytes) {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = bytes / Math.pow(k, i);
  return `${size.toFixed(1)} ${sizes[i]}`;
}

// Parse The Pirate Bay API (apibay.org) JSON response
function parseTPBApiResponse(jsonData, indexerName) {
  try {
    const results = [];
    
    // The API returns an array of objects
    if (!Array.isArray(jsonData)) {
      console.log(`[${indexerName}] API response is not an array`);
      return [];
    }
    
    jsonData.forEach((item, index) => {
      try {
        // Skip if it's the "No results" marker (id: "0")
        if (!item.id || item.id === "0") {
          return;
        }
        
        const id = item.id || "";
        const name = item.name || "";
        const infoHash = item.info_hash || "";
        const size = parseInt(item.size || "0");
        const seeders = parseInt(item.seeders || "0");
        const leechers = parseInt(item.leechers || "0");
        const status = item.status || "";
        const added = parseInt(item.added || "0"); // Unix timestamp
        const category = item.category || "";
        
        if (!name || !id) {
          return;
        }
        
        // Calculate age from timestamp
        const publishDate = new Date(added * 1000);
        const now = new Date();
        const age = Math.floor((now - publishDate) / (1000 * 60 * 60 * 24));
        const ageFormatted = age === 0 ? "Today" : age === 1 ? "1 day" : `${age} days`;
        
        // Build magnet link
        const magnetLink = `magnet:?xt=urn:btih:${infoHash}&dn=${encodeURIComponent(name)}&tr=udp://tracker.opentrackr.org:1337&tr=udp://open.stealth.si:80/announce&tr=udp://tracker.torrent.eu.org:451/announce&tr=udp://tracker.bittor.pw:1337/announce&tr=udp://public.popcorn-tracker.org:6969/announce&tr=udp://tracker.dler.org:6969/announce&tr=udp://exodus.desync.com:6969&tr=udp://open.demonii.com:1337/announce&tr=udp://glotorrents.pw:6969/announce&tr=udp://tracker.coppersurfer.tk:6969&tr=udp://torrent.gresille.org:80/announce&tr=udp://p4p.arenabg.com:1337&tr=udp://tracker.internetwarriors.net:1337`;
        
        // Build description page URL
        const descriptionUrl = `https://thepiratebay.org/description.php?id=${id}`;
        
        // Parse category (format: "Video > HD Movies" or category ID)
        const categories = []; // TPB categories don't map directly to Newznab IDs
        
        results.push({
          id: `${indexerName}-${id}-${index}`,
          protocol: "torrent",
          age: age,
          ageFormatted: ageFormatted,
          title: name,
          indexer: indexerName,
          size: size / (1024 * 1024 * 1024), // Convert bytes to GiB for sorting
          sizeFormatted: formatSize(size),
          grabs: 0, // TPB API doesn't provide grabs
          peers: seeders > 0 || leechers > 0 ? `${seeders}/${leechers}` : null,
          seeders: seeders,
          leechers: leechers,
          categories: categories,
          publishDate: publishDate.toISOString(),
          downloadUrl: magnetLink,
          guid: descriptionUrl,
          description: category || "",
        });
      } catch (err) {
        console.error(`Error parsing TPB API item ${index}:`, err.message);
      }
    });
    
    return results;
  } catch (error) {
    console.error(`Error parsing TPB API response:`, error.message);
    return [];
  }
}

// Scrape The Pirate Bay search results
function scrapeThePirateBay(html, query, indexerName) {
  try {
    const $ = cheerio.load(html);
    const results = [];
    
    // The Pirate Bay search results are in an <ol id="torrents"> with <li class="list-entry">
    // Try multiple selectors to be more flexible
    let entries = $("#torrents li.list-entry");
    
    if (entries.length === 0) {
      // Try alternative selector
      entries = $("ol#torrents li.list-entry");
    }
    
    if (entries.length === 0) {
      // Try even more flexible
      entries = $("li.list-entry");
    }
    
    if (entries.length === 0) {
      console.log(`[${indexerName}] No results found in HTML structure`);
      console.log(`[${indexerName}] HTML preview (first 500 chars):`, html.substring(0, 500));
      // Check if page requires JavaScript
      if (html.includes("Enable JS") || html.includes("javascript")) {
        console.log(`[${indexerName}] Page may require JavaScript to render results`);
      }
      return [];
    }
    
    console.log(`[${indexerName}] Found ${entries.length} result entries`);
    
    entries.each((index, element) => {
      try {
        const $entry = $(element);
        
        // Skip header row
        if ($entry.hasClass("list-header")) {
          return;
        }
        
        // Get title and link from <span class="list-item item-name item-title">
        let $titleLink = $entry.find("span.item-name.item-title a, .item-name.item-title a, span.item-title a").first();
        let title = $titleLink.text().trim();
        let torrentLink = $titleLink.attr("href") || "";
        
        if (!title || !torrentLink) {
          // Try alternative selectors
          const $altTitle = $entry.find("a[href*='description.php']").first();
          if ($altTitle.length > 0) {
            title = $altTitle.text().trim();
            torrentLink = $altTitle.attr("href") || "";
            if (!title || !torrentLink) {
              return;
            }
          } else {
            return;
          }
        }
        
        // Get full URL
        if (!torrentLink.startsWith("http")) {
          torrentLink = `https://thepiratebay.org${torrentLink}`;
        }
        
        // Get magnet link from <span class="item-icons">
        // The magnet link is directly in the search results page
        let magnetLink = $entry.find("span.item-icons a[href^='magnet:'], .item-icons a[href^='magnet:']").attr("href") || "";
        
        // If no magnet link found, try finding any magnet link in the entry
        if (!magnetLink) {
          magnetLink = $entry.find("a[href^='magnet:']").attr("href") || "";
        }
        
        // Get size from <span class="list-item item-size">
        // Size is in text like "1018.80 MiB" and also in hidden input value="1068287027"
        const $sizeSpan = $entry.find("span.item-size, .item-size");
        const sizeText = $sizeSpan.text().trim();
        const sizeInput = $sizeSpan.find('input[name="size"]').attr("value");
        let size = 0;
        
        if (sizeInput) {
          size = parseInt(sizeInput); // Use exact bytes from hidden input
        } else if (sizeText) {
          size = parseSize(sizeText);
        }
        
        // Get seeders from <span class="list-item item-seed">
        const seedersText = $entry.find("span.item-seed, .item-seed").text().trim();
        const seeders = parseInt(seedersText) || 0;
        
        // Get leechers from <span class="list-item item-leech">
        const leechersText = $entry.find("span.item-leech, .item-leech").text().trim();
        const leechers = parseInt(leechersText) || 0;
        
        // Get upload date from <span class="list-item item-uploaded">
        const $dateSpan = $entry.find("span.item-uploaded, .item-uploaded");
        let dateText = $dateSpan.find("label").attr("title") || "";
        if (!dateText) {
          dateText = $dateSpan.text().trim();
        }
        const publishDate = parseDate(dateText);
        const now = new Date();
        const age = Math.floor((now - publishDate) / (1000 * 60 * 60 * 24));
        const ageFormatted = age === 0 ? "Today" : age === 1 ? "1 day" : `${age} days`;
        
        // Get category from <span class="list-item item-type">
        const categoryText = $entry.find("span.item-type, .item-type").text().trim();
        const categories = []; // TPB categories don't map directly to Newznab IDs
        
        results.push({
          id: `${indexerName}-${torrentLink}-${index}`,
          protocol: "torrent",
          age: age,
          ageFormatted: ageFormatted,
          title: title,
          indexer: indexerName,
          size: size / (1024 * 1024 * 1024), // Convert bytes to GiB for sorting
          sizeFormatted: formatSize(size),
          grabs: 0, // TPB doesn't show grabs
          peers: seeders > 0 || leechers > 0 ? `${seeders}/${leechers}` : null,
          seeders: seeders,
          leechers: leechers,
          categories: categories,
          publishDate: publishDate.toISOString(),
          downloadUrl: magnetLink || torrentLink,
          guid: torrentLink,
          description: categoryText || "",
        });
      } catch (err) {
        console.error(`Error parsing TPB entry ${index}:`, err.message);
      }
    });
    
    console.log(`[${indexerName}] Successfully parsed ${results.length} results`);
    return results;
  } catch (error) {
    console.error(`Error scraping The Pirate Bay:`, error.message);
    console.error(`Error stack:`, error.stack);
    return [];
  }
}

// Parse size string like "1.5 GiB" or "500 MiB" to bytes
function parseSize(sizeText) {
  if (!sizeText) return 0;
  
  const match = sizeText.match(/^([\d.]+)\s*([KMGT]?i?B)$/i);
  if (!match) return 0;
  
  const value = parseFloat(match[1]);
  const unit = match[2].toUpperCase();
  
  const multipliers = {
    "B": 1,
    "KB": 1024,
    "MB": 1024 * 1024,
    "GB": 1024 * 1024 * 1024,
    "TB": 1024 * 1024 * 1024 * 1024,
    "KIB": 1024,
    "MIB": 1024 * 1024,
    "GIB": 1024 * 1024 * 1024,
    "TIB": 1024 * 1024 * 1024 * 1024,
  };
  
  return value * (multipliers[unit] || 1);
}

// Parse date string like "Today 12:34" or "12-25 15:30" or "2024-12-25 15:30"
function parseDate(dateText) {
  if (!dateText) return new Date();
  
  const now = new Date();
  const lowerText = dateText.toLowerCase();
  
  // "Today" or "Today HH:MM"
  if (lowerText.includes("today")) {
    const timeMatch = dateText.match(/(\d{1,2}):(\d{2})/);
    if (timeMatch) {
      const hours = parseInt(timeMatch[1]);
      const minutes = parseInt(timeMatch[2]);
      const date = new Date(now);
      date.setHours(hours, minutes, 0, 0);
      return date;
    }
    return now;
  }
  
  // "Y-day" (yesterday)
  if (lowerText.includes("y-day") || lowerText.includes("yesterday")) {
    const date = new Date(now);
    date.setDate(date.getDate() - 1);
    return date;
  }
  
  // Try to parse as "MM-DD HH:MM" or "YYYY-MM-DD HH:MM"
  const dateMatch = dateText.match(/(\d{4}-)?(\d{1,2})-(\d{1,2})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (dateMatch) {
    const year = dateMatch[1] ? parseInt(dateMatch[1]) : now.getFullYear();
    const month = parseInt(dateMatch[2]) - 1; // JS months are 0-indexed
    const day = parseInt(dateMatch[3]);
    const hours = dateMatch[4] ? parseInt(dateMatch[4]) : 0;
    const minutes = dateMatch[5] ? parseInt(dateMatch[5]) : 0;
    
    return new Date(year, month, day, hours, minutes);
  }
  
  // Fallback to current date
  return now;
}

// Search a single indexer
async function searchIndexer(indexer, query, categoryIds = [], limit = 100, offset = 0) {
  try {
    // Check if indexer is enabled
    if (!indexer.enabled) {
      console.log(`[${indexer.name}] Skipping: Indexer is disabled`);
      return { results: [], error: "Indexer is disabled" };
    }
    
    // Check if we have a custom scraper for this indexer FIRST
    // Match by baseUrl domain or indexer name
    try {
      const availableScrapers = scraperManager.getAvailableIndexers();
      let matchedScraper = null;
      
      // Try to match by base URL domain
      if (indexer.baseUrl) {
        try {
          const indexerDomain = new URL(indexer.baseUrl).hostname.toLowerCase();
          matchedScraper = availableScrapers.find(scraper => {
            return scraper.links.some(link => {
              try {
                const scraperDomain = new URL(link).hostname.toLowerCase();
                return indexerDomain.includes(scraperDomain) || scraperDomain.includes(indexerDomain);
              } catch {
                return false;
              }
            });
          });
        } catch (e) {
          // Invalid URL, skip domain matching
        }
      }
      
      // Try to match by name if domain matching failed
      if (!matchedScraper) {
        const indexerNameLower = indexer.name.toLowerCase();
        matchedScraper = availableScrapers.find(scraper => 
          scraper.name.toLowerCase() === indexerNameLower ||
          indexerNameLower.includes(scraper.name.toLowerCase()) ||
          scraper.name.toLowerCase().includes(indexerNameLower)
        );
      }
      
      if (matchedScraper) {
        console.log(`[${indexer.name}] ✨ Using custom scraper: ${matchedScraper.name}`);
        const scraperResult = await scraperManager.search(matchedScraper.id, query, { categoryIds });
        
        if (scraperResult.success) {
          console.log(`[${indexer.name}] ✅ Scraper found ${scraperResult.results.length} results`);
          return { results: scraperResult.results, error: null };
        } else {
          console.log(`[${indexer.name}] ⚠️ Scraper failed: ${scraperResult.error}, falling back to API method`);
          // Fall through to try API method
        }
      }
    } catch (scraperError) {
      console.log(`[${indexer.name}] ⚠️ Scraper error: ${scraperError.message}, falling back to API method`);
      // Fall through to try API method
    }

    if (!indexer.baseUrl) {
      console.log(`[${indexer.name}] Skipping: No baseUrl configured`);
      return { results: [], error: "No baseUrl configured" };
    }

    let baseUrl = indexer.baseUrl.trim().replace(/\/$/, "");
    const indexerType = indexer.indexerType || "";
    const isCardigann = indexerType.toLowerCase().includes("cardigann");
    
    // Check if baseUrl is a Prowlarr proxy endpoint (format: http://prowlarr:port/{indexerId}/)
    // If so, we can use it as a Torznab/Newznab endpoint
    const isProwlarrProxy = /\/\d+\/?$/.test(baseUrl) && (baseUrl.includes("prowlarr") || baseUrl.includes("localhost") || baseUrl.includes("127.0.0.1"));
    
    // Check if this is The Pirate Bay (needs special handling)
    const isTPB = indexer.name === "The Pirate Bay" || baseUrl.includes("thepiratebay") || baseUrl.includes("tpb");
    
    // If it's a Prowlarr proxy, ensure it has /api path
    if (isProwlarrProxy && !baseUrl.endsWith("/api")) {
      baseUrl = `${baseUrl}/api`;
    }
    
    let searchUrl;
    let useTPBApi = false;
    let apiPath = "/api"; // Default API path
    
    if (isTPB) {
      // The Pirate Bay uses apibay.org API for JSON data (more reliable than scraping)
      // API format: https://apibay.org/q.php?q={query}&cat=0
      const encodedQuery = encodeURIComponent(query);
      searchUrl = `https://apibay.org/q.php?q=${encodedQuery}&cat=0`;
      useTPBApi = true;
      console.log(`[${indexer.name}] Searching TPB via API: ${searchUrl}`);
    } else {
      // For Cardigann indexers or Prowlarr proxies, determine API path
      if (isProwlarrProxy) {
        // Prowlarr proxy already has /api in baseUrl
        apiPath = "";
      } else if (isCardigann) {
        // Cardigann indexers might use different paths
        // Try standard /api first, will try alternatives on 404
        apiPath = "/api";
      } else {
        // Standard Torznab/Newznab
        apiPath = "/api";
      }
      
      const apiKey = indexer.password || indexer.username || "";

      // Build search URL
      const params = new URLSearchParams();
      params.append("t", "search");
      params.append("q", query);
      if (apiKey) {
        params.append("apikey", apiKey);
      }
      params.append("limit", limit.toString());
      params.append("offset", offset.toString());
      params.append("extended", "1");

      // Add categories if provided
      if (categoryIds.length > 0) {
        categoryIds.forEach((catId) => {
          params.append("cat", catId.toString());
        });
      }

      // Build the full search URL
      const fullApiPath = apiPath ? `${baseUrl}${apiPath}` : baseUrl;
      searchUrl = `${fullApiPath}?${params.toString()}`;
      
      const logUrl = searchUrl.replace(/apikey=[^&]+/, "apikey=***");
      console.log(`[${indexer.name}] Searching (${indexerType || 'unknown'}${isProwlarrProxy ? ', Prowlarr proxy' : ''}): ${logUrl}`);
    }

    // Make request with timeout
    // Use appropriate headers based on expected response type
    const headers = {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9",
      "Connection": "keep-alive",
    };
    
    // For API requests, prefer XML/JSON
    if (!useTPBApi) {
      headers["Accept"] = "application/xml,application/rss+xml,application/atom+xml,text/xml,application/json,*/*;q=0.8";
    } else {
      headers["Accept"] = "application/json,text/plain,*/*;q=0.8";
    }
    
    let response;
    try {
      response = await axios.get(searchUrl, {
        timeout: 20000, // Increased timeout for Cardigann indexers
        headers: headers,
        validateStatus: (status) => status < 500, // Don't throw on 4xx errors
        maxRedirects: 5, // Allow redirects
      });
    } catch (error) {
      // If first attempt fails, try alternative approaches
      if (!useTPBApi) {
        // Try alternative API paths for Cardigann or any indexer that fails
        if (error.response?.status === 404 || error.code === "ECONNREFUSED" || error.code === "ETIMEDOUT") {
          console.log(`[${indexer.name}] Initial attempt failed (${error.response?.status || error.code}), trying alternative paths...`);
          const alternativePaths = isCardigann 
            ? ["/torznab", "/newznab", "/api/v1", "/search", ""] 
            : ["/api/v1", "/torznab", "/newznab"];
          
          let foundWorkingPath = false;
          
          for (const altPath of alternativePaths) {
            try {
              const pathToUse = altPath ? `${baseUrl}${altPath}` : baseUrl;
              const altUrl = `${pathToUse}?${new URLSearchParams({
                t: "search",
                q: query,
                limit: limit.toString(),
                offset: offset.toString(),
                extended: "1",
                ...(indexer.password || indexer.username ? { apikey: indexer.password || indexer.username } : {}),
              }).toString()}`;
              
              console.log(`[${indexer.name}] Trying alternative path: ${altPath || '(root)'}`);
              response = await axios.get(altUrl, {
                timeout: 20000,
                headers: headers,
                validateStatus: (status) => status < 500,
                maxRedirects: 5,
              });
              
              if (response.status === 200) {
                console.log(`[${indexer.name}] ✅ Success with alternative path: ${altPath || '(root)'}`);
                searchUrl = altUrl;
                foundWorkingPath = true;
                break;
              }
            } catch (altError) {
              // Continue to next alternative
              continue;
            }
          }
          
          // If all alternatives failed, throw original error
          if (!foundWorkingPath) {
            throw error;
          }
        } else {
          throw error;
        }
      } else {
        throw error;
      }
    }

    if (response.status !== 200) {
      console.log(`[${indexer.name}] HTTP ${response.status}: ${response.statusText}`);
      return { results: [], error: `HTTP ${response.status}: ${response.statusText}` };
    }

    // Check if response is XML (Torznab/Newznab) or HTML (scraping needed)
    const contentType = response.headers["content-type"] || "";
    const responseText = typeof response.data === "string" ? response.data : JSON.stringify(response.data);
    
    // Handle The Pirate Bay API (JSON response)
    // The API might return text/plain or application/json, and axios might auto-parse it
    if (useTPBApi) {
      console.log(`[${indexer.name}] Received response from TPB API, content-type: ${contentType}, status: ${response.status}`);
      try {
        // Parse JSON response (might be string or already parsed by axios)
        let jsonData = response.data;
        
        // If it's a string, parse it
        if (typeof jsonData === "string") {
          jsonData = JSON.parse(jsonData);
        }
        
        // Ensure it's an array
        if (!Array.isArray(jsonData)) {
          console.error(`[${indexer.name}] API response is not an array:`, typeof jsonData);
          return { results: [], error: "Invalid API response format" };
        }
        
        const apiResults = parseTPBApiResponse(jsonData, indexer.name);
        console.log(`[${indexer.name}] Parsed ${apiResults.length} results from API`);
        return { results: apiResults, error: null };
      } catch (err) {
        console.error(`[${indexer.name}] Error parsing TPB API response:`, err.message);
        console.error(`[${indexer.name}] Response type:`, typeof response.data);
        console.error(`[${indexer.name}] Response preview:`, typeof response.data === "string" ? response.data.substring(0, 200) : JSON.stringify(response.data).substring(0, 200));
        return { results: [], error: `Failed to parse API response: ${err.message}` };
      }
    }
    
    if (contentType.includes("text/html") || responseText.trim().startsWith("<html")) {
      console.log(`[${indexer.name}] Received HTML response - checking content...`);
      
      // Check for Cloudflare challenge
      const htmlContent = typeof response.data === "string" ? response.data : responseText;
      const isCloudflare = htmlContent.includes("Just a moment") || 
                          htmlContent.includes("cf-challenge") || 
                          htmlContent.includes("challenge-platform") ||
                          htmlContent.includes("Enable JavaScript and cookies");
      
      if (isCloudflare) {
        console.log(`[${indexer.name}] ⚠️ Cloudflare protection detected - requires JavaScript/browser`);
        return { 
          results: [], 
          error: `"${indexer.name}" is protected by Cloudflare and requires browser automation. Use Prowlarr as a proxy by setting baseUrl to: http://prowlarr:9696/{indexerId}/api` 
        };
      }
      
      // Try to scrape The Pirate Bay (fallback if API doesn't work)
      if (isTPB) {
        const scrapedResults = scrapeThePirateBay(response.data, query, indexer.name);
        console.log(`[${indexer.name}] Scraped ${scrapedResults.length} results`);
        return { results: scrapedResults, error: null };
      }
      
      // For Cardigann indexers that return HTML, this means they need proper scraping
      // which requires YAML definitions. For now, return a helpful error.
      if (isCardigann) {
        console.log(`[${indexer.name}] Cardigann indexer returned HTML - requires YAML definition for scraping`);
        return { 
          results: [], 
          error: `Cardigann indexer "${indexer.name}" requires YAML definition files for scraping. Use Prowlarr as a proxy by setting baseUrl to: http://prowlarr:9696/{indexerId}/api` 
        };
      }
      
      // For other indexers, return error
      console.log(`[${indexer.name}] HTML scraping not implemented for this indexer`);
      return { 
        results: [], 
        error: "This indexer requires web scraping (not yet implemented). Please use a Torznab/Newznab compatible indexer or Prowlarr proxy." 
      };
    }

    // Parse XML response
    const results = parseIndexerResponse(
      response.data,
      indexer.name,
      indexer.protocol
    );

    console.log(`[${indexer.name}] Found ${results.length} results`);
    return { results, error: null };
  } catch (error) {
    let errorMsg = error.response 
      ? `HTTP ${error.response.status}: ${error.response.statusText}`
      : error.message || "Search failed";
    
    // Provide more helpful error messages
    if (error.code === "ETIMEDOUT" || error.message?.includes("timeout")) {
      errorMsg = `Connection timeout - "${indexer.name}" may be slow or blocked. For Cardigann indexers, use Prowlarr as a proxy: http://prowlarr:9696/{indexerId}/api`;
    } else if (error.code === "ECONNREFUSED") {
      errorMsg = `Connection refused - check if "${indexer.name}" baseUrl is correct`;
    } else if (error.response?.status === 403) {
      errorMsg = `Access forbidden - "${indexer.name}" may be blocking requests. Use Prowlarr as a proxy or check API key.`;
    } else if (error.response?.status === 404 && isCardigann) {
      errorMsg = `API endpoint not found - "${indexer.name}" is a Cardigann indexer that requires Prowlarr proxy. Set baseUrl to: http://prowlarr:9696/{indexerId}/api`;
    }
    
    console.error(`[${indexer.name}] Error:`, errorMsg);
    if (error.response) {
      const responsePreview = typeof error.response.data === "string" 
        ? error.response.data.substring(0, 200) 
        : JSON.stringify(error.response.data).substring(0, 200);
      console.error(`[${indexer.name}] Response preview:`, responsePreview);
      
      // Check for Cloudflare in error response
      if (responsePreview.includes("Just a moment") || responsePreview.includes("cf-challenge")) {
        errorMsg = `Cloudflare protection detected - "${indexer.name}" requires browser automation. Use Prowlarr as a proxy: http://prowlarr:9696/{indexerId}/api`;
      }
    }
    
    return {
      results: [],
      error: errorMsg,
    };
  }
}

// Search multiple indexers in parallel
async function searchIndexers(indexers, query, categoryIds = [], limit = 100, offset = 0) {
  console.log(`\n[SearchIndexers] Starting search for "${query}" across ${indexers.length} indexer(s)`);
  console.log(`[SearchIndexers] Indexers to search:`);
  indexers.forEach(idx => {
    console.log(`  - ${idx.name} (${idx.protocol}, ${idx.indexerType || 'unknown type'}): ${idx.baseUrl || 'NO URL'}`);
  });
  
  const searchPromises = indexers.map((indexer) =>
    searchIndexer(indexer, query, categoryIds, limit, offset)
  );

  const results = await Promise.allSettled(searchPromises);

  const allResults = [];
  const indexerSummaries = [];
  let successCount = 0;
  let errorCount = 0;

  results.forEach((result, index) => {
    const indexer = indexers[index];
    
    if (result.status === "fulfilled") {
      const { results: searchResults, error } = result.value;
      allResults.push(...searchResults);
      
      if (error) {
        errorCount++;
        console.log(`[SearchIndexers] ❌ ${indexer.name}: ${error} (${searchResults.length} results before error)`);
      } else {
        successCount++;
        console.log(`[SearchIndexers] ✅ ${indexer.name}: ${searchResults.length} results`);
      }
      
      indexerSummaries.push({
        id: indexer.id,
        name: indexer.name,
        protocol: indexer.protocol,
        resultCount: searchResults.length,
        error: error,
      });
    } else {
      errorCount++;
      const errorMsg = result.reason?.message || "Search failed";
      console.log(`[SearchIndexers] ❌ ${indexer.name}: ${errorMsg}`);
      indexerSummaries.push({
        id: indexer.id,
        name: indexer.name,
        protocol: indexer.protocol,
        resultCount: 0,
        error: errorMsg,
      });
    }
  });

  console.log(`[SearchIndexers] Search complete: ${successCount} successful, ${errorCount} failed, ${allResults.length} total results\n`);

  return {
    results: allResults,
    indexerSummaries,
  };
}

module.exports = {
  searchIndexer,
  searchIndexers,
  parseIndexerResponse,
};

