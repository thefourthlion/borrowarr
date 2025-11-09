const { sequelize } = require("../config/database");
const Categories = require("../models/Categories");
const categoriesData = require("../data/categories");

const seedCategories = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connected");

    // Sync the model
    await Categories.sync({ force: false });

    // Bulk create categories (ignore duplicates)
    for (const category of categoriesData) {
      await Categories.findOrCreate({
        where: { id: category.id },
        defaults: category,
      });
    }

    console.log(`✅ Seeded ${categoriesData.length} categories`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding categories:", error);
    process.exit(1);
  }
};

seedCategories();

