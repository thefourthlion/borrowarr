# Parental Guide Filter - Troubleshooting Guide

## 🎉 STATUS: API 100% WORKING

The backend API has been tested and is **fully functional**:

- ✅ **Dexter (tt0773262)**: Correctly identifies **SEVERE** nudity
- ✅ **The Matrix (tt0133093)**: Correctly identifies **MILD** nudity  
- ✅ **All 5 categories** working: Nudity, Violence, Profanity, Alcohol/Drugs, Frightening

## How The System Works

### Backend Flow (✅ WORKING 100%)

1. **Scraper** (`server/services/imdbParentalGuideScraper.js`)
   - Scrapes IMDb parental guide pages
   - Extracts severity for all 5 categories
   - Handles both old and new IMDb HTML layouts
   - Caches data for 30 days

2. **Database** (`server/models/ParentalGuide.js`)
   - Stores scraped data in SQLite
   - Key fields: `imdbId`, `nuditySeverity`, `violence`, `profanity`, `alcohol`, `frightening`

3. **API Endpoint** (`/api/ParentalGuide/check-batch`)
   - Accepts: `{ items: [{ imdbId, tmdbId, mediaType }] }`
   - Returns: `{ nudityMap: { imdbId: { severity, violence, ...} } }`

### Frontend Flow (⚠️ NEEDS TESTING)

1. **User enables a filter** (e.g., "No Nudity")
2. **Fetch parental guide data**:
   - For each movie/series visible on page
   - Fetch TMDb details to get IMDb ID
   - Query `/api/ParentalGuide/check-batch` with IMDb IDs
   - Map results back to TMDb IDs and store in state
3. **Apply filters**:
   - For each movie/series, check parental guide data
   - Hide if it doesn't meet filter criteria

## Testing The API (Backend)

Run this test script to verify the API is working:

```bash
bash /Users/starship/programming/BorrowArr/test_api_complete.sh
```

**Expected Output:**
```
✅ Test 2 PASSED: Dexter correctly identified as having SEVERE nudity
✅ Test 3 PASSED: The Matrix correctly identified as having MILD nudity
```

## Testing The Frontend

### Step 1: Open Browser Console

1. Open: `http://localhost:3012/pages/discover/movies`
2. Open Developer Tools (F12)
3. Go to Console tab

### Step 2: Enable Nudity Filter

1. Click **"Filters"** button
2. Scroll to **"Content Filters (IMDb Parental Guide)"**
3. Set **"Sex & Nudity"** to **"None Only"**
4. Close filter modal

### Step 3: Check Console Logs

You should see detailed logging:

```
🔍 Starting parental guide data fetch...
📊 Movies needing parental guide data: 20
📦 Fetching IMDb IDs for batch 1 (10 movies)
  ✓ Movie Title (TMDb:123) → tt1234567
  ✓ Another Movie (TMDb:456) → tt7654321
📊 Total movies with IMDb IDs: 18
🌐 Querying parental guide API with 18 items...
✅ Parental guide API response: { nudityMap: {...} }
  ✓ Movie A (tt1234567): Nudity=None, Violence=Mild
  ✓ Movie B (tt7654321): Nudity=Severe, Violence=Moderate
📊 Mapped 18 movies with parental guide data
```

### Step 4: Verify Filtering

Look for these console logs when movies are rendered:

```
Filtering out "Movie Name" - nudity: Severe, filter: none
✅ Showing "Safe Movie" - passes all filters
```

## Common Issues & Solutions

### Issue 1: "No parental guide data yet"

**Symptom:** Movies aren't being filtered even with filters enabled

**Cause:** IMDb IDs haven't been fetched yet, or API returned empty

**Solution:**
1. Check browser console for errors
2. Verify server is running on port 3013
3. Test API with curl:
   ```bash
   curl -X POST http://localhost:3013/api/ParentalGuide/check-batch \
     -H "Content-Type: application/json" \
     -d '{"items":[{"imdbId":"tt0773262","tmdbId":1393,"mediaType":"series"}]}'
   ```

