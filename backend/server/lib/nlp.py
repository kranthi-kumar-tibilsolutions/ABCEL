from lib.llm import call_llm_json


# == classifyBatch(responses) — LLM sentiment + topic classification ==
async def classify_batch(responses: list) -> list:
    lines = "\n".join(f'{i + 1}. "{r["text"]}"' for i, r in enumerate(responses))
    prompt = f"""You are a sentiment analysis engine for employee survey responses.
Classify each response. Return ONLY a JSON object with key "results" containing an array — no explanation, no markdown.
Each item: {{ "id": <number>, "score": <float -1 to 1>, "label": "Negative"|"Neutral"|"Positive", "topics": [<string>] }}
Topics must come from this fixed list: Workload, Career Growth, Work Life Balance, Leadership, Recognition, Compensation, Communication, Resources, Company Values, Management, Teamwork, Flexibility, Opportunities, Benefits, Culture.
Pick 1-3 most relevant topics per response.

Responses:
{lines}

Return JSON: {{ "results": [ ... ] }}"""

    data = await call_llm_json([{"role": "user", "content": prompt}], 2000)
    return data.get("results") or data


# == aggregateTopics(classifiedResponses) — topic frequency + avg sentiment ==
def aggregate_topics(classified_responses: list) -> list:
    topic_map = {}
    for r in classified_responses:
        for topic in (r.get("topics") or []):
            if topic not in topic_map:
                topic_map[topic] = {"count": 0, "total_score": 0, "scores": []}
            topic_map[topic]["count"]       += 1
            topic_map[topic]["total_score"] += r["score"]
            topic_map[topic]["scores"].append(r["score"])

    total = len(classified_responses)
    result = [
        {
            "topic":              topic,
            "count":              d["count"],
            "pct_of_responses":   round((d["count"] / total) * 100, 1),
            "sentiment_score":    round(d["total_score"] / d["count"], 2),
            "trend":              "up" if d["scores"][-1] > d["scores"][0] else "down",
        }
        for topic, d in topic_map.items()
    ]
    return sorted(result, key=lambda x: -x["count"])


# == sentimentOverTime(classifiedResponses) — monthly avg score ==
def sentiment_over_time(classified_responses: list) -> list:
    monthly = {}
    for r in classified_responses:
        month = r.get("month") or "Unknown"
        if month not in monthly:
            monthly[month] = []
        monthly[month].append(r["score"])

    return [
        {
            "month":     month,
            "avg_score": round(sum(scores) / len(scores), 2),
        }
        for month, scores in monthly.items()
    ]
