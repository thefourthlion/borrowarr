const axios = require('axios');
const crypto = require('crypto');

/**
 * Transmission Download Client Proxy
 * Implements Transmission RPC API
 * @see https://github.com/transmission/transmission/blob/main/docs/rpc-spec.md
 */
class TransmissionProxy {
  constructor(settings) {
    this.settings = settings;
    this.sessionId = null;
  }

  /**
   * Build base URL for Transmission API
   */
  getBaseUrl() {
    const protocol = this.settings.useSsl ? 'https' : 'http';
    const host = this.settings.host || 'localhost';
    const port = this.settings.port || 9091;
    const urlBase = this.settings.urlBase || '/transmission';
    return `${protocol}://${host}:${port}${urlBase}/rpc`;
  }

  /**
   * Get auth headers
   */
  getAuthHeaders() {
    if (this.settings.username && this.settings.password) {
      const auth = Buffer.from(`${this.settings.username}:${this.settings.password}`).toString('base64');
      return {
        'Authorization': `Basic ${auth}`,
      };
    }
    return {};
  }

  /**
   * Make RPC request to Transmission
   */
  async request(method, arguments_ = {}) {
    const headers = {
      ...this.getAuthHeaders(),
      'Content-Type': 'application/json',
    };

    if (this.sessionId) {
      headers['X-Transmission-Session-Id'] = this.sessionId;
    }

    const data = {
      method,
      arguments: arguments_,
    };

    try {
      const response = await axios.post(this.getBaseUrl(), data, {
        headers,
        timeout: 30000,
      });

      return response.data;
    } catch (error) {
      // Transmission returns 409 with Session ID on first request
      if (error.response && error.response.status === 409) {
        this.sessionId = error.response.headers['x-transmission-session-id'];
        console.log('[Transmission] Got session ID, retrying...');
        
        headers['X-Transmission-Session-Id'] = this.sessionId;
        const response = await axios.post(this.getBaseUrl(), data, {
          headers,
          timeout: 30000,
        });
        return response.data;
      }
      throw error;
    }
  }

  /**
   * Test connection to Transmission
   */
  async testConnection() {
    try {
      const response = await this.request('session-get');
      
      if (response && response.result === 'success') {
        const version = response.arguments.version || 'unknown';
        console.log('[Transmission] Connected, version:', version);
        
        // Test getting torrents
        await this.request('torrent-get', {
          fields: ['id', 'name', 'status'],
        });

        return {
          success: true,
          message: `Successfully connected to Transmission ${version}`,
        };
      }

      return {
        success: false,
        error: 'Unexpected response from Transmission',
      };
    } catch (error) {
      console.error('[Transmission] Test connection failed:', error.message);
      
      // Check for authentication error
      if (error.response && error.response.status === 401) {
        return {
          success: false,
          error: 'Authentication failed. Please check your username and password.',
        };
      }

      return {
        success: false,
        error: `Failed to connect to Transmission: ${error.message}`,
      };
    }
  }

  /**
   * Add torrent from magnet link
   */
  async addTorrentFromMagnet(magnetLink) {
    try {
      const args = {
        filename: magnetLink,
      };

      // Add paused if configured
      if (this.settings.addPaused) {
        args.paused = true;
      }

      // Set download directory/category if configured
      if (this.settings.category) {
        args['download-dir'] = this.settings.category;
      }

      const response = await this.request('torrent-add', args);

      if (response.result === 'success') {
        const torrent = response.arguments['torrent-added'] || response.arguments['torrent-duplicate'];
        console.log('[Transmission] Successfully added magnet, torrent ID:', torrent.id);
        
        // Extract hash from magnet link
        const hashMatch = magnetLink.match(/btih:([a-f0-9]{40})/i);
        return hashMatch ? hashMatch[1] : torrent.hashString;
      }

      throw new Error(response.result || 'Failed to add torrent');
    } catch (error) {
      console.error('[Transmission] Failed to add magnet:', error.message);
      throw new Error(`Failed to add magnet link: ${error.message}`);
    }
  }

  /**
   * Add torrent from file
   */
  async addTorrentFromFile(filename, fileContent) {
    try {
      // Transmission expects base64 encoded metainfo
      const metainfo = Buffer.from(fileContent).toString('base64');

      const args = {
        metainfo,
      };

      // Add paused if configured
      if (this.settings.addPaused) {
        args.paused = true;
      }

      // Set download directory/category if configured
      if (this.settings.category) {
        args['download-dir'] = this.settings.category;
      }

      const response = await this.request('torrent-add', args);

      if (response.result === 'success') {
        const torrent = response.arguments['torrent-added'] || response.arguments['torrent-duplicate'];
        console.log('[Transmission] Successfully added torrent file, torrent ID:', torrent.id);
        return torrent.hashString;
      }

      throw new Error(response.result || 'Failed to add torrent');
    } catch (error) {
      console.error('[Transmission] Failed to add torrent file:', error.message);
      throw new Error(`Failed to add torrent file: ${error.message}`);
    }
  }

  /**
   * Get list of torrents
   */
  async getTorrents() {
    try {
      const response = await this.request('torrent-get', {
        fields: [
          'id',
          'name',
          'status',
          'totalSize',
          'percentDone',
          'downloadDir',
          'isFinished',
          'hashString',
          'rateDownload',
          'rateUpload',
          'eta',
        ],
      });

      if (response.result === 'success') {
        return response.arguments.torrents;
      }

      throw new Error(response.result || 'Failed to get torrents');
    } catch (error) {
      console.error('[Transmission] Failed to get torrents:', error.message);
      throw new Error(`Failed to get torrents: ${error.message}`);
    }
  }

  /**
   * Remove torrent
   */
  async removeTorrent(id, deleteData = false) {
    try {
      const response = await this.request('torrent-remove', {
        ids: [id],
        'delete-local-data': deleteData,
      });

      if (response.result === 'success') {
        console.log('[Transmission] Successfully removed torrent:', id);
        return true;
      }

      throw new Error(response.result || 'Failed to remove torrent');
    } catch (error) {
      console.error('[Transmission] Failed to remove torrent:', error.message);
      throw new Error(`Failed to remove torrent: ${error.message}`);
    }
  }
}

module.exports = TransmissionProxy;

