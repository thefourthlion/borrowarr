const axios = require('axios');

/**
 * uTorrent Download Client Proxy
 * Implements uTorrent Web UI API
 * @see https://github.com/bittorrent/webui/wiki/web-ui-api
 */
class UTorrentProxy {
  constructor(settings) {
    this.settings = settings;
    this.token = null;
  }

  /**
   * Build base URL for uTorrent API
   */
  getBaseUrl() {
    const protocol = this.settings.useSsl ? 'https' : 'http';
    const host = this.settings.host || 'localhost';
    const port = this.settings.port || 8080;
    return `${protocol}://${host}:${port}/gui`;
  }

  /**
   * Get auth config
   */
  getAuthConfig() {
    if (this.settings.username && this.settings.password) {
      return {
        auth: {
          username: this.settings.username,
          password: this.settings.password,
        },
      };
    }
    return {};
  }

  /**
   * Get authentication token
   */
  async getToken() {
    try {
      const response = await axios.get(`${this.getBaseUrl()}/token.html`, {
        ...this.getAuthConfig(),
        timeout: 30000,
      });

      // Extract token from HTML response
      const match = response.data.match(/<div[^>]*id=['"]token['"][^>]*>([^<]+)<\/div>/i);
      if (match && match[1]) {
        this.token = match[1];
        console.log('[uTorrent] Got authentication token');
        return this.token;
      }

      throw new Error('Failed to extract token from response');
    } catch (error) {
      console.error('[uTorrent] Failed to get token:', error.message);
      throw new Error(`Failed to get token: ${error.message}`);
    }
  }

  /**
   * Make API request
   */
  async request(params = {}) {
    if (!this.token) {
      await this.getToken();
    }

    const url = `${this.getBaseUrl()}/`;
    params.token = this.token;

    try {
      const response = await axios.get(url, {
        ...this.getAuthConfig(),
        params,
        timeout: 30000,
      });

      return response.data;
    } catch (error) {
      // If authentication fails, try to get a new token
      if (error.response && error.response.status === 401) {
        console.log('[uTorrent] Re-authenticating...');
        this.token = null;
        await this.getToken();
        params.token = this.token;
        
        const response = await axios.get(url, {
          ...this.getAuthConfig(),
          params,
          timeout: 30000,
        });
        return response.data;
      }
      throw error;
    }
  }

  /**
   * Test connection to uTorrent
   */
  async testConnection() {
    try {
      await this.getToken();

      // Get version
      const response = await this.request({ action: 'getversion' });
      
      if (response && response.build) {
        const version = response.build;
        console.log('[uTorrent] Connected, build:', version);

        // Check version is 25406 or higher (version 3.0)
        if (version < 25406) {
          return {
            success: false,
            error: `uTorrent version too old (build ${version}). Need 3.0 or higher (build 25406+).`,
          };
        }

        // Test getting torrent list
        await this.request({ list: 1 });

        return {
          success: true,
          message: `Successfully connected to uTorrent (build ${version})`,
        };
      }

      return {
        success: false,
        error: 'Unexpected response from uTorrent',
      };
    } catch (error) {
      console.error('[uTorrent] Test connection failed:', error.message);
      
      if (error.response && error.response.status === 401) {
        return {
          success: false,
          error: 'Authentication failed. Please check your username and password.',
        };
      }

      return {
        success: false,
        error: `Failed to connect to uTorrent: ${error.message}`,
      };
    }
  }

  /**
   * Add torrent from URL (magnet or http)
   */
  async addTorrentFromMagnet(magnetLink) {
    try {
      await this.request({
        action: 'add-url',
        s: magnetLink,
      });

      // Extract hash from magnet link
      const hashMatch = magnetLink.match(/btih:([a-f0-9]{40})/i);
      const hash = hashMatch ? hashMatch[1].toUpperCase() : null;

      console.log('[uTorrent] Successfully added magnet link');

      // Apply label if configured
      if (hash && this.settings.category) {
        await this.setLabel(hash, this.settings.category);
      }

      return hash;
    } catch (error) {
      console.error('[uTorrent] Failed to add magnet:', error.message);
      throw new Error(`Failed to add magnet link: ${error.message}`);
    }
  }

  /**
   * Add torrent from file
   */
  async addTorrentFromFile(filename, fileContent) {
    try {
      const FormData = require('form-data');
      const form = new FormData();
      
      if (!this.token) {
        await this.getToken();
      }

      form.append('torrent_file', Buffer.from(fileContent), {
        filename: filename,
        contentType: 'application/x-bittorrent',
      });

      const response = await axios.post(
        `${this.getBaseUrl()}/?action=add-file&token=${this.token}`,
        form,
        {
          ...this.getAuthConfig(),
          headers: {
            ...form.getHeaders(),
          },
          timeout: 30000,
        }
      );

      console.log('[uTorrent] Successfully added torrent file');
      
      // Apply label if configured
      if (this.settings.category) {
        // We need to get the hash first - this is tricky with uTorrent
        // For now, just return filename
      }

      return filename;
    } catch (error) {
      console.error('[uTorrent] Failed to add torrent file:', error.message);
      throw new Error(`Failed to add torrent file: ${error.message}`);
    }
  }

  /**
   * Get list of torrents
   */
  async getTorrents() {
    try {
      const response = await this.request({ list: 1 });
      
      if (response && response.torrents) {
        return response.torrents;
      }

      return [];
    } catch (error) {
      console.error('[uTorrent] Failed to get torrents:', error.message);
      throw new Error(`Failed to get torrents: ${error.message}`);
    }
  }

  /**
   * Set label for torrent
   */
  async setLabel(hash, label) {
    try {
      await this.request({
        action: 'setprops',
        hash,
        s: 'label',
        v: label,
      });
      console.log('[uTorrent] Set label:', label, 'for:', hash);
      return true;
    } catch (error) {
      console.error('[uTorrent] Failed to set label:', error.message);
      throw new Error(`Failed to set label: ${error.message}`);
    }
  }

  /**
   * Remove torrent
   */
  async removeTorrent(hash) {
    try {
      await this.request({
        action: 'remove',
        hash,
      });
      console.log('[uTorrent] Successfully removed torrent:', hash);
      return true;
    } catch (error) {
      console.error('[uTorrent] Failed to remove torrent:', error.message);
      throw new Error(`Failed to remove torrent: ${error.message}`);
    }
  }

  /**
   * Start torrent
   */
  async startTorrent(hash) {
    try {
      await this.request({
        action: 'start',
        hash,
      });
      console.log('[uTorrent] Successfully started torrent:', hash);
      return true;
    } catch (error) {
      console.error('[uTorrent] Failed to start torrent:', error.message);
      throw new Error(`Failed to start torrent: ${error.message}`);
    }
  }

  /**
   * Stop torrent
   */
  async stopTorrent(hash) {
    try {
      await this.request({
        action: 'stop',
        hash,
      });
      console.log('[uTorrent] Successfully stopped torrent:', hash);
      return true;
    } catch (error) {
      console.error('[uTorrent] Failed to stop torrent:', error.message);
      throw new Error(`Failed to stop torrent: ${error.message}`);
    }
  }
}

module.exports = UTorrentProxy;

