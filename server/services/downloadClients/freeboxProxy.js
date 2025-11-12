const axios = require('axios');

class FreeboxProxy {
  constructor(settings) {
    this.settings = settings;
    this.sessionToken = null;
  }

  getBaseUrl() {
    const host = this.settings.host || 'mafreebox.freebox.fr';
    const port = this.settings.port || 443;
    return `https://${host}:${port}/api/v4`;
  }

  async authenticate() {
    try {
      const response = await axios.post(`${this.getBaseUrl()}/login/session`, {
        app_id: this.settings.appId,
        app_token: this.settings.appToken,
      }, { timeout: 30000 });

      if (response.data && response.data.success && response.data.result) {
        this.sessionToken = response.data.result.session_token;
        return true;
      }
      throw new Error('Authentication failed');
    } catch (error) {
      throw new Error(`Freebox authentication failed: ${error.message}`);
    }
  }

  async testConnection() {
    try {
      await this.authenticate();
      return {
        success: true,
        message: 'Successfully connected to Freebox Download',
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to connect to Freebox: ${error.message}`,
      };
    }
  }

  async addTorrentFromMagnet(magnetLink) {
    if (!this.sessionToken) await this.authenticate();
    try {
      await axios.post(`${this.getBaseUrl()}/downloads/add`, {
        download_url: magnetLink,
      }, {
        headers: { 'X-Fbx-App-Auth': this.sessionToken },
        timeout: 30000,
      });
      const hashMatch = magnetLink.match(/btih:([a-f0-9]{40})/i);
      return hashMatch ? hashMatch[1] : null;
    } catch (error) {
      throw new Error(`Failed to add magnet: ${error.message}`);
    }
  }

  async addTorrentFromFile(filename, fileContent) {
    if (!this.sessionToken) await this.authenticate();
    try {
      const base64Content = Buffer.from(fileContent).toString('base64');
      await axios.post(`${this.getBaseUrl()}/downloads/add`, {
        download_file: base64Content,
      }, {
        headers: { 'X-Fbx-App-Auth': this.sessionToken },
        timeout: 30000,
      });
      return filename;
    } catch (error) {
      throw new Error(`Failed to add torrent: ${error.message}`);
    }
  }
}

module.exports = FreeboxProxy;
