const DownloadClients = require("../models/DownloadClients");
const { getAllDownloadClients, getDownloadClientsByProtocol, getDownloadClientDefinition } = require("../data/downloadClientDefinitions");

/**
 * Test a download client
 */
async function testDownloadClient(implementation, settings) {
  try {
    console.log(`[testDownloadClient] Starting test for ${implementation}`);
    // Import the appropriate client proxy
    let clientProxy;
    
    switch (implementation) {
      case 'Deluge':
        console.log('[testDownloadClient] Creating DelugeProxy instance');
        const DelugeProxy = require('../services/downloadClients/delugeProxy');
        clientProxy = new DelugeProxy(settings);
        break;
      case 'Sabnzbd':
        console.log('[testDownloadClient] Creating SabnzbdProxy instance');
        const SabnzbdProxy = require('../services/downloadClients/sabnzbdProxy');
        clientProxy = new SabnzbdProxy(settings);
        break;
      // Add other clients here as we implement them
      default:
        console.log(`[testDownloadClient] Unknown implementation: ${implementation}`);
        return {
          success: false,
          error: `Client ${implementation} not yet implemented`,
        };
    }

    console.log('[testDownloadClient] Calling testConnection()');
    const result = await clientProxy.testConnection();
    console.log('[testDownloadClient] testConnection() completed:', result);
    return result;
  } catch (error) {
    console.error('[testDownloadClient] Error caught:', error.message, error.stack);
    return {
      success: false,
      error: error.message || 'Test failed',
    };
  }
}

