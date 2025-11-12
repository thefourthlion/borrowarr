const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

class PneumaticProxy {
  constructor(settings) {
    this.settings = settings;
  }

  async testConnection() {
    try {
      const folder = this.settings.nzbFolder || '/tmp/pneumatic';
      await fs.access(folder, fs.constants.W_OK);
      return {
        success: true,
        message: `Pneumatic NZB folder accessible: ${folder}`,
      };
    } catch (error) {
      return {
        success: false,
        error: `Cannot access NZB folder: ${error.message}`,
      };
    }
  }

  async addNzbFromUrl(url) {
    try {
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 30000,
      });

      const filename = url.split('/').pop() || `nzb_${Date.now()}.nzb`;
      const cleanFilename = filename.split('?')[0];
      
      return await this.addNzbFromFile(cleanFilename, response.data);
    } catch (error) {
      throw new Error(`Failed to download NZB: ${error.message}`);
    }
  }

  async addNzbFromFile(filename, fileContent) {
    try {
      const folder = this.settings.nzbFolder || '/tmp/pneumatic';
      const filepath = path.join(folder, filename);

      await fs.writeFile(filepath, fileContent);
      console.log('[Pneumatic] Saved NZB to:', filepath);
      return filename;
    } catch (error) {
      throw new Error(`Failed to save NZB file: ${error.message}`);
    }
  }
}

module.exports = PneumaticProxy;
