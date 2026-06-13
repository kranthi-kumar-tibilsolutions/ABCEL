# ABG Employee Engagement Intelligence — Phase 2: Four New Tabs
## Backend Build Guide for Claude Code

> **Goal:** Add four new analytical tabs to the existing ABG EEI dashboard. These are: Sentiment Analysis, Statistical Analysis, Dynamic Persona Builder, and Hypothesis Testing. This document covers backend only — frontend team handles UI. Match the exact patterns from `ABG_EEI_COMPLETE_BUILD.md`.

---

## 1. Overview of New Tabs

| Tab | Route | What it does |
|---|---|---|
| Sentiment Analysis | `/sentiment-analysis` | NLP on open-text survey responses — topics, sentiment scores, trend over time |
| Statistical Analysis | `/statistical-analysis` | Pearson correlation between every survey question pair |
| Dynamic Persona Builder | `/persona-builder` | Build custom cohorts with filters, compare via z-test against other cohorts |
| Hypothesis Testing | `/hypothesis-testing` | User types hypothesis in natural language, backend runs z-test, returns full workings |

---

## 2. New Files to Create

```
server/routes/sentiment.js        # Tab 1 — all sentiment endpoints
server/routes/statistical.js      # Tab 2 — all correlation endpoints
server/routes/persona.js          # Tab 3 — all persona endpoints
server/routes/hypothesis.js       # Tab 4 — all hypothesis endpoints
server/lib/stats.js               # Shared stats functions (Pearson, z-test, p-value)
server/lib/nlp.js                 # Sentiment classification + topic extraction
preprocess/sentiment_extract.py   # One-time: extract open-text columns from Excel
data/sample/questions.json        # All survey questions with IDs and text
data/sample/responses.json        # Raw responses per question per employee (sampled)
data/sample/sentiments.json       # Pre-computed sentiment per open-text response
data/sample/hypotheses.json       # Saved hypothesis history (persistent)
```

Add to `server/index.js`:
```javascript
app.use('/api/sentiment',    require('./routes/sentiment'));
app.use('/api/statistical',  require('./routes/statistical'));
app.use('/api/persona',      require('./routes/persona'));
app.use('/api/hypothesis',   require('./routes/hypothesis'));
```

---

## 3. Shared Statistics Library — `server/lib/stats.js`

All four tabs use the same statistical functions. Build this first.

```javascript
// server/lib/stats.js

/**
 * Pearson correlation coefficient between two arrays
 * Returns r value between -1 and +1
 */
function pearsonR(x, y) {
  const n = x.length;
  if (n !== y.length || n === 0) return 0;
  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;
  const num = x.reduce((sum, xi, i) => sum + (xi - meanX) * (y[i] - meanY), 0);
  const denX = Math.sqrt(x.reduce((sum, xi) => sum + Math.pow(xi - meanX, 2), 0));
  const denY = Math.sqrt(y.reduce((sum, yi) => sum + Math.pow(yi - meanY, 2), 0));
  if (denX === 0 || denY === 0) return 0;
  return parseFloat((num / (denX * denY)).toFixed(4));
}

/**
 * P-value from Pearson r and sample size n
 * Uses t-distribution approximation
 * Returns two-tailed p-value
 */
function pearsonPValue(r, n) {
  if (n < 3) return 1;
  const t = r * Math.sqrt((n - 2) / (1 - r * r));
  // Approximation using normal distribution for large n
  const p = 2 * (1 - normalCDF(Math.abs(t)));
  return parseFloat(p.toFixed(4));
}

/**
 * Correlation strength label
 */
function correlationStrength(r) {
  const abs = Math.abs(r);
  if (abs >= 0.5)  return r > 0 ? 'Strong +' : 'Strong -';
  if (abs >= 0.2)  return r > 0 ? 'Moderate +' : 'Moderate -';
  return 'No Correlation';
}

/**
 * Correlation category for summary counts
 */
function correlationCategory(r) {
  if (r >= 0.5)              return 'strong_positive';
  if (r >= 0.2)              return 'moderate_positive';
  if (r > -0.2 && r < 0.2)  return 'weak_none';
  if (r >= -0.5)             return 'moderate_negative';
  return 'strong_negative';
}

/**
 * Two-sample z-test for means
 * Tests if mean of group A is significantly different from group B
 * Returns z statistic, p-value, significant flag
 */
function twoSampleZTest(meanA, meanB, stdA, stdB, nA, nB) {
  const se = Math.sqrt((stdA * stdA / nA) + (stdB * stdB / nB));
  if (se === 0) return { z: 0, p: 1, significant: false };
  const z = parseFloat(((meanA - meanB) / se).toFixed(4));
  const p = parseFloat((2 * (1 - normalCDF(Math.abs(z)))).toFixed(4));
  return { z, p, significant: p < 0.05 };
}

/**
 * One-sample z-test
 * Tests if sample mean is significantly different from hypothesized population mean
 */
function oneSampleZTest(sampleMean, popMean, stdDev, n) {
  const se = stdDev / Math.sqrt(n);
  if (se === 0) return { z: 0, p: 1, significant: false };
  const z = parseFloat(((sampleMean - popMean) / se).toFixed(4));
  const pOneTailed  = parseFloat((1 - normalCDF(z)).toFixed(4));
  const pTwoTailed  = parseFloat((2 * (1 - normalCDF(Math.abs(z)))).toFixed(4));
  return {
    z,
    p_one_tailed: pOneTailed,
    p_two_tailed: pTwoTailed,
    critical_z_05: 1.645,
    significant: pOneTailed < 0.05,
    decision: pOneTailed < 0.05 ? 'Reject H₀' : 'Fail to reject H₀'
  };
}

/**
 * Normal CDF approximation (Hart algorithm)
 */
function normalCDF(x) {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return 0.5 * (1.0 + sign * y);
}

/**
 * Compute mean of array
 */
function mean(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

/**
 * Compute standard deviation of array
 */
function stdDev(arr) {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return Math.sqrt(arr.reduce((sum, v) => sum + Math.pow(v - m, 2), 0) / arr.length);
}

/**
 * Statistical significance badge
 * Returns star flag and confidence level
 */
function significanceBadge(p) {
  if (p < 0.001) return { significant: true, confidence: 99.9, label: '***' };
  if (p < 0.01)  return { significant: true, confidence: 99,   label: '**' };
  if (p < 0.05)  return { significant: true, confidence: 95,   label: '*' };
  return { significant: false, confidence: null, label: 'ns' };
}

module.exports = {
  pearsonR, pearsonPValue, correlationStrength, correlationCategory,
  twoSampleZTest, oneSampleZTest, normalCDF, mean, stdDev, significanceBadge
};
```

---

## 4. NLP Library — `server/lib/nlp.js`

Used only by Tab 1 (Sentiment Analysis). Handles sentiment scoring of free text.

```javascript
// server/lib/nlp.js
// Uses Cerebras for intelligent sentiment + topic analysis
// Pre-computes on upload, caches to sentiments.json

const path = require('path');
const fs   = require('fs');
const Cerebras = require('@cerebras/cerebras_cloud_sdk');

const client = new Cerebras({ apiKey: process.env.CEREBRAS_API_KEY });
const DATA_DIR = path.join(__dirname, '../../data');

/**
 * Classify sentiment of a batch of text responses
 * Returns score -1 (very negative) to +1 (very positive)
 * Calls Cerebras in batches of 20 to keep latency manageable
 */
async function classifyBatch(responses) {
  const prompt = `You are a sentiment analysis engine for employee survey responses.
Classify each response. Return ONLY a JSON array — no explanation, no markdown.
Each item: { "id": <number>, "score": <float -1 to 1>, "label": "Negative"|"Neutral"|"Positive", "topics": [<string>] }
Topics must come from this fixed list: Workload, Career Growth, Work Life Balance, Leadership, Recognition, Compensation, Communication, Resources, Company Values, Management, Teamwork, Flexibility, Opportunities, Benefits, Culture.
Pick 1-3 most relevant topics per response.

Responses:
${responses.map((r, i) => `${i + 1}. "${r.text}"`).join('\n')}`;

  const res = await client.chat.completions.create({
    model: process.env.CEREBRAS_MODEL || 'llama-3.3-70b',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }]
  });

  const raw = res.choices[0].message.content.replace(/```json|```/g, '').trim();
  return JSON.parse(raw);
}

/**
 * Extract and aggregate topics from all classified responses
 * Returns topic summary with counts and avg sentiment per topic
 */
function aggregateTopics(classifiedResponses) {
  const topicMap = {};

  for (const r of classifiedResponses) {
    for (const topic of (r.topics || [])) {
      if (!topicMap[topic]) {
        topicMap[topic] = { count: 0, totalScore: 0, scores: [] };
      }
      topicMap[topic].count++;
      topicMap[topic].totalScore += r.score;
      topicMap[topic].scores.push(r.score);
    }
  }

  const total = classifiedResponses.length;
  return Object.entries(topicMap)
    .map(([topic, data]) => ({
      topic,
      count: data.count,
      pct_of_responses: parseFloat(((data.count / total) * 100).toFixed(1)),
      sentiment_score: parseFloat((data.totalScore / data.count).toFixed(2)),
      trend: data.scores[data.scores.length - 1] > data.scores[0] ? 'up' : 'down'
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Generate sentiment over time from monthly bucketed responses
 * Returns array of { month, positive_score, negative_score, neutral_score }
 */
function sentimentOverTime(classifiedResponses) {
  // Group by month using created_at or survey_date field
  const monthly = {};
  for (const r of classifiedResponses) {
    const month = r.month || 'Unknown';
    if (!monthly[month]) monthly[month] = [];
    monthly[month].push(r.score);
  }
  return Object.entries(monthly).map(([month, scores]) => ({
    month,
    avg_score: parseFloat((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2))
  }));
}

module.exports = { classifyBatch, aggregateTopics, sentimentOverTime };
```

---

## 5. Tab 1 — Sentiment Analysis Routes — `server/routes/sentiment.js`

