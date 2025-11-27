# Letterboxd Scraper Integration Guide

This guide shows how to integrate the Letterboxd scraper with your BorrowArr frontend.

## Quick Start

### 1. Run Initial Scrape

First, scrape the featured lists from Letterboxd:

```bash
cd server
node scripts/scrapeLetterboxd.js featured
```

This will populate your database with featured lists metadata.

### 2. Scrape Full List Details (Optional)

To get all films from a specific list:

```bash
node scripts/scrapeLetterboxd.js list official-top-250-narrative-feature-films
```

### 3. Access via API

The lists are now available via REST API:

```javascript
// Get all featured lists
const response = await axios.get('http://localhost:3013/api/FeaturedLists');

// Get a specific list
const list = await axios.get('http://localhost:3013/api/FeaturedLists/official-top-250-narrative-feature-films');

// Search lists
const results = await axios.get('http://localhost:3013/api/FeaturedLists/search?query=horror');
```

## Frontend Integration

### Option 1: Replace TMDb Lists with Letterboxd Lists

Update `client/app/pages/featuredlists/page.tsx` to fetch from your API:

```typescript
// Instead of fetching from TMDb
const fetchLetterboxdLists = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/FeaturedLists?featured=true&limit=50`);
    const letterboxdLists = response.data.lists;
    
    // Map to your existing format
    const formattedLists = letterboxdLists.map(list => ({
      id: list.slug,
      title: list.title,
      description: list.description,
      icon: Star, // Choose appropriate icon
      color: 'from-yellow-500 to-orange-500',
      movies: [], // Empty initially, load on demand
      totalCount: list.filmCount,
      type: 'movie' as const,
    }));
    
    setLists(formattedLists);
  } catch (error) {
    console.error('Error fetching Letterboxd lists:', error);
  }
};
```

### Option 2: Hybrid Approach (Letterboxd + TMDb)

Combine Letterboxd curated lists with TMDb discovery:

```typescript
const fetchAllLists = async () => {
  const [letterboxdLists, tmdbLists] = await Promise.all([
    // Fetch from Letterboxd
    axios.get(`${API_BASE_URL}/api/FeaturedLists?featured=true`),
    // Keep your existing TMDb fetches
    fetchTMDbLists(),
  ]);
  
  // Combine both sources
  const combined = [
    ...letterboxdLists.data.lists.map(mapLetterboxdList),
    ...tmdbLists,
  ];
  
  setLists(combined);
};
```

### Option 3: Separate Letterboxd Section

Create a dedicated section for Letterboxd lists:

```tsx
<div className="mb-12">
  <h2 className="text-2xl font-bold mb-6">
    From Letterboxd Community
  </h2>
  <div className="grid gap-6">
    {letterboxdLists.map(list => (
      <LetterboxdListCard key={list.id} list={list} />
    ))}
  </div>
</div>

<div>
  <h2 className="text-2xl font-bold mb-6">
    Popular on TMDb
  </h2>
  <div className="grid gap-6">
    {tmdbLists.map(list => (
      <TMDbListCard key={list.id} list={list} />
    ))}
  </div>
</div>
```

## Matching Letterboxd Films with TMDb

Since Letterboxd doesn't provide TMDb IDs, you'll need to match films:

```typescript
async function matchLetterboxdFilmToTMDb(letterboxdFilm: any) {
  try {
    // Search TMDb with the film title
    const searchResponse = await axios.get(`${API_BASE_URL}/api/TMDB/search`, {
      params: {
        query: letterboxdFilm.title,
        type: 'movie',
      },
    });
    
    const results = searchResponse.data.results || [];
    
    // Find best match (you might want more sophisticated matching)
    const bestMatch = results[0];
    
    return {
      ...letterboxdFilm,
      tmdbId: bestMatch?.id,
      posterUrl: bestMatch?.poster_path 
        ? `https://image.tmdb.org/t/p/w500${bestMatch.poster_path}`
        : letterboxdFilm.posterUrl,
    };
  } catch (error) {
    console.error('Error matching film:', error);
    return letterboxdFilm;
  }
}
```

## Background Updates

Set up automatic updates using cron or a scheduled job:

### Node-Cron Example

```javascript
// server/services/letterboxdScheduler.js
const cron = require('node-cron');
const { scraper } = require('../../services/letter-box-scrapper');

// Update featured lists every Sunday at 2 AM
cron.schedule('0 2 * * 0', async () => {
  console.log('Running scheduled Letterboxd scrape...');
  try {
    await scraper.scrapeFeaturedLists();
    console.log('✅ Scheduled scrape complete');
  } catch (error) {
    console.error('❌ Scheduled scrape failed:', error);
  }
});

