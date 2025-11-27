// Helper script to generate complete indexer data from table
// This can be used to parse the user's table data and generate the complete list

const fs = require('fs');
const path = require('path');

// Known categories in order of length (longest first)
const KNOWN_CATEGORIES = ["Console", "Movies", "Audio", "Books", "Other", "PC", "TV", "XXX"];

function parseCategories(catStr) {
  if (!catStr || catStr === "None") return [];
  
  const found = [];
  let remaining = catStr;
  
  // Check for known categories (longest first to avoid partial matches)
  for (const cat of KNOWN_CATEGORIES.sort((a, b) => b.length - a.length)) {
    if (remaining.includes(cat)) {
      found.push(cat);
      remaining = remaining.replace(cat, "");
    }
  }
  
  return found;
}

// This function can be used to parse table data
// Format: protocol\tname\tlanguage\tdescription\tprivacy\tcategories
function parseTableData(tableData) {
  const lines = tableData.trim().split('\n');
  const indexers = [];
  
  for (const line of lines) {
    const parts = line.split('\t');
    if (parts.length >= 6) {
      indexers.push({
        name: parts[1],
        protocol: parts[0],
        language: parts[2],
        description: parts[3],
        privacy: parts[4],
        categories: parseCategories(parts[5]),
      });
    }
  }
  
  return indexers;
}

// Export for use in other scripts
module.exports = { parseCategories, parseTableData };

// If run directly, can be used to generate data
if (require.main === module) {
  console.log('This script provides helper functions to parse indexer table data.');
  console.log('Use parseTableData() to convert table format to indexer objects.');
}

