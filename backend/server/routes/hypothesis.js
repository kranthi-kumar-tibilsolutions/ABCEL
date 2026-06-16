// server/routes/hypothesis.js — Tab 4: Hypothesis Testing
// Applies all DATA_REALITY_UPDATE corrections: VARIABLE_MAP, score access fix, timestamp ID
const express  = require('express');
const router   = express.Router();
const path     = require('path');
const fs       = require('fs');
const { oneSampleZTest, mean, stdDev } = require('../lib/stats');
const { callLLMJson } = require('../lib/llm');

const DATA_DIR = path.join(__dirname, '../../data');

function read(f) {
  const full   = path.join(DATA_DIR, f);
  const sample = path.join(DATA_DIR, 'sample', f);
  try { return JSON.parse(fs.readFileSync(full, 'utf8')); } catch {}
  try { return JSON.parse(fs.readFileSync(sample, 'utf8')); } catch {}
  return [];
}

// Map LLM-extracted variable names to flat field names in responses.json (DATA_REALITY_UPDATE §8)
const VARIABLE_MAP = {
  'engagement':             'engagement',
  'leadership':             'leadership',
  'performance culture':    'performance_culture',
  'development':            'development_and_career',
  'development and career': 'development_and_career',
  'manager effectiveness':  'manager_effectiveness',
  'onboarding':             'onboarding',
  'overall':                'overall',
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/hypothesis/test — parse → z-test → interpret → save (18.2, 18.11, 20.5)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/test', async (req, res) => {
  try {
    const { hypothesis_text, filters = {}, alpha = 0.05 } = req.body;

    const units     = read('responses.json');
    const questions = read('questions.json');

    // ── Step 1: LLM parses hypothesis → structured test parameters ──
    const parsePrompt = `You are a statistical analysis engine for HR survey data.
Parse this hypothesis into structured test parameters.

Available survey fields: ${questions.map(q => q.id + ': ' + q.short_label).join(', ')}
Available demographic fields: business, generation, gender, job_level, tenure, country, is_manager, abglp

Hypothesis: "${hypothesis_text}"

Return ONLY a JSON object — no explanation, no markdown:
{
  "h0": "<null hypothesis text>",
  "h1": "<alternative hypothesis text>",
  "test_type": "one_sample_z",
  "variable": "<field name to measure>",
  "group_filter": { "dimension": "<field>", "operator": "eq|gte|lte", "value": "<val>" },
  "hypothesized_mean": <number or null>,
  "threshold": <number or null>,
  "direction": "greater" | "less" | "two_tailed",
  "parseable": true,
  "parse_error": null
}`;

    let params;
    try {
      params = await callLLMJson([{ role: 'user', content: parsePrompt }], 400);
    } catch (e) {
      return res.json({
        success: false,
        error: 'LLM parse failed: ' + e.message,
        suggestion: 'Try: "Employees who rate Career Growth high have higher Engagement scores than average."'
      });
    }

    if (!params.parseable) {
      return res.json({
        success: false,
        error: params.parse_error || 'Could not parse hypothesis',
        suggestion: 'Try: "Employees who rate X high have higher Y scores than those who rate it low."'
      });
    }

    // ── Step 2: Run z-test on real data ──
    let testGroup = [...units];

    if (params.group_filter) {
      const f = params.group_filter;
      testGroup = testGroup.filter(u => {
        const val = u[f.dimension];
        if (f.operator === 'eq')  return String(val) === String(f.value);
        if (f.operator === 'gte') return parseFloat(val) >= parseFloat(f.value);
        if (f.operator === 'lte') return parseFloat(val) <= parseFloat(f.value);
        return true;
      });
    }

    if (filters.business    && filters.business    !== 'All') testGroup = testGroup.filter(u => u.business    === filters.business);
    if (filters.generation  && filters.generation  !== 'All') testGroup = testGroup.filter(u => u.generation  === filters.generation);
    if (filters.gender      && filters.gender      !== 'All') testGroup = testGroup.filter(u => u.gender      === filters.gender);
    if (filters.job_level   && filters.job_level   !== 'All') testGroup = testGroup.filter(u => u.job_level   === filters.job_level);
    if (filters.tenure      && filters.tenure      !== 'All') testGroup = testGroup.filter(u => u.tenure      === filters.tenure);

    // Map variable name → real field key (DATA_REALITY_UPDATE §8)
    const rawKey  = (params.variable || '').toLowerCase().trim();
    const scoreKey = VARIABLE_MAP[rawKey] || rawKey.replace(/ /g, '_');

    // Score access: check nested scores first (for OP IDs), then flat field, then overall (20.5)
    const scores = testGroup
      .map(u => u.scores?.[params.variable] || u[scoreKey] || u.overall || 0)
      .filter(v => v > 0);

    const sampleMean = mean(scores);
    const sampleStd  = stdDev(scores);
    const n          = scores.length;
    const popMean    = params.hypothesized_mean || params.threshold || 3.5;

    if (n < 30) {
      return res.json({
        success: false,
        error: `Sample too small (n=${n}). Need at least 30 responses to run a valid z-test.`
      });
    }

    const zResult = oneSampleZTest(sampleMean, popMean, sampleStd, n);
    const verdict = zResult.significant
      ? (params.direction === 'less' ? zResult.z < 0 : zResult.z > 0)
      : false;

    const result = {
      verdict:      verdict ? 'validated' : (zResult.significant ? 'rejected' : 'inconclusive'),
      z:            zResult.z,
      p_value:      params.direction === 'two_tailed' ? zResult.p_two_tailed : zResult.p_one_tailed,
      critical_z:   alpha === 0.05 ? 1.645 : 2.326,
      alpha,
      decision:     zResult.decision,
      sample_mean:  parseFloat(sampleMean.toFixed(2)),
      pop_mean:     popMean,
      std_dev:      parseFloat(sampleStd.toFixed(2)),
      n,
      h0:           params.h0,
      h1:           params.h1,
      test_type:    'One-tailed Z-Test (' + (params.direction === 'less' ? 'Less than' : 'Greater than') + ')',
      curve_data: {
        z_stat:     zResult.z,
        critical_z: alpha === 0.05 ? 1.645 : 2.326,
        p_value:    params.direction === 'two_tailed' ? zResult.p_two_tailed : zResult.p_one_tailed
      },
      working: {
        formula:    'Z = (X̄ − μ₀) / (σ / √n)',
        x_bar:      parseFloat(sampleMean.toFixed(2)),
        mu_0:       popMean,
        sigma:      parseFloat(sampleStd.toFixed(2)),
        sqrt_n:     parseFloat(Math.sqrt(n).toFixed(3)),
        se:         parseFloat((sampleStd / Math.sqrt(n)).toFixed(3)),
        numerator:  parseFloat((sampleMean - popMean).toFixed(2)),
        z_computed: zResult.z
      }
    };

    // ── Step 3: LLM plain English interpretation ──
    try {
      const interpPrompt = `You are an HR analytics expert. Write a 1-sentence plain English interpretation of this z-test result for an HR director.

p(z) = ${result.p_value}, alpha = ${alpha}, verdict = ${result.verdict}, z = ${result.z}
Hypothesis: "${hypothesis_text}"

Return ONLY a JSON object: { "interpretation": "<one sentence>" }`;

      const interpData = await callLLMJson([{ role: 'user', content: interpPrompt }], 150);
      result.interpretation = interpData.interpretation || '';
    } catch {
      result.interpretation = `${result.verdict === 'validated' ? 'The data supports' : result.verdict === 'rejected' ? 'The data does not support' : 'The evidence is inconclusive for'} the hypothesis (z = ${result.z}, p = ${result.p_value}).`;
    }

    // ── Step 4: Save to hypothesis history — timestamp ID (18.11) ──
    const historyPath = path.join(DATA_DIR, 'hypotheses.json');
    let history = [];
    try { history = JSON.parse(fs.readFileSync(historyPath, 'utf8')); } catch {}

    const nextId = 'H-' + Date.now();
    history.unshift({
      id:              nextId,
      hypothesis:      hypothesis_text,
      result:          result.verdict,
      z:               result.z,
      p_value:         result.p_value,
      alpha,
      filters_applied: filters,
      date_tested:     new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      params
    });

    fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));

    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/hypothesis/templates
