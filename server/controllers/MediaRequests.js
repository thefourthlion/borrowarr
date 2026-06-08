const MediaRequest = require('../models/MediaRequest');
const User = require('../models/User');
const MonitoredMovies = require('../models/MonitoredMovies');
const MonitoredSeries = require('../models/MonitoredSeries');
const Indexers = require('../models/Indexers');
const { searchIndexers } = require('../services/indexerSearch');
const { grabReleaseInternal } = require('./DownloadClients');
const { Op } = require('sequelize');

const canManageRequests = (user) =>
  Boolean(user?.permissions?.admin || user?.permissions?.manage_requests);

const getYear = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return Number.isNaN(date.getTime()) ? '' : date.getFullYear();
};

const getQualityFromTitle = (title = '') => {
  const lower = title.toLowerCase();
  if (lower.includes('2160p') || lower.includes('4k') || lower.includes('uhd')) return '2160p';
  if (lower.includes('1080p')) return '1080p';
  if (lower.includes('720p')) return '720p';
  return 'SD';
};

const filterByQuality = (results, qualityProfile) => {
  if (!qualityProfile || qualityProfile === 'any') return results;

  return results.filter((result) => {
    const title = (result.title || '').toLowerCase();

    switch (qualityProfile) {
      case 'hd-720p-1080p':
        return title.includes('720p') || title.includes('1080p');
      case 'hd-720p':
        return title.includes('720p');
      case 'hd-1080p':
        return title.includes('1080p');
      case 'ultra-hd':
        return title.includes('2160p') || title.includes('4k') || title.includes('uhd');
      case 'sd':
        return !title.includes('720p') && !title.includes('1080p') && !title.includes('2160p') && !title.includes('4k');
      default:
        return results;
    }
  });
};

const pickBestRelease = (results) => {
  if (!results.length) return null;

  return results.reduce((best, current) => {
    const bestPriority = best.indexerPriority ?? 25;
    const currentPriority = current.indexerPriority ?? 25;

    if (currentPriority < bestPriority) return current;
    if (currentPriority > bestPriority) return best;

    return (current.seeders || 0) > (best.seeders || 0) ? current : best;
  });
};

const normalizeReleaseTitle = (title = '') =>
  title
    .toLowerCase()
    .replace(/[\s._-]+/g, ' ')
    .trim();

const pickRequestedRelease = (results, requestedRelease) => {
  if (!requestedRelease?.releaseName) return null;

  const requestedTitle = normalizeReleaseTitle(requestedRelease.releaseName);
  return results.find((result) => normalizeReleaseTitle(result.title) === requestedTitle) || null;
};

const getSeriesEpisodeTarget = (request) => {
  const episodes = Array.isArray(request.selectedEpisodes) ? request.selectedEpisodes : [];
  const firstEpisode = episodes[0];

  if (typeof firstEpisode === 'string') {
    const match = firstEpisode.match(/(\d+)[^\d]+(\d+)/);
    if (match) {
      return {
        seasonNumber: parseInt(match[1], 10),
        episodeNumber: parseInt(match[2], 10),
      };
    }
  }

  if (firstEpisode && typeof firstEpisode === 'object') {
    const seasonNumber = firstEpisode.seasonNumber ?? firstEpisode.season ?? firstEpisode.season_number;
    const episodeNumber = firstEpisode.episodeNumber ?? firstEpisode.episode ?? firstEpisode.episode_number;
    if (seasonNumber && episodeNumber) {
      return {
        seasonNumber: parseInt(seasonNumber, 10),
        episodeNumber: parseInt(episodeNumber, 10),
      };
    }
  }

  return null;
};

const buildApprovalSearch = (request) => {
  const year = getYear(request.releaseDate);
  const requestedRelease = parseRequestedRelease(request.requestNote);

  if (request.mediaType === 'movie') {
    return {
      query: requestedRelease?.releaseName || (year ? `${request.title} ${year}` : request.title),
      categoryIds: [2000],
      downloadMediaType: 'movies',
      preferredIndexer: requestedRelease?.indexer || null,
      requestedRelease,
    };
  }

  const episodeTarget = getSeriesEpisodeTarget(request);
  if (episodeTarget) {
    const season = String(episodeTarget.seasonNumber).padStart(2, '0');
    const episode = String(episodeTarget.episodeNumber).padStart(2, '0');
    return {
      query: requestedRelease?.releaseName || `${request.title} S${season}E${episode}`,
      categoryIds: [5000],
      downloadMediaType: 'tv',
      preferredIndexer: requestedRelease?.indexer || null,
      requestedRelease,
      ...episodeTarget,
    };
  }

  return {
    query: requestedRelease?.releaseName || (year ? `${request.title} ${year}` : request.title),
    categoryIds: [5000],
    downloadMediaType: 'tv',
    preferredIndexer: requestedRelease?.indexer || null,
    requestedRelease,
  };
};

