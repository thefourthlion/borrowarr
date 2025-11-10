const express = require("express");
const app = express();
const cors = require("cors");
const helmet = require("helmet");
const PORT = process.env.PORT || 3002;
const { connectDB } = require("./config/database");
require("dotenv").config({ path: "./.env" });

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for API
  crossOriginEmbedderPolicy: false,
}));

// Try to enable compression if available (optional optimization)
try {
  const compression = require("compression");
  app.use(compression({
    filter: (req, res) => {
      if (req.headers['x-no-compression']) {
        return false;
      }
      return compression.filter(req, res);
    },
    level: 6,
  }));
  console.log("✅ Response compression enabled");
} catch (e) {
  console.log("⚠️  Compression module not found - install with: npm install compression");
}

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));
app.use(cors());

// Connect to database
connectDB();

// Ensure all models are loaded for sync
require("./models/User");
require("./models/MonitoredMovies");
require("./models/MonitoredSeries");

app.get("/", (req, res) => {
  res.json({ app: "running" });
});

// Routes
app.use("/api/auth", require("./routes/Auth"));
app.use("/api/Users", require("./routes/Users"));
app.use("/api/Indexers", require("./routes/Indexers"));
app.use("/api/Search", require("./routes/Search"));
app.use("/api/DownloadClients", require("./routes/DownloadClients"));
app.use("/api/TMDB", require("./routes/tmdb"));
app.use("/api/MonitoredMovies", require("./routes/monitoredMovies"));
app.use("/api/MonitoredSeries", require("./routes/monitoredSeries"));

app.listen(PORT, () => {
  console.log("✅ Listening on port " + PORT);
});
