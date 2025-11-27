/**
 * API Scraper
 * Handles indexers that provide JSON APIs (like YTS)
 */

const axios = require('axios');
const moment = require('moment');
const SizeParser = require('../filters/sizeParser');

class APIScraper {
  constructor(definition) {
    this.definition = definition;
    this.apiConfig = definition.api;
  }

  /**
   * Build API search URL
   */
  buildSearchURL(query, options = {}) {
    if (!this.apiConfig) {
      throw new Error('API configuration not found in definition');
    }

    const baseUrl = this.apiConfig.baseUrl || this.definition.links[0];
    const searchPath = this.apiConfig.searchPath || '/api';
    
    // Build full URL - if baseUrl already includes the path, use it directly
    let fullUrl;
    if (baseUrl.includes('/api/')) {
      // baseUrl already has /api/v2, just append searchPath
      fullUrl = baseUrl.endsWith('/') ? baseUrl + searchPath.substring(1) : baseUrl + searchPath;
    } else {
      // Combine baseUrl and searchPath
      fullUrl = baseUrl.endsWith('/') 
        ? baseUrl + searchPath.substring(1)
        : baseUrl + searchPath;
    }
    
    // Build query parameters
    const params = {};
    
    // Replace template variables in params
    if (this.apiConfig.params) {
      for (const [key, value] of Object.entries(this.apiConfig.params)) {
        let paramValue = value;
        
        // Replace template variables
        if (typeof paramValue === 'string') {
          paramValue = paramValue.replace(/\{\{\s*\.Keywords\s*\}\}/g, encodeURIComponent(query));
          paramValue = paramValue.replace(/\{\{\s*\.Query\s*\}\}/g, encodeURIComponent(query));
        }
        
        params[key] = paramValue;
      }
    }
    
    // Override with options
    if (options.limit) params.limit = options.limit;
    if (options.offset) params.offset = options.offset;
    
    // Build URL with query params
    const url = new URL(fullUrl);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
    
    return url.toString();
  }

  /**
   * Perform search using JSON API
   */
  async search(query, options = {}) {
    try {
      const searchURL = this.buildSearchURL(query, options);
      
      console.log(`🔍 Searching ${this.definition.name} (API): ${searchURL}`);
      
      const response = await axios.get(searchURL, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
        },
        timeout: 30000,
      });

      // Parse JSON response
      const results = this.parseAPIResponse(response.data, query);
      
      console.log(`   ✅ Found ${results.length} results from ${this.definition.name}`);
      
      return {
        success: true,
        results,
        indexer: this.definition.name,
        indexerId: this.definition.id,
      };
    } catch (error) {
      console.error(`   ❌ Error searching ${this.definition.name}:`, error.message);
      
      return {
        success: false,
        results: [],
        indexer: this.definition.name,
        indexerId: this.definition.id,
        error: error.message,
      };
    }
  }

  /**
   * Parse YTS API response
   */
  parseYTSResponse(data, query) {
    const results = [];
    
    if (!data || !data.data || !data.data.movies) {
      return results;
    }
    
    const movies = Array.isArray(data.data.movies) ? data.data.movies : [];
    
    for (const movie of movies) {
      if (!movie.torrents || !Array.isArray(movie.torrents)) {
        continue;
      }
      
      // Each movie can have multiple torrents (different qualities)
      for (const torrent of movie.torrents) {
        try {
          // Parse date
          const publishDate = torrent.date_uploaded_unix 
            ? moment.unix(torrent.date_uploaded_unix).toISOString()
            : moment(torrent.date_uploaded || movie.date_uploaded).toISOString();
          
          const age = publishDate ? Math.floor((Date.now() - new Date(publishDate).getTime()) / 1000 / 60 / 60 / 24) : 0;
          
          // Build title with quality
          const title = `${movie.title_long || movie.title_english || movie.title} [${torrent.quality}]`;
          
          // Build magnet link from hash
          const magnetLink = `magnet:?xt=urn:btih:${torrent.hash}&dn=${encodeURIComponent(title)}&tr=udp://tracker.opentrackr.org:1337&tr=udp://open.stealth.si:80/announce&tr=udp://tracker.torrent.eu.org:451/announce&tr=udp://tracker.bittor.pw:1337/announce&tr=udp://public.popcorn-tracker.org:6969/announce&tr=udp://tracker.dler.org:6969/announce&tr=udp://exodus.desync.com:6969&tr=udp://open.demonii.com:1337/announce&tr=udp://glotorrents.pw:6969/announce&tr=udp://tracker.coppersurfer.tk:6969&tr=udp://torrent.gresille.org:80/announce&tr=udp://p4p.arenabg.com:1337&tr=udp://tracker.internetwarriors.net:1337`;
          
          results.push({
            id: `${this.definition.id}-${movie.id}-${torrent.hash}`,
            protocol: 'torrent',
            indexer: this.definition.name,
            indexerId: this.definition.id,
            
            title: title,
            size: torrent.size_bytes || 0,
            sizeFormatted: SizeParser.format(torrent.size_bytes || 0),
            
            publishDate: publishDate,
            age: age,
            ageFormatted: this.formatAge(age),
            
            seeders: torrent.seeds || 0,
            leechers: Math.max(0, (torrent.peers || 0) - (torrent.seeds || 0)),
            peers: torrent.seeds > 0 || torrent.peers > 0 ? `${torrent.seeds}/${torrent.peers}` : null,
            grabs: 0, // YTS doesn't provide grabs
            
            downloadUrl: torrent.url || magnetLink,
            guid: movie.url || torrent.url,
            
            category: 'Movies',
            categories: [2000], // Movies category
            
            // Additional YTS-specific fields
            quality: torrent.quality,
            videoCodec: torrent.video_codec,
            audioChannels: torrent.audio_channels,
            imdbCode: movie.imdb_code,
            year: movie.year,
            rating: movie.rating,
          });
        } catch (err) {
          console.error(`   ⚠️  Error parsing YTS torrent:`, err.message);
        }
      }
    }
    
    return results;
  }

  /**
   * Parse generic API response (fallback)
   */
  parseAPIResponse(data, query) {
    // Try YTS-specific parser first
    if (this.definition.id === 'yts') {
      return this.parseYTSResponse(data, query);
    }
    
    // Generic parser for other APIs
    // This can be extended for other JSON APIs
    return [];
  }

  /**
   * Format age in human-readable format
   */
  formatAge(days) {
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    if (days < 365) return `${Math.floor(days / 30)} months ago`;
    return `${Math.floor(days / 365)} years ago`;
  }

  /**
   * Test if scraper is working
   */
  async test() {
    try {
      const results = await this.search('test');
      return {
        success: results.success,
        resultCount: results.results.length,
        message: results.success ? 'Connection successful' : results.error,
      };
    } catch (error) {
      return {
        success: false,
        resultCount: 0,
        message: error.message,
      };
    }
  }
}

module.exports = APIScraper;

