const TransmissionProxy = require('./transmissionProxy');

/**
 * Vuze Download Client Proxy
 * Vuze uses the Transmission-compatible RPC protocol
 * Inherits from TransmissionProxy
 */
class VuzeProxy extends TransmissionProxy {
  /**
   * Test connection - override to add Vuze-specific version check
   */
  async testConnection() {
    try {
      const response = await this.request('session-get');
      
      if (response && response.result === 'success') {
        const version = response.arguments['rpc-version'] || 'unknown';
        console.log('[Vuze] Connected, RPC version:', version);
        
        // Vuze should support protocol version 14 or higher
        if (version && parseInt(version) < 14) {
          return {
            success: false,
            error: `Vuze RPC version too low (${version}). Need version 14 or higher. Please use Vuze 5.0.0.0+ with Vuze Web Remote plugin.`,
          };
        }

        return {
          success: true,
          message: `Successfully connected to Vuze (RPC v${version})`,
        };
      }

      return {
        success: false,
        error: 'Unexpected response from Vuze',
      };
    } catch (error) {
      console.error('[Vuze] Test connection failed:', error.message);
      return {
        success: false,
        error: `Failed to connect to Vuze: ${error.message}`,
      };
    }
  }
}

module.exports = VuzeProxy;
