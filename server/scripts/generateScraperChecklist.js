/**
 * Generate a comprehensive checklist of all available indexers
 * and create a plan to implement scrapers for each one
 */

const { sequelize } = require('../config/database');
const AvailableIndexers = require('../models/AvailableIndexers');
const fs = require('fs');
const path = require('path');

async function generateChecklist() {
  try {
    await sequelize.authenticate();
    await sequelize.sync();
    
    console.log('📊 Fetching all available indexers...');
    const indexers = await AvailableIndexers.findAll({
      order: [['name', 'ASC']],
    });
    
    console.log(`✅ Found ${indexers.length} indexers`);
    
    // Group by implementation type
    const byType = {};
    const byProtocol = { torrent: 0, nzb: 0 };
    const byPrivacy = { Private: 0, Public: 0, 'Semi-Private': 0 };
    
    indexers.forEach(idx => {
      const type = idx.indexerType || idx.implementation || 'Cardigann';
      if (!byType[type]) byType[type] = [];
      byType[type].push(idx);
      
      byProtocol[idx.protocol] = (byProtocol[idx.protocol] || 0) + 1;
      byPrivacy[idx.privacy] = (byPrivacy[idx.privacy] || 0) + 1;
    });
    
    // Generate markdown checklist
    let markdown = `# Indexer Scraper Implementation Checklist\n\n`;
    markdown += `**Generated:** ${new Date().toISOString()}\n\n`;
    markdown += `## Summary Statistics\n\n`;
    markdown += `- **Total Indexers:** ${indexers.length}\n`;
    markdown += `- **Torrent:** ${byProtocol.torrent}\n`;
    markdown += `- **NZB:** ${byProtocol.nzb}\n`;
    markdown += `- **Private:** ${byPrivacy.Private}\n`;
    markdown += `- **Public:** ${byPrivacy.Public}\n`;
    markdown += `- **Semi-Private:** ${byPrivacy['Semi-Private']}\n\n`;
    
    markdown += `## Implementation Types\n\n`;
    Object.entries(byType).forEach(([type, list]) => {
      markdown += `- **${type}:** ${list.length}\n`;
    });
    
    markdown += `\n---\n\n`;
    markdown += `## Implementation Checklist\n\n`;
    markdown += `| Status | Name | Protocol | Privacy | Type | Base URLs | Notes |\n`;
    markdown += `|--------|------|----------|---------|------|-----------|-------|\n`;
    
    // Check which scrapers already exist
    const scrapersDir = path.join(__dirname, '../scrapers/definitions');
    const existingScrapers = fs.existsSync(scrapersDir) 
      ? fs.readdirSync(scrapersDir)
          .filter(f => f.endsWith('.yml'))
          .map(f => f.replace('.yml', ''))
      : [];
    
    indexers.forEach(indexer => {
      const scraperId = indexer.name.toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .replace(/\s+/g, '');
      
      const hasScraper = existingScrapers.includes(scraperId) || 
                         existingScrapers.some(ex => 
                           ex.includes(scraperId) || scraperId.includes(ex)
                         );
      
      const status = hasScraper ? '✅' : '⏳';
      const baseUrls = (indexer.availableBaseUrls || []).slice(0, 2).join(', ') || 'N/A';
      const notes = hasScraper ? 'Implemented' : 'Pending';
      
      markdown += `| ${status} | ${indexer.name} | ${indexer.protocol} | ${indexer.privacy} | ${indexer.indexerType || 'Cardigann'} | ${baseUrls} | ${notes} |\n`;
    });
    
    // Save checklist
    const checklistPath = path.join(__dirname, '../../SCRAPER_CHECKLIST.md');
    fs.writeFileSync(checklistPath, markdown);
    console.log(`\n✅ Checklist saved to: ${checklistPath}`);
    
    // Generate detailed JSON for processing
    const jsonPath = path.join(__dirname, '../../scraper-indexers.json');
    const jsonData = indexers.map(idx => ({
      id: idx.id,
      name: idx.name,
      protocol: idx.protocol,
      privacy: idx.privacy,
      language: idx.language,
      description: idx.description,
      indexerType: idx.indexerType || idx.implementation || 'Cardigann',
      baseUrls: idx.availableBaseUrls || [],
      categories: idx.categories || [],
      hasScraper: existingScrapers.some(ex => 
        ex.includes(idx.name.toLowerCase().replace(/[^a-z0-9]/g, '')) ||
        idx.name.toLowerCase().replace(/[^a-z0-9]/g, '').includes(ex)
      ),
    }));
    
    fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2));
    console.log(`✅ JSON data saved to: ${jsonPath}`);
    
    console.log(`\n📈 Progress: ${existingScrapers.length}/${indexers.length} scrapers implemented (${((existingScrapers.length / indexers.length) * 100).toFixed(1)}%)`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

generateChecklist();

