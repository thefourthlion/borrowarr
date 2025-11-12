const axios = require('axios');

/**
 * Flood Download Client Proxy
 * Modern web UI for rTorrent, Transmission, and qBittorrent
 * @see https://github.com/jesec/flood
 */
class FloodProxy {
  constructor(settings) {
    this.settings = settings;
    this.authCookie = null;
  }

  getBaseUrl() {
    const protocol = this.settings.useSsl ? 'https' : 'http';
    const host = this.settings.host || 'localhost';
    const port = this.settings.port || 3000;
    return `${protocol}://${host}:${port}/api`;
  }

  async authenticate() {
    try {
      const response = await axios.post(`${this.getBaseUrl()}/auth/authenticate`, {
        username: this.settings.username,
        password: this.settings.password,
      }, { timeout: 30000 });

      if (response.data && response.data.success) {
        this.authCookie = response.headers['set-cookie'];
        return true;
      }
      throw new Error('Authentication failed');
    } catch (error) {
      throw new Error(`Flood authentication failed: ${error.message}`);
    }
  }

  async request(method, endpoint, data = null) {
    if (!this.authCookie) {
      await this.authenticate();
    }

    const config = {
      method,
      url: `${this.getBaseUrl()}${endpoint}`,
      headers: { 'Cookie': this.authCookie },
      timeout: 30000,
    };

    if (data) config.data = data;

    const response = await axios(config);
    return response.data;
  }

  async testConnection() {
    try {
      await this.authenticate();
      await this.request('GET', '/client/connection-test');
      return {
        success: true,
        message: 'Successfully connected to Flood',
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to connect to Flood: ${error.message}`,
      };
    }
  }

  async addTorrentFromMagnet(magnetLink) {
    try {
      const response = await this.request('POST', '/torrents/add-urls', {
        urls: [magnetLink],
        tags: this.settings.category ? [this.settings.category] : [],
        start: !this.settings.addPaused,
      });
      const hashMatch = magnetLink.match(/btih:([a-f0-9]{40})/i);
      return hashMatch ? hashMatch[1] : null;
    } catch (error) {
      throw new Error(`Failed to add magnet: ${error.message}`);
    }
  }

  async addTorrentFromFile(filename, fileContent) {
    try {
      const FormData = require('form-data');
      const form = new FormData();
      form.append('torrents', Buffer.from(fileContent), filename);
      if (this.settings.category) {
        form.append('tags', this.settings.category);
      }
      form.append('start', !this.settings.addPaused);

      if (!this.authCookie) await this.authenticate();

      await axios.post(`${this.getBaseUrl()}/torrents/add-files`, form, {
        headers: { ...form.getHeaders(), 'Cookie': this.authCookie },
        timeout: 30000,
      });
      return filename;
    } catch (error) {
      throw new Error(`Failed to add torrent file: ${error.message}`);
    }
  }
}

module.exports = FloodProxy;
