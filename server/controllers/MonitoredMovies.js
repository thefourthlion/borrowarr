const MonitoredMovies = require("../models/MonitoredMovies");
const { checkMonitoredMovie, checkUserMonitoredMovies } = require("../services/monitoringService");

/**
 * Get all monitored movies for a user
 */
exports.getMonitoredMovies = async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    const movies = await MonitoredMovies.findAll({
      where: { userId },
      order: [["createdAt", "DESC"]],
    });

    res.json({ success: true, movies });
  } catch (error) {
    console.error("Error fetching monitored movies:", error);
    res.status(500).json({ error: "Failed to fetch monitored movies" });
  }
};

/**
 * Add a movie to monitored list
 */
exports.addMonitoredMovie = async (req, res) => {
  try {
    const {
      userId,
      tmdbId,
      title,
      posterUrl,
      releaseDate,
      overview,
      qualityProfile,
      minAvailability,
      monitor,
    } = req.body;

    if (!userId || !tmdbId || !title) {
      return res.status(400).json({
        error: "userId, tmdbId, and title are required",
      });
    }

    // Check if movie is already monitored by this user
    const existing = await MonitoredMovies.findOne({
      where: { userId, tmdbId },
    });

    let movie;
    let isUpdate = false;

    if (existing) {
      // Update existing movie instead of creating duplicate
      isUpdate = true;
      await existing.update({
        title,
        posterUrl: posterUrl || null,
        releaseDate: releaseDate || null,
        overview: overview || null,
        qualityProfile: qualityProfile || "any",
        minAvailability: minAvailability || "released",
        monitor: monitor || "movieOnly",
        // Don't reset status if it's already downloaded
        status: existing.status === "downloaded" ? "downloaded" : "monitoring",
      });
      movie = existing;
    } else {
      // Create new movie
      movie = await MonitoredMovies.create({
        userId,
        tmdbId,
        title,
        posterUrl: posterUrl || null,
        releaseDate: releaseDate || null,
        overview: overview || null,
        qualityProfile: qualityProfile || "any",
        minAvailability: minAvailability || "released",
        monitor: monitor || "movieOnly",
        status: "monitoring",
      });
    }

    res.json({ success: true, movie, isUpdate });
  } catch (error) {
    console.error("Error adding monitored movie:", error);
    res.status(500).json({ error: "Failed to add monitored movie" });
  }
};

/**
 * Update a monitored movie
 */
exports.updateMonitoredMovie = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const movie = await MonitoredMovies.findByPk(id);

    if (!movie) {
      return res.status(404).json({ error: "Movie not found" });
    }

    await movie.update(updates);

    res.json({ success: true, movie });
  } catch (error) {
    console.error("Error updating monitored movie:", error);
    res.status(500).json({ error: "Failed to update monitored movie" });
  }
};

/**
 * Remove a movie from monitored list
 */
exports.removeMonitoredMovie = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    const movie = await MonitoredMovies.findOne({
      where: { id, userId },
    });

    if (!movie) {
      return res.status(404).json({ error: "Movie not found" });
    }

    await movie.destroy();

    res.json({ success: true, message: "Movie removed from monitoring" });
  } catch (error) {
    console.error("Error removing monitored movie:", error);
    res.status(500).json({ error: "Failed to remove monitored movie" });
  }
};

/**
 * Check if a movie is monitored by user
 */
exports.isMovieMonitored = async (req, res) => {
  try {
    const { userId, tmdbId } = req.query;

    if (!userId || !tmdbId) {
      return res.status(400).json({ error: "userId and tmdbId are required" });
    }

    const movie = await MonitoredMovies.findOne({
      where: { userId, tmdbId },
    });

    res.json({ success: true, isMonitored: !!movie, movie });
  } catch (error) {
    console.error("Error checking if movie is monitored:", error);
    res.status(500).json({ error: "Failed to check movie status" });
  }
};

/**
 * Manually check a single monitored movie for file existence
 */
exports.checkMovieFile = async (req, res) => {
  try {
    const { id } = req.params;

    const movie = await MonitoredMovies.findByPk(id);

    if (!movie) {
      return res.status(404).json({ error: "Movie not found" });
    }

    const result = await checkMonitoredMovie(movie);

    res.json({ success: true, result });
  } catch (error) {
    console.error("Error checking movie file:", error);
    res.status(500).json({ error: "Failed to check movie file" });
  }
};

/**
 * Manually check all monitored movies for a user
 */
exports.checkAllMovieFiles = async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    const results = await checkUserMonitoredMovies(userId);

    res.json({ success: true, results });
  } catch (error) {
    console.error("Error checking all movie files:", error);
    res.status(500).json({ error: "Failed to check movie files" });
  }
};

