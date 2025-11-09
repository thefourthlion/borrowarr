const express = require("express");
const app = express();
const cors = require("cors");
const PORT = process.env.PORT || 3002;
const { connectDB } = require("./config/database");
require("dotenv").config({ path: "./.env" });

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
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

app.listen(PORT, () => {
  console.log("✅ Listening on port " + PORT);
});