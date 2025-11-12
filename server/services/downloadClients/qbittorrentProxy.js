const axios = require('axios');

/**
 * qBittorrent Download Client Proxy
 * Implements qBittorrent Web API v2.x
 * @see https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-(qBittorrent-4.1)
 */
class QBittorrentProxy {
  constructor(settings) {
    this.settings = settings;
    this.cookie = null;
  }

  /**
   * Build base URL for qBittorrent API
   */
  getBaseUrl() {
    const protocol = this.settings.useSsl ? 'https' : 'http';
    const host = this.settings.host || 'localhost';
    const port = this.settings.port || 8080;
    const urlBase = this.settings.urlBase || '';
    return `${protocol}://${host}:${port}${urlBase}`;
  }

  /**
   * Authenticate with qBittorrent
   */
  async authenticate() {
    try {
      const response = await axios.post(`${this.getBaseUrl()}/api/v2/auth/login`, 
        `username=${encodeURIComponent(this.settings.username || 'admin')}&password=${encodeURIComponent(this.settings.password || '')}`,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: 30000,
        }
      );

      // qBittorrent returns "Ok." on successful login
      if (response.data === 'Ok.' || response.status === 200) {
        // Extract cookie from Set-Cookie header
        const cookies = response.headers['set-cookie'];
        if (cookies && cookies.length > 0) {
          this.cookie = cookies[0].split(';')[0];
        }
        return true;
      }
      
      throw new Error('Authentication failed');
    } catch (error) {
      console.error('[QBittorrent] Authentication error:', error.message);
      throw new Error(`Authentication failed: ${error.message}`);
    }
  }

  /**
   * Make authenticated API request
   */
  async request(method, endpoint, data = null) {
    if (!this.cookie) {
      await this.authenticate();
    }

    const config = {
      method,
      url: `${this.getBaseUrl()}${endpoint}`,
      headers: {
        'Cookie': this.cookie,
      },
      timeout: 30000,
    };

    if (data) {
      if (method.toUpperCase() === 'POST') {
        config.headers['Content-Type'] = 'application/x-www-form-urlencoded';
        config.data = data;
      } else {
        config.params = data;
      }
    }

    try {
      const response = await axios(config);
      return response.data;
    } catch (error) {
      // If we get a 403, try re-authenticating
      if (error.response && error.response.status === 403) {
        console.log('[QBittorrent] Re-authenticating...');
        this.cookie = null;
        await this.authenticate();
        config.headers['Cookie'] = this.cookie;
        const response = await axios(config);
        return response.data;
      }
      throw error;
    }
  }

  /**
   * Test connection to qBittorrent
   */
  async testConnection() {
    try {
      await this.authenticate();
      
      // Get API version
      const version = await this.request('GET', '/api/v2/app/webapiVersion');
      console.log('[QBittorrent] API Version:', version);

      // Test getting torrents list
      await this.request('GET', '/api/v2/torrents/info');

      return {
        success: true,
        message: `Successfully connected to qBittorrent (API v${version})`,
      };
    } catch (error) {
      console.error('[QBittorrent] Test connection failed:', error.message);
      return {
        success: false,
        error: `Failed to connect to qBittorrent: ${error.message}`,
      };
    }
  }

  /**
   * Add torrent from magnet link
   */
  async addTorrentFromMagnet(magnetLink) {
    try {
      const params = new URLSearchParams();
      params.append('urls', magnetLink);
      
      // Add category if configured
      if (this.settings.category) {
        params.append('category', this.settings.category);
      }

      // Set add paused if configured
      if (this.settings.addPaused) {
        params.append('paused', 'true');
      }

      await this.request('POST', '/api/v2/torrents/add', params.toString());

      // Extract hash from magnet link
      const hashMatch = magnetLink.match(/btih:([a-f0-9]{40})/i);
      const hash = hashMatch ? hashMatch[1] : null;

      console.log('[QBittorrent] Successfully added magnet link');
      return hash;
    } catch (error) {
      console.error('[QBittorrent] Failed to add magnet:', error.message);
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
      
      form.append('torrents', Buffer.from(fileContent), {
        filename: filename,
        contentType: 'application/x-bittorrent',
      });

      // Add category if configured
      if (this.settings.category) {
        form.append('category', this.settings.category);
      }

      // Set add paused if configured
      if (this.settings.addPaused) {
        form.append('paused', 'true');
      }

      if (!this.cookie) {
        await this.authenticate();
      }

      const response = await axios.post(
        `${this.getBaseUrl()}/api/v2/torrents/add`,
        form,
        {
          headers: {
            ...form.getHeaders(),
            'Cookie': this.cookie,
          },
          timeout: 30000,
        }
      );

      console.log('[QBittorrent] Successfully added torrent file');
      
      // Return filename as identifier (we can't easily get hash from response)
      return filename;
    } catch (error) {
      console.error('[QBittorrent] Failed to add torrent file:', error.message);
      throw new Error(`Failed to add torrent file: ${error.message}`);
    }
  }

  /**
   * Get list of torrents
   */
  async getTorrents() {
    try {
      const torrents = await this.request('GET', '/api/v2/torrents/info');
      return torrents;
    } catch (error) {
      console.error('[QBittorrent] Failed to get torrents:', error.message);
      throw new Error(`Failed to get torrents: ${error.message}`);
    }
  }

  /**
   * Get categories
   */
  async getCategories() {
    try {
      const categories = await this.request('GET', '/api/v2/torrents/categories');
      return categories;
    } catch (error) {
      console.error('[QBittorrent] Failed to get categories:', error.message);
      throw new Error(`Failed to get categories: ${error.message}`);
    }
  }

  /**
   * Add category
   */
  async addCategory(category) {
    try {
      const params = new URLSearchParams();
      params.append('category', category);
      await this.request('POST', '/api/v2/torrents/createCategory', params.toString());
      console.log('[QBittorrent] Category created:', category);
      return true;
    } catch (error) {
      console.error('[QBittorrent] Failed to add category:', error.message);
      throw new Error(`Failed to add category: ${error.message}`);
    }
  }
}

module.exports = QBittorrentProxy;