```javascript
// server/routes/sentiment.js
const express  = require('express');
const router   = express.Router();
const path     = require('path');
const fs       = require('fs');
const Cerebras = require('@cerebras/cerebras_cloud_sdk');
const { mean, stdDev, pearsonR } = require('../lib/stats');

const client   = new Cerebras({ apiKey: process.env.CEREBRAS_API_KEY });
const DATA_DIR = path.join(__dirname, '../../data');
function read(f) { return JSON.parse(fs.readFileSync(path.join(DATA_DIR, f))); }

// ─────────────────────────────────────────────
// GET /api/sentiment/overview
// Returns: overall score, distribution counts, top topics
// Filters: business_unit, department, location, tenure, job_level
// ─────────────────────────────────────────────
router.get('/overview', (req, res) => {
  try {
    const sentiments = read('sentiments.json');
    const { business_unit, department, location, tenure, job_level } = req.query;

    // Apply filters
    let filtered = sentiments.responses;
    if (business_unit && business_unit !== 'All')
      filtered = filtered.filter(r => r.business_unit === business_unit);
    if (department && department !== 'All')
      filtered = filtered.filter(r => r.department === department);
    if (location && location !== 'All')
      filtered = filtered.filter(r => r.location === location);
    if (tenure && tenure !== 'All')
      filtered = filtered.filter(r => r.tenure === tenure);
    if (job_level && job_level !== 'All')
      filtered = filtered.filter(r => r.job_level === job_level);

    const total = filtered.length;
    const negative = filtered.filter(r => r.label === 'Negative').length;
    const neutral  = filtered.filter(r => r.label === 'Neutral').length;
    const positive = filtered.filter(r => r.label === 'Positive').length;
    const avgScore = parseFloat((filtered.reduce((s, r) => s + r.score, 0) / total).toFixed(2));

    // Aggregate topics
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
        negative: { count: negative, pct: parseFloat(((negative/total)*100).toFixed(1)) },
        neutral:  { count: neutral,  pct: parseFloat(((neutral/total)*100).toFixed(1)) },
        positive: { count: positive, pct: parseFloat(((positive/total)*100).toFixed(1)) }
      },
      top_topics: topics.slice(0, 10)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// GET /api/sentiment/over-time
// Returns: monthly sentiment trend { month, avg_score }
// Query: granularity = monthly | quarterly
// ─────────────────────────────────────────────
router.get('/over-time', (req, res) => {
  try {
    const sentiments = read('sentiments.json');
    const { granularity = 'monthly' } = req.query;

    const monthly = {};
    for (const r of sentiments.responses) {
      const key = r.month || 'Unknown';
      if (!monthly[key]) monthly[key] = [];
      monthly[key].push(r.score);
    }

    const trend = Object.entries(monthly).map(([month, scores]) => ({
      month,
      positive_score: parseFloat((scores.filter(s => s > 0.2).length / scores.length).toFixed(2)),
      negative_score: parseFloat((scores.filter(s => s < -0.2).length / scores.length).toFixed(2)),
      avg_score:      parseFloat((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2))
    }));

    res.json({ trend, granularity });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// GET /api/sentiment/samples
// Returns: sample responses per sentiment label
// Query: label = Negative | Neutral | Positive, limit = 3
// ─────────────────────────────────────────────
router.get('/samples', (req, res) => {
  try {
    const sentiments = read('sentiments.json');
    const { label, limit = 3 } = req.query;

    const filtered = label
      ? sentiments.responses.filter(r => r.label === label)
      : sentiments.responses;

    const samples = filtered
      .sort(() => Math.random() - 0.5)
      .slice(0, parseInt(limit))
      .map(r => ({ text: r.text, score: r.score, label: r.label }));

    res.json({ samples, total: filtered.length, label });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// GET /api/sentiment/validate-statistical
// Cross-validates NLP sentiment findings against Pearson statistical findings
// Returns: validation table with consistency scores
// This uses Cerebras to reason about alignment between text sentiment and stats
// ─────────────────────────────────────────────
router.get('/validate-statistical', async (req, res) => {
  try {
    const sentiments  = read('sentiments.json');
    const businesses  = read('businesses.json');

    // Build topic sentiment summary
    const topicMap = {};
    for (const r of sentiments.responses) {
      for (const topic of (r.topics || [])) {
        if (!topicMap[topic]) topicMap[topic] = [];
        topicMap[topic].push(r.score);
      }
    }

    const topicSentiments = Object.entries(topicMap).map(([topic, scores]) => ({
      topic,
      avg_sentiment: parseFloat((scores.reduce((a,b)=>a+b,0)/scores.length).toFixed(2))
    }));

    // Build known statistical correlations (from businesses data)
    const knownStats = [
      { driver: 'Workload',      r: -0.62, finding: 'Strong negative impact on Engagement' },
      { driver: 'Career Growth', r: 0.58,  finding: 'Strong positive impact on Engagement' },
      { driver: 'Recognition',   r: 0.33,  finding: 'Moderate positive impact on Engagement' },
      { driver: 'Leadership',    r: 0.71,  finding: 'Strong positive impact on Engagement' },
      { driver: 'Compensation',  r: -0.26, finding: 'Moderate impact on Engagement' }
    ];

    // Ask Cerebras to judge alignment
    const prompt = `You are an HR analytics expert. 
Compare the NLP sentiment findings from open-text responses against statistical correlation findings.
For each driver, determine if the text sentiment aligns with the statistical finding.

Topic sentiment from NLP: ${JSON.stringify(topicSentiments)}
Statistical correlations: ${JSON.stringify(knownStats)}

Return ONLY a JSON array — no explanation, no markdown:
[{
  "driver": "<name>",
  "statistical_finding": "<text>",
  "r_value": <number>,
  "sentiment_alignment": "Consistent" | "Partially Consistent" | "Not Consistent",
  "validation_score": <integer 0-100>,
  "reasoning": "<one sentence>"
}]`;

    const response = await client.chat.completions.create({
      model: process.env.CEREBRAS_MODEL || 'llama-3.3-70b',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }]
    });

    const raw = response.choices[0].message.content.replace(/```json|```/g, '').trim();
    res.json({ validation: JSON.parse(raw) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
```

---

## 6. Tab 2 — Statistical Analysis Routes — `server/routes/statistical.js`

```javascript
// server/routes/statistical.js
const express = require('express');
const router  = express.Router();
const path    = require('path');
const fs      = require('fs');
const Cerebras = require('@cerebras/cerebras_cloud_sdk');
const {
  pearsonR, pearsonPValue,
  correlationStrength, correlationCategory
} = require('../lib/stats');

const client   = new Cerebras({ apiKey: process.env.CEREBRAS_API_KEY });
const DATA_DIR = path.join(__dirname, '../../data');
function read(f) { return JSON.parse(fs.readFileSync(path.join(DATA_DIR, f))); }

// ─────────────────────────────────────────────
// GET /api/statistical/questions
// Returns: list of all survey questions with IDs
// Used to populate the "Select a Question" dropdown
// ─────────────────────────────────────────────
router.get('/questions', (req, res) => {
  try {
    const questions = read('questions.json');
    res.json({ questions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// GET /api/statistical/correlations/:questionId
// Returns full correlation table for one selected question vs all others
// Includes: Pearson r, p-value, strength label, significance
// Filters: business, year, country, department
// ─────────────────────────────────────────────
router.get('/correlations/:questionId', (req, res) => {
  try {
    const { questionId } = req.params;
    const { business, year, country, department } = req.query;

    const responses  = read('responses.json');
    const questions  = read('questions.json');

    // Apply filters to responses
    let filtered = responses;
    if (business   && business   !== 'All') filtered = filtered.filter(r => r.business   === business);
    if (year       && year       !== 'All') filtered = filtered.filter(r => r.year       === year);
    if (country    && country    !== 'All') filtered = filtered.filter(r => r.country    === country);
    if (department && department !== 'All') filtered = filtered.filter(r => r.department === department);

    // Get score arrays for selected question
    const baseScores = filtered.map(r => r.scores[questionId]).filter(v => v != null);
    const n = baseScores.length;

    // Compute Pearson r against every other question
    const correlations = questions
      .filter(q => q.id !== questionId)
      .map(q => {
        const otherScores = filtered.map(r => r.scores[q.id]).filter(v => v != null);
        // Align arrays to same length
        const len = Math.min(baseScores.length, otherScores.length);
        const r = pearsonR(baseScores.slice(0, len), otherScores.slice(0, len));
        const p = pearsonPValue(r, len);
        return {
          question_id:   q.id,
          question_text: q.text,
          pearson_r:     r,
          p_value:       p,
          strength:      correlationStrength(r),
          category:      correlationCategory(r),
          significant:   p < 0.05
        };
      })
      .sort((a, b) => Math.abs(b.pearson_r) - Math.abs(a.pearson_r));

    // Summary counts by category
    const summary = {
      strong_positive:   correlations.filter(c => c.category === 'strong_positive').length,
      moderate_positive: correlations.filter(c => c.category === 'moderate_positive').length,
      weak_none:         correlations.filter(c => c.category === 'weak_none').length,
      negative:          correlations.filter(c => c.category === 'moderate_negative' || c.category === 'strong_negative').length
    };

    res.json({
      question_id:    questionId,
      question_text:  questions.find(q => q.id === questionId)?.text || '',
      n,
      summary,
      correlations
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// GET /api/statistical/correlogram/:questionId
// Returns NxN matrix of Pearson r values for top N related questions
// Used to render the heatmap correlogram
// Query: top = 20 (default)
// ─────────────────────────────────────────────
router.get('/correlogram/:questionId', (req, res) => {
  try {
    const { questionId } = req.params;
    const { top = 20, business, year, country, department } = req.query;
    const topN = parseInt(top);

    const responses = read('responses.json');
    const questions = read('questions.json');

    let filtered = responses;
    if (business   && business   !== 'All') filtered = filtered.filter(r => r.business   === business);
    if (year       && year       !== 'All') filtered = filtered.filter(r => r.year       === year);
    if (country    && country    !== 'All') filtered = filtered.filter(r => r.country    === country);
    if (department && department !== 'All') filtered = filtered.filter(r => r.department === department);

    // First get top N most correlated questions
    const baseScores = filtered.map(r => r.scores[questionId]).filter(v => v != null);

    const ranked = questions
      .filter(q => q.id !== questionId)
      .map(q => {
        const scores = filtered.map(r => r.scores[q.id]).filter(v => v != null);
        const len = Math.min(baseScores.length, scores.length);
        return { id: q.id, r: Math.abs(pearsonR(baseScores.slice(0,len), scores.slice(0,len))) };
      })
      .sort((a, b) => b.r - a.r)
      .slice(0, topN);

    const topIds = [questionId, ...ranked.map(r => r.id)];

    // Build full NxN matrix
    const matrix = topIds.map(idA => {
      return topIds.map(idB => {
        if (idA === idB) return 1.0;
        const scoresA = filtered.map(r => r.scores[idA]).filter(v => v != null);
        const scoresB = filtered.map(r => r.scores[idB]).filter(v => v != null);
        const len = Math.min(scoresA.length, scoresB.length);
        return pearsonR(scoresA.slice(0,len), scoresB.slice(0,len));
      });
    });

    res.json({
      question_ids: topIds,
      question_labels: topIds.map(id => questions.find(q => q.id === id)?.short_label || id),
      matrix
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// GET /api/statistical/network/:questionId
// Returns node + edge data for the relationship network graph
// Query: top = 25
// ─────────────────────────────────────────────
router.get('/network/:questionId', (req, res) => {
  try {
    const { questionId } = req.params;
    const { top = 25, business, year, country, department } = req.query;
    const topN = parseInt(top);

    const responses = read('responses.json');
    const questions = read('questions.json');

    let filtered = responses;
    if (business   && business   !== 'All') filtered = filtered.filter(r => r.business   === business);
    if (year       && year       !== 'All') filtered = filtered.filter(r => r.year       === year);
    if (country    && country    !== 'All') filtered = filtered.filter(r => r.country    === country);
    if (department && department !== 'All') filtered = filtered.filter(r => r.department === department);

    const baseScores = filtered.map(r => r.scores[questionId]).filter(v => v != null);

    const edges = questions
      .filter(q => q.id !== questionId)
      .map(q => {
        const scores = filtered.map(r => r.scores[q.id]).filter(v => v != null);
        const len = Math.min(baseScores.length, scores.length);
        const r = pearsonR(baseScores.slice(0,len), scores.slice(0,len));
        return {
          source: questionId,
          target: q.id,
          r,
          strength:  correlationStrength(r),
          direction: r > 0 ? 'positive' : 'negative',
          thickness: Math.abs(r)
        };
      })
      .filter(e => Math.abs(e.r) >= 0.2)
      .sort((a, b) => Math.abs(b.r) - Math.abs(a.r))
      .slice(0, topN);

    const nodeIds = new Set([questionId, ...edges.map(e => e.target)]);
    const nodes = Array.from(nodeIds).map(id => ({
      id,
      label: questions.find(q => q.id === id)?.short_label || id,
      is_center: id === questionId
    }));

    res.json({ nodes, edges });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// GET /api/statistical/insights/:questionId
// Cerebras generates the "Overall Insights" summary text
// e.g. "Q12 has strongest positive correlation with Q24 (r=0.71)"
// ─────────────────────────────────────────────
router.get('/insights/:questionId', async (req, res) => {
  try {
    const { questionId } = req.params;
    const questions = read('questions.json');
    const qText = questions.find(q => q.id === questionId)?.text || questionId;

    // Get top 3 positive and negative correlations (pass from frontend or re-compute)
    const { top_positive, top_negative } = req.query;

    const prompt = `You are an HR analytics expert. Write a 2-sentence insight about these Pearson correlation findings.
