const express = require("express");
const app = express();
const cors = require("cors");
const PORT = process.env.PORT || 3002;
const { connectDB } = require("./config/database");
require("dotenv").config({ path: "./.env" });

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

app.get("/", (req, res) => {
  res.json({ app: "running" });
});

// Routes
app.use("/api/Users", require("./routes/Users"));
app.use("/api/Indexers", require("./routes/Indexers"));
app.use("/api/Search", require("./routes/Search"));
app.use("/api/DownloadClients", require("./routes/DownloadClients"));

app.listen(PORT, () => {
  console.log("✅ Listening on port " + PORT);
});
