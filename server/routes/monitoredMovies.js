const express = require("express");
const router = express.Router();
const monitoredMoviesController = require("../controllers/MonitoredMovies");

router.get("/", monitoredMoviesController.getMonitoredMovies);
router.post("/", monitoredMoviesController.addMonitoredMovie);
router.get("/check", monitoredMoviesController.isMovieMonitored);
router.put("/:id", monitoredMoviesController.updateMonitoredMovie);
router.delete("/:id", monitoredMoviesController.removeMonitoredMovie);

module.exports = router;

