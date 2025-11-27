const PlexConnection = require('../models/PlexConnection');
const axios = require('axios');

/**
 * Test connection to Plex server
 */
const testPlexConnection = async (serverUrl, authToken) => {
  try {
    // Clean up the server URL
    let cleanUrl = serverUrl.trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = `http://${cleanUrl}`;
    }
    // Remove trailing slash
    cleanUrl = cleanUrl.replace(/\/$/, '');

    const response = await axios.get(`${cleanUrl}/identity`, {
      headers: {
        'X-Plex-Token': authToken,
        'Accept': 'application/json',
      },
      timeout: 10000,
    });

    if (response.data && response.data.MediaContainer) {
      return {
        success: true,
        serverName: response.data.MediaContainer.friendlyName || 'Plex Server',
        serverVersion: response.data.MediaContainer.version || 'Unknown',
        machineIdentifier: response.data.MediaContainer.machineIdentifier,
      };
    }

    return { success: false, error: 'Invalid response from Plex server' };
  } catch (error) {
    console.error('Plex connection test failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      return { success: false, error: 'Connection refused. Check if Plex is running and the URL is correct.' };
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
      return { success: false, error: 'Cannot reach Plex server. Check your URL and network connection.' };
    } else if (error.response?.status === 401) {
      return { success: false, error: 'Invalid authentication token. Please check your X-Plex-Token.' };
    }
    return { success: false, error: error.message || 'Failed to connect to Plex server' };
  }
};

/**
 * Get Plex libraries
 */
const getPlexLibraries = async (serverUrl, authToken) => {
  try {
    let cleanUrl = serverUrl.trim().replace(/\/$/, '');
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = `http://${cleanUrl}`;
    }

    const response = await axios.get(`${cleanUrl}/library/sections`, {
      headers: {
        'X-Plex-Token': authToken,
        'Accept': 'application/json',
      },
      timeout: 10000,
    });

    if (response.data?.MediaContainer?.Directory) {
      const libraries = response.data.MediaContainer.Directory;
      
      // Fetch size for each library
      const librariesWithCounts = await Promise.all(
        libraries.map(async (lib) => {
          try {
            const sizeResponse = await axios.get(`${cleanUrl}/library/sections/${lib.key}/all`, {
              headers: {
                'X-Plex-Token': authToken,
                'Accept': 'application/json',
              },
              params: {
                'X-Plex-Container-Start': 0,
                'X-Plex-Container-Size': 0, // Just get the size, not the items
              },
              timeout: 5000,
            });
            
            const count = sizeResponse.data?.MediaContainer?.totalSize || 
                         sizeResponse.data?.MediaContainer?.size || 0;
            
            return {
              key: lib.key,
              title: lib.title,
              type: lib.type,
              count: count,
            };
          } catch (error) {
            console.error(`Failed to get count for library ${lib.title}:`, error.message);
            return {
              key: lib.key,
              title: lib.title,
              type: lib.type,
              count: 0,
            };
          }
        })
      );
      
      return {
        success: true,
        libraries: librariesWithCounts,
      };
    }

    return { success: false, error: 'No libraries found' };
  } catch (error) {
    console.error('Failed to fetch Plex libraries:', error.message);
    return { success: false, error: error.message || 'Failed to fetch libraries' };
  }
};

/**
 * Get user's Plex connection
 */
exports.getConnection = async (req, res) => {
  try {
    const userId = req.userId;

    const connection = await PlexConnection.findOne({ where: { userId } });

    if (!connection) {
      return res.json({ connected: false });
    }

    // Don't send the full auth token to the client
    res.json({
      connected: true,
      id: connection.id,
      serverUrl: connection.serverUrl,
      serverName: connection.serverName,
      serverVersion: connection.serverVersion,
      machineIdentifier: connection.machineIdentifier,
      isConnected: connection.isConnected,
      lastChecked: connection.lastChecked,
      hasToken: !!connection.authToken,
    });
  } catch (error) {
    console.error('Error fetching Plex connection:', error);
    res.status(500).json({ error: 'Failed to fetch Plex connection' });
  }
};

/**
 * Test Plex connection (without saving)
 */
