const axios = require('axios');
const HiddenMedia = require('../models/HiddenMedia');
const tmdbService = require('./tmdbService');

const MAX_ITEMS_PER_LIBRARY = 700;
const MAX_ANCHORS = 8;
const MAX_RESULTS_PER_ROW = 20;

const normalizePlexDirectories = (directory) => {
  if (!directory) return [];
  return Array.isArray(directory) ? directory : [directory];
};

const normalizeTitle = (title) => (title || '').toLowerCase().replace(/[^a-z0-9]/g, '');

const normalizeOwnedKey = (title, year, type) => `${type}:${normalizeTitle(title)}:${year || ''}`;

const buildPlexUrl = (serverUrl) => {
  let cleanUrl = serverUrl.trim().replace(/\/$/, '');
  if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
    cleanUrl = `http://${cleanUrl}`;
  }
  return cleanUrl;
};

const extractGuids = (item) => {
  const rawGuids = [
    ...(Array.isArray(item.Guid) ? item.Guid : []),
    ...(Array.isArray(item.guid) ? item.guid : []),
  ];

  return rawGuids
    .map((guid) => guid.id || guid)
    .filter(Boolean);
};

const extractTmdbId = (item) => {
  const directGuid = item.guid || '';
  const guids = [directGuid, ...extractGuids(item)];
  const tmdbGuid = guids.find((guid) => /^tmdb:\/\//i.test(guid));
  if (!tmdbGuid) return null;

  const id = parseInt(tmdbGuid.replace(/^tmdb:\/\//i, ''), 10);
  return Number.isNaN(id) ? null : id;
};

const extractExternalId = (item) => {
  const directGuid = item.guid || '';
  const guids = [directGuid, ...extractGuids(item)];
  const imdbGuid = guids.find((guid) => /^imdb:\/\//i.test(guid));
  if (imdbGuid) {
    return {
      id: imdbGuid.replace(/^imdb:\/\//i, ''),
      source: 'imdb_id',
    };
  }

  const tvdbGuid = guids.find((guid) => /^tvdb:\/\//i.test(guid));
  if (tvdbGuid) {
    return {
      id: tvdbGuid.replace(/^tvdb:\/\//i, ''),
      source: 'tvdb_id',
    };
  }

  return null;
};

const scorePlexItem = (item) => {
  const nowSeconds = Date.now() / 1000;
  const addedAgeDays = item.addedAt ? Math.max(0, (nowSeconds - Number(item.addedAt)) / 86400) : 365;
  const watchedAgeDays = item.lastViewedAt ? Math.max(0, (nowSeconds - Number(item.lastViewedAt)) / 86400) : 365;

  return (
    (item.viewCount || 0) * 12 +
    Math.max(0, 35 - watchedAgeDays) +
    Math.max(0, 20 - addedAgeDays / 3) +
    (item.rating || 0)
  );
};

const seededShuffle = (items, salt = '') => {
  const seed = `${new Date().toISOString().slice(0, 10)}:${salt}`;
  const hash = (value) => {
    let output = 0;
    const text = `${seed}:${value}`;
    for (let index = 0; index < text.length; index += 1) {
      output = (output << 5) - output + text.charCodeAt(index);
      output |= 0;
    }
    return Math.abs(output);
  };

  return [...items].sort((a, b) => hash(a.id || a.ratingKey || a.title) - hash(b.id || b.ratingKey || b.title));
};

const pickAnchors = (items, salt) => {
  const scoredItems = items
    .map((item) => ({
      item,
      score: scorePlexItem(item),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 40)
    .map(({ item }) => item);

  return seededShuffle(scoredItems, salt).slice(0, MAX_ANCHORS);
};

const incrementWeight = (map, values = [], weight = 1) => {
  values.filter(Boolean).forEach((value) => {
    map.set(value, (map.get(value) || 0) + weight);
  });
};

const buildTasteProfile = (items) => {
  const genres = new Map();
  const studios = new Map();
  const actors = new Map();
  const directors = new Map();

  items.forEach((item) => {
    const weight = 1 + Math.min(5, item.viewCount || 0) + (item.lastViewedAt ? 2 : 0);
    incrementWeight(genres, item.genres || [], weight);
    incrementWeight(studios, [item.studio], weight * 0.8);
    incrementWeight(actors, (item.actors || []).slice(0, 5), weight * 0.5);
    incrementWeight(directors, item.directors || [], weight * 0.8);
  });

  const top = (map, limit) =>
    Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([name, score]) => ({ name, score }));

  return {
    genres: top(genres, 6),
    studios: top(studios, 5),
    actors: top(actors, 8),
    directors: top(directors, 6),
  };
};

const mapGenreNamesToIds = (profileGenres, tmdbGenres) => {
  const genreMap = new Map(tmdbGenres.map((genre) => [genre.name.toLowerCase(), genre.id]));

  return profileGenres
    .map(({ name }) => genreMap.get(name.toLowerCase()))
    .filter(Boolean);
};

const enrichItems = (items, mediaType, tmdbGenres, reason = null) =>
  items.map((item) => {
    const posterPath = item.poster_path || null;
    const backdropPath = item.backdrop_path || null;

    return {
      ...item,
      media_type: mediaType,
      posterUrl: tmdbService.getPosterUrl(posterPath, 'w500'),
      backdropUrl: tmdbService.getBackdropUrl(backdropPath, 'w1280'),
      genres: (item.genre_ids || [])
        .map((id) => tmdbGenres.find((genre) => genre.id === id)?.name)
        .filter(Boolean)
        .slice(0, 3),
      language: item.original_language ? item.original_language.toUpperCase() : null,
      recommendationReason: reason,
    };
  });

const resolveTmdbId = async (plexItem, mediaType) => {
  const tmdbId = extractTmdbId(plexItem);
  if (tmdbId) return tmdbId;

  const externalId = extractExternalId(plexItem);
  if (externalId) {
    const result = await tmdbService.findByExternalId(externalId.id, externalId.source);
    const matches = mediaType === 'tv' ? result.tvResults : result.movieResults;
    if (result.success && matches?.[0]?.id) return matches[0].id;
  }

  const title = plexItem.title || plexItem.originalTitle;
  if (!title) return null;

  const searchResult =
    mediaType === 'tv'
      ? await tmdbService.searchTVShows(title, 1, plexItem.year || null)
      : await tmdbService.searchMovies(title, 1, plexItem.year || null);

  return searchResult.success && searchResult.results?.[0]?.id ? searchResult.results[0].id : null;
};

const fetchPlexItems = async (connection) => {
  const cleanUrl = buildPlexUrl(connection.serverUrl);
  const headers = {
    'X-Plex-Token': connection.authToken,
    Accept: 'application/json',
  };

  const librariesResponse = await axios.get(`${cleanUrl}/library/sections`, {
    headers,
    timeout: 10000,
  });

  const libraries = normalizePlexDirectories(librariesResponse.data?.MediaContainer?.Directory)
    .filter((library) => library.type === 'movie' || library.type === 'show');

  const allItems = [];

  for (const library of libraries) {
    try {
      const response = await axios.get(`${cleanUrl}/library/sections/${library.key}/all`, {
        headers,
        params: {
          'X-Plex-Container-Start': 0,
          'X-Plex-Container-Size': MAX_ITEMS_PER_LIBRARY,
          includeGuids: 1,
        },
        timeout: 15000,
      });

      const metadata = response.data?.MediaContainer?.Metadata || [];
      allItems.push(
        ...metadata.map((item) => ({
          ratingKey: item.ratingKey,
          title: item.title,
          originalTitle: item.originalTitle,
          year: item.year,
          type: item.type,
          rating: item.rating,
          addedAt: item.addedAt,
          lastViewedAt: item.lastViewedAt,
          viewCount: item.viewCount || 0,
          genres: (item.Genre || []).map((genre) => genre.tag),
          directors: (item.Director || []).map((director) => director.tag),
          actors: (item.Role || []).slice(0, 10).map((role) => role.tag),
          studio: item.studio,
          guid: item.guid,
          Guid: item.Guid || [],
          libraryType: library.type,
        })),
      );
    } catch (error) {
      console.error(`Error fetching Plex recommendation items from ${library.title}:`, error.message);
    }
  }

  return {
    movies: allItems.filter((item) => item.type === 'movie' || item.libraryType === 'movie'),
    shows: allItems.filter((item) => item.type === 'show' || item.libraryType === 'show'),
  };
};

const fetchAnchorCandidates = async (anchors, mediaType, tmdbGenres) => {
  for (const anchor of anchors) {
    const tmdbId = await resolveTmdbId(anchor, mediaType);
    if (!tmdbId) continue;

    const [recommendations, similar] = await Promise.all([
      tmdbService.getRecommendations(mediaType, tmdbId, 1),
      tmdbService.getSimilar(mediaType, tmdbId, 1),
    ]);

    const candidates = [
      ...(recommendations.success ? recommendations.results : []),
      ...(similar.success ? similar.results : []),
    ];

    if (candidates.length > 0) {
      return {
        anchor,
        tmdbId,
        items: enrichItems(candidates, mediaType, tmdbGenres, `Because you have ${anchor.title}`),
      };
    }
  }

  return {
    anchor: null,
    tmdbId: null,
    items: [],
  };
};

const fetchTasteCandidates = async (mediaType, genreIds, tmdbGenres) => {
  const candidateGroups = await Promise.all(
    genreIds.slice(0, 4).map((genreId, index) => {
      const filters = {
        page: (index % 3) + 1,
        genres: [genreId],
        sortBy: index % 2 === 0 ? 'popularity.desc' : 'vote_average.desc',
        voteCountMin: mediaType === 'tv' ? 200 : 300,
      };

      return mediaType === 'tv'
        ? tmdbService.discoverTVShows(filters)
        : tmdbService.discoverMovies(filters);
    }),
  );

  return enrichItems(
    candidateGroups.flatMap((group) => (group.success ? group.results : [])),
    mediaType,
    tmdbGenres,
    'Matches your Plex library',
  );
};

const scoreCandidate = (candidate, profile, anchorBoost = 0) => {
  const candidateGenres = candidate.genres || [];
  const genreScore = candidateGenres.reduce((score, genreName) => {
    const match = profile.genres.find((genre) => genre.name.toLowerCase() === genreName.toLowerCase());
    return score + (match ? match.score : 0);
  }, 0);

  const qualityScore = (candidate.vote_average || 0) * 3 + Math.log10((candidate.popularity || 1) + 1) * 5;
  const freshnessScore = candidate.release_date || candidate.first_air_date
    ? Math.max(0, new Date(candidate.release_date || candidate.first_air_date).getFullYear() - 2000) / 3
    : 0;

  return genreScore * 4 + qualityScore + freshnessScore + anchorBoost;
};

const filterAndRank = (items, mediaType, ownedKeys, hiddenIds, profile, limit, salt, anchorBoost = 0) => {
  const seen = new Map();
  const typeKey = mediaType === 'tv' ? 'show' : 'movie';

  items.forEach((item) => {
    const title = item.title || item.name;
    const date = item.release_date || item.first_air_date;
    const year = date ? new Date(date).getFullYear() : null;
    const key = `${mediaType}:${item.id}`;

    if (!item.id || !title || hiddenIds.has(item.id)) return;
    if (ownedKeys.has(normalizeOwnedKey(title, year, typeKey))) return;
    if (!seen.has(key)) {
      seen.set(key, {
        ...item,
        score: scoreCandidate(item, profile, anchorBoost),
      });
    }
  });

  return seededShuffle(
    Array.from(seen.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.max(limit * 3, limit)),
    salt,
  )
    .slice(0, limit)
    .map(({ score, ...item }) => item);
};

const getHiddenIds = async (userId, mediaType) => {
  const hiddenItems = await HiddenMedia.findAll({
    where: {
      userId,
      mediaType: mediaType === 'tv' ? 'series' : 'movie',
    },
    attributes: ['tmdbId'],
  });

  return new Set(hiddenItems.map((item) => item.tmdbId));
};

const buildRecommendationRows = async ({ userId, connection }) => {
  const [{ movies, shows }, movieGenresResult, tvGenresResult] = await Promise.all([
    fetchPlexItems(connection),
    tmdbService.getMovieGenres(),
    tmdbService.getTVGenres(),
  ]);

  const movieGenres = movieGenresResult.success ? movieGenresResult.genres : [];
  const tvGenres = tvGenresResult.success ? tvGenresResult.genres : [];

  const movieProfile = buildTasteProfile(movies);
  const showProfile = buildTasteProfile(shows);
  const hasWatchedShows = shows.some((show) => show.lastViewedAt || show.viewCount > 0);
  const movieGenreIds = mapGenreNamesToIds(movieProfile.genres, movieGenres);
  const showGenreIds = mapGenreNamesToIds(showProfile.genres, tvGenres);
  const ownedKeys = new Set([
    ...movies.map((item) => normalizeOwnedKey(item.title, item.year, 'movie')),
    ...shows.map((item) => normalizeOwnedKey(item.title, item.year, 'show')),
  ]);

  const [hiddenMovieIds, hiddenShowIds] = await Promise.all([
    getHiddenIds(userId, 'movie'),
    getHiddenIds(userId, 'tv'),
  ]);

  const movieAnchors = pickAnchors(movies, 'movie-anchors');
  const showAnchors = pickAnchors(shows, 'show-anchors');
  const [movieAnchorResults, showAnchorResults, movieTasteCandidates, showTasteCandidates] = await Promise.all([
    fetchAnchorCandidates(movieAnchors, 'movie', movieGenres),
    fetchAnchorCandidates(showAnchors, 'tv', tvGenres),
    fetchTasteCandidates('movie', movieGenreIds, movieGenres),
    fetchTasteCandidates('tv', showGenreIds, tvGenres),
  ]);

  const rows = [];

  const anchorMovies = filterAndRank(
    movieAnchorResults.items,
    'movie',
    ownedKeys,
    hiddenMovieIds,
    movieProfile,
    MAX_RESULTS_PER_ROW,
    'movie-anchor-results',
    35,
  );

  if (anchorMovies.length > 0 && movieAnchorResults.anchor) {
    rows.push({
      key: 'because-downloaded-movie',
      mediaType: 'movie',
      title: `Because You Downloaded ${movieAnchorResults.anchor.title}`,
      anchor: {
        title: movieAnchorResults.anchor.title,
        year: movieAnchorResults.anchor.year,
      },
      items: anchorMovies,
    });
  }

  const curatedMovies = filterAndRank(
    [...movieTasteCandidates, ...movieAnchorResults.items],
    'movie',
    ownedKeys,
    hiddenMovieIds,
    movieProfile,
    MAX_RESULTS_PER_ROW,
    'curated-movies',
  );

  if (curatedMovies.length > 0) {
    rows.push({
      key: 'recommended-movies',
      mediaType: 'movie',
      title: 'Movies Picked From Your Plex',
      profile: movieProfile,
      items: curatedMovies,
    });
  }

  const anchorShows = filterAndRank(
    showAnchorResults.items,
    'tv',
    ownedKeys,
    hiddenShowIds,
    showProfile,
    MAX_RESULTS_PER_ROW,
    'show-anchor-results',
    35,
  );

  if (anchorShows.length > 0 && showAnchorResults.anchor) {
    rows.push({
      key: 'because-watched-show',
      mediaType: 'tv',
      title: hasWatchedShows
        ? `Because You Watched ${showAnchorResults.anchor.title}`
        : `Because You Downloaded ${showAnchorResults.anchor.title}`,
      anchor: {
        title: showAnchorResults.anchor.title,
        year: showAnchorResults.anchor.year,
      },
      items: anchorShows,
    });
  }

  const curatedShows = filterAndRank(
    [...showTasteCandidates, ...showAnchorResults.items],
    'tv',
    ownedKeys,
    hiddenShowIds,
    showProfile,
    MAX_RESULTS_PER_ROW,
    'curated-shows',
  );

  if (curatedShows.length > 0) {
    rows.push({
      key: 'recommended-shows',
      mediaType: 'tv',
      title: hasWatchedShows
        ? 'Series Picked From Your Watch History'
        : 'Series Picked From Your Plex',
      profile: showProfile,
      items: curatedShows,
    });
  }

  return {
    connected: true,
    rows,
    stats: {
      movieCount: movies.length,
      showCount: shows.length,
      movieGenres: movieProfile.genres,
      showGenres: showProfile.genres,
    },
  };
};

module.exports = {
  buildRecommendationRows,
};
