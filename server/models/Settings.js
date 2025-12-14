const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Settings = sequelize.define('Settings', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
  movieDirectory: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: null,
  },
  seriesDirectory: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: null,
  },
  movieFileFormat: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: '{Movie Title} ({Release Year})',
  },
  seriesFileFormat: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: '{Series Title}/Season {season:00}/{Series Title} - S{season:00}E{episode:00} - {Episode Title}',
  },
  minQuality: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: '720p',
  },
  maxQuality: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: '1080p',
  },
  autoDownload: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  autoRename: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  autoRenameInterval: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 60, // minutes - how often to scan and rename files
  },
  autoRenameWarningShown: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false, // tracks if user has seen the beta warning
  },
  // Download Watcher Settings
  downloadWatcherEnabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  movieDownloadDirectory: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: null, // Where movie downloads come from
  },
  seriesDownloadDirectory: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: null, // Where TV downloads come from
  },
  movieWatcherDestination: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: null, // Where movies get moved to
  },
  seriesWatcherDestination: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: null, // Where TV shows get moved to
  },
  watcherInterval: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 30, // seconds - how often to check for new downloads
  },
  watcherAutoApprove: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false, // if false, files require manual approval before moving
  },
  checkInterval: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 60, // minutes
  },
  publicRegistrationEnabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
}, {
  tableName: 'Settings',
  timestamps: true,
});

module.exports = Settings;

