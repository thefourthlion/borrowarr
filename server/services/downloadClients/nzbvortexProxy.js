const axios = require('axios');

class NzbVortexProxy {
  constructor(settings) {
    this.settings = settings;
  }

  getBaseUrl() {
    const protocol = this.settings.useSsl ? 'https' : 'http';
    const host = this.settings.host || 'localhost';
    const port = this.settings.port || 4321;
    return `${protocol}://${host}:${port}/api`;
  }

  async request(method, params = {}) {
    params.apikey = this.settings.apiKey;
    
    try {
      const response = await axios.get(`${this.getBaseUrl()}/${method}`, {
        params,
        timeout: 30000,
      });

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async testConnection() {
    try {
      const response = await this.request('app');
      
      if (response && response.version) {
        return {
          success: true,
          message: `Successfully connected to NZBVortex ${response.version}`,
        };
      }
      throw new Error('Unexpected response');
    } catch (error) {
      return {
        success: false,
        error: `Failed to connect to NZBVortex: ${error.message}`,
      };
    }
  }

  async addNzbFromUrl(url) {
    try {
      const response = await this.request('nzbadd', {
        url,
        group: this.settings.category || 'prowlarr',
        priority: this.settings.priority || 'Normal',
      });

      if (response && response.result === 'success') {
        return response.id || url;
      }
      throw new Error('Failed to add NZB');
    } catch (error) {
      throw new Error(`Failed to add NZB: ${error.message}`);
    }
  }

  async addNzbFromFile(filename, fileContent) {
    try {
      const FormData = require('form-data');
      const form = new FormData();
      form.append('apikey', this.settings.apiKey);
      form.append('nzb', Buffer.from(fileContent), filename);
      form.append('group', this.settings.category || 'prowlarr');
      form.append('priority', this.settings.priority || 'Normal');

      const response = await axios.post(`${this.getBaseUrl()}/nzbaddfile`, form, {
        headers: form.getHeaders(),
        timeout: 30000,
      });

      if (response.data && response.data.result === 'success') {
        return response.data.id || filename;
      }
      throw new Error('Failed to add NZB');
    } catch (error) {
      throw new Error(`Failed to add NZB: ${error.message}`);
    }
  }
}

module.exports = NzbVortexProxy;
