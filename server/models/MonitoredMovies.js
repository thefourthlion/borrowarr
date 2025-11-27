const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const MonitoredMovies = sequelize.define(
  "MonitoredMovies",
  {
    userId: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: "Please provide userId" },
      },
    },
    tmdbId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        notEmpty: { msg: "Please provide TMDB ID" },
      },
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: "Please provide movie title" },
      },
    },
    posterUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    releaseDate: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    overview: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    qualityProfile: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "any",
    },
    minAvailability: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "released",
    },
    monitor: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "movieOnly",
    },
    status: {
      type: DataTypes.ENUM("monitoring", "downloading", "downloaded", "error", "missing"),
      allowNull: false,
      defaultValue: "monitoring",
    },
    downloadedTorrentId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    downloadedTorrentTitle: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    fileExists: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    filePath: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    fileName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    fileSize: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    lastChecked: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "monitored_movies",
    timestamps: true,
    indexes: [
      {
        fields: ["userId"],
      },
      {
        fields: ["tmdbId", "userId"],
        unique: true,
      },
    ],
  }
);

module.exports = MonitoredMovies;

