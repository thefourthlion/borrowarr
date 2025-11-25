const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ParentalGuide = sequelize.define('ParentalGuide', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  imdbId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  tmdbId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  mediaType: {
    type: DataTypes.ENUM('movie', 'tv'),
    allowNull: false,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  // Nudity data
  hasNudity: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  nuditySeverity: {
    type: DataTypes.ENUM('None', 'Mild', 'Moderate', 'Severe'),
    defaultValue: 'None',
  },
  nudityVotes: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  nudityDetails: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Text description of nudity content',
  },
  // Other parental guide categories
  violence: {
    type: DataTypes.ENUM('None', 'Mild', 'Moderate', 'Severe'),
    defaultValue: 'None',
  },
  profanity: {
    type: DataTypes.ENUM('None', 'Mild', 'Moderate', 'Severe'),
    defaultValue: 'None',
  },
  alcohol: {
    type: DataTypes.ENUM('None', 'Mild', 'Moderate', 'Severe'),
    defaultValue: 'None',
  },
  frightening: {
    type: DataTypes.ENUM('None', 'Mild', 'Moderate', 'Severe'),
    defaultValue: 'None',
  },
  // Metadata
  lastScrapedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  scrapedSuccessfully: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  errorMessage: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'parental_guide',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['imdbId'],
    },
    {
      fields: ['tmdbId'],
    },
    {
      fields: ['mediaType'],
    },
    {
      fields: ['hasNudity'],
    },
    {
      fields: ['nuditySeverity'],
    },
  ],
});

module.exports = ParentalGuide;

