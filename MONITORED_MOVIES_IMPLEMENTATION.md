# Monitored Movies Implementation

## Overview
Implemented a complete monitored movies system that allows users to save movies they want to track, with automatic database storage tied to their Firebase user account.

## Backend Implementation

### 1. Database Model (`server/models/MonitoredMovies.js`)
Created a Sequelize model with the following fields:
- **userId** (STRING, required): Firebase UID of the user
- **tmdbId** (INTEGER, required): TMDB movie ID
- **title** (STRING, required): Movie title
- **posterUrl** (STRING, optional): URL to movie poster
- **releaseDate** (STRING, optional): Release date
- **overview** (TEXT, optional): Movie description
- **qualityProfile** (STRING, default: "any"): Selected quality preference
- **minAvailability** (STRING, default: "released"): Minimum availability setting
- **monitor** (STRING, default: "movieOnly"): Monitor type
- **status** (ENUM, default: "monitoring"): Current status (monitoring, downloading, downloaded, error)
- **downloadedTorrentId** (STRING, optional): ID of downloaded torrent
- **downloadedTorrentTitle** (STRING, optional): Title of downloaded torrent
- **createdAt/updatedAt** (timestamps): Automatic timestamps

**Indexes:**
- Index on `userId` for fast user queries
- Unique composite index on `(tmdbId, userId)` to prevent duplicate monitoring

### 2. API Controller (`server/controllers/MonitoredMovies.js`)
Endpoints:
- **GET `/api/MonitoredMovies`**: Get all monitored movies for a user
  - Query param: `userId` (required)
  - Returns: `{ success: true, movies: [...] }`

- **POST `/api/MonitoredMovies`**: Add a movie to monitoring
  - Body: `{ userId, tmdbId, title, posterUrl, releaseDate, overview, qualityProfile, minAvailability, monitor }`
  - Returns: `{ success: true, movie: {...} }`
  - Prevents duplicates (409 error if already monitored)

- **PUT `/api/MonitoredMovies/:id`**: Update a monitored movie
  - Body: Any fields to update
  - Returns: `{ success: true, movie: {...} }`

- **DELETE `/api/MonitoredMovies/:id`**: Remove a movie from monitoring
  - Query param: `userId` (required for security)
  - Returns: `{ success: true, message: "..." }`

- **GET `/api/MonitoredMovies/check`**: Check if a movie is monitored
  - Query params: `userId`, `tmdbId`
  - Returns: `{ success: true, isMonitored: boolean, movie: {...} }`

### 3. Routes (`server/routes/monitoredMovies.js`)
Registered routes in `server/index.js`:
```javascript
app.use("/api/MonitoredMovies", require("./routes/monitoredMovies"));
```

## Frontend Implementation

### 1. Search Page Updates (`client/app/pages/search/page.tsx`)
**Changes:**
- Added Firebase authentication hooks (`useAuthState`)
- Updated `handleAddMovie` function to:
  1. Check if user is logged in
  2. Save movie to database via API
  3. Download the best matching torrent
  4. Update movie status to "downloading"
  5. Show success message

**Flow:**
```
User clicks "Add Movie"
  ↓
Check user authentication
  ↓
Filter torrents by quality profile
  ↓
Select best torrent (highest seeders)
  ↓
Save movie to database
  ↓
Download torrent
  ↓
Update movie status
  ↓
Show success message
```

### 2. Monitored Movies Page (`client/app/pages/monitored/page.tsx`)
**Features:**
- **Authentication Check**: Redirects to login if not authenticated
- **Movie Grid Display**: Responsive grid (1-4 columns based on screen size)
- **Movie Cards**: Each card shows:
  - Movie poster (or placeholder)
  - Title and release year
  - Overview (truncated)
  - Status badge with icon (monitoring, downloading, downloaded, error)
  - Quality and availability chips
  - Downloaded torrent info (if applicable)
  - Remove button

**Status Indicators:**
- 🟦 **Monitoring**: Movie is being watched for availability
- 🟨 **Downloading**: Torrent is currently downloading
- 🟩 **Downloaded**: Movie has been successfully downloaded
- 🟥 **Error**: An error occurred

**Actions:**
- **Remove Movie**: Removes movie from monitoring list (with confirmation)
- **Add Movie Button**: Quick link to search page

**Empty State:**
- Shows helpful message when no movies are monitored
- Provides "Search Movies" button to get started

## Database Schema

The `monitored_movies` table is automatically created by Sequelize when the server starts (via `sequelize.sync()` in `connectDB()`).

**Table Structure:**
```sql
CREATE TABLE monitored_movies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId TEXT NOT NULL,
  tmdbId INTEGER NOT NULL,
  title TEXT NOT NULL,
  posterUrl TEXT,
  releaseDate TEXT,
  overview TEXT,
  qualityProfile TEXT NOT NULL DEFAULT 'any',
  minAvailability TEXT NOT NULL DEFAULT 'released',
  monitor TEXT NOT NULL DEFAULT 'movieOnly',
  status TEXT NOT NULL DEFAULT 'monitoring',
  downloadedTorrentId TEXT,
  downloadedTorrentTitle TEXT,
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL,
  UNIQUE(tmdbId, userId)
);

CREATE INDEX idx_monitored_movies_userId ON monitored_movies(userId);
```

## User Flow

### Adding a Movie
1. User searches for a movie on the search page
2. Clicks on a movie card to view details
3. Configures settings (Quality Profile, Availability, Monitor)
4. Clicks "Add Movie" button
5. System:
   - Saves movie to database
   - Finds best matching torrent
   - Downloads torrent automatically
   - Updates movie status
6. Movie appears in "Monitored" page

### Viewing Monitored Movies
1. User navigates to "Monitored" page
2. Sees grid of all their monitored movies
3. Each card shows current status and details
4. Can remove movies from monitoring

## Security

- **User Isolation**: All queries filter by `userId` to ensure users only see their own movies
- **Authentication Required**: Frontend checks authentication before allowing operations
- **Duplicate Prevention**: Database unique constraint prevents same movie being monitored twice by same user
- **Delete Verification**: Requires confirmation before removing movies

## Future Enhancements (Optional)

- **Status Updates**: Automatically update status when downloads complete
- **Search/Filter**: Filter monitored movies by status, quality, etc.
- **Bulk Actions**: Select multiple movies for bulk operations
- **Statistics**: Show monitoring stats (total, downloading, downloaded)
- **Notifications**: Alert when monitored movies become available
- **Auto-Upgrade**: Automatically upgrade quality when better version available
- **Watch History**: Track when movies were added/downloaded
- **Export/Import**: Export monitoring list for backup

## Testing

To test the implementation:

1. **Start the server**: `cd server && npm start`
2. **Login**: Ensure you're logged in via Firebase
3. **Search**: Go to search page and find a movie
4. **Add Movie**: Click on movie, configure settings, click "Add Movie"
5. **View Monitored**: Navigate to "Monitored" page to see your movies
6. **Remove**: Test removing a movie from monitoring

## Notes

- The database table is created automatically on server start
- Movies are tied to Firebase user UID
- Duplicate monitoring is prevented at database level
- Status updates happen automatically when torrents are downloaded
- All API endpoints require `userId` for security

