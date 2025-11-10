# Architecture Decision: Supporting Every Indexer

## The Challenge

You want BorrowArr to support every indexer without relying on Prowlarr as a proxy. Here's what that actually means:

## What Torznab/Newznab Actually Is

Looking at `Radarr/src/NzbDrone.Core/Indexers/Torznab/Torznab.cs`:

```csharp
public override IIndexerRequestGenerator GetRequestGenerator()
{
    return new NewznabRequestGenerator(_capabilitiesProvider)
    {
        PageSize = PageSize,
        Settings = Settings
    };
}
```

**Torznab/Newznab is a standardized API format** for search requests and XML responses. It works like this:

```
GET /api?t=search&q=shrek&cat=2000&apikey=XXX
```

Returns standardized XML with release info. **But most indexer sites don't provide this API!**

## The Reality of Indexer Support

### Indexers That Have Native APIs

✅ **Very Few** (~5% of indexers)
- Some private trackers (rare)
- The Pirate Bay (via apibay.org)
- A few public sites

These can be accessed directly.

### Cardigann Indexers (95% of indexers)

❌ **No native API** - Require web scraping:
- kickasstorrents
- 0day.community
- 1337x
- TorrentLeech
- Most private trackers
- 500+ other indexers

## How Prowlarr Works

### Prowlarr's Architecture

```
┌─────────────────────────────────────────────────────────┐
│                       Prowlarr                           │
│                                                           │
│  ┌──────────────────────────────────────────────────┐   │
│  │  1. Cardigann YAML Parser                        │   │
│  │     - Parses 500+ YAML definition files          │   │
│  │     - Each file defines scraping rules           │   │
│  └──────────────────────────────────────────────────┘   │
│                          │                               │
│  ┌──────────────────────────────────────────────────┐   │
│  │  2. Web Scraper (CardigannRequestGenerator)      │   │
│  │     - Makes HTTP requests to sites               │   │
│  │     - Handles cookies, sessions, auth            │   │
│  │     - Cloudflare bypass (with FlareSolverr)      │   │
│  └──────────────────────────────────────────────────┘   │
│                          │                               │
│  ┌──────────────────────────────────────────────────┐   │
│  │  3. HTML Parser (CardigannParser)                │   │
│  │     - CSS selectors to extract data              │   │
│  │     - Regular expressions                        │   │
│  │     - JSON parsing                               │   │
│  │     - Complex filter chains                      │   │
│  └──────────────────────────────────────────────────┘   │
│                          │                               │
│  ┌──────────────────────────────────────────────────┐   │
│  │  4. Torznab API Endpoint                         │   │
│  │     - Exposes ALL indexers as Torznab            │   │
│  │     - http://prowlarr:9696/{id}/api              │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Code Complexity

From `Prowlarr/src/NzbDrone.Core/Indexers/Definitions/Cardigann/`:

1. **CardigannBase.cs** - 831+ lines
   - CSS selector parsing
   - JSON path parsing
   - Filter chains (regex, date parsing, string manipulation)
   - Logic functions (and, or, eq, ne)
   - Variable substitution

2. **CardigannRequestGenerator.cs** - Complex HTTP request building
   - Login flow handling
   - CAPTCHA support
   - Cookie management
   - Rate limiting
   - Search parameter mapping

3. **CardigannParser.cs** - HTML/JSON parsing
   - Multiple selector strategies
   - Date parsing (multiple formats)
   - Size parsing (multiple units)
   - Peer/seeder extraction
   - Category mapping

4. **CardigannDefinition.cs** - YAML structure
   - 200+ lines of nested classes
   - Supports: login, search, download, ratio, captcha, filters, selectors

### Example YAML Definition

A typical indexer YAML file looks like this:

```yaml
id: kickasstorrents
name: KickassTorrents
description: "KickassTorrents (KAT) is a Public torrent site"
language: en-US
type: public
encoding: UTF-8
links:
  - https://kickasstorrents.to/
  - https://kickass.torrentbay.st/

caps:
  categorymappings:
    - {id: 1, cat: Movies, desc: "Movies"}
    - {id: 2, cat: TV, desc: "TV"}
    - {id: 3, cat: Audio, desc: "Music"}
  modes:
    search: [q]
    tv-search: [q, season, ep]
    movie-search: [q, imdbid]

search:
  paths:
    - path: /usearch/{{ .Keywords }}
  rows:
    selector: table.data tr:has(a.cellMainLink)
  fields:
    category:
      selector: td.center:nth-child(1) a
      attribute: href
      filters:
        - name: regexp
          args: "cat=(\\d+)"
    title:
      selector: a.cellMainLink
    details:
      selector: a.cellMainLink
      attribute: href
    download:
      selector: a[title="Torrent magnet link"]
      attribute: href
    size:
      selector: td:nth-child(2)
    seeders:
      selector: td:nth-child(4)
    leechers:
      selector: td:nth-child(5)
    date:
      selector: td:nth-child(3)
      filters:
        - name: regexp
          args: "([\\d-]+ [\\d:]+)"
        - name: dateparse
          args: "2006-01-02 15:04:05"