Be specific with the numbers. Write in plain English for an HR director audience.

Question analysed: "${qText}"
Strongest positive correlation: ${top_positive}
Strongest negative correlation: ${top_negative}

Return ONLY a JSON object: { "insight": "<2 sentences>" }`;

    const response = await client.chat.completions.create({
      model: process.env.CEREBRAS_MODEL || 'llama-3.3-70b',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }]
    });

    const raw = response.choices[0].message.content.replace(/```json|```/g, '').trim();
    res.json(JSON.parse(raw));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
```

---

## 7. Tab 3 — Dynamic Persona Builder Routes — `server/routes/persona.js`

```javascript
// server/routes/persona.js
const express  = require('express');
const router   = express.Router();
const path     = require('path');
const fs       = require('fs');
const Cerebras = require('@cerebras/cerebras_cloud_sdk');
const { mean, stdDev, twoSampleZTest, significanceBadge } = require('../lib/stats');

const client   = new Cerebras({ apiKey: process.env.CEREBRAS_API_KEY });
const DATA_DIR = path.join(__dirname, '../../data');
function read(f) { return JSON.parse(fs.readFileSync(path.join(DATA_DIR, f))); }

// ─────────────────────────────────────────────
// POST /api/persona/query
// Core persona computation endpoint
// Input: persona filters + list of comparison cohort IDs
// Output: scores per theme for persona + each comparison cohort + z-test significance
// ─────────────────────────────────────────────
router.post('/query', (req, res) => {
  try {
    const { filters = [], comparison_cohorts = [], persona_name } = req.body;
    const units = read('units.json');

    // Filter employees by persona conditions
    // Each filter: { dimension, operator, value }
    // dimension: region | tenure | job_level | potential | function | employment_type | gender | generation
    // operator: eq | gte | lte | contains
    let personaGroup = units;
    for (const f of filters) {
      personaGroup = personaGroup.filter(u => {
        const val = u[f.dimension];
        if (val === undefined) return false;
        if (f.operator === 'eq')       return String(val) === String(f.value);
        if (f.operator === 'gte')      return parseFloat(val) >= parseFloat(f.value);
        if (f.operator === 'lte')      return parseFloat(val) <= parseFloat(f.value);
        if (f.operator === 'contains') return String(val).toLowerCase().includes(String(f.value).toLowerCase());
        return true;
      });
    }

    const themes = ['Leadership', 'Career Growth', 'Recognition', 'Work Environment', 'Wellbeing', 'Overall Rating'];

    // Compute persona scores
    const personaScores = computeGroupScores(personaGroup, themes);
    const personaN = personaGroup.length;

    // Compute overall (all employees) scores
    const overallScores = computeGroupScores(units, themes);
    const overallN = units.length;

    // Compute comparison cohort scores
    // Built-in cohorts: { id: 'new_joiners', label: 'New Joiners (<1 yr)', filter: { dimension: 'tenure', operator: 'lte', value: '1' } }
    const BUILTIN_COHORTS = {
      new_joiners:    { label: 'New Joiners (<1 yr)',  filter: { dimension: 'tenure',     operator: 'lte', value: '1' } },
      engineers_apac: { label: 'Engineers – APAC',    filter: [{ dimension: 'function',  operator: 'eq',  value: 'Engineering' }, { dimension: 'region', operator: 'eq', value: 'APAC' }] },
      senior_mgmt:    { label: 'Senior Management',   filter: { dimension: 'job_level',  operator: 'eq',  value: 'Senior' } },
      gen_z:          { label: 'Gen Z Employees',     filter: { dimension: 'generation', operator: 'eq',  value: 'Gen Z' } }
    };

    const comparisons = comparison_cohorts.map(cohortId => {
      const cohortDef = BUILTIN_COHORTS[cohortId];
      if (!cohortDef) return null;
      const cohortFilters = Array.isArray(cohortDef.filter) ? cohortDef.filter : [cohortDef.filter];
      let cohortGroup = units;
      for (const f of cohortFilters) {
        cohortGroup = cohortGroup.filter(u => {
          const val = u[f.dimension];
          if (f.operator === 'eq')  return String(val) === String(f.value);
          if (f.operator === 'lte') return parseFloat(val) <= parseFloat(f.value);
          return true;
        });
      }
      return {
        id: cohortId,
        label: cohortDef.label,
        n: cohortGroup.length,
        scores: computeGroupScores(cohortGroup, themes)
      };
    }).filter(Boolean);

    // Run two-sample z-test for each theme: persona vs overall
    const themeResults = themes.map(theme => {
      const personaMean  = personaScores[theme]?.mean || 0;
      const personaStd   = personaScores[theme]?.std  || 0;
      const overallMean  = overallScores[theme]?.mean  || 0;
      const overallStd   = overallScores[theme]?.std   || 0;

      const zResult = twoSampleZTest(personaMean, overallMean, personaStd, overallStd, personaN, overallN);
      const badge   = significanceBadge(zResult.p);

      const row = {
        theme,
        persona_score:  parseFloat(personaMean.toFixed(2)),
        overall_score:  parseFloat(overallMean.toFixed(2)),
        delta_overall:  parseFloat((personaMean - overallMean).toFixed(2)),
        p_value:        zResult.p,
        significant:    badge.significant,
        significance_label: badge.significant ? `p < ${zResult.p < 0.01 ? '0.01' : '0.05'}` : 'n.s.',
        comparisons: {}
      };

      // Also run z-test vs each comparison cohort
      for (const cohort of comparisons) {
        const cohortMean = cohort.scores[theme]?.mean || 0;
        const cohortStd  = cohort.scores[theme]?.std  || 0;
        const zC = twoSampleZTest(personaMean, cohortMean, personaStd, cohortStd, personaN, cohort.n);
        row.comparisons[cohort.id] = {
          score: parseFloat(cohortMean.toFixed(2)),
          delta: parseFloat((personaMean - cohortMean).toFixed(2)),
          p_value: zC.p,
          significant: significanceBadge(zC.p).significant
        };
      }

      return row;
    });

    // Statistical difference summary — how many themes significantly differ per cohort
    const diffSummary = {
      vs_overall: themeResults.filter(t => t.significant).length,
      vs_cohorts: {}
    };
    for (const cohort of comparisons) {
      diffSummary.vs_cohorts[cohort.id] = themeResults.filter(t => t.comparisons[cohort.id]?.significant).length;
    }

    res.json({
      persona_name: persona_name || 'Custom Persona',
      persona_n: personaN,
      themes: themeResults,
      comparisons: comparisons.map(c => ({ id: c.id, label: c.label, n: c.n })),
      diff_summary: diffSummary
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// GET /api/persona/dimensions
// Returns available filter dimensions and their possible values
// Used to populate filter dropdowns in persona builder UI
// ─────────────────────────────────────────────
router.get('/dimensions', (req, res) => {
  try {
    const units = read('units.json');
    const dims  = ['region', 'tenure', 'job_level', 'potential', 'function', 'employment_type', 'gender', 'generation'];

    const dimensions = dims.map(dim => ({
      id: dim,
      label: dim.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      values: [...new Set(units.map(u => u[dim]).filter(Boolean))].sort()
    }));

    res.json({ dimensions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// GET /api/persona/top5
// Auto-detect the 5 most statistically distinctive cohorts
// Used to show suggested personas on page load
// ─────────────────────────────────────────────
router.get('/top5', (req, res) => {
  try {
    const units = read('units.json');
    const themes = ['Leadership', 'Career Growth', 'Recognition', 'Work Environment', 'Wellbeing'];

    const dims = ['generation', 'gender', 'job_level', 'region', 'tenure', 'function'];
    const suggestions = [];

    for (const dim of dims) {
      const values = [...new Set(units.map(u => u[dim]).filter(Boolean))];
      for (const val of values) {
        const group = units.filter(u => u[dim] === val);
        if (group.length < 30) continue;

        const groupScores  = computeGroupScores(group, themes);
        const overallScores = computeGroupScores(units, themes);

        let maxDelta = 0;
        let maxTheme = '';
        for (const theme of themes) {
          const delta = Math.abs((groupScores[theme]?.mean || 0) - (overallScores[theme]?.mean || 0));
          if (delta > maxDelta) { maxDelta = delta; maxTheme = theme; }
        }

        suggestions.push({
          id: `${dim}_${val}`,
          label: `${val} employees`,
          filters: [{ dimension: dim, operator: 'eq', value: val }],
          n: group.length,
          key_finding: `${maxDelta > 0 ? '+' : ''}${maxDelta.toFixed(2)} pts on ${maxTheme} vs overall`,
          max_delta: maxDelta
        });
      }
    }

    const top5 = suggestions
      .sort((a, b) => b.max_delta - a.max_delta)
      .slice(0, 5);

    res.json({ personas: top5 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// POST /api/persona/takeaways
// Cerebras generates Key Takeaways from the comparison results
// Input: themeResults array from /query
// ─────────────────────────────────────────────
router.post('/takeaways', async (req, res) => {
  try {
    const { persona_name, themes, persona_n } = req.body;

    const prompt = `You are an HR analytics expert. 
