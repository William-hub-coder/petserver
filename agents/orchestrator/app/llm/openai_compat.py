from __future__ import annotations

import json
import time
import urllib.error
import urllib.request
from typing import Sequence

from .base import ChatMessage


class OpenAICompatProvider:
    """OpenAI-compatible Chat Completions client (DeepSeek / OpenAI / others)."""

    def __init__(
        self,
        *,
        name: str,
        api_key: str,
        base_url: str,
        default_model: str,
        timeout: float = 45.0,
        retries: int = 2,
    ) -> None:
        self.name = name
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.default_model = default_model
        self.timeout = timeout
        self.retries = max(0, retries)

    def chat(self, messages: Sequence[ChatMessage], *, model: str | None = None) -> str:
        url = f"{self.base_url}/chat/completions"
        payload = {
            "model": model or self.default_model,
            "messages": [{"role": m.role, "content": m.content} for m in messages],
            "temperature": 0.7,
        }
        data = json.dumps(payload).encode("utf-8")

        last_err: Exception | None = None
        for attempt in range(self.retries + 1):
            req = urllib.request.Request(
                url,
                data=data,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {self.api_key}",
                },
                method="POST",
            )
            try:
                with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                    body = json.loads(resp.read().decode("utf-8"))
                try:
                    return body["choices"][0]["message"]["content"].strip()
                except (KeyError, IndexError, AttributeError, TypeError) as e:
                    raise RuntimeError("Unexpected LLM response shape") from e
            except urllib.error.HTTPError as e:
                # 不把完整响应体打进异常（可能含敏感信息）；仅保留状态码
                code = e.code
                try:
                    e.read()
                except Exception:  # noqa: BLE001
                    pass
                last_err = RuntimeError(f"LLM HTTP {code}")
                if code in (408, 429, 500, 502, 503, 504) and attempt < self.retries:
                    time.sleep(0.4 * (attempt + 1))
                    continue
                raise last_err from e
            except Exception as e:  # noqa: BLE001
                last_err = RuntimeError(f"LLM request failed: {type(e).__name__}")
                if attempt < self.retries:
                    time.sleep(0.4 * (attempt + 1))
                    continue
                raise last_err from e

        raise last_err or RuntimeError("LLM request failed")
