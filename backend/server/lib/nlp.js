// server/lib/nlp.js — sentiment classification and topic extraction
// Uses Mistral (primary) / Cerebras (fallback) for intelligent NLP
// NOTE: aggregateTopics and sentimentOverTime are utility helpers exported
// for potential future use. sentiment.js currently implements inline equivalents.

const { callLLMJson } = require('./llm');

async function classifyBatch(responses) {
  const prompt = `You are a sentiment analysis engine for employee survey responses.
Classify each response. Return ONLY a JSON object with key "results" containing an array — no explanation, no markdown.
Each item: { "id": <number>, "score": <float -1 to 1>, "label": "Negative"|"Neutral"|"Positive", "topics": [<string>] }
Topics must come from this fixed list: Workload, Career Growth, Work Life Balance, Leadership, Recognition, Compensation, Communication, Resources, Company Values, Management, Teamwork, Flexibility, Opportunities, Benefits, Culture.
Pick 1-3 most relevant topics per response.

Responses:
${responses.map((r, i) => `${i + 1}. "${r.text}"`).join('\n')}

Return JSON: { "results": [ ... ] }`;

  const data = await callLLMJson([{ role: 'user', content: prompt }], 2000);
  return data.results || data;
}

function aggregateTopics(classifiedResponses) {
  const topicMap = {};
  for (const r of classifiedResponses) {
    for (const topic of (r.topics || [])) {
      if (!topicMap[topic]) topicMap[topic] = { count: 0, totalScore: 0, scores: [] };
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
      sentiment_score:  parseFloat((data.totalScore / data.count).toFixed(2)),
      trend: data.scores[data.scores.length - 1] > data.scores[0] ? 'up' : 'down'
    }))
    .sort((a, b) => b.count - a.count);
}

function sentimentOverTime(classifiedResponses) {
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
