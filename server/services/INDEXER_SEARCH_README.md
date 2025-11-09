# Indexer Search Service

This service handles searching across all configured indexers, supporting multiple indexer types.

## Supported Indexer Types

### 1. **Torznab/Newznab** (Standard API)
- **How it works**: Uses standard Torznab/Newznab API endpoints
- **Base URL format**: `https://indexer.com/api`
- **Requirements**: 
  - Base URL with `/api` path
  - API key (optional, stored in `password` or `username` field)
- **Example**: Most private trackers, Jackett instances

### 2. **The Pirate Bay** (Special Handling)
- **How it works**: Uses `apibay.org` JSON API (more reliable than scraping)
- **Base URL format**: `https://thepiratebay.org/` or any TPB URL
- **Requirements**: None (public indexer)
- **Fallback**: If API fails, attempts HTML scraping

### 3. **Cardigann Indexers** (Requires Proxy or YAML)
- **How it works**: Cardigann indexers need YAML definition files to scrape
- **Base URL format**: Direct site URL (e.g., `https://kickass.torrentsbay.org/`)
- **Limitations**: 
  - Cannot search directly without YAML definitions
  - Requires Prowlarr proxy OR YAML definition files

## Using Prowlarr as a Proxy (Recommended for Cardigann)

Prowlarr can act as a proxy, exposing Cardigann indexers as Torznab/Newznab endpoints.

### Setup Steps:

1. **Configure indexer in Prowlarr** (if not already done)
2. **Get the Prowlarr proxy URL**:
   - Format: `http://prowlarr-host:port/{indexerId}/api`
   - Example: `http://localhost:9696/1/api` or `http://prowlarr:9696/2/api`
3. **Update indexer in BorrowArr**:
   - Set `baseUrl` to the Prowlarr proxy URL
   - Set `password` or `username` to your Prowlarr API key
   - The indexer will now work as a standard Torznab endpoint

### Finding Your Prowlarr Indexer ID:

1. Open Prowlarr web UI
2. Go to Settings → Indexers
3. Click on the indexer you want to proxy
4. The URL will show: `http://prowlarr:9696/indexer/{id}/settings`
5. Use that `{id}` in the proxy URL: `http://prowlarr:9696/{id}/api`

## Search Service Features

### Automatic Path Detection
The service automatically tries multiple API paths:
- `/api` (standard)
- `/api/v1`
- `/torznab`
- `/newznab`
- `/search` (for Cardigann)
- Root path (for some indexers)

### Error Handling
- **404 errors**: Automatically tries alternative API paths
- **Connection errors**: Retries with different paths
- **HTML responses**: Detects when scraping is needed
- **Clear error messages**: Guides users on how to fix issues

### Logging
Comprehensive logging shows:
- Which indexers are being searched
- Success/failure status for each indexer
- Number of results from each indexer
- Detailed error messages

## Current Limitations

1. **Cardigann Direct Scraping**: Not yet implemented (requires YAML definitions)
2. **Custom Scrapers**: Only The Pirate Bay has custom scraping logic
3. **YAML Definitions**: Would need to be imported from Prowlarr's repository

## Recommendations

For **Cardigann indexers**, use one of these approaches:

1. **Use Prowlarr as Proxy** (Easiest)
   - Configure indexer in Prowlarr
   - Use Prowlarr proxy URL in BorrowArr
   - Works immediately, no additional setup

2. **Use Torznab/Newznab Compatible Indexers**
   - Many indexers support Torznab/Newznab natively
   - No proxy needed
   - Direct API access

3. **Implement YAML-Based Scraping** (Future)
   - Import YAML definitions from Prowlarr
   - Implement Cardigann request generator
   - Parse HTML responses based on YAML selectors

## Testing Your Indexers

Run a search and check the console logs. You'll see:
- ✅ Successful searches with result counts
- ❌ Failed searches with error messages
- Detailed information about what was tried

If an indexer fails, the error message will guide you on how to fix it.

