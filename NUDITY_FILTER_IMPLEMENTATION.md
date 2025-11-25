# Nudity Filter Implementation Guide

## Overview
I've implemented a comprehensive nudity filtering system based on IMDb parental guide data. This allows users to filter movies and series on the discover pages based on the presence and severity of nudity content.

## Components Created

### 1. Database Model (`server/models/ParentalGuide.js`)
- Stores IMDb parental guide data including nudity severity
- Tracks multiple content ratings: nudity, violence, profanity, alcohol, frightening
- Caches data to avoid repeated scraping
- Severity levels: None, Mild, Moderate, Severe

### 2. IMDb Scraper (`server/services/imdbParentalGuideScraper.js`)
- Scrapes IMDb parental guide pages for content ratings
- Supports both old and new IMDb HTML layouts (2024+)
- Respects rate limiting (1.5 second delay between requests)
- Extracts severity ratings and vote counts
- Caches results for 30 days

### 3. API Controller (`server/controllers/ParentalGuide.js`)
**Endpoints:**
- `GET /api/ParentalGuide/:imdbId` - Get parental guide for specific IMDb ID
- `POST /api/ParentalGuide/check-batch` - Batch check nudity status for multiple items
- `POST /api/ParentalGuide/scrape` - Manually trigger scraping (admin only)
- `GET /api/ParentalGuide` - Get all parental guides (admin only)
- `DELETE /api/ParentalGuide/:imdbId` - Delete parental guide entry (admin only)

### 4. API Routes (`server/routes/ParentalGuide.js`)
- Public routes for checking nudity data
- Protected routes for scraping and management

### 5. Frontend Integration

#### Movies Page (`client/app/pages/discover/movies/page.tsx`)
Added:
- Nudity filter dropdown with 5 options:
  - All Content
  - No Nudity
  - Mild or Less
  - Moderate or Less
  - Include Severe
- Auto-fetches nudity data when filter is active
- Filters movies client-side based on nudity data
- Fetches IMDb IDs and parental guide data in batches of 10

#### Series Page (`client/app/pages/discover/series/page.tsx`)
Same implementation as movies page, adapted for TV series

## How It Works

### 1. User Selects Nudity Filter
When a user selects a nudity filter (e.g., "No Nudity"), the system:

1. Displays current results immediately
2. Fetches IMDb IDs for all visible movies/series in batches
3. Queries the parental guide API with these IMDb IDs
4. Filters results client-side based on severity ratings

### 2. Data Caching
- Parental guide data is stored in SQLite database
- Data is cached for 30 days
- If data doesn't exist, it can be scraped on-demand
- No data = item is shown (permissive default)

### 3. Severity Mapping
```
No Nudity    → Shows only items with "None" severity or no nudity flag
Mild or Less → Shows "None" and "Mild" severity
Moderate or Less → Shows everything except "Severe"
Include Severe → Shows all content (same as "All Content")
```

## Usage Example

### For Users:
1. Go to `/pages/discover/movies` or `/pages/discover/series`
2. Click "Filters" button
3. Find "Nudity Content" dropdown
4. Select desired filter level
5. Results will update automatically

### For Developers:
```javascript
// Manually scrape parental guide data
const scraper = new IMDbParentalGuideScraper();
await scraper.scrapeParentalGuide('tt0133093', 550, 'movie', 'The Matrix');

// Batch check nudity status
const response = await axios.post(`${API_BASE_URL}/api/ParentalGuide/check-batch`, {
  items: [
    { imdbId: 'tt0133093', tmdbId: 550, mediaType: 'movie' },
    { imdbId: 'tt0468569', tmdbId: 155, mediaType: 'movie' }
  ]
});
```

## Database Schema

```sql
CREATE TABLE parental_guide (
  id UUID PRIMARY KEY,
  imdbId VARCHAR UNIQUE NOT NULL,
  tmdbId INTEGER,
  mediaType ENUM('movie', 'tv'),
  title VARCHAR,
  hasNudity BOOLEAN DEFAULT FALSE,
  nuditySeverity ENUM('None', 'Mild', 'Moderate', 'Severe'),
  nudityVotes INTEGER,
  nudityDetails TEXT,
  violence ENUM('None', 'Mild', 'Moderate', 'Severe'),
  profanity ENUM('None', 'Mild', 'Moderate', 'Severe'),
  alcohol ENUM('None', 'Mild', 'Moderate', 'Severe'),
  frightening ENUM('None', 'Mild', 'Moderate', 'Severe'),
  lastScrapedAt TIMESTAMP,
  scrapedSuccessfully BOOLEAN,
  errorMessage TEXT,
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP
);
```

## Important Notes

1. **Server Restart Required**: You need to restart the server for the new database model to be created:
   ```bash
   # Stop the server, then restart it
   cd server && node index.js
   ```

2. **Rate Limiting**: The scraper respects IMDb's servers with a 1.5-second delay between requests

3. **Batch Processing**: Fetches IMDb IDs in batches of 10 to avoid overwhelming the TMDB API

4. **Graceful Degradation**: If parental guide data isn't available, items are shown by default

5. **User Agent**: The scraper identifies itself as "BorrowArr-AI-Scraper/1.0" in requests

## Testing

After restarting the server, test the feature:

1. Open browser to `http://localhost:3012/pages/discover/movies`
2. Click "Filters"
3. Select "No Nudity" from Nudity Content dropdown
4. Watch browser console - you should see API calls to fetch IMDb IDs and parental guide data
5. Results should filter automatically

## Future Enhancements

Potential improvements:
- Pre-populate parental guide database for popular movies
- Add manual scraping UI for admins
- Show nudity badge on movie/series cards
- Add more filter options (violence, profanity, etc.)
- Background job to keep parental guide data fresh
- Display severity level in movie/series modals

## Files Modified

### Backend:
- `server/models/ParentalGuide.js` (new)
- `server/services/imdbParentalGuideScraper.js` (new)
- `server/controllers/ParentalGuide.js` (new)
- `server/routes/ParentalGuide.js` (new)
- `server/index.js` (registered model and routes)

### Frontend:
- `client/app/pages/discover/movies/page.tsx` (added nudity filter)
- `client/app/pages/discover/series/page.tsx` (added nudity filter)

## No Breaking Changes

All changes are additive - existing functionality remains unchanged.


