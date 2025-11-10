# Using Prowlarr with BorrowArr

## Understanding the Architecture

**Important**: Most indexers (especially Cardigann-based ones) **do NOT have their own APIs**. They require web scraping, which Prowlarr implements using YAML definitions.

### How Prowlarr Works

1. **Prowlarr implements scraping logic** for 500+ indexers using Cardigann YAML definitions
2. **Prowlarr exposes ALL indexers as Torznab endpoints** at: `http://prowlarr:9696/{indexerId}/api`
3. **Applications connect to Prowlarr**, not directly to indexer sites
4. **Prowlarr handles**:
   - Web scraping
   - Cloudflare bypasses (with FlareSolverr)
   - Rate limiting
   - Authentication
   - Converting scraped data to Torznab XML

### BorrowArr's Approach

**BorrowArr should use Prowlarr as a proxy for all Cardigann indexers.**

```
BorrowArr → Prowlarr → Indexer Sites
          (Torznab)   (Web Scraping)
```

## Automatic Setup (Recommended)

Use the sync script to automatically configure all Prowlarr indexers:

```bash
cd server

# Get your Prowlarr API key from: Settings → General → Security → API Key
node scripts/syncFromProwlarr.js http://192.168.0.66:9696 YOUR_API_KEY
```

This will:
- ✅ Fetch all enabled indexers from Prowlarr
- ✅ Configure them with Prowlarr proxy URLs
- ✅ Set up API authentication
- ✅ Import categories and metadata

## Manual Setup

If you prefer to add indexers manually:

### Step 1: Find Indexer ID in Prowlarr

1. Open Prowlarr: `http://192.168.0.66:9696`
2. Go to **Settings → Indexers**
3. Click on an indexer
4. Note the ID from the URL: `http://prowlarr:9696/indexer/{ID}/settings`

### Step 2: Add Indexer in BorrowArr

1. Open BorrowArr Indexers page
2. Click **Add Indexer**
3. Select the indexer from the list
4. Configure:
   - **Base URL**: `http://192.168.0.66:9696/{ID}/api`
   - **Password**: Your Prowlarr API Key
   - **Username**: Leave empty
5. Click **Test** - should show "Connection successful"
6. Click **Save**

## Finding Your Prowlarr API Key

### Method 1: Prowlarr UI
1. Open Prowlarr: `http://192.168.0.66:9696`
2. Go to **Settings → General**
3. Scroll to **Security**
4. Copy **API Key**

### Method 2: Config File
```bash
# Linux
cat ~/.config/Prowlarr/config.xml | grep ApiKey

# Docker
docker exec prowlarr cat /config/config.xml | grep ApiKey

# macOS
cat ~/Library/Application\ Support/Prowlarr/config.xml | grep ApiKey
```

## Example Configurations

### kickasstorrents.to
- **Prowlarr Indexer ID**: `2`
- **Base URL**: `http://192.168.0.66:9696/2/api`
- **Password**: `your-prowlarr-api-key`

### 0day.community  
- **Prowlarr Indexer ID**: `5`
- **Base URL**: `http://192.168.0.66:9696/5/api`
- **Password**: `your-prowlarr-api-key`

### The Pirate Bay
- **Option 1 - Direct**: Use `https://thepiratebay.org/` (works via apibay.org API)
- **Option 2 - Prowlarr**: `http://192.168.0.66:9696/1/api` (if configured in Prowlarr)

## Testing Your Setup

After configuring indexers:

1. Go to BorrowArr's **Search** page
2. Search for any term (e.g., "test")
3. Check the results - you should see results from all enabled indexers
4. Check console logs for indexer status

## Troubleshooting

### "API endpoint not found"
❌ **Wrong**: Trying to use indexer's direct URL  
✅ **Correct**: Use Prowlarr proxy URL: `http://prowlarr:9696/{id}/api`

### "CloudFlare Protection"
❌ **Wrong**: Direct access blocked  
✅ **Solution**: Use Prowlarr proxy + FlareSolverr (if needed)

### "Connection refused"
- Check Prowlarr is running: `curl http://192.168.0.66:9696/api/v1/system/status`
- Check the URL is correct
- If using Docker, ensure containers can communicate

### "401 Unauthorized"
- Check API key is correct
- Copy from Prowlarr Settings → General → Security → API Key

## Why Use Prowlarr Proxy?

| Approach | Result |
|----------|--------|
| **Direct to Site** | ❌ Cloudflare blocks<br>❌ No API on most sites<br>❌ Complex scraping needed<br>❌ Each site different |
| **Via Prowlarr** | ✅ Cloudflare handled<br>✅ Standard Torznab API<br>✅ Scraping done by Prowlarr<br>✅ Consistent interface |

## Advanced: FlareSolverr

For indexers with Cloudflare protection:

1. Install FlareSolverr: `docker run -d --name=flaresolverr -p 8191:8191 ghcr.io/flaresolverr/flaresolverr:latest`
2. Configure in Prowlarr: **Settings → Indexers → Indexer Proxies → Add → FlareSolverr**
3. Tags indexers in Prowlarr with `flaresolverr` tag
4. Prowlarr automatically routes requests through FlareSolverr

## Next Steps

1. **Run the sync script** to configure all indexers automatically
2. **Test search** in BorrowArr
3. **Verify** all indexers are returning results

Your Prowlarr instance already has the indexers configured - just sync them to BorrowArr!