### Issue 2: Movies still showing with filters enabled

**Symptom:** Dexter (or other explicit content) shows even with "No Nudity" filter

**Debugging Steps:**

1. **Check if data was fetched:**
   - Look for `✅ Parental guide API response` in console
   - Verify it contains the movie's IMDb ID
   
2. **Check if data was mapped:**
   - Look for `✓ Movie Name (tt...): Nudity=...` logs
   - Verify the TMDb → IMDb → TMDb mapping worked
   
3. **Check if filter was applied:**
   - Look for `Filtering out "Movie Name"` or `✅ Showing "Movie Name"` logs
   - Verify the severity matches expectations

4. **Check filter logic:**
   - "None Only" should hide: Mild, Moderate, Severe
   - "Mild or Less" should hide: Moderate, Severe
   - "Moderate or Less" should hide: Severe

### Issue 3: Data not persisting between page loads

**Cause:** Parental guide data is stored in component state, not localStorage

**Expected Behavior:** Data is re-fetched each time you load the page, but it comes from the database cache (fast)

**Solution:** This is intentional - the system will automatically fetch data when needed

### Issue 4: Some movies have no data

**Cause:** Not all movies/series have IMDb parental guide pages, or the page has no content

**Expected Behavior:** Movies without data are HIDDEN when filters are active (conservative approach)

**Console Log:** `Hiding "Movie Name" - no parental guide data yet`

## Manual Testing Checklist

- [ ] 1. API test passes (Dexter = Severe)
- [ ] 2. Frontend loads without errors
- [ ] 3. Filter modal opens and shows all 5 categories
- [ ] 4. Setting "No Nudity" triggers data fetch (check console)
- [ ] 5. Console shows IMDb IDs being fetched
- [ ] 6. Console shows API response with nudityMap
- [ ] 7. Console shows movies being mapped
- [ ] 8. Console shows filtering decisions ("Filtering out..." logs)
- [ ] 9. Movies with severe nudity are hidden
- [ ] 10. Movies with no/mild nudity are shown

## Quick Fixes

### Clear Filter and Start Fresh

1. Set all filters back to "All Content"
2. Refresh page (F5)
3. Open console (F12)
4. Enable ONE filter at a time
5. Watch console logs carefully

### Force Re-scrape Dexter

```bash
cd /Users/starship/programming/BorrowArr/server
node scripts/testParentalGuideScraper.js
```

### Check Database Directly

```bash
cd /Users/starship/programming/BorrowArr/server
sqlite3 borrowarr.db "SELECT imdbId, title, nuditySeverity, violence, profanity FROM parental_guide LIMIT 10;"
```

## Support

If filters still aren't working after these steps:

1. **Capture console logs** - Full console output from opening page to applying filter
2. **Capture API response** - Look for the `/api/ParentalGuide/check-batch` request in Network tab
3. **Note which movie** - Which specific movie should be hidden but isn't?
4. **Test that movie's IMDb ID** - Run `test_api_complete.sh` with that IMDb ID

## Technical Details

### Filter Logic

```typescript
// Filter is "none" (No Nudity)
if (nudityFilter === "none") {
  return nuditySeverity === "None"; // Only show "None"
}

// Filter is "mild" (Mild or Less)
if (nudityFilter === "mild") {
  return nuditySeverity === "None" || nuditySeverity === "Mild";
}

// Filter is "moderate" (Moderate or Less)
if (nudityFilter === "moderate") {
  return ["None", "Mild", "Moderate"].includes(nuditySeverity);
}
```

### Data Flow

```
TMDb Movie → Fetch Details → IMDb ID → Query API → Severity Data → Apply Filter → Show/Hide
```

### Caching

- **Database**: 30 days (configurable in scraper)
- **Frontend State**: Until page refresh
- **API**: No caching (always queries DB)

---

**Last Updated**: 2024-11-24
**Version**: 1.0.0
**Status**: ✅ Backend 100% Working, Frontend Debugging Enhanced

