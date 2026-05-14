"""
llm.py — LLM client using raw httpx. No LangChain, no OpenAI SDK.
All LLM calls in the entire codebase go through this file.
"""
import httpx
import os
import json
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("LLM_API_KEY")
BASE_URL = os.getenv("LLM_BASE_URL")   # https://api.aicredits.in/v1
MODEL = os.getenv("LLM_MODEL")         # meta-llama/llama-3-8b-instruct


async def llm_call(prompt: str, temperature: float = 0.3, max_tokens: int = 2500) -> str:
    """Returns raw text content from the model, forced to JSON format."""
    async with httpx.AsyncClient(timeout=45.0) as client:
        resp = await client.post(
            f"{BASE_URL}/chat/completions",
            headers={"Authorization": f"Bearer {API_KEY}"},
            json={
                "model": MODEL,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": temperature,
                "max_tokens": max_tokens,
                "response_format": {"type": "json_object"}
            }
        )
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"]


async def llm_raw(prompt: str, temperature: float = 0.5, max_tokens: int = 3000) -> str:
    """Returns raw text content from the model without JSON constraints."""
    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(
            f"{BASE_URL}/chat/completions",
            headers={"Authorization": f"Bearer {API_KEY}"},
            json={
                "model": MODEL,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": temperature,
                "max_tokens": max_tokens
            }
        )
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"]


def extract_json(raw: str) -> dict:
    """Robustly extracts JSON from potentially noisy LLM output."""
    # Remove markdown blocks if present
    import re
    raw = re.sub(r'```json\s*(.*?)\s*```', r'\1', raw, flags=re.DOTALL)
    raw = re.sub(r'```\s*(.*?)\s*```', r'\1', raw, flags=re.DOTALL)
    
    # Try direct parse
    try:
        return json.loads(raw.strip())
    except:
        pass

    # Find the first { and the last }
    start = raw.find('{')
    end = raw.rfind('}')
    
    if start == -1 or end == -1:
        raise ValueError("No JSON object found in response")
        
    json_str = raw[start:end+1]
    
    # Fix common LLM mistakes: Triple quotes and backticks
    json_str = json_str.replace('"""', '"').replace("'''", "'")
    
    # Try to fix backtick enclosed strings by replacing them with double quotes and escaping newlines inside
    import re
    def fix_backticks(match):
        inner = match.group(1)
        return '"' + inner.replace('\n', '\\n').replace('"', '\\"') + '"'
    json_str = re.sub(r'`(.*?)`', fix_backticks, json_str, flags=re.DOTALL)
    
    # Try direct parse
    try:
        return json.loads(json_str)
    except Exception as e:
        # LLM often puts raw newlines in strings. We must escape them.
        # This regex finds text inside double quotes and escapes its newlines.
        try:
            import re
            # Only match strings that actually contain a newline
            def escape_newlines(match):
                return match.group(0).replace('\n', '\\n').replace('\r', '\\r')
            
            # This looks for content between quotes that spans multiple lines
            fixed = re.sub(r'"([^"]*\n[^"]*)"', escape_newlines, json_str)
            return json.loads(fixed)
        except Exception as e2:
            print(f"CRITICAL: All JSON parsing attempts failed. Error: {e2}")
            print(f"RAW DATA CAUSING ERROR:\n{json_str}")
            raise e2

async def llm_json(prompt: str, temperature: float = 0.3) -> dict:
    """Call LLM, parse JSON with multiple fallback attempts."""
    try:
        raw = await llm_call(prompt, temperature)
        return extract_json(raw)
    except Exception as e:
        print(f"DEBUG: LLM attempt 1 failed: {e}")
        # Retry with extreme strictness
        try:
            raw2 = await llm_call(prompt + "\n\nCRITICAL: RETURN ONLY VALID JSON. NO TEXT.", 0.1)
            return extract_json(raw2)
        except Exception as e2:
            print(f"DEBUG: LLM attempt 2 failed: {e2}")
            return None
