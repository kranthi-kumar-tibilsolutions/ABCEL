// server/routes/persona.js — Tab 3: Dynamic Persona Builder
// Applies all DATA_REALITY_UPDATE corrections: real dimension names, real theme keys, real BUILTIN_COHORTS
const express  = require('express');
const router   = express.Router();
const path     = require('path');
const fs       = require('fs');
const { mean, stdDev, twoSampleZTest, significanceBadge } = require('../lib/stats');
const { callLLMJson } = require('../lib/llm');

const DATA_DIR = path.join(__dirname, '../../data');

function read(f) {
  const full   = path.join(DATA_DIR, f);
  const sample = path.join(DATA_DIR, 'sample', f);
  try { return JSON.parse(fs.readFileSync(full, 'utf8')); } catch {}
  try { return JSON.parse(fs.readFileSync(sample, 'utf8')); } catch {}
  return [];
}

// Real dimension names from responses.json (DATA_REALITY_UPDATE §6)
const DIMS = ['business', 'generation', 'gender', 'job_level', 'tenure', 'country', 'is_manager', 'abglp'];

const DIM_LABELS = {
  business:    'Business',
  generation:  'Generation',
  gender:      'Gender',
  job_level:   'Job Band Level',
  tenure:      'Tenure Band',
  country:     'Country',
  is_manager:  'Manager (Y/N)',
  abglp:       'ABGLP Talent Pool'
};

// Real theme field names from responses.json (DATA_REALITY_UPDATE §7)
const THEMES = [
  { label: 'Engagement',            key: 'engagement' },
  { label: 'Leadership',            key: 'leadership' },
  { label: 'Performance Culture',   key: 'performance_culture' },
  { label: 'Development & Career',  key: 'development_and_career' },
  { label: 'Manager Effectiveness', key: 'manager_effectiveness' },
  { label: 'Onboarding',            key: 'onboarding' },
];

// Real built-in cohorts with real dimension values (DATA_REALITY_UPDATE §10)
const BUILTIN_COHORTS = {
  gen_z:       { label: 'Gen Z',               filter: [{ dimension: 'generation', operator: 'eq', value: 'Gen Z' }] },
  gen_y:       { label: 'Gen Y (Millennials)',  filter: [{ dimension: 'generation', operator: 'eq', value: 'Gen Y' }] },
  female:      { label: 'Female Employees',     filter: [{ dimension: 'gender',     operator: 'eq', value: 'Female' }] },
  new_joiners: { label: 'New Joiners (0-2 yrs)',filter: [{ dimension: 'tenure',     operator: 'eq', value: '0-2 years' }] },
  junior_mgmt: { label: 'Junior Management',    filter: [{ dimension: 'job_level',  operator: 'eq', value: 'Junior Management' }] },
  senior_mgmt: { label: 'Senior Management',    filter: [{ dimension: 'job_level',  operator: 'eq', value: 'Senior Management' }] },
  abglp:       { label: 'ABGLP Talent Pool',    filter: [{ dimension: 'abglp',      operator: 'eq', value: 'Yes' }] },
  managers:    { label: 'People Managers',      filter: [{ dimension: 'is_manager', operator: 'eq', value: 'Yes' }] },
};

// Compute mean and std per theme for a group (DATA_REALITY_UPDATE §7)
function computeGroupScores(group, themes) {
  const result = {};
  for (const theme of themes) {
    const vals = group.map(u => u[theme.key]).filter(v => v != null && v > 0);
    result[theme.label] = {
      mean: vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0,
      std:  stdDev(vals),
      n:    vals.length
    };
  }
  return result;
}

