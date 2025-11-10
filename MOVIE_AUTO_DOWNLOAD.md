# Movie Auto-Download Feature

## Overview
Enhanced the TMDB movie search with automatic download capabilities. Users can now specify their preferences and have the system automatically grab the best matching torrent, or manually select specific torrents.

## Features Added

### 1. Movie Settings Section
When you click on a movie, you now see three dropdown selectors:

#### **Monitor**
- **Movie Only**: Standard monitoring option

#### **Minimum Availability**
- **Announced**: Movies available as soon as announced
- **In Cinemas**: Movies available when they hit cinemas
- **Released**: Movies available when officially released (default)

#### **Quality Profile**
- **Any**: No quality filtering (default)
- **HD - 720p/1080p**: Matches torrents with either 720p or 1080p
- **HD-720p**: Only 720p torrents
- **HD-1080p**: Only 1080p torrents
- **SD**: Standard definition (excludes HD/UHD)
- **Ultra-HD**: 4K/2160p/UHD torrents

### 2. Automatic Download ("Add Movie" Button)
Located in the modal footer, this button:

1. **Filters torrents** by your selected Quality Profile
2. **Selects the best torrent** (highest seeders)
3. **Automatically downloads it** to your configured download client
4. **Closes the modal** and shows a confirmation

**Example Flow:**
```
1. Search for "Shrek"
2. Click on "Shrek (2001)"
3. Set Quality Profile to "HD-1080p"
4. Click "Add Movie"
5. System finds the best 1080p torrent with most seeders
6. Automatically sends it to your download client
7. Modal closes with success message
```

### 3. Manual Selection (Existing)
Below the settings, you still have the full list of torrents where you can:
- Browse all available torrents
- See details (indexer, size, seeders)
- Manually click "Download" on any specific torrent

## Quality Filtering Logic

The system intelligently filters torrents based on your quality selection:

| Quality Profile | What It Matches |
|----------------|-----------------|
| **Any** | All torrents (no filtering) |
| **HD - 720p/1080p** | Title contains "720p" OR "1080p" |
| **HD-720p** | Title contains "720p" |
| **HD-1080p** | Title contains "1080p" |
| **SD** | Excludes 720p, 1080p, 2160p, 4k |
| **Ultra-HD** | Title contains "2160p", "4k", or "uhd" |

After filtering, it picks the torrent with the **most seeders** for best download speed.

## UI/UX Improvements

### Settings Card
- Clean, bordered design
- Three columns on desktop, stacks on mobile
- Info tooltip explaining automatic vs manual download

### Add Movie Button
- Primary color (blue) for visibility
- Plus icon for clarity
- Loading state while processing
- Disabled when no torrents available
- Located in modal footer (consistent with Radarr)

### Error Handling
- Shows alert if no torrents match quality profile
- Displays download errors with specific messages
- Auto-clears success/error states after timeout

## Technical Implementation

### Frontend (`client/app/pages/search/page.tsx`)

#### New State Variables
```typescript
const [monitor, setMonitor] = useState("movieOnly");
const [minAvailability, setMinAvailability] = useState("released");
const [qualityProfile, setQualityProfile] = useState("any");
const [addingMovie, setAddingMovie] = useState(false);
```

#### Quality Filter Function
```typescript
const filterTorrentsByQuality = (torrents: TorrentResult[], quality: string): TorrentResult[] => {
  // Filters torrents based on quality profile selection
  // Returns filtered array
}
```

#### Auto-Download Function
```typescript
const handleAddMovie = async () => {
  // 1. Filter torrents by quality
  // 2. Find best torrent (most seeders)
  // 3. Download it
  // 4. Close modal
}
```

### Backend
No backend changes required - uses existing:
- `/api/TMDB/movie/:id/torrents` - Get torrents for movie
- `/api/DownloadClients/grab` - Send torrent to download client

## Usage Example

### Automatic (Recommended)
1. Search "The Dark Knight"
2. Click on the movie
3. Set Quality: "HD-1080p"
4. Set Availability: "Released"
5. Click **"Add Movie"**
6. Done! Best 1080p torrent is downloading

### Manual (Fine Control)
1. Search "The Dark Knight"
2. Click on the movie
3. Scroll to "Available Torrents"
4. Browse the list
5. Click **"Download"** on your preferred torrent

## Benefits

✅ **Time Saving**: One click to get the best torrent
✅ **Quality Control**: Ensures you get the quality you want
✅ **Smart Selection**: Automatically picks highest seeders
✅ **Flexibility**: Still allows manual selection when needed
✅ **Radarr-like UX**: Familiar interface for existing users
✅ **Mobile Friendly**: Responsive design works on all devices

## Future Enhancements (Optional)

- Save quality profile preferences per user
- Custom quality profiles (e.g., "4K HDR", "BluRay 1080p")
- Minimum seeders requirement
- Preferred indexers ranking
- Auto-upgrade feature (replace SD with HD when available)
- Download history tracking
- Queue management

## Notes

- **Minimum Availability** setting is currently UI-only (placeholder for future library management)
- **Monitor** setting is currently UI-only (placeholder for future continuous monitoring)
- Quality filtering is case-insensitive
- System picks highest seeder count when multiple torrents match quality
- No torrents? Error message shows which quality profile had no matches

