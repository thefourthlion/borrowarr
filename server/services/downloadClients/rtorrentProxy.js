const axios = require('axios');
const xmlrpc = require('xmlrpc');

/**
 * rTorrent Download Client Proxy
 * Implements rTorrent XML-RPC API
 * @see https://rtorrent-docs.readthedocs.io/en/latest/cmd-ref.html
 */
class RTorrentProxy {
  constructor(settings) {
    this.settings = settings;
  }

  /**
   * Get XML-RPC client
   */
  getClient() {
    const host = this.settings.host || 'localhost';
    const port = this.settings.port || 5000;
    const useSsl = this.settings.useSsl || false;
    const urlBase = this.settings.urlBase || '/RPC2';

    const options = {
      host,
      port,
      path: urlBase,
    };

    if (this.settings.username && this.settings.password) {
      options.basic_auth = {
        user: this.settings.username,
        pass: this.settings.password,
      };
    }

    return useSsl 
      ? xmlrpc.createSecureClient(options)
      : xmlrpc.createClient(options);
  }

  /**
   * Make XML-RPC call
   */
  async call(method, params = []) {
    return new Promise((resolve, reject) => {
      const client = this.getClient();
      
      client.methodCall(method, params, (error, value) => {
        if (error) {
          reject(error);
        } else {
          resolve(value);
        }
      });
    });
  }

  /**
   * Test connection to rTorrent
   */
  async testConnection() {
    try {
      // Get rTorrent version
      const version = await this.call('system.client_version');
      console.log('[rTorrent] Connected, version:', version);

      // Check version is 0.9.0 or higher
      if (version) {
        const versionMatch = version.match(/^(\d+)\.(\d+)\.(\d+)/);
        if (versionMatch) {
          const majorVersion = parseInt(versionMatch[1]);
          const minorVersion = parseInt(versionMatch[2]);
          
          if (majorVersion === 0 && minorVersion < 9) {
            return {
              success: false,
              error: `rTorrent version too low (${version}). Need 0.9.0 or higher.`,
            };
          }
        }
      }

      // Test getting download list
      await this.call('download_list');

      return {
        success: true,
        message: `Successfully connected to rTorrent ${version}`,
      };
    } catch (error) {
      console.error('[rTorrent] Test connection failed:', error.message);
      
      if (error.message && error.message.includes('401')) {
        return {
          success: false,
          error: 'Authentication failed. Please check your username and password.',
        };
      }

      return {
        success: false,
        error: `Failed to connect to rTorrent: ${error.message}`,
      };
    }
  }

  /**
   * Add torrent from URL (magnet or http)
   */
  async addTorrentFromMagnet(magnetLink) {
    try {
      const label = this.settings.category || '';
      const directory = this.settings.directory || '';
      const priority = this.settings.priority || 0;

      // load.start: Load and start torrent
      // load.normal: Just load without starting
      const command = this.settings.addPaused ? 'load.normal' : 'load.start';

      // rTorrent command: load.start('', url, 'd.directory.set=...', 'd.custom1.set=...')
      const params = ['', magnetLink];
      
      if (directory) {
        params.push(`d.directory.set=${directory}`);
      }
      
      if (label) {
        params.push(`d.custom1.set=${label}`);
      }
      
      if (priority > 0) {
        params.push(`d.priority.set=${priority}`);
      }

      await this.call(command, params);

      // Extract hash from magnet link
      const hashMatch = magnetLink.match(/btih:([a-f0-9]{40})/i);
      const hash = hashMatch ? hashMatch[1].toUpperCase() : null;

      console.log('[rTorrent] Successfully added magnet link');
      return hash;
    } catch (error) {
      console.error('[rTorrent] Failed to add magnet:', error.message);
      throw new Error(`Failed to add magnet link: ${error.message}`);
    }
  }

  /**
   * Add torrent from file
   */
  async addTorrentFromFile(filename, fileContent) {
    try {
      const label = this.settings.category || '';
      const directory = this.settings.directory || '';
      const priority = this.settings.priority || 0;

      // Convert file content to base64 (xmlrpc will encode it)
      const torrentData = xmlrpc.CustomType(
        Buffer.from(fileContent),
        'base64'
      );

      // load.raw_start: Load and start torrent from raw data
      // load.raw: Just load without starting
      const command = this.settings.addPaused ? 'load.raw' : 'load.raw_start';

      const params = ['', torrentData];
      
      if (directory) {
        params.push(`d.directory.set=${directory}`);
      }
      
      if (label) {
        params.push(`d.custom1.set=${label}`);
      }
      
      if (priority > 0) {
        params.push(`d.priority.set=${priority}`);
      }

      await this.call(command, params);

      console.log('[rTorrent] Successfully added torrent file');
      return filename;
    } catch (error) {
      console.error('[rTorrent] Failed to add torrent file:', error.message);
      throw new Error(`Failed to add torrent file: ${error.message}`);
    }
  }

  /**
   * Get list of torrents
   */
  async getTorrents() {
    try {
      // Get list of all download hashes
      const hashes = await this.call('download_list');
      
      if (!hashes || hashes.length === 0) {
        return [];
      }

      // Get details for each torrent
      // Using d.multicall to get multiple fields at once
      const torrents = await this.call('d.multicall2', [
        '',
        'main',
        'd.hash=',
        'd.name=',
        'd.size_bytes=',
        'd.completed_bytes=',
        'd.is_active=',
        'd.state=',
        'd.custom1=',  // Label/Category
        'd.directory=',
      ]);

      return torrents.map(t => ({
        hash: t[0],
        name: t[1],
        size: t[2],
        completed: t[3],
        isActive: t[4] === 1,
        state: t[5],
        label: t[6],
        directory: t[7],
      }));
    } catch (error) {
      console.error('[rTorrent] Failed to get torrents:', error.message);
      throw new Error(`Failed to get torrents: ${error.message}`);
    }
  }

  /**
   * Remove torrent
   */
  async removeTorrent(hash) {
    try {
      // d.erase: Remove torrent (keeps files)
      await this.call('d.erase', [hash]);
      console.log('[rTorrent] Successfully removed torrent:', hash);
      return true;
    } catch (error) {
      console.error('[rTorrent] Failed to remove torrent:', error.message);
      throw new Error(`Failed to remove torrent: ${error.message}`);
    }
  }

  /**
   * Start torrent
   */
  async startTorrent(hash) {
    try {
      await this.call('d.start', [hash]);
      console.log('[rTorrent] Successfully started torrent:', hash);
      return true;
    } catch (error) {
      console.error('[rTorrent] Failed to start torrent:', error.message);
      throw new Error(`Failed to start torrent: ${error.message}`);
    }
  }

  /**
   * Stop torrent
   */
  async stopTorrent(hash) {
    try {
      await this.call('d.stop', [hash]);
      console.log('[rTorrent] Successfully stopped torrent:', hash);
      return true;
    } catch (error) {
      console.error('[rTorrent] Failed to stop torrent:', error.message);
      throw new Error(`Failed to stop torrent: ${error.message}`);
    }
  }
}

module.exports = RTorrentProxy;

