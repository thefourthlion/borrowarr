const MonitoredSeries = require("../models/MonitoredSeries");

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
    } = req.body;

    if (!userId || !tmdbId || !title) {
      return res.status(400).json({
        error: "userId, tmdbId, and title are required",
      });
    }

    // Check if series is already monitored by this user
    const existing = await MonitoredSeries.findOne({
      where: { userId, tmdbId },
    });

    let series;
    let isUpdate = false;

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
        // Don't reset status if it's already downloaded
        status: existing.status === "downloaded" ? "downloaded" : "monitoring",
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
        status: "monitoring",
      });
    }

    res.json({ success: true, series, isUpdate });
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

