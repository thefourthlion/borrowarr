# 📊 Monitor Scraper Generation

## 📍 Important: Run commands from project root!

The files are in the **project root**, not in the `server` directory.

```bash
# Navigate to project root first
cd /Users/starship/programming/BorrowArr

# Then run monitoring commands
```

## 🔍 Monitor Commands

### Watch Live Progress
```bash
cd /Users/starship/programming/BorrowArr
tail -f scraper-full-run.log
```

### Check Status
```bash
cd /Users/starship/programming/BorrowArr
cat scraper-progress.json | jq '{
  processed: (.processed | length),
  failed: (.failed | length),
  remaining: (520 - ((.processed | length) + (.failed | length))),
  percent: (((.processed | length) + (.failed | length)) * 100 / 520 | floor)
}'
```

### Count Scrapers Created
```bash
cd /Users/starship/programming/BorrowArr
ls server/scrapers/definitions/*.yml | wc -l
```

### Check if Process is Running
```bash
ps aux | grep "processAllScrapers" | grep -v grep
```

## 📁 File Locations

All files are in `/Users/starship/programming/BorrowArr/`:

- `scraper-full-run.log` - Live log output
- `scraper-progress.json` - Progress tracking
- `server/scrapers/definitions/*.yml` - Generated scrapers
- `SCRAPER_CHECKLIST.md` - Auto-updated checklist

## ⚡ Quick Status Check

```bash
cd /Users/starship/programming/BorrowArr && \
echo "📊 Scrapers created: $(ls server/scrapers/definitions/*.yml 2>/dev/null | wc -l)" && \
cat scraper-progress.json 2>/dev/null | jq '{processed: (.processed | length), failed: (.failed | length), remaining: (520 - ((.processed | length) + (.failed | length)))}' || echo "Starting up..."
```

## 🚀 Restart if Needed

If the process stopped, restart it:

```bash
cd /Users/starship/programming/BorrowArr
node server/scripts/processAllScrapers.js --batch-size=30 --resume
```

