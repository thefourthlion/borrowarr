/**
 * Deluge Proxy
 * Node.js implementation of Prowlarr's DelugeProxy
 */

const axios = require('axios');
const crypto = require('crypto');

class DelugeProxy {
  constructor(settings) {
    this.settings = settings;
    this.baseUrl = `${settings.useSsl ? 'https' : 'http'}://${settings.host}:${settings.port}`;
    if (settings.urlBase) {
      this.baseUrl += settings.urlBase;
    }
    this.baseUrl += '/json';
    this.authCookie = null;
    this.authenticating = false; // Flag to prevent re-authentication during auth process
  }

  /**
   * Generate request ID for JSON-RPC
   */
  generateRequestId() {
    return Math.floor(Math.random() * 1000000);
  }

  /**
   * Authenticate with Deluge
   */
  async authenticate() {
    console.log('[authenticate] Starting authentication check');
    // Prevent re-authentication if already authenticating
    if (this.authenticating) {
      console.log('[authenticate] Already authenticating, waiting...');
      // Wait a bit and check if authCookie is set
      await new Promise(resolve => setTimeout(resolve, 100));
      if (this.authCookie) {
        console.log('[authenticate] Auth cookie found, returning');
        return true;
      }
    }

    // If already authenticated, skip
    if (this.authCookie) {
      console.log('[authenticate] Already authenticated, skipping');
      return true;
    }

    console.log('[authenticate] Starting new authentication to:', this.baseUrl);
    this.authenticating = true;
    try {
      const requestId = this.generateRequestId();
      console.log('[authenticate] Sending auth.login request...');
      const response = await axios.post(this.baseUrl, {
        method: 'auth.login',
        params: [this.settings.password],
        id: requestId,
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 15000,
        withCredentials: true,
      });
      console.log('[authenticate] Received response, status:', response.status);

      // Check HTTP status
      if (response.status !== 200) {
        throw new Error(`Deluge connection failed: HTTP ${response.status}`);
      }

      if (response.data.error) {
        throw new Error(`Deluge authentication failed: ${response.data.error.message || 'Unknown error'}`);
      }

      if (response.data.result === true) {
        console.log('[authenticate] Authentication successful');
        // Store auth cookie from response headers
        const cookies = response.headers['set-cookie'];
        if (cookies) {
          this.authCookie = cookies[0].split(';')[0];
          console.log('[authenticate] Auth cookie stored');
        } else {
          console.warn('[authenticate] No cookie in response headers');
        }
        
        // Don't connect to daemon during authentication - it causes infinite loops
        // Daemon connection can be done separately if needed
        
        this.authenticating = false;
        console.log('[authenticate] Authentication process complete');
        return true;
      }

      throw new Error('Deluge authentication failed: Invalid credentials');
    } catch (error) {
      this.authenticating = false;
      if (error.response) {
        throw new Error(`Deluge connection failed: ${error.response.status} ${error.response.statusText}`);
      }
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Unable to connect to Deluge. Please check host and port.');
      }
      if (error.code === 'ETIMEDOUT') {
        throw new Error('Connection to Deluge timed out.');
      }
      throw error;
    }
  }

  /**
   * Connect to Deluge daemon
   */
  async connectDaemon() {
    try {
      // Use direct request to avoid recursion
      const requestId = this.generateRequestId();
      const headers = {
        'Content-Type': 'application/json',
      };
      if (this.authCookie) {
        headers['Cookie'] = this.authCookie;
      }

      // Check if already connected
      const connectedResponse = await axios.post(this.baseUrl, {
        method: 'web.connected',
        params: [],
        id: requestId,
      }, {
        headers: headers,
        timeout: 10000,
        withCredentials: true,
      });

      if (connectedResponse.data.result === true) {
        return; // Already connected
      }

      // Get available hosts
      const hostsResponse = await axios.post(this.baseUrl, {
        method: 'web.get_hosts',
        params: [],
        id: this.generateRequestId(),
      }, {
        headers: headers,
        timeout: 10000,
        withCredentials: true,
      });

      const hosts = hostsResponse.data.result;
      
      if (hosts && Array.isArray(hosts) && hosts.length > 0) {
        // Find localhost connection (127.0.0.1)
        const localhost = hosts.find((host) => {
          if (Array.isArray(host) && host.length > 1) {
            return host[1] === '127.0.0.1' || host[1] === 'localhost';
          }
          return false;
        });

        if (localhost && localhost[0]) {
          await axios.post(this.baseUrl, {
            method: 'web.connect',
            params: [localhost[0]],
            id: this.generateRequestId(),
          }, {
            headers: headers,
            timeout: 10000,
            withCredentials: true,
          });
          return;
        }

        // If no localhost found, connect to first available
        if (hosts[0] && hosts[0][0]) {
          await axios.post(this.baseUrl, {
            method: 'web.connect',
            params: [hosts[0][0]],
            id: this.generateRequestId(),
          }, {
            headers: headers,
            timeout: 10000,
            withCredentials: true,
          });
          return;
        }
      }
    } catch (error) {
      // Silently fail - daemon connection is optional
    }
  }

  /**
   * Make JSON-RPC request to Deluge
   */
  async processRequest(method, ...params) {
    try {
      // Authenticate if not already authenticated
      if (!this.authCookie) {
        await this.authenticate();
      }

      const requestId = this.generateRequestId();
      const headers = {
        'Content-Type': 'application/json',
      };
      
      if (this.authCookie) {
        headers['Cookie'] = this.authCookie;
      }

      const response = await axios.post(this.baseUrl, {
        method: method,
        params: params,
        id: requestId,
      }, {
        headers: headers,
        timeout: 15000, // Increased timeout to 15 seconds
        withCredentials: true,
      });

      // Check HTTP status
      if (response.status !== 200) {
        throw new Error(`Deluge request failed: HTTP ${response.status}`);
      }

      if (response.data.error) {
        const errorCode = response.data.error.code;
        const errorMessage = response.data.error.message || JSON.stringify(response.data.error);
        
        // If authentication error (code 1 or 2), try to re-authenticate once
        if (errorCode === 1 || errorCode === 2 || errorMessage.includes('Not authenticated') || errorMessage.includes('not authenticated')) {
          this.authCookie = null;
          await this.authenticate();
          // Retry the request
          return this.processRequest(method, ...params);
        }
        throw new Error(`Deluge error: ${errorMessage}`);
      }

      return response.data.result;
    } catch (error) {
      if (error.response) {
        throw new Error(`Deluge request failed: ${error.response.status} ${error.response.statusText}`);
      }
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Unable to connect to Deluge. Please check host and port.');
      }
      if (error.code === 'ETIMEDOUT') {
        throw new Error('Connection to Deluge timed out.');
      }
      throw error;
    }
  }

  /**
   * Get Deluge version
   */
  async getVersion() {
    try {
      const version = await this.processRequest('daemon.info');
      return version;
    } catch (error) {
      // Try alternative method for Deluge v2
      if (error.message.includes('Unknown method') || error.message.includes('Deluge error')) {
        try {
          return await this.processRequest('daemon.get_version');
        } catch (v2Error) {
          // If both fail, return null - version is optional
          console.warn('Could not get Deluge version:', v2Error.message);
          return null;
        }
      }
      // For other errors, also return null instead of throwing
      console.warn('Could not get Deluge version:', error.message);
      return null;
    }
  }

  /**
   * Get Deluge configuration
   */
  async getConfig() {
    return await this.processRequest('core.get_config');
  }

  /**
   * Get all torrents
   */
  async getTorrents() {
    const requiredProperties = [
      'hash', 'name', 'state', 'progress', 'eta', 'message',
      'is_finished', 'save_path', 'total_size', 'total_done',
      'time_added', 'active_time', 'ratio', 'is_auto_managed',
      'stop_at_ratio', 'remove_at_ratio', 'stop_ratio'
    ];
    
    const filter = {};
    const response = await this.processRequest('web.update_ui', requiredProperties, filter);
    
    if (response && response.torrents) {
      return Object.values(response.torrents);
    }
    
    return [];
  }

  /**
   * Test connection
   */
  async testConnection() {
    try {
      console.log('[testConnection] Starting authentication...');
      await this.authenticate();
      console.log('[testConnection] Authentication completed');
      
      // Authentication is sufficient - don't try to get version as it requires daemon connection
      // which can cause infinite loops
      console.log('[testConnection] Returning success result');
      return {
        success: true,
        version: 'Unknown',
        message: 'Successfully authenticated with Deluge',
      };
    } catch (error) {
      console.error('[testConnection] Error caught:', error.message, error.stack);
      return {
        success: false,
        error: error.message || 'Connection test failed',
      };
    }
  }

  /**
   * Add torrent from magnet link
   */
  async addTorrentFromMagnet(magnetLink) {
    const options = {
      add_paused: this.settings.addPaused || false,
      remove_at_ratio: false,
    };

    if (this.settings.category) {
      options.label = this.settings.category;
    }

    const hash = await this.processRequest('core.add_torrent_magnet', magnetLink, options);
    return hash;
  }

  /**
   * Add torrent from file
   */
  async addTorrentFromFile(filename, fileContent) {
    const options = {
      add_paused: this.settings.addPaused || false,
      remove_at_ratio: false,
    };

    if (this.settings.category) {
      options.label = this.settings.category;
    }

    // Convert file content to base64
    const base64Content = Buffer.from(fileContent).toString('base64');
    const hash = await this.processRequest('core.add_torrent_file', filename, base64Content, options);
    return hash;
  }
}

module.exports = DelugeProxy;