// Update list details monthly on the 1st at 3 AM
cron.schedule('0 3 1 * *', async () => {
  console.log('Running scheduled list details update...');
  try {
    await scraper.updateAllLists();
    console.log('✅ Scheduled update complete');
  } catch (error) {
    console.error('❌ Scheduled update failed:', error);
  }
});
```

Then in `server/index.js`:

```javascript
// Start schedulers
setTimeout(() => {
  require('./services/letterboxdScheduler');
}, 10000);
```

## Admin Panel Integration

Add admin controls to manually trigger scrapes:

```tsx
// client/app/pages/admin/letterboxd/page.tsx
const AdminLetterboxd = () => {
  const [scraping, setScraping] = useState(false);

  const handleScrapeFeatured = async () => {
    setScraping(true);
    try {
      const token = localStorage.getItem('accessToken');
      await axios.post(
        `${API_BASE_URL}/api/FeaturedLists/scrape`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Featured lists scraped successfully!');
    } catch (error) {
      toast.error('Failed to scrape lists');
    } finally {
      setScraping(false);
    }
  };

  return (
    <div>
      <h1>Letterboxd Management</h1>
      <Button 
        onPress={handleScrapeFeatured}
        isLoading={scraping}
      >
        Scrape Featured Lists
      </Button>
    </div>
  );
};
```

## Data Flow Diagram

```
┌─────────────────┐
│   Letterboxd    │
│  Featured Page  │
└────────┬────────┘
         │ (Scraper)
         ▼
┌─────────────────┐
│  Database       │
│ FeaturedLists   │
└────────┬────────┘
         │ (API)
         ▼
┌─────────────────┐
│  Frontend       │
│ Featured Lists  │
│     Page        │
└─────────────────┘
```

## Performance Optimization

### Caching Strategy

```typescript
// Cache Letterboxd lists for 1 hour
const CACHE_TTL = 60 * 60 * 1000; // 1 hour
let cachedLists: any[] = [];
let cacheTime: number = 0;

async function getLetterboxdLists() {
  const now = Date.now();
  
  if (cachedLists.length > 0 && now - cacheTime < CACHE_TTL) {
    return cachedLists;
  }
  
  const response = await axios.get(`${API_BASE_URL}/api/FeaturedLists`);
  cachedLists = response.data.lists;
  cacheTime = now;
  
  return cachedLists;
}
```

### Pagination for Large Lists

```typescript
// For lists with 250+ films
async function getListFilms(slug: string, page: number = 1) {
  const response = await axios.get(`${API_BASE_URL}/api/FeaturedLists/${slug}`);
  const list = response.data.list;
  
  const perPage = 20;
  const start = (page - 1) * perPage;
  const end = start + perPage;
  
  return {
    films: list.scrapedFilms.slice(start, end),
    total: list.filmCount,
    currentPage: page,
    totalPages: Math.ceil(list.filmCount / perPage),
  };
}
```

## Testing

Test the scraper before deploying:

```bash
# Test featured lists scrape
node scripts/scrapeLetterboxd.js featured

# Verify database entry
sqlite3 database.sqlite "SELECT * FROM FeaturedLists LIMIT 1;"

# Test API endpoint
curl http://localhost:3013/api/FeaturedLists

# Test specific list
curl http://localhost:3013/api/FeaturedLists/official-top-250-narrative-feature-films
```

## Troubleshooting

### Issue: No lists returned

**Solution**: Run the initial scrape:
```bash
node scripts/scrapeLetterboxd.js featured
```

### Issue: Scraper fails with network error

**Solution**: 
- Check internet connection
- Verify Letterboxd is accessible
- Increase request timeout in scraper

### Issue: Films not matching TMDb

**Solution**: Implement fuzzy matching or manual mapping table for edge cases

## Best Practices

1. **Rate Limiting**: Keep 2-second delays between requests
2. **Error Handling**: Log failures but continue processing other lists
3. **Data Freshness**: Update featured lists weekly, details monthly
4. **User Experience**: Show loading states during initial data fetch
5. **Fallback**: Keep TMDb lists as backup if Letterboxd is unavailable

## Next Steps

1. Run initial scrape to populate database
2. Update frontend to use new API endpoints
3. Set up background scheduler for automatic updates
4. Add admin controls for manual scraping
5. Implement film matching with TMDb
6. Add caching for better performance

