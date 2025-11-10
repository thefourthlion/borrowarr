# Fixing kickasstorrents.to Search

## Problem
kickasstorrents.to is not returning search results because:
1. **Cloudflare Protection**: The site is protected by Cloudflare, which requires JavaScript/browser automation to bypass
2. **Cardigann Indexer**: It's a Cardigann indexer that doesn't have a standard Torznab/Newznab API
3. **Direct Access Blocked**: Direct HTTP requests are blocked (403 Forbidden)

## Solution: Use Prowlarr as a Proxy

Prowlarr can handle Cloudflare challenges and expose Cardigann indexers as Torznab endpoints.

### Step 1: Configure kickasstorrents.to in Prowlarr

1. Open Prowlarr web UI (usually `http://localhost:9696`)
2. Go to **Settings → Indexers**
3. Click **Add Indexer**
4. Search for "kickasstorrents" and select it
5. Configure the indexer (usually no API key needed for public indexers)
6. Save the indexer
7. **Note the Indexer ID** from the URL: `http://prowlarr:9696/indexer/{ID}/settings`

### Step 2: Update kickasstorrents.to in BorrowArr

1. Open BorrowArr's Indexers page
2. Click the **Settings** icon (⚙️) next to "kickasstorrents.to"
3. Update the **Base Url** field to:
   ```
   http://localhost:9696/{ID}/api
   ```
   Replace `{ID}` with the indexer ID from Step 1.
   
   Example: If the ID is `2`, use: `http://localhost:9696/2/api`
   
   **Note**: If Prowlarr is running in Docker or on a different host, use:
   - Docker: `http://prowlarr:9696/2/api`
   - Different host: `http://prowlarr-host:9696/2/api`

4. Set the **Password** field to your Prowlarr API key:
   - Get it from: Prowlarr → Settings → General → Security → API Key
   - Or check Prowlarr's config file: `{AppData}/config.xml` → `<ApiKey>`

5. Click **Save**

### Step 3: Test the Indexer

1. Go to the Search page in BorrowArr
2. Perform a test search
3. Check the console logs - you should see:
   ```
   ✅ kickasstorrents.to: X results
   ```

## Alternative: Disable kickasstorrents.to

If you don't want to use Prowlarr as a proxy:
1. Go to Indexers page
2. Click the Settings icon for kickasstorrents.to
3. Toggle **Enable** to OFF
4. Click Save

The indexer will be skipped during searches.

## Why This Works

- **Prowlarr handles Cloudflare**: Prowlarr uses browser automation (via Cardigann) to bypass Cloudflare challenges
- **Torznab Proxy**: Prowlarr exposes Cardigann indexers as standard Torznab endpoints
- **No Direct Scraping Needed**: BorrowArr can use the standard Torznab API instead of implementing custom scraping

## Troubleshooting

### "Connection refused" error
- Make sure Prowlarr is running
- Check the Prowlarr URL is correct
- If using Docker, ensure containers can communicate

### "HTTP 401: Unauthorized" error
- Check that the API key is correct
- Verify the API key in Prowlarr Settings → General → Security

### "HTTP 404: Not Found" error
- Verify the indexer ID is correct
- Make sure the indexer is enabled in Prowlarr
- Check that the URL format is: `http://prowlarr:9696/{ID}/api`

### Still not working?
1. Test the Prowlarr endpoint directly:
   ```bash
   curl "http://localhost:9696/2/api?t=search&q=test&apikey=YOUR_API_KEY"
   ```
2. Check Prowlarr logs for errors
3. Verify the indexer works in Prowlarr's test search

