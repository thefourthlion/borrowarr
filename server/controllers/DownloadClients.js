const DownloadClients = require("../models/DownloadClients");
const History = require("../models/History");
const { getAllDownloadClients, getDownloadClientsByProtocol, getDownloadClientDefinition } = require("../data/downloadClientDefinitions");

/**
 * Test a download client - CENTRALIZED FUNCTION
 * Supports all 18 download clients from Prowlarr
 */
async function testDownloadClient(implementation, settings) {
  try {
    console.log(`[testDownloadClient] Starting test for ${implementation}`);
    let clientProxy;
    
    switch (implementation) {
      // TORRENT CLIENTS
      case 'Deluge':
        const DelugeProxy = require('../services/downloadClients/delugeProxy');
        clientProxy = new DelugeProxy(settings);
        break;
      case 'QBittorrent':
        const QBittorrentProxy = require('../services/downloadClients/qbittorrentProxy');
        clientProxy = new QBittorrentProxy(settings);
        break;
      case 'Transmission':
        const TransmissionProxy = require('../services/downloadClients/transmissionProxy');
        clientProxy = new TransmissionProxy(settings);
        break;
      case 'RTorrent':
        const RTorrentProxy = require('../services/downloadClients/rtorrentProxy');
        clientProxy = new RTorrentProxy(settings);
        break;
      case 'Aria2':
        const Aria2Proxy = require('../services/downloadClients/aria2Proxy');
        clientProxy = new Aria2Proxy(settings);
        break;
      case 'UTorrent':
        const UTorrentProxy = require('../services/downloadClients/utorrentProxy');
        clientProxy = new UTorrentProxy(settings);
        break;
      case 'Vuze':
        const VuzeProxy = require('../services/downloadClients/vuzeProxy');
        clientProxy = new VuzeProxy(settings);
        break;
      case 'Flood':
        const FloodProxy = require('../services/downloadClients/floodProxy');
        clientProxy = new FloodProxy(settings);
        break;
      case 'Hadouken':
        const HadoukenProxy = require('../services/downloadClients/hadoukenProxy');
        clientProxy = new HadoukenProxy(settings);
        break;
      case 'FreeboxDownload':
        const FreeboxProxy = require('../services/downloadClients/freeboxProxy');
        clientProxy = new FreeboxProxy(settings);
        break;
      case 'TorrentBlackhole':
        const TorrentBlackholeProxy = require('../services/downloadClients/torrentBlackholeProxy');
        clientProxy = new TorrentBlackholeProxy(settings);
        break;
        
      // USENET CLIENTS
      case 'Sabnzbd':
        const SabnzbdProxy = require('../services/downloadClients/sabnzbdProxy');
        clientProxy = new SabnzbdProxy(settings);
        break;
      case 'Nzbget':
        const NzbgetProxy = require('../services/downloadClients/nzbgetProxy');
        clientProxy = new NzbgetProxy(settings);
        break;
      case 'NzbVortex':
        const NzbVortexProxy = require('../services/downloadClients/nzbvortexProxy');
        clientProxy = new NzbVortexProxy(settings);
        break;
      case 'Pneumatic':
        const PneumaticProxy = require('../services/downloadClients/pneumaticProxy');
        clientProxy = new PneumaticProxy(settings);
        break;
      case 'UsenetBlackhole':
        const UsenetBlackholeProxy = require('../services/downloadClients/usenetBlackholeProxy');
        clientProxy = new UsenetBlackholeProxy(settings);
        break;
        
      // DOWNLOAD STATION (supports both torrent and usenet)
      case 'DownloadStation':
        const DownloadStationProxy = require('../services/downloadClients/downloadstationProxy');
        clientProxy = new DownloadStationProxy(settings);
        break;
        
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

/**
 * Get proxy instance for client implementation
 */
function getClientProxy(implementation, settings) {
    switch (implementation) {
      case 'Deluge':
        const DelugeProxy = require('../services/downloadClients/delugeProxy');
      return new DelugeProxy(settings);
      case 'Sabnzbd':
        const SabnzbdProxy = require('../services/downloadClients/sabnzbdProxy');
      return new SabnzbdProxy(settings);
    case 'QBittorrent':
      const QBittorrentProxy = require('../services/downloadClients/qbittorrentProxy');
      return new QBittorrentProxy(settings);
    case 'Transmission':
      const TransmissionProxy = require('../services/downloadClients/transmissionProxy');
      return new TransmissionProxy(settings);
    case 'RTorrent':
      const RTorrentProxy = require('../services/downloadClients/rtorrentProxy');
      return new RTorrentProxy(settings);
    case 'Aria2':
      const Aria2Proxy = require('../services/downloadClients/aria2Proxy');
      return new Aria2Proxy(settings);
    case 'UTorrent':
      const UTorrentProxy = require('../services/downloadClients/utorrentProxy');
      return new UTorrentProxy(settings);
    case 'Vuze':
      const VuzeProxy = require('../services/downloadClients/vuzeProxy');
      return new VuzeProxy(settings);
    case 'Flood':
      const FloodProxy = require('../services/downloadClients/floodProxy');
      return new FloodProxy(settings);
    case 'Hadouken':
      const HadoukenProxy = require('../services/downloadClients/hadoukenProxy');
      return new HadoukenProxy(settings);
    case 'FreeboxDownload':
      const FreeboxProxy = require('../services/downloadClients/freeboxProxy');
      return new FreeboxProxy(settings);
    case 'TorrentBlackhole':
      const TorrentBlackholeProxy = require('../services/downloadClients/torrentBlackholeProxy');
      return new TorrentBlackholeProxy(settings);
    case 'Nzbget':
      const NzbgetProxy = require('../services/downloadClients/nzbgetProxy');
      return new NzbgetProxy(settings);
    case 'NzbVortex':
      const NzbVortexProxy = require('../services/downloadClients/nzbvortexProxy');
      return new NzbVortexProxy(settings);
    case 'Pneumatic':
      const PneumaticProxy = require('../services/downloadClients/pneumaticProxy');
      return new PneumaticProxy(settings);
    case 'UsenetBlackhole':
      const UsenetBlackholeProxy = require('../services/downloadClients/usenetBlackholeProxy');
      return new UsenetBlackholeProxy(settings);
    case 'DownloadStation':
      const DownloadStationProxy = require('../services/downloadClients/downloadstationProxy');
      return new DownloadStationProxy(settings);
      default:
      throw new Error(`Client ${implementation} not yet implemented`);
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
      userId: req.userId,
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
      where: { userId: req.userId },
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
      where: { id: req.params.id, userId: req.userId },
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
      where: { id: req.params.id, userId: req.userId },
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
      where: { id: req.params.id, userId: req.userId },
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
      const client = await DownloadClients.findOne({
        where: { id: req.params.id, userId: req.userId },
    });
      if (!client) {
        return res.status(404).json({ success: false, error: "Download client not found" });
      }
      implementation = client.implementation;
      settings = client.settings;
    } else if (req.body) {
      implementation = req.body.implementation;
      settings = req.body.settings;
    } else {
      return res.status(400).json({ success: false, error: "No client data provided" });
    }

    if (!implementation || !settings) {
      return res.status(400).json({ success: false, error: "Implementation and settings are required" });
    }

    console.log('Testing client:', implementation, 'with settings:', { ...settings, password: '***' });

      const result = await testDownloadClient(implementation, settings);
      console.log('Test result:', result);
      res.json(result);
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
      where: { userId: req.userId },
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
    const { downloadUrl, clientId, protocol, mediaType } = req.body;

    if (!downloadUrl) {
      return res.status(400).json({ error: "Download URL or magnet link is required" });
    }

    // Determine protocol
    let determinedProtocol = protocol;
    if (!determinedProtocol) {
      if (downloadUrl.startsWith("magnet:")) {
        determinedProtocol = "torrent";
      } else if (downloadUrl.includes(".torrent") || downloadUrl.includes("torrent")) {
          determinedProtocol = "torrent";
        } else {
          determinedProtocol = "nzb";
      }
    }

    const dbProtocol = determinedProtocol === "nzb" ? "usenet" : determinedProtocol;
    console.log(`[grabRelease] Protocol: ${determinedProtocol} (DB: ${dbProtocol}), UserId: ${req.userId}, MediaType: ${mediaType}`);

    // Get client - select by priority (lowest number = highest priority)
    let client;
    if (clientId) {
      console.log(`[grabRelease] Using specific client ID: ${clientId}`);
      client = await DownloadClients.findOne({
        where: { id: clientId, userId: req.userId },
      });
    } else {
      // Find all enabled clients of this protocol to log for debugging
      const allClients = await DownloadClients.findAll({
        where: { enabled: true, protocol: dbProtocol, userId: req.userId },
        order: [["priority", "ASC"]],
      });
      console.log(`[grabRelease] Found ${allClients.length} enabled ${dbProtocol} clients:`);
      allClients.forEach(c => {
        const cd = c.toJSON();
        console.log(`  - ${cd.name} (ID: ${cd.id}, Priority: ${cd.priority})`);
      });
      
      // Select the first one (lowest priority number = highest priority)
      client = allClients[0] || null;
      if (client) {
        const cd = client.toJSON();
        console.log(`[grabRelease] Selected client: ${cd.name} (Priority: ${cd.priority})`);
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
    
    // Determine category to use based on mediaType and client configuration
    // Priority: universal > movies/tv > none
    let categoryToUse = null;
    console.log(`[grabRelease] Checking categories for client "${clientData.name}", mediaType: ${mediaType || 'not specified'}`);
    console.log(`[grabRelease] Client categories config:`, JSON.stringify(clientData.categories || []));
    
    if (clientData.categories && Array.isArray(clientData.categories)) {
      // Check for universal category first (overrides all)
      const universalCategory = clientData.categories.find(c => c.category === 'universal');
      if (universalCategory && universalCategory.clientCategory) {
        categoryToUse = universalCategory.clientCategory;
        console.log(`[grabRelease] ✅ Using UNIVERSAL category: "${categoryToUse}" (overrides movies/tv)`);
      } else if (mediaType) {
        // Check for media-specific category (movies or tv)
        const mediaCategory = clientData.categories.find(c => c.category === mediaType);
        if (mediaCategory && mediaCategory.clientCategory) {
          categoryToUse = mediaCategory.clientCategory;
          console.log(`[grabRelease] ✅ Using ${mediaType.toUpperCase()} category: "${categoryToUse}"`);
        } else {
          console.log(`[grabRelease] ⚠️ No category configured for mediaType "${mediaType}"`);
        }
      } else {
        console.log(`[grabRelease] ⚠️ No mediaType specified and no universal category set`);
      }
    } else {
      console.log(`[grabRelease] ⚠️ No categories configured for this client`);
    }
    
    // Apply category to settings if found
    if (categoryToUse) {
      settings.category = categoryToUse;
      console.log(`[grabRelease] 📁 Final category applied to download: "${categoryToUse}"`);
    } else {
      console.log(`[grabRelease] 📁 No category will be applied to download`);
    }
    
    const clientProxy = getClientProxy(clientData.implementation, settings);

    // Add to client
    let result;
    if (clientData.protocol === "usenet") {
      if (downloadUrl.startsWith("http://") || downloadUrl.startsWith("https://")) {
        const isDirectFileUrl = downloadUrl.endsWith(".nzb") || downloadUrl.includes("/download/") || downloadUrl.includes("/getnzb");
        
        if (isDirectFileUrl) {
          try {
            const axios = require("axios");
            const response = await axios.get(downloadUrl, { 
              responseType: "arraybuffer",
              timeout: 30000,
            });
            const filename = downloadUrl.split("/").pop() || "download.nzb";
            const cleanFilename = filename.split("?")[0];
            result = await clientProxy.addNzbFromFile(cleanFilename, response.data);
          } catch (fetchError) {
            console.log(`[grabRelease] Failed to fetch NZB, trying addurl: ${fetchError.message}`);
            result = await clientProxy.addNzbFromUrl(downloadUrl);
          }
        } else {
          result = await clientProxy.addNzbFromUrl(downloadUrl);
        }
      } else {
        return res.status(400).json({ error: "Invalid NZB URL format" });
      }
    } else {
      // Torrent
      if (downloadUrl.startsWith("magnet:")) {
        result = await clientProxy.addTorrentFromMagnet(downloadUrl);
      } else if (downloadUrl.startsWith("http://") || downloadUrl.startsWith("https://")) {
        const axios = require("axios");
        const response = await axios.get(downloadUrl, { responseType: "arraybuffer" });
        const filename = downloadUrl.split("/").pop() || "torrent.torrent";
        result = await clientProxy.addTorrentFromFile(filename, response.data);
      } else {
        return res.status(400).json({ error: "Invalid download URL format" });
      }
    }

    // Log to history
    try {
      const { 
        releaseName, 
        indexer, 
        indexerId, 
        size, 
        sizeFormatted, 
        seeders, 
        leechers, 
        quality, 
        source,
        mediaType,
        mediaTitle,
        tmdbId,
        seasonNumber,
        episodeNumber,
      } = req.body;

      console.log('[DownloadClients] Creating history entry with data:', {
        userId: req.userId,
        mediaType: mediaType || 'unknown',
        mediaTitle: mediaTitle || null,
        tmdbId: tmdbId || null,
        releaseName: releaseName || downloadUrl,
        protocol: determinedProtocol === 'nzb' ? 'nzb' : 'torrent',
        indexer: indexer || null,
        source: source || 'Manual',
        downloadClient: clientData.name,
      });

      const historyEntry = await History.create({
        userId: req.userId,
        mediaType: mediaType || 'unknown',
        mediaTitle: mediaTitle || null,
        tmdbId: tmdbId || null,
        seasonNumber: seasonNumber || null,
        episodeNumber: episodeNumber || null,
        releaseName: releaseName || downloadUrl,
        protocol: determinedProtocol === 'nzb' ? 'nzb' : 'torrent',
        indexer: indexer || null,
        indexerId: indexerId || null,
        downloadUrl: downloadUrl,
        size: size || null,
        sizeFormatted: sizeFormatted || null,
        seeders: seeders || null,
        leechers: leechers || null,
        quality: quality || null,
        status: 'grabbed',
        source: source || 'Manual',
        downloadClient: clientData.name,
        downloadClientId: result || null,
      });

      console.log('[DownloadClients] ✅ History entry created successfully:', historyEntry.id);
    } catch (historyError) {
      console.error('[DownloadClients] ❌ Failed to log history:', historyError.message);
      console.error('[DownloadClients] Error stack:', historyError.stack);
      // Don't fail the request if history logging fails
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
