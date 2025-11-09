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
    const client = await DownloadClients.findByPk(req.params.id);
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
    const client = await DownloadClients.findByPk(req.params.id);
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
    const client = await DownloadClients.findByPk(req.params.id);
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
      const client = await DownloadClients.findByPk(req.params.id);
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
    const { downloadUrl, clientId } = req.body;

    if (!downloadUrl) {
      return res.status(400).json({ error: "Download URL or magnet link is required" });
    }

    // Get the download client
    let client;
    if (clientId) {
      client = await DownloadClients.findByPk(clientId);
    } else {
      // Get the first enabled client for the protocol
      const protocol = downloadUrl.startsWith("magnet:") ? "torrent" : "nzb";
      client = await DownloadClients.findOne({
        where: { enabled: true, protocol },
        order: [["priority", "ASC"]],
      });
    }

    if (!client) {
      return res.status(404).json({ error: "No enabled download client found" });
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
      // Add other clients here as we implement them
      default:
        return res.status(400).json({ error: `Client ${clientData.implementation} not yet implemented` });
    }

    // Add torrent/NZB to client
    let result;
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
    const client = await DownloadClients.findByPk(req.params.id);
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
    const client = await DownloadClients.findByPk(req.params.id);
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
    const client = await DownloadClients.findByPk(req.params.id);
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
      const client = await DownloadClients.findByPk(req.params.id);
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
    const { downloadUrl, clientId } = req.body;

    if (!downloadUrl) {
      return res.status(400).json({ error: "Download URL or magnet link is required" });
    }

    // Get the download client
    let client;
    if (clientId) {
      client = await DownloadClients.findByPk(clientId);
    } else {
      // Get the first enabled client for the protocol
      const protocol = downloadUrl.startsWith("magnet:") ? "torrent" : "nzb";
      client = await DownloadClients.findOne({
        where: { enabled: true, protocol },
        order: [["priority", "ASC"]],
      });
    }

    if (!client) {
      return res.status(404).json({ error: "No enabled download client found" });
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
      // Add other clients here as we implement them
      default:
        return res.status(400).json({ error: `Client ${clientData.implementation} not yet implemented` });
    }

    // Add torrent/NZB to client
    let result;
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
    const client = await DownloadClients.findByPk(req.params.id);
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
    const client = await DownloadClients.findByPk(req.params.id);
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
    const client = await DownloadClients.findByPk(req.params.id);
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
      const client = await DownloadClients.findByPk(req.params.id);
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
    const { downloadUrl, clientId } = req.body;

    if (!downloadUrl) {
      return res.status(400).json({ error: "Download URL or magnet link is required" });
    }

    // Get the download client
    let client;
    if (clientId) {
      client = await DownloadClients.findByPk(clientId);
    } else {
      // Get the first enabled client for the protocol
      const protocol = downloadUrl.startsWith("magnet:") ? "torrent" : "nzb";
      client = await DownloadClients.findOne({
        where: { enabled: true, protocol },
        order: [["priority", "ASC"]],
      });
    }

    if (!client) {
      return res.status(404).json({ error: "No enabled download client found" });
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
      // Add other clients here as we implement them
      default:
        return res.status(400).json({ error: `Client ${clientData.implementation} not yet implemented` });
    }

    // Add torrent/NZB to client
    let result;
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
    const client = await DownloadClients.findByPk(req.params.id);
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
    const client = await DownloadClients.findByPk(req.params.id);
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
    const client = await DownloadClients.findByPk(req.params.id);
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
      const client = await DownloadClients.findByPk(req.params.id);
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
    const { downloadUrl, clientId } = req.body;

    if (!downloadUrl) {
      return res.status(400).json({ error: "Download URL or magnet link is required" });
    }

    // Get the download client
    let client;
    if (clientId) {
      client = await DownloadClients.findByPk(clientId);
    } else {
      // Get the first enabled client for the protocol
      const protocol = downloadUrl.startsWith("magnet:") ? "torrent" : "nzb";
      client = await DownloadClients.findOne({
        where: { enabled: true, protocol },
        order: [["priority", "ASC"]],
      });
    }

    if (!client) {
      return res.status(404).json({ error: "No enabled download client found" });
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
      // Add other clients here as we implement them
      default:
        return res.status(400).json({ error: `Client ${clientData.implementation} not yet implemented` });
    }

    // Add torrent/NZB to client
    let result;
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
    const client = await DownloadClients.findByPk(req.params.id);
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
    const client = await DownloadClients.findByPk(req.params.id);
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
    const client = await DownloadClients.findByPk(req.params.id);
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
      const client = await DownloadClients.findByPk(req.params.id);
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
    const { downloadUrl, clientId } = req.body;

    if (!downloadUrl) {
      return res.status(400).json({ error: "Download URL or magnet link is required" });
    }

    // Get the download client
    let client;
    if (clientId) {
      client = await DownloadClients.findByPk(clientId);
    } else {
      // Get the first enabled client for the protocol
      const protocol = downloadUrl.startsWith("magnet:") ? "torrent" : "nzb";
      client = await DownloadClients.findOne({
        where: { enabled: true, protocol },
        order: [["priority", "ASC"]],
      });
    }

    if (!client) {
      return res.status(404).json({ error: "No enabled download client found" });
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
      // Add other clients here as we implement them
      default:
        return res.status(400).json({ error: `Client ${clientData.implementation} not yet implemented` });
    }

    // Add torrent/NZB to client
    let result;
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
    const client = await DownloadClients.findByPk(req.params.id);
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
    const client = await DownloadClients.findByPk(req.params.id);
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
    const client = await DownloadClients.findByPk(req.params.id);
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
      const client = await DownloadClients.findByPk(req.params.id);
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
    const { downloadUrl, clientId } = req.body;

    if (!downloadUrl) {
      return res.status(400).json({ error: "Download URL or magnet link is required" });
    }

    // Get the download client
    let client;
    if (clientId) {
      client = await DownloadClients.findByPk(clientId);
    } else {
      // Get the first enabled client for the protocol
      const protocol = downloadUrl.startsWith("magnet:") ? "torrent" : "nzb";
      client = await DownloadClients.findOne({
        where: { enabled: true, protocol },
        order: [["priority", "ASC"]],
      });
    }

    if (!client) {
      return res.status(404).json({ error: "No enabled download client found" });
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
      // Add other clients here as we implement them
      default:
        return res.status(400).json({ error: `Client ${clientData.implementation} not yet implemented` });
    }

    // Add torrent/NZB to client
    let result;
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

