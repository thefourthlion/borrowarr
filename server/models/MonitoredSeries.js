const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const MonitoredSeries = sequelize.define(
  "MonitoredSeries",
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
        notEmpty: { msg: "Please provide series title" },
      },
    },
    posterUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    firstAirDate: {
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
      defaultValue: "all",
    },
    status: {
      type: DataTypes.ENUM("monitoring", "downloading", "downloaded", "error"),
      allowNull: false,
      defaultValue: "monitoring",
    },
    selectedSeasons: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "JSON array of selected season numbers",
    },
    selectedEpisodes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "JSON array of selected episode keys (season-episode)",
    },
  },
  {
    tableName: "monitored_series",
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

module.exports = MonitoredSeries;

