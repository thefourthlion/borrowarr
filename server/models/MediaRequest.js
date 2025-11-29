const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const MediaRequest = sequelize.define(
  "MediaRequest",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
      onDelete: "CASCADE",
    },
    mediaType: {
      type: DataTypes.ENUM("movie", "series"),
      allowNull: false,
    },
    tmdbId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    overview: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    posterPath: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    backdropPath: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    releaseDate: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    // For series - which seasons/episodes are requested
    selectedSeasons: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: null,
    },
    selectedEpisodes: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: null,
    },
    // Request settings
    qualityProfile: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "any",
    },
    // Request status
    status: {
      type: DataTypes.ENUM("pending", "approved", "denied", "downloading", "completed"),
      allowNull: false,
      defaultValue: "pending",
    },
    // Who approved/denied
    reviewedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "users",
        key: "id",
      },
    },
    reviewedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    reviewNote: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    // Additional metadata
    requestNote: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "media_requests",
    timestamps: true,
    underscored: true,
  }
);

module.exports = MediaRequest;

