"""Orchestration with history memory + optional tool-call round."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Callable
from uuid import uuid4

from .intents import AgentIntent, INTENT_TO_AGENT, build_reply, classify_intent
from .llm import ChatMessage, get_llm_provider
from .memory_prompt import build_system_prompt
from .tools import decide_tool_calls, format_tool_results


@dataclass
class ChatState:
    session_id: str
    message: str
    user_id: str | None = None
    history: list[dict[str, Any]] = field(default_factory=list)
    context: dict[str, Any] | None = None
    tool_results: list[dict[str, Any]] | None = None
    intent: AgentIntent | None = None
    routed_to: str | None = None
    reply: str | None = None
    fallback: bool = False
    tool_calls: list[dict[str, Any]] = field(default_factory=list)
    summary: str | None = None


NodeFn = Callable[[ChatState], ChatState]


def node_classify(state: ChatState) -> ChatState:
    state.intent = classify_intent(state.message)
    return state


def node_route(state: ChatState) -> ChatState:
    assert state.intent is not None
    state.routed_to = INTENT_TO_AGENT[state.intent]
    return state


def node_decide_tools(state: ChatState) -> ChatState:
    assert state.intent is not None
    state.tool_calls = decide_tool_calls(
        state.intent,
        state.message,
        tool_results=state.tool_results,
        context=state.context,
    )
    return state


def node_reply(state: ChatState) -> ChatState:
    assert state.intent is not None

    # 若仍需工具且尚未拿到结果，先把 toolCalls 交回 gateway，不生成最终回复
    if state.tool_calls and not state.tool_results:
        state.reply = ""
        state.fallback = False
        return state

    rule_reply = build_reply(state.intent, state.message)
    provider = get_llm_provider()
    if provider is None:
        state.reply = _enrich_rule_reply(rule_reply, state)
        state.fallback = True
        return state

    try:
        messages = _build_llm_messages(state, rule_reply)
        text = provider.chat(messages)
        state.reply = text or _enrich_rule_reply(rule_reply, state)
        state.fallback = not bool(text)
        state.tool_calls = []
    except Exception as exc:  # noqa: BLE001
        print(f"[orchestrator] LLM fallback: {exc}")
        state.reply = _enrich_rule_reply(rule_reply, state)
        state.fallback = True
        state.tool_calls = []
    return state


def _enrich_rule_reply(rule_reply: str, state: ChatState) -> str:
    tool_txt = format_tool_results(state.tool_results)
    pets = (state.context or {}).get("pets") or []
    pet_hint = ""
    if pets and isinstance(pets[0], dict):
        pet_hint = f"我记得你的毛孩「{pets[0].get('name')}」。"
    if tool_txt:
        return f"{pet_hint}{rule_reply}\n\n根据平台数据：\n{tool_txt}"
    return f"{pet_hint}{rule_reply}" if pet_hint else rule_reply


def _build_llm_messages(state: ChatState, rule_reply: str) -> list[ChatMessage]:
    msgs: list[ChatMessage] = [
        ChatMessage(role="system", content=build_system_prompt(state.context)),
    ]
    for h in (state.history or [])[-12:]:
        role = h.get("role")
        content = (h.get("content") or "").strip()
        if role in ("user", "assistant") and content:
            msgs.append(ChatMessage(role=role, content=content[:2000]))

    tool_txt = format_tool_results(state.tool_results)
    user_content = (
        f"用户意图分类：{state.intent.value if state.intent else 'unknown'}，"
        f"路由 Agent：{state.routed_to}\n"
        f"用户消息：{state.message}\n"
    )
    if tool_txt:
        user_content += f"\n【工具结果】\n{tool_txt}\n"
    user_content += f"\n若模型不可用时的参考回复：{rule_reply}"
    msgs.append(ChatMessage(role="user", content=user_content))
    return msgs


class OrchestratorGraph:
    def __init__(self) -> None:
        self.nodes: list[NodeFn] = [
            node_classify,
            node_route,
            node_decide_tools,
            node_reply,
        ]

    def invoke(
        self,
        message: str,
        session_id: str | None = None,
        *,
        user_id: str | None = None,
        history: list[dict[str, Any]] | None = None,
        context: dict[str, Any] | None = None,
        tool_results: list[dict[str, Any]] | None = None,
    ) -> ChatState:
        state = ChatState(
            session_id=session_id or str(uuid4()),
            message=message,
            user_id=user_id,
            history=history or [],
            context=context,
            tool_results=tool_results,
        )
        for node in self.nodes:
            state = node(state)
        return state
