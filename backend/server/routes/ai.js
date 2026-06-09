const express = require('express');
const router  = express.Router();
const fs      = require('fs');
const path    = require('path');

const dataDir = path.resolve('./backend/data');
function read(file) {
  try { return JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf8')); }
  catch { return null; }
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
async function callMistral(messages, stream = false, maxTokens = 600) {
  const { default: fetch } = await import('node-fetch');
  return fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      model:       process.env.MISTRAL_MODEL || 'mistral-small-latest',
      messages,
      max_tokens:  maxTokens,
      stream,
      temperature: 0.3,
    }),
  });
}

// ── Unified call: Cerebras first, silent fallback to Mistral ─────────────────
async function callLLM(messages, stream = false, maxTokens = 600) {
  try {
    const res = await callCerebras(messages, stream, maxTokens);
    if (res.ok) { console.log('[LLM] ✓ Cerebras responded'); return res; }
    throw new Error(`Cerebras HTTP ${res.status}`);
  } catch (err) {
    console.warn(`[LLM] Cerebras failed (${err.message}) — falling back to Mistral`);
    const res = await callMistral(messages, stream, maxTokens);
    if (res.ok) console.log('[LLM] ✓ Mistral responded');
    else console.error(`[LLM] Mistral also failed: HTTP ${res.status}`);
    return res;
  }
}

// ── Repair truncated JSON (closes unclosed strings/braces) ───────────────────
function parseJSON(raw) {
  const text = raw.replace(/```json|```/g, '').trim();
  // Try direct parse first
  try { return JSON.parse(text); } catch {}

  // Find start of root object
  const start = text.indexOf('{');
  if (start < 0) throw new Error('No JSON object found in response');
  let s = text.slice(start);

  // Walk to find last complete top-level closing brace
  let depth = 0, inStr = false, esc = false, lastClose = -1;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (esc)      { esc = false; continue; }
    if (c === '\\' && inStr) { esc = true; continue; }
    if (c === '"') { inStr = !inStr; continue; }
    if (inStr)    continue;
    if (c === '{' || c === '[') depth++;
    if (c === '}' || c === ']') { depth--; if (depth === 0) lastClose = i; }
  }
  if (lastClose > 0) {
    try { return JSON.parse(s.slice(0, lastClose + 1)); } catch {}
  }

  // Last resort: truncate at last complete key-value before an incomplete string
  const truncated = s.replace(/,?\s*"[^"]*$/, '').replace(/,\s*$/, '');
  const closed = truncated + '}';
  try { return JSON.parse(closed); } catch {}

  throw new Error('Could not parse or repair AI JSON response');
}

// ── Build data context string shared by all LLM calls ────────────────────────
function buildContext(dimension = 'Business Unit') {
  const meta      = read('meta.json')      || {};
  const businesses= read('businesses.json')|| [];
  const clusters  = read('clusters.json')  || {};
  const cohorts   = read('cohorts.json')   || {};

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

  const genderLine = (cohorts.gender||[]).map(c=>`${c.name}=${c.overall}`).join(', ');

  return `ABG Vibes Employee Survey — ${meta.survey_name || '2026'}
Respondents: ${meta.total_respondents || 55457} | Businesses: ${meta.total_businesses || businesses.length} | BUs: ${meta.total_units || 415}
Group avg: ${meta.group_avg || 4.46}/5 | Top: ${meta.top_business} (${meta.top_score}) | Lowest: ${meta.lowest_business} (${meta.lowest_score})
Strongest category: ${meta.strongest_category} | Weakest: ${meta.weakest_category}
Dimension: ${dimension}

TOP/BOTTOM BUSINESSES: ${bizLines}

CLUSTERS: ${clusterLines}
GENDER: ${genderLine}`.trim();
}

