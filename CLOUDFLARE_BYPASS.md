# Cloudflare Bypass Guide

## 🛡️ The Problem

Many torrent sites use Cloudflare DDoS protection, which:
- Blocks automated requests
- Requires JavaScript execution
- Shows "Just a moment..." page
- Needs challenge solving

## ✅ Solution 1: FlareSolverr (Recommended)

**FlareSolverr** is a proxy server that solves Cloudflare challenges using a headless browser. This is what Prowlarr uses.

### Installation

```bash
# Docker (easiest)
docker run -d \
  --name=flaresolverr \
  -p 8191:8191 \
  ghcr.io/flaresolverr/flaresolverr:latest

# Or with Docker Compose
cat > docker-compose.yml << EOF
version: '3.8'
services:
  flaresolverr:
    image: ghcr.io/flaresolverr/flaresolverr:latest
    container_name: flaresolverr
    ports:
      - "8191:8191"
    environment:
      - LOG_LEVEL=info
EOF
docker-compose up -d
```

### Configuration

Set environment variables in your BorrowArr server:

```bash
# In .env or environment
FLARESOLVERR_ENABLED=true
FLARESOLVERR_URL=http://localhost:8191
```

Or in `server/index.js`:

```javascript
process.env.FLARESOLVERR_ENABLED = 'true';
process.env.FLARESOLVERR_URL = 'http://localhost:8191';
```

### How It Works

1. **Normal request** → Cloudflare blocks
2. **Detect Cloudflare** → Check for "Just a moment" page
3. **Send to FlareSolverr** → Solves challenge in headless browser
4. **Get HTML + cookies** → Use for scraping
5. **Success!** → Extract results

### Testing

```bash
# Test FlareSolverr
curl http://localhost:8191/v1

# Test with a Cloudflare-protected site
curl -X POST http://localhost:8191/v1 \
  -H "Content-Type: application/json" \
  -d '{"cmd":"request.get","url":"https://kickasstorrents.to"}'
```

## ✅ Solution 2: Puppeteer (Direct Browser)

Use a real browser to render JavaScript and solve challenges.

### Installation

```bash
npm install puppeteer
```

### Implementation

```javascript
const puppeteer = require('puppeteer');

async function bypassCloudflare(url) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle2' });
  
  // Wait for Cloudflare challenge to complete
  await page.waitForSelector('body', { timeout: 30000 });
  
  const html = await page.content();
  const cookies = await page.cookies();
  
  await browser.close();
  
  return { html, cookies };
}
```

**Pros:**
- ✅ Full browser rendering
- ✅ Handles all JavaScript
- ✅ Can solve complex challenges

**Cons:**
- ❌ Slower (browser overhead)
- ❌ More memory usage
- ❌ Requires Chrome/Chromium

## ✅ Solution 3: Cookie Reuse

If you can manually visit the site in a browser, you can extract cookies and reuse them.

### Get Cookies from Browser

1. Visit site in Chrome/Firefox
2. Open DevTools → Application → Cookies
3. Copy cookie values

### Use Cookies

```javascript
const axios = require('axios');

const cookies = 'cf_clearance=xxx; __cf_bm=yyy';
const response = await axios.get(url, {
  headers: {
    'Cookie': cookies,
    'User-Agent': 'Mozilla/5.0...',
  },
});
```

**Pros:**
- ✅ Fast (no browser needed)
- ✅ Simple

**Cons:**
- ❌ Cookies expire (usually 24 hours)
- ❌ Manual process
- ❌ Not scalable

## ✅ Solution 4: Cloudflare Bypass Libraries

There are Node.js libraries that attempt to solve challenges programmatically.

### cloudflare-scraper

```bash
npm install cloudflare-scraper
```

```javascript
const cloudflareScraper = require('cloudflare-scraper');

const response = await cloudflareScraper.get(url);
const html = response.data;
```

**Pros:**
- ✅ No external service needed
- ✅ Pure Node.js

**Cons:**
- ❌ Less reliable than FlareSolverr
- ❌ May break when Cloudflare updates
- ❌ Some sites still block

## ✅ Solution 5: Proxy Services

Use residential proxies that aren't blocked by Cloudflare.

### Services

- **Bright Data** (formerly Luminati)
- **Smartproxy**
- **Oxylabs**
- **ProxyMesh**

### Implementation

```javascript
const axios = require('axios');

const response = await axios.get(url, {
  proxy: {
    host: 'proxy.example.com',
    port: 8080,
    auth: {
      username: 'user',
      password: 'pass',
    },
  },
});
```

**Pros:**
- ✅ Often bypasses Cloudflare
- ✅ Can rotate IPs
- ✅ High success rate

**Cons:**
- ❌ Costs money ($$$
- ❌ Slower (proxy latency)
- ❌ Need to manage accounts

## 🎯 Recommended Approach

**For BorrowArr, use FlareSolverr** because:

1. ✅ **Free** - Open source, no cost
2. ✅ **Reliable** - Same as Prowlarr uses
3. ✅ **Automatic** - Detects and solves challenges
4. ✅ **Fast** - Only used when needed
5. ✅ **Maintained** - Active development

## 📝 Integration Status

✅ **Cloudflare detection** - Automatically detects blocked pages  
✅ **FlareSolverr integration** - Ready to use when enabled  
✅ **Automatic fallback** - Tries normal request first  
✅ **Error handling** - Clear error messages  

## 🚀 Quick Start

1. **Install FlareSolverr:**
   ```bash
   docker run -d --name=flaresolverr -p 8191:8191 ghcr.io/flaresolverr/flaresolverr:latest
   ```

2. **Enable in BorrowArr:**
   ```bash
   export FLARESOLVERR_ENABLED=true
   export FLARESOLVERR_URL=http://localhost:8191
   ```

3. **That's it!** The scraper will automatically use FlareSolverr when Cloudflare is detected.

## 🔍 Testing

```bash
# Test if FlareSolverr is working
curl http://localhost:8191/v1

# Test a Cloudflare-protected site
curl -X POST http://localhost:8191/v1 \
  -H "Content-Type: application/json" \
  -d '{
    "cmd": "request.get",
    "url": "https://kickasstorrents.to"
  }'
```

## ⚠️ Important Notes

- **FlareSolverr requires Docker** (or you can compile from source)
- **It uses resources** - Each challenge takes ~5-10 seconds
- **Rate limiting** - Don't spam requests, Cloudflare will block
- **Legal** - Make sure you're allowed to scrape the site

## 🎓 Summary

| Method | Cost | Reliability | Speed | Setup |
|--------|------|-------------|-------|-------|
| **FlareSolverr** | Free | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Easy |
| Puppeteer | Free | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | Medium |
| Cookie Reuse | Free | ⭐⭐ | ⭐⭐⭐⭐⭐ | Hard |
| Bypass Libraries | Free | ⭐⭐⭐ | ⭐⭐⭐⭐ | Easy |
| Proxy Services | $$$ | ⭐⭐⭐⭐ | ⭐⭐⭐ | Medium |

**Winner: FlareSolverr** 🏆

