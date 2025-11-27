# Letterboxd Featured Lists Scraper

This service scrapes publicly accessible featured lists from Letterboxd in full compliance with their Terms of Service for automated access.

## Compliance with Letterboxd Terms of Service

This scraper operates in accordance with Letterboxd's automated access policy:

### ✅ What We Do

- **Access only public data** - No authentication required
- **Respect robots.txt** - Follow crawling guidelines
- **Reasonable request rates** - 2-second delay between requests
- **Proper User-Agent** - Identifies as BorrowArr application
- **No circumvention** - No bypassing of technical protections
- **Performance-conscious** - Minimal load on Letterboxd servers

### ❌ What We Don't Do

- Access non-public or rate-limited areas
- Circumvent technical protections
- Misrepresent content
- Degrade service performance
- Imply endorsement by Letterboxd

## Features

- Scrape featured lists from Letterboxd's curated collections
- Store list metadata (title, author, film count, likes, etc.)
- Optionally scrape full film details from each list
- Automatic database synchronization
- CLI tool for manual scraping
- REST API for programmatic access

## Database Schema

The `FeaturedLists` table stores:

```javascript
{
  id: UUID,
  slug: string (unique),
  title: string,
  description: text,
  author: string,
  authorUrl: string,
  listUrl: string (unique),
  filmCount: integer,
  likes: integer,
  comments: integer,
  category: enum,
  featured: boolean,
  posterUrls: JSON array,
  scrapedFilms: JSON array,
  lastScrapedAt: date
}
```

## Usage

### CLI Tool

```bash
# Scrape featured lists page
node server/scripts/scrapeLetterboxd.js featured

# Update all existing lists
node server/scripts/scrapeLetterboxd.js update

# Scrape a specific list
node server/scripts/scrapeLetterboxd.js list official-top-250-narrative-feature-films
```

### API Endpoints

**Public Endpoints** (no authentication required):

```
GET /api/FeaturedLists
GET /api/FeaturedLists/search?query=horror
GET /api/FeaturedLists/:slug
```

**Protected Endpoints** (authentication required):

```
POST /api/FeaturedLists/scrape
POST /api/FeaturedLists/scrape/:slug
POST /api/FeaturedLists/update-all
POST /api/FeaturedLists
PUT /api/FeaturedLists/:slug
DELETE /api/FeaturedLists/:slug
```

### Programmatic Usage

```javascript
const { scraper } = require('./services/letter-box-scrapper');

// Scrape featured lists page
const lists = await scraper.scrapeFeaturedLists();

// Scrape full details for a specific list
const list = await scraper.scrapeFullListDetails('official-top-250-narrative-feature-films');

// Update all lists
await scraper.updateAllLists();
```

## Rate Limiting

The scraper implements a 2-second delay between requests to be respectful of Letterboxd's servers. This can be adjusted in the `LetterboxdScraper` constructor:

```javascript
this.requestDelay = 2000; // milliseconds
```

## Error Handling

The scraper includes comprehensive error handling:

- Request timeouts (10 seconds)
- Network error recovery
- Parse error handling
- Database error handling
- Detailed logging

## Data Structure

### List Metadata

```javascript
{
  slug: "official-top-250-narrative-feature-films",
  title: "Official Top 250 Narrative Feature Films",
  author: "dave",
  authorUrl: "https://letterboxd.com/dave/",
  listUrl: "https://letterboxd.com/dave/list/official-top-250-narrative-feature-films/",
  filmCount: 250,
  likes: 15420,
  comments: 342,
  category: "official",
  featured: true,
  posterUrls: ["url1", "url2", ...],
  lastScrapedAt: "2025-01-01T12:00:00.000Z"
}
```

### Film Data (when scraping full list)

```javascript
{
  slug: "the-shawshank-redemption",
  title: "The Shawshank Redemption",
  posterUrl: "https://...",
  letterboxdUrl: "https://letterboxd.com/film/the-shawshank-redemption/",
  rating: 4.5,
  position: 1
}
```

## Integration with TMDb

The scraped film data includes Letterboxd slugs which can be:

1. Matched against TMDb search results
2. Used to find TMDb IDs for movies
3. Cross-referenced with your existing movie database

Example workflow:

```javascript
// 1. Scrape Letterboxd list
const list = await scraper.scrapeFullListDetails('top-rated-movies');

// 2. For each film, search TMDb
for (const film of list.scrapedFilms) {
  const tmdbResults = await searchTMDb(film.title);
  // Match and store TMDb ID
}
```

## Maintenance

### Recommended Scraping Schedule

- **Featured lists page**: Weekly (to catch new featured lists)
- **Individual list details**: Monthly (to update film counts, likes, etc.)
- **Full film scraping**: On-demand only (large data transfer)

### Cron Job Example

```bash
# Update featured lists weekly (Sunday at 2 AM)
0 2 * * 0 cd /path/to/server && node scripts/scrapeLetterboxd.js featured

# Update all list details monthly (1st of month at 3 AM)
0 3 1 * * cd /path/to/server && node scripts/scrapeLetterboxd.js update
```

## Legal Considerations

- This scraper accesses only publicly available data
- No authentication or login is performed
- Data is used for personal media management only
- No redistribution or commercial use of Letterboxd data
- Letterboxd reserves the right to revoke automated access at any time

## Dependencies

- **axios**: HTTP requests
- **cheerio**: HTML parsing
- **sequelize**: Database ORM

All dependencies are already included in the project's `package.json`.

## Support

For issues or questions:
1. Check the logs for detailed error messages
2. Verify robots.txt hasn't changed: https://letterboxd.com/robots.txt
3. Ensure request delays are sufficient (increase if needed)
4. Review Letterboxd's current ToS for any policy changes

## Future Enhancements

Potential improvements:

- [ ] Automatic TMDb matching for scraped films
- [ ] Caching layer to reduce redundant requests
- [ ] Webhook notifications for new featured lists
- [ ] Integration with frontend featured lists display
- [ ] Scheduled background updates
- [ ] More list categories (genre, decade, director, etc.)
- [ ] User-submitted list scraping (with permission)

