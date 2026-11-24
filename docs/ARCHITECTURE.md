# 宠伴架构说明

对照《宠物综合服务平台完整计划 V3》。本地 MVP 默认 **SQLite**（`packages/db`），Docker 可用时再切 PostgreSQL。

## 分层

| 层级 | 落地 | 说明 |
|---|---|---|
| 客户端 | user-web / merchant-web / Flutter / 考察小程序 / admin | H5 为联调主端 |
| 接入层 | `services/gateway` | CORS、限流、安全头、JWT、路径代理、公开白名单 |
| Agent 层 | `agent-gateway` + `agents/orchestrator` | Python 编排 + 记忆 + 只读工具 |
| 业务服务 | auth / user / merchant / inspect / message | NestJS |
| 数据层 | Prisma（`@petpal/db`） | 单库多表；本地 SQLite |

## 拓扑

```text
              user-web :5175  (Vite /api → gateway)
                         |
                         v
              +---------------------------+
              |     gateway :3000         |
              | Security → Auth → Proxy   |
              +------------+--------------+
     +----------+----------+----------+-----------+
     v          v          v          v           v
 auth:3001  user:3002  merchant:3003  message:3005  agent-gw:3006
     |          |          |          |               |
     +----------+-- Prisma DB --------+               v
                                              orch:8000 (Python LLM)
```

## 服务端口

| 服务 | 端口 | 职责摘要 |
|---|---|---|
| gateway | 3000 | 唯一对外 API 入口 |
| auth | 3001 | 短信登录 / JWT / refresh |
| user | 3002 | 用户资料、宠物档案、**毛孩子圈子** |
| merchant | 3003 | 商户、预约、商城、服务目录、地理、配送、领养售宠 |
| inspect | 3004 | 考察 / 盲审 / 信用分（仍有 stub） |
| message | 3005 | 站内信、人商会话、**AI 记忆 API**、敏感词 |
| agent-gateway | 3006 | AI 接入、记忆编排、工具代理、限流 |
| orchestrator | 8000 | Python：意图 / 多轮 / 工具请求 / LLM |
| merchant-web | 5180 | 商家端 |
| admin-web | 5181 | 运营后台 |
| user-web | 5175 | 用户 H5 |

## 网关安全流水线

```text
Request
  → SecurityMiddleware
      · 删除客户端伪造的 x-user-id / x-user-role
      · 注入 X-Request-Id
      · 安全响应头
      · IP 滑动窗口限流（全站 / 认证路径）
  → AuthMiddleware
      · 公开路径放行；若带合法 Bearer，仍注入 x-user-id（可选登录）
      · 非公开路径必须 JWT
  → ProxyController
      · 按路径转发下游；超时可配
```

业务服务不解析 JWT，只信任网关注入的内部头（本地假设网关可信；生产需内网隔离）。

**AI 相关公开路径**：`POST /agent/chat`、`GET /agent/*`（含 `/agent/memory`）。登录后带 Token 才能同步宠物档案与用户级记忆；`POST /agent/memory/merge` 需登录。

**圈子公开读**：`GET /users/community/*`（列表/详情/评论）；发帖、点赞、评论需 JWT。

## 用户端导航（user-web）

底栏：**首页 | 找店 | AI | 圈子 | 我的**

- 消息中心改为 overlay（首页右上角未读角标 / 「我的」入口），不再占底栏 Tab。
- 圈子：`CircleFeedPage`（Tab）+ `circle-detail` / `circle-compose` overlay。

## 毛孩子圈子

```text
CommunityPost / CommunityLike / CommunityComment
  → user:3002  /users/community/posts…
  → gateway 公开 GET；写操作需登录
  → user-web 双列 Feed（类小红书轻量版）
```

媒体：演示环境用外链或本地 data URL；无独立 OSS。

## 服务预约渠道

```text
onsite          → 到店核销（商家扫码）
online_consult  → 线上问诊（用户 complete；¥5 服务费起）
home_visit      → 上门服务（用户 complete；需地址）
```

目录：`GET /service-catalog?kind=...`。

## 领养 / 宠物售卖

