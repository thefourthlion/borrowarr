# BorrowArr Scraping System

A powerful, extensible web scraping engine for torrent indexers, inspired by Prowlarr's Cardigann system but built in Node.js.

## Architecture

```
scrapers/
├── definitions/          # YAML indexer definitions
│   └── limetorrents.yml # LimeTorrents definition
├── engine/              # Core scraping engine
│   ├── definitionLoader.js  # Loads YAML definitions
│   ├── selectorEngine.js    # CSS selector extraction
│   └── scraper.js          # Main scraping logic
├── filters/             # Data transformation filters
│   ├── index.js        # Filter engine with all filters
│   └── sizeParser.js   # Parse size strings to bytes
└── index.js            # Main entry point (ScraperManager)
```

## Features

✅ **YAML-based definitions** - Easy to add new indexers
✅ **CSS selector support** - Extract data with selectors
✅ **Filter system** - Transform extracted data
✅ **Date parsing** - Handle multiple date formats
✅ **Size parsing** - Convert "1.5 GB" to bytes
✅ **Error handling** - Graceful failures
✅ **Extensible** - Easy to add new filters

## How It Works

### 1. Define an Indexer (YAML)

Create a YAML file in `definitions/`:

```yaml
id: myindexer
name: My Indexer
description: "A great torrent site"
language: en-US
type: public
links:
  - https://example.com/

caps:
  categorymappings:
    - {id: 1, cat: Movies, desc: "Movies"}
    - {id: 2, cat: TV, desc: "TV shows"}

search:
  paths:
    - path: /search?q={{ .Keywords }}
  
  rows:
    selector: table.results tr
  
  fields:
    title:
      selector: td.name a
    
    download:
      selector: td.download a
      attribute: href
    
    size:
      selector: td.size
    
    seeders:
      selector: td.seeders
    
    date:
      selector: td.date
      filters:
        - name: dateparse
          args: "YYYY-MM-DD"
```

### 2. Use the Scraper

```javascript
const scraperManager = require('./scrapers');

// Search a specific indexer
const results = await scraperManager.search('limetorrents', 'ubuntu');

// Search all indexers
const allResults = await scraperManager.searchAll('ubuntu');

// Test a scraper
const testResult = await scraperManager.testScraper('limetorrents');
```

## Available Filters

### String Filters
- `replace` - Replace text: `{name: replace, args: ["old", "new"]}`
- `trim` - Remove whitespace
- `append` - Append text: `{name: append, args: ["text"]}`
- `prepend` - Prepend text
- `split` - Split string: `{name: split, args: [",", 0]}`
- `regexp` - Extract with regex: `{name: regexp, args: ["pattern", 1]}`

### Number Filters
- `parseNumber` - Extract number from string

### Date Filters
- `dateparse` - Parse date: `{name: dateparse, args: ["DD-MMM-YYYY"]}`
- `timeago` - Parse relative dates ("2 hours ago")
- `fuzzytime` - Try multiple date formats

### URL Filters
- `querystring` - Extract query param: `{name: querystring, args: ["id"]}`
- `urlencode` - URL encode
- `urldecode` - URL decode

## YAML Definition Reference

### Top Level Fields

```yaml
id: unique-id           # Unique identifier
name: Display Name      # Human-readable name
description: "..."      # Description
language: en-US         # Language code
type: public           # public or private
encoding: UTF-8        # Character encoding
links:                 # Base URLs (tries in order)
  - https://site1.com/
  - https://site2.com/
```

### Capabilities (caps)

```yaml
caps:
  categorymappings:
    - {id: 1, cat: Movies, desc: "Movies"}
    - {id: 2, cat: TV, desc: "TV"}
  
  modes:
    search: [q]
    tv-search: [q, season, ep]
    movie-search: [q, imdbid]
```

### Search Configuration

```yaml
search:
  paths:
    - path: /search?q={{ .Keywords }}
  
  rows:
    selector: table tr.result   # CSS selector for result rows
  
  fields:
    title:                       # Required
      selector: td.name a
    
    download:                    # Required (or magnet)
      selector: a.download
      attribute: href
    
    size:                        # Recommended
      selector: td.size
      filters:
        - name: replace
          args: [" ", ""]
    
    seeders:                     # Recommended
      selector: td.seeds
    
    leechers:                    # Optional
      selector: td.leeches
    
    date:                        # Recommended
      selector: td.date
      filters:
        - name: dateparse
          args: "DD-MMM-YYYY"
    
    category:                    # Optional
      selector: td.cat a
      attribute: href
      filters:
        - name: regexp
          args: ["cat=(\\d+)", 1]
```

### Selector Configuration

```yaml
# Simple selector (text content)
field:
  selector: td.name

# Selector with attribute extraction
field:
  selector: a.link
  attribute: href

# Selector with filters
field:
  selector: td.date
  filters:
    - name: replace
      args: ["-", "/"]
    - name: dateparse
      args: "MM/DD/YYYY"

# Selector with default value
field:
  selector: td.optional
  default: "Unknown"
```

## Template Variables

Use in `paths`:

- `{{ .Keywords }}` - Search query
- `{{ .Query }}` - Alias for Keywords
- `{{ .Category }}` - Category ID

## Adding New Indexers

1. **Create YAML file** in `definitions/`
2. **Test with curl** to verify HTML structure
3. **Find CSS selectors** using browser DevTools
4. **Test the scraper**:
   ```bash
   node -e "require('./scrapers').testScraper('your-id').then(console.log)"
   ```
5. **Refine selectors** and filters as needed

## Example: Testing LimeTorrents

```javascript
const scraperManager = require('./scrapers');

async function test() {
  // Test connection
  const test = await scraperManager.testScraper('limetorrents');
  console.log('Test:', test);
  
  // Perform search
  const results = await scraperManager.search('limetorrents', 'ubuntu');
  console.log(`Found ${results.results.length} results`);
  console.log('First result:', results.results[0]);
}

test();
```

## Integration with BorrowArr

The scraper system integrates with the existing search service:

```javascript
// In server/services/indexerSearch.js
const scraperManager = require('../scrapers');

// Check if indexer has a scraper definition
const scraper = scraperManager.getScraper(indexer.id);
if (scraper) {
  // Use scraper
  const results = await scraper.search(query);
} else {
  // Fall back to Prowlarr proxy or other methods
}
```

## Performance

- **Concurrent searches**: Searches multiple indexers in parallel
- **Timeout**: 15 seconds per indexer
- **Retries**: Automatically retries failed requests
- **Caching**: Definitions loaded once at startup

## Troubleshooting

### No results found
1. Check the HTML structure hasn't changed
2. Verify CSS selectors in browser DevTools
3. Test the search URL manually
4. Check console logs for warnings

### Wrong data extracted
1. Verify selector is targeting correct element
2. Check if filters are applied correctly
3. Test individual selectors in DevTools

### Date parsing fails
1. Check date format in HTML
2. Use appropriate dateparse format or timeago filter
3. Add console.log to see raw date value

## Next Steps

1. Add more popular indexers:
   - 1337x
   - RARBG (if back)
   - YTS
   - EZTV
   - TorrentGalaxy

2. Enhance features:
   - Login support for private trackers
   - CAPTCHA handling
   - Rate limiting per indexer
   - Proxy support

3. Testing:
   - Unit tests for filters
   - Integration tests for each indexer
   - Automated health checks

