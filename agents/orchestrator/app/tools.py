"""Read-only tool declarations; execution happens in Nest agent-gateway."""

from __future__ import annotations

from typing import Any

from .intents import AgentIntent


def decide_tool_calls(
    intent: AgentIntent,
    message: str,
    *,
    tool_results: list[dict[str, Any]] | None,
    context: dict[str, Any] | None,
) -> list[dict[str, Any]]:
    """Return toolCalls for gateway to execute. Empty if enough context already."""
    if tool_results:
        return []

    text = (message or "").strip()
    calls: list[dict[str, Any]] = []

    if intent == AgentIntent.FIND_MERCHANT:
        category = _guess_category(text)
        # 已有类目时不再传 keyword，避免「洗护店」等词把英文 category 门店滤空
        keyword = "" if category else _guess_keyword(text)
        city = (context or {}).get("city") or "上海"
        calls.append(
            {
                "name": "search_merchants",
                "args": {
                    "city": city,
                    "category": category,
                    "keyword": keyword,
                },
            }
        )

    if intent == AgentIntent.GENERAL_QA and any(
        k in text
        for k in (
            "我的猫",
            "我的狗",
            "我的鸟",
            "我的宠",
            "爬宠",
            "守宫",
            "鹦鹉",
            "水族",
            "毛孩",
            "档案",
        )
    ):
        pets = (context or {}).get("pets") or []
        if not pets:
            calls.append({"name": "get_user_pets", "args": {}})

    if any(k in text for k in ("预约", "订单", "我的单", "核销")):
        if not (context or {}).get("bookings"):
            calls.append({"name": "get_recent_bookings", "args": {}})
        if any(k in text for k in ("商城", "快递", "购物")) and not (context or {}).get(
            "orders"
        ):
            calls.append({"name": "get_recent_orders", "args": {}})

    return calls


def format_tool_results(tool_results: list[dict[str, Any]] | None) -> str:
    if not tool_results:
        return ""
    chunks: list[str] = []
    for tr in tool_results:
        name = tr.get("name", "tool")
        if not tr.get("ok"):
            chunks.append(f"[{name}] 失败：{tr.get('error') or 'unknown'}")
            continue
        data = tr.get("data")
        if name == "search_merchants" and isinstance(data, list):
            if not data:
                chunks.append("[search_merchants] 未找到匹配严选店")
            else:
                lines = []
                for m in data[:5]:
                    if not isinstance(m, dict):
                        continue
                    lines.append(
                        f"- {m.get('name')}（{m.get('category')}）"
                        f" 信用分{m.get('creditScore', '—')}"
                        f" 评分{m.get('rating', '—')}"
                        f" {m.get('address') or ''}"
                        f" {m.get('highlight') or ''}"
                    )
                chunks.append("[search_merchants] 严选店：\n" + "\n".join(lines))
        else:
            chunks.append(f"[{name}] {data!r}"[:800])
    return "\n".join(chunks)


def _guess_category(text: str) -> str:
    # 与 merchant 种子 category 对齐：hospital / grooming / boarding / training
    if any(k in text for k in ("医院", "看病", "医疗", "疫苗", "hospital")):
        return "hospital"
    if any(k in text for k in ("洗澡", "美容", "洗护", "造型", "剪毛", "groom")):
        return "grooming"
    if any(k in text for k in ("寄养", "上门", "托管", "board")):
        return "boarding"
    if any(k in text for k in ("训练", "训犬", "train")):
        return "training"
    return ""


def _guess_keyword(text: str) -> str:
    for noise in ("附近", "找店", "推荐", "靠谱", "哪里", "有没有", "帮我"):
        text = text.replace(noise, " ")
    return " ".join(text.split())[:40]