exports.createDownloadClient = async (req, res) => {
  try {
    const { name, implementation, protocol, enabled, priority, settings, categories, tags } = req.body;

    // Validate required fields
    if (!name || !implementation || !protocol) {
      return res.status(400).json({ error: "Name, implementation, and protocol are required" });
    }

    // Get definition to validate
    const definition = getDownloadClientDefinition(implementation);
    if (!definition) {
      return res.status(400).json({ error: `Unknown implementation: ${implementation}` });
    }

    // Test client before saving
    const testResult = await testDownloadClient(implementation, settings);
    if (!testResult.success) {
      return res.status(400).json({
        success: false,
        error: testResult.error || "Client test failed",
      });
    }

    const newClient = await DownloadClients.create({
      name,
      implementation,
      protocol,
      enabled: enabled !== undefined ? enabled : true,
      priority: priority || 1,
      settings: settings || {},
      categories: categories || [],
      tags: tags || null,
      userId: req.userId, // Associate with authenticated user
    });

    res.status(201).json(newClient.toJSON());
  } catch (err) {
    console.error("Error creating download client:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.readDownloadClients = async (req, res) => {
  try {
    const clients = await DownloadClients.findAll({
      where: { userId: req.userId }, // Only fetch clients for the authenticated user
      order: [["priority", "ASC"], ["name", "ASC"]],
    });

    res.json({
      data: clients.map(c => c.toJSON()),
      total: clients.length,
    });
  } catch (err) {
    console.error("Error reading download clients:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.readDownloadClientFromID = async (req, res) => {
  try {
    const client = await DownloadClients.findOne({
      where: { id: req.params.id, userId: req.userId }, // Ensure user owns this client
    });
    if (!client) {
      return res.status(404).json({ error: "Download client not found" });
    }

    res.json(client.toJSON());
  } catch (err) {
    console.error("Error reading download client:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.updateDownloadClient = async (req, res) => {
  try {
    const client = await DownloadClients.findOne({
      where: { id: req.params.id, userId: req.userId }, // Ensure user owns this client
    });
    if (!client) {
      return res.status(404).json({ error: "Download client not found" });
    }

    const { name, enabled, priority, settings, categories, tags } = req.body;

    // Test client before saving if settings changed
    if (settings && client.implementation) {
      const testResult = await testDownloadClient(client.implementation, settings);
      if (!testResult.success) {
        return res.status(400).json({
          success: false,
          error: testResult.error || "Client test failed",
        });
      }
    }

    await client.update({
      name: name || client.name,
      enabled: enabled !== undefined ? enabled : client.enabled,
      priority: priority !== undefined ? priority : client.priority,
      settings: settings !== undefined ? settings : client.settings,
      categories: categories !== undefined ? categories : client.categories,
      tags: tags !== undefined ? tags : client.tags,
    });

    res.json(client.toJSON());
  } catch (err) {
    console.error("Error updating download client:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.deleteDownloadClient = async (req, res) => {
  try {
    const client = await DownloadClients.findOne({
      where: { id: req.params.id, userId: req.userId }, // Ensure user owns this client
    });
    if (!client) {
      return res.status(404).json({ error: "Download client not found" });
    }

    await client.destroy();
    res.json({ message: "Download client deleted successfully" });
  } catch (err) {
    console.error("Error deleting download client:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.testDownloadClient = async (req, res) => {
  try {
    console.log('Test download client request received');
    let implementation, settings;

    if (req.params.id) {
      // Test existing client
      const client = await DownloadClients.findOne({
      where: { id: req.params.id, userId: req.userId }, // Ensure user owns this client
    });
      if (!client) {
        return res.status(404).json({ success: false, error: "Download client not found" });
      }
      implementation = client.implementation;
      settings = client.settings;
    } else if (req.body) {
      // Test new client configuration
      implementation = req.body.implementation;
      settings = req.body.settings;
    } else {
      return res.status(400).json({ success: false, error: "No client data provided" });
    }

    if (!implementation || !settings) {
      return res.status(400).json({ success: false, error: "Implementation and settings are required" });
    }

    console.log('Testing client:', implementation, 'with settings:', { ...settings, password: '***' });

    try {
      const result = await testDownloadClient(implementation, settings);
      console.log('Test result:', result);
      res.json(result);
    } catch (testError) {
      console.error('Error in testDownloadClient:', testError);
      res.status(500).json({
        success: false,
        error: testError.message || "Test failed",
      });
    }
  } catch (err) {
    console.error("Error testing download client:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Test failed",
    });
  }
};

exports.testAllDownloadClients = async (req, res) => {
  try {
    const clients = await DownloadClients.findAll({
      where: { userId: req.userId }, // Only fetch clients for the authenticated user
      order: [["priority", "ASC"], ["name", "ASC"]],
    });

    if (clients.length === 0) {
      return res.json({
        success: true,
        results: [],
        message: "No download clients configured",
      });
    }

    const results = [];
    for (const client of clients) {
      try {
        const testResult = await testDownloadClient(client.implementation, client.settings);
        results.push({
          id: client.id,
          name: client.name,
          implementation: client.implementation,
          success: testResult.success,
          error: testResult.error || null,
          message: testResult.message || null,
        });
      } catch (error) {
        results.push({
          id: client.id,
          name: client.name,
          implementation: client.implementation,
          success: false,
          error: error.message || "Test failed",
          message: null,
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    res.json({
      success: true,
      results: results,
      summary: {
        total: results.length,
        successful: successCount,
        failed: failCount,
      },
    });
  } catch (err) {
    console.error("Error testing all download clients:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Failed to test clients",
    });
  }
};

exports.grabRelease = async (req, res) => {
  try {
    const { downloadUrl, clientId, protocol } = req.body;

    if (!downloadUrl) {
      return res.status(400).json({ error: "Download URL or magnet link is required" });
    }

    // Determine protocol: use provided protocol, or infer from URL
    let determinedProtocol = protocol;
    if (!determinedProtocol) {
      if (downloadUrl.startsWith("magnet:")) {
        determinedProtocol = "torrent";
      } else {
        // Default to nzb for HTTP/HTTPS URLs if protocol not specified
        // But check if it's clearly a torrent file
        if (downloadUrl.includes(".torrent") || downloadUrl.includes("torrent")) {
          determinedProtocol = "torrent";
        } else {
          determinedProtocol = "nzb";
        }
      }
    }

    // Map "nzb" to "usenet" for database lookup
    const dbProtocol = determinedProtocol === "nzb" ? "usenet" : determinedProtocol;

    console.log(`[grabRelease] Looking for client - Protocol: ${determinedProtocol} (DB: ${dbProtocol}), UserId: ${req.userId}`);

    // Get the download client
    let client;
    if (clientId) {
      client = await DownloadClients.findOne({
        where: { id: clientId, userId: req.userId },
      });
      if (client) {
        console.log(`[grabRelease] Found client by ID: ${client.name} (${client.protocol})`);
      }
    } else {
      // Get the first enabled client for the protocol and user
      const whereClause = { enabled: true, protocol: dbProtocol, userId: req.userId };
      console.log(`[grabRelease] Searching for client with:`, whereClause);
      
      client = await DownloadClients.findOne({
        where: whereClause,
        order: [["priority", "ASC"]],
      });
      
      if (client) {
        console.log(`[grabRelease] Found client: ${client.name} (${client.protocol}, priority: ${client.priority})`);
      } else {
        // Debug: Check what clients exist for this user
        const allUserClients = await DownloadClients.findAll({
          where: { userId: req.userId },
          attributes: ['id', 'name', 'protocol', 'enabled', 'priority'],
        });
        console.log(`[grabRelease] Available clients for user:`, allUserClients.map(c => ({
          name: c.name,
          protocol: c.protocol,
          enabled: c.enabled,
          priority: c.priority,
        })));
      }
    }

    if (!client) {
      const protocolName = determinedProtocol === "nzb" ? "usenet" : determinedProtocol;
      return res.status(404).json({ 
        error: `No enabled ${protocolName} download client found. Please configure a download client in Settings.` 
      });
    }

    const clientData = client.toJSON();
    const settings = clientData.settings || {};

    // Import the appropriate client proxy
    let clientProxy;
    switch (clientData.implementation) {
      case "Deluge":
        const DelugeProxy = require("../services/downloadClients/delugeProxy");
        clientProxy = new DelugeProxy(settings);
        break;
      case "Sabnzbd":
        const SabnzbdProxy = require("../services/downloadClients/sabnzbdProxy");
        clientProxy = new SabnzbdProxy(settings);
        break;
      // Add other clients here as we implement them
      default:
        return res.status(400).json({ error: `Client ${clientData.implementation} not yet implemented` });
    }

    // Add torrent/NZB to client
    let result;
    if (clientData.protocol === "usenet") {
      // For Usenet clients (SABnzbd), handle NZB URLs
      if (downloadUrl.startsWith("http://") || downloadUrl.startsWith("https://")) {
        // Try addurl first (works for most NZB indexers)
        // Only fetch the file if addurl fails or if URL clearly indicates a file download
        const isDirectFileUrl = downloadUrl.endsWith(".nzb") || downloadUrl.includes("/download/") || downloadUrl.includes("/getnzb");
        
        if (isDirectFileUrl) {
          // Fetch the NZB file and add it using POST (avoids 414 errors)
          try {
            const axios = require("axios");
            const response = await axios.get(downloadUrl, { 
              responseType: "arraybuffer",
              timeout: 30000,
            });
            const filename = downloadUrl.split("/").pop() || "download.nzb";
            // Remove query parameters from filename if present
            const cleanFilename = filename.split("?")[0];
            result = await clientProxy.addNzbFromFile(cleanFilename, response.data);
          } catch (fetchError) {
            // If fetching fails, try addurl as fallback
            console.log(`[grabRelease] Failed to fetch NZB file, trying addurl: ${fetchError.message}`);
            result = await clientProxy.addNzbFromUrl(downloadUrl);
          }
        } else {
          // Add NZB from URL (for indexers that provide direct NZB URLs)
          // This is preferred as it's more efficient
          result = await clientProxy.addNzbFromUrl(downloadUrl);
        }
      } else {
        return res.status(400).json({ error: "Invalid NZB URL format" });
      }
    } else {
      // For torrent clients
      if (downloadUrl.startsWith("magnet:")) {
        result = await clientProxy.addTorrentFromMagnet(downloadUrl);
      } else if (downloadUrl.startsWith("http://") || downloadUrl.startsWith("https://")) {
        // For HTTP URLs, we need to fetch the file first
        const axios = require("axios");
        const response = await axios.get(downloadUrl, { responseType: "arraybuffer" });
        const filename = downloadUrl.split("/").pop() || "torrent.torrent";
        result = await clientProxy.addTorrentFromFile(filename, response.data);
      } else {
        return res.status(400).json({ error: "Invalid download URL format" });
      }
    }

    res.json({
      success: true,
      message: `Successfully added to ${clientData.name}`,
      torrentHash: result,
    });
  } catch (err) {
    console.error("Error grabbing release:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Failed to grab release",
    });
  }
};

exports.getAvailableDownloadClients = async (req, res) => {
  try {
    const { protocol } = req.query;

    let clients;
    if (protocol) {
      clients = getDownloadClientsByProtocol(protocol);
    } else {
      clients = getAllDownloadClients();
    }

    // Separate by protocol
    const usenetClients = clients.filter(c => c.protocol === 'usenet');
    const torrentClients = clients.filter(c => c.protocol === 'torrent');

    res.json({
      usenet: usenetClients,
      torrent: torrentClients,
      all: clients,
    });
  } catch (err) {
    console.error("Error getting available download clients:", err);
    res.status(500).json({ error: err.message });
  }
};



/**
 * Test a download client
 */
async function testDownloadClient(implementation, settings) {
  try {
    console.log(`[testDownloadClient] Starting test for ${implementation}`);
    // Import the appropriate client proxy
    let clientProxy;
    
    switch (implementation) {
      case 'Deluge':
        console.log('[testDownloadClient] Creating DelugeProxy instance');
        const DelugeProxy = require('../services/downloadClients/delugeProxy');
        clientProxy = new DelugeProxy(settings);
        break;
      case 'Sabnzbd':
        console.log('[testDownloadClient] Creating SabnzbdProxy instance');
        const SabnzbdProxy = require('../services/downloadClients/sabnzbdProxy');
        clientProxy = new SabnzbdProxy(settings);
        break;
      // Add other clients here as we implement them
      default:
        console.log(`[testDownloadClient] Unknown implementation: ${implementation}`);
        return {
          success: false,
          error: `Client ${implementation} not yet implemented`,
        };
    }

    console.log('[testDownloadClient] Calling testConnection()');
    const result = await clientProxy.testConnection();
    console.log('[testDownloadClient] testConnection() completed:', result);
    return result;
  } catch (error) {
    console.error('[testDownloadClient] Error caught:', error.message, error.stack);
    return {
      success: false,
      error: error.message || 'Test failed',
    };
  }
}

exports.createDownloadClient = async (req, res) => {
  try {
    const { name, implementation, protocol, enabled, priority, settings, categories, tags } = req.body;

    // Validate required fields
    if (!name || !implementation || !protocol) {
      return res.status(400).json({ error: "Name, implementation, and protocol are required" });
    }

    // Get definition to validate
    const definition = getDownloadClientDefinition(implementation);
    if (!definition) {
      return res.status(400).json({ error: `Unknown implementation: ${implementation}` });
    }

    // Test client before saving
    const testResult = await testDownloadClient(implementation, settings);
    if (!testResult.success) {
      return res.status(400).json({
        success: false,
        error: testResult.error || "Client test failed",
      });
    }

    const newClient = await DownloadClients.create({
      name,
      implementation,
      protocol,
      enabled: enabled !== undefined ? enabled : true,
      priority: priority || 1,
      settings: settings || {},
      categories: categories || [],
      tags: tags || null,
      userId: req.userId, // Associate with authenticated user
    });

    res.status(201).json(newClient.toJSON());
  } catch (err) {
    console.error("Error creating download client:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.readDownloadClients = async (req, res) => {
  try {
    const clients = await DownloadClients.findAll({
      where: { userId: req.userId }, // Only fetch clients for the authenticated user
      order: [["priority", "ASC"], ["name", "ASC"]],
    });

    res.json({
      data: clients.map(c => c.toJSON()),
      total: clients.length,
    });
  } catch (err) {
    console.error("Error reading download clients:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.readDownloadClientFromID = async (req, res) => {
  try {
    const client = await DownloadClients.findOne({
      where: { id: req.params.id, userId: req.userId }, // Ensure user owns this client
    });
    if (!client) {
      return res.status(404).json({ error: "Download client not found" });
    }

    res.json(client.toJSON());
  } catch (err) {
    console.error("Error reading download client:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.updateDownloadClient = async (req, res) => {
  try {
    const client = await DownloadClients.findOne({
      where: { id: req.params.id, userId: req.userId }, // Ensure user owns this client
    });
    if (!client) {
      return res.status(404).json({ error: "Download client not found" });
    }

    const { name, enabled, priority, settings, categories, tags } = req.body;

    // Test client before saving if settings changed
    if (settings && client.implementation) {
      const testResult = await testDownloadClient(client.implementation, settings);
      if (!testResult.success) {
        return res.status(400).json({
          success: false,
          error: testResult.error || "Client test failed",
        });
      }
    }

    await client.update({
      name: name || client.name,
      enabled: enabled !== undefined ? enabled : client.enabled,
      priority: priority !== undefined ? priority : client.priority,
      settings: settings !== undefined ? settings : client.settings,
      categories: categories !== undefined ? categories : client.categories,
      tags: tags !== undefined ? tags : client.tags,
    });

    res.json(client.toJSON());
  } catch (err) {
    console.error("Error updating download client:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.deleteDownloadClient = async (req, res) => {
  try {
    const client = await DownloadClients.findOne({
      where: { id: req.params.id, userId: req.userId }, // Ensure user owns this client
    });
    if (!client) {
      return res.status(404).json({ error: "Download client not found" });
    }

    await client.destroy();
    res.json({ message: "Download client deleted successfully" });
  } catch (err) {
    console.error("Error deleting download client:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.testDownloadClient = async (req, res) => {
  try {
    console.log('Test download client request received');
    let implementation, settings;

    if (req.params.id) {
      // Test existing client
      const client = await DownloadClients.findOne({
      where: { id: req.params.id, userId: req.userId }, // Ensure user owns this client
    });
      if (!client) {
        return res.status(404).json({ success: false, error: "Download client not found" });
      }
      implementation = client.implementation;
      settings = client.settings;
    } else if (req.body) {
      // Test new client configuration
      implementation = req.body.implementation;
      settings = req.body.settings;
    } else {
      return res.status(400).json({ success: false, error: "No client data provided" });
    }

    if (!implementation || !settings) {
      return res.status(400).json({ success: false, error: "Implementation and settings are required" });
    }

    console.log('Testing client:', implementation, 'with settings:', { ...settings, password: '***' });

    try {
      const result = await testDownloadClient(implementation, settings);
      console.log('Test result:', result);
      res.json(result);
    } catch (testError) {
      console.error('Error in testDownloadClient:', testError);
      res.status(500).json({
        success: false,
        error: testError.message || "Test failed",
      });
    }
  } catch (err) {
    console.error("Error testing download client:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Test failed",
    });
  }
};

exports.testAllDownloadClients = async (req, res) => {
  try {
    const clients = await DownloadClients.findAll({
      where: { userId: req.userId }, // Only fetch clients for the authenticated user
      order: [["priority", "ASC"], ["name", "ASC"]],
    });

    if (clients.length === 0) {
      return res.json({
        success: true,
        results: [],
        message: "No download clients configured",
      });
    }

    const results = [];
    for (const client of clients) {
      try {
        const testResult = await testDownloadClient(client.implementation, client.settings);
        results.push({
          id: client.id,
          name: client.name,
          implementation: client.implementation,
          success: testResult.success,
          error: testResult.error || null,
          message: testResult.message || null,
        });
      } catch (error) {
        results.push({
          id: client.id,
          name: client.name,
          implementation: client.implementation,
          success: false,
          error: error.message || "Test failed",
          message: null,
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    res.json({
      success: true,
      results: results,
      summary: {
        total: results.length,
        successful: successCount,
        failed: failCount,
      },
    });
  } catch (err) {
    console.error("Error testing all download clients:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Failed to test clients",
    });
  }
};

exports.grabRelease = async (req, res) => {
  try {
    const { downloadUrl, clientId, protocol } = req.body;

    if (!downloadUrl) {
      return res.status(400).json({ error: "Download URL or magnet link is required" });
    }

    // Determine protocol: use provided protocol, or infer from URL
    let determinedProtocol = protocol;
    if (!determinedProtocol) {
      if (downloadUrl.startsWith("magnet:")) {
        determinedProtocol = "torrent";
      } else {
        // Default to nzb for HTTP/HTTPS URLs if protocol not specified
        // But check if it's clearly a torrent file
        if (downloadUrl.includes(".torrent") || downloadUrl.includes("torrent")) {
          determinedProtocol = "torrent";
        } else {
          determinedProtocol = "nzb";
        }
      }
    }

    // Map "nzb" to "usenet" for database lookup
    const dbProtocol = determinedProtocol === "nzb" ? "usenet" : determinedProtocol;

    console.log(`[grabRelease] Looking for client - Protocol: ${determinedProtocol} (DB: ${dbProtocol}), UserId: ${req.userId}`);

    // Get the download client
    let client;
    if (clientId) {
      client = await DownloadClients.findOne({
        where: { id: clientId, userId: req.userId },
      });
      if (client) {
        console.log(`[grabRelease] Found client by ID: ${client.name} (${client.protocol})`);
      }
    } else {
      // Get the first enabled client for the protocol and user
      const whereClause = { enabled: true, protocol: dbProtocol, userId: req.userId };
      console.log(`[grabRelease] Searching for client with:`, whereClause);
      
      client = await DownloadClients.findOne({
        where: whereClause,
        order: [["priority", "ASC"]],
      });
      
      if (client) {
        console.log(`[grabRelease] Found client: ${client.name} (${client.protocol}, priority: ${client.priority})`);
      } else {
        // Debug: Check what clients exist for this user
        const allUserClients = await DownloadClients.findAll({
          where: { userId: req.userId },
          attributes: ['id', 'name', 'protocol', 'enabled', 'priority'],
        });
        console.log(`[grabRelease] Available clients for user:`, allUserClients.map(c => ({
          name: c.name,
          protocol: c.protocol,
          enabled: c.enabled,
          priority: c.priority,
        })));
      }
    }

    if (!client) {
      const protocolName = determinedProtocol === "nzb" ? "usenet" : determinedProtocol;
      return res.status(404).json({ 
        error: `No enabled ${protocolName} download client found. Please configure a download client in Settings.` 
      });
    }

    const clientData = client.toJSON();
    const settings = clientData.settings || {};

    // Import the appropriate client proxy
    let clientProxy;
    switch (clientData.implementation) {
      case "Deluge":
        const DelugeProxy = require("../services/downloadClients/delugeProxy");
        clientProxy = new DelugeProxy(settings);
        break;
      case "Sabnzbd":
        const SabnzbdProxy = require("../services/downloadClients/sabnzbdProxy");
        clientProxy = new SabnzbdProxy(settings);
        break;
      // Add other clients here as we implement them
      default:
        return res.status(400).json({ error: `Client ${clientData.implementation} not yet implemented` });
    }

    // Add torrent/NZB to client
    let result;
    if (clientData.protocol === "usenet") {
      // For Usenet clients (SABnzbd), handle NZB URLs
      if (downloadUrl.startsWith("http://") || downloadUrl.startsWith("https://")) {
        // Try addurl first (works for most NZB indexers)
        // Only fetch the file if addurl fails or if URL clearly indicates a file download
        const isDirectFileUrl = downloadUrl.endsWith(".nzb") || downloadUrl.includes("/download/") || downloadUrl.includes("/getnzb");
        
        if (isDirectFileUrl) {
          // Fetch the NZB file and add it using POST (avoids 414 errors)
          try {
            const axios = require("axios");
            const response = await axios.get(downloadUrl, { 
              responseType: "arraybuffer",
              timeout: 30000,
            });
            const filename = downloadUrl.split("/").pop() || "download.nzb";
            // Remove query parameters from filename if present
            const cleanFilename = filename.split("?")[0];
            result = await clientProxy.addNzbFromFile(cleanFilename, response.data);
          } catch (fetchError) {
            // If fetching fails, try addurl as fallback
            console.log(`[grabRelease] Failed to fetch NZB file, trying addurl: ${fetchError.message}`);
            result = await clientProxy.addNzbFromUrl(downloadUrl);
          }
        } else {
          // Add NZB from URL (for indexers that provide direct NZB URLs)
          // This is preferred as it's more efficient
          result = await clientProxy.addNzbFromUrl(downloadUrl);
        }
      } else {
        return res.status(400).json({ error: "Invalid NZB URL format" });
      }
    } else {
      // For torrent clients
      if (downloadUrl.startsWith("magnet:")) {
        result = await clientProxy.addTorrentFromMagnet(downloadUrl);
      } else if (downloadUrl.startsWith("http://") || downloadUrl.startsWith("https://")) {
        // For HTTP URLs, we need to fetch the file first
        const axios = require("axios");
        const response = await axios.get(downloadUrl, { responseType: "arraybuffer" });
        const filename = downloadUrl.split("/").pop() || "torrent.torrent";
        result = await clientProxy.addTorrentFromFile(filename, response.data);
      } else {
        return res.status(400).json({ error: "Invalid download URL format" });
      }
    }

    res.json({
      success: true,
      message: `Successfully added to ${clientData.name}`,
      torrentHash: result,
    });
  } catch (err) {
    console.error("Error grabbing release:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Failed to grab release",
    });
  }
};

exports.getAvailableDownloadClients = async (req, res) => {
  try {
    const { protocol } = req.query;

    let clients;
    if (protocol) {
      clients = getDownloadClientsByProtocol(protocol);
    } else {
      clients = getAllDownloadClients();
    }

    // Separate by protocol
    const usenetClients = clients.filter(c => c.protocol === 'usenet');
    const torrentClients = clients.filter(c => c.protocol === 'torrent');

    res.json({
      usenet: usenetClients,
      torrent: torrentClients,
      all: clients,
    });
  } catch (err) {
    console.error("Error getting available download clients:", err);
    res.status(500).json({ error: err.message });
  }
};



/**
 * Test a download client
 */
async function testDownloadClient(implementation, settings) {
  try {
    console.log(`[testDownloadClient] Starting test for ${implementation}`);
    // Import the appropriate client proxy
    let clientProxy;
    
    switch (implementation) {
      case 'Deluge':
        console.log('[testDownloadClient] Creating DelugeProxy instance');
        const DelugeProxy = require('../services/downloadClients/delugeProxy');
        clientProxy = new DelugeProxy(settings);
        break;
      case 'Sabnzbd':
        console.log('[testDownloadClient] Creating SabnzbdProxy instance');
        const SabnzbdProxy = require('../services/downloadClients/sabnzbdProxy');
        clientProxy = new SabnzbdProxy(settings);
        break;
      // Add other clients here as we implement them
      default:
        console.log(`[testDownloadClient] Unknown implementation: ${implementation}`);
        return {
          success: false,
          error: `Client ${implementation} not yet implemented`,
        };
    }

    console.log('[testDownloadClient] Calling testConnection()');
    const result = await clientProxy.testConnection();
    console.log('[testDownloadClient] testConnection() completed:', result);
    return result;
  } catch (error) {
    console.error('[testDownloadClient] Error caught:', error.message, error.stack);
    return {
      success: false,
      error: error.message || 'Test failed',
    };
  }
}

exports.createDownloadClient = async (req, res) => {
  try {
    const { name, implementation, protocol, enabled, priority, settings, categories, tags } = req.body;

    // Validate required fields
    if (!name || !implementation || !protocol) {
      return res.status(400).json({ error: "Name, implementation, and protocol are required" });
    }

    // Get definition to validate
    const definition = getDownloadClientDefinition(implementation);
    if (!definition) {
      return res.status(400).json({ error: `Unknown implementation: ${implementation}` });
    }

    // Test client before saving
    const testResult = await testDownloadClient(implementation, settings);
    if (!testResult.success) {
      return res.status(400).json({
        success: false,
        error: testResult.error || "Client test failed",
      });
    }

    const newClient = await DownloadClients.create({
      name,
      implementation,
      protocol,
      enabled: enabled !== undefined ? enabled : true,
      priority: priority || 1,
      settings: settings || {},
      categories: categories || [],
      tags: tags || null,
      userId: req.userId, // Associate with authenticated user
    });

    res.status(201).json(newClient.toJSON());
  } catch (err) {
    console.error("Error creating download client:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.readDownloadClients = async (req, res) => {
  try {
    const clients = await DownloadClients.findAll({
      where: { userId: req.userId }, // Only fetch clients for the authenticated user
      order: [["priority", "ASC"], ["name", "ASC"]],
    });

    res.json({
      data: clients.map(c => c.toJSON()),
      total: clients.length,
    });
  } catch (err) {
    console.error("Error reading download clients:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.readDownloadClientFromID = async (req, res) => {
  try {
    const client = await DownloadClients.findOne({
      where: { id: req.params.id, userId: req.userId }, // Ensure user owns this client
    });
    if (!client) {
      return res.status(404).json({ error: "Download client not found" });
    }

    res.json(client.toJSON());
  } catch (err) {
    console.error("Error reading download client:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.updateDownloadClient = async (req, res) => {
  try {
    const client = await DownloadClients.findOne({
      where: { id: req.params.id, userId: req.userId }, // Ensure user owns this client
    });
    if (!client) {
      return res.status(404).json({ error: "Download client not found" });
    }

    const { name, enabled, priority, settings, categories, tags } = req.body;

    // Test client before saving if settings changed
    if (settings && client.implementation) {
      const testResult = await testDownloadClient(client.implementation, settings);
      if (!testResult.success) {
        return res.status(400).json({
          success: false,
          error: testResult.error || "Client test failed",
        });
      }
    }

    await client.update({
      name: name || client.name,
      enabled: enabled !== undefined ? enabled : client.enabled,
      priority: priority !== undefined ? priority : client.priority,
      settings: settings !== undefined ? settings : client.settings,
      categories: categories !== undefined ? categories : client.categories,
      tags: tags !== undefined ? tags : client.tags,
    });

    res.json(client.toJSON());
  } catch (err) {
    console.error("Error updating download client:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.deleteDownloadClient = async (req, res) => {
  try {
    const client = await DownloadClients.findOne({
      where: { id: req.params.id, userId: req.userId }, // Ensure user owns this client
    });
    if (!client) {
      return res.status(404).json({ error: "Download client not found" });
    }

    await client.destroy();
    res.json({ message: "Download client deleted successfully" });
  } catch (err) {
    console.error("Error deleting download client:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.testDownloadClient = async (req, res) => {
  try {
    console.log('Test download client request received');
    let implementation, settings;

    if (req.params.id) {
      // Test existing client
      const client = await DownloadClients.findOne({
      where: { id: req.params.id, userId: req.userId }, // Ensure user owns this client
    });
      if (!client) {
        return res.status(404).json({ success: false, error: "Download client not found" });
      }
      implementation = client.implementation;
      settings = client.settings;
    } else if (req.body) {
      // Test new client configuration
      implementation = req.body.implementation;
      settings = req.body.settings;
    } else {
      return res.status(400).json({ success: false, error: "No client data provided" });
    }

    if (!implementation || !settings) {
      return res.status(400).json({ success: false, error: "Implementation and settings are required" });
    }

    console.log('Testing client:', implementation, 'with settings:', { ...settings, password: '***' });

    try {
      const result = await testDownloadClient(implementation, settings);
      console.log('Test result:', result);
      res.json(result);
    } catch (testError) {
      console.error('Error in testDownloadClient:', testError);
      res.status(500).json({
        success: false,
        error: testError.message || "Test failed",
      });
    }
  } catch (err) {
    console.error("Error testing download client:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Test failed",
    });
  }
};

exports.testAllDownloadClients = async (req, res) => {
  try {
    const clients = await DownloadClients.findAll({
      where: { userId: req.userId }, // Only fetch clients for the authenticated user
      order: [["priority", "ASC"], ["name", "ASC"]],
    });

    if (clients.length === 0) {
      return res.json({
        success: true,
        results: [],
        message: "No download clients configured",
      });
    }

    const results = [];
    for (const client of clients) {
      try {
        const testResult = await testDownloadClient(client.implementation, client.settings);
        results.push({
          id: client.id,
          name: client.name,
          implementation: client.implementation,
          success: testResult.success,
          error: testResult.error || null,
          message: testResult.message || null,
        });
      } catch (error) {
        results.push({
          id: client.id,
          name: client.name,
          implementation: client.implementation,
          success: false,
          error: error.message || "Test failed",
          message: null,
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    res.json({
      success: true,
      results: results,
      summary: {
        total: results.length,
        successful: successCount,
        failed: failCount,
      },
    });
  } catch (err) {
    console.error("Error testing all download clients:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Failed to test clients",
    });
  }
};

exports.grabRelease = async (req, res) => {
  try {
    const { downloadUrl, clientId, protocol } = req.body;

    if (!downloadUrl) {
      return res.status(400).json({ error: "Download URL or magnet link is required" });
    }

    // Determine protocol: use provided protocol, or infer from URL
    let determinedProtocol = protocol;
    if (!determinedProtocol) {
      if (downloadUrl.startsWith("magnet:")) {
        determinedProtocol = "torrent";
      } else {
        // Default to nzb for HTTP/HTTPS URLs if protocol not specified
        // But check if it's clearly a torrent file
        if (downloadUrl.includes(".torrent") || downloadUrl.includes("torrent")) {
          determinedProtocol = "torrent";
        } else {
          determinedProtocol = "nzb";
        }
      }
    }

    // Map "nzb" to "usenet" for database lookup
    const dbProtocol = determinedProtocol === "nzb" ? "usenet" : determinedProtocol;

    console.log(`[grabRelease] Looking for client - Protocol: ${determinedProtocol} (DB: ${dbProtocol}), UserId: ${req.userId}`);

    // Get the download client
    let client;
    if (clientId) {
      client = await DownloadClients.findOne({
        where: { id: clientId, userId: req.userId },
      });
      if (client) {
        console.log(`[grabRelease] Found client by ID: ${client.name} (${client.protocol})`);
      }
    } else {
      // Get the first enabled client for the protocol and user
      const whereClause = { enabled: true, protocol: dbProtocol, userId: req.userId };
      console.log(`[grabRelease] Searching for client with:`, whereClause);
      
      client = await DownloadClients.findOne({
        where: whereClause,
        order: [["priority", "ASC"]],
      });
      
      if (client) {
        console.log(`[grabRelease] Found client: ${client.name} (${client.protocol}, priority: ${client.priority})`);
      } else {
        // Debug: Check what clients exist for this user
        const allUserClients = await DownloadClients.findAll({
          where: { userId: req.userId },
          attributes: ['id', 'name', 'protocol', 'enabled', 'priority'],
        });
        console.log(`[grabRelease] Available clients for user:`, allUserClients.map(c => ({
          name: c.name,
          protocol: c.protocol,
          enabled: c.enabled,
          priority: c.priority,
        })));
      }
    }

    if (!client) {
      const protocolName = determinedProtocol === "nzb" ? "usenet" : determinedProtocol;
      return res.status(404).json({ 
        error: `No enabled ${protocolName} download client found. Please configure a download client in Settings.` 
      });
    }

    const clientData = client.toJSON();
    const settings = clientData.settings || {};

    // Import the appropriate client proxy
    let clientProxy;
    switch (clientData.implementation) {
      case "Deluge":
        const DelugeProxy = require("../services/downloadClients/delugeProxy");
        clientProxy = new DelugeProxy(settings);
        break;
      case "Sabnzbd":
        const SabnzbdProxy = require("../services/downloadClients/sabnzbdProxy");
        clientProxy = new SabnzbdProxy(settings);
        break;
      // Add other clients here as we implement them
      default:
        return res.status(400).json({ error: `Client ${clientData.implementation} not yet implemented` });
    }

    // Add torrent/NZB to client
    let result;
    if (clientData.protocol === "usenet") {
      // For Usenet clients (SABnzbd), handle NZB URLs
      if (downloadUrl.startsWith("http://") || downloadUrl.startsWith("https://")) {
        // Try addurl first (works for most NZB indexers)
        // Only fetch the file if addurl fails or if URL clearly indicates a file download
        const isDirectFileUrl = downloadUrl.endsWith(".nzb") || downloadUrl.includes("/download/") || downloadUrl.includes("/getnzb");
        
        if (isDirectFileUrl) {
          // Fetch the NZB file and add it using POST (avoids 414 errors)
          try {
            const axios = require("axios");
            const response = await axios.get(downloadUrl, { 
              responseType: "arraybuffer",
              timeout: 30000,
            });
            const filename = downloadUrl.split("/").pop() || "download.nzb";
            // Remove query parameters from filename if present
            const cleanFilename = filename.split("?")[0];
            result = await clientProxy.addNzbFromFile(cleanFilename, response.data);
          } catch (fetchError) {
            // If fetching fails, try addurl as fallback
            console.log(`[grabRelease] Failed to fetch NZB file, trying addurl: ${fetchError.message}`);
            result = await clientProxy.addNzbFromUrl(downloadUrl);
          }
        } else {
          // Add NZB from URL (for indexers that provide direct NZB URLs)
          // This is preferred as it's more efficient
          result = await clientProxy.addNzbFromUrl(downloadUrl);
        }
      } else {
        return res.status(400).json({ error: "Invalid NZB URL format" });
      }
    } else {
      // For torrent clients
      if (downloadUrl.startsWith("magnet:")) {
        result = await clientProxy.addTorrentFromMagnet(downloadUrl);
      } else if (downloadUrl.startsWith("http://") || downloadUrl.startsWith("https://")) {
        // For HTTP URLs, we need to fetch the file first
        const axios = require("axios");
        const response = await axios.get(downloadUrl, { responseType: "arraybuffer" });
        const filename = downloadUrl.split("/").pop() || "torrent.torrent";
        result = await clientProxy.addTorrentFromFile(filename, response.data);
      } else {
        return res.status(400).json({ error: "Invalid download URL format" });
      }
    }

    res.json({
      success: true,
      message: `Successfully added to ${clientData.name}`,
      torrentHash: result,
    });
  } catch (err) {
    console.error("Error grabbing release:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Failed to grab release",
    });
  }
};

exports.getAvailableDownloadClients = async (req, res) => {
  try {
    const { protocol } = req.query;

    let clients;
    if (protocol) {
      clients = getDownloadClientsByProtocol(protocol);
    } else {
      clients = getAllDownloadClients();
    }

    // Separate by protocol
    const usenetClients = clients.filter(c => c.protocol === 'usenet');
    const torrentClients = clients.filter(c => c.protocol === 'torrent');

    res.json({
      usenet: usenetClients,
      torrent: torrentClients,
      all: clients,
    });
  } catch (err) {
    console.error("Error getting available download clients:", err);
    res.status(500).json({ error: err.message });
  }
};



/**
 * Test a download client
 */
async function testDownloadClient(implementation, settings) {
  try {
    console.log(`[testDownloadClient] Starting test for ${implementation}`);
    // Import the appropriate client proxy
    let clientProxy;
    
    switch (implementation) {
      case 'Deluge':
        console.log('[testDownloadClient] Creating DelugeProxy instance');
        const DelugeProxy = require('../services/downloadClients/delugeProxy');
        clientProxy = new DelugeProxy(settings);
        break;
      case 'Sabnzbd':
        console.log('[testDownloadClient] Creating SabnzbdProxy instance');
        const SabnzbdProxy = require('../services/downloadClients/sabnzbdProxy');
        clientProxy = new SabnzbdProxy(settings);
        break;
      // Add other clients here as we implement them
      default:
        console.log(`[testDownloadClient] Unknown implementation: ${implementation}`);
        return {
          success: false,
          error: `Client ${implementation} not yet implemented`,
        };
    }

    console.log('[testDownloadClient] Calling testConnection()');
    const result = await clientProxy.testConnection();
    console.log('[testDownloadClient] testConnection() completed:', result);
    return result;
  } catch (error) {
    console.error('[testDownloadClient] Error caught:', error.message, error.stack);
    return {
      success: false,
      error: error.message || 'Test failed',
    };
  }
}

exports.createDownloadClient = async (req, res) => {
  try {
    const { name, implementation, protocol, enabled, priority, settings, categories, tags } = req.body;

    // Validate required fields
    if (!name || !implementation || !protocol) {
      return res.status(400).json({ error: "Name, implementation, and protocol are required" });
    }

    // Get definition to validate
    const definition = getDownloadClientDefinition(implementation);
    if (!definition) {
      return res.status(400).json({ error: `Unknown implementation: ${implementation}` });
    }

    // Test client before saving
    const testResult = await testDownloadClient(implementation, settings);
    if (!testResult.success) {
      return res.status(400).json({
        success: false,
        error: testResult.error || "Client test failed",
      });
    }

    const newClient = await DownloadClients.create({
      name,
      implementation,
      protocol,
      enabled: enabled !== undefined ? enabled : true,
      priority: priority || 1,
      settings: settings || {},
      categories: categories || [],
      tags: tags || null,
      userId: req.userId, // Associate with authenticated user
    });

    res.status(201).json(newClient.toJSON());
  } catch (err) {
    console.error("Error creating download client:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.readDownloadClients = async (req, res) => {
  try {
    const clients = await DownloadClients.findAll({
      where: { userId: req.userId }, // Only fetch clients for the authenticated user
      order: [["priority", "ASC"], ["name", "ASC"]],
    });

    res.json({
      data: clients.map(c => c.toJSON()),
      total: clients.length,
    });
  } catch (err) {
    console.error("Error reading download clients:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.readDownloadClientFromID = async (req, res) => {
  try {
    const client = await DownloadClients.findOne({
      where: { id: req.params.id, userId: req.userId }, // Ensure user owns this client
    });
    if (!client) {
      return res.status(404).json({ error: "Download client not found" });
    }

    res.json(client.toJSON());
  } catch (err) {
    console.error("Error reading download client:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.updateDownloadClient = async (req, res) => {
  try {
    const client = await DownloadClients.findOne({
      where: { id: req.params.id, userId: req.userId }, // Ensure user owns this client
    });
    if (!client) {
      return res.status(404).json({ error: "Download client not found" });
    }

    const { name, enabled, priority, settings, categories, tags } = req.body;

    // Test client before saving if settings changed
    if (settings && client.implementation) {
      const testResult = await testDownloadClient(client.implementation, settings);
      if (!testResult.success) {
        return res.status(400).json({
          success: false,
          error: testResult.error || "Client test failed",
        });
      }
    }

    await client.update({
      name: name || client.name,
      enabled: enabled !== undefined ? enabled : client.enabled,
      priority: priority !== undefined ? priority : client.priority,
      settings: settings !== undefined ? settings : client.settings,
      categories: categories !== undefined ? categories : client.categories,
      tags: tags !== undefined ? tags : client.tags,
    });

    res.json(client.toJSON());
  } catch (err) {
    console.error("Error updating download client:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.deleteDownloadClient = async (req, res) => {
  try {
    const client = await DownloadClients.findOne({
      where: { id: req.params.id, userId: req.userId }, // Ensure user owns this client
    });
    if (!client) {
      return res.status(404).json({ error: "Download client not found" });
    }

    await client.destroy();
    res.json({ message: "Download client deleted successfully" });
  } catch (err) {
    console.error("Error deleting download client:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.testDownloadClient = async (req, res) => {
  try {
    console.log('Test download client request received');
    let implementation, settings;

    if (req.params.id) {
      // Test existing client
      const client = await DownloadClients.findOne({
      where: { id: req.params.id, userId: req.userId }, // Ensure user owns this client
    });
      if (!client) {
        return res.status(404).json({ success: false, error: "Download client not found" });
      }
      implementation = client.implementation;
      settings = client.settings;
    } else if (req.body) {
      // Test new client configuration
      implementation = req.body.implementation;
      settings = req.body.settings;
    } else {
      return res.status(400).json({ success: false, error: "No client data provided" });
    }

    if (!implementation || !settings) {
      return res.status(400).json({ success: false, error: "Implementation and settings are required" });
    }

    console.log('Testing client:', implementation, 'with settings:', { ...settings, password: '***' });

    try {
      const result = await testDownloadClient(implementation, settings);
      console.log('Test result:', result);
      res.json(result);
    } catch (testError) {
      console.error('Error in testDownloadClient:', testError);
      res.status(500).json({
        success: false,
        error: testError.message || "Test failed",
      });
    }
  } catch (err) {
    console.error("Error testing download client:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Test failed",
    });
  }
};

exports.testAllDownloadClients = async (req, res) => {
  try {
    const clients = await DownloadClients.findAll({
      where: { userId: req.userId }, // Only fetch clients for the authenticated user
      order: [["priority", "ASC"], ["name", "ASC"]],
    });

    if (clients.length === 0) {
      return res.json({
        success: true,
        results: [],
        message: "No download clients configured",
      });
    }

    const results = [];
    for (const client of clients) {
      try {
        const testResult = await testDownloadClient(client.implementation, client.settings);
        results.push({
          id: client.id,
          name: client.name,
          implementation: client.implementation,
          success: testResult.success,
          error: testResult.error || null,
          message: testResult.message || null,
        });
      } catch (error) {
        results.push({
          id: client.id,
          name: client.name,
          implementation: client.implementation,
          success: false,
          error: error.message || "Test failed",
          message: null,
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    res.json({
      success: true,
      results: results,
      summary: {
        total: results.length,
        successful: successCount,
        failed: failCount,
      },
    });
  } catch (err) {
    console.error("Error testing all download clients:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Failed to test clients",
    });
  }
};

exports.grabRelease = async (req, res) => {
  try {
    const { downloadUrl, clientId, protocol } = req.body;

    if (!downloadUrl) {
      return res.status(400).json({ error: "Download URL or magnet link is required" });
    }

    // Determine protocol: use provided protocol, or infer from URL
    let determinedProtocol = protocol;
    if (!determinedProtocol) {
      if (downloadUrl.startsWith("magnet:")) {
        determinedProtocol = "torrent";
      } else {
        // Default to nzb for HTTP/HTTPS URLs if protocol not specified
        // But check if it's clearly a torrent file
        if (downloadUrl.includes(".torrent") || downloadUrl.includes("torrent")) {
          determinedProtocol = "torrent";
        } else {
          determinedProtocol = "nzb";
        }
      }
    }

    // Map "nzb" to "usenet" for database lookup
    const dbProtocol = determinedProtocol === "nzb" ? "usenet" : determinedProtocol;

    console.log(`[grabRelease] Looking for client - Protocol: ${determinedProtocol} (DB: ${dbProtocol}), UserId: ${req.userId}`);

    // Get the download client
    let client;
    if (clientId) {
      client = await DownloadClients.findOne({
        where: { id: clientId, userId: req.userId },
      });
      if (client) {
        console.log(`[grabRelease] Found client by ID: ${client.name} (${client.protocol})`);
      }
    } else {
      // Get the first enabled client for the protocol and user
      const whereClause = { enabled: true, protocol: dbProtocol, userId: req.userId };
      console.log(`[grabRelease] Searching for client with:`, whereClause);
      
      client = await DownloadClients.findOne({
        where: whereClause,
        order: [["priority", "ASC"]],
      });
      
      if (client) {
        console.log(`[grabRelease] Found client: ${client.name} (${client.protocol}, priority: ${client.priority})`);
      } else {
        // Debug: Check what clients exist for this user
        const allUserClients = await DownloadClients.findAll({
          where: { userId: req.userId },
          attributes: ['id', 'name', 'protocol', 'enabled', 'priority'],
        });
        console.log(`[grabRelease] Available clients for user:`, allUserClients.map(c => ({
          name: c.name,
          protocol: c.protocol,
          enabled: c.enabled,
          priority: c.priority,
        })));
      }
    }

    if (!client) {
      const protocolName = determinedProtocol === "nzb" ? "usenet" : determinedProtocol;
      return res.status(404).json({ 
        error: `No enabled ${protocolName} download client found. Please configure a download client in Settings.` 
      });
    }

    const clientData = client.toJSON();
    const settings = clientData.settings || {};

    // Import the appropriate client proxy
    let clientProxy;
    switch (clientData.implementation) {
      case "Deluge":
        const DelugeProxy = require("../services/downloadClients/delugeProxy");
        clientProxy = new DelugeProxy(settings);
        break;
      case "Sabnzbd":
        const SabnzbdProxy = require("../services/downloadClients/sabnzbdProxy");
        clientProxy = new SabnzbdProxy(settings);
        break;
      // Add other clients here as we implement them
      default:
        return res.status(400).json({ error: `Client ${clientData.implementation} not yet implemented` });
    }

    // Add torrent/NZB to client
    let result;
    if (clientData.protocol === "usenet") {
      // For Usenet clients (SABnzbd), handle NZB URLs
      if (downloadUrl.startsWith("http://") || downloadUrl.startsWith("https://")) {
        // Try addurl first (works for most NZB indexers)
        // Only fetch the file if addurl fails or if URL clearly indicates a file download
        const isDirectFileUrl = downloadUrl.endsWith(".nzb") || downloadUrl.includes("/download/") || downloadUrl.includes("/getnzb");
        
        if (isDirectFileUrl) {
          // Fetch the NZB file and add it using POST (avoids 414 errors)
          try {
            const axios = require("axios");
            const response = await axios.get(downloadUrl, { 
              responseType: "arraybuffer",
              timeout: 30000,
            });
            const filename = downloadUrl.split("/").pop() || "download.nzb";
            // Remove query parameters from filename if present
            const cleanFilename = filename.split("?")[0];
            result = await clientProxy.addNzbFromFile(cleanFilename, response.data);
          } catch (fetchError) {
            // If fetching fails, try addurl as fallback
            console.log(`[grabRelease] Failed to fetch NZB file, trying addurl: ${fetchError.message}`);
            result = await clientProxy.addNzbFromUrl(downloadUrl);
          }
        } else {
          // Add NZB from URL (for indexers that provide direct NZB URLs)
          // This is preferred as it's more efficient
          result = await clientProxy.addNzbFromUrl(downloadUrl);
        }
      } else {
        return res.status(400).json({ error: "Invalid NZB URL format" });
      }
    } else {
      // For torrent clients
      if (downloadUrl.startsWith("magnet:")) {
        result = await clientProxy.addTorrentFromMagnet(downloadUrl);
      } else if (downloadUrl.startsWith("http://") || downloadUrl.startsWith("https://")) {
        // For HTTP URLs, we need to fetch the file first
        const axios = require("axios");
        const response = await axios.get(downloadUrl, { responseType: "arraybuffer" });
        const filename = downloadUrl.split("/").pop() || "torrent.torrent";
        result = await clientProxy.addTorrentFromFile(filename, response.data);
      } else {
        return res.status(400).json({ error: "Invalid download URL format" });
      }
    }

    res.json({
      success: true,
      message: `Successfully added to ${clientData.name}`,
      torrentHash: result,
    });
  } catch (err) {
    console.error("Error grabbing release:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Failed to grab release",
    });
  }
};

exports.getAvailableDownloadClients = async (req, res) => {
  try {
    const { protocol } = req.query;

    let clients;
    if (protocol) {
      clients = getDownloadClientsByProtocol(protocol);
    } else {
      clients = getAllDownloadClients();
    }

    // Separate by protocol
    const usenetClients = clients.filter(c => c.protocol === 'usenet');
    const torrentClients = clients.filter(c => c.protocol === 'torrent');

    res.json({
      usenet: usenetClients,
      torrent: torrentClients,
      all: clients,
    });
  } catch (err) {
    console.error("Error getting available download clients:", err);
    res.status(500).json({ error: err.message });
  }
};



/**
 * Test a download client
 */
async function testDownloadClient(implementation, settings) {
  try {
    console.log(`[testDownloadClient] Starting test for ${implementation}`);
    // Import the appropriate client proxy
    let clientProxy;
    
    switch (implementation) {
      case 'Deluge':
        console.log('[testDownloadClient] Creating DelugeProxy instance');
        const DelugeProxy = require('../services/downloadClients/delugeProxy');
        clientProxy = new DelugeProxy(settings);
        break;
      case 'Sabnzbd':
        console.log('[testDownloadClient] Creating SabnzbdProxy instance');
        const SabnzbdProxy = require('../services/downloadClients/sabnzbdProxy');
        clientProxy = new SabnzbdProxy(settings);
        break;
      // Add other clients here as we implement them
      default:
        console.log(`[testDownloadClient] Unknown implementation: ${implementation}`);
        return {
          success: false,
          error: `Client ${implementation} not yet implemented`,
        };
    }

    console.log('[testDownloadClient] Calling testConnection()');
    const result = await clientProxy.testConnection();
    console.log('[testDownloadClient] testConnection() completed:', result);
    return result;
  } catch (error) {
    console.error('[testDownloadClient] Error caught:', error.message, error.stack);
    return {
      success: false,
      error: error.message || 'Test failed',
    };
  }
}

exports.createDownloadClient = async (req, res) => {
  try {
    const { name, implementation, protocol, enabled, priority, settings, categories, tags } = req.body;

    // Validate required fields
    if (!name || !implementation || !protocol) {
      return res.status(400).json({ error: "Name, implementation, and protocol are required" });
    }

    // Get definition to validate
    const definition = getDownloadClientDefinition(implementation);
    if (!definition) {
      return res.status(400).json({ error: `Unknown implementation: ${implementation}` });
    }

    // Test client before saving
    const testResult = await testDownloadClient(implementation, settings);
    if (!testResult.success) {
      return res.status(400).json({
        success: false,
        error: testResult.error || "Client test failed",
      });
    }

    const newClient = await DownloadClients.create({
      name,
      implementation,
      protocol,
      enabled: enabled !== undefined ? enabled : true,
      priority: priority || 1,
      settings: settings || {},
      categories: categories || [],
      tags: tags || null,
      userId: req.userId, // Associate with authenticated user
    });

    res.status(201).json(newClient.toJSON());
  } catch (err) {
    console.error("Error creating download client:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.readDownloadClients = async (req, res) => {
  try {
    const clients = await DownloadClients.findAll({
      where: { userId: req.userId }, // Only fetch clients for the authenticated user
      order: [["priority", "ASC"], ["name", "ASC"]],
    });

    res.json({
      data: clients.map(c => c.toJSON()),
      total: clients.length,
    });
  } catch (err) {
    console.error("Error reading download clients:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.readDownloadClientFromID = async (req, res) => {
  try {
    const client = await DownloadClients.findOne({
      where: { id: req.params.id, userId: req.userId }, // Ensure user owns this client
    });
    if (!client) {
      return res.status(404).json({ error: "Download client not found" });
    }

    res.json(client.toJSON());
  } catch (err) {
    console.error("Error reading download client:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.updateDownloadClient = async (req, res) => {
  try {
    const client = await DownloadClients.findOne({
      where: { id: req.params.id, userId: req.userId }, // Ensure user owns this client
    });
    if (!client) {
      return res.status(404).json({ error: "Download client not found" });
    }

    const { name, enabled, priority, settings, categories, tags } = req.body;

    // Test client before saving if settings changed
    if (settings && client.implementation) {
      const testResult = await testDownloadClient(client.implementation, settings);
      if (!testResult.success) {
        return res.status(400).json({
          success: false,
          error: testResult.error || "Client test failed",
        });
      }
    }

    await client.update({
      name: name || client.name,
      enabled: enabled !== undefined ? enabled : client.enabled,
      priority: priority !== undefined ? priority : client.priority,
      settings: settings !== undefined ? settings : client.settings,
      categories: categories !== undefined ? categories : client.categories,
      tags: tags !== undefined ? tags : client.tags,
    });

    res.json(client.toJSON());
  } catch (err) {
    console.error("Error updating download client:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.deleteDownloadClient = async (req, res) => {
  try {
    const client = await DownloadClients.findOne({
      where: { id: req.params.id, userId: req.userId }, // Ensure user owns this client
    });
    if (!client) {
      return res.status(404).json({ error: "Download client not found" });
    }

    await client.destroy();
    res.json({ message: "Download client deleted successfully" });
  } catch (err) {
    console.error("Error deleting download client:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.testDownloadClient = async (req, res) => {
  try {
    console.log('Test download client request received');
    let implementation, settings;

    if (req.params.id) {
      // Test existing client
      const client = await DownloadClients.findOne({
      where: { id: req.params.id, userId: req.userId }, // Ensure user owns this client
    });
      if (!client) {
        return res.status(404).json({ success: false, error: "Download client not found" });
      }
      implementation = client.implementation;
      settings = client.settings;
    } else if (req.body) {
      // Test new client configuration
      implementation = req.body.implementation;
      settings = req.body.settings;
    } else {
      return res.status(400).json({ success: false, error: "No client data provided" });
    }

    if (!implementation || !settings) {
      return res.status(400).json({ success: false, error: "Implementation and settings are required" });
    }

    console.log('Testing client:', implementation, 'with settings:', { ...settings, password: '***' });

    try {
      const result = await testDownloadClient(implementation, settings);
      console.log('Test result:', result);
      res.json(result);
    } catch (testError) {
      console.error('Error in testDownloadClient:', testError);
      res.status(500).json({
        success: false,
        error: testError.message || "Test failed",
      });
    }
  } catch (err) {
    console.error("Error testing download client:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Test failed",
    });
  }
};

exports.testAllDownloadClients = async (req, res) => {
  try {
    const clients = await DownloadClients.findAll({
      where: { userId: req.userId }, // Only fetch clients for the authenticated user
      order: [["priority", "ASC"], ["name", "ASC"]],
    });

    if (clients.length === 0) {
      return res.json({
        success: true,
        results: [],
        message: "No download clients configured",
      });
    }

    const results = [];
    for (const client of clients) {
      try {
        const testResult = await testDownloadClient(client.implementation, client.settings);
        results.push({
          id: client.id,
          name: client.name,
          implementation: client.implementation,
          success: testResult.success,
          error: testResult.error || null,
          message: testResult.message || null,
        });
      } catch (error) {
        results.push({
          id: client.id,
          name: client.name,
          implementation: client.implementation,
          success: false,
          error: error.message || "Test failed",
          message: null,
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    res.json({
      success: true,
      results: results,
      summary: {
        total: results.length,
        successful: successCount,
        failed: failCount,
      },
    });
  } catch (err) {
    console.error("Error testing all download clients:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Failed to test clients",
    });
  }
};

exports.grabRelease = async (req, res) => {
  try {
    const { downloadUrl, clientId, protocol } = req.body;

    if (!downloadUrl) {
      return res.status(400).json({ error: "Download URL or magnet link is required" });
    }

    // Determine protocol: use provided protocol, or infer from URL
    let determinedProtocol = protocol;
    if (!determinedProtocol) {
      if (downloadUrl.startsWith("magnet:")) {
        determinedProtocol = "torrent";
      } else {
        // Default to nzb for HTTP/HTTPS URLs if protocol not specified
        // But check if it's clearly a torrent file
        if (downloadUrl.includes(".torrent") || downloadUrl.includes("torrent")) {
          determinedProtocol = "torrent";
        } else {
          determinedProtocol = "nzb";
        }
      }
    }

    // Map "nzb" to "usenet" for database lookup
    const dbProtocol = determinedProtocol === "nzb" ? "usenet" : determinedProtocol;

    console.log(`[grabRelease] Looking for client - Protocol: ${determinedProtocol} (DB: ${dbProtocol}), UserId: ${req.userId}`);

    // Get the download client
    let client;
    if (clientId) {
      client = await DownloadClients.findOne({
        where: { id: clientId, userId: req.userId },
      });
      if (client) {
        console.log(`[grabRelease] Found client by ID: ${client.name} (${client.protocol})`);
      }
    } else {
      // Get the first enabled client for the protocol and user
      const whereClause = { enabled: true, protocol: dbProtocol, userId: req.userId };
      console.log(`[grabRelease] Searching for client with:`, whereClause);
      
      client = await DownloadClients.findOne({
        where: whereClause,
        order: [["priority", "ASC"]],
      });
      
      if (client) {
        console.log(`[grabRelease] Found client: ${client.name} (${client.protocol}, priority: ${client.priority})`);
      } else {
        // Debug: Check what clients exist for this user
        const allUserClients = await DownloadClients.findAll({
          where: { userId: req.userId },
          attributes: ['id', 'name', 'protocol', 'enabled', 'priority'],
        });
        console.log(`[grabRelease] Available clients for user:`, allUserClients.map(c => ({
          name: c.name,
          protocol: c.protocol,
          enabled: c.enabled,
          priority: c.priority,
        })));
      }
    }

    if (!client) {
      const protocolName = determinedProtocol === "nzb" ? "usenet" : determinedProtocol;
      return res.status(404).json({ 
        error: `No enabled ${protocolName} download client found. Please configure a download client in Settings.` 
      });
    }

    const clientData = client.toJSON();
    const settings = clientData.settings || {};

    // Import the appropriate client proxy
    let clientProxy;
    switch (clientData.implementation) {
      case "Deluge":
        const DelugeProxy = require("../services/downloadClients/delugeProxy");
        clientProxy = new DelugeProxy(settings);
        break;
      case "Sabnzbd":
        const SabnzbdProxy = require("../services/downloadClients/sabnzbdProxy");
        clientProxy = new SabnzbdProxy(settings);
        break;
      // Add other clients here as we implement them
      default:
        return res.status(400).json({ error: `Client ${clientData.implementation} not yet implemented` });
    }

    // Add torrent/NZB to client
    let result;
    if (clientData.protocol === "usenet") {
      // For Usenet clients (SABnzbd), handle NZB URLs
      if (downloadUrl.startsWith("http://") || downloadUrl.startsWith("https://")) {
        // Try addurl first (works for most NZB indexers)
        // Only fetch the file if addurl fails or if URL clearly indicates a file download
        const isDirectFileUrl = downloadUrl.endsWith(".nzb") || downloadUrl.includes("/download/") || downloadUrl.includes("/getnzb");
        
        if (isDirectFileUrl) {
          // Fetch the NZB file and add it using POST (avoids 414 errors)
          try {
            const axios = require("axios");
            const response = await axios.get(downloadUrl, { 
              responseType: "arraybuffer",
              timeout: 30000,
            });
            const filename = downloadUrl.split("/").pop() || "download.nzb";
            // Remove query parameters from filename if present
            const cleanFilename = filename.split("?")[0];
            result = await clientProxy.addNzbFromFile(cleanFilename, response.data);
          } catch (fetchError) {
            // If fetching fails, try addurl as fallback
            console.log(`[grabRelease] Failed to fetch NZB file, trying addurl: ${fetchError.message}`);
            result = await clientProxy.addNzbFromUrl(downloadUrl);
          }
        } else {
          // Add NZB from URL (for indexers that provide direct NZB URLs)
          // This is preferred as it's more efficient
          result = await clientProxy.addNzbFromUrl(downloadUrl);
        }
      } else {
        return res.status(400).json({ error: "Invalid NZB URL format" });
      }
    } else {
      // For torrent clients
      if (downloadUrl.startsWith("magnet:")) {
        result = await clientProxy.addTorrentFromMagnet(downloadUrl);
      } else if (downloadUrl.startsWith("http://") || downloadUrl.startsWith("https://")) {
        // For HTTP URLs, we need to fetch the file first
        const axios = require("axios");
        const response = await axios.get(downloadUrl, { responseType: "arraybuffer" });
        const filename = downloadUrl.split("/").pop() || "torrent.torrent";
        result = await clientProxy.addTorrentFromFile(filename, response.data);
      } else {
        return res.status(400).json({ error: "Invalid download URL format" });
      }
    }

    res.json({
      success: true,
      message: `Successfully added to ${clientData.name}`,
      torrentHash: result,
    });
  } catch (err) {
    console.error("Error grabbing release:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Failed to grab release",
    });
  }
};

exports.getAvailableDownloadClients = async (req, res) => {
  try {
    const { protocol } = req.query;

    let clients;
    if (protocol) {
      clients = getDownloadClientsByProtocol(protocol);
    } else {
      clients = getAllDownloadClients();
    }

    // Separate by protocol
    const usenetClients = clients.filter(c => c.protocol === 'usenet');
    const torrentClients = clients.filter(c => c.protocol === 'torrent');

    res.json({
      usenet: usenetClients,
      torrent: torrentClients,
      all: clients,
    });
  } catch (err) {
    console.error("Error getting available download clients:", err);
    res.status(500).json({ error: err.message });
  }
};



/**
 * Test a download client
 */
async function testDownloadClient(implementation, settings) {
  try {
    console.log(`[testDownloadClient] Starting test for ${implementation}`);
    // Import the appropriate client proxy
    let clientProxy;
    
    switch (implementation) {
      case 'Deluge':
        console.log('[testDownloadClient] Creating DelugeProxy instance');
        const DelugeProxy = require('../services/downloadClients/delugeProxy');
        clientProxy = new DelugeProxy(settings);
        break;
      case 'Sabnzbd':
        console.log('[testDownloadClient] Creating SabnzbdProxy instance');
        const SabnzbdProxy = require('../services/downloadClients/sabnzbdProxy');
        clientProxy = new SabnzbdProxy(settings);
        break;
      // Add other clients here as we implement them
      default:
        console.log(`[testDownloadClient] Unknown implementation: ${implementation}`);
        return {
          success: false,
          error: `Client ${implementation} not yet implemented`,
        };
    }

    console.log('[testDownloadClient] Calling testConnection()');
    const result = await clientProxy.testConnection();
    console.log('[testDownloadClient] testConnection() completed:', result);
    return result;
  } catch (error) {
    console.error('[testDownloadClient] Error caught:', error.message, error.stack);
    return {
      success: false,
      error: error.message || 'Test failed',
    };
  }
}

exports.createDownloadClient = async (req, res) => {
  try {
    const { name, implementation, protocol, enabled, priority, settings, categories, tags } = req.body;

    // Validate required fields
    if (!name || !implementation || !protocol) {
      return res.status(400).json({ error: "Name, implementation, and protocol are required" });
    }

    // Get definition to validate
    const definition = getDownloadClientDefinition(implementation);
    if (!definition) {
      return res.status(400).json({ error: `Unknown implementation: ${implementation}` });
    }

    // Test client before saving
    const testResult = await testDownloadClient(implementation, settings);
    if (!testResult.success) {
      return res.status(400).json({
        success: false,
        error: testResult.error || "Client test failed",
      });
    }

    const newClient = await DownloadClients.create({
      name,
      implementation,
      protocol,
      enabled: enabled !== undefined ? enabled : true,
      priority: priority || 1,
      settings: settings || {},
      categories: categories || [],
      tags: tags || null,
      userId: req.userId, // Associate with authenticated user
    });

    res.status(201).json(newClient.toJSON());
  } catch (err) {
    console.error("Error creating download client:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.readDownloadClients = async (req, res) => {
  try {
    const clients = await DownloadClients.findAll({
      where: { userId: req.userId }, // Only fetch clients for the authenticated user
      order: [["priority", "ASC"], ["name", "ASC"]],
    });

    res.json({
      data: clients.map(c => c.toJSON()),
      total: clients.length,
    });
  } catch (err) {
    console.error("Error reading download clients:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.readDownloadClientFromID = async (req, res) => {
  try {
    const client = await DownloadClients.findOne({
      where: { id: req.params.id, userId: req.userId }, // Ensure user owns this client
    });
    if (!client) {
      return res.status(404).json({ error: "Download client not found" });
    }

    res.json(client.toJSON());
  } catch (err) {
    console.error("Error reading download client:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.updateDownloadClient = async (req, res) => {
  try {
    const client = await DownloadClients.findOne({
      where: { id: req.params.id, userId: req.userId }, // Ensure user owns this client
    });
    if (!client) {
      return res.status(404).json({ error: "Download client not found" });
    }

    const { name, enabled, priority, settings, categories, tags } = req.body;

    // Test client before saving if settings changed
    if (settings && client.implementation) {
      const testResult = await testDownloadClient(client.implementation, settings);
      if (!testResult.success) {
        return res.status(400).json({
          success: false,
          error: testResult.error || "Client test failed",
        });
      }
    }

    await client.update({
      name: name || client.name,
      enabled: enabled !== undefined ? enabled : client.enabled,
      priority: priority !== undefined ? priority : client.priority,
      settings: settings !== undefined ? settings : client.settings,
      categories: categories !== undefined ? categories : client.categories,
      tags: tags !== undefined ? tags : client.tags,
    });

    res.json(client.toJSON());
  } catch (err) {
    console.error("Error updating download client:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.deleteDownloadClient = async (req, res) => {
  try {
    const client = await DownloadClients.findOne({
      where: { id: req.params.id, userId: req.userId }, // Ensure user owns this client
    });
    if (!client) {
      return res.status(404).json({ error: "Download client not found" });
    }

    await client.destroy();
    res.json({ message: "Download client deleted successfully" });
  } catch (err) {
    console.error("Error deleting download client:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.testDownloadClient = async (req, res) => {
  try {
    console.log('Test download client request received');
    let implementation, settings;

    if (req.params.id) {
      // Test existing client
      const client = await DownloadClients.findOne({
      where: { id: req.params.id, userId: req.userId }, // Ensure user owns this client
    });
      if (!client) {
        return res.status(404).json({ success: false, error: "Download client not found" });
      }
      implementation = client.implementation;
      settings = client.settings;
    } else if (req.body) {
      // Test new client configuration
      implementation = req.body.implementation;
      settings = req.body.settings;
    } else {
      return res.status(400).json({ success: false, error: "No client data provided" });
    }

    if (!implementation || !settings) {
      return res.status(400).json({ success: false, error: "Implementation and settings are required" });
    }

    console.log('Testing client:', implementation, 'with settings:', { ...settings, password: '***' });

    try {
      const result = await testDownloadClient(implementation, settings);
      console.log('Test result:', result);
      res.json(result);
    } catch (testError) {
      console.error('Error in testDownloadClient:', testError);
      res.status(500).json({
        success: false,
        error: testError.message || "Test failed",
      });
    }
  } catch (err) {
    console.error("Error testing download client:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Test failed",
    });
  }
};

exports.testAllDownloadClients = async (req, res) => {
  try {
    const clients = await DownloadClients.findAll({
      where: { userId: req.userId }, // Only fetch clients for the authenticated user
      order: [["priority", "ASC"], ["name", "ASC"]],
    });

    if (clients.length === 0) {
      return res.json({
        success: true,
        results: [],
        message: "No download clients configured",
      });
    }

    const results = [];
    for (const client of clients) {
      try {
        const testResult = await testDownloadClient(client.implementation, client.settings);
        results.push({
          id: client.id,
          name: client.name,
          implementation: client.implementation,
          success: testResult.success,
          error: testResult.error || null,
          message: testResult.message || null,
        });
      } catch (error) {
        results.push({
          id: client.id,
          name: client.name,
          implementation: client.implementation,
          success: false,
          error: error.message || "Test failed",
          message: null,
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    res.json({
      success: true,
      results: results,
      summary: {
        total: results.length,
        successful: successCount,
        failed: failCount,
      },
    });
  } catch (err) {
    console.error("Error testing all download clients:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Failed to test clients",
    });
  }
};

exports.grabRelease = async (req, res) => {
  try {
    const { downloadUrl, clientId, protocol } = req.body;

    if (!downloadUrl) {
      return res.status(400).json({ error: "Download URL or magnet link is required" });
    }

    // Determine protocol: use provided protocol, or infer from URL
    let determinedProtocol = protocol;
    if (!determinedProtocol) {
      if (downloadUrl.startsWith("magnet:")) {
        determinedProtocol = "torrent";
      } else {
        // Default to nzb for HTTP/HTTPS URLs if protocol not specified
        // But check if it's clearly a torrent file
        if (downloadUrl.includes(".torrent") || downloadUrl.includes("torrent")) {
          determinedProtocol = "torrent";
        } else {
          determinedProtocol = "nzb";
        }
      }
    }

    // Map "nzb" to "usenet" for database lookup
    const dbProtocol = determinedProtocol === "nzb" ? "usenet" : determinedProtocol;

    console.log(`[grabRelease] Looking for client - Protocol: ${determinedProtocol} (DB: ${dbProtocol}), UserId: ${req.userId}`);

    // Get the download client
    let client;
    if (clientId) {
      client = await DownloadClients.findOne({
        where: { id: clientId, userId: req.userId },
      });
      if (client) {
        console.log(`[grabRelease] Found client by ID: ${client.name} (${client.protocol})`);
      }
    } else {
      // Get the first enabled client for the protocol and user
      const whereClause = { enabled: true, protocol: dbProtocol, userId: req.userId };
      console.log(`[grabRelease] Searching for client with:`, whereClause);
      
      client = await DownloadClients.findOne({
        where: whereClause,
        order: [["priority", "ASC"]],
      });
      
      if (client) {
        console.log(`[grabRelease] Found client: ${client.name} (${client.protocol}, priority: ${client.priority})`);
      } else {
        // Debug: Check what clients exist for this user
        const allUserClients = await DownloadClients.findAll({
          where: { userId: req.userId },
          attributes: ['id', 'name', 'protocol', 'enabled', 'priority'],
        });
        console.log(`[grabRelease] Available clients for user:`, allUserClients.map(c => ({
          name: c.name,
          protocol: c.protocol,
          enabled: c.enabled,
          priority: c.priority,
        })));
      }
    }

    if (!client) {
      const protocolName = determinedProtocol === "nzb" ? "usenet" : determinedProtocol;
      return res.status(404).json({ 
        error: `No enabled ${protocolName} download client found. Please configure a download client in Settings.` 
      });
    }

    const clientData = client.toJSON();
    const settings = clientData.settings || {};

    // Import the appropriate client proxy
    let clientProxy;
    switch (clientData.implementation) {
      case "Deluge":
        const DelugeProxy = require("../services/downloadClients/delugeProxy");
        clientProxy = new DelugeProxy(settings);
        break;
      case "Sabnzbd":
        const SabnzbdProxy = require("../services/downloadClients/sabnzbdProxy");
        clientProxy = new SabnzbdProxy(settings);
        break;
      // Add other clients here as we implement them
      default:
        return res.status(400).json({ error: `Client ${clientData.implementation} not yet implemented` });
    }

    // Add torrent/NZB to client
    let result;
    if (clientData.protocol === "usenet") {
      // For Usenet clients (SABnzbd), handle NZB URLs
      if (downloadUrl.startsWith("http://") || downloadUrl.startsWith("https://")) {
        // Try addurl first (works for most NZB indexers)
        // Only fetch the file if addurl fails or if URL clearly indicates a file download
        const isDirectFileUrl = downloadUrl.endsWith(".nzb") || downloadUrl.includes("/download/") || downloadUrl.includes("/getnzb");
        
        if (isDirectFileUrl) {
          // Fetch the NZB file and add it using POST (avoids 414 errors)
          try {
            const axios = require("axios");
            const response = await axios.get(downloadUrl, { 
              responseType: "arraybuffer",
              timeout: 30000,
            });
            const filename = downloadUrl.split("/").pop() || "download.nzb";
            // Remove query parameters from filename if present
            const cleanFilename = filename.split("?")[0];
            result = await clientProxy.addNzbFromFile(cleanFilename, response.data);
          } catch (fetchError) {
            // If fetching fails, try addurl as fallback
            console.log(`[grabRelease] Failed to fetch NZB file, trying addurl: ${fetchError.message}`);
            result = await clientProxy.addNzbFromUrl(downloadUrl);
          }
        } else {
          // Add NZB from URL (for indexers that provide direct NZB URLs)
          // This is preferred as it's more efficient
          result = await clientProxy.addNzbFromUrl(downloadUrl);
        }
      } else {
        return res.status(400).json({ error: "Invalid NZB URL format" });
      }
    } else {
      // For torrent clients
      if (downloadUrl.startsWith("magnet:")) {
        result = await clientProxy.addTorrentFromMagnet(downloadUrl);
      } else if (downloadUrl.startsWith("http://") || downloadUrl.startsWith("https://")) {
        // For HTTP URLs, we need to fetch the file first
        const axios = require("axios");
        const response = await axios.get(downloadUrl, { responseType: "arraybuffer" });
        const filename = downloadUrl.split("/").pop() || "torrent.torrent";
        result = await clientProxy.addTorrentFromFile(filename, response.data);
      } else {
        return res.status(400).json({ error: "Invalid download URL format" });
      }
    }

    res.json({
      success: true,
      message: `Successfully added to ${clientData.name}`,
      torrentHash: result,
    });
  } catch (err) {
    console.error("Error grabbing release:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Failed to grab release",
    });
  }
};

exports.getAvailableDownloadClients = async (req, res) => {
  try {
    const { protocol } = req.query;

    let clients;
    if (protocol) {
      clients = getDownloadClientsByProtocol(protocol);
    } else {
      clients = getAllDownloadClients();
    }

    // Separate by protocol
    const usenetClients = clients.filter(c => c.protocol === 'usenet');
    const torrentClients = clients.filter(c => c.protocol === 'torrent');

    res.json({
      usenet: usenetClients,
      torrent: torrentClients,
      all: clients,
    });
  } catch (err) {
    console.error("Error getting available download clients:", err);
    res.status(500).json({ error: err.message });
  }
};