exports.testConnection = async (req, res) => {
  try {
    const { serverUrl, authToken } = req.body;

    if (!serverUrl || !authToken) {
      return res.status(400).json({ error: 'Server URL and auth token are required' });
    }

    const result = await testPlexConnection(serverUrl, authToken);

    res.json(result);
  } catch (error) {
    console.error('Error testing Plex connection:', error);
    res.status(500).json({ error: 'Failed to test connection' });
  }
};

/**
 * Save/Update Plex connection
 */
exports.saveConnection = async (req, res) => {
  try {
    const userId = req.userId;
    const { serverUrl, authToken } = req.body;

    if (!serverUrl || !authToken) {
      return res.status(400).json({ error: 'Server URL and auth token are required' });
    }

    // Test the connection first
    const testResult = await testPlexConnection(serverUrl, authToken);

    if (!testResult.success) {
      return res.status(400).json({ 
        error: testResult.error,
        success: false,
      });
    }

    // Clean up server URL
    let cleanUrl = serverUrl.trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = `http://${cleanUrl}`;
    }
    cleanUrl = cleanUrl.replace(/\/$/, '');

    // Find existing connection or create new one
    let connection = await PlexConnection.findOne({ where: { userId } });

    if (connection) {
      // Update existing connection
      await connection.update({
        serverUrl: cleanUrl,
        authToken,
        serverName: testResult.serverName,
        serverVersion: testResult.serverVersion,
        machineIdentifier: testResult.machineIdentifier,
        isConnected: true,
        lastChecked: new Date(),
      });
    } else {
      // Create new connection
      connection = await PlexConnection.create({
        userId,
        serverUrl: cleanUrl,
        authToken,
        serverName: testResult.serverName,
        serverVersion: testResult.serverVersion,
        machineIdentifier: testResult.machineIdentifier,
        isConnected: true,
        lastChecked: new Date(),
      });
    }

    res.json({
      success: true,
      message: 'Plex connection saved successfully',
      connection: {
        id: connection.id,
        serverUrl: connection.serverUrl,
        serverName: connection.serverName,
        serverVersion: connection.serverVersion,
        isConnected: connection.isConnected,
        lastChecked: connection.lastChecked,
      },
    });
  } catch (error) {
    console.error('Error saving Plex connection:', error);
    res.status(500).json({ error: 'Failed to save Plex connection' });
  }
};

/**
 * Delete Plex connection
 */
exports.deleteConnection = async (req, res) => {
  try {
    const userId = req.userId;

    const connection = await PlexConnection.findOne({ where: { userId } });

    if (!connection) {
      return res.status(404).json({ error: 'No Plex connection found' });
    }

    await connection.destroy();

    res.json({ success: true, message: 'Plex connection deleted successfully' });
  } catch (error) {
    console.error('Error deleting Plex connection:', error);
    res.status(500).json({ error: 'Failed to delete Plex connection' });
  }
};

/**
 * Get Plex libraries
 */
exports.getLibraries = async (req, res) => {
  try {
    const userId = req.userId;

    const connection = await PlexConnection.findOne({ where: { userId } });

    if (!connection) {
      return res.status(404).json({ error: 'No Plex connection found. Please connect to Plex first.' });
    }

    const result = await getPlexLibraries(connection.serverUrl, connection.authToken);

    if (!result.success) {
      // Update connection status
      await connection.update({ isConnected: false, lastChecked: new Date() });
      return res.status(400).json({ error: result.error });
    }

    // Update last checked
    await connection.update({ lastChecked: new Date(), isConnected: true });

    res.json(result);
  } catch (error) {
    console.error('Error fetching Plex libraries:', error);
    res.status(500).json({ error: 'Failed to fetch Plex libraries' });
  }
};

/**
 * Re-test existing connection
 */
exports.retestConnection = async (req, res) => {
  try {
    const userId = req.userId;

    const connection = await PlexConnection.findOne({ where: { userId } });

    if (!connection) {
      return res.status(404).json({ error: 'No Plex connection found' });
    }

    const result = await testPlexConnection(connection.serverUrl, connection.authToken);

    // Update connection status
    await connection.update({
      isConnected: result.success,
      lastChecked: new Date(),
      serverName: result.serverName || connection.serverName,
      serverVersion: result.serverVersion || connection.serverVersion,
      machineIdentifier: result.machineIdentifier || connection.machineIdentifier,
    });

    res.json(result);
  } catch (error) {
    console.error('Error retesting Plex connection:', error);
    res.status(500).json({ error: 'Failed to retest connection' });
  }
};

