# Automated Scraper Implementation System

## Overview

This system automatically processes all 520 indexers from your database, fetches their Prowlarr Cardigann definitions, converts them to our Node.js format, and tests them.

## Progress

- **Total Indexers:** 520
- **Processed:** Check `scraper-progress.json`
- **Checklist:** See `SCRAPER_CHECKLIST.md`

## Usage

### Process All Indexers

```bash
cd server
node scripts/processAllScrapers.js --batch-size=20
```

### Resume After Interruption

```bash
node scripts/processAllScrapers.js --batch-size=20 --resume
```

### Process Small Batch (Testing)

```bash
node scripts/processAllScrapers.js --batch-size=5
```

## Options

- `--batch-size=N` - Number of indexers to process per batch (default: 20)
- `--resume` - Resume from where you left off (uses `scraper-progress.json`)

## Files Generated

1. **Scraper Definitions:** `server/scrapers/definitions/*.yml`
2. **Progress Tracking:** `scraper-progress.json`
3. **Checklist:** `SCRAPER_CHECKLIST.md` (auto-updated)

## How It Works

1. **Fetches Prowlarr Definitions** from GitHub (versioned folders v1-v11)
2. **Converts YAML** from Prowlarr format to our Node.js format
3. **Saves Definitions** to `server/scrapers/definitions/`
4. **Tests Scrapers** by loading them into the scraper manager
5. **Updates Checklist** automatically with progress
6. **Saves Progress** after each indexer (can resume if interrupted)

## Status Indicators

- ✅ **Success** - Scraper found, converted, saved, and loaded successfully
- ⚠️ **Warning** - Scraper saved but not yet loaded (will work after server restart)
- ❌ **Failed** - Could not find definition or conversion failed

## Notes

- The script handles rate limiting with delays between requests
- Progress is saved after each indexer, so you can safely interrupt and resume
- Some scrapers may require FlareSolverr for Cloudflare-protected sites
- All scrapers are automatically integrated with your `page.tsx` UI

## Estimated Time

- **Per Indexer:** ~2-5 seconds
- **Total (520 indexers):** ~20-45 minutes
- **With Resume:** Can be split across multiple sessions

## Troubleshooting

### Script Stops Unexpectedly

Just run with `--resume` flag to continue from where it stopped.

### Some Scrapers Not Loading

Some scrapers may need server restart to load. They're still saved correctly.

### Rate Limiting

If you hit GitHub rate limits, wait a few minutes and resume.

## Integration with UI

All scrapers are automatically available in your `page.tsx` indexers page:
1. Go to "Add Indexer"
2. Search for the indexer name
3. Click "Add"
4. Configure and test
5. Save

The scrapers work seamlessly with your existing UI!

