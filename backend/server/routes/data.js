const express = require('express');
const router  = express.Router();
const fs      = require('fs');
const path    = require('path');

const dataDir = path.resolve('./backend/data');

function read(file) {
  const fp = path.join(dataDir, file);
  if (!fs.existsSync(fp)) return null;
  try { return JSON.parse(fs.readFileSync(fp, 'utf8')); }
  catch { return null; }
}

// Health check — does data exist?
router.get('/status', (req, res) => {
  const ready = fs.existsSync(path.join(dataDir, 'businesses.json'));
  res.json({ ready });
});

// Survey metadata
router.get('/meta', (req, res) => {
  const data = read('meta.json');
  if (!data) return res.status(404).json({ error: 'No data loaded' });
  res.json(data);
});

// All businesses (sorted by overall desc)
router.get('/businesses', (req, res) => {
  const data = read('businesses.json');
  if (!data) return res.status(404).json({ error: 'No data loaded' });
  res.json(data);
});

// Business units — filterable by business name and/or cluster
router.get('/units', (req, res) => {
  const data = read('units.json');
  if (!data) return res.status(404).json({ error: 'No data loaded' });
  const { business, cluster, limit } = req.query;
  let result = data;
  if (business) result = result.filter(u => u.business === business);
  if (cluster)  result = result.filter(u => u.cluster  === cluster);
  if (limit)    result = result.slice(0, parseInt(limit));
  res.json(result);
});

// Clusters grouped object { thriving: [], atrisk: [], polarised: [], critical: [] }
router.get('/clusters', (req, res) => {
  const data = read('clusters.json');
  if (!data) return res.status(404).json({ error: 'No data loaded' });
  res.json(data);
});

// Cohort data { gender: [], generation: [], tenure: [], job_band: [] }
router.get('/cohorts', (req, res) => {
  const data = read('cohorts.json');
  if (!data) return res.json({ gender: [], generation: [], tenure: [], job_band: [] });
  res.json(data);
});

// Load sample data — used by Upload page "Use sample data" button
router.post('/load-sample', (req, res) => {
  const sampleDir = path.resolve('./backend/data/sample');
  const files = ['businesses.json', 'units.json', 'clusters.json', 'cohorts.json', 'meta.json'];
  let copied = 0;
  for (const file of files) {
    const src  = path.join(sampleDir, file);
    const dest = path.join(dataDir,   file);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
      copied++;
    }
  }
  if (copied === 0) return res.status(404).json({ error: 'No sample data found' });
  res.json({ success: true, copied });
});

// Reset — called by "Upload New Data" button
router.post('/reset', (req, res) => {
  const files = ['businesses.json', 'units.json', 'clusters.json', 'cohorts.json', 'meta.json'];
  for (const file of files) {
    const fp = path.join(dataDir, file);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
  }
  res.json({ success: true });
});

module.exports = router;