Generate 3 concise key takeaways for this persona comparison report.
Be specific with numbers. Use plain English for an HR director.

Persona: ${persona_name} (n=${persona_n})
Theme comparison data: ${JSON.stringify(themes.map(t => ({
  theme: t.theme,
  persona: t.persona_score,
  overall: t.overall_score,
  delta: t.delta_overall,
  significant: t.significant
})))}

Return ONLY a JSON array of 3 strings: ["takeaway 1", "takeaway 2", "takeaway 3"]`;

    const response = await client.chat.completions.create({
      model: process.env.CEREBRAS_MODEL || 'llama-3.3-70b',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }]
    });

    const raw = response.choices[0].message.content.replace(/```json|```/g, '').trim();
    res.json({ takeaways: JSON.parse(raw) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Helper: compute mean and std for each theme across a group of units
function computeGroupScores(group, themes) {
  const result = {};
  for (const theme of themes) {
    // Map theme name to units.json score key
    const key = theme.toLowerCase().replace(/ /g, '_');
    const scores = group.map(u => u[key] || u.overall || 0).filter(v => v > 0);
    result[theme] = {
      mean: mean(scores),
      std:  stdDev(scores),
      n:    scores.length
    };
  }
  return result;
}

function mean(arr) {
  return arr.length ? arr.reduce((a,b) => a+b, 0) / arr.length : 0;
}
function stdDev(arr) {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return Math.sqrt(arr.reduce((s,v) => s + Math.pow(v-m, 2), 0) / arr.length);
}

module.exports = router;
```

---

## 8. Tab 4 — Hypothesis Testing Routes — `server/routes/hypothesis.js`

```javascript
// server/routes/hypothesis.js
const express  = require('express');
const router   = express.Router();
const path     = require('path');
const fs       = require('fs');
const Cerebras = require('@cerebras/cerebras_cloud_sdk');
const { oneSampleZTest, mean, stdDev } = require('../lib/stats');

const client   = new Cerebras({ apiKey: process.env.CEREBRAS_API_KEY });
const DATA_DIR = path.join(__dirname, '../../data');
function read(f)       { return JSON.parse(fs.readFileSync(path.join(DATA_DIR, f))); }
function write(f, d)   { fs.writeFileSync(path.join(DATA_DIR, f), JSON.stringify(d, null, 2)); }

// ─────────────────────────────────────────────
// POST /api/hypothesis/test
// Main hypothesis testing endpoint
// Input: natural language hypothesis string + active filters
// Step 1: Cerebras parses hypothesis → extracts test parameters
// Step 2: Backend runs actual z-test on real data
// Step 3: Cerebras generates plain English interpretation
// Step 4: Save to hypotheses.json history
// ─────────────────────────────────────────────
router.post('/test', async (req, res) => {
  try {
    const { hypothesis_text, filters = {}, alpha = 0.05 } = req.body;

    const units     = read('units.json');
    const questions = read('questions.json');

    // ── Step 1: Parse hypothesis with Cerebras ──
    const parsePrompt = `You are a statistical analysis engine for HR survey data.
Parse this hypothesis into structured test parameters.

Available survey fields: ${questions.map(q => q.id + ': ' + q.short_label).join(', ')}
Available demographic fields: business, department, region, tenure, job_level, gender, generation, function

Hypothesis: "${hypothesis_text}"

Return ONLY a JSON object — no explanation, no markdown:
{
  "h0": "<null hypothesis text>",
  "h1": "<alternative hypothesis text>",
  "test_type": "one_sample_z" | "two_sample_z",
  "variable": "<field name to measure>",
  "group_filter": { "dimension": "<field>", "operator": "eq|gte|lte", "value": "<val>" } | null,
  "hypothesized_mean": <number> | null,
  "threshold": <number> | null,
  "direction": "greater" | "less" | "two_tailed",
  "parseable": true | false,
  "parse_error": "<reason if not parseable>" | null
}`;

    const parseRes = await client.chat.completions.create({
      model: process.env.CEREBRAS_MODEL || 'llama-3.3-70b',
      max_tokens: 400,
      messages: [{ role: 'user', content: parsePrompt }]
    });

    const parseRaw = parseRes.choices[0].message.content.replace(/```json|```/g, '').trim();
    const params = JSON.parse(parseRaw);

    if (!params.parseable) {
      return res.json({
        success: false,
        error: params.parse_error || 'Could not parse hypothesis',
        suggestion: 'Try: "Employees who rate X high have higher Y scores than those who rate it low"'
      });
    }

    // ── Step 2: Run z-test on real data ──
    let testGroup = units;

    // Apply hypothesis group filter
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

    // Apply active dashboard filters
    if (filters.business   && filters.business   !== 'All') testGroup = testGroup.filter(u => u.business   === filters.business);
    if (filters.department && filters.department !== 'All') testGroup = testGroup.filter(u => u.department === filters.department);
    if (filters.region     && filters.region     !== 'All') testGroup = testGroup.filter(u => u.region     === filters.region);
    if (filters.tenure     && filters.tenure     !== 'All') testGroup = testGroup.filter(u => u.tenure     === filters.tenure);

    // Get scores for the variable being tested
    const scoreKey = params.variable?.toLowerCase().replace(/ /g, '_') || 'overall';
    const scores   = testGroup.map(u => u[scoreKey] || u.overall || 0).filter(v => v > 0);

    const sampleMean  = mean(scores);
    const sampleStd   = stdDev(scores);
    const n           = scores.length;
    const popMean     = params.hypothesized_mean || params.threshold || 3.5;

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
      verdict:    verdict ? 'validated' : (zResult.significant ? 'rejected' : 'inconclusive'),
      z:          zResult.z,
      p_value:    params.direction === 'two_tailed' ? zResult.p_two_tailed : zResult.p_one_tailed,
      critical_z: alpha === 0.05 ? 1.645 : 2.326,
      alpha,
      decision:   zResult.decision,
      sample_mean: parseFloat(sampleMean.toFixed(2)),
      pop_mean:    popMean,
      std_dev:     parseFloat(sampleStd.toFixed(2)),
      n,
      h0:          params.h0,
      h1:          params.h1,
      test_type:   'One-tailed Z-Test (' + (params.direction === 'less' ? 'Less than' : 'Greater than') + ')',
      // Data for bell curve visualisation
      curve_data: {
        z_stat:     zResult.z,
        critical_z: alpha === 0.05 ? 1.645 : 2.326,
        p_value:    params.direction === 'two_tailed' ? zResult.p_two_tailed : zResult.p_one_tailed
      },
      // Full working for the "Underlying Working" box
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

    // ── Step 3: Cerebras plain English interpretation ──
    const interpretPrompt = `You are an HR analytics expert. Write a 1-sentence plain English interpretation of this z-test result for an HR director.

p(z) = ${result.p_value}, alpha = ${alpha}, verdict = ${result.verdict}, z = ${result.z}
Hypothesis: "${hypothesis_text}"

Return ONLY a JSON object: { "interpretation": "<one sentence>" }`;

    const interpRes = await client.chat.completions.create({
      model: process.env.CEREBRAS_MODEL || 'llama-3.3-70b',
      max_tokens: 150,
      messages: [{ role: 'user', content: interpretPrompt }]
    });

    const interpRaw = interpRes.choices[0].message.content.replace(/```json|```/g, '').trim();
    result.interpretation = JSON.parse(interpRaw).interpretation;

    // ── Step 4: Save to hypothesis history ──
    let history = [];
    const historyPath = path.join(DATA_DIR, 'hypotheses.json');
    if (fs.existsSync(historyPath)) history = JSON.parse(fs.readFileSync(historyPath));

    const nextId = 'H-' + String(1000 + history.length + 1);
    history.unshift({
      id:             nextId,
      hypothesis:     hypothesis_text,
      result:         result.verdict,
      z:              result.z,
      p_value:        result.p_value,
      alpha,
      filters_applied: filters,
      date_tested:    new Date().toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }),
      params
    });

    fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));

    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// GET /api/hypothesis/templates
// Returns pre-written hypothesis templates
// Shown in "Try a Template" section on the page
// ─────────────────────────────────────────────
router.get('/templates', (req, res) => {
  const templates = [
    {
      id: 'T-001',
      text: 'Employees who rate Career Growth Opportunities high (score ≥ 4) have higher Engagement scores (mean > 3.5) than those who rate it low (score < 3).'
    },
    {
      id: 'T-002',
      text: 'Managers have higher trust in leadership than individual contributors.'
    },
    {
      id: 'T-003',
      text: 'Employees in APAC have higher wellbeing scores than the company average.'
    },
    {
      id: 'T-004',
      text: 'There is no difference in engagement scores between new joiners and employees with 3+ years tenure.'
    },
    {
      id: 'T-005',
      text: 'Employees who rate recognition high feel more engaged overall.'
    }
  ];
  res.json({ templates });
});

// ─────────────────────────────────────────────
// GET /api/hypothesis/history
// Returns saved hypothesis test history
// Sorted by date descending
// Query: limit = 20, offset = 0
// ─────────────────────────────────────────────
router.get('/history', (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    const historyPath = path.join(DATA_DIR, 'hypotheses.json');
    const history = fs.existsSync(historyPath)
      ? JSON.parse(fs.readFileSync(historyPath))
      : [];

    res.json({
      total: history.length,
      items: history.slice(parseInt(offset), parseInt(offset) + parseInt(limit))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// DELETE /api/hypothesis/history/:id
// Delete a hypothesis from history
// ─────────────────────────────────────────────
router.delete('/history/:id', (req, res) => {
  try {
    const { id } = req.params;
    const historyPath = path.join(DATA_DIR, 'hypotheses.json');
    let history = fs.existsSync(historyPath)
      ? JSON.parse(fs.readFileSync(historyPath))
      : [];
    history = history.filter(h => h.id !== id);
    fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
```

---

## 9. Data Files — New Sample Data Needed

