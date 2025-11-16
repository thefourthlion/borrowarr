const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Favorites = sequelize.define('Favorites', {
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
  tmdbId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  mediaType: {
    type: DataTypes.ENUM('movie', 'tv'),
    allowNull: false,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  posterUrl: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  overview: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  releaseDate: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  voteAverage: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
}, {
  tableName: 'Favorites',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['userId', 'tmdbId', 'mediaType'],
    },
  ],
});

module.exports = Favorites;

