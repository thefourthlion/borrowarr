/**
 * RSS Scraper
 * Handles RSS/XML feeds (like EZTV's RSS feed)
 */

const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');
const moment = require('moment');
const SizeParser = require('../filters/sizeParser');

class RSSScraper {
  constructor(definition) {
    this.definition = definition;
    this.rssConfig = definition.rss;
    this.apiConfig = definition.api;
  }

  /**
   * Build search URL for API or RSS
   */
  buildSearchURL(query, options = {}) {
    // For EZTV, prefer RSS feed (more reliable)
    if (this.rssConfig && this.rssConfig.feedUrl) {
      // RSS feed doesn't support query filtering, but we can filter results
      return this.rssConfig.feedUrl;
    }
    
    // Fall back to API if RSS not available
    if (this.apiConfig) {
      const baseUrl = this.apiConfig.baseUrl || this.definition.links[0];
      const searchPath = this.apiConfig.searchPath || '/api/get-torrents';
      
      // Build full URL
      let fullUrl;
      if (baseUrl.includes('/api/')) {
        fullUrl = baseUrl.endsWith('/') ? baseUrl + searchPath.substring(1) : baseUrl + searchPath;
      } else {
        fullUrl = baseUrl.endsWith('/') 
          ? baseUrl + searchPath.substring(1)
          : baseUrl + searchPath;
      }
      
      const url = new URL(fullUrl);
      
      // Add query parameter if provided
      if (query && query !== 'test') {
        url.searchParams.append('query_term', query);
      }
      
      // Add other params
      if (this.apiConfig.params) {
        Object.entries(this.apiConfig.params).forEach(([key, value]) => {
          url.searchParams.append(key, value);
        });
      }
      
      // Override with options
      if (options.limit) url.searchParams.set('limit', options.limit);
      if (options.page) url.searchParams.set('page', options.page);
      
      return url.toString();
    }
    
    throw new Error('No RSS feed or API configured');
  }

  /**
   * Perform search
   */
  async search(query, options = {}) {
    try {
      const searchURL = this.buildSearchURL(query, options);
      
      console.log(`🔍 Searching ${this.definition.name} (RSS/API): ${searchURL}`);
      
      const response = await axios.get(searchURL, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json, application/xml, text/xml',
        },
        timeout: 30000,
      });

      // Check if it's JSON (API) or XML (RSS)
      const contentType = response.headers['content-type'] || '';
      let results;
      
      // Check response data type
      const isJSON = contentType.includes('json') || 
                     (typeof response.data === 'object' && !response.data.toString().startsWith('<?xml'));
      const isXML = contentType.includes('xml') || 
                    (typeof response.data === 'string' && response.data.trim().startsWith('<?xml'));
      
      if (isJSON && !isXML) {
        // JSON API response
        results = this.parseAPIResponse(response.data, query);
      } else {
        // XML RSS response
        results = this.parseRSSResponse(response.data, query);
      }
      
      // Filter results by query if provided (RSS feeds don't support query params)
      if (query && query !== 'test' && query.trim() !== '' && results.length > 0) {
        const queryLower = query.toLowerCase().trim();
        const filtered = results.filter(result => 
          result.title && result.title.toLowerCase().includes(queryLower)
        );
        console.log(`   🔍 Filtered ${results.length} results to ${filtered.length} matching "${query}"`);
        results = filtered;
      }
      
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
   * Parse EZTV JSON API response
   */
  parseEZTVAPIResponse(data, query) {
    const results = [];
    
    if (!data || !data.torrents || !Array.isArray(data.torrents)) {
      return results;
    }
    
    for (const torrent of data.torrents) {
      try {
        // Parse date
        const publishDate = torrent.date_released_unix
          ? moment.unix(torrent.date_released_unix).toISOString()
          : moment(torrent.date_released || torrent.date_released_unix).toISOString();
        
        const age = publishDate ? Math.floor((Date.now() - new Date(publishDate).getTime()) / 1000 / 60 / 60 / 24) : 0;
        
        // Build magnet link from hash
        const infoHash = torrent.hash || torrent.info_hash;
        const title = torrent.title || torrent.filename || '';
        const magnetLink = infoHash 
          ? `magnet:?xt=urn:btih:${infoHash}&dn=${encodeURIComponent(title)}&tr=udp://tracker.opentrackr.org:1337&tr=udp://open.stealth.si:80/announce&tr=udp://tracker.torrent.eu.org:451/announce&tr=udp://tracker.bittor.pw:1337/announce&tr=udp://public.popcorn-tracker.org:6969/announce&tr=udp://tracker.dler.org:6969/announce&tr=udp://exodus.desync.com:6969&tr=udp://open.demonii.com:1337/announce&tr=udp://glotorrents.pw:6969/announce&tr=udp://tracker.coppersurfer.tk:6969&tr=udp://torrent.gresille.org:80/announce&tr=udp://p4p.arenabg.com:1337&tr=udp://tracker.internetwarriors.net:1337`
          : torrent.magnet_url || torrent.url;
        
        results.push({
          id: `${this.definition.id}-${torrent.id || torrent.hash || Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          protocol: 'torrent',
          indexer: this.definition.name,
          indexerId: this.definition.id,
          
          title: title,
          size: torrent.size_bytes || torrent.size || 0,
          sizeFormatted: SizeParser.format(torrent.size_bytes || torrent.size || 0),
          
          publishDate: publishDate,
          age: age,
          ageFormatted: this.formatAge(age),
          
          seeders: torrent.seeds || torrent.seeders || 0,
          leechers: Math.max(0, (torrent.peers || 0) - (torrent.seeds || torrent.seeders || 0)),
          peers: (torrent.seeds || torrent.seeders || 0) > 0 || (torrent.peers || 0) > 0 
            ? `${torrent.seeds || torrent.seeders || 0}/${torrent.peers || 0}` 
            : null,
          grabs: torrent.downloads || 0,
          
          downloadUrl: torrent.magnet_url || magnetLink || torrent.url,
          guid: torrent.imdb_id ? `https://eztv.re/ep/${torrent.id}/` : torrent.url,
          
          category: 'TV',
          categories: [5000], // TV category
          
          // EZTV-specific fields
          imdbId: torrent.imdb_id,
          episodeInfo: torrent.episode_info,
        });
      } catch (err) {
        console.error(`   ⚠️  Error parsing EZTV torrent:`, err.message);
      }
    }
    
    return results;
  }