### `data/sample/questions.json`
```json
[
  { "id": "Q12", "text": "I feel recognized for my contributions.", "short_label": "Q12", "category": "Recognition", "type": "likert_1_5" },
  { "id": "Q24", "text": "I believe my manager supports me.", "short_label": "Q24", "category": "Manager Effectiveness", "type": "likert_1_5" },
  { "id": "Q18", "text": "I feel valued at work.", "short_label": "Q18", "category": "Engagement", "type": "likert_1_5" },
  { "id": "Q16", "text": "I have opportunities to grow.", "short_label": "Q16", "category": "Career Growth", "type": "likert_1_5" },
  { "id": "Q57", "text": "I feel overloaded with work.", "short_label": "Q57", "category": "Workload", "type": "likert_1_5" },
  { "id": "Q61", "text": "I often feel stressed.", "short_label": "Q61", "category": "Wellbeing", "type": "likert_1_5" }
]
```

### `data/sample/responses.json`
One object per employee. Structure:
```json
[
  {
    "employee_id": "E001",
    "business": "Grasim Industries",
    "department": "Operations",
    "region": "India",
    "country": "India",
    "tenure": "3",
    "job_level": "Manager",
    "gender": "Male",
    "generation": "Millennial",
    "function": "Operations",
    "employment_type": "Full-time",
    "potential": "High",
    "year": "2024",
    "month": "Jan '24",
    "scores": {
      "Q12": 4, "Q24": 4, "Q18": 3, "Q16": 5, "Q57": 2, "Q61": 2
    }
  }
]
```
Generate at least 500 sample records covering all businesses, departments, regions.

### `data/sample/sentiments.json`
Pre-computed from open-text responses:
```json
{
  "responses": [
    {
      "id": "R001",
      "employee_id": "E001",
      "text": "The workload has become unmanageable.",
      "score": -0.72,
      "label": "Negative",
      "topics": ["Workload", "Work Life Balance"],
      "business_unit": "All",
      "department": "Operations",
      "location": "India",
      "tenure": "3",
      "job_level": "Manager",
      "month": "Jan '24"
    }
  ]
}
```
Generate at least 200 sample sentiment records.

### `data/sample/hypotheses.json`
Start as empty array:
```json
[]
```

---

## 10. Python Preprocessing Addition — `preprocess/extract.py`

Add this function to the existing `extract.py` to extract open-text columns and question scores:

```python
def extract_questions_and_responses(df, xl):
    """
    Extract survey questions and per-employee per-question scores
    Identifies question columns (OP prefix) from the raw data sheet
    """
    import json, os

    # Get question columns — all OP columns from the data sheet
    op_cols = [c for c in df.columns if str(c).startswith('OP')]

    # Build questions.json from column names
    questions = []
    for col in op_cols:
        questions.append({
            "id": str(col),
            "text": str(col),  # Will be overridden if Category and Items sheet exists
            "short_label": str(col),
            "category": "Survey",
            "type": "likert_1_5"
        })

    # Try to get question text from Category and Items sheet
    try:
        cat_df = xl.parse('Category and Items')
        for _, row in cat_df.iterrows():
            q_id = str(row.get('Question ID', '')).strip()
            q_text = str(row.get('Question Text', '')).strip()
            for q in questions:
                if q['id'] == q_id:
                    q['text'] = q_text
                    q['category'] = str(row.get('Category', 'Survey'))
    except:
        pass

    # Build responses.json — sample 500 rows for POC
    demo_cols = [c for c in df.columns if str(c).startswith('CQ')]
    sample = df.sample(min(500, len(df))).reset_index(drop=True)

    responses = []
    for _, row in sample.iterrows():
        scores = {}
        for col in op_cols:
            val = row.get(col)
            if pd.notna(val):
                try:
                    scores[str(col)] = float(val)
                except:
                    pass

        responses.append({
            "employee_id": f"E{_+1:04d}",
            "business":    str(row.get('CQ9', 'Unknown')),
            "department":  str(row.get('CQ2', 'Unknown')),
            "region":      str(row.get('CQ43', 'India')),
            "tenure":      str(row.get('CQ29', '1')),
            "job_level":   str(row.get('CQ27', 'Individual')),
            "gender":      str(row.get('CQ25', 'Unknown')),
            "generation":  str(row.get('CQ24', 'Millennial')),
            "year":        "2026",
            "month":       "Jan '26",
            "scores":      scores
        })

    os.makedirs('../data', exist_ok=True)
    with open('../data/questions.json', 'w') as f:
        json.dump(questions, f, indent=2)
    with open('../data/responses.json', 'w') as f:
        json.dump(responses, f, indent=2)

    print(f"Extracted {len(questions)} questions and {len(responses)} responses")
```

---

## 11. `server/index.js` — Add New Routes

Add these four lines to the existing `server/index.js` after the existing route registrations:

```javascript
app.use('/api/sentiment',   require('./routes/sentiment'));
app.use('/api/statistical', require('./routes/statistical'));
app.use('/api/persona',     require('./routes/persona'));
app.use('/api/hypothesis',  require('./routes/hypothesis'));
```

---

## 12. `package.json` — No New Dependencies Needed

All statistics are implemented in `server/lib/stats.js` using pure JavaScript math. No external stats libraries needed. Cerebras SDK already installed. No changes to `package.json` required.

---

## 13. Where Cerebras Is Called — Summary

| Route | Why Cerebras | What it generates |
|---|---|---|
| `GET /api/sentiment/validate-statistical` | Cross-validate NLP vs Pearson findings | Consistent / Partially Consistent / Not Consistent + validation score |
| `GET /api/statistical/insights/:questionId` | Convert correlation numbers to plain English | 2-sentence overall insight summary |
| `POST /api/persona/takeaways` | Narrate comparison results | 3 key takeaway bullet points |
| `POST /api/hypothesis/test` (step 1) | Parse natural language hypothesis | Structured test parameters (variable, group, direction, threshold) |
| `POST /api/hypothesis/test` (step 3) | Interpret z-test result | 1-sentence plain English p-value interpretation |
| `POST /api/sentiment/classify` (batch) | Classify open-text responses | Sentiment score + label + topics per response |

All other computations — Pearson r, p-values, z-tests, cluster assignments, delta calculations — are **pure maths** in `server/lib/stats.js`. No LLM involved.

---

## 14. New Checklist — Files to Create

#### New Backend Files
- [ ] `server/lib/stats.js` — Section 3
- [ ] `server/lib/nlp.js` — Section 4
- [ ] `server/routes/sentiment.js` — Section 5
- [ ] `server/routes/statistical.js` — Section 6
- [ ] `server/routes/persona.js` — Section 7
- [ ] `server/routes/hypothesis.js` — Section 8

#### New Data Files
- [ ] `data/sample/questions.json` — Section 9
- [ ] `data/sample/responses.json` — Section 9
- [ ] `data/sample/sentiments.json` — Section 9
- [ ] `data/sample/hypotheses.json` — Section 9 (empty array)

#### Updated Files
- [ ] `server/index.js` — add 4 route registrations (Section 11)
- [ ] `preprocess/extract.py` — add extract_questions_and_responses() (Section 10)

---

---

## 15. Gap Fixes — Items Identified in Cross-Check

### 15.1 — TAB 1: Missing `POST /api/sentiment/classify` route

Referenced in Section 13 but not coded. Add to `server/routes/sentiment.js`:

```javascript
// POST /api/sentiment/classify
// Triggered during Excel upload to classify open-text responses
// Processes in batches of 20 to avoid Cerebras timeout
// Writes output to data/sentiments.json
router.post('/classify', async (req, res) => {
  try {
    const { responses } = req.body; // Array of { id, text, metadata }
    const { classifyBatch } = require('../lib/nlp');
    const BATCH_SIZE = 20;
    const results = [];

    for (let i = 0; i < responses.length; i += BATCH_SIZE) {
      const batch = responses.slice(i, i + BATCH_SIZE);
      const classified = await classifyBatch(batch);
      // Merge metadata back in
      classified.forEach((c, idx) => {
        results.push({ ...batch[idx], ...c });
      });
    }

    // Write to sentiments.json
    const DATA_DIR = path.join(__dirname, '../../data');
    fs.writeFileSync(
      path.join(DATA_DIR, 'sentiments.json'),
      JSON.stringify({ responses: results }, null, 2)
    );

    res.json({ success: true, classified: results.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
```

---

### 15.2 — TAB 1: Missing `sentiment_extract.py`

Listed in Section 2 file list but never implemented. Create `preprocess/sentiment_extract.py`:

```python
# preprocess/sentiment_extract.py
# Extracts open-text columns from the Excel survey file
# Run after extract.py — reads same Excel, finds text columns
# Output: data/open_text_raw.json (passed to POST /api/sentiment/classify)

import pandas as pd
import json
import sys
import os

def extract_open_text(excel_path):
    xl = pd.ExcelFile(excel_path)
    df = xl.parse('Data')

    # Identify open-text columns — look for OT prefix or string dtype
    text_cols = [c for c in df.columns if str(c).startswith('OT')]
    if not text_cols:
        # Fall back: find columns with string values over 20 chars avg
        text_cols = [
            c for c in df.columns
            if df[c].dtype == object and
            df[c].dropna().apply(lambda x: len(str(x))).mean() > 20
        ]

    print(f"Found {len(text_cols)} open-text columns: {text_cols}")

    # Extract demographic metadata for each response
    records = []
    for _, row in df.iterrows():
        for col in text_cols:
            text = str(row.get(col, '')).strip()
            if text and text != 'nan' and len(text) > 5:
                records.append({
                    "id":           f"R{len(records)+1:05d}",
                    "text":         text,
                    "column":       str(col),
                    "business_unit": str(row.get('CQ9', 'Unknown')),
                    "department":   str(row.get('CQ2', 'Unknown')),
                    "location":     str(row.get('CQ43', 'Unknown')),
                    "tenure":       str(row.get('CQ29', 'Unknown')),
                    "job_level":    str(row.get('CQ27', 'Unknown')),
                    "month":        "Jan '26"
                })

    os.makedirs('../data', exist_ok=True)
    with open('../data/open_text_raw.json', 'w') as f:
        json.dump(records, f, indent=2)

    print(f"Extracted {len(records)} open-text responses")
    print("Now call POST /api/sentiment/classify with this data")

if __name__ == '__main__':
    extract_open_text(sys.argv[1])
```

---

### 15.3 — TAB 1: Missing `GET /api/sentiment/samples` pagination

Add `page` and `limit` params so "View all [label] responses" works:

```javascript
// Updated /samples route — add to server/routes/sentiment.js
router.get('/samples', (req, res) => {
  try {
    const sentiments = read('sentiments.json');
    const { label, limit = 3, page = 1 } = req.query;
    const lim = parseInt(limit);
    const pg  = parseInt(page);

    const filtered = label
      ? sentiments.responses.filter(r => r.label === label)
      : sentiments.responses;

    const total   = filtered.length;
    const offset  = (pg - 1) * lim;
    const samples = filtered
      .slice(offset, offset + lim)
      .map(r => ({ text: r.text, score: r.score, label: r.label }));

    res.json({ samples, total, label, page: pg, pages: Math.ceil(total / lim) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
```