const parseRequestedRelease = (requestNote = '') => {
  if (!requestNote || typeof requestNote !== 'string') return null;

  const releaseMatch = requestNote.match(/Release:\s*(.*?)(?:\s*\|\s*Indexer:|$)/i);
  const indexerMatch = requestNote.match(/Indexer:\s*(.*?)\s*$/i);
  const releaseName = releaseMatch?.[1]?.trim();

  if (!releaseName) return null;

  return {
    releaseName,
    indexer: indexerMatch?.[1]?.trim() || null,
  };
};

const findReleaseForRequest = async (request) => {
  const search = buildApprovalSearch(request);
  const indexers = await Indexers.findAll({
    where: { enabled: true },
    attributes: ['id', 'name', 'baseUrl', 'username', 'password', 'apiKey', 'protocol', 'indexerType', 'enabled', 'categories', 'verified', 'priority', 'cardigannId'],
    raw: true,
  });

  if (indexers.length === 0) {
    const error = new Error('No enabled indexers are configured');
    error.statusCode = 422;
    throw error;
  }

  const { results } = await searchIndexers(indexers, search.query, search.categoryIds, 100, 0);
  const allResults = results || [];
  const preferredIndexerResults = search.preferredIndexer
    ? allResults.filter((result) => result.indexer?.toLowerCase() === search.preferredIndexer.toLowerCase())
    : allResults;
  const candidates = preferredIndexerResults.length > 0 ? preferredIndexerResults : allResults;
  const matchingQuality = filterByQuality(candidates, request.qualityProfile || 'any');
  const bestRelease = pickRequestedRelease(matchingQuality, search.requestedRelease) || pickBestRelease(matchingQuality);

  if (!bestRelease) {
    const error = new Error(`No matching release found for "${search.query}"`);
    error.statusCode = 422;
    throw error;
  }

  return {
    search,
    release: bestRelease,
  };
};

const approveAndDownload = async (request, reviewerId, reviewNote) => {
  const { search, release } = await findReleaseForRequest(request);
  const quality = getQualityFromTitle(release.title);

  const downloadResult = await grabReleaseInternal({
    downloadUrl: release.downloadUrl,
    protocol: release.protocol,
    releaseName: release.title,
    indexer: release.indexer,
    indexerId: release.indexerId,
    size: release.size,
    sizeFormatted: release.sizeFormatted,
    seeders: release.seeders,
    leechers: release.leechers,
    quality,
    source: 'MediaRequestApproval',
    mediaType: search.downloadMediaType,
    mediaTitle: request.title,
    tmdbId: request.tmdbId,
    seasonNumber: search.seasonNumber || null,
    episodeNumber: search.episodeNumber || null,
  }, request.userId);

  if (request.mediaType === 'movie') {
    const [movie] = await MonitoredMovies.findOrCreate({
      where: { userId: request.userId, tmdbId: request.tmdbId },
      defaults: {
        userId: request.userId,
        tmdbId: request.tmdbId,
        title: request.title,
        overview: request.overview,
        posterUrl: request.posterPath,
        releaseDate: request.releaseDate,
        qualityProfile: request.qualityProfile || 'any',
        status: 'downloading',
        downloadedTorrentId: release.id,
        downloadedTorrentTitle: release.title,
      },
    });

    await movie.update({
      status: 'downloading',
      downloadedTorrentId: release.id,
      downloadedTorrentTitle: release.title,
    });
  } else if (request.mediaType === 'series') {
    const [series] = await MonitoredSeries.findOrCreate({
      where: { userId: request.userId, tmdbId: request.tmdbId },
      defaults: {
        userId: request.userId,
        tmdbId: request.tmdbId,
        title: request.title,
        overview: request.overview,
        posterUrl: request.posterPath,
        firstAirDate: request.releaseDate,
        selectedSeasons: JSON.stringify(request.selectedSeasons || []),
        selectedEpisodes: JSON.stringify(request.selectedEpisodes || []),
        qualityProfile: request.qualityProfile || 'any',
        status: 'downloading',
      },
    });

    await series.update({ status: 'downloading' });
  }

  await request.update({
    status: 'approved',
    reviewedBy: reviewerId,
    reviewedAt: new Date(),
    reviewNote,
  });

  return {
    release,
    downloadResult,
  };
};

