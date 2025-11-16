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
  checkInterval: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 60, // minutes
  },
}, {
  tableName: 'Settings',
  timestamps: true,
});

module.exports = Settings;

