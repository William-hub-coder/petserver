from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol, Sequence


@dataclass
class ChatMessage:
    role: str  # system | user | assistant
    content: str


class LLMProvider(Protocol):
    name: str

    def chat(self, messages: Sequence[ChatMessage], *, model: str | None = None) -> str:
        """Return assistant text. Raise on hard failure."""
        ...
