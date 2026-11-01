# BorrowArr

A self-hosted media management and automation platform that helps you discover, monitor, and download movies and TV shows. BorrowArr integrates with torrent indexers, download clients, and media services like Plex and TMDb to provide a unified media management experience.

## Features

- **Media Discovery**: Browse and search for movies and TV shows using TMDb integration
- **Curated Lists**: Access featured lists from sources like Letterboxd and TMDb
- **Torrent Indexer Integration**: Search across multiple torrent indexers using Torznab/Newznab APIs or custom scrapers (Cardigann-style YAML definitions)
- **Download Client Support**: Send downloads to your preferred torrent client (qBittorrent, Transmission, etc.)
- **Automated Monitoring**: Monitor movies and TV series for new releases and automatic downloading
- **Plex Integration**: Connect to Plex to view your library and get recommendations
- **Media Requests**: Allow users to request content with approval workflows
- **User Management**: Multi-user support with role-based permissions
- **Parental Guides**: IMDb parental guide information for content
- **File Management**: Automatic file renaming and organization
- **Mobile Support**: Capacitor-based iOS/Android app support (in development)

## Tech Stack

### Client (Frontend)
- **Framework**: Next.js 15 with React 18
- **Styling**: Tailwind CSS, SCSS, HeroUI components
- **Authentication**: Firebase Auth
- **Language**: TypeScript
- **Mobile**: Capacitor for iOS/Android builds

### Server (Backend)
- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **Database**: SQLite with Sequelize ORM
- **Authentication**: JWT (JSON Web Tokens)
- **Web Scraping**: Cheerio, Puppeteer

## Project Structure

```
borrowarr/
├── client/                    # Next.js frontend application
│   ├── app/                   # App router pages and layouts
│   │   └── pages/             # Feature pages (discover, settings, etc.)
│   ├── components/            # React components
│   ├── context/               # Auth context providers
│   ├── hooks/                 # Custom React hooks
│   ├── styles/                # SCSS stylesheets
│   └── config/                # Site configuration
├── server/                    # Express.js backend API
│   ├── routes/                # API route handlers
│   ├── models/                # Sequelize database models
│   ├── services/              # Business logic services
│   │   ├── downloadClients/   # Download client integrations
│   │   ├── listProviders/     # TMDb list providers
│   │   └── letter-box-scrapper/ # Letterboxd scraper
│   ├── scrapers/              # Cardigann-style torrent scrapers
│   │   ├── definitions/       # YAML indexer definitions
│   │   └── engine/            # Scraper engine
│   ├── middleware/            # Express middleware (auth, etc.)
│   └── config/                # Database configuration
├── services/                  # Additional microservices
│   └── letter-box-scrapper/   # Letterboxd integration service
└── tunnels/                   # Cloudflare tunnel configuration
```

## Prerequisites

- **Node.js** 20+ (LTS recommended)
- **npm** or **pnpm** package manager
- **SQLite** (bundled, no separate installation required)
- **Firebase Project** (for authentication)
- **TMDb API Key** (for media metadata)

### Optional
- **Prowlarr** (for additional indexer support via proxy)
- **FlareSolverr** (for Cloudflare-protected sites)
- **Plex Media Server** (for library integration)
- **Docker** (for containerized deployment)

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/thefourthlion/borrowarr.git
cd borrowarr
```

### 2. Install Server Dependencies

```bash
cd server
npm install
# or with pnpm
pnpm install && pnpm rebuild sqlite3
```

### 3. Install Client Dependencies

```bash
cd ../client
npm install --legacy-peer-deps
# or with pnpm
pnpm install
```

### 4. Configure Environment Variables

Create `.env` files for both client and server (see [Configuration](#configuration) section below).

### 5. Start Development Servers

**Server** (from `/server` directory):
```bash
npm run dev
# Server runs on http://localhost:3013
```

**Client** (from `/client` directory):
```bash
npm run dev
# Client runs on http://localhost:3012
```

## Configuration

### Server Environment Variables

Create a `.env` file in the `/server` directory:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `3013` | Server port |
| `JWT_SECRET` | **Yes** | - | Secret key for signing JWT access tokens |
| `JWT_REFRESH_SECRET` | **Yes** | - | Secret key for signing JWT refresh tokens |
| `JWT_ACCESS_EXPIRY` | No | `15m` | Access token expiry duration |
| `JWT_REFRESH_EXPIRY` | No | `7d` | Refresh token expiry duration |
| `TMDB_API` | No | (built-in) | TMDb API key for movie/TV metadata |
| `TMDB_API_READ` | No | (built-in) | TMDb Read Access Token |
| `PROWLARR_URL` | No | - | Prowlarr instance URL for indexer proxy |
| `PROWLARR_API_KEY` | No | - | Prowlarr API key |
| `FLARESOLVERR_URL` | No | `http://localhost:8191` | FlareSolverr URL for Cloudflare bypass |
| `FLARESOLVERR_ENABLED` | No | `false` | Enable FlareSolverr integration |
| `API_BASE_URL` | No | `http://localhost:3013` | Base URL for internal API calls |
| `DEBUG_SCRAPER` | No | `false` | Enable verbose scraper logging |
| `LETTERBOXD_HEADLESS` | No | `false` | Run Letterboxd scraper in headless mode |

