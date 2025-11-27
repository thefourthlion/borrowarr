const express = require("express");
const router = express.Router();
const monitoredSeriesController = require("../controllers/MonitoredSeries");

router.get("/", monitoredSeriesController.getMonitoredSeries);
router.post("/", monitoredSeriesController.addMonitoredSeries);
router.get("/check", monitoredSeriesController.isSeriesMonitored);
router.put("/:id", monitoredSeriesController.updateMonitoredSeries);
router.delete("/:id", monitoredSeriesController.removeMonitoredSeries);

module.exports = router;