---

### 15.4 — TAB 1: Filter bar includes `include_inactive`

Add `include_inactive` to all sentiment filter blocks. In `/overview`, `/over-time`, `/samples` — add:

```javascript
const { include_inactive = 'No' } = req.query;
if (include_inactive === 'No') {
  filtered = filtered.filter(r => r.is_active !== false);
}
```

Also add `is_active: true` field to `data/sample/sentiments.json` records.

---

### 15.5 — TAB 2: Tab-filtered correlations count

The image shows tabs: `All (71) | Positive (39) | Negative (10) | No Correlation (22)`. The `/correlations` endpoint already returns all correlations with a `category` field. Add a `tab_counts` field to the response:

```javascript
// Add to the res.json() in GET /api/statistical/correlations/:questionId
tab_counts: {
  all:            correlations.length,
  positive:       correlations.filter(c => c.pearson_r > 0 && c.significant).length,
  negative:       correlations.filter(c => c.pearson_r < 0 && c.significant).length,
  no_correlation: correlations.filter(c => !c.significant).length
}
```

---

### 15.6 — TAB 2: `include_inactive` filter on statistical routes

Add to `/correlations`, `/correlogram`, `/network`:

```javascript
const { include_inactive = 'No' } = req.query;
if (include_inactive === 'No') {
  filtered = filtered.filter(r => r.is_active !== false);
}
```

---

### 15.7 — TAB 2: Correlogram color scale metadata

Add color scale bounds to correlogram response so frontend can render the legend:

```javascript
// Add to res.json() in GET /api/statistical/correlogram/:questionId
color_scale: {
  min: -1.0,
  max: 1.0,
  labels: { negative: 'red', neutral: 'white', positive: 'blue' },
  legend: 'Darker color indicates stronger correlation'
}
```

---

### 15.8 — TAB 2: Correlations pagination for Expand All

Add `limit` and `offset` to `/correlations` for paginated loading:

```javascript
// Add to GET /api/statistical/correlations/:questionId
const { limit, offset = 0 } = req.query;
const paged = limit
  ? correlations.slice(parseInt(offset), parseInt(offset) + parseInt(limit))
  : correlations;

// Return paged instead of correlations in res.json
// Also return total count
res.json({
  ...existing_fields,
  correlations: paged,
  total: correlations.length,
  showing: `Showing ${parseInt(offset)+1} to ${Math.min(parseInt(offset)+parseInt(limit||correlations.length), correlations.length)} of ${correlations.length} questions`
});
```

---

### 15.9 — TAB 3: Missing `POST /api/persona/save` and `GET /api/persona/cohorts`

The "Save Persona" button and "+ Add Cohort" button need these two endpoints. Add to `server/routes/persona.js`:

```javascript
// POST /api/persona/save
// Saves a built persona for reuse as a comparison cohort
router.post('/save', (req, res) => {
  try {
    const { persona_name, filters, persona_n, scores } = req.body;
    const DATA_DIR = path.join(__dirname, '../../data');
    const savedPath = path.join(DATA_DIR, 'saved_personas.json');

    let saved = fs.existsSync(savedPath)
      ? JSON.parse(fs.readFileSync(savedPath))
      : [];

    const id = 'P-' + Date.now();
    saved.push({
      id,
      name:       persona_name,
      filters,
      n:          persona_n,
      scores,
      created_at: new Date().toISOString()
    });

    fs.writeFileSync(savedPath, JSON.stringify(saved, null, 2));
    res.json({ success: true, id, persona_name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/persona/cohorts
// Returns list of saved personas + built-in cohorts
// Used to populate "+ Add Cohort" dropdown
router.get('/cohorts', (req, res) => {
  try {
    const DATA_DIR = path.join(__dirname, '../../data');
    const savedPath = path.join(DATA_DIR, 'saved_personas.json');

    const saved = fs.existsSync(savedPath)
      ? JSON.parse(fs.readFileSync(savedPath))
      : [];

    const builtin = [
      { id: 'new_joiners',    name: 'New Joiners (<1 yr)',   type: 'builtin' },
      { id: 'engineers_apac', name: 'Engineers – APAC',      type: 'builtin' },
      { id: 'senior_mgmt',    name: 'Senior Management',     type: 'builtin' },
      { id: 'gen_z',          name: 'Gen Z Employees',       type: 'builtin' }
    ];

    res.json({
      cohorts: [
        ...builtin,
        ...saved.map(p => ({ id: p.id, name: p.name, type: 'saved', n: p.n }))
      ]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
```

Also add `data/sample/saved_personas.json` as empty array `[]`.

---

### 15.10 — TAB 4: Missing `GET /api/hypothesis/history/:id`

The eye icon on each history row needs to re-fetch a single result. Add to `server/routes/hypothesis.js`:

```javascript
// GET /api/hypothesis/history/:id
// Returns single hypothesis result by ID
// Used by eye icon to re-display full result
router.get('/history/:id', (req, res) => {
  try {
    const { id } = req.params;
    const DATA_DIR = path.join(__dirname, '../../data');
    const historyPath = path.join(DATA_DIR, 'hypotheses.json');

    const history = fs.existsSync(historyPath)
      ? JSON.parse(fs.readFileSync(historyPath))
      : [];

    const item = history.find(h => h.id === id);
    if (!item) return res.status(404).json({ error: 'Hypothesis not found' });

    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
```

---

## 16. Updated Checklist — Complete After Gap Fixes

#### New Backend Files
- [ ] `server/lib/stats.js` — Section 3
- [ ] `server/lib/nlp.js` — Section 4
- [ ] `server/routes/sentiment.js` — Section 5 + gaps 15.1, 15.3, 15.4
- [ ] `server/routes/statistical.js` — Section 6 + gaps 15.5, 15.6, 15.7, 15.8
- [ ] `server/routes/persona.js` — Section 7 + gap 15.9
- [ ] `server/routes/hypothesis.js` — Section 8 + gap 15.10

#### New Python Scripts
- [ ] `preprocess/sentiment_extract.py` — Section 15.2

#### New Data Files
- [ ] `data/sample/questions.json` — Section 9
- [ ] `data/sample/responses.json` — Section 9 (500 records minimum)
- [ ] `data/sample/sentiments.json` — Section 9 (200 records, add `is_active: true`)
- [ ] `data/sample/hypotheses.json` — Section 9 (empty array)
- [ ] `data/sample/saved_personas.json` — Section 15.9 (empty array)
- [ ] `data/sample/open_text_raw.json` — Section 15.2 (empty array, populated by script)

#### Updated Files
- [ ] `server/index.js` — add 4 route registrations (Section 11)
- [ ] `preprocess/extract.py` — add extract_questions_and_responses() (Section 10)

---

## 17. Complete API Surface — All Endpoints

### Tab 1 — Sentiment Analysis
| Method | Route | Purpose |
|---|---|---|
| GET | `/api/sentiment/overview` | Overall score, distribution, top topics |
| GET | `/api/sentiment/over-time` | Monthly trend data |
| GET | `/api/sentiment/samples` | Sample quotes per label (paginated) |
| GET | `/api/sentiment/validate-statistical` | NLP vs Pearson cross-validation |
| POST | `/api/sentiment/classify` | Classify open-text batch via Cerebras |

### Tab 2 — Statistical Analysis
| Method | Route | Purpose |
|---|---|---|
| GET | `/api/statistical/questions` | All question IDs and text |
| GET | `/api/statistical/correlations/:questionId` | Full correlation table (paginated) |
| GET | `/api/statistical/correlogram/:questionId` | NxN matrix for heatmap |
| GET | `/api/statistical/network/:questionId` | Nodes and edges for network graph |
| GET | `/api/statistical/insights/:questionId` | Cerebras plain English summary |

### Tab 3 — Dynamic Persona Builder
| Method | Route | Purpose |
|---|---|---|
| POST | `/api/persona/query` | Run persona analysis with z-tests |
| GET | `/api/persona/dimensions` | Available filter dimensions + values |
| GET | `/api/persona/top5` | Auto-detected distinctive cohorts |
| POST | `/api/persona/takeaways` | Cerebras key takeaways |
| POST | `/api/persona/save` | Save persona for reuse |
| GET | `/api/persona/cohorts` | List built-in + saved cohorts |

### Tab 4 — Hypothesis Testing
| Method | Route | Purpose |
|---|---|---|
| POST | `/api/hypothesis/test` | Parse + run z-test + interpret |
| GET | `/api/hypothesis/templates` | Pre-written hypothesis templates |
| GET | `/api/hypothesis/history` | Paginated test history |
| GET | `/api/hypothesis/history/:id` | Single hypothesis result |
| DELETE | `/api/hypothesis/history/:id` | Delete from history |

---

> **Note to Claude Code:** Do not modify any existing files except `server/index.js` (add 4 lines) and `preprocess/extract.py` (add one function). All new logic is in new files only. Frontend team handles UI for all 4 tabs — backend only here. Section 15 gap fixes must be merged into the respective route files — they are additions to Sections 5–8, not separate files.

---

## 18. Final Deep Cross-Check Fixes

These issues were found in a second pass over all code logic, data flows, and consistency. All are critical for Claude Code to produce working code.

---

### 18.1 — Create `server/lib/` directory explicitly

The `server/lib/` directory does not exist in the current project. Claude Code must create it:

```bash
mkdir -p server/lib
```

Add this to the setup instructions before creating `stats.js` and `nlp.js`.

---

### 18.2 — CRITICAL BUG: `persona.js` and `hypothesis.js` read wrong data file

Both `persona.js` (POST /query, GET /dimensions, GET /top5) and `hypothesis.js` (POST /test) read `units.json` — which contains BU-level aggregated scores, not individual employee records.

Persona filtering requires individual-level data (filter by region, tenure, job_level per person). Hypothesis testing requires question-level scores per employee.

**Fix: Both files must read `responses.json` instead of `units.json`.**

In `server/routes/persona.js` — change everywhere:
```javascript
// WRONG
const units = read('units.json');
// CORRECT
const units = read('responses.json');
```

In `server/routes/hypothesis.js` — change:
```javascript
// WRONG
const units = read('units.json');
// CORRECT
const units = read('responses.json');
```

Also: `responses.json` must have the same demographic fields that persona filters on:
`region, tenure, job_level, potential, function, employment_type, gender, generation`
These are already in the `responses.json` schema defined in Section 9 — confirmed correct.

---

### 18.3 — CRITICAL: `responses.json` must include `is_active` field

The `include_inactive` filter (gaps 15.4 and 15.6) filters on `r.is_active !== false`. But `responses.json` and `sentiments.json` sample schemas do not include this field.

Add `is_active: true` to both sample file schemas:

