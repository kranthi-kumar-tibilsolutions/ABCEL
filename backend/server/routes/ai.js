const express = require('express');
const router  = express.Router();
const fs      = require('fs');
const path    = require('path');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

const dataDir = path.resolve('./backend/data');
function read(file) {
  try { return JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf8')); }
  catch { return null; }
}

// Scope businesses/units/clusters/cohorts to the user's company for company-level users.
// `companyFilter` (business name) further narrows the data for group-level users who
// pick a specific company via the chat's company filter.
function scopedData(user, companyFilter = null) {
  let businesses = read('businesses.json') || [];
  let units      = read('units.json')      || [];
  let clusters   = read('clusters.json')   || {};
  let cohorts    = read('cohorts.json')    || {};

  const company = user?.role === 'company' ? user.company : companyFilter;

  if (company) {
    businesses = businesses.filter(b => b.name === company);
    units      = units.filter(u => u.business === company);
    clusters   = Object.fromEntries(
      Object.entries(clusters).map(([k, list]) => [k, (list || []).filter(u => u.business === company)])
    );
    cohorts = { gender: [], generation: [], tenure: [], job_band: [] };
  }

  return { businesses, units, clusters, cohorts };
}

// ── Cerebras: primary LLM, retries up to 4× on 429 ──────────────────────────
async function callCerebras(messages, stream = false, maxTokens = 600) {
  const { default: fetch } = await import('node-fetch');
  const MAX_RETRIES = 4;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const delay = Math.min(2 ** (attempt - 1) * 500, 4000); // 500 ms, 1 s, 2 s, 4 s
      await new Promise(r => setTimeout(r, delay));
    }
    const res = await fetch('https://api.cerebras.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.CEREBRAS_API_KEY}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        model:       process.env.CEREBRAS_MODEL || 'gpt-oss-120b',
        messages,
        max_tokens:  maxTokens,
        stream,
        temperature: 0.3,
      }),
    });
    if (res.status !== 429) return res;
  }
  throw new Error('Cerebras rate-limited after 4 retries');
}

// ── Mistral: fallback LLM ─────────────────────────────────────────────────────
// jsonMode: when true, adds response_format=json_object — ONLY safe when the
// prompt shows a filled-in JSON template (not just a field list description).
async function callMistral(messages, stream = false, maxTokens = 600, jsonMode = true) {
  const { default: fetch } = await import('node-fetch');
  const body = {
    model:       'mistral-small-latest',
    messages,
    max_tokens:  maxTokens,
    stream,
    temperature: 0.3,
  };
  if (!stream && jsonMode) body.response_format = { type: 'json_object' };
  return fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify(body),
  });
}

// ── Unified call: Mistral primary, Cerebras fast fallback ────────────────────
// Mistral is primary: generous rate limits, reliable for structured JSON.
// Cerebras is fallback: ultra-fast inference when Mistral is unavailable.
async function callLLM(messages, stream = false, maxTokens = 600, jsonMode = true) {
  try {
    const res = await callMistral(messages, stream, maxTokens, jsonMode);
    if (res.ok) { console.log('[LLM] ✓ Mistral responded'); return res; }
    throw new Error(`Mistral HTTP ${res.status}`);
  } catch (err) {
    console.warn(`[LLM] Mistral failed (${err.message}) — falling back to Cerebras`);
    const res = await callCerebras(messages, stream, maxTokens);
    if (res.ok) console.log('[LLM] ✓ Cerebras responded');
    else console.error(`[LLM] Cerebras also failed: HTTP ${res.status}`);
    return res;
  }
}

