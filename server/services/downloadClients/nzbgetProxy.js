const axios = require('axios');

/**
 * NZBGet Download Client Proxy
 * Implements NZBGet XML-RPC API
 * @see https://nzbget.net/api
 */
class NzbgetProxy {
  constructor(settings) {
    this.settings = settings;
  }

  /**
   * Build base URL for NZBGet API
   */
  getBaseUrl() {
    const protocol = this.settings.useSsl ? 'https' : 'http';
    const host = this.settings.host || 'localhost';
    const port = this.settings.port || 6789;
    const username = this.settings.username || 'nzbget';
    const password = this.settings.password || '';
    
    return `${protocol}://${username}:${password}@${host}:${port}/jsonrpc`;
  }

  /**
   * Make JSON-RPC request to NZBGet
   */
  async request(method, params = []) {
    const data = {
      jsonrpc: '2.0',
      method,
      params,
      id: Date.now(),
    };

    try {
      const response = await axios.post(this.getBaseUrl(), data, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      });

      if (response.data.error) {
        throw new Error(response.data.error.message || 'NZBGet API error');
      }

      return response.data.result;
    } catch (error) {
      if (error.response && error.response.status === 401) {
        throw new Error('Authentication failed. Please check your username and password.');
      }
      throw error;
    }
  }

  /**
   * Test connection to NZBGet
   */
  async testConnection() {
    try {
      const version = await this.request('version');
      console.log('[NZBGet] Connected, version:', version);

      // Verify version is 12.0 or higher
      const versionMatch = version.match(/^(\d+)\.(\d+)/);
      if (versionMatch) {
        const majorVersion = parseInt(versionMatch[1]);
        if (majorVersion < 12) {
          return {
            success: false,
            error: `NZBGet version too low (${version}). Need 12.0 or higher.`,
          };
        }
      }

      // Test getting queue
      await this.request('listgroups');

      return {
        success: true,
        message: `Successfully connected to NZBGet ${version}`,
      };
    } catch (error) {
      console.error('[NZBGet] Test connection failed:', error.message);
      return {
        success: false,
        error: `Failed to connect to NZBGet: ${error.message}`,
      };
    }
  }

  /**
   * Add NZB from URL
   */
  async addNzbFromUrl(url) {
    try {
      const category = this.settings.category || 'prowlarr';
      const priority = this.settings.priority || 0;
      const addPaused = this.settings.addPaused || false;

      // NZBGet.append(nzbFilename, nzbContent, category, priority, addToTop, addPaused, dupeKey, dupeScore, dupeMode, parameters)
      const result = await this.request('append', [
        url,                // NZB filename or URL
        '',                 // NZB content (empty when using URL)
        category,           // Category
        priority,           // Priority
        false,              // Add to top
        addPaused,          // Add paused
        '',                 // Dupe key
        0,                  // Dupe score
        'FORCE',            // Dupe mode
        []                  // Parameters
      ]);

      if (result && result > 0) {
        console.log('[NZBGet] Successfully added NZB from URL, ID:', result);
        return result.toString();
      }

      throw new Error('NZBGet rejected the NZB');
    } catch (error) {
      console.error('[NZBGet] Failed to add NZB from URL:', error.message);
      throw new Error(`Failed to add NZB from URL: ${error.message}`);
    }
  }

  /**
   * Add NZB from file
   */
  async addNzbFromFile(filename, fileContent) {
    try {
      const category = this.settings.category || 'prowlarr';
      const priority = this.settings.priority || 0;
      const addPaused = this.settings.addPaused || false;

      // Convert file content to base64
      const nzbContent = Buffer.from(fileContent).toString('base64');

      // NZBGet.append(nzbFilename, nzbContent, category, priority, addToTop, addPaused, dupeKey, dupeScore, dupeMode, parameters)
      const result = await this.request('append', [
        filename,           // NZB filename
        nzbContent,         // NZB content (base64)
        category,           // Category
        priority,           // Priority
        false,              // Add to top
        addPaused,          // Add paused
        '',                 // Dupe key
        0,                  // Dupe score
        'FORCE',            // Dupe mode
        []                  // Parameters
      ]);

      if (result && result > 0) {
        console.log('[NZBGet] Successfully added NZB from file, ID:', result);
        return result.toString();
      }

      throw new Error('NZBGet rejected the NZB');
    } catch (error) {
      console.error('[NZBGet] Failed to add NZB from file:', error.message);
      throw new Error(`Failed to add NZB from file: ${error.message}`);
    }
  }

  /**
   * Get queue
   */
  async getQueue() {
    try {
      const result = await this.request('listgroups');
      return result;
    } catch (error) {
      console.error('[NZBGet] Failed to get queue:', error.message);
      throw new Error(`Failed to get queue: ${error.message}`);
    }
  }

  /**
   * Get history
   */
  async getHistory() {
    try {
      const result = await this.request('history');
      return result;
    } catch (error) {
      console.error('[NZBGet] Failed to get history:', error.message);
      throw new Error(`Failed to get history: ${error.message}`);
    }
  }

  /**
   * Get status
   */
  async getStatus() {
    try {
      const result = await this.request('status');
      return result;
    } catch (error) {
      console.error('[NZBGet] Failed to get status:', error.message);
      throw new Error(`Failed to get status: ${error.message}`);
    }
  }

  /**
   * Get config
   */
  async getConfig() {
    try {
      const result = await this.request('config');
      return result;
    } catch (error) {
      console.error('[NZBGet] Failed to get config:', error.message);
      throw new Error(`Failed to get config: ${error.message}`);
    }
  }

  /**
   * Pause download
   */
  async pauseDownload(id) {
    try {
      const result = await this.request('editqueue', ['GroupPause', 0, '', [id]]);
      return result;
    } catch (error) {
      console.error('[NZBGet] Failed to pause download:', error.message);
      throw new Error(`Failed to pause download: ${error.message}`);
    }
  }

  /**
   * Resume download
   */
  async resumeDownload(id) {
    try {
      const result = await this.request('editqueue', ['GroupResume', 0, '', [id]]);
      return result;
    } catch (error) {
      console.error('[NZBGet] Failed to resume download:', error.message);
      throw new Error(`Failed to resume download: ${error.message}`);
    }
  }

  /**
   * Remove download
   */
  async removeDownload(id) {
    try {
      const result = await this.request('editqueue', ['GroupDelete', 0, '', [id]]);
      console.log('[NZBGet] Successfully removed download:', id);
      return result;
    } catch (error) {
      console.error('[NZBGet] Failed to remove download:', error.message);
      throw new Error(`Failed to remove download: ${error.message}`);
    }
  }
}

module.exports = NzbgetProxy;

