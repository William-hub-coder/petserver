# PetPal Agent Orchestrator（Python）

FastAPI 服务，默认端口 **8000**。由 Nest `agent-gateway:3006` 调用，**不直连数据库**。

## 职责

1. 关键词意图分类（找店 / 购物 / 问诊 / 投诉 / 通用）
2. 多轮 `history` + 用户 `context`（宠物档案、预约、订单、城市、摘要）组装 prompt
3. 按需返回 `toolCalls`（由 agent-gateway 执行只读工具后二次回灌）
4. 调用 DeepSeek（OpenAI 兼容）；失败则规则降级

## 启动

```bash
# 仓库根目录
pnpm agent:dev          # 或 pnpm agent:ensure
# 等价
cd agents/orchestrator
pip install -r requirements.txt   # 首次
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

环境变量见仓库根 `.env`：`LLM_PROVIDER`、`DEEPSEEK_API_KEY`、`LLM_MODEL`、`LLM_BASE_URL`。

## API

### `GET /health`

返回 `version`、`features: ["history","context","tools"]`。

### `POST /v1/chat`

请求要点：

```json
{
  "message": "附近靠谱洗护店",
  "sessionId": "optional",
  "userId": "optional",
  "history": [{ "role": "user", "content": "..." }],
  "context": { "city": "上海", "pets": [], "bookings": [], "orders": [], "summary": null },
  "toolResults": [{ "name": "search_merchants", "ok": true, "data": [] }]
}
```

响应要点：`reply`、`intent`、`routedTo`、`aiGenerated`、`fallback`、可选 `toolCalls`。

## 目录

```text
app/
  main.py           FastAPI 入口
  graph.py          classify → route → decide_tools → reply
  intents.py        意图与规则回复
  tools.py          工具决策（不执行 IO）
  memory_prompt.py  业务上下文拼进 system
  llm/              DeepSeek / OpenAI 兼容客户端
```

## 铁律

- 不写业务库；记忆由 `message` + `agent-gateway` 负责
- 不编造门店/价格；工具无数据时明确说明并引导「找店」Tab
- 不做诊断或开处方；急症引导线下就医