// ── CALL 1: AI Executive Summary ──────────────────────────────────────────────
router.post('/summary', async (req, res) => {
  const { dimension = 'Business Unit' } = req.body;

  const prompt = `You are an expert HR analytics AI for Aditya Birla Group.
Generate an executive summary of engagement data analysed by ${dimension} dimension.

DATA:
${buildContext(dimension)}

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
    const r       = await callLLM([{ role: 'user', content: prompt }], false, 800);
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
router.post('/insights', async (_req, res) => {
  const prompt = `You are an HR analytics AI for ABG. Analyse this data.

DATA:
${buildContext()}

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
    const r       = await callLLM([{ role: 'user', content: prompt }], false, 700);
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
  const { businessName } = req.body;
  const businesses = read('businesses.json') || [];
  const meta       = read('meta.json')       || {};
  const biz = businesses.find(b => b.name === businessName);
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
    const r       = await callLLM([{ role: 'user', content: prompt }], false, 400);
    const data    = await r.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('AI returned empty response. Please retry.');
    res.json(parseJSON(content));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── CALL 4: Chat with Data — SSE Streaming ────────────────────────────────────
router.post('/chat', async (req, res) => {
  const { message, history = [], dimension = 'Business Unit' } = req.body;

  res.setHeader('Content-Type',  'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection',    'keep-alive');
  res.flushHeaders();

  const systemPrompt = `You are an expert HR analytics AI analyst for Aditya Birla Group.
Be concise (3-4 sentences). Lead with the insight, support with specific numbers.
Think like a McKinsey consultant. Use the data provided — never say you lack access.

DATA CONTEXT:
${buildContext(dimension)}`;

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
router.post('/focus-areas', async (_req, res) => {
  const units = read('units.json') || [];
  const critical  = units.filter(u => u.cluster === 'critical').slice(0, 3);
  const polarised = units.filter(u => u.cluster === 'polarised').slice(0, 3);
  const thriving  = units.filter(u => u.cluster === 'thriving').slice(0, 3);

  const prompt = `You are an HR analytics AI. Generate focus area card content.

Critical BUs: ${JSON.stringify(critical.map(u => ({ name: u.name, score: u.overall, categories: u.categories })))}
Polarised BUs: ${JSON.stringify(polarised.map(u => ({ name: u.name, score: u.overall })))}
Thriving BUs: ${JSON.stringify(thriving.map(u => ({ name: u.name, score: u.overall })))}

Respond ONLY with valid JSON:
{
  "criticalWatchlist": {
    "buName":  "exact BU name from Critical BUs list",
    "badge":   "Open Conflict",
    "quote1":  "realistic employee voice quote about a specific problem",
    "quote2":  "second realistic employee voice quote",
    "stat":    "Polarization ↑ 0.31 (was 0.18)",
    "impact":  "~1,250 employees",
    "sparklineDirection": "down"
  },
  "emergingRisks": {
    "buName":  "exact BU name from Polarised BUs list",
    "badge":   "Polarised",
    "quote1":  "realistic employee voice quote",
    "quote2":  "second realistic employee voice quote",
    "stat":    "Engagement ↓ 0.18 vs last wave",
    "impact":  "~900 employees",
    "sparklineDirection": "down"
  },
  "brightSpots": {
    "buName":  "exact BU name from Thriving BUs list",
    "badge":   "Thriving",
    "quote1":  "positive employee voice quote",
    "quote2":  "second positive employee voice quote",
    "stat":    "Engagement ↑ 0.12 vs last wave",
    "impact":  "~1,100 employees",
    "sparklineDirection": "up"
  }
}`;

  try {
    const r       = await callLLM([{ role: 'user', content: prompt }], false, 700);
    const data    = await r.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('AI returned empty response. Please retry.');
    res.json(parseJSON(content));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── CALL 6: InsightsStudio Skill Analysis (8-skill agent system) ──────────────
const SKILLS = {
  'leadership-effectiveness': {
    label: 'Leadership Effectiveness',
    goal: 'Analyse how senior and middle leadership is perceived across BUs. Find where leadership scores are weakest, where they correlate with low engagement, and which specific leadership behaviours need attention.',
    chartType: 'bar',
  },
  'communication': {
    label: 'Communication',
    goal: 'Identify communication gaps between leadership and employees. Find BUs where communication scores are lowest and correlate with engagement drops.',
    chartType: 'heatmap',
  },
  'recognition-reward': {
    label: 'Recognition & Reward',
    goal: 'Analyse recognition and reward perception across BUs and cohorts. Find which groups feel least recognised and what impact this has on engagement and intent to stay.',
    chartType: 'bar',
  },
  'growth-development': {
    label: 'Growth & Development',
    goal: 'Identify where employees feel least supported in career growth and skill development. Find the BUs and cohorts with the biggest development gaps, especially Gen Z.',
    chartType: 'bar',
  },
  'work-life-balance': {
    label: 'Work-Life Balance',
    goal: 'Find where workload and wellbeing scores are most concerning. Identify BUs at risk of burnout based on low wellbeing combined with low engagement scores.',
    chartType: 'scatter',
  },
  'team-collaboration': {
    label: 'Team Collaboration',
    goal: 'Analyse team cohesion and collaboration scores. Find polarised teams (high variance) where some employees are engaged but others are not — a hidden risk.',
    chartType: 'heatmap',
  },
  'psychological-safety': {
    label: 'Psychological Safety',
    goal: 'Find BUs where employees feel least safe to speak up, give feedback, or raise concerns. Correlate with Performance Culture scores as a proxy.',
    chartType: 'scatter',
  },
  'manager-support': {
    label: 'Manager Support',
    goal: 'Deep-dive on Manager Effectiveness scores. Find which managers (by BU) are underperforming. Identify the gap between how managers rate themselves vs how their teams rate them.',
    chartType: 'bar',
  },
};

router.post('/skill-analysis', async (req, res) => {
  const { skill, dimension = 'Business Unit' } = req.body;
  const skillDef = SKILLS[skill];
  if (!skillDef) return res.status(400).json({ error: `Unknown skill: ${skill}` });

  const meta       = read('meta.json')       || {};
  const businesses = read('businesses.json') || [];
  const units      = read('units.json')      || [];
  const cohorts    = read('cohorts.json')    || {};

  const sorted     = [...units].sort((a, b) => (b.overall ?? b.score ?? 0) - (a.overall ?? a.score ?? 0));
  const topBUs     = sorted.slice(0, 5);
  const bottomBUs  = sorted.slice(-5).reverse();
  const highVar    = [...units].sort((a, b) => (b.variance ?? 0) - (a.variance ?? 0)).slice(0, 5);

  const context = `
Organisation: ${meta.survey_name || 'Employee Survey'}
Group average: ${meta.group_avg} / 5
Total respondents: ${meta.total_respondents}
Weakest category: ${meta.weakest_category}
Strongest category: ${meta.strongest_category}

Top 5 BUs: ${topBUs.map(u => `${u.name} (${u.overall ?? u.score})`).join(', ')}
Bottom 5 BUs: ${bottomBUs.map(u => `${u.name} (${u.overall ?? u.score})`).join(', ')}
High variance BUs: ${highVar.map(u => `${u.name} variance=${u.variance ?? 'N/A'}`).join(', ')}

All businesses with category scores:
${businesses.map(b => `${b.name}: ${Object.entries(b.categories || {}).map(([k,v]) => `${k}=${v}`).join(', ')}`).join('\n')}

Cohort data:
${Object.entries(cohorts).map(([dim, items]) => `${dim}: ${(items||[]).map(c => `${c.name || c.label}=${c.overall ?? c.score}`).join(', ')}`).join('\n')}
`.trim();

  const prompt = `You are an expert HR analytics AI conducting an agentic skill analysis.

SKILL: ${skillDef.label}
ANALYTICAL GOAL: ${skillDef.goal}
DIMENSION: ${dimension}

DATA:
${context}

You are acting as an autonomous analyst agent. Do not just summarise —
reason through the data, find patterns, make connections, and produce
actionable intelligence.

Respond ONLY with valid JSON (no markdown, no backticks):
{
  "skillLabel": "${skillDef.label}",
  "chartType": "${skillDef.chartType}",
  "headline": "One bold finding in 10 words or less",
  "agentReasoning": "3-4 sentences explaining how you reached this conclusion — show your analytical thinking",
  "keyFindings": [
    "Finding 1 with specific business name and score",
    "Finding 2 with specific business name and score",
    "Finding 3 with specific business name and score"
  ],
  "riskBUs": ["BU name 1", "BU name 2", "BU name 3"],
  "brightSpotBUs": ["BU name 1", "BU name 2"],
  "priorityActions": [
    { "rank": 1, "action": "Specific action", "owner": "HR/Manager/Leadership", "timeline": "30 days", "expectedImpact": "specific outcome" },
    { "rank": 2, "action": "Specific action", "owner": "HR/Manager/Leadership", "timeline": "90 days", "expectedImpact": "specific outcome" },
    { "rank": 3, "action": "Specific action", "owner": "HR/Manager/Leadership", "timeline": "6 months", "expectedImpact": "specific outcome" }
  ],
  "cohortInsight": "Which cohort is most affected by this skill dimension and why"
}`;

  try {
    const r       = await callLLM([{ role: 'user', content: prompt }], false, 1200);
    const data    = await r.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('AI returned empty response. Please retry.');
    res.json(parseJSON(content));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
