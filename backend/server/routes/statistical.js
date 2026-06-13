// server/routes/statistical.js — Tab 2: Statistical Analysis (Pearson correlations)
const express = require('express');
const router  = express.Router();
const path    = require('path');
const fs      = require('fs');
const {
  pearsonR, pearsonPValue,
  correlationStrength, correlationCategory
} = require('../lib/stats');
const { callLLMJson } = require('../lib/llm');

const DATA_DIR = path.join(__dirname, '../../data');

function read(f) {
  const full   = path.join(DATA_DIR, f);
  const sample = path.join(DATA_DIR, 'sample', f);
  try { return JSON.parse(fs.readFileSync(full, 'utf8')); } catch {}
  try { return JSON.parse(fs.readFileSync(sample, 'utf8')); } catch {}
  return [];
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/statistical/questions
// ─────────────────────────────────────────────────────────────────────────────
router.get('/questions', (req, res) => {
  try {
    res.json({ questions: read('questions.json') });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/statistical/correlations/:questionId
// Returns full correlation table — paginated (15.5, 15.8, 18.9, 20.2)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/correlations/:questionId', (req, res) => {
  try {
    const { questionId } = req.params;
    const { business, year, country, department, include_inactive = 'No', limit, offset = 0 } = req.query;

    let filtered = read('responses.json');
    if (include_inactive === 'No')                  filtered = filtered.filter(r => r.is_active !== false);
    if (business   && business   !== 'All')          filtered = filtered.filter(r => r.business   === business);
    if (year       && year       !== 'All')          filtered = filtered.filter(r => r.year       === year);
    if (country    && country    !== 'All')          filtered = filtered.filter(r => r.country    === country);
    if (department && department !== 'All')          filtered = filtered.filter(r => r.department === department);

    const questions  = read('questions.json');
    const baseScores = filtered.map(r => r.scores[questionId]).filter(v => v != null);
    const n          = baseScores.length;

    const correlations = questions
      .filter(q => q.id !== questionId)
      .map(q => {
        const otherScores = filtered.map(r => r.scores[q.id]).filter(v => v != null);
        const len = Math.min(baseScores.length, otherScores.length);
        const r   = pearsonR(baseScores.slice(0, len), otherScores.slice(0, len));
        const p   = pearsonPValue(r, len);
        return {
          question_id:   q.id,
          question_text: q.text,
          category:      q.category,
          pearson_r:     r,
          p_value:       p,
          strength:      correlationStrength(r),
          category_bucket: correlationCategory(r),
          significant:   p < 0.05
        };
      })
      .sort((a, b) => Math.abs(b.pearson_r) - Math.abs(a.pearson_r));

    const tab_counts = {
      all:               correlations.length,
      strong_positive:   correlations.filter(c => c.category_bucket === 'strong_positive').length,
      moderate_positive: correlations.filter(c => c.category_bucket === 'moderate_positive').length,
      weak_none:         correlations.filter(c => c.category_bucket === 'weak_none').length,
      negative:          correlations.filter(c => c.category_bucket === 'moderate_negative' || c.category_bucket === 'strong_negative').length
    };

    const total    = correlations.length;
    const off      = parseInt(offset);
    const paged    = limit ? correlations.slice(off, off + parseInt(limit)) : correlations;

    res.json({
      question_id:   questionId,
      question_text: questions.find(q => q.id === questionId)?.text || '',
      n,
      tab_counts,
      total,
      showing: limit ? `Showing ${off + 1}–${Math.min(off + parseInt(limit), total)} of ${total} questions` : `Showing all ${total} questions`,
      correlations: paged
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/statistical/correlogram/:questionId
// NxN Pearson matrix for heatmap (15.7, 18.9)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/correlogram/:questionId', (req, res) => {
  try {
    const { questionId } = req.params;
    const { top = 20, business, year, country, department, include_inactive = 'No' } = req.query;
    const topN = parseInt(top);

    let filtered = read('responses.json');
    if (include_inactive === 'No')                  filtered = filtered.filter(r => r.is_active !== false);
    if (business   && business   !== 'All')          filtered = filtered.filter(r => r.business   === business);
    if (year       && year       !== 'All')          filtered = filtered.filter(r => r.year       === year);
    if (country    && country    !== 'All')          filtered = filtered.filter(r => r.country    === country);
    if (department && department !== 'All')          filtered = filtered.filter(r => r.department === department);

    const questions  = read('questions.json');
    const baseScores = filtered.map(r => r.scores[questionId]).filter(v => v != null);

    const ranked = questions
      .filter(q => q.id !== questionId)
      .map(q => {
        const scores = filtered.map(r => r.scores[q.id]).filter(v => v != null);
        const len = Math.min(baseScores.length, scores.length);
        return { id: q.id, r: Math.abs(pearsonR(baseScores.slice(0, len), scores.slice(0, len))) };
      })
      .sort((a, b) => b.r - a.r)
      .slice(0, topN);

    const topIds = [questionId, ...ranked.map(r => r.id)];

    const matrix = topIds.map(idA =>
      topIds.map(idB => {
        if (idA === idB) return 1.0;
        const scoresA = filtered.map(r => r.scores[idA]).filter(v => v != null);
        const scoresB = filtered.map(r => r.scores[idB]).filter(v => v != null);
        const len = Math.min(scoresA.length, scoresB.length);
        return pearsonR(scoresA.slice(0, len), scoresB.slice(0, len));
      })
    );

    res.json({
      question_ids:    topIds,
      question_labels: topIds.map(id => questions.find(q => q.id === id)?.short_label || id),
      matrix,
      color_scale: {
        min: -1.0,
        max:  1.0,
        labels:  { negative: 'red', neutral: 'white', positive: 'blue' },
        legend:  'Darker color indicates stronger correlation'
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/statistical/network/:questionId
// Node + edge data for relationship network graph (18.9)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/network/:questionId', (req, res) => {
  try {
    const { questionId } = req.params;
    const { top = 25, business, year, country, department, include_inactive = 'No' } = req.query;
    const topN = parseInt(top);

    let filtered = read('responses.json');
    if (include_inactive === 'No')                  filtered = filtered.filter(r => r.is_active !== false);
    if (business   && business   !== 'All')          filtered = filtered.filter(r => r.business   === business);
    if (year       && year       !== 'All')          filtered = filtered.filter(r => r.year       === year);
    if (country    && country    !== 'All')          filtered = filtered.filter(r => r.country    === country);
    if (department && department !== 'All')          filtered = filtered.filter(r => r.department === department);

    const questions  = read('questions.json');
    const baseScores = filtered.map(r => r.scores[questionId]).filter(v => v != null);

    const edges = questions
      .filter(q => q.id !== questionId)
      .map(q => {
        const scores = filtered.map(r => r.scores[q.id]).filter(v => v != null);
        const len = Math.min(baseScores.length, scores.length);
        const r   = pearsonR(baseScores.slice(0, len), scores.slice(0, len));
        return {
          source:    questionId,
          target:    q.id,
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
    const nodes   = Array.from(nodeIds).map(id => ({
      id,
      label:     questions.find(q => q.id === id)?.short_label || id,
      category:  questions.find(q => q.id === id)?.category || '',
      is_center: id === questionId
    }));

    res.json({ nodes, edges });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/statistical/insights/:questionId
// Self-computes top correlations then calls LLM (18.10)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/insights/:questionId', async (req, res) => {
  try {
    const { questionId } = req.params;
    const { business, year, country, department } = req.query;

    const questions = read('questions.json');
    let filtered    = read('responses.json');
    if (business   && business   !== 'All') filtered = filtered.filter(r => r.business   === business);
    if (year       && year       !== 'All') filtered = filtered.filter(r => r.year       === year);
    if (country    && country    !== 'All') filtered = filtered.filter(r => r.country    === country);
    if (department && department !== 'All') filtered = filtered.filter(r => r.department === department);

    const qText      = questions.find(q => q.id === questionId)?.text || questionId;
    const baseScores = filtered.map(r => r.scores[questionId]).filter(v => v != null);

    const corrs = questions
      .filter(q => q.id !== questionId)
      .map(q => {
        const s   = filtered.map(r => r.scores[q.id]).filter(v => v != null);
        const len = Math.min(baseScores.length, s.length);
        return { id: q.id, text: q.text, r: pearsonR(baseScores.slice(0, len), s.slice(0, len)) };
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

    const data = await callLLMJson([{ role: 'user', content: prompt }], 200);
    res.json({ insight: data.insight, top_positive: topPos, top_negative: topNeg });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
