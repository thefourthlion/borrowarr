const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PlexConnection = sequelize.define('PlexConnection', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true, // One Plex connection per user
    references: {
      model: 'Users',
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
  serverUrl: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isUrl: true,
    },
  },
  authToken: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  serverName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  serverVersion: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  machineIdentifier: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  isConnected: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  lastChecked: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'PlexConnections',
  timestamps: true,
});

module.exports = PlexConnection;