### Client Environment Variables

Create a `.env` file in the `/client` directory:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | **Yes** | `http://localhost:3013` | Backend API URL |
| `NEXT_PUBLIC_STRIPE_LINK_PREMIUM` | No | - | Stripe payment link for premium tier |
| `NEXT_PUBLIC_STRIPE_LINK_ULTIMATE` | No | - | Stripe payment link for ultimate tier |

### Firebase Configuration

The client uses Firebase for authentication. Firebase configuration is currently set in `/client/firebase.ts`. For production, you should:

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable Authentication with your preferred providers (Email/Password, Google, etc.)
3. Update the Firebase config in `firebase.ts` with your project credentials

## Running with Docker

### Client

```bash
cd client
docker-compose up -d
# Runs on http://localhost:3012
```

### Server

```bash
cd server
docker-compose up -d
# Runs on http://localhost:3013
```

### Build Images Manually

**Client:**
```bash
cd client
docker build -t borrowarr-client .
docker run -p 3012:3012 borrowarr-client
```

**Server:**
```bash
cd server
docker build -t borrowarr-server .
docker run -p 3013:3013 borrowarr-server
```

## API Endpoints

The server exposes the following main API routes:

| Route | Description |
|-------|-------------|
| `/api/auth` | Authentication (login, register, refresh tokens) |
| `/api/Users` | User management |
| `/api/Search` | Search across configured indexers |
| `/api/Indexers` | Manage torrent indexers |
| `/api/DownloadClients` | Manage download clients |
| `/api/TMDB` | TMDb movie/TV data proxy |
| `/api/MonitoredMovies` | Movie monitoring and automation |
| `/api/MonitoredSeries` | TV series monitoring and automation |
| `/api/Settings` | Application settings |
| `/api/Favorites` | User favorites |
| `/api/History` | Download history |
| `/api/PlexConnection` | Plex server integration |
| `/api/FeaturedLists` | Curated lists from Letterboxd |
| `/api/CuratedLists` | TMDb curated lists |
| `/api/MediaRequests` | User content requests |
| `/api/HiddenMedia` | Hidden/blocked content |
| `/api/ParentalGuide` | Parental guide information |
| `/api/Cardigann` | Custom scraper management |

## Adding Custom Indexers

BorrowArr supports custom torrent indexer definitions using YAML files (Cardigann-style). See `/server/scrapers/README.md` for detailed documentation on creating custom indexer definitions.

Example YAML definition location: `/server/scrapers/definitions/`

## Scripts

### Server Scripts

| Script | Description |
|--------|-------------|
| `npm start` / `npm run dev` | Start the server with nodemon |
| `npm run migrate:user-id` | Run user ID migration |

### Client Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with Turbopack |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run cap:sync:ios` | Sync Capacitor iOS project |
| `npm run cap:run:ios` | Build and run on iOS |

## Deployment

### Production Considerations

1. **Environment Variables**: Ensure all required environment variables are set, especially:
   - `JWT_SECRET` and `JWT_REFRESH_SECRET` (use strong, unique values)
   - `NEXT_PUBLIC_API_URL` (point to your production API)

2. **Database**: SQLite is suitable for small deployments. For larger installations, consider migrating to PostgreSQL or MySQL.

3. **Reverse Proxy**: Use nginx or Caddy as a reverse proxy with SSL termination.

4. **Docker**: Use the provided Docker configurations for consistent deployments.

### Cloudflare Tunnel (Optional)

A Cloudflare Tunnel configuration is provided in `/tunnels/docker-compose.yaml` for secure external access without opening ports. You'll need to:

1. Create a tunnel in Cloudflare Zero Trust dashboard
2. Replace the tunnel token in the configuration
3. Configure your DNS settings in Cloudflare

## Contributing

Contributions are welcome! Please follow these guidelines:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Development Guidelines

- Follow existing code style and conventions
- Write meaningful commit messages
- Update documentation for significant changes
- Test your changes locally before submitting

## Related Documentation

- `/server/README.md` - Server setup and API details
- `/server/scrapers/README.md` - Custom scraper development
- `/server/services/INDEXER_SEARCH_README.md` - Indexer search service documentation
- `/server/services/letter-box-scrapper/README.md` - Letterboxd integration
- `/client/VALIDATION_REQUIREMENTS.md` - Content download validation requirements

## License

License: TBD

<!-- TODO: Add appropriate open-source license (MIT, GPL, etc.) -->

## Acknowledgments

- [TMDb](https://www.themoviedb.org/) for movie and TV metadata
- [Letterboxd](https://letterboxd.com/) for curated film lists
- [Prowlarr](https://github.com/Prowlarr/Prowlarr) for Cardigann indexer definition format inspiration
- [HeroUI](https://heroui.com/) for UI components

---

**Note**: This project is intended for personal use and educational purposes. Please respect copyright laws and the terms of service of any integrated services.
