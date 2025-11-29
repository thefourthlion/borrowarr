const MediaRequest = require('../models/MediaRequest');
const User = require('../models/User');
const MonitoredMovies = require('../models/MonitoredMovies');
const MonitoredSeries = require('../models/MonitoredSeries');
const { Op } = require('sequelize');

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

    // Update request status
    await request.update({
      status: 'approved',
      reviewedBy: reviewerId,
      reviewedAt: new Date(),
      reviewNote,
    });

    // Add to monitored content for the requesting user
    if (request.mediaType === 'movie') {
      await MonitoredMovies.findOrCreate({
        where: { userId: request.userId, tmdbId: request.tmdbId },
        defaults: {
          userId: request.userId,
          tmdbId: request.tmdbId,
          title: request.title,
          overview: request.overview,
          posterPath: request.posterPath,
          backdropPath: request.backdropPath,
          releaseDate: request.releaseDate,
          qualityProfile: request.qualityProfile || 'any',
          status: 'monitoring',
        },
      });
    } else if (request.mediaType === 'series') {
      await MonitoredSeries.findOrCreate({
        where: { userId: request.userId, tmdbId: request.tmdbId },
        defaults: {
          userId: request.userId,
          tmdbId: request.tmdbId,
          title: request.title,
          overview: request.overview,
          posterPath: request.posterPath,
          backdropPath: request.backdropPath,
          firstAirDate: request.releaseDate,
          selectedSeasons: JSON.stringify(request.selectedSeasons || []),
          selectedEpisodes: JSON.stringify(request.selectedEpisodes || []),
          qualityProfile: request.qualityProfile || 'any',
          status: 'monitoring',
        },
      });
    }

    res.json({
      success: true,
      message: 'Request approved',
      request,
    });
  } catch (error) {
    console.error('Error approving request:', error);
    res.status(500).json({ error: 'Failed to approve request' });
  }
};

/**
 * Deny a request
 */
exports.denyRequest = async (req, res) => {
  try {
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
    const pending = await MediaRequest.count({ where: { status: 'pending' } });
    const approved = await MediaRequest.count({ where: { status: 'approved' } });
    const denied = await MediaRequest.count({ where: { status: 'denied' } });
    const total = await MediaRequest.count();

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

