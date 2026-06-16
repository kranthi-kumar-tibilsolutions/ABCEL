// server/lib/llm.js — shared LLM caller: Mistral primary, Cerebras fallback

async function callMistral(messages, maxTokens = 600, jsonMode = true) {
  const { default: fetch } = await import('node-fetch');
  const body = {
    model:       'mistral-small-latest',
    messages,
    max_tokens:  maxTokens,
    temperature: 0.3,
  };
  if (jsonMode) body.response_format = { type: 'json_object' };
  return fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify(body),
  });
}

async function callCerebras(messages, maxTokens = 600) {
  const { default: fetch } = await import('node-fetch');
  const MAX_RETRIES = 4;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const delay = Math.min(2 ** (attempt - 1) * 500, 4000);
      await new Promise(r => setTimeout(r, delay));
    }
    const res = await fetch('https://api.cerebras.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.CEREBRAS_API_KEY}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        model:       process.env.CEREBRAS_MODEL || 'llama3.1-70b',
        messages,
        max_tokens:  maxTokens,
        temperature: 0.3,
      }),
    });
    if (res.status !== 429) return res;
  }
  throw new Error('Cerebras rate-limited after 4 retries');
}

// Mistral primary, Cerebras fallback
async function callLLM(messages, maxTokens = 600, jsonMode = true) {
  try {
    const res = await callMistral(messages, maxTokens, jsonMode);
    if (res.ok) { console.log('[LLM] ✓ Mistral responded'); return res; }
    throw new Error(`Mistral HTTP ${res.status}`);
  } catch (err) {
    console.warn(`[LLM] Mistral failed (${err.message}) — falling back to Cerebras`);
    const res = await callCerebras(messages, maxTokens);
    if (res.ok) console.log('[LLM] ✓ Cerebras responded');
    else console.error(`[LLM] Cerebras also failed: HTTP ${res.status}`);
    return res;
  }
}

async function callLLMJson(messages, maxTokens = 600) {
  const res  = await callLLM(messages, maxTokens, true);
  const data = await res.json();
  const raw  = data.choices?.[0]?.message?.content || '{}';
  return JSON.parse(raw.replace(/```json|```/g, '').trim());
}

module.exports = { callLLM, callLLMJson, callMistral, callCerebras };
