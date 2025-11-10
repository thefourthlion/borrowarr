# TMDB Movie Search Implementation

## Overview
Completely redesigned the search page to use TMDB (The Movie Database) API for movie searching, similar to Radarr's interface.

## Backend Changes

### 1. TMDB Service (`server/services/tmdbService.js`)
- **Purpose**: Handles all TMDB API interactions
- **Features**:
  - Search movies by title
  - Get movie details by ID
  - Get popular movies
  - Image URL helpers (posters, backdrops)
- **Authentication**: Uses TMDB API Read Access Token

### 2. TMDB Controller (`server/controllers/TMDB.js`)
- **Endpoints**:
  - `searchMovies`: Search TMDB for movies
  - `getMovieDetails`: Get detailed movie information
  - `getPopularMovies`: Fetch popular movies
  - `searchTorrentsForMovie`: Search indexers for torrents of a specific movie

### 3. TMDB Routes (`server/routes/tmdb.js`)
- **API Routes**:
  - `GET /api/TMDB/search` - Search movies
  - `GET /api/TMDB/popular` - Get popular movies
  - `GET /api/TMDB/movie/:id` - Get movie details
  - `GET /api/TMDB/movie/:id/torrents` - Search torrents for movie

### 4. Server Integration (`server/index.js`)
- Added TMDB routes to the Express server

## Frontend Changes

### 1. New Movie Search Page (`client/app/pages/search/page.tsx`)
**Complete redesign with the following features:**

#### Search Interface
- TMDB movie search with debounced queries
- Large search bar with icon
- "Add New Movie" header (Radarr-style)
- Responsive grid layout

#### Movie Display
- **Grid Layout**: 2-6 columns depending on screen size
- **Movie Cards**:
  - Movie poster (or placeholder if not available)
  - Movie title
  - Release year with calendar icon
  - Rating with star icon
  - Hover effect with scale animation

#### Movie Details Modal
When clicking a movie:
- **Movie Information**:
  - Poster image
  - Full title
  - Release year
  - Rating
  - Overview/description
  
- **Available Torrents Section**:
  - Automatically searches indexers for the movie
  - Shows list of available torrents
  - Each torrent displays:
    - Full title
    - Indexer name
    - File size
    - Number of seeders
    - Download button
  
- **Download Functionality**:
  - Click "Download" to send to download client
  - Loading state while downloading
  - Success/error feedback
  - Integrates with existing download client system

#### Features
- URL query parameter support (navbar search)
- Pagination for search results
- Loading states with spinners
- Empty states with helpful messages
- Server connection status warnings
- Responsive design for all screen sizes

### 2. Navbar Update (`client/components/navbar.tsx`)
- Changed search placeholder from "Search torrents..." to "Search movies..."

### 3. Old Search Backup
- Original torrent search page backed up as `page-torrent-backup.tsx`

## How It Works

### User Flow
1. **Search**: User types a movie name in the search bar
2. **Results**: System queries TMDB and displays movie cards with posters
3. **Click Movie**: User clicks on a movie card
4. **Modal Opens**: Shows movie details and searches indexers for torrents
5. **View Torrents**: User sees all available torrent options
6. **Download**: User clicks download on preferred torrent
7. **Sent to Client**: Torrent is sent to configured download client

### Technical Flow
```
User Search Input
    ↓
TMDB API Search
    ↓
Display Movie Cards
    ↓
User Clicks Movie
    ↓
Search Indexers (existing search service)
    ↓
Display Torrent Results
    ↓
User Clicks Download
    ↓
Download Client API (existing functionality)
```

## API Endpoints Used

### TMDB
- **Search**: `/api/TMDB/search?query={movie_name}&page={page}`
- **Movie Torrents**: `/api/TMDB/movie/{id}/torrents?title={title}&year={year}`

### Download
- **Grab**: `/api/DownloadClients/grab` (POST with downloadUrl)

## Environment Variables Required

```env
TMDB_API=02ad41cf73db27ff46061d6f52a97342
TMDB_API_READ=eyJhbGci....(your token)
```

## Key Technologies
- **Backend**: Express.js, Axios
- **Frontend**: React, Next.js, NextUI, TypeScript
- **APIs**: TMDB API v3
- **State Management**: React hooks
- **Styling**: Tailwind CSS, NextUI components

## Benefits

### Compared to Direct Torrent Search:
1. ✅ **Better UX**: Visual movie posters and organized layout
2. ✅ **More Context**: Full movie details, ratings, descriptions
3. ✅ **Focused Results**: See all torrents for ONE movie at a time
4. ✅ **Quality Control**: Make informed decisions with full movie info
5. ✅ **Similar to Radarr**: Familiar interface for users
6. ✅ **Still Uses Indexers**: Leverages your existing configured indexers
7. ✅ **Flexible Downloads**: Choose from multiple torrent sources

## Future Enhancements (Optional)
- Add to library/watchlist functionality
- Quality profile selection
- Automatic download based on preferences
- Movie filtering (genre, year, rating)
- Recently added movies section
- Trending/popular movies display

## Notes
- The original torrent search page is preserved as backup
- All existing download client functionality is preserved
- Works with your configured indexers
- Requires TMDB API credentials (already provided)

