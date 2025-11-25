const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const FeaturedList = sequelize.define(
  "FeaturedList",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    slug: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      comment: "URL-friendly identifier (e.g., 'official-top-250-narrative-feature-films')",
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "Display title of the list",
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Description of the list",
    },
    author: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Letterboxd username of the list creator",
    },
    authorUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "URL to the author's Letterboxd profile",
    },
    listUrl: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      comment: "Full Letterboxd URL to the list",
    },
    filmCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: "Number of films in the list",
    },
    likes: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: "Number of likes on Letterboxd",
    },
    comments: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: "Number of comments on Letterboxd",
    },
    category: {
      type: DataTypes.ENUM(
        "community",
        "editorial",
        "official",
        "genre",
        "decade",
        "awards",
        "curated"
      ),
      defaultValue: "community",
      comment: "Category of the list",
    },
    featured: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: "Whether this list is featured on the homepage",
    },
    posterUrls: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: "Array of poster URLs from films in the list (first 10)",
    },
    lastScrapedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "When the list was last scraped from Letterboxd",
    },
    scrapedFilms: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: "Array of film objects scraped from the list",
    },
  },
  {
    tableName: "FeaturedLists",
    timestamps: true,
    indexes: [
      { fields: ["slug"] },
      { fields: ["category"] },
      { fields: ["featured"] },
      { fields: ["lastScrapedAt"] },
    ],
  }
);

module.exports = FeaturedList;