/**
 * Get all media items from a specific library
 */
exports.getLibraryItems = async (req, res) => {
  try {
    const userId = req.userId;
    const { libraryKey } = req.params;
    const { page = 1, limit = 50, search = '', sort = 'titleSort:asc' } = req.query;

    const connection = await PlexConnection.findOne({ where: { userId } });

    if (!connection) {
      return res.status(404).json({ error: 'No Plex connection found. Please connect to Plex first.' });
    }

    let cleanUrl = connection.serverUrl.trim().replace(/\/$/, '');
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = `http://${cleanUrl}`;
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build request URL
    let url = `${cleanUrl}/library/sections/${libraryKey}/all`;
    
    const params = {
      'X-Plex-Container-Start': offset,
      'X-Plex-Container-Size': parseInt(limit),
    };

    // Add search filter if provided
    if (search) {
      params['title'] = search;
    }

    // Add sort
    if (sort) {
      params['sort'] = sort;
    }

    const response = await axios.get(url, {
      headers: {
        'X-Plex-Token': connection.authToken,
        'Accept': 'application/json',
      },
      params,
      timeout: 15000,
    });

    const container = response.data?.MediaContainer;
    
    if (!container) {
      return res.json({
        success: true,
        items: [],
        total: 0,
        page: parseInt(page),
        totalPages: 1,
      });
    }

    const items = (container.Metadata || []).map(item => {
      // Build full Plex image URLs
      const thumbUrl = item.thumb ? `${cleanUrl}${item.thumb}?X-Plex-Token=${authToken}` : null;
      const artUrl = item.art ? `${cleanUrl}${item.art}?X-Plex-Token=${authToken}` : null;
      
      return {
        key: item.ratingKey,
        ratingKey: item.ratingKey,
        title: item.title,
        year: item.year,
        type: item.type,
        summary: item.summary,
        rating: item.rating,
        contentRating: item.contentRating,
        thumb: thumbUrl,
        art: artUrl,
        originalTitle: item.originalTitle,
        duration: item.duration,
        addedAt: item.addedAt,
        updatedAt: item.updatedAt,
        lastViewedAt: item.lastViewedAt,
        viewCount: item.viewCount || 0,
        genres: (item.Genre || []).map(g => g.tag),
        directors: (item.Director || []).map(d => d.tag),
        writers: (item.Writer || []).map(w => w.tag),
        actors: (item.Role || []).slice(0, 10).map(r => r.tag), // Limit to 10 actors
        studio: item.studio,
        tagline: item.tagline,
        countries: (item.Country || []).map(c => c.tag),
        // For TV shows
        childCount: item.childCount, // number of seasons
        leafCount: item.leafCount, // number of episodes
      };
    });

    const total = container.totalSize || container.size || items.length;
    const totalPages = Math.ceil(total / parseInt(limit));

    // Update last checked
    await connection.update({ lastChecked: new Date() });

    res.json({
      success: true,
      items,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages,
      libraryTitle: container.title1 || 'Library',
    });
  } catch (error) {
    console.error('Error fetching library items:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch library items' });
  }
};

/**
 * Get all media from all libraries (movies and TV shows)
 */