// ── Repair truncated JSON (closes unclosed strings/arrays/objects) ───────────
function parseJSON(raw) {
  const text = raw.replace(/```json\n?|```/g, '').trim();
  try { return JSON.parse(text); } catch {}

  const start = text.indexOf('{');
  if (start < 0) throw new Error('No JSON object found in response');
  const s = text.slice(start);

  // Walk the string tracking open structures via a stack
  let inStr = false, esc = false;
  const stack = [];        // holds '}' or ']' — what still needs closing
  let lastSafeEnd = -1;   // position after last time stack drained to empty

  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (esc)               { esc = false;  continue; }
    if (c === '\\' && inStr) { esc = true; continue; }
    if (c === '"')           { inStr = !inStr; continue; }
    if (inStr)               continue;
    if      (c === '{') stack.push('}');
    else if (c === '[') stack.push(']');
    else if (c === '}' || c === ']') {
      stack.pop();
      if (stack.length === 0) lastSafeEnd = i + 1;
    }
  }

  // A complete root-level object exists somewhere — use it
  if (lastSafeEnd > 0) {
    try { return JSON.parse(s.slice(0, lastSafeEnd)); } catch {}
  }

  // Repair truncated response:
  // if we ended mid-string, back up to before the opening quote
  let repaired = inStr ? s.slice(0, s.lastIndexOf('"')) : s;

  repaired = repaired
    .replace(/,?\s*"[^"]*$/, '')   // strip incomplete string key or value
    .replace(/:\s*[\w.]*$/, '')    // strip dangling colon + partial value
    .replace(/,\s*$/, '')          // strip trailing comma
    .trimEnd();

  // Close every still-open bracket/brace in the correct order
  const closers = [...stack].reverse().join('');
  try { return JSON.parse(repaired + closers); } catch {}

  throw new Error('Could not parse or repair AI JSON response');
}

// ── Build data context string shared by all LLM calls ────────────────────────
// `companyFilter`: business name picked via the chat's company filter (group-level users only).
// `focusArea`: category/cohort lens picked via the chat's dimension filter (e.g. "Gender", "Leadership").
function buildContext(dimension = 'Business Unit', user = null, companyFilter = null, focusArea = null) {
  const meta = read('meta.json') || {};
  const { businesses, clusters, cohorts } = scopedData(user, companyFilter);
  const isCompanyUser  = user?.role === 'company';
  const scopedCompany  = isCompanyUser ? user.company : companyFilter;

  // Top 5 + bottom 3 only to keep context short
  const sorted = [...businesses].sort((a,b) => (b.overall||0)-(a.overall||0));
  const topBiz = sorted.slice(0, 5);
  const botBiz = sorted.slice(-3);
  const bizSample = [...topBiz, ...botBiz];

  const bizLines = bizSample.map(b =>
    `${b.name}: ${b.overall} (${b.band})`
  ).join('\n');

  const clusterLines = Object.entries(clusters).map(([k, units]) =>
    `${k}: ${(units||[]).length} BUs`
  ).join(', ');

  const genderLine     = (cohorts.gender||[]).map(c=>`${c.name}=${c.overall}`).join(', ');
  const generationLine = (cohorts.generation||[]).map(c=>`${c.name}=${c.overall}`).join(', ');
  const ageGroupLine   = (cohorts.age_group||[]).map(c=>`${c.name}=${c.overall}`).join(', ');
  const jobBandLine    = (cohorts.job_band||[]).map(c=>`${c.name}=${c.overall}`).join(', ');
  const tenureLine     = (cohorts.tenure||[]).map(c=>`${c.name} yrs=${c.overall}`).join(', ');

  const headerLines = scopedCompany
    ? `ABG Vibes Employee Survey — ${meta.survey_name || '2026'}
Company: ${scopedCompany}
Dimension: ${dimension}`
    : `ABG Vibes Employee Survey — ${meta.survey_name || '2026'}
Respondents: ${meta.total_respondents || 55457} | Businesses: ${meta.total_businesses || businesses.length} | BUs: ${meta.total_units || 415}
Group avg: ${meta.group_avg || 4.46}/5 | Top: ${meta.top_business} (${meta.top_score}) | Lowest: ${meta.lowest_business} (${meta.lowest_score})
Strongest category: ${meta.strongest_category} | Weakest: ${meta.weakest_category}
Dimension: ${dimension}`;

  const cohortSection = (isCompanyUser || scopedCompany)
    ? ''
    : `
GENDER: ${genderLine}
GENERATION: ${generationLine}
AGE GROUP (numeric bands): ${ageGroupLine || '(not yet computed — re-upload data to populate)'}
JOB BAND: ${jobBandLine}
TENURE (years): ${tenureLine}`;

  const focusLine = focusArea ? `\nFOCUS AREA: ${focusArea} (prioritise this in your analysis)` : '';

  return `${headerLines}${focusLine}

TOP/BOTTOM BUSINESSES: ${bizLines}

CLUSTERS: ${clusterLines}${cohortSection}`.trim();
}

