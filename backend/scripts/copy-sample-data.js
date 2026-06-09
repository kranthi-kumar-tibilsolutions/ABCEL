/**
 * Copies sample data to /data/ so the dashboard works immediately
 * without needing to upload an Excel file first.
 * Run: node scripts/copy-sample-data.js
 */
const fs   = require('fs');
const path = require('path');

const sampleDir = path.resolve('./backend/data/sample');
const dataDir   = path.resolve('./backend/data');

const files = ['businesses.json', 'units.json', 'clusters.json', 'cohorts.json', 'meta.json'];

files.forEach(file => {
  const src  = path.join(sampleDir, file);
  const dest = path.join(dataDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`✓ Copied ${file}`);
  } else {
    console.warn(`⚠ Missing sample file: ${file}`);
  }
});

console.log('\nSample data loaded. Run npm run dev to start.');
