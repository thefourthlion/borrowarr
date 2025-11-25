const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const HiddenMedia = sequelize.define('HiddenMedia', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id',
    },
  },
  mediaType: {
    type: DataTypes.ENUM('movie', 'series'),
    allowNull: false,
  },
  tmdbId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  posterPath: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  tableName: 'hidden_media',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['userId', 'mediaType', 'tmdbId'],
    },
    {
      fields: ['userId'],
    },
    {
      fields: ['mediaType'],
    },
  ],
});

module.exports = HiddenMedia;

