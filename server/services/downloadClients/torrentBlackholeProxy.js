const fs = require('fs').promises;
const path = require('path');

class TorrentBlackholeProxy {
  constructor(settings) {
    this.settings = settings;
  }

  async testConnection() {
    try {
      const folder = this.settings.torrentFolder || '/tmp/blackhole';
      await fs.access(folder, fs.constants.W_OK);
      return {
        success: true,
        message: `Torrent blackhole folder accessible: ${folder}`,
      };
    } catch (error) {
      return {
        success: false,
        error: `Cannot access torrent folder: ${error.message}`,
      };
    }
  }

  async addTorrentFromMagnet(magnetLink) {
    if (!this.settings.saveMagnetFiles) {
      throw new Error('Magnet files not supported. Enable saveMagnetFiles setting.');
    }

    try {
      const folder = this.settings.torrentFolder || '/tmp/blackhole';
      const ext = this.settings.magnetFileExtension || '.magnet';
      const filename = `torrent_${Date.now()}${ext}`;
      const filepath = path.join(folder, filename);

      await fs.writeFile(filepath, magnetLink, 'utf8');
      console.log('[TorrentBlackhole] Saved magnet to:', filepath);
      return filename;
    } catch (error) {
      throw new Error(`Failed to save magnet file: ${error.message}`);
    }
  }

  async addTorrentFromFile(filename, fileContent) {
    try {
      const folder = this.settings.torrentFolder || '/tmp/blackhole';
      const filepath = path.join(folder, filename);

      await fs.writeFile(filepath, fileContent);
      console.log('[TorrentBlackhole] Saved torrent to:', filepath);
      return filename;
    } catch (error) {
      throw new Error(`Failed to save torrent file: ${error.message}`);
    }
  }
}

module.exports = TorrentBlackholeProxy;
