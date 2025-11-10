# 🧪 Testing All Scrapers

## Status: Running

The comprehensive test of all scrapers is now running in the background.

## What's Being Tested

- **Total Scrapers:** ~366 scrapers
- **Test Queries:** `test`, `ubuntu`, `matrix`, `game`
- **Goal:** Verify which scrapers actually return torrent results

## Monitor Progress

### 1. Watch Live Logs
```bash
cd /Users/starship/programming/BorrowArr
tail -f scraper-test-run.log
```

### 2. Check Results File (Updates After Each Test)
```bash
cd /Users/starship/programming/BorrowArr
cat scraper-test-results.json | jq '{
  tested: (.tested | length),
  working: (.working | length),
  failed: (.failed | length),
  noResults: (.noResults | length)
}'
```

### 3. Check Process Status
```bash
ps aux | grep testAllScrapers
```

## Output Files

- **`scraper-test-run.log`** - Full console output
- **`scraper-test-results.json`** - JSON results (updates after each test)
- **`SCRAPER_TEST_REPORT.md`** - Final markdown report (generated when complete)

## Expected Duration

- **Per Scraper:** ~2-5 seconds (tries 4 queries)
- **Total Time:** ~15-30 minutes for all scrapers
- **With Delays:** May take longer due to rate limiting

## Results Categories

1. **✅ Working** - Returns torrent results for at least one test query
2. **⚠️ No Results** - Connection works but no torrents found for test queries
3. **❌ Failed** - Search failed (Cloudflare, timeout, etc.)

## When Complete

The script will:
1. Generate `SCRAPER_TEST_REPORT.md` with full results
2. Show summary statistics
3. Exit automatically

## Stop Test (if needed)

```bash
pkill -f testAllScrapers
```