```

**This is for ONE indexer**. Prowlarr has 500+ of these.

## Option 1: Rebuild Prowlarr (Not Recommended)

### What You'd Need to Build

1. **YAML Parser for Cardigann definitions** (~5,000 lines)
   - Parse all selector types (CSS, JSON, regex)
   - Handle filter chains
   - Support all filter types (20+ filters)
   - Logic function parser

2. **Web Scraper** (~3,000 lines)
   - HTTP client with cookie management
   - Session handling
   - Login flow automation
   - CAPTCHA handling
   - Rate limiting

3. **HTML/JSON Parser** (~2,000 lines)
   - CSS selector engine (like cheerio)
   - JSON path support
   - Date parsing (100+ formats)
   - Size parsing (all units)
   - Category mapping

4. **Cloudflare Bypass** (~1,000 lines)
   - FlareSolverr integration
   - Challenge detection
   - Cookie persistence

5. **500+ YAML Definitions**
   - Maintain definition files
   - Update when sites change
   - Test each regularly

**Total Estimated Code**: 10,000+ lines
**Development Time**: 2-3 months full-time
**Maintenance**: Ongoing (sites change constantly)

### Problems With This Approach

❌ **Massive development effort** - You'd be rebuilding Prowlarr
❌ **Maintenance nightmare** - Sites change, definitions break
❌ **Cloudflare challenges** - Many sites block scrapers
❌ **Legal concerns** - Web scraping can violate ToS
❌ **Duplicate effort** - Prowlarr team already maintains this
❌ **Missing features** - Prowlarr has years of edge case fixes

## Option 2: Use Prowlarr as a Backend (Recommended)

### Architecture

```
┌──────────────┐     Torznab API      ┌──────────────┐
│              │ ──────────────────────> │              │
│  BorrowArr   │                       │  Prowlarr    │
│  (Frontend)  │ <────────────────────  │  (Backend)   │
│              │    Torznab XML        │              │
└──────────────┘                       └──────────────┘
                                              │
                                              │ Web Scraping
                                              ▼
                                       ┌──────────────┐
                                       │   Indexer    │
                                       │   Sites      │
                                       └──────────────┘
```

### What You Build

✅ **Beautiful frontend UI** (Your specialty)
✅ **Modern search interface**
✅ **Unified experience**
✅ **Download management**
✅ **Statistics & monitoring**

### What Prowlarr Handles

✅ **All indexer scraping**
✅ **Cloudflare bypasses**
✅ **Login/auth**
✅ **Torznab API**
✅ **500+ indexer support**
✅ **Regular updates**

### Implementation

**Current BorrowArr Service** (`server/services/indexerSearch.js`):

```javascript
// For 95% of indexers (Cardigann), use Prowlarr proxy
if (indexer.indexerType === "Cardigann" || indexer.indexerType === "Generic") {
  const prowlarrUrl = `http://prowlarr:9696/${indexer.id}/api`;
  const response = await axios.get(prowlarrUrl, {
    params: {
      t: "search",
      q: query,
      apikey: PROWLARR_API_KEY,
      limit: limit,
      offset: offset,
    },
  });
  return parseXML(response.data);
}

// For rare indexers with native APIs (like TPB)
else {
  // Direct implementation
}
```

**One Sync Script** (`server/scripts/syncFromProwlarr.js`):
- Fetches all indexers from Prowlarr API
- Configures them automatically in BorrowArr
- ~200 lines of code

## Option 3: Hybrid Approach (Middle Ground)

### What This Means

1. **Use Prowlarr for Cardigann indexers** (95%)
2. **Implement direct support for specific indexers** (5%)
   - The Pirate Bay ✅ (already done)
   - 1337x
   - RARBG (if it comes back)
   - Any with public APIs

### Benefits

✅ **Works with 500+ indexers immediately** (via Prowlarr)
✅ **Direct control over key indexers** (custom code)
✅ **Less dependency** on Prowlarr for common cases
✅ **Manageable codebase** (~500 lines per indexer)

## Recommendation

**Use Option 2 (Prowlarr as Backend)** because:

1. **Time to Market**: Works in 5 minutes vs 3 months
2. **Reliability**: Prowlarr is battle-tested with years of fixes
3. **Maintenance**: Prowlarr team maintains all scrapers
4. **Cloudflare**: Prowlarr handles this (with FlareSolverr)
5. **Legal**: Prowlarr runs on user's machine (not your servers)
6. **Focus**: Spend time on what makes BorrowArr unique (UI/UX)

### What Makes BorrowArr Special

Don't compete with Prowlarr on indexer support. Instead, build:

🎨 **Better UI** - Modern, clean, fast
📊 **Better Analytics** - Track your downloads
🔍 **Better Search** - Smart filters, recommendations
📱 **Better Mobile** - Responsive, PWA
🤝 **Better Integration** - One app for everything
⚡ **Better UX** - Simplify the whole workflow

## Implementation Plan

### Phase 1: Use Prowlarr Proxy (Now)

1. ✅ Create sync script (`syncFromProwlarr.js`) - **Done**
2. Run: `node scripts/syncFromProwlarr.js http://prowlarr:9696 YOUR_API_KEY`
3. All 500+ indexers work immediately

### Phase 2: Polish the Experience (Next)

1. Improve error messages
2. Add indexer health monitoring
3. Show Prowlarr status in UI
4. Auto-detect Prowlarr on network

### Phase 3: Add Direct Support (Later - Optional)

For high-traffic indexers:
1. The Pirate Bay ✅ (already done)
2. 1337x
3. YTS
4. EZTV

Only if there's a specific need (faster, more control, etc.)

## Conclusion

**Don't rebuild Prowlarr**. Use it as your backend.

**Focus on what makes BorrowArr better**:
- One unified interface
- Better UX
- Modern UI
- Smart features

The sync script I created gives you access to every indexer Prowlarr supports in under 5 minutes. That's the right solution.

## Next Steps

1. Get your Prowlarr API key: Settings → General → Security
2. Run: `cd server && node scripts/syncFromProwlarr.js http://192.168.0.66:9696 YOUR_API_KEY`
3. Test search - should work with all indexers
4. Build amazing features on top! 🚀