// ── CALL 1: AI Executive Summary ──────────────────────────────────────────────
router.post('/summary', async (req, res) => {
  const { dimension = 'Business Unit' } = req.body;

  const prompt = `You are an expert HR analytics AI for Aditya Birla Group.
Generate an executive summary of engagement data analysed by ${dimension} dimension.

DATA:
${buildContext(dimension, req.user)}

Respond ONLY with valid JSON (no markdown, no backticks):
{
  "bullets": [
    "Specific finding 1 with numbers",
    "Specific finding 2 with numbers",
    "Specific finding 3 with numbers",
    "Specific finding 4 with numbers"
  ],
  "takeaway": "One actionable sentence for HR leadership",
  "whyMatters": "One sentence on business impact"
}`;

  try {
    const r = await callLLM([{ role: 'user', content: prompt }], false, 800);
    if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e?.error?.message || `LLM HTTP ${r.status}`); }
    const data    = await r.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('AI returned empty response. Please retry.');
    res.json(parseJSON(content));
  } catch (err) {
    console.error('Summary error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── CALL 2: Right Panel AI Insights ──────────────────────────────────────────
router.post('/insights', async (req, res) => {
  const prompt = `You are an HR analytics AI for ABG. Analyse this data.

DATA:
${buildContext('Business Unit', req.user)}

Respond ONLY with valid JSON:
{
  "topTrends": [
    { "direction": "up",   "text": "specific trend with numbers" },
    { "direction": "up",   "text": "specific trend with numbers" },
    { "direction": "down", "text": "specific trend with numbers" }
  ],
  "outliers": [
    { "direction": "down", "text": "specific outlier with business name" },
    { "direction": "down", "text": "specific outlier with business name" },
    { "direction": "down", "text": "specific outlier with business name" }
  ],
  "summary": "2-sentence overall summary"
}`;

  try {
    const r = await callLLM([{ role: 'user', content: prompt }], false, 700);
    if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e?.error?.message || `LLM HTTP ${r.status}`); }
    const data    = await r.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('AI returned empty response. Please retry.');
    res.json(parseJSON(content));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── CALL 3: Business Drill-Down AI Insight ────────────────────────────────────
router.post('/business-insight', async (req, res) => {
  const { businessName, business } = req.body;
  const name       = businessName || business;
  const { businesses } = scopedData(req.user);
  const meta       = read('meta.json')       || {};
  const biz = businesses.find(b => b.name === name);
  if (!biz) return res.status(404).json({ error: 'Business not found' });

  const prompt = `You are an HR analytics AI. Analyse this business.

Business: ${biz.name}
Overall: ${biz.overall}/5 (group avg: ${meta.group_avg})
Categories: ${JSON.stringify(biz.categories)}
Band: ${biz.band}
Rank: #${biz.rank} of ${businesses.length}

Respond ONLY with valid JSON:
{
  "strength":       "What this business does best — 1 sentence with specific score",
  "risk":           "Biggest risk area — 1 sentence with specific score",
  "cohortToWatch":  "Which cohort needs attention — 1 sentence",
  "recommendation": "Top HR action — 1 concrete sentence"
}`;

  try {
    const r = await callLLM([{ role: 'user', content: prompt }], false, 400);
    if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e?.error?.message || `LLM HTTP ${r.status}`); }
    const data    = await r.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('AI returned empty response. Please retry.');
    const p = parseJSON(content);
    res.json({
      summary:         p.strength || p.risk || '',
      strengths:       p.strength       ? [p.strength]       : [],
      concerns:        [p.risk, p.cohortToWatch].filter(Boolean),
      recommendations: p.recommendation ? [p.recommendation] : [],
      // keep flat fields for any other consumers
      strength: p.strength, risk: p.risk,
      cohortToWatch: p.cohortToWatch, recommendation: p.recommendation,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── CALL 4: Chat with Data — SSE Streaming ────────────────────────────────────
router.post('/chat', async (req, res) => {
  const { message, history = [], dimension = 'Business Unit', companyFilter = null, focusArea = null } = req.body;

  res.setHeader('Content-Type',  'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection',    'keep-alive');
  res.flushHeaders();

  const focusInstruction = focusArea
    ? `\n- The user has set a focus area filter to "${focusArea}" — frame your analysis around this dimension/category when relevant.`
    : '';
  const companyInstruction = companyFilter
    ? `\n- The user has filtered to company "${companyFilter}" — base your answer only on this company's data.`
    : '';

  const systemPrompt = `You are an AI analyst assistant for ABG's employee engagement dashboard. Keep replies short and natural.

- Greetings or small talk → respond briefly and warmly (1 sentence), then offer to help with engagement data. Do NOT cite any numbers.
- Specific questions about data → answer in 2-3 sentences, lead with the key insight and number, use **bold** for key figures.
- Never start a reply with "!" or similar punctuation.
- "age group" or "age" questions → use GENERATION data (Gen Z, Gen Y, Gen X, Baby Boomer, Traditionalist). There is no separate age column.
- Never answer an age/generation question using gender data.${focusInstruction}${companyInstruction}

SURVEY DATA (use only when the user asks a data question):
${buildContext(dimension, req.user, companyFilter, focusArea)}`;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-6),
    { role: 'user',   content: message }
  ];

  try {
    const r = await callLLM(messages, true, 400);
    r.body.on('data', (chunk) => {
      const lines = chunk.toString().split('\n').filter(l => l.startsWith('data: '));
      for (const line of lines) {
        const json = line.slice(6).trim();
        if (json === '[DONE]') { res.write('data: [DONE]\n\n'); return; }
        try {
          const tok = JSON.parse(json).choices?.[0]?.delta?.content || '';
          if (tok) res.write(`data: ${JSON.stringify({ text: tok })}\n\n`);
        } catch {}
      }
    });
    r.body.on('end',   () => { res.write('data: [DONE]\n\n'); res.end(); });
    r.body.on('error', () => { res.write('data: [DONE]\n\n'); res.end(); });
  } catch (err) {
    res.write(`data: ${JSON.stringify({ text: 'AI unavailable. Please try again.' })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  }
});

// ── CALL 5: Focus Areas ───────────────────────────────────────────────────────
// Uses a filled-in JSON template (same pattern as /summary) so the model
// fills in values rather than emitting empty objects.
// jsonMode is OFF — template approach works better without it.
router.post('/focus-areas', async (req, res) => {
  const { units } = scopedData(req.user);
  const meta  = read('meta.json')  || {};
  const avg   = meta.group_avg || 4.46;

  const byScore = (a, b) => (a.overall ?? 0) - (b.overall ?? 0); // asc = worst first
  const critical  = units.filter(u => u.cluster === 'critical').sort(byScore)[0]
                 || units.filter(u => u.cluster === 'atrisk').sort(byScore)[0];
  const polarised = units.filter(u => u.cluster === 'polarised')[0]
                 || units.filter(u => u.cluster === 'atrisk').sort(byScore)[1] // second-worst atrisk
                 || units.filter(u => u.cluster === 'atrisk').sort(byScore)[0];
  const thriving  = units.filter(u => u.cluster === 'thriving').sort((a,b) => (b.overall??0)-(a.overall??0))[0]
                 || units.filter(u => u.cluster === 'atrisk').sort((a,b) => (b.overall??0)-(a.overall??0))[0];

  function cardPrompt(bu, cardType) {
    const isBright = cardType === 'brightSpots';
    const dir      = isBright ? 'up' : 'down';
    const badge    = isBright ? 'High Performer' : cardType === 'criticalWatchlist' ? 'Critical Risk' : 'Emerging Risk';
    const q1hint   = isBright
      ? 'a positive quote about team spirit or growth'
      : 'a pain-point quote about leadership or workload';

    return `You are an HR analytics AI for Aditya Birla Group.
Write a focus area card for this business unit.

BU: ${bu.name}
Score: ${bu.overall}/5.00  |  Group avg: ${avg}/5.00  |  ~${bu.respondent_count || 350} respondents
Card type: ${cardType}

Respond ONLY with valid JSON (no markdown, no explanation):
{
  "buName": "${bu.name}",
  "badge": "${badge}",
  "quote1": "${q1hint} — write the actual quote here, max 18 words",
  "quote2": "a second realistic employee first-person quote, max 18 words",
  "stat": "Score ${bu.overall}/5.00",
  "impact": "~${bu.respondent_count || 350} employees",
  "sparklineDirection": "${dir}"
}`;
  }

  const callCard = (bu, type) =>
    bu ? callLLM([{ role: 'user', content: cardPrompt(bu, type) }], false, 350, false) : null;

  try {
    const [cRes, pRes, tRes] = await Promise.all([
      callCard(critical,  'criticalWatchlist'),
      callCard(polarised, 'emergingRisks'),
      callCard(thriving,  'brightSpots'),
    ]);

    const extract = async (r) => {
      if (!r) return null;
      if (!r.ok) return null;
      const d = await r.json();
      const c = d.choices?.[0]?.message?.content;
      if (!c) return null;
      try {
        const parsed = parseJSON(c);
        // Guard against empty-object response from model
        return parsed && parsed.buName ? parsed : null;
      } catch { return null; }
    };

    const fallback = (bu, type) => bu ? {
      buName:             bu.name,
      badge:              type === 'brightSpots' ? 'High Performer' : type === 'criticalWatchlist' ? 'Critical Risk' : 'Emerging Risk',
      quote1:             type === 'brightSpots' ? 'Our team collaboration has improved significantly this year.' : 'Communication from leadership has been inconsistent lately.',
      quote2:             type === 'brightSpots' ? 'I feel genuinely valued and supported in my role here.' : 'I am not sure my feedback reaches the right people.',
      stat:               `Score ${bu.overall}/5.00`,
      impact:             `~${bu.respondent_count || 350} employees`,
      sparklineDirection: type === 'brightSpots' ? 'up' : 'down',
    } : null;

    const [critCard, emergCard, brightCard] = await Promise.all([
      extract(cRes),
      extract(pRes),
      extract(tRes),
    ]);

    res.json({
      criticalWatchlist: critCard  || fallback(critical,  'criticalWatchlist') || {},
      emergingRisks:     emergCard || fallback(polarised, 'emergingRisks')     || {},
      brightSpots:       brightCard|| fallback(thriving,  'brightSpots')       || {},
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── CALL 6: InsightsStudio — True 3-Step Agentic Pipeline (SSE) ───────────────
// Each step is a real LLM call whose output feeds the next step.
// Step 1 discovers patterns  →  Step 2 investigates WHY  →  Step 3 prescribes actions.
const SKILLS = {
  'leadership-effectiveness': {
    label: 'Leadership Effectiveness',
    goal:  'Analyse how senior and middle leadership is perceived across BUs. Find where leadership scores are weakest and correlate with low engagement.',
    chartType: 'bar',
  },
  'communication': {
    label: 'Communication',
    goal:  'Identify communication gaps between leadership and employees. Find BUs where communication scores are lowest and correlate with engagement drops.',
    chartType: 'heatmap',
  },
  'recognition-reward': {
    label: 'Recognition & Reward',
    goal:  'Analyse recognition and reward perception across BUs and cohorts. Find which groups feel least recognised and the impact on intent to stay.',
    chartType: 'bar',
  },
  'growth-development': {
    label: 'Growth & Development',
    goal:  'Identify where employees feel least supported in career growth. Find BUs and cohorts with the biggest development gaps, especially Gen Z.',
    chartType: 'bar',
  },
  'work-life-balance': {
    label: 'Work-Life Balance',
    goal:  'Find where workload and wellbeing scores are most concerning. Identify BUs at risk of burnout from low wellbeing combined with low engagement.',
    chartType: 'scatter',
  },
  'team-collaboration': {
    label: 'Team Collaboration',
    goal:  'Analyse team cohesion scores. Find polarised teams (high variance) where some employees are engaged but others are not — a hidden risk.',
    chartType: 'heatmap',
  },
  'psychological-safety': {
    label: 'Psychological Safety',
    goal:  'Find BUs where employees feel least safe to speak up. Correlate with Performance Culture scores as a proxy for psychological safety.',
    chartType: 'scatter',
  },
  'manager-support': {
    label: 'Manager Support',
    goal:  'Deep-dive on Manager Effectiveness scores. Find which BUs have underperforming managers and the gap vs group average.',
    chartType: 'bar',
  },
};

// Helper: make one LLM call and parse the JSON result.
// jsonMode is OFF — the prompt already says "Respond ONLY with valid JSON".
// Retries once on empty content (Mistral fallback occasionally returns empty).
async function agentStep(messages, maxTokens, stepLabel) {
  for (let attempt = 0; attempt <= 1; attempt++) {
    if (attempt > 0) {
      console.warn(`[AGENT] ${stepLabel} empty content — retrying after 2s`);
      await new Promise(r => setTimeout(r, 2000));
    }
    const r = await callLLM(messages, false, maxTokens, false);
    if (!r.ok) {
      const e = await r.json().catch(() => ({}));
      throw new Error(`${stepLabel} failed: ${e?.error?.message || `HTTP ${r.status}`}`);
    }
    const data    = await r.json();
    const content = data.choices?.[0]?.message?.content;
    if (content) return parseJSON(content);
  }
  throw new Error(`${stepLabel} returned empty response`);
}

router.post('/skill-analysis', async (req, res) => {
  const { skill, skills, dimension = 'Business Unit' } = req.body;
  // Accept either a single skill string or an array of skill ids
  const skillIds = skills?.length ? skills : (skill ? [skill] : []);
  if (!skillIds.length) return res.status(400).json({ error: 'No skill selected' });
  const skillDefs = skillIds.map(id => SKILLS[id]).filter(Boolean);
  if (!skillDefs.length) return res.status(400).json({ error: `Unknown skill: ${skillIds[0]}` });
  // Merge multiple skills into one combined focus
  const skillDef = {
    label:     skillDefs.map(s => s.label).join(' & '),
    goal:      skillDefs.map(s => s.goal).join('\n'),
    chartType: skillDefs[0].chartType,
  };

  // SSE setup — client sees live step progress
  res.setHeader('Content-Type',  'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection',    'keep-alive');
  res.flushHeaders();

  const emit = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);

  // ── Data preparation ───────────────────────────────────────────────────────
  const meta = read('meta.json') || {};
  const { businesses, units, cohorts } = scopedData(req.user);

  const sorted    = [...units].sort((a, b) => (b.overall ?? b.score ?? 0) - (a.overall ?? a.score ?? 0));
  const topBUs    = sorted.slice(0, 6);
  const bottomBUs = sorted.slice(-6).reverse();

  // Compact biz context — category scores only, no verbose descriptions
  const bizContext = businesses.map(b =>
    `${b.name} (${b.overall ?? b.score}): ${Object.entries(b.categories || {}).map(([k,v]) => `${k}=${v}`).join(', ')}`
  ).join('\n');

  const cohortContext = Object.entries(cohorts).map(([dim, items]) =>
    `${dim}: ${(items || []).map(c => `${c.name || c.label}=${c.overall ?? c.score}`).join(', ')}`
  ).join('\n');

  const baseContext = `ABG Employee Survey — ${meta.survey_name || '2026'}
Group avg: ${meta.group_avg}/5 | Respondents: ${meta.total_respondents} | BUs: ${meta.total_units}
Top BUs: ${topBUs.map(u => `${u.name}(${u.overall ?? u.score})`).join(', ')}
Bottom BUs: ${bottomBUs.map(u => `${u.name}(${u.overall ?? u.score})`).join(', ')}`;

  try {
    // ══════════════════════════════════════════════════════════════════════════
    // AGENT STEP 1 — PATTERN DISCOVERY
    // Goal: Scan ALL data and surface the 3 strongest signals for this skill.
    // This step has NO prior context — the AI must discover patterns itself.
    // ══════════════════════════════════════════════════════════════════════════
    emit({ step: 1, label: 'Scanning data for patterns…', done: false });
    console.log(`[AGENT] Step 1 — Pattern Discovery (${skillDef.label})`);

    const step1 = await agentStep([{ role: 'user', content:
`You are an HR data analyst agent. Scan this data and find the 3 most significant patterns related to ${skillDef.label}.

SKILL FOCUS: ${skillDef.goal}
DIMENSION: ${dimension}

DATA:
${baseContext}

ALL BUSINESSES WITH SCORES:
${bizContext}

Respond ONLY with valid JSON:
{
  "patterns": [
    "Pattern 1 — name the specific business/BU and its exact score",
    "Pattern 2 — name the specific business/BU and its exact score",
    "Pattern 3 — name the specific business/BU and its exact score"
  ],
  "riskBUs": ["exact BU name 1", "exact BU name 2", "exact BU name 3"],
  "brightSpotBUs": ["exact BU name 1", "exact BU name 2"],
  "keyMetric": "The single most striking number you found, with context"
}`
    }], 450, 'Step 1');

    emit({ step: 1, label: 'Patterns discovered', done: true, finding: step1.keyMetric });
    console.log(`[AGENT] Step 1 done — risk BUs: ${(step1.riskBUs || []).join(', ')}`);
    await new Promise(r => setTimeout(r, 800)); // brief pause between steps

    // ══════════════════════════════════════════════════════════════════════════
    // AGENT STEP 2 — ROOT CAUSE INVESTIGATION
    // Goal: Take Step 1's findings as fact and dig into WHY.
    // Uses cohort data (gender/generation/tenure) that Step 1 didn't see.
    // ══════════════════════════════════════════════════════════════════════════
    emit({ step: 2, label: `Investigating why ${(step1.riskBUs || [])[0] || 'risk BUs'} are struggling…`, done: false });
    console.log(`[AGENT] Step 2 — Root Cause Investigation`);

    const step2 = await agentStep([{ role: 'user', content:
`You are an HR investigation agent analysing ${skillDef.label} at Aditya Birla Group.

Step 1 found these patterns:
${(step1.patterns || []).map((p, i) => `${i + 1}. ${p}`).join('\n')}
At-risk BUs: ${(step1.riskBUs || []).join(', ')}

Cohort scores (use these to explain WHY the at-risk BUs are struggling):
${cohortContext}

Respond ONLY with valid JSON. All values must be plain strings — no nested objects or arrays.
{
  "cohortFindings": "One sentence: which cohort (Gen Z / short-tenure / Non-Management) scores lowest and by how much vs group avg",
  "rootCause": "One sentence: the specific structural reason these BUs underperform on ${skillDef.label}",
  "agentReasoning": "Two to three sentences connecting Step 1 patterns to the cohort gap. Name specific scores."
}`
    }], 800, 'Step 2');

    emit({ step: 2, label: 'Root causes identified', done: true });
    console.log(`[AGENT] Step 2 done — cohort: ${(step2.cohortFindings || '').slice(0, 60)}…`);
    await new Promise(r => setTimeout(r, 800)); // brief pause between steps

    // ══════════════════════════════════════════════════════════════════════════
    // AGENT STEP 3 — ACTION GENERATION
    // Goal: Synthesise Steps 1+2 into specific, ownable recommendations.
    // This agent sees ONLY the findings — forces real synthesis, not re-scan.
    // ══════════════════════════════════════════════════════════════════════════
    emit({ step: 3, label: 'Generating priority actions…', done: false });
    console.log(`[AGENT] Step 3 — Action Synthesis`);

    const step3 = await agentStep([{ role: 'user', content:
`You are an HR strategy agent finalising a ${skillDef.label} analysis for Aditya Birla Group.

Investigation findings:
Patterns: ${(step1.patterns || []).join(' | ')}
At-risk BUs: ${(step1.riskBUs || []).join(', ')}
Bright spots: ${(step1.brightSpotBUs || []).join(', ')}
Root cause: ${step2.rootCause || 'Not identified'}
Cohort impact: ${step2.cohortFindings || 'Not identified'}

Respond ONLY with valid JSON (no markdown):
{
  "headline": "Leadership gap in 3 BUs threatens Group-wide engagement",
  "keyFindings": [
    "International JV Ops scores 2.76 on Leadership, 1.7 pts below group avg",
    "Gen Z employees rate leadership 0.34 pts lower than senior cohorts",
    "Fashion Retail North shows lowest manager visibility at 2.85"
  ],
  "priorityActions": [
    { "rank": 1, "action": "Launch 90-day leadership coaching for bottom-3 BU managers", "owner": "HR Business Partner", "timeline": "30 days", "expectedImpact": "0.3pt leadership score improvement in 1 quarter" },
    { "rank": 2, "action": "Introduce monthly skip-level listening sessions in at-risk BUs", "owner": "Senior Leadership", "timeline": "90 days", "expectedImpact": "Reduce leadership perception gap by 50%" },
    { "rank": 3, "action": "Build Gen Z onboarding module covering leadership access and visibility", "owner": "L&D / HR", "timeline": "6 months", "expectedImpact": "Close Gen Z-senior leadership gap from 0.34 to under 0.15" }
  ]
}`
    }], 600, 'Step 3');

    emit({ step: 3, label: 'Recommendations ready', done: true });
    console.log(`[AGENT] Step 3 done — headline: ${step3.headline}`);

    // ══════════════════════════════════════════════════════════════════════════
    // MERGE — Combine all 3 agent outputs into the final result object
    // ══════════════════════════════════════════════════════════════════════════
    const finalResult = {
      skillLabel:      skillDef.label,
      chartType:       skillDef.chartType,
      headline:        step3.headline        || step1.keyMetric  || '',
      agentReasoning:  step2.agentReasoning  || '',
      keyFindings:     step3.keyFindings     || step1.patterns   || [],
      riskBUs:         step1.riskBUs         || [],
      brightSpotBUs:   step1.brightSpotBUs   || [],
      priorityActions: step3.priorityActions || [],
      cohortInsight:   step2.cohortFindings  || '',
    };

    emit({ result: finalResult });
    res.write('data: [DONE]\n\n');
    res.end();
    console.log(`[AGENT] ✓ ${skillDef.label} analysis complete`);

  } catch (err) {
    console.error('[AGENT] Pipeline error:', err.message);
    emit({ error: err.message });
    res.write('data: [DONE]\n\n');
    res.end();
  }
});

module.exports = router;