  /**
   * Parse EZTV RSS XML response
   */
  parseEZTVRSSResponse(xmlData, query) {
    const results = [];
    
    try {
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: "@_",
        textNodeName: "#text",
        parseAttributeValue: true,
        parseTagValue: true,
      });
      
      const parsed = parser.parse(xmlData);
      const rss = parsed.rss || parsed;
      const channel = rss.channel || rss;
      
      if (!channel || !channel.item) {
        return results;
      }
      
      const items = Array.isArray(channel.item) ? channel.item : [channel.item];
      const namespace = this.rssConfig?.namespace || 'http://xmlns.ezrss.it/0.1/';
      
      for (const item of items) {
        try {
          // Extract EZTV-specific fields from torrent namespace
          const torrentNs = item['torrent:contentLength'] || item['torrent:contentlength'] || {};
          const contentLength = torrentNs['#text'] || torrentNs || item.enclosure?.['@_length'] || 0;
          
          const infoHash = item['torrent:infoHash']?.['#text'] || item['torrent:infohash']?.['#text'] || '';
          const magnetURI = item['torrent:magnetURI']?.['#text'] || item['torrent:magneturi']?.['#text'] || '';
          const seeds = parseInt(item['torrent:seeds']?.['#text'] || item['torrent:seeds'] || 0);
          const peers = parseInt(item['torrent:peers']?.['#text'] || item['torrent:peers'] || 0);
          
          // Parse date
          const pubDate = item.pubDate || item['pubDate'] || item.pubdate;
          const publishDate = pubDate ? moment(pubDate).toISOString() : null;
          const age = publishDate ? Math.floor((Date.now() - new Date(publishDate).getTime()) / 1000 / 60 / 60 / 24) : 0;
          
          // Build magnet link if not provided
          let downloadUrl = magnetURI;
          if (!downloadUrl && infoHash) {
            const title = item.title?.['#text'] || item.title || '';
            downloadUrl = `magnet:?xt=urn:btih:${infoHash}&dn=${encodeURIComponent(title)}&tr=udp://tracker.opentrackr.org:1337&tr=udp://open.stealth.si:80/announce&tr=udp://tracker.torrent.eu.org:451/announce&tr=udp://tracker.bittor.pw:1337/announce&tr=udp://public.popcorn-tracker.org:6969/announce&tr=udp://tracker.dler.org:6969/announce&tr=udp://exodus.desync.com:6969&tr=udp://open.demonii.com:1337/announce&tr=udp://glotorrents.pw:6969/announce&tr=udp://tracker.coppersurfer.tk:6969&tr=udp://torrent.gresille.org:80/announce&tr=udp://p4p.arenabg.com:1337&tr=udp://tracker.internetwarriors.net:1337`;
          }
          
          // Fallback to enclosure URL
          if (!downloadUrl && item.enclosure) {
            downloadUrl = item.enclosure['@_url'] || item.enclosure.url;
          }
          
          // Extract title (handle both object and string formats)
          let title = item.title;
          if (typeof title === 'object') {
            title = title['#text'] || title['title'] || '';
          }
          title = title || '';
          
          // Extract guid/link
          let guid = '';
          if (item.guid) {
            guid = typeof item.guid === 'object' 
              ? (item.guid['#text'] || item.guid['guid'] || '')
              : (item.guid || '');
          }
          if (!guid && item.link) {
            guid = typeof item.link === 'object'
              ? (item.link['#text'] || item.link['link'] || '')
              : (item.link || '');
          }
          
          results.push({
            id: `${this.definition.id}-${infoHash || guid || Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            protocol: 'torrent',
            indexer: this.definition.name,
            indexerId: this.definition.id,
            
            title: title,
            size: parseInt(contentLength) || 0,
            sizeFormatted: SizeParser.format(parseInt(contentLength) || 0),
            
            publishDate: publishDate,
            age: age,
            ageFormatted: this.formatAge(age),
            
            seeders: seeds,
            leechers: Math.max(0, peers - seeds),
            peers: seeds > 0 || peers > 0 ? `${seeds}/${peers}` : null,
            grabs: 0, // RSS doesn't provide grabs
            
            downloadUrl: downloadUrl,
            guid: guid,
            
            category: item.category?.['#text'] || item.category || 'TV',
            categories: [5000], // TV category
          });
        } catch (err) {
          console.error(`   ⚠️  Error parsing RSS item:`, err.message);
        }
      }
    } catch (error) {
      console.error(`   ❌ Error parsing RSS feed:`, error.message);
    }
    
    return results;
  }

  /**
   * Parse API response (generic)
   */
  parseAPIResponse(data, query) {
    if (this.definition.id === 'eztv') {
      return this.parseEZTVAPIResponse(data, query);
    }
    return [];
  }

  /**
   * Parse RSS response (generic)
   */
  parseRSSResponse(xmlData, query) {
    if (this.definition.id === 'eztv') {
      return this.parseEZTVRSSResponse(xmlData, query);
    }
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

module.exports = RSSScraper;

