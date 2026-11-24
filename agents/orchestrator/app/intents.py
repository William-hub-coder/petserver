"""Lightweight keyword intent router — LangGraph placeholder for shell phase."""

from __future__ import annotations

from enum import Enum


class AgentIntent(str, Enum):
    GENERAL_QA = "general_qa"
    FIND_MERCHANT = "find_merchant"
    SHOPPING = "shopping"
    CONSULTATION = "consultation"
    COMPLAINT = "complaint"
    UNKNOWN = "unknown"


INTENT_TO_AGENT = {
    AgentIntent.GENERAL_QA: "A1",
    AgentIntent.FIND_MERCHANT: "A2",
    AgentIntent.SHOPPING: "A3",
    AgentIntent.CONSULTATION: "A5",
    AgentIntent.COMPLAINT: "human",
    AgentIntent.UNKNOWN: "A1",
}


def classify_intent(message: str) -> AgentIntent:
    text = (message or "").strip().lower()
    if any(k in text for k in ("投诉", "退款", "举报", "complaint")):
        return AgentIntent.COMPLAINT
    if any(k in text for k in ("看病", "问诊", "症状", "发烧", "呕吐", "consult")):
        return AgentIntent.CONSULTATION
    if any(k in text for k in ("买", "商品", "狗粮", "猫粮", "购物", "shop")):
        return AgentIntent.SHOPPING
    if any(
        k in text
        for k in (
            "附近",
            "找店",
            "医院",
            "美容",
            "寄养",
            "洗澡",
            "洗护",
            "导航",
            "merchant",
        )
    ):
        return AgentIntent.FIND_MERCHANT
    if not text:
        return AgentIntent.UNKNOWN
    return AgentIntent.GENERAL_QA


def build_reply(intent: AgentIntent, message: str) -> str:
    routed = INTENT_TO_AGENT[intent]
    templates = {
        AgentIntent.FIND_MERCHANT: (
            f"[A2 商户服务·占位] 已识别找店意图：「{message}」。"
            "后续将按信用分×50% + 距离×20% + 履约×20% + 资质×10% 排序推荐。"
        ),
        AgentIntent.SHOPPING: (
            f"[A3 电商·占位·V1] 已识别购物意图：「{message}」。"
            "MVP 阶段货架商城尚未接入。"
        ),
        AgentIntent.CONSULTATION: (
            f"[A5 问诊·占位·V2] 已识别健康咨询意图：「{message}」。"
            "正式问诊未上线；紧急症状请立即线下就医。"
        ),
        AgentIntent.COMPLAINT: (
            "[人工客服·占位] 已记录你的投诉诉求，正在为你转接人工处理。"
        ),
        AgentIntent.GENERAL_QA: (
            f"[A1 客服·占位] 关于「{message}」：我是宠伴智能客服。"
            "可以问我找店、养宠知识或平台规则。"
        ),
        AgentIntent.UNKNOWN: (
            "[A1 客服·占位] 我还没完全理解，你可以换种方式描述，或转人工客服。"
        ),
    }
    return templates[intent] + f" （路由→{routed}）"
