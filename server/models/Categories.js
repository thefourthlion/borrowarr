const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Categories = sequelize.define(
  "Categories",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    parentId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "Categories",
        key: "id",
      },
    },
    type: {
      type: DataTypes.STRING,
      allowNull: true, // 'Console', 'Movies', 'Audio', 'PC', 'TV', 'XXX', 'Books', 'Other'
    },
  },
  {
    tableName: "categories",
    timestamps: false,
  }
);

module.exports = Categories;