exports.getAllMedia = async (req, res) => {
  try {
    const userId = req.userId;
    const { page = 1, limit = 50, search = '', type = 'all', sort = 'addedAt:desc' } = req.query;

    const connection = await PlexConnection.findOne({ where: { userId } });

    if (!connection) {
      return res.status(404).json({ error: 'No Plex connection found. Please connect to Plex first.' });
    }

    let cleanUrl = connection.serverUrl.trim().replace(/\/$/, '');
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = `http://${cleanUrl}`;
    }

    // First, get all libraries
    const librariesResponse = await axios.get(`${cleanUrl}/library/sections`, {
      headers: {
        'X-Plex-Token': connection.authToken,
        'Accept': 'application/json',
      },
      timeout: 10000,
    });

    const libraries = librariesResponse.data?.MediaContainer?.Directory || [];
    
    // Filter libraries based on type
    let filteredLibraries = libraries;
    if (type === 'movie') {
      filteredLibraries = libraries.filter(lib => lib.type === 'movie');
    } else if (type === 'show') {
      filteredLibraries = libraries.filter(lib => lib.type === 'show');
    } else {
      // 'all' - include both movies and shows
      filteredLibraries = libraries.filter(lib => lib.type === 'movie' || lib.type === 'show');
    }

    if (filteredLibraries.length === 0) {
      return res.json({
        success: true,
        items: [],
        total: 0,
        page: 1,
        totalPages: 1,
        libraries: [],
      });
    }

    // Fetch items from all filtered libraries
    const allItems = [];
    const libraryInfo = [];

    console.log(`📚 Fetching items from ${filteredLibraries.length} libraries...`);

    for (const library of filteredLibraries) {
      try {
        console.log(`📖 Fetching from library: ${library.title} (key: ${library.key}, type: ${library.type})`);
        
        const params = {
          'X-Plex-Container-Start': 0,
          'X-Plex-Container-Size': 1000, // Get more items for better filtering
        };

        if (search) {
          params['title'] = search;
        }

        const itemsResponse = await axios.get(`${cleanUrl}/library/sections/${library.key}/all`, {
          headers: {
            'X-Plex-Token': connection.authToken,
            'Accept': 'application/json',
          },
          params,
          timeout: 15000,
        });
        
        const metadata = itemsResponse.data?.MediaContainer?.Metadata || [];
        console.log(`  ✅ Got ${metadata.length} items from ${library.title}`);

        const items = metadata.map(item => {
          // Build full Plex image URLs
          const thumbUrl = item.thumb ? `${cleanUrl}${item.thumb}?X-Plex-Token=${connection.authToken}` : null;
          const artUrl = item.art ? `${cleanUrl}${item.art}?X-Plex-Token=${connection.authToken}` : null;
          
          return {
            key: item.ratingKey,
            ratingKey: item.ratingKey,
            title: item.title,
            year: item.year,
            type: item.type,
            libraryKey: library.key,
            libraryName: library.title,
            libraryType: library.type,
            summary: item.summary,
            rating: item.rating,
            contentRating: item.contentRating,
            thumb: thumbUrl,
            art: artUrl,
            originalTitle: item.originalTitle,
            duration: item.duration,
            addedAt: item.addedAt,
            updatedAt: item.updatedAt,
            lastViewedAt: item.lastViewedAt,
            viewCount: item.viewCount || 0,
            genres: (item.Genre || []).map(g => g.tag),
            directors: (item.Director || []).map(d => d.tag),
            writers: (item.Writer || []).map(w => w.tag),
            actors: (item.Role || []).slice(0, 10).map(r => r.tag),
            studio: item.studio,
            tagline: item.tagline,
            countries: (item.Country || []).map(c => c.tag),
            childCount: item.childCount,
            leafCount: item.leafCount,
          };
        });

        allItems.push(...items);
        libraryInfo.push({
          key: library.key,
          title: library.title,
          type: library.type,
          count: items.length,
        });
        
        console.log(`  📦 Total items so far: ${allItems.length}`);
      } catch (error) {
        console.error(`❌ Error fetching items from library ${library.title}:`, error.message);
        console.error('Error details:', error.response?.data || error);
      }
    }
    
    console.log(`✅ Total items collected: ${allItems.length} from ${libraryInfo.length} libraries`);

    // Sort items
    if (sort) {
      const [sortField, sortOrder] = sort.split(':');
      allItems.sort((a, b) => {
        let aVal = a[sortField];
        let bVal = b[sortField];
        
        if (sortField === 'title') {
          aVal = (aVal || '').toLowerCase();
          bVal = (bVal || '').toLowerCase();
        }
        
        if (sortOrder === 'desc') {
          return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
        } else {
          return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
        }
      });
    }

    // Pagination
    const total = allItems.length;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const paginatedItems = allItems.slice(offset, offset + parseInt(limit));
    const totalPages = Math.ceil(total / parseInt(limit));

    // Update last checked
    await connection.update({ lastChecked: new Date() });

    console.log(`📤 Sending response: ${paginatedItems.length} items (page ${page}/${totalPages})`);

    res.json({
      success: true,
      items: paginatedItems,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages,
      libraries: libraryInfo,
      serverUrl: connection.serverUrl,
      machineIdentifier: connection.machineIdentifier,
    });
  } catch (error) {
    console.error('❌ Error fetching all media:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: error.message || 'Failed to fetch media' });
  }
};

