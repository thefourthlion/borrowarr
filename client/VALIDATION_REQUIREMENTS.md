# Validation Requirements for Content Downloading

## Overview
Users must meet three requirements before they can download or request content:

### 1. User Authentication
- Users must be signed in to the application
- If not signed in, they will see: "Sign In Required - Please sign in to download content. Click on 'Login' in the navigation menu to get started."

### 2. Indexers Configuration
- Users must have at least one active indexer configured
- Indexers are sources for torrent/NZB files
- If no indexers are configured, users will see: "Indexers Required - You need to configure at least one indexer before downloading content. Go to Settings → Indexers to add an indexer."

### 3. Download Client Configuration
- Users must have at least one active download client configured
- Download clients handle the actual downloading of torrents/NZBs
- If no download clients are configured, users will see: "Download Client Required - You need to configure a download client before downloading content. Go to Settings → Download Clients to add a client."

## Implementation Details

### Modified Components
1. **AddMovieModal.tsx**
   - Added `checkRequirements()` function to verify indexers and download clients
   - Added `validateBeforeAction()` function to check all requirements before any download
   - Integrated validation into:
     - `handleDownloadTorrent()` - Manual torrent downloads
     - `handleAddMovie()` - Automated movie monitoring and download

2. **AddSeriesModal.tsx**
   - Added `checkRequirements()` function to verify indexers and download clients
   - Added `validateBeforeAction()` function to check all requirements before any download
   - Integrated validation into:
     - `handleDownloadTorrent()` - Manual torrent downloads for episodes/seasons
     - `downloadEpisode()` - Individual episode downloads
     - `handleAddSeries()` - Bulk series monitoring and download

### User Experience Flow
1. User clicks download/add button
2. System validates:
   - Is user signed in?
   - Does user have active indexers?
   - Does user have active download clients?
3. If any requirement fails, show helpful notification with next steps
4. If all requirements pass, proceed with download

### Benefits
- **Security**: Ensures only authenticated users can download
- **Configuration Safety**: Prevents users from attempting downloads without proper setup
- **User Guidance**: Clear messages guide users to complete necessary setup steps
- **Better UX**: Prevents confusing errors from missing configuration

## Testing
To test the validation:
1. Try downloading content while signed out → should show sign-in message
2. Sign in without indexers → should show indexers required message
3. Add indexers but no download client → should show download client required message
4. Add all requirements → should allow downloads successfully
