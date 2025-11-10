Awesome project. If you want “one app to rule them all,” build it in layers that map to the hardest dependencies first (indexers/search) and surface user value as early as possible (manual search → grab → import). Here’s a pragmatic order with concrete exit criteria so you always have a shippable build.

# Phase 0 — Foundation (1–2 days)

**Goal:** Shared primitives so Sonarr/Radarr/Overseerr/Prowlarr features plug into the same core.

* **Domain model:** `MediaItem` (id, type: movie|series, titles/akas, year, images, popularity), plus `Season`, `Episode`, `Person`.
* **Providers:** TMDb primary; TVDb optional for episode numbers/anime edge cases.
* **Pipelines:** Job runner (queue + retries + backoff), event bus (`MediaAdded`, `ReleaseGrabbed`, `DownloadCompleted`, `HealthWarning`).
* **Taxonomies:** Unified **quality** + **custom-format** schema (works for both movies & episodes).
* **Storage:** Library DB + download/import state DB.
  **Exit criteria:** You can fetch metadata for a movie/series id and enqueue a fake “search” job.

# Phase 1 — Prowlarr-core (Indexer Hub & Proxy)

**Goal:** Centralize search so *everything* else rides on it.

* Torznab/Newznab **proxy endpoints**; manual multi-indexer search UI.
* Indexer registry (native + YAML/Cardigann) with rate limits, categories, auth, & per-indexer proxy/FlareSolverr slots.
* Health checks & red/yellow/green status with history.
  **Exit criteria:** A manual query returns normalized results from ≥2 trackers/indexers reliably.

# Phase 2 — “Grab → Download → Import” (Sonarr/Radarr backbone)

**Goal:** End-to-end success path for at least one client each.

* Download clients: **qBittorrent** and **SABnzbd** first (cover torrent + Usenet).
* Release dispatch (category/label assignment, path hints).
* Completed-download **importer** (atomic move/copy, media hash, duplicate detection).
* **Renamer** (templating + safe filename sanitizer); single **root folder** support.
  **Exit criteria:** From the search results page, click “Grab” → client downloads → file is imported & renamed into your library.

# Phase 3 — Library Manager (Movies & Series)

**Goal:** Start replacing Sonarr/Radarr day-to-day basics.

* Add/monitor **Movies** and **Series** (show/season/episode trees).
* Scheduler: refresh metadata, rescan disk, update indexer caps, clear stuck jobs.
* **Profiles (v1):** Allowed qualities + cutoff, per-profile size limits.
* **Failed download handling** & blacklisting.
  **Exit criteria:** Monitoring a title leads to an automatic grab that respects profile filters, and failed releases are auto-replaced.

# Phase 4 — Upgrades & Custom Formats (Power features)

**Goal:** The “why people love *Arrs*” layer.

* **Auto-upgrade** engine (quality cutoff enforcement, replace inferior releases).
* **Custom format scoring** (preferred/required/blocked terms, HDR/DV flags, codecs, release groups, regex support).
* **Routing/tags** (e.g., 4K → Usenet only; anime → specific trackers).
* Multi-edition strategy (either one-best-file per item or “editions” table).
  **Exit criteria:** Given multiple candidates, the system consistently picks the highest-scoring allowed release and replaces older ones.

# Phase 5 — Overseerr-core (Requests & Approvals)

**Goal:** User-facing request flow with minimal admin overhead.

* Auth + roles (admin, approver, user); OAuth via Plex/Jellyfin optional.
* **Discover** & **Request** UI (popular/trending, search by TMDb).
* **Approval policies** (auto-approve within quotas, per-user/per-quality limits).
* Request lifecycle: requested → approved → monitored → fulfilled → notified.
  **Exit criteria:** A normal user can request a title, policy approves it, the system monitors, downloads, imports, and notifies completion.

# Phase 6 — Media Server Integrations & Notifications

**Goal:** Feel “instant” inside Plex/Jellyfin/Emby.

* **Plex/Jellyfin/Emby**: library refresh triggers, rich notifications, optional Plex Watchlist → Auto-add.
* Notifiers: Discord/Telegram/Webhook + email; per-event filters & templating.
  **Exit criteria:** After import, Plex/Jellyfin shows the title without manual refresh; user gets a “ready to watch” ping.

# Phase 7 — Lists & Watchlists (Delight layer)

**Goal:** Zero-click library growth.

* IMDb/Trakt/mdblist/Plex Watchlist imports; schedule & diff logic.
* **Existing library import** (point at a path → identify → adopt).
  **Exit criteria:** Adding an IMDb list results in monitored items that flow through to downloads automatically.

# Phase 8 — Admin, Ops, and Nice-to-haves

* Multi-root folders, path remapping, remote mounts.
* Per-indexer **usage analytics** (hit rate, failures, bans) and grab success funnel.
* Backup/restore; migration tools from Sonarr/Radarr/Prowlarr/Overseerr exports.
* Theming/i18n, access tokens, base path for reverse proxies.

---

## Cut-scopes to stay fast

* **Anime/absolute numbering**: support later (TVDb mapping quirks).
* **Scene exceptions** & edge-case parsing: start simple.
* **4K + 1080p side-by-side**: begin with “one best file,” add editions later.
* **Niche clients**: start with qBittorrent + SAB; add rTorrent/Deluge/NZBGet next.

## Minimal tech blueprint

* **Services:** `IndexerService`, `SearchService`, `GrabService`, `DownloadClientService`, `ImportService`, `LibraryService`, `UpgradeService`, `RequestService`, `NotifierService`, `MediaServerService`, `HealthService`.
* **Tables/collections:** `media_items`, `seasons`, `episodes`, `indexers`, `indexer_caps`, `download_clients`, `profiles`, `custom_formats`, `routes/tags`, `requests`, `jobs`, `events`, `notifiers`, `connections`, `imports`, `releases`, `analytics_*`.
* **Background workers:** RSS/caps refresh, scheduled searches, import sweeps, upgrade sweeps, list sync, health checks, notifier dispatch.
* **APIs:** REST (or GraphQL) with webhooks for major events.

## Acceptance test checklist (per phase)

* Deterministic search results (same query → same normalized ordering).
* Grab/Cancel/Retries idempotent.
* Import handles single-file & nested folder torrents; verifies media streams.
* Quality/profile and custom-format rules produce expected winner in a synthetic test set.
* Request → Approve → Fulfill path works for both movie & episode.

## Risk map (what bites teams)

* **Release parsing** drift: encapsulate parser + extensive fixtures.
* **Indexer bans/rate limits:** strict throttling & exponential backoff; queue per-indexer.
* **Path edge cases:** network shares, permissions; do atomic moves, verify freespace.
* **Metadata mismatches:** store provider IDs (TMDb/TVDb/IMDB) and keep alias tables.

---

### TL;DR build order

1. Indexer hub & proxy → 2) Grab/Download/Import backbone → 3) Library mgr (movies+series) → 4) Upgrades & custom formats → 5) Requests/approvals → 6) Media-server + notifications → 7) Lists/watchlists → 8) Admin/ops polish.

If you want, I can turn this into a clickable project board (issues & milestones) or sketch the SQL schema for the core tables next.