// ─────────────────────────────────────────────────────────────────────────────
router.get('/templates', (req, res) => {
  res.json({
    templates: [
      { id: 'T-001', text: 'Employees who rate Career Growth Opportunities high (score ≥ 4) have higher Engagement scores than the group average.' },
      { id: 'T-002', text: 'People Managers (is_manager = Yes) have higher trust in Leadership than individual contributors.' },
      { id: 'T-003', text: 'Gen Z employees have higher Onboarding scores than the company average.' },
      { id: 'T-004', text: 'New Joiners (0-2 years tenure) have lower Performance Culture scores than employees with 5+ years.' },
      { id: 'T-005', text: 'Female employees rate Manager Effectiveness higher than the group average.' },
    ]
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/hypothesis/history — paginated history
// ─────────────────────────────────────────────────────────────────────────────
router.get('/history', (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    const historyPath = path.join(DATA_DIR, 'hypotheses.json');
    let history = [];
    try { history = JSON.parse(fs.readFileSync(historyPath, 'utf8')); } catch {}

    res.json({
      total: history.length,
      items: history.slice(parseInt(offset), parseInt(offset) + parseInt(limit))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/hypothesis/history/:id — single result by ID (15.10)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/history/:id', (req, res) => {
  try {
    const historyPath = path.join(DATA_DIR, 'hypotheses.json');
    let history = [];
    try { history = JSON.parse(fs.readFileSync(historyPath, 'utf8')); } catch {}

    const item = history.find(h => h.id === req.params.id);
    if (!item) return res.status(404).json({ error: 'Hypothesis not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/hypothesis/history/:id
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/history/:id', (req, res) => {
  try {
    const historyPath = path.join(DATA_DIR, 'hypotheses.json');
    let history = [];
    try { history = JSON.parse(fs.readFileSync(historyPath, 'utf8')); } catch {}
    history = history.filter(h => h.id !== req.params.id);
    fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
