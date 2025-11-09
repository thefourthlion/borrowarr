/**
 * Cloudflare Bypass Handler
 * Handles Cloudflare protection using FlareSolverr or other methods
 */

const axios = require('axios');

class CloudflareHandler {
  constructor() {
    this.flareSolverrUrl = process.env.FLARESOLVERR_URL || 'http://localhost:8191';
    this.enabled = process.env.FLARESOLVERR_ENABLED === 'true';
  }

  /**
   * Detect if a response is blocked by Cloudflare
   */
  isCloudflareBlocked(html) {
    if (!html || typeof html !== 'string') return false;
    
    const indicators = [
      'Just a moment',
      'cf-challenge',
      'challenge-platform',
      'Enable JavaScript and cookies',
      'Checking your browser',
      'DDoS protection by Cloudflare',
      'cf-browser-verification',
      '__cf_bm',
    ];
    
    return indicators.some(indicator => html.toLowerCase().includes(indicator.toLowerCase()));
  }

  /**
   * Solve Cloudflare challenge using FlareSolverr
   * @param {string} url - URL to fetch
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Response with html and cookies
   */
  async solveWithFlareSolverr(url, options = {}) {
    if (!this.enabled) {
      throw new Error('FlareSolverr is not enabled. Set FLARESOLVERR_ENABLED=true');
    }

    try {
      const payload = {
        cmd: 'request.get',
        url: url,
        maxTimeout: 60000,
        headers: options.headers || {},
      };

      // Add cookies if provided
      if (options.cookies) {
        payload.cookies = options.cookies;
      }

      console.log(`   🔓 Solving Cloudflare challenge via FlareSolverr: ${url}`);
      
      const response = await axios.post(`${this.flareSolverrUrl}/v1`, payload, {
        timeout: 90000, // 90 seconds for challenge solving
      });

      if (response.data.status === 'ok' && response.data.solution) {
        const solution = response.data.solution;
        
        console.log(`   ✅ Cloudflare challenge solved! Status: ${solution.status}`);
        
        return {
          html: solution.response || solution.body || '',
          cookies: solution.cookies || [],
          userAgent: solution.userAgent || '',
          headers: solution.headers || {},
        };
      } else {
        throw new Error(`FlareSolverr failed: ${response.data.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error(`   ❌ FlareSolverr error:`, error.message);
      throw error;
    }
  }

  /**
   * Get session cookies from FlareSolverr
   * Useful for maintaining a session across multiple requests
   */
  async getSession(url) {
    const result = await this.solveWithFlareSolverr(url);
    return {
      cookies: result.cookies,
      userAgent: result.userAgent,
    };
  }

  /**
   * Check if FlareSolverr is available
   */
  async checkAvailability() {
    try {
      const response = await axios.get(`${this.flareSolverrUrl}/v1`, {
        timeout: 5000,
      });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }
}

module.exports = new CloudflareHandler();

