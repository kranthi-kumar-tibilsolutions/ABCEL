const express = require('express');
const router  = express.Router();
const fs      = require('fs');
const path    = require('path');
const { requireAuth } = require('../middleware/auth');

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

// Survey metadata — scoped to the user's company for company-level users
router.get('/meta', requireAuth, (req, res) => {
  const data = read('meta.json');
  if (!data) return res.status(404).json({ error: 'No data loaded' });
  if (req.user.role !== 'company') return res.json(data);

  const units      = (read('units.json')      || []).filter(u => u.business === req.user.company);
  const businesses = (read('businesses.json') || []).filter(b => b.name === req.user.company);
  const biz        = businesses[0];

  const total_respondents = units.reduce((sum, u) => sum + (u.respondent_count || 0), 0);
  const company_avg = units.length
    ? Math.round((units.reduce((sum, u) => sum + (u.overall || 0), 0) / units.length) * 100) / 100
    : null;

  res.json({
    survey_name:        data.survey_name,
    total_businesses:   1,
    total_units:        units.length,
    total_respondents,
    group_avg:          company_avg,
    category_averages:  biz?.categories || {},
    dimensions_detected: data.dimensions_detected,
  });
});

// All businesses (sorted by overall desc) — scoped to the user's company for company-level users
router.get('/businesses', requireAuth, (req, res) => {
  const data = read('businesses.json');
  if (!data) return res.status(404).json({ error: 'No data loaded' });
  let result = data;
  if (req.user.role === 'company') result = result.filter(b => b.name === req.user.company);
  res.json(result);
});

// Business units — filterable by business name and/or cluster, scoped to the user's company
router.get('/units', requireAuth, (req, res) => {
  const data = read('units.json');
  if (!data) return res.status(404).json({ error: 'No data loaded' });
  const { business, cluster, limit } = req.query;
  let result = data;
  if (req.user.role === 'company') result = result.filter(u => u.business === req.user.company);
  if (business) result = result.filter(u => u.business === business);
  if (cluster)  result = result.filter(u => u.cluster  === cluster);
  if (limit)    result = result.slice(0, parseInt(limit));
  res.json(result);
});

// Clusters grouped object { thriving: [], atrisk: [], polarised: [], critical: [] }, scoped to the user's company
router.get('/clusters', requireAuth, (req, res) => {
  const data = read('clusters.json');
  if (!data) return res.status(404).json({ error: 'No data loaded' });
  let result = data;
  if (req.user.role === 'company') {
    result = {};
    for (const [key, units] of Object.entries(data)) {
      result[key] = units.filter(u => u.business === req.user.company);
    }
  }
  res.json(result);
});

// Cohort data { gender: [], generation: [], tenure: [], job_band: [] } — group-wide only,
// not derivable per company, so company-level users get empty arrays
router.get('/cohorts', requireAuth, (req, res) => {
  if (req.user.role === 'company') {
    return res.json({ gender: [], generation: [], tenure: [], job_band: [] });
  }
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