```text
PetListing.channel
  adopt → 领养（priceCents=0 无偿；>0 有偿）
  sale  → 售卖（入驻店/繁育场；证照+检疫必填）

用户流：浏览 → 详情 → 申请/意向沟通 → message 会话(kind=adoption)
管理流：pending_review → admin resolve → published
```

与商城商品严格分离，禁止活体一键下单。

## Agent 调用链与铁律

```text
客户端 POST /agent/chat
  → gateway:3000（可选 JWT → x-user-id）
  → agent-gateway:3006
      · touch/append AgentSession（message:3005）
      · 注入 pets / bookings / orders + city
      · 可选工具：search_merchants 等（只读，可二次回灌）
  → orchestrator:8000/v1/chat（Python，history + context + toolCalls）
```

1. **Python orchestrator 不直连数据库**，只通过 agent-gateway 拿到 `history` / `context` / `toolResults`。
2. 写操作由业务服务执行；Agent 只给建议与只读查询。
3. orchestrator 不可达时，agent-gateway 返回 `fallback: true`。
4. 对外 AI 回复带 `aiGenerated: true`。
5. 缺 3006 时网关对聊天返回 502；缺 3005 时记忆降级（仍可单轮聊）。

### 对话记忆

| 概念 | 说明 |
|---|---|
| 表 | `AgentSession` / `AgentMessage`（与人商 `Conversation` 分离） |
| message API | `/messages/ai/sessions/touch` · `.../messages` · `merge` · `PATCH summary` |
| 登录用户 | 按 `userId` 续聊；刷新/换端可拉历史 |
| 游客 | `localStorage.petpal_ai_guest`（稳定）+ `petpal_ai_session`（服务端 sessionId） |
| 合并 | 登录后 `POST /agent/memory/merge` `{ guestKey }` |
| 历史读取 | `GET /agent/memory?sessionId=&guestKey=` |
| 前端 | AI Tab 常驻 `v-show`，切模块不销毁气泡 |

### 工具白名单（只读）

`search_merchants` · `get_user_pets` · `get_recent_bookings` · `get_recent_orders`

商户类目与种子对齐：`hospital` / `grooming` / `boarding` / `training`（中文口语由 agent-gateway 映射）。

### Python 编排要点

- 入口：`agents/orchestrator` FastAPI `POST /v1/chat`
- 流水线：`classify → route → decide_tools → reply`
- LLM：`system`（含业务上下文）+ 最近历史 + 当前消息；禁止编造门店

详见 [agents/orchestrator/README.md](../agents/orchestrator/README.md)。

## 定位 / 地图

- 后端：`AMAP_WEB_KEY` → `/geo/regeo` · `/geo/search` 等
- 前端：`VITE_AMAP_JS_KEY` + 可选 `VITE_AMAP_SECURITY_CODE`（JS API 2.0）
- GPS：浏览器 WGS84 转 GCJ-02 后再用于高德
- 无 Key / 加载失败：LiteMap 演示图层

## 数据与种子

```bash
pnpm db:generate
pnpm db:migrate          # prisma migrate deploy
pnpm db:seed             # 主种子 + 扩展服务 + 商品 + 领养售宠 + 圈子示例帖
```

关键模型（节选）：`User`、`Pet`、`Merchant`、`Booking`、`Product`、`Conversation`、`AgentSession`、`AgentMessage`、`PetListing`、`PetAdoptApplication`、`CommunityPost`、`CommunityLike`、`CommunityComment`。

## 本地运维命令

| 命令 | 作用 |
|---|---|
| `pnpm services:build` | tsc 编译全部核心 Nest |
| `pnpm services:start` | 编译并启动核心 Nest |
| `pnpm agent:ensure` | 拉起/探测 AI 链路 |
| `pnpm --filter @petpal/message run start:stable` | 单独稳住 message（避免空 dist） |
| `pnpm smoke` | 冒烟验收 |

## 严选考察链路（预留）

```text
申请 → AI初筛 → 派单考察 → 盲审评审 → 上线信用分 → 复检触发
```

## 通信方式

- 同步 HTTP（gateway 反向代理）
- `packages/shared` 预留 `DomainEvents`，后续接消息队列
- Temporal 未接入