/**
 * Create a new media request
 */
exports.createRequest = async (req, res) => {
  try {
    const userId = req.userId;
    const {
      mediaType,
      tmdbId,
      title,
      overview,
      posterPath,
      backdropPath,
      releaseDate,
      selectedSeasons,
      selectedEpisodes,
      qualityProfile,
      requestNote,
    } = req.body;

    // Check if user has auto_approve permission
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.permissions?.request && !user.permissions?.admin) {
      return res.status(403).json({ error: 'You do not have permission to create requests' });
    }

    const hasAutoApprove = user.permissions?.auto_approve || user.permissions?.admin;

    // Check if request already exists for this user and media
    const existingRequest = await MediaRequest.findOne({
      where: {
        userId,
        tmdbId,
        mediaType,
        status: { [Op.in]: ['pending', 'approved', 'downloading'] },
      },
    });

    if (existingRequest) {
      return res.status(400).json({ 
        error: 'You already have a pending or approved request for this media',
        existingRequest,
      });
    }

    // Create the request
    const request = await MediaRequest.create({
      userId,
      mediaType,
      tmdbId,
      title,
      overview,
      posterPath,
      backdropPath,
      releaseDate,
      selectedSeasons,
      selectedEpisodes,
      qualityProfile: qualityProfile || 'any',
      requestNote,
      status: hasAutoApprove ? 'approved' : 'pending',
      reviewedBy: hasAutoApprove ? userId : null,
      reviewedAt: hasAutoApprove ? new Date() : null,
    });

    // If auto-approved, also add to monitored
    if (hasAutoApprove) {
      if (mediaType === 'movie') {
        await MonitoredMovies.findOrCreate({
          where: { userId, tmdbId },
          defaults: {
            userId,
            tmdbId,
            title,
            overview,
            posterPath,
            backdropPath,
            releaseDate,
            qualityProfile: qualityProfile || 'any',
            status: 'monitoring',
          },
        });
      } else if (mediaType === 'series') {
        await MonitoredSeries.findOrCreate({
          where: { userId, tmdbId },
          defaults: {
            userId,
            tmdbId,
            title,
            overview,
            posterPath,
            backdropPath,
            firstAirDate: releaseDate,
            selectedSeasons: JSON.stringify(selectedSeasons || []),
            selectedEpisodes: JSON.stringify(selectedEpisodes || []),
            qualityProfile: qualityProfile || 'any',
            status: 'monitoring',
          },
        });
      }
    }

    res.json({
      success: true,
      request,
      autoApproved: hasAutoApprove,
      message: hasAutoApprove 
        ? 'Request auto-approved and added to monitoring'
        : 'Request submitted for approval',
    });
  } catch (error) {
    console.error('Error creating request:', error);
    res.status(500).json({ error: 'Failed to create request' });
  }
};

/**
 * Get all requests (for admins/managers)
 */
