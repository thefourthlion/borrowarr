const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const History = sequelize.define(
  "History",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: "Please provide userId" },
      },
    },
    // Media information
    mediaType: {
      type: DataTypes.ENUM('movie', 'tv', 'unknown'),
      allowNull: false,
      defaultValue: 'unknown',
    },
    mediaTitle: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    tmdbId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    seasonNumber: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    episodeNumber: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    // Torrent/NZB information
    releaseName: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    protocol: {
      type: DataTypes.ENUM('torrent', 'nzb'),
      allowNull: false,
    },
    indexer: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    indexerId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    // Download information
    downloadUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    size: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    sizeFormatted: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    // Metadata
    seeders: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    leechers: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    quality: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    // Status tracking
    status: {
      type: DataTypes.ENUM('grabbed', 'downloading', 'completed', 'failed'),
      allowNull: false,
      defaultValue: 'grabbed',
    },
    source: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Where the request came from (e.g., "AddMovieModal", "AddSeriesModal", "QuickDownload")',
    },
    // Download client information
    downloadClient: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    downloadClientId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'ID from the download client (e.g., torrent hash, NZB ID)',
    },
  },
  {
    tableName: "History",
    timestamps: true,
    indexes: [
      {
        fields: ['userId'],
      },
      {
        fields: ['mediaType'],
      },
      {
        fields: ['tmdbId'],
      },
      {
        fields: ['createdAt'],
      },
      {
        fields: ['status'],
      },
    ],
  }
);

module.exports = History;

