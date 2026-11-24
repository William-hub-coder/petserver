"""
宠伴 Agent 编排服务（FastAPI，默认 :8000）。

调用链：
  user-web → gateway:3000/agent/chat → agent-gateway:3006 → 本服务 POST /v1/chat

支持：多轮 history、用户业务 context、toolCalls / toolResults 回灌。
Python 不直连数据库；记忆与工具由 Nest agent-gateway 编排。
"""

from __future__ import annotations

from typing import Any

from fastapi import FastAPI
from pydantic import BaseModel, Field

from .graph import OrchestratorGraph

app = FastAPI(
    title="PetPal Agent Orchestrator",
    version="0.2.0",
    description="Intent route + memory-aware LLM + read-only tool requests",
)

graph = OrchestratorGraph()


class HistoryMessage(BaseModel):
    role: str
    content: str
    intent: str | None = None
    createdAt: str | None = None


class ToolResult(BaseModel):
    name: str
    ok: bool = True
    data: Any = None
    error: str | None = None


class ChatRequest(BaseModel):
    sessionId: str | None = None
    userId: str | None = None
    guestKey: str | None = None
    message: str = Field(..., min_length=1)
    context: dict[str, Any] | None = None
    history: list[HistoryMessage] | None = None
    toolResults: list[ToolResult] | None = None


class ToolCall(BaseModel):
    name: str
    args: dict[str, Any] | None = None


class ChatResponse(BaseModel):
    sessionId: str
    intent: str
    routedTo: str
    reply: str
    aiGenerated: bool = True
    fallback: bool = False
    toolCalls: list[ToolCall] | None = None
    summary: str | None = None


@app.get("/health")
def health():
    return {
        "service": "orchestrator",
        "status": "ok",
        "timestamp": __import__("datetime").datetime.utcnow().isoformat() + "Z",
        "version": "0.2.0",
        "features": ["history", "context", "tools"],
    }


@app.post("/v1/chat", response_model=ChatResponse)
def chat(body: ChatRequest) -> ChatResponse:
    """意图路由 + 记忆感知回复；需要工具时返回 toolCalls 供 gateway 执行。"""
    history = [h.model_dump() for h in (body.history or [])]
    tool_results = [t.model_dump() for t in (body.toolResults or [])] or None
    state = graph.invoke(
        body.message,
        body.sessionId,
        user_id=body.userId,
        history=history,
        context=body.context,
        tool_results=tool_results,
    )
    tool_calls = None
    if state.tool_calls:
        tool_calls = [ToolCall(name=c["name"], args=c.get("args")) for c in state.tool_calls]
    return ChatResponse(
        sessionId=state.session_id,
        intent=state.intent.value if state.intent else "unknown",
        routedTo=state.routed_to or "A1",
        reply=state.reply or "",
        aiGenerated=True,
        fallback=bool(state.fallback),
        toolCalls=tool_calls,
        summary=state.summary,
    )
