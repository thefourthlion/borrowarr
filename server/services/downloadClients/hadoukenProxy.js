const axios = require('axios');

class HadoukenProxy {
  constructor(settings) {
    this.settings = settings;
  }

  getBaseUrl() {
    const protocol = this.settings.useSsl ? 'https' : 'http';
    const host = this.settings.host || 'localhost';
    const port = this.settings.port || 7070;
    return `${protocol}://${host}:${port}/api`;
  }

  async testConnection() {
    try {
      const response = await axios.get(`${this.getBaseUrl()}/system`, {
        headers: { 'X-ApiKey': this.settings.apiKey },
        timeout: 30000,
      });
      
      if (response.data && response.data.versions) {
        const version = response.data.versions.hadouken;
        if (version < '5.1') {
          return {
            success: false,
            error: `Hadouken version too old (${version}). Need 5.1 or higher.`,
          };
        }
        return {
          success: true,
          message: `Successfully connected to Hadouken ${version}`,
        };
      }
      throw new Error('Unexpected response');
    } catch (error) {
      return {
        success: false,
        error: `Failed to connect to Hadouken: ${error.message}`,
      };
    }
  }

  async addTorrentFromMagnet(magnetLink) {
    try {
      await axios.post(`${this.getBaseUrl()}/torrents/add-url`, {
        url: magnetLink,
        label: this.settings.category || '',
      }, {
        headers: { 'X-ApiKey': this.settings.apiKey },
        timeout: 30000,
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
      form.append('file', Buffer.from(fileContent), filename);
      if (this.settings.category) {
        form.append('label', this.settings.category);
      }

      await axios.post(`${this.getBaseUrl()}/torrents/add-file`, form, {
        headers: { ...form.getHeaders(), 'X-ApiKey': this.settings.apiKey },
        timeout: 30000,
      });
      return filename;
    } catch (error) {
      throw new Error(`Failed to add torrent: ${error.message}`);
    }
  }
}

module.exports = HadoukenProxy;
