/**
 * Auto-Rename Service
 * 
 * A background service that automatically renames media files based on user settings.
 * This service is per-user and runs at a user-configurable interval.
 * 
 * WARNING: This is a beta feature that may cause unexpected changes to media libraries.
 */

const Settings = require('../models/Settings');
const {
  previewMovieRenames,
  previewSeriesRenames,
  executeMovieRenames,
  executeSeriesRenames,
} = require('./fileRenamer');

// Store interval references per user
const userIntervals = new Map();

// Store last run time per user
const lastRunTimes = new Map();

/**
 * Start the auto-rename service for all users who have it enabled
 */
async function startAutoRenameService() {
  console.log('🔄 [AutoRename] Starting auto-rename service...');
  
  try {
    // Find all users with autoRename enabled
    // Use raw query to avoid issues with missing columns during initial sync
    let usersWithAutoRename = [];
    
    try {
      usersWithAutoRename = await Settings.findAll({
        where: { autoRename: true },
      });
    } catch (queryError) {
      // If the column doesn't exist yet, just wait for next restart
      if (queryError.message && queryError.message.includes('no such column')) {
        console.log('🔄 [AutoRename] Database schema not ready yet, skipping startup');
        return;
      }
      throw queryError;
    }

    console.log(`🔄 [AutoRename] Found ${usersWithAutoRename.length} user(s) with auto-rename enabled`);

    for (const settings of usersWithAutoRename) {
      await scheduleUserAutoRename(settings.userId, settings.autoRenameInterval || 60);
    }
  } catch (error) {
    console.error('❌ [AutoRename] Error starting service:', error);
  }
}

/**
 * Schedule auto-rename for a specific user
 * @param {string} userId - The user ID
 * @param {number} intervalMinutes - The interval in minutes
 */
async function scheduleUserAutoRename(userId, intervalMinutes = 60) {
  // Clear any existing interval for this user
  if (userIntervals.has(userId)) {
    clearInterval(userIntervals.get(userId));
    userIntervals.delete(userId);
    console.log(`🔄 [AutoRename] Cleared existing interval for user ${userId}`);
  }

  // Minimum interval is 15 minutes to prevent abuse
  const safeInterval = Math.max(15, intervalMinutes);
  const intervalMs = safeInterval * 60 * 1000;

  console.log(`🔄 [AutoRename] Scheduling auto-rename for user ${userId} every ${safeInterval} minutes`);

  // Run immediately on first start
  await runAutoRenameForUser(userId);

  // Schedule recurring runs
  const intervalId = setInterval(async () => {
    await runAutoRenameForUser(userId);
  }, intervalMs);

  userIntervals.set(userId, intervalId);
  lastRunTimes.set(userId, new Date());
}

/**
 * Stop auto-rename for a specific user
 * @param {string} userId - The user ID
 */
function stopUserAutoRename(userId) {
  if (userIntervals.has(userId)) {
    clearInterval(userIntervals.get(userId));
    userIntervals.delete(userId);
    lastRunTimes.delete(userId);
    console.log(`⏹️ [AutoRename] Stopped auto-rename for user ${userId}`);
    return true;
  }
  return false;
}

/**
 * Run auto-rename for a specific user
 * @param {string} userId - The user ID
 */