In `data/sample/responses.json` records:
```json
{ "employee_id": "E001", ..., "is_active": true, "scores": { ... } }
```

In `data/sample/sentiments.json` records:
```json
{ "id": "R001", ..., "is_active": true, "label": "Negative" }
```

---

### 18.4 — CRITICAL: `questions.json` needs at least 50 questions for realistic demo

The image shows "All (71)" questions in the correlations table. The sample file only defines 6. Claude Code must generate a realistic set.

**Instruction to Claude Code:** Generate at least 50 questions in `data/sample/questions.json` using these categories from the ABG Vibes survey — Engagement (8 questions), Leadership (8 questions), Performance Culture (8 questions), Development & Career (8 questions), Manager Effectiveness (8 questions), Onboarding (6 questions), Wellbeing (4 questions). Use IDs Q01 through Q50. Example pattern:

```json
[
  { "id": "Q01", "text": "I am proud to work for this organisation.", "short_label": "Q01", "category": "Engagement", "type": "likert_1_5" },
  { "id": "Q02", "text": "I would recommend this organisation as a great place to work.", "short_label": "Q02", "category": "Engagement", "type": "likert_1_5" },
  { "id": "Q03", "text": "I intend to be working here in two years' time.", "short_label": "Q03", "category": "Engagement", "type": "likert_1_5" },
  { "id": "Q04", "text": "This organisation motivates me to give my best.", "short_label": "Q04", "category": "Engagement", "type": "likert_1_5" },
  { "id": "Q05", "text": "Senior leaders communicate a clear direction.", "short_label": "Q05", "category": "Leadership", "type": "likert_1_5" },
  { "id": "Q06", "text": "I trust the senior leaders of this organisation.", "short_label": "Q06", "category": "Leadership", "type": "likert_1_5" },
  { "id": "Q07", "text": "Leaders act consistently with our stated values.", "short_label": "Q07", "category": "Leadership", "type": "likert_1_5" },
  { "id": "Q08", "text": "Promotions are handled fairly in this organisation.", "short_label": "Q08", "category": "Performance Culture", "type": "likert_1_5" },
  { "id": "Q09", "text": "I receive recognition for good work.", "short_label": "Q09", "category": "Performance Culture", "type": "likert_1_5" },
  { "id": "Q10", "text": "My pay fairly reflects my contribution.", "short_label": "Q10", "category": "Performance Culture", "type": "likert_1_5" },
  { "id": "Q11", "text": "I have clear career growth opportunities here.", "short_label": "Q11", "category": "Development & Career", "type": "likert_1_5" },
  { "id": "Q12", "text": "I feel recognized for my contributions.", "short_label": "Q12", "category": "Performance Culture", "type": "likert_1_5" },
  { "id": "Q13", "text": "My manager gives me useful feedback.", "short_label": "Q13", "category": "Manager Effectiveness", "type": "likert_1_5" },
  { "id": "Q14", "text": "My manager supports my development.", "short_label": "Q14", "category": "Manager Effectiveness", "type": "likert_1_5" },
  { "id": "Q15", "text": "My manager treats me with respect.", "short_label": "Q15", "category": "Manager Effectiveness", "type": "likert_1_5" }
]
```
Continue this pattern for all 50 questions across all categories.

---

### 18.5 — DUPLICATE: Remove `mean()` and `stdDev()` from bottom of `persona.js`

`persona.js` already imports `mean` and `stdDev` from `stats.js` at the top:
```javascript
const { mean, stdDev, twoSampleZTest, significanceBadge } = require('../lib/stats');
```

But at the bottom of the file, two local duplicate functions are defined:
```javascript
function mean(arr) { ... }
function stdDev(arr) { ... }
```

**Remove these two duplicate functions from the bottom of `persona.js`.**

---

### 18.6 — CLEANUP: Remove unused imports from `nlp.js` and `hypothesis.js`

In `server/lib/nlp.js`, remove:
```javascript
// Remove these — never used in nlp.js
const path = require('path');
const fs   = require('fs');
const DATA_DIR = path.join(__dirname, '../../data');
```

In `server/routes/hypothesis.js`, remove:
```javascript
// Remove this — write() is never called
function write(f, d) { fs.writeFileSync(path.join(DATA_DIR, f), JSON.stringify(d, null, 2)); }
```

---

### 18.7 — FIX: Duplicate `/samples` route definition

Section 5 defines `GET /samples` without pagination. Section 15.3 defines an updated version with pagination. Claude Code must use **only the Section 15.3 version** and discard the Section 5 version.

**Instruction to Claude Code:** When building `server/routes/sentiment.js`, use the `/samples` route from Section 15.3. Do not include the version from Section 5.

---

### 18.8 — FIX: `include_inactive` must be added explicitly to `/overview` route

Section 15.4 provides a snippet but does not show exactly where to insert it in `/overview`. Here is the exact placement:

```javascript
router.get('/overview', (req, res) => {
  try {
    const sentiments = read('sentiments.json');
    const { business_unit, department, location, tenure, job_level, include_inactive = 'No' } = req.query;

    let filtered = sentiments.responses;
    // Add include_inactive filter FIRST, before other filters
    if (include_inactive === 'No') {
      filtered = filtered.filter(r => r.is_active !== false);
    }
    if (business_unit && business_unit !== 'All') ...
    // rest of filters unchanged
```

Apply same pattern to `/over-time` and `/samples`.

---

### 18.9 — FIX: `include_inactive` must be added explicitly to statistical routes

Section 15.6 provides a snippet but not exact placement. In `server/routes/statistical.js`, add after the other filter declarations in `/correlations`, `/correlogram`, and `/network`:

```javascript
const { business, year, country, department, include_inactive = 'No' } = req.query;

let filtered = responses;
if (include_inactive === 'No') {
  filtered = filtered.filter(r => r.is_active !== false);
}
// then apply other filters as before
```

---

### 18.10 — FIX: `GET /statistical/insights` must self-compute top correlations

Currently the `/insights` endpoint requires frontend to pass `top_positive` and `top_negative` as query params — fragile and incorrect design. Fix it to re-compute internally:

```javascript
router.get('/insights/:questionId', async (req, res) => {
  try {
    const { questionId } = req.params;
    const { business, year, country, department } = req.query;
    const questions = read('questions.json');
    const responses = read('responses.json');

    let filtered = responses;
    if (business   && business   !== 'All') filtered = filtered.filter(r => r.business   === business);
    if (year       && year       !== 'All') filtered = filtered.filter(r => r.year       === year);
    if (country    && country    !== 'All') filtered = filtered.filter(r => r.country    === country);
    if (department && department !== 'All') filtered = filtered.filter(r => r.department === department);

    const qText = questions.find(q => q.id === questionId)?.text || questionId;
    const baseScores = filtered.map(r => r.scores[questionId]).filter(v => v != null);

    // Self-compute top positive and negative correlations
    const corrs = questions
      .filter(q => q.id !== questionId)
      .map(q => {
        const s = filtered.map(r => r.scores[q.id]).filter(v => v != null);
        const len = Math.min(baseScores.length, s.length);
        return { id: q.id, text: q.text, r: pearsonR(baseScores.slice(0,len), s.slice(0,len)) };
      })
      .sort((a, b) => b.r - a.r);

    const topPos = corrs[0];
    const topNeg = corrs[corrs.length - 1];

    const prompt = `You are an HR analytics expert. Write a 2-sentence insight about these Pearson correlation findings.
Be specific with the numbers. Write in plain English for an HR director audience.

Question analysed: "${qText}"
Strongest positive correlation: ${topPos?.text} (r = ${topPos?.r})
Strongest negative correlation: ${topNeg?.text} (r = ${topNeg?.r})

Return ONLY a JSON object: { "insight": "<2 sentences>" }`;

    const response = await client.chat.completions.create({
      model: process.env.CEREBRAS_MODEL || 'llama-3.3-70b',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }]
    });

    const raw = response.choices[0].message.content.replace(/```json|```/g, '').trim();
    res.json({ ...JSON.parse(raw), top_positive: topPos, top_negative: topNeg });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
```

---

### 18.11 — FIX: `hypothesis.js` ID generation must be collision-safe

Current formula `'H-' + String(1000 + history.length + 1)` produces duplicate IDs after deletions (e.g. if 5 items exist and you delete 2, next ID clashes).

Replace with timestamp-based ID:

```javascript
// Replace in POST /api/hypothesis/test Step 4:
const nextId = 'H-' + Date.now();
```

---

### 18.12 — FIX: Remove outdated Section 14 checklist

Section 14 is an outdated checklist that does not include the gap fixes. **Claude Code must use Section 16 checklist only.** Section 14 should be ignored.

**Instruction to Claude Code:** Ignore Section 14 completely. Use Section 16 as the definitive file checklist.

---

### 18.13 — FIX: Update Section 2 file list to include all files

Section 2 lists files to create but is missing files added in Section 15. The complete file list is:

```
server/lib/stats.js               # Section 3
server/lib/nlp.js                 # Section 4 (cleaned per 18.6)
server/routes/sentiment.js        # Section 5 + 15.1 + 15.3 (use 15.3) + 15.4 (use 18.8)
server/routes/statistical.js      # Section 6 + 15.5 + 15.6 (use 18.9) + 15.7 + 15.8 + 18.10
server/routes/persona.js          # Section 7 + 15.9 — reads responses.json (18.2) — no duplicate mean/stdDev (18.5)
server/routes/hypothesis.js       # Section 8 + 15.10 — reads responses.json (18.2) — timestamp ID (18.11) — no write() (18.6)
preprocess/sentiment_extract.py   # Section 15.2
data/sample/questions.json        # Section 9 + 18.4 (50 questions minimum)
data/sample/responses.json        # Section 9 + 18.3 (add is_active field) — 500 records
data/sample/sentiments.json       # Section 9 + 18.3 (add is_active field) — 200 records
data/sample/hypotheses.json       # Section 9 (empty array)
data/sample/saved_personas.json   # Section 15.9 (empty array)
data/sample/open_text_raw.json    # Section 15.2 (empty array)
```

Updated files:
```
server/index.js                   # Add 4 lines — Section 11
preprocess/extract.py             # Add one function — Section 10
```

---

## 19. Final Build Order for Claude Code

Build in this exact order to avoid dependency errors:

```
1. mkdir -p server/lib
2. server/lib/stats.js            (no dependencies)
3. server/lib/nlp.js              (depends on Cerebras SDK)
4. data/sample/questions.json     (50 questions)
5. data/sample/responses.json     (500 records, includes is_active, scores for all Q-IDs)
6. data/sample/sentiments.json    (200 records, includes is_active)
7. data/sample/hypotheses.json    (empty array)
8. data/sample/saved_personas.json (empty array)
9. data/sample/open_text_raw.json  (empty array)
10. server/routes/sentiment.js    (depends on stats.js, nlp.js, sentiments.json)
11. server/routes/statistical.js  (depends on stats.js, questions.json, responses.json)
12. server/routes/persona.js      (depends on stats.js, responses.json)
13. server/routes/hypothesis.js   (depends on stats.js, questions.json, responses.json)
14. preprocess/sentiment_extract.py
15. Update server/index.js — add 4 route lines
16. Update preprocess/extract.py — add extract_questions_and_responses()
```

