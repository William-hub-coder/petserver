"""Assemble system prompt with user memory / business context."""

from __future__ import annotations

from typing import Any


SYSTEM_BASE = """你是「宠伴 PetPal」智能助手，帮助养宠用户找严选门店、预约服务、了解宠物护理常识。
服务对象覆盖合法饲养的猫、狗、飞禽、爬宠、两栖、小型哺乳、水族及其他合规宠物，不默认用户只有猫狗。
规则：
1. 回答简洁、温暖、可信，不要夸大医疗效果，不做诊断或开处方。
2. 涉及就医时建议线下专业兽医；异宠优先建议有相关经验的医院/医师。
3. 可引导用户使用平台「找店 / 预约 / 严选商城 / 宠物档案」流程。
4. 回复使用简体中文。
5. 禁止编造门店名称、价格、信用分；只能依据「业务上下文」或「工具结果」。
6. 若工具/上下文没有相关数据，如实说明「暂无数据」，并引导用户去找店 Tab 浏览。
7. 若用户提到「我的猫/狗/鸟/爬宠」等，优先使用档案中的宠物昵称、品类、饮食与环境备注。
8. 涉及物种合法性时提醒用户遵守当地法规，平台不支持非法野生动物交易。
"""


def format_context(context: dict[str, Any] | None) -> str:
    if not context:
        return "（无登录用户档案）"
    parts: list[str] = []
    nick = context.get("nickname")
    city = context.get("city") or "上海"
    parts.append(f"城市：{city}")
    if nick:
        parts.append(f"用户昵称：{nick}")

    pets = context.get("pets") or []
    if pets:
        lines = []
        for p in pets[:8]:
            if not isinstance(p, dict):
                continue
            breed = p.get("breed") or ""
            bits = [
                f"- {p.get('name', '未命名')}（{p.get('type', 'pet')}"
                + (f"/{breed}" if breed else "")
                + ")"
            ]
            extras = []
            if p.get("dietNote"):
                extras.append(f"饮食:{p.get('dietNote')}")
            if p.get("habitatNote"):
                extras.append(f"环境:{p.get('habitatNote')}")
            if p.get("specialNeeds"):
                extras.append(f"特殊:{p.get('specialNeeds')}")
            if extras:
                bits.append("  " + "；".join(extras))
            lines.append("\n".join(bits))
        parts.append("宠物档案：\n" + "\n".join(lines))
    else:
        parts.append("宠物档案：暂无")

    bookings = context.get("bookings") or []
    if bookings:
        lines = []
        for b in bookings[:5]:
            if not isinstance(b, dict):
                continue
            lines.append(
                f"- {b.get('serviceName') or '服务'} @ {b.get('merchantName') or '门店'}"
                f"（{b.get('status')}，{b.get('bookingAt')}）"
            )
        parts.append("最近预约：\n" + "\n".join(lines))

    orders = context.get("orders") or []
    if orders:
        lines = []
        for o in orders[:5]:
            if not isinstance(o, dict):
                continue
            cents = o.get("totalCents")
            price = f"¥{cents/100:.2f}" if isinstance(cents, (int, float)) else ""
            lines.append(f"- 订单 {str(o.get('id', ''))[:8]}… {o.get('status')} {price}")
        parts.append("最近商城订单：\n" + "\n".join(lines))

    summary = context.get("summary")
    if summary:
        parts.append(f"历史摘要：{summary}")

    return "\n".join(parts)


def build_system_prompt(context: dict[str, Any] | None) -> str:
    return SYSTEM_BASE + "\n\n【业务上下文】\n" + format_context(context)
