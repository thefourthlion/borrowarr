/**
 * SABnzbd Proxy
 * Node.js implementation of Prowlarr's SABnzbdProxy
 */

const axios = require('axios');

class SabnzbdProxy {
  constructor(settings) {
    this.settings = settings;
    let baseUrl = `${settings.useSsl ? 'https' : 'http'}://${settings.host}:${settings.port}`;
    
    // Handle urlBase if provided
    if (settings.urlBase && settings.urlBase.trim() !== '') {
      // Remove leading/trailing slashes and add properly
      const urlBase = settings.urlBase.replace(/^\/+|\/+$/g, '');
      if (urlBase) {
        baseUrl += `/${urlBase}`;
      }
    }
    
    // Ensure baseUrl ends with /api (SABnzbd API endpoint)
    // SABnzbd API is typically at /sabnzbd/api or just /api depending on configuration
    if (!baseUrl.endsWith('/api')) {
      // If urlBase was provided and doesn't include 'sabnzbd', try /api directly
      // Otherwise default to /sabnzbd/api
      if (settings.urlBase && !settings.urlBase.includes('sabnzbd')) {
        baseUrl += '/api';
      } else if (settings.urlBase === '/' || settings.urlBase === '') {
        // If urlBase is explicitly set to root, try /api directly
        baseUrl += '/api';
      } else {
        // Default to /sabnzbd/api
        baseUrl += '/sabnzbd/api';
      }
    }
    
    this.baseUrl = baseUrl;
    this.apiKey = settings.apiKey;
  }

  /**
   * Make API request to SABnzbd
   */
  async makeRequest(params) {
    try {
      const requestParams = {
        ...params,
        apikey: this.apiKey,
        output: 'json',
      };

      const response = await axios.get(this.baseUrl, {
        params: requestParams,
        timeout: 15000,
        headers: {
          'User-Agent': 'BorrowArr/1.0',
        },
      });

      if (response.status !== 200) {
        throw new Error(`SABnzbd request failed: HTTP ${response.status}`);
      }

      const data = response.data;

      // SABnzbd returns JSON with status and error fields
      if (data.status === false) {
        throw new Error(data.error || 'SABnzbd API error');
      }

      return data;
    } catch (error) {
      if (error.response) {
        const status = error.response.status;
        const statusText = error.response.statusText;
        if (status === 401 || status === 403) {
          throw new Error('SABnzbd authentication failed. Please check your API key.');
        }
        throw new Error(`SABnzbd request failed: HTTP ${status} ${statusText}`);
      }
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Unable to connect to SABnzbd. Please check host and port.');
      }
      if (error.code === 'ETIMEDOUT') {
        throw new Error('Connection to SABnzbd timed out.');
      }
      if (error.message) {
        throw error;
      }
      throw new Error('SABnzbd connection failed');
    }
  }

  /**
   * Get SABnzbd version
   */
  async getVersion() {
    try {
      const response = await this.makeRequest({ mode: 'version' });
      return response.version || null;
    } catch (error) {
      console.warn('Could not get SABnzbd version:', error.message);
      return null;
    }
  }

  /**
   * Test connection
   */
  async testConnection() {
    try {
      if (!this.apiKey) {
        throw new Error('API key is required');
      }

      const response = await this.makeRequest({ mode: 'version' });
      
      return {
        success: true,
        version: response.version || 'Unknown',
        message: `Successfully connected to SABnzbd${response.version ? ` (v${response.version})` : ''}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Connection test failed',
      };
    }
  }

  /**
   * Map priority string to SABnzbd priority number
   */
  mapPriority(priority) {
    const priorityMap = {
      'Default': 0,
      'Paused': 1,
      'Low': -1,
      'Normal': 0,
      'High': 1,
      'Force': 2,
    };
    return priorityMap[priority] !== undefined ? priorityMap[priority] : 0;
  }

  /**
   * Add NZB from URL
   */
  async addNzbFromUrl(nzbUrl) {
    try {
      if (!this.apiKey) {
        throw new Error('API key is required');
      }

      const params = {
        mode: 'addurl',
        name: nzbUrl,
      };

      // Add category if specified
      if (this.settings.category) {
        params.cat = this.settings.category;
      }

      // Add priority
      const priority = this.settings.priority || 'Default';
      params.priority = this.mapPriority(priority);

      // Add paused flag (pp=3 means add paused)
      if (this.settings.addPaused) {
        params.pp = 3;
      }

      const response = await this.makeRequest(params);

      if (response.status === true || response.nzo_ids) {
        return response.nzo_ids?.[0] || 'success';
      }

      throw new Error(response.error || 'Failed to add NZB');
    } catch (error) {
      throw new Error(`Failed to add NZB to SABnzbd: ${error.message}`);
    }
  }

  /**
   * Add NZB from file using POST with multipart/form-data
   * This avoids HTTP 414 errors when using base64 in URL parameters
   */
  async addNzbFromFile(filename, fileContent) {
    try {
      if (!this.apiKey) {
        throw new Error('API key is required');
      }

      // Build URL with query parameters (not including the file)
      const urlParams = new URLSearchParams({
        mode: 'addfile',
        apikey: this.apiKey,
        output: 'json',
      });

      // Add category if specified
      if (this.settings.category) {
        urlParams.append('cat', this.settings.category);
      }

      // Add priority
      const priority = this.settings.priority || 'Default';
      urlParams.append('priority', String(this.mapPriority(priority)));

      // Add paused flag (pp=3 means add paused)
      if (this.settings.addPaused) {
        urlParams.append('pp', '3');
      }

      // Use FormData for multipart upload
      const FormData = require('form-data');
      const formData = new FormData();
      
      // SABnzbd expects the file in the 'nzbfile' field
      // The file content should be sent as a buffer
      formData.append('nzbfile', fileContent, {
        filename: filename || 'download.nzb',
        contentType: 'application/x-nzb',
      });

      // Make POST request with multipart/form-data
      const response = await axios.post(
        `${this.baseUrl}?${urlParams.toString()}`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            'User-Agent': 'BorrowArr/1.0',
          },
          timeout: 30000, // Longer timeout for file uploads
        }
      );

      if (response.status !== 200) {
        throw new Error(`SABnzbd request failed: HTTP ${response.status}`);
      }

      const data = response.data;

      // SABnzbd returns JSON with status and error fields
      if (data.status === false) {
        throw new Error(data.error || 'SABnzbd API error');
      }

      if (data.status === true || data.nzo_ids) {
        return data.nzo_ids?.[0] || 'success';
      }

      throw new Error(data.error || 'Failed to add NZB');
    } catch (error) {
      if (error.response) {
        const status = error.response.status;
        const statusText = error.response.statusText;
        if (status === 401 || status === 403) {
          throw new Error('SABnzbd authentication failed. Please check your API key.');
        }
        if (status === 414) {
          throw new Error('SABnzbd request URL too long. This should not happen with POST uploads.');
        }
        throw new Error(`SABnzbd request failed: HTTP ${status} ${statusText}`);
      }
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Unable to connect to SABnzbd. Please check host and port.');
      }
      if (error.code === 'ETIMEDOUT') {
        throw new Error('Connection to SABnzbd timed out.');
      }
      if (error.message) {
        throw error;
      }
      throw new Error(`Failed to add NZB to SABnzbd: ${error.message || 'Unknown error'}`);
    }
  }
}

module.exports = SabnzbdProxy;

