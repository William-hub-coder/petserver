from __future__ import annotations

import os
from pathlib import Path

from .base import LLMProvider
from .openai_compat import OpenAICompatProvider


def _load_dotenv() -> None:
    """Minimal .env loader (no python-dotenv dependency)."""
    candidates = [
        Path.cwd() / ".env",
        Path.cwd().parent.parent / ".env",
        Path(__file__).resolve().parents[4] / ".env",
    ]
    for p in candidates:
        if not p.is_file():
            continue
        text = None
        for enc in ("utf-8", "utf-8-sig", "gbk", "latin-1"):
            try:
                text = p.read_text(encoding=enc)
                break
            except UnicodeDecodeError:
                continue
        if text is None:
            continue
        for line in text.splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            k, v = k.strip(), v.strip().strip('"').strip("'")
            os.environ.setdefault(k, v)
        break


def get_llm_provider() -> LLMProvider | None:
    _load_dotenv()
    provider = (os.getenv("LLM_PROVIDER") or "deepseek").lower().strip()
    model = os.getenv("LLM_MODEL") or "deepseek-chat"

    retries = int(os.getenv("LLM_RETRIES") or "2")
    timeout = float(os.getenv("LLM_TIMEOUT") or "45")

    if provider == "deepseek":
        key = os.getenv("DEEPSEEK_API_KEY") or os.getenv("LLM_API_KEY") or ""
        if not key:
            return None
        return OpenAICompatProvider(
            name="deepseek",
            api_key=key,
            base_url=os.getenv("LLM_BASE_URL") or "https://api.deepseek.com",
            default_model=model,
            timeout=timeout,
            retries=retries,
        )

    if provider in ("openai", "openai_compat"):
        key = os.getenv("LLM_API_KEY") or os.getenv("OPENAI_API_KEY") or ""
        if not key:
            return None
        base = os.getenv("LLM_BASE_URL") or "https://api.openai.com/v1"
        return OpenAICompatProvider(
            name=provider,
            api_key=key,
            base_url=base,
            default_model=model or "gpt-4o-mini",
            timeout=timeout,
            retries=retries,
        )

    return None
