const MonitoredSeries = require("../models/MonitoredSeries");
const Settings = require("../models/Settings");
const { findSeriesEpisodeFile, getUserSeriesDirectory } = require("../services/fileScanner");

/**
 * Get all monitored series for a user
 */
exports.getMonitoredSeries = async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    const series = await MonitoredSeries.findAll({
      where: { userId },
      order: [["createdAt", "DESC"]],
    });

    res.json({ success: true, series });
  } catch (error) {
    console.error("Error fetching monitored series:", error);
    res.status(500).json({ error: "Failed to fetch monitored series" });
  }
};

/**
 * Add a series to monitored list
 */
exports.addMonitoredSeries = async (req, res) => {
  try {
    const {
      userId,
      tmdbId,
      title,
      posterUrl,
      firstAirDate,
      overview,
      qualityProfile,
      minAvailability,
      monitor,
      selectedSeasons,
      selectedEpisodes,
      status, // Optional: frontend can pass 'downloaded' if all files already exist
    } = req.body;

    if (!userId || !tmdbId || !title) {
      return res.status(400).json({
        error: "userId, tmdbId, and title are required",
      });
    }

    // Get user's settings to check autoDownload preference
    const settings = await Settings.findOne({ where: { userId } });
    const autoDownload = settings?.autoDownload ?? true;

    // Check if series is already monitored by this user
    const existing = await MonitoredSeries.findOne({
      where: { userId, tmdbId },
    });

    let series;
    let isUpdate = false;

    // Determine status: if frontend says 'downloaded', use that; otherwise keep existing or default to 'monitoring'
    const determineStatus = (existingSeries) => {
      if (status === 'downloaded') return 'downloaded';
      if (existingSeries && existingSeries.status === 'downloaded') return 'downloaded';
      return 'monitoring';
    };

    if (existing) {
      // Update existing series instead of creating duplicate
      isUpdate = true;
      await existing.update({
        title,
        posterUrl: posterUrl || null,
        firstAirDate: firstAirDate || null,
        overview: overview || null,
        qualityProfile: qualityProfile || "any",
        minAvailability: minAvailability || "released",
        monitor: monitor || "all",
        selectedSeasons: selectedSeasons ? JSON.stringify(selectedSeasons) : null,
        selectedEpisodes: selectedEpisodes ? JSON.stringify(selectedEpisodes) : null,
        status: determineStatus(existing),
      });
      series = existing;
    } else {
      // Create new series
      series = await MonitoredSeries.create({
        userId,
        tmdbId,
        title,
        posterUrl: posterUrl || null,
        firstAirDate: firstAirDate || null,
        overview: overview || null,
        qualityProfile: qualityProfile || "any",
        minAvailability: minAvailability || "released",
        monitor: monitor || "all",
        selectedSeasons: selectedSeasons ? JSON.stringify(selectedSeasons) : null,
        selectedEpisodes: selectedEpisodes ? JSON.stringify(selectedEpisodes) : null,
        status: status === 'downloaded' ? 'downloaded' : 'monitoring',
      });
    }

    // Return series with autoDownload setting so frontend knows whether to download
    res.json({ 
      success: true, 
      series, 
      isUpdate, 
      autoDownload, // Include user's autoDownload setting
    });
  } catch (error) {
    console.error("Error adding monitored series:", error);
    res.status(500).json({ error: "Failed to add monitored series" });
  }
};

/**
 * Update a monitored series
 */
exports.updateMonitoredSeries = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const series = await MonitoredSeries.findByPk(id);

    if (!series) {
      return res.status(404).json({ error: "Series not found" });
    }

    // Handle JSON fields
    if (updates.selectedSeasons && typeof updates.selectedSeasons !== 'string') {
      updates.selectedSeasons = JSON.stringify(updates.selectedSeasons);
    }
    if (updates.selectedEpisodes && typeof updates.selectedEpisodes !== 'string') {
      updates.selectedEpisodes = JSON.stringify(updates.selectedEpisodes);
    }

    await series.update(updates);

    res.json({ success: true, series });
  } catch (error) {
    console.error("Error updating monitored series:", error);
    res.status(500).json({ error: "Failed to update monitored series" });
  }
};

/**
 * Remove a series from monitored list
 */
exports.removeMonitoredSeries = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    const series = await MonitoredSeries.findOne({
      where: { id, userId },
    });

    if (!series) {
      return res.status(404).json({ error: "Series not found" });
    }

    await series.destroy();

    res.json({ success: true, message: "Series removed from monitoring" });
  } catch (error) {
    console.error("Error removing monitored series:", error);
    res.status(500).json({ error: "Failed to remove monitored series" });
  }
};

/**
 * Check if a series is monitored by user
 */
exports.isSeriesMonitored = async (req, res) => {
  try {
    const { userId, tmdbId } = req.query;

    if (!userId || !tmdbId) {
      return res.status(400).json({ error: "userId and tmdbId are required" });
    }

    const series = await MonitoredSeries.findOne({
      where: { userId, tmdbId },
    });

    res.json({ success: true, isMonitored: !!series, series });
  } catch (error) {
    console.error("Error checking if series is monitored:", error);
    res.status(500).json({ error: "Failed to check series status" });
  }
};

/**
 * Check if series episodes exist BEFORE adding to monitored list
 * This allows checking for existing files without creating a monitored entry
 */
exports.checkEpisodesExist = async (req, res) => {
  try {
    const { userId, title, episodes } = req.body;

    if (!userId || !title) {
      return res.status(400).json({ error: "userId and title are required" });
    }

    // Get user's series directory
    const seriesDirectory = await getUserSeriesDirectory(userId);
    
    if (!seriesDirectory) {
      return res.json({ 
        success: true, 
        results: [],
        message: "Series directory not configured" 
      });
    }

    // Create a mock series object for the file finder
    const mockSeries = { title };

    // Check each episode
    const results = [];
    const episodesList = episodes || [];

    for (const episode of episodesList) {
      const { seasonNumber, episodeNumber } = episode;
      
      const fileInfo = await findSeriesEpisodeFile(mockSeries, seriesDirectory, seasonNumber, episodeNumber);
      
      results.push({
        seasonNumber,
        episodeNumber,
        exists: !!(fileInfo && fileInfo.found),
        fileInfo: fileInfo ? {
          fileName: fileInfo.fileName,
          filePath: fileInfo.filePath,
          fileSize: fileInfo.fileSize,
          fileSizeFormatted: fileInfo.fileSizeFormatted,
        } : null,
      });
    }

    const existingCount = results.filter(r => r.exists).length;

    return res.json({
      success: true,
      results,
      existingCount,
      totalCount: episodesList.length,
      message: existingCount > 0 
        ? `${existingCount} of ${episodesList.length} episodes already exist` 
        : "No episodes found in library",
    });
  } catch (error) {
    console.error("Error checking episodes existence:", error);
    res.status(500).json({ error: "Failed to check episodes existence" });
  }
};