async function runAutoRenameForUser(userId) {
  console.log(`\n🔄 [AutoRename] Running auto-rename for user ${userId}...`);
  const startTime = Date.now();
  
  try {
    // Get user settings
    const settings = await Settings.findOne({ where: { userId } });
    
    if (!settings) {
      console.log(`⚠️ [AutoRename] No settings found for user ${userId}`);
      return { success: false, error: 'Settings not found' };
    }

    if (!settings.autoRename) {
      console.log(`⏹️ [AutoRename] Auto-rename disabled for user ${userId}`);
      stopUserAutoRename(userId);
      return { success: false, error: 'Auto-rename disabled' };
    }

    const results = {
      movies: { previewed: 0, renamed: 0, failed: 0, errors: [] },
      series: { previewed: 0, renamed: 0, failed: 0, errors: [] },
    };

    // Process movies if directory is configured
    if (settings.movieDirectory) {
      console.log(`🎬 [AutoRename] Processing movies for user ${userId}...`);
      
      try {
        const movieRenames = await previewMovieRenames(userId, settings.movieFileFormat);
        results.movies.previewed = movieRenames.length;
        
        if (movieRenames.length > 0) {
          console.log(`🎬 [AutoRename] Found ${movieRenames.length} movies to rename`);
          const movieResults = await executeMovieRenames(userId, movieRenames);
          results.movies.renamed = movieResults.success;
          results.movies.failed = movieResults.failed;
          results.movies.errors = movieResults.errors;
        } else {
          console.log(`✅ [AutoRename] All movies already match naming format`);
        }
      } catch (movieError) {
        console.error(`❌ [AutoRename] Error processing movies:`, movieError);
        results.movies.errors.push({ error: movieError.message });
      }
    }

    // Process series if directory is configured
    if (settings.seriesDirectory) {
      console.log(`📺 [AutoRename] Processing series for user ${userId}...`);
      
      try {
        const seriesRenames = await previewSeriesRenames(userId, settings.seriesFileFormat);
        results.series.previewed = seriesRenames.length;
        
        if (seriesRenames.length > 0) {
          console.log(`📺 [AutoRename] Found ${seriesRenames.length} series episodes to rename`);
          const seriesResults = await executeSeriesRenames(userId, seriesRenames);
          results.series.renamed = seriesResults.success;
          results.series.failed = seriesResults.failed;
          results.series.errors = seriesResults.errors;
        } else {
          console.log(`✅ [AutoRename] All series episodes already match naming format`);
        }
      } catch (seriesError) {
        console.error(`❌ [AutoRename] Error processing series:`, seriesError);
        results.series.errors.push({ error: seriesError.message });
      }
    }

    const duration = Date.now() - startTime;
    lastRunTimes.set(userId, new Date());

    console.log(`\n✅ [AutoRename] Completed for user ${userId} in ${duration}ms`);
    console.log(`   Movies: ${results.movies.renamed}/${results.movies.previewed} renamed`);
    console.log(`   Series: ${results.series.renamed}/${results.series.previewed} renamed`);

    return { success: true, results, duration };
  } catch (error) {
    console.error(`❌ [AutoRename] Error running auto-rename for user ${userId}:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Update auto-rename settings for a user
 * Called when user saves their settings
 * @param {string} userId - The user ID
 * @param {boolean} enabled - Whether auto-rename is enabled
 * @param {number} intervalMinutes - The interval in minutes
 */
async function updateUserAutoRename(userId, enabled, intervalMinutes) {
  if (enabled) {
    await scheduleUserAutoRename(userId, intervalMinutes);
  } else {
    stopUserAutoRename(userId);
  }
}

/**
 * Get the status of auto-rename for a user
 * @param {string} userId - The user ID
 * @returns {object} - Status info
 */
function getUserAutoRenameStatus(userId) {
  const isRunning = userIntervals.has(userId);
  const lastRun = lastRunTimes.get(userId);
  
  return {
    isRunning,
    lastRun: lastRun ? lastRun.toISOString() : null,
  };
}

/**
 * Get status for all users
 * @returns {object} - Global status
 */
function getGlobalStatus() {
  return {
    totalUsers: userIntervals.size,
    users: Array.from(userIntervals.keys()).map(userId => ({
      userId,
      lastRun: lastRunTimes.get(userId)?.toISOString() || null,
    })),
  };
}

/**
 * Manually trigger auto-rename for a user (for testing/admin use)
 * @param {string} userId - The user ID
 */
async function triggerManualRun(userId) {
  console.log(`🔄 [AutoRename] Manual trigger for user ${userId}`);
  return await runAutoRenameForUser(userId);
}

/**
 * Stop the entire auto-rename service
 */
function stopAutoRenameService() {
  console.log('⏹️ [AutoRename] Stopping auto-rename service...');
  
  for (const [userId, intervalId] of userIntervals.entries()) {
    clearInterval(intervalId);
    console.log(`⏹️ [AutoRename] Stopped interval for user ${userId}`);
  }
  
  userIntervals.clear();
  lastRunTimes.clear();
  
  console.log('⏹️ [AutoRename] Service stopped');
}

module.exports = {
  startAutoRenameService,
  stopAutoRenameService,
  scheduleUserAutoRename,
  stopUserAutoRename,
  updateUserAutoRename,
  runAutoRenameForUser,
  getUserAutoRenameStatus,
  getGlobalStatus,
  triggerManualRun,
};

