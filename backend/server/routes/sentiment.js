// server/routes/sentiment.js — Tab 1: Sentiment Analysis
const express = require('express');
const router  = express.Router();
const path    = require('path');
const fs      = require('fs');
const { pearsonR } = require('../lib/stats');
const { callLLMJson } = require('../lib/llm');

const DATA_DIR = path.join(__dirname, '../../data');

function read(f) {
  const full   = path.join(DATA_DIR, f);
  const sample = path.join(DATA_DIR, 'sample', f);
  try { return JSON.parse(fs.readFileSync(full, 'utf8')); } catch {}
  try { return JSON.parse(fs.readFileSync(sample, 'utf8')); } catch {}
  return f === 'sentiments.json' ? { responses: [] } : [];
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/sentiment/overview
// ─────────────────────────────────────────────────────────────────────────────
router.get('/overview', (req, res) => {
  try {
    const sentiments = read('sentiments.json');
    const { business_unit, department, location, tenure, job_level, include_inactive = 'No' } = req.query;

    let filtered = sentiments.responses;
    if (include_inactive === 'No') filtered = filtered.filter(r => r.is_active !== false);
    if (business_unit && business_unit !== 'All') filtered = filtered.filter(r => r.business_unit === business_unit);
    if (department    && department    !== 'All') filtered = filtered.filter(r => r.department   === department);
    if (location      && location      !== 'All') filtered = filtered.filter(r => r.location     === location);
    if (tenure        && tenure        !== 'All') filtered = filtered.filter(r => r.tenure       === tenure);
    if (job_level     && job_level     !== 'All') filtered = filtered.filter(r => r.job_level    === job_level);

    const total = filtered.length;
    if (total === 0) {
      return res.json({
        total: 0,
        overall_score: 0,
        distribution: {
          negative: { count: 0, pct: 0 },
          neutral:  { count: 0, pct: 0 },
          positive: { count: 0, pct: 0 }
        },
        top_topics: []
      });
    }

    const negative = filtered.filter(r => r.label === 'Negative').length;
    const neutral  = filtered.filter(r => r.label === 'Neutral').length;
    const positive = filtered.filter(r => r.label === 'Positive').length;
    const avgScore = parseFloat((filtered.reduce((s, r) => s + r.score, 0) / total).toFixed(2));

    const topicMap = {};
    for (const r of filtered) {
      for (const topic of (r.topics || [])) {
        if (!topicMap[topic]) topicMap[topic] = { count: 0, totalScore: 0 };
        topicMap[topic].count++;
        topicMap[topic].totalScore += r.score;
      }
    }

    const topics = Object.entries(topicMap)
      .map(([topic, d]) => ({
        topic,
        pct_of_responses: parseFloat(((d.count / total) * 100).toFixed(1)),
        sentiment_score:  parseFloat((d.totalScore / d.count).toFixed(2)),
        trend: d.totalScore / d.count > 0 ? 'up' : 'down'
      }))
      .sort((a, b) => b.pct_of_responses - a.pct_of_responses);

    res.json({
      total,
      overall_score: avgScore,
      distribution: {
        negative: { count: negative, pct: parseFloat(((negative / total) * 100).toFixed(1)) },
        neutral:  { count: neutral,  pct: parseFloat(((neutral  / total) * 100).toFixed(1)) },
        positive: { count: positive, pct: parseFloat(((positive / total) * 100).toFixed(1)) }
      },
      top_topics: topics.slice(0, 10)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/sentiment/over-time — respects all filters (20.1)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/over-time', (req, res) => {
  try {
    const sentiments = read('sentiments.json');
    const { granularity = 'monthly', business_unit, department, location, tenure, job_level, include_inactive = 'No' } = req.query;

    let responses = sentiments.responses;
    if (include_inactive === 'No')                    responses = responses.filter(r => r.is_active !== false);
    if (business_unit && business_unit !== 'All')      responses = responses.filter(r => r.business_unit === business_unit);
    if (department    && department    !== 'All')      responses = responses.filter(r => r.department   === department);
    if (location      && location      !== 'All')      responses = responses.filter(r => r.location     === location);
    if (tenure        && tenure        !== 'All')      responses = responses.filter(r => r.tenure       === tenure);
    if (job_level     && job_level     !== 'All')      responses = responses.filter(r => r.job_level    === job_level);

    const monthly = {};
    for (const r of responses) {
      const key = r.month || 'Unknown';
      if (!monthly[key]) monthly[key] = [];
      monthly[key].push(r.score);
    }

    const trend = Object.entries(monthly).map(([month, scores]) => ({
      month,
      positive_score: parseFloat((scores.filter(s => s > 0.2).length  / scores.length).toFixed(2)),
      negative_score: parseFloat((scores.filter(s => s < -0.2).length / scores.length).toFixed(2)),
      avg_score:      parseFloat((scores.reduce((a, b) => a + b, 0)   / scores.length).toFixed(2))
    }));

    res.json({ trend, granularity, total_filtered: responses.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/sentiment/samples — paginated (15.3 + 18.8)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/samples', (req, res) => {
  try {
    const sentiments = read('sentiments.json');
    const { label, limit = 3, page = 1, include_inactive = 'No' } = req.query;
    const lim = parseInt(limit);
    const pg  = parseInt(page);

    let filtered = sentiments.responses;
    if (include_inactive === 'No') filtered = filtered.filter(r => r.is_active !== false);
    if (label) filtered = filtered.filter(r => r.label === label);

    const total  = filtered.length;
    const offset = (pg - 1) * lim;
    const samples = filtered
      .slice(offset, offset + lim)
      .map(r => ({ text: r.text, score: r.score, label: r.label }));

    res.json({ samples, total, label, page: pg, pages: Math.ceil(total / lim) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/sentiment/validate-statistical — dynamic Pearson (DATA_REALITY_UPDATE §15)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/validate-statistical', async (req, res) => {
  try {
    const sentiments = read('sentiments.json');
    const responses  = read('responses.json');
    const questions  = read('questions.json');

    // OP1 = engagement anchor question
    const BASE_QUESTION = 'OP1';

    // Representative question per sentiment topic — verified against real Excel columns
    const CATEGORY_REPS = {
      'Career Growth': 'OP32',  // I feel my career goals are being met
      'Recognition':   'OP21',  // My contributions have been recognized
      'Leadership':    'OP5',   // Senior Leaders are approachable
      'Compensation':  'OP22',  // I am paid fairly for my work
      'Wellbeing':     'OP24',  // Health & wellbeing offerings meet my needs
    };

    const baseScores = responses
      .map(r => r.scores?.[BASE_QUESTION])
      .filter(v => v != null && !isNaN(v));

    const computedStats = Object.entries(CATEGORY_REPS).map(([driver, opId]) => {
      const otherScores = responses
        .map(r => r.scores?.[opId])
        .filter(v => v != null && !isNaN(v));

      const len      = Math.min(baseScores.length, otherScores.length);
      const r        = len >= 10 ? pearsonR(baseScores.slice(0, len), otherScores.slice(0, len)) : 0;
      const absR     = Math.abs(r);
      const strength = absR >= 0.5 ? 'Strong' : absR >= 0.2 ? 'Moderate' : 'Weak';
      const direction = r >= 0 ? 'positive' : 'negative';
      const q = questions.find(q => q.id === opId);

      return {
        driver,
        question: q?.text || opId,
        r_value:  r,
        finding:  `${strength} ${direction} impact on Engagement (r = ${r})`
      };
    });

    const topicMap = {};
    for (const r of sentiments.responses) {
      for (const topic of (r.topics || [])) {
        if (!topicMap[topic]) topicMap[topic] = [];
        topicMap[topic].push(r.score);
      }
    }

    if (Object.keys(topicMap).length === 0) {
      return res.json({
        validation: [],
        message: 'No sentiment data available yet. Run sentiment classification first.'
      });
    }

    const topicSentiments = Object.entries(topicMap).map(([topic, scores]) => ({
      topic,
      avg_sentiment: parseFloat((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2))
    }));

    const prompt = `You are an HR analytics expert.
Compare NLP sentiment findings from open-text employee responses against
real statistical Pearson correlation findings computed from survey data.

For each driver, determine if what employees say in text aligns with what the numbers show statistically.

Topic sentiment from NLP open-text analysis:
${JSON.stringify(topicSentiments)}

Statistical correlations (computed dynamically from real uploaded data):
${JSON.stringify(computedStats)}

Return ONLY a JSON object with key "validation" containing an array, no explanation, no markdown:
{ "validation": [{
  "driver": "<name>",
  "statistical_finding": "<one sentence>",
  "r_value": <number>,
  "sentiment_alignment": "Consistent" | "Partially Consistent" | "Not Consistent",
  "validation_score": <integer 0-100>,
  "reasoning": "<one sentence explaining the alignment judgment>"
}] }`;

    const data = await callLLMJson([{ role: 'user', content: prompt }], 800);
    res.json({ validation: data.validation || data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/sentiment/classify — batch classify open-text responses (15.1)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/classify', async (req, res) => {
  try {
    const { responses } = req.body;
    const { classifyBatch } = require('../lib/nlp');
    const BATCH_SIZE = 20;
    const results = [];

    for (let i = 0; i < responses.length; i += BATCH_SIZE) {
      const batch      = responses.slice(i, i + BATCH_SIZE);
      const classified = await classifyBatch(batch);
      classified.forEach((c, idx) => {
        results.push({ ...batch[idx], ...c });
      });
    }

    fs.writeFileSync(
      path.join(DATA_DIR, 'sentiments.json'),
      JSON.stringify({ responses: results }, null, 2)
    );

    res.json({ success: true, classified: results.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