// Apply a filter array to a dataset
function applyFilters(data, filters) {
  let result = data;
  for (const f of filters) {
    result = result.filter(u => {
      const val = u[f.dimension];
      if (val === undefined) return false;
      if (f.operator === 'eq')       return String(val) === String(f.value);
      if (f.operator === 'gte')      return parseFloat(val) >= parseFloat(f.value);
      if (f.operator === 'lte')      return parseFloat(val) <= parseFloat(f.value);
      if (f.operator === 'contains') return String(val).toLowerCase().includes(String(f.value).toLowerCase());
      return true;
    });
  }
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/persona/query — core persona computation (18.2, 20.3, 20.5, 20.6)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/query', (req, res) => {
  try {
    const { filters = [], comparison_cohorts = [], persona_name, survey_filters = {} } = req.body;

    let units = read('responses.json');

    // Apply top-level survey filters first to narrow universe (20.6)
    if (survey_filters.business    && survey_filters.business    !== 'All') units = units.filter(u => u.business  === survey_filters.business);
    if (survey_filters.year        && survey_filters.year        !== 'All') units = units.filter(u => u.year      === survey_filters.year);
    if (survey_filters.country     && survey_filters.country     !== 'All') units = units.filter(u => u.country   === survey_filters.country);
    if (survey_filters.include_inactive === 'No')                           units = units.filter(u => u.is_active !== false);

    let personaGroup = applyFilters(units, filters);
    const personaN = personaGroup.length;

    // Guard against empty persona (20.3)
    if (personaN === 0) {
      return res.status(400).json({
        error: 'No employees match the selected filters. Try broadening your criteria.',
        persona_n: 0
      });
    }

    const personaScores = computeGroupScores(personaGroup, THEMES);
    const overallScores = computeGroupScores(units, THEMES);
    const overallN      = units.length;

    // Resolve comparison cohorts
    const comparisons = comparison_cohorts.map(cohortId => {
      const cohortDef = BUILTIN_COHORTS[cohortId];
      if (!cohortDef) return null;
      const cohortGroup = applyFilters(units, cohortDef.filter);
      return {
        id:     cohortId,
        label:  cohortDef.label,
        n:      cohortGroup.length,
        scores: computeGroupScores(cohortGroup, THEMES)
      };
    }).filter(Boolean);

    const themeResults = THEMES.map(theme => {
      const personaMean = personaScores[theme.label]?.mean || 0;
      const personaStd  = personaScores[theme.label]?.std  || 0;
      const overallMean = overallScores[theme.label]?.mean  || 0;
      const overallStd  = overallScores[theme.label]?.std   || 0;

      const zResult = twoSampleZTest(personaMean, overallMean, personaStd, overallStd, personaN, overallN);
      const badge   = significanceBadge(zResult.p);

      const row = {
        theme:              theme.label,
        persona_score:      parseFloat(personaMean.toFixed(2)),
        overall_score:      parseFloat(overallMean.toFixed(2)),
        delta_overall:      parseFloat((personaMean - overallMean).toFixed(2)),
        p_value:            zResult.p,
        significant:        badge.significant,
        significance_label: badge.significant ? `p < ${zResult.p < 0.01 ? '0.01' : '0.05'}` : 'n.s.',
        comparisons:        {}
      };

      for (const cohort of comparisons) {
        const cohortMean = cohort.scores[theme.label]?.mean || 0;
        const cohortStd  = cohort.scores[theme.label]?.std  || 0;
        const zC = twoSampleZTest(personaMean, cohortMean, personaStd, cohortStd, personaN, cohort.n);
        row.comparisons[cohort.id] = {
          score:       parseFloat(cohortMean.toFixed(2)),
          delta:       parseFloat((personaMean - cohortMean).toFixed(2)),
          p_value:     zC.p,
          significant: significanceBadge(zC.p).significant
        };
      }

      return row;
    });

    const diffSummary = {
      vs_overall: themeResults.filter(t => t.significant).length,
      vs_cohorts: {}
    };
    for (const cohort of comparisons) {
      diffSummary.vs_cohorts[cohort.id] = themeResults.filter(t => t.comparisons[cohort.id]?.significant).length;
    }

    res.json({
      persona_name: persona_name || 'Custom Persona',
      persona_n:    personaN,
      themes:       themeResults,
      comparisons:  comparisons.map(c => ({ id: c.id, label: c.label, n: c.n })),
      diff_summary: diffSummary
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/persona/dimensions — real dimension names (DATA_REALITY_UPDATE §6)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/dimensions', (req, res) => {
  try {
    const units = read('responses.json');
    const dimensions = DIMS.map(dim => ({
      id:     dim,
      label:  DIM_LABELS[dim] || dim,
      values: [...new Set(units.map(u => u[dim]).filter(Boolean))].sort()
    }));
    res.json({ dimensions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/persona/top5 — auto-detected distinctive cohorts
// ─────────────────────────────────────────────────────────────────────────────
router.get('/top5', (req, res) => {
  try {
    const units       = read('responses.json');
    const suggestions = [];

    for (const dim of DIMS) {
      const values = [...new Set(units.map(u => u[dim]).filter(Boolean))];
      for (const val of values) {
        const group = units.filter(u => u[dim] === val);
        if (group.length < 30) continue;

        const groupScores   = computeGroupScores(group, THEMES);
        const overallScores = computeGroupScores(units, THEMES);

        let maxDelta = 0, maxTheme = '';
        for (const theme of THEMES) {
          const delta = Math.abs((groupScores[theme.label]?.mean || 0) - (overallScores[theme.label]?.mean || 0));
          if (delta > maxDelta) { maxDelta = delta; maxTheme = theme.label; }
        }

        suggestions.push({
          id:          `${dim}_${val}`,
          label:       `${val}`,
          filters:     [{ dimension: dim, operator: 'eq', value: val }],
          n:           group.length,
          key_finding: `${maxDelta > 0 ? '+' : ''}${maxDelta.toFixed(2)} pts on ${maxTheme} vs overall`,
          max_delta:   maxDelta
        });
      }
    }

    const top5 = suggestions.sort((a, b) => b.max_delta - a.max_delta).slice(0, 5);
    res.json({ personas: top5 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/persona/takeaways — LLM key takeaways
// ─────────────────────────────────────────────────────────────────────────────
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

Return ONLY a JSON object: { "takeaways": ["takeaway 1", "takeaway 2", "takeaway 3"] }`;

    const data = await callLLMJson([{ role: 'user', content: prompt }], 300);
    res.json({ takeaways: data.takeaways || data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/persona/save — save persona for reuse (15.9)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/save', (req, res) => {
  try {
    const { persona_name, filters, persona_n, scores } = req.body;
    const savedPath = path.join(DATA_DIR, 'saved_personas.json');
    let saved = [];
    try { saved = JSON.parse(fs.readFileSync(savedPath, 'utf8')); } catch {}

    const id = 'P-' + Date.now();
    saved.push({ id, name: persona_name, filters, n: persona_n, scores, created_at: new Date().toISOString() });
    fs.writeFileSync(savedPath, JSON.stringify(saved, null, 2));
    res.json({ success: true, id, persona_name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/persona/cohorts — built-in + saved cohorts (15.9)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/cohorts', (req, res) => {
  try {
    const savedPath = path.join(DATA_DIR, 'saved_personas.json');
    let saved = [];
    try { saved = JSON.parse(fs.readFileSync(savedPath, 'utf8')); } catch {}

    const builtin = Object.entries(BUILTIN_COHORTS).map(([id, def]) => ({
      id, name: def.label, type: 'builtin'
    }));

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

module.exports = router;