exports.getAllRequests = async (req, res) => {
  try {
    if (!canManageRequests(req.user)) {
      return res.status(403).json({ error: 'Not authorized to manage requests' });
    }

    const { status, mediaType, userId: filterUserId } = req.query;
    
    const where = {};
    if (status) where.status = status;
    if (mediaType) where.mediaType = mediaType;
    if (filterUserId) where.userId = filterUserId;

    const requests = await MediaRequest.findAll({
      where,
      order: [['createdAt', 'DESC']],
    });

    // Get user info for each request
    const userIds = [...new Set(requests.map(r => r.userId))];
    const reviewerIds = [...new Set(requests.map(r => r.reviewedBy).filter(Boolean))];
    const allUserIds = [...new Set([...userIds, ...reviewerIds])];
    
    const users = await User.findAll({
      where: { id: { [Op.in]: allUserIds } },
      attributes: ['id', 'username', 'email', 'avatarUrl'],
    });
    
    const userMap = {};
    users.forEach(u => { userMap[u.id] = u; });

    // Attach user info to requests
    const requestsWithUsers = requests.map(r => ({
      ...r.toJSON(),
      requestedBy: userMap[r.userId] || null,
      reviewedByUser: r.reviewedBy ? userMap[r.reviewedBy] : null,
    }));

    res.json({
      success: true,
      requests: requestsWithUsers,
      total: requests.length,
    });
  } catch (error) {
    console.error('Error fetching requests:', error);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
};

/**
 * Get requests for the current user
 */
exports.getMyRequests = async (req, res) => {
  try {
    const userId = req.userId;

    const requests = await MediaRequest.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
    });

    res.json({
      success: true,
      requests,
    });
  } catch (error) {
    console.error('Error fetching user requests:', error);
    res.status(500).json({ error: 'Failed to fetch your requests' });
  }
};

/**
 * Approve a request
 */
exports.approveRequest = async (req, res) => {
  try {
    if (!canManageRequests(req.user)) {
      return res.status(403).json({ error: 'Not authorized to approve requests' });
    }

    const { id } = req.params;
    const reviewerId = req.userId;
    const { reviewNote } = req.body;

    const request = await MediaRequest.findByPk(id);
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'Request is not pending' });
    }

    const approvalResult = await approveAndDownload(request, reviewerId, reviewNote);

    res.json({
      success: true,
      message: 'Request approved and sent to download client',
      request: request.toJSON(),
      release: {
        title: approvalResult.release.title,
        indexer: approvalResult.release.indexer,
        protocol: approvalResult.release.protocol,
      },
      download: approvalResult.downloadResult,
    });
  } catch (error) {
    console.error('Error approving request:', error);
    res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to approve request',
    });
  }
};

/**
 * Deny a request
 */
exports.denyRequest = async (req, res) => {
  try {
    if (!canManageRequests(req.user)) {
      return res.status(403).json({ error: 'Not authorized to deny requests' });
    }

    const { id } = req.params;
    const reviewerId = req.userId;
    const { reviewNote } = req.body;

    const request = await MediaRequest.findByPk(id);
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'Request is not pending' });
    }

    await request.update({
      status: 'denied',
      reviewedBy: reviewerId,
      reviewedAt: new Date(),
      reviewNote,
    });

    res.json({
      success: true,
      message: 'Request denied',
      request,
    });
  } catch (error) {
    console.error('Error denying request:', error);
    res.status(500).json({ error: 'Failed to deny request' });
  }
};

/**
 * Delete a request (user can delete their own pending requests)
 */
exports.deleteRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const request = await MediaRequest.findByPk(id);
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    // Check if user owns the request or is admin
    const user = await User.findByPk(userId);
    const isAdmin = user?.permissions?.admin || user?.permissions?.manage_requests;

    if (request.userId !== userId && !isAdmin) {
      return res.status(403).json({ error: 'Not authorized to delete this request' });
    }

    // Only allow deleting pending requests (unless admin)
    if (request.status !== 'pending' && !isAdmin) {
      return res.status(400).json({ error: 'Can only delete pending requests' });
    }

    await request.destroy();

    res.json({
      success: true,
      message: 'Request deleted',
    });
  } catch (error) {
    console.error('Error deleting request:', error);
    res.status(500).json({ error: 'Failed to delete request' });
  }
};

/**
 * Get request counts (for dashboard/badges)
 */
exports.getRequestCounts = async (req, res) => {
  try {
    const where = canManageRequests(req.user) ? {} : { userId: req.userId };

    const pending = await MediaRequest.count({ where: { ...where, status: 'pending' } });
    const approved = await MediaRequest.count({ where: { ...where, status: 'approved' } });
    const denied = await MediaRequest.count({ where: { ...where, status: 'denied' } });
    const total = await MediaRequest.count({ where });

    res.json({
      success: true,
      counts: {
        pending,
        approved,
        denied,
        total,
      },
    });
  } catch (error) {
    console.error('Error getting request counts:', error);
    res.status(500).json({ error: 'Failed to get request counts' });
  }
};

