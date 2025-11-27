const axios = require('axios');

/**
 * Aria2 Download Client Proxy
 * Implements Aria2 JSON-RPC API
 * @see https://aria2.github.io/manual/en/html/aria2c.html#rpc-interface
 */
class Aria2Proxy {
  constructor(settings) {
    this.settings = settings;
  }

  /**
   * Build base URL for Aria2 RPC
   */
  getBaseUrl() {
    const protocol = this.settings.useSsl ? 'https' : 'http';
    const host = this.settings.host || 'localhost';
    const port = this.settings.port || 6800;
    const rpcPath = this.settings.rpcPath || '/jsonrpc';
    return `${protocol}://${host}:${port}${rpcPath}`;
  }

  /**
   * Make JSON-RPC request to Aria2
   */
  async request(method, params = []) {
    // Add secret token as first parameter if configured
    if (this.settings.secretToken) {
      params = [`token:${this.settings.secretToken}`, ...params];
    }

    const data = {
      jsonrpc: '2.0',
      id: Date.now().toString(),
      method: `aria2.${method}`,
      params,
    };

    try {
      const response = await axios.post(this.getBaseUrl(), data, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      });

      if (response.data.error) {
        throw new Error(response.data.error.message || 'Aria2 API error');
      }

      return response.data.result;
    } catch (error) {
      if (error.response && error.response.status === 401) {
        throw new Error('Authentication failed. Please check your secret token.');
      }
      throw error;
    }
  }

  /**
   * Test connection to Aria2
   */
  async testConnection() {
    try {
      const version = await this.request('getVersion');
      console.log('[Aria2] Connected, version:', version.version);

      // Check version is 1.34.0 or higher
      if (version.version) {
        const versionMatch = version.version.match(/^(\d+)\.(\d+)\.(\d+)/);
        if (versionMatch) {
          const majorVersion = parseInt(versionMatch[1]);
          const minorVersion = parseInt(versionMatch[2]);
          
          if (majorVersion === 1 && minorVersion < 34) {
            return {
              success: false,
              error: `Aria2 version too low (${version.version}). Need 1.34.0 or higher.`,
            };
          }
        }
      }

      // Test getting global stats
      await this.request('getGlobalStat');

      return {
        success: true,
        message: `Successfully connected to Aria2 ${version.version}`,
      };
    } catch (error) {
      console.error('[Aria2] Test connection failed:', error.message);
      return {
        success: false,
        error: `Failed to connect to Aria2: ${error.message}`,
      };
    }
  }

  /**
   * Add torrent from magnet or HTTP URL
   */
  async addTorrentFromMagnet(magnetLink) {
    try {
      const options = {};

      // Set directory if configured
      if (this.settings.category) {
        options.dir = this.settings.category;
      }

      // Set paused state
      if (this.settings.addPaused) {
        options.pause = 'true';
      }

      const params = [[magnetLink]];
      if (Object.keys(options).length > 0) {
        params.push(options);
      }

      const gid = await this.request('addUri', params);
      console.log('[Aria2] Successfully added URI, GID:', gid);

      // Extract hash from magnet link
      const hashMatch = magnetLink.match(/btih:([a-f0-9]{40})/i);
      return hashMatch ? hashMatch[1] : gid;
    } catch (error) {
      console.error('[Aria2] Failed to add magnet:', error.message);
      throw new Error(`Failed to add magnet link: ${error.message}`);
    }
  }

  /**
   * Add torrent from file
   */
  async addTorrentFromFile(filename, fileContent) {
    try {
      // Aria2 expects base64 encoded torrent
      const torrentData = Buffer.from(fileContent).toString('base64');

      const options = {};

      // Set directory if configured
      if (this.settings.category) {
        options.dir = this.settings.category;
      }

      // Set paused state
      if (this.settings.addPaused) {
        options.pause = 'true';
      }

      const params = [torrentData];
      if (Object.keys(options).length > 0) {
        params.push(options);
      }

      const gid = await this.request('addTorrent', params);
      console.log('[Aria2] Successfully added torrent, GID:', gid);
      return gid;
    } catch (error) {
      console.error('[Aria2] Failed to add torrent file:', error.message);
      throw new Error(`Failed to add torrent file: ${error.message}`);
    }
  }

  /**
   * Get list of active downloads
   */
  async getActiveDownloads() {
    try {
      const result = await this.request('tellActive');
      return result;
    } catch (error) {
      console.error('[Aria2] Failed to get active downloads:', error.message);
      throw new Error(`Failed to get active downloads: ${error.message}`);
    }
  }

  /**
   * Get download status by GID
   */
  async getDownload(gid) {
    try {
      const result = await this.request('tellStatus', [gid]);
      return result;
    } catch (error) {
      console.error('[Aria2] Failed to get download:', error.message);
      throw new Error(`Failed to get download: ${error.message}`);
    }
  }

  /**
   * Remove download
   */
  async removeDownload(gid) {
    try {
      const result = await this.request('remove', [gid]);
      console.log('[Aria2] Successfully removed download:', gid);
      return result;
    } catch (error) {
      console.error('[Aria2] Failed to remove download:', error.message);
      throw new Error(`Failed to remove download: ${error.message}`);
    }
  }

  /**
   * Pause download
   */
  async pauseDownload(gid) {
    try {
      const result = await this.request('pause', [gid]);
      return result;
    } catch (error) {
      console.error('[Aria2] Failed to pause download:', error.message);
      throw new Error(`Failed to pause download: ${error.message}`);
    }
  }

  /**
   * Resume download
   */
  async resumeDownload(gid) {
    try {
      const result = await this.request('unpause', [gid]);
      return result;
    } catch (error) {
      console.error('[Aria2] Failed to resume download:', error.message);
      throw new Error(`Failed to resume download: ${error.message}`);
    }
  }
}

module.exports = Aria2Proxy;