---

> **Final note to Claude Code:** This document has 20 sections. Sections 1–13 are the original build. Section 14 is outdated — ignore it. Sections 15–19 are gap fixes and build order. Section 20 contains the final critical fixes that must be applied. Section 16 checklist + Section 18.13 file list together form the definitive reference. Follow Section 19 build order exactly.

---

## 20. Final Critical Fixes — Must Apply

These were found in the third and final cross-check pass. All are critical.

---

### 20.1 — C1: `/sentiment/over-time` must respect all filters

The `/over-time` route in Section 5 ignores all filter params. The image's filter bar applies to all sections of the page. Fix:

```javascript
// server/routes/sentiment.js — replace GET /over-time with this
router.get('/over-time', (req, res) => {
  try {
    const sentiments = read('sentiments.json');
    const { granularity = 'monthly', business_unit, department, location, tenure, job_level, include_inactive = 'No' } = req.query;

    let responses = sentiments.responses;
    if (include_inactive === 'No')                          responses = responses.filter(r => r.is_active !== false);
    if (business_unit && business_unit !== 'All')           responses = responses.filter(r => r.business_unit === business_unit);
    if (department    && department    !== 'All')           responses = responses.filter(r => r.department   === department);
    if (location      && location      !== 'All')           responses = responses.filter(r => r.location     === location);
    if (tenure        && tenure        !== 'All')           responses = responses.filter(r => r.tenure       === tenure);
    if (job_level     && job_level     !== 'All')           responses = responses.filter(r => r.job_level    === job_level);

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
```

---

### 20.2 — C2: `tab_counts` must use `correlationCategory` not custom thresholds

Current `tab_counts` code (Section 15.5) counts `positive = pearson_r > 0 && significant` which is wrong. The image shows 4 boxes matching exactly the 4 `correlationCategory` buckets. Fix:

```javascript
// Replace tab_counts in GET /api/statistical/correlations/:questionId
tab_counts: {
  all:              correlations.length,
  strong_positive:  correlations.filter(c => c.category === 'strong_positive').length,
  moderate_positive:correlations.filter(c => c.category === 'moderate_positive').length,
  weak_none:        correlations.filter(c => c.category === 'weak_none').length,
  negative:         correlations.filter(c => c.category === 'moderate_negative' || c.category === 'strong_negative').length
}
```

The 4 summary boxes in the image map exactly to:
- **Strong Positive** = `strong_positive` (r ≥ 0.50)
- **Moderate Positive** = `moderate_positive` (0.20 ≤ r < 0.50)
- **Weak / No Correlation** = `weak_none` (-0.20 < r < 0.20)
- **Negative Correlation** = `moderate_negative` + `strong_negative` (r ≤ -0.20)

---

### 20.3 — C3: Guard against empty persona group in `/persona/query`

Add immediately after `const personaN = personaGroup.length`:

```javascript
if (personaN === 0) {
  return res.status(400).json({
    error: 'No employees match the selected filters. Try broadening your criteria.',
    persona_n: 0
  });
}
```

---

### 20.4 — C4: Guard against empty filtered set in `/sentiment/overview`

Add immediately after the filter block, before computing totals:

```javascript
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
```

---

### 20.5 — C5 + C6: CRITICAL — `responses.json` data structure and score access

This is the most important fix. There is a mismatch between how `responses.json` stores scores and how `persona.js` and `hypothesis.js` access them.

**The problem:**
- `responses.json` stores question scores as nested: `{ scores: { Q01: 4, Q02: 3 } }`
- `persona.js computeGroupScores` looks for `u[key]` where key = `'leadership'` — this will always be `undefined`
- `hypothesis.js` looks for `u[scoreKey]` — same problem

**The solution — TWO parts:**

**Part A: Add flat theme score fields to `responses.json`**

Each record in `responses.json` must also include pre-computed theme averages as flat fields. Add these to the schema:

```json
{
  "employee_id": "E001",
  "business": "Grasim Industries",
  "department": "Operations",
  "region": "India",
  "country": "India",
  "tenure": "3",
  "job_level": "Manager",
  "gender": "Male",
  "generation": "Millennial",
  "function": "Operations",
  "employment_type": "Full-time",
  "potential": "High",
  "year": "2024",
  "month": "Jan '24",
  "is_active": true,
  "overall": 4.2,
  "leadership": 4.3,
  "career_growth": 4.1,
  "recognition": 3.9,
  "work_environment": 4.2,
  "wellbeing": 4.0,
  "overall_rating": 4.2,
  "scores": { "Q01": 4, "Q02": 4, "Q03": 3, "Q13": 4, "Q14": 5 }
}
```

The flat fields (`leadership`, `career_growth` etc.) are what `computeGroupScores` reads. The `scores{}` object is what `statistical.js` reads for Pearson correlations.

**Part B: Fix hypothesis.js score access**

In `server/routes/hypothesis.js` POST /test, change:
```javascript
// WRONG
const scores = testGroup.map(u => u[scoreKey] || u.overall || 0).filter(v => v > 0);

// CORRECT — check nested scores first, then flat field, then overall
const scores = testGroup.map(u => {
  return u.scores?.[scoreKey] ||  // For question IDs like Q01
         u[scoreKey] ||            // For theme names like leadership
         u.overall || 0;
}).filter(v => v > 0);
```

**Instruction to Claude Code:** When generating the 500 `responses.json` sample records, include both the flat theme fields AND the nested scores object for every record.

---

### 20.6 — C7: Top-level filter bar must be passed to `/persona/query`

The persona page has a top-level filter bar (Survey, Business, Year, Country, Include Inactive). These narrow the base universe before persona filters are applied. Add `survey_filters` to the POST /query body:

```javascript
// In server/routes/persona.js — POST /query
// Add survey_filters handling after existing code
router.post('/query', (req, res) => {
  try {
    const { filters = [], comparison_cohorts = [], persona_name, survey_filters = {} } = req.body;
    let units = read('responses.json');

    // Apply top-level survey filters FIRST to narrow universe
    if (survey_filters.business    && survey_filters.business    !== 'All') units = units.filter(u => u.business    === survey_filters.business);
    if (survey_filters.year        && survey_filters.year        !== 'All') units = units.filter(u => u.year        === survey_filters.year);
    if (survey_filters.country     && survey_filters.country     !== 'All') units = units.filter(u => u.country     === survey_filters.country);
    if (survey_filters.include_inactive === 'No')                           units = units.filter(u => u.is_active   !== false);

    // Then apply persona-specific filters to get persona group
    let personaGroup = units;
    for (const f of filters) {
      // ... existing filter logic unchanged
    }
    // rest of route unchanged
```

---

### 20.7 — M1: Remove unused imports from `sentiment.js`

Change the import line in `server/routes/sentiment.js` from:
```javascript
// WRONG — mean, stdDev, pearsonR not used
const { mean, stdDev, pearsonR } = require('../lib/stats');
```
to:
```javascript
// CORRECT — no stats imports needed in sentiment.js
// (stats functions not used directly in this file)
```

---

### 20.8 — M2: Note about hardcoded `knownStats` in `/validate-statistical`

The `knownStats` array in `GET /validate-statistical` is hardcoded with fixed r values. This is acceptable for the POC demo. Add a code comment:

```javascript
// NOTE: knownStats are hardcoded for POC demo.
// In production, these would be fetched from /api/statistical/correlations
// using the main engagement question as the base.
const knownStats = [ ... ];
```

---

### 20.9 — M3: Note about unused `nlp.js` exports

`aggregateTopics` and `sentimentOverTime` in `nlp.js` are exported but never called — `sentiment.js` re-implements the same logic inline. This is intentional for simplicity. Add a comment:

```javascript
// NOTE: aggregateTopics and sentimentOverTime are utility helpers exported
// for potential future use. sentiment.js currently implements inline equivalents.
module.exports = { classifyBatch, aggregateTopics, sentimentOverTime };
```

---

## 21. Definitive Final Checklist

Use this checklist only. Ignore Sections 14 and 16.

### Files to create (new)
- [ ] `server/lib/stats.js` — Section 3
- [ ] `server/lib/nlp.js` — Section 4, cleanup per 18.6, note per 20.9
- [ ] `server/routes/sentiment.js` — Section 5, REPLACE /samples with 15.3, ADD 15.1 classify route, USE 18.8 for include_inactive placement, USE 20.1 for /over-time, ADD 20.4 empty guard, REMOVE unused imports per 20.7
- [ ] `server/routes/statistical.js` — Section 6, ADD 15.5 tab_counts FIX per 20.2, ADD 18.9 include_inactive, ADD 15.7 color_scale, ADD 15.8 pagination, REPLACE /insights with 18.10
- [ ] `server/routes/persona.js` — Section 7, ADD 15.9 save+cohorts, READ responses.json per 18.2, REMOVE duplicate mean/stdDev per 18.5, ADD 20.3 empty guard, ADD 20.5 flat field access, ADD 20.6 survey_filters
- [ ] `server/routes/hypothesis.js` — Section 8, ADD 15.10 history/:id, READ responses.json per 18.2, REMOVE write() per 18.6, USE timestamp ID per 18.11, FIX score access per 20.5
- [ ] `preprocess/sentiment_extract.py` — Section 15.2

### Data files to create
- [ ] `data/sample/questions.json` — 50 questions per 18.4, IDs Q01–Q50
- [ ] `data/sample/responses.json` — 500 records, has is_active per 18.3, has flat theme fields AND nested scores per 20.5
- [ ] `data/sample/sentiments.json` — 200 records, has is_active per 18.3
- [ ] `data/sample/hypotheses.json` — empty array `[]`
- [ ] `data/sample/saved_personas.json` — empty array `[]`
- [ ] `data/sample/open_text_raw.json` — empty array `[]`

### Files to update (existing project)
- [ ] `server/index.js` — add 4 route lines per Section 11
- [ ] `preprocess/extract.py` — add function per Section 10

### Setup command to run first
```bash
mkdir -p server/lib
```

---

> **ABSOLUTE FINAL NOTE to Claude Code:** There are 21 sections in this document. Follow Section 19 build order. Use Section 21 checklist exclusively — ignore Sections 14 and 16. Sections 15, 18, and 20 are all fixes that must be MERGED into the route files from Sections 5–8. Do not create separate files for fixes. Every item in Section 21 checklist must be completed before the build is considered done.
