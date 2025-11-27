const axios = require('axios');

class DownloadStationProxy {
  constructor(settings) {
    this.settings = settings;
    this.sid = null;
  }

  getBaseUrl() {
    const protocol = this.settings.useSsl ? 'https' : 'http';
    const host = this.settings.host || 'localhost';
    const port = this.settings.port || 5000;
    return `${protocol}://${host}:${port}/webapi`;
  }

  async login() {
    try {
      const response = await axios.get(`${this.getBaseUrl()}/auth.cgi`, {
        params: {
          api: 'SYNO.API.Auth',
          version: 2,
          method: 'login',
          account: this.settings.username,
          passwd: this.settings.password,
          session: 'DownloadStation',
          format: 'sid',
        },
        timeout: 30000,
      });

      if (response.data && response.data.success) {
        this.sid = response.data.data.sid;
        return true;
      }
      throw new Error('Login failed');
    } catch (error) {
      throw new Error(`DownloadStation login failed: ${error.message}`);
    }
  }

  async testConnection() {
    try {
      await this.login();
      
      const response = await axios.get(`${this.getBaseUrl()}/DownloadStation/info.cgi`, {
        params: {
          api: 'SYNO.DownloadStation.Info',
          version: 1,
          method: 'getinfo',
          _sid: this.sid,
        },
        timeout: 30000,
      });

      if (response.data && response.data.success) {
        return {
          success: true,
          message: 'Successfully connected to Synology Download Station',
        };
      }
      throw new Error('Unexpected response');
    } catch (error) {
      return {
        success: false,
        error: `Failed to connect to Download Station: ${error.message}`,
      };
    }
  }

  async addTorrentFromMagnet(magnetLink) {
    if (!this.sid) await this.login();
    
    try {
      const response = await axios.get(`${this.getBaseUrl()}/DownloadStation/task.cgi`, {
        params: {
          api: 'SYNO.DownloadStation.Task',
          version: 1,
          method: 'create',
          uri: magnetLink,
          _sid: this.sid,
        },
        timeout: 30000,
      });

      if (response.data && response.data.success) {
        const hashMatch = magnetLink.match(/btih:([a-f0-9]{40})/i);
        return hashMatch ? hashMatch[1] : null;
      }
      throw new Error('Failed to add torrent');
    } catch (error) {
      throw new Error(`Failed to add magnet: ${error.message}`);
    }
  }

  async addTorrentFromFile(filename, fileContent) {
    if (!this.sid) await this.login();
    
    try {
      const FormData = require('form-data');
      const form = new FormData();
      form.append('api', 'SYNO.DownloadStation.Task');
      form.append('version', '1');
      form.append('method', 'create');
      form.append('_sid', this.sid);
      form.append('file', Buffer.from(fileContent), filename);

      const response = await axios.post(`${this.getBaseUrl()}/DownloadStation/task.cgi`, form, {
        headers: form.getHeaders(),
        timeout: 30000,
      });

      if (response.data && response.data.success) {
        return filename;
      }
      throw new Error('Failed to add torrent');
    } catch (error) {
      throw new Error(`Failed to add torrent: ${error.message}`);
    }
  }

  async addNzbFromUrl(url) {
    return await this.addTorrentFromMagnet(url);
  }

  async addNzbFromFile(filename, fileContent) {
    return await this.addTorrentFromFile(filename, fileContent);
  }
}

module.exports = DownloadStationProxy;
