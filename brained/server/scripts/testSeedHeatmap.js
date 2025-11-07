const mongoose = require('mongoose');
const { seedAllHeatmapData } = require('./seedHeatmapData');

async function main() {
  try {
    await mongoose.connect('mongodb://localhost:27017/neurathon-pagepulse');
    console.log('Connected to MongoDB');
    
    await seedAllHeatmapData();
    
    console.log('\n✅ All done!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
