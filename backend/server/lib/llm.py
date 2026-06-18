import os
import asyncio
import json
import re

import httpx


# == callMistral(messages, maxTokens, jsonMode) ==
async def call_mistral(messages: list, max_tokens: int = 600, json_mode: bool = True) -> httpx.Response:
    body = {
        "model":       "mistral-small-latest",
        "messages":    messages,
        "max_tokens":  max_tokens,
        "temperature": 0.3,
    }
    if json_mode:
        body["response_format"] = {"type": "json_object"}

    async with httpx.AsyncClient(timeout=8) as client:
        return await client.post(
            "https://api.mistral.ai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {os.getenv('MISTRAL_API_KEY')}",
                "Content-Type":  "application/json",
            },
            json=body,
        )


# == callCerebras(messages, maxTokens) — exponential back-off on 429 ==
async def call_cerebras(messages: list, max_tokens: int = 600) -> httpx.Response:
    MAX_RETRIES = 2
    async with httpx.AsyncClient(timeout=30) as client:
        for attempt in range(MAX_RETRIES + 1):
            if attempt > 0:
                # JS: Math.min(2 ** (attempt-1) * 500, 4000) ms
                delay = min(2 ** (attempt - 1) * 0.5, 4.0)   # seconds
                await asyncio.sleep(delay)

            res = await client.post(
                "https://api.cerebras.ai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {os.getenv('CEREBRAS_API_KEY')}",
                    "Content-Type":  "application/json",
                },
                json={
                    "model":       os.getenv("CEREBRAS_MODEL", "llama3.1-70b"),
                    "messages":    messages,
                    "max_tokens":  max_tokens,
                    "temperature": 0.3,
                },
            )
            if res.status_code != 429:
                return res

    raise RuntimeError("Cerebras rate-limited after 2 retries")


# == callLLM — Mistral primary, Cerebras fallback ==
async def call_llm(messages: list, max_tokens: int = 600, json_mode: bool = True) -> httpx.Response:
    try:
        res = await call_mistral(messages, max_tokens, json_mode)
        if res.is_success:
            print("[LLM] Mistral responded OK")
            return res
        # Log the actual HTTP error body so we can diagnose 4xx/5xx issues
        try:
            err_body = res.json()
        except Exception:
            err_body = res.text[:200]
        raise RuntimeError(f"Mistral HTTP {res.status_code}: {err_body}")
    except Exception as err:
        err_type = type(err).__name__
        print(f"[LLM] Mistral failed ({err_type}: {err}) - falling back to Cerebras")
        res = await call_cerebras(messages, max_tokens)
        if res.is_success:
            print("[LLM] Cerebras responded OK")
        else:
            print(f"[LLM] Cerebras also failed: HTTP {res.status_code}")
        return res


# == callLLMJson — call LLM and parse JSON from content ==
async def call_llm_json(messages: list, max_tokens: int = 600) -> dict:
    res  = await call_llm(messages, max_tokens, True)
    data = res.json()
    # JS: data.choices?.[0]?.message?.content || '{}'
    choices = data.get("choices") or []
    raw     = (choices[0].get("message") or {}).get("content") or "{}" if choices else "{}"
    # JS: raw.replace(/```json|```/g, '').trim()
    cleaned = re.sub(r"```json|```", "", raw).strip()
    return json.loads(cleaned)
