# 用户端 H5（`@petpal/user-web`）

浏览器预览与联调主端，端口默认 **5175**。对接网关 `VITE_API_BASE_URL`（默认 `/api`，由 Vite 代理到 `localhost:3000`）。

## 启动

```bash
pnpm --filter @petpal/user-web dev
```

打开 http://localhost:5175 后会先显示 **Logo 启动闪屏**（`SplashScreen` + `index.html` 首屏），约 1.6s 后淡入主页。  
品牌资源：`public/brand/petpal-logo.png`、`public/favicon.png`。

演示登录：`13800000001` / 验证码 `123456`。

## 页面结构（无 vue-router）

`src/App.vue` 用 `tab`（底栏）+ `overlay`（全屏叠层）切换页面。

底栏：**首页 | 找店 | AI | 圈子 | 我的**

| overlay / Tab | 组件 | 说明 |
|---|---|---|
| Tab 首页 | `HomePage` | 分类、今日严选、宠物档案入口、地图入口；**右上角消息未读角标** |
| Tab 找店 | `MerchantListPage` | |
| Tab AI | `AIChatPage` | **常驻 `v-show`**，切 Tab 不丢对话；记忆 + 档案同步 |
| Tab 圈子 | `CircleFeedPage` | 毛孩子圈子双列 Feed（推荐/经验/日常/求助） |
| Tab 我的 | `ProfilePage` | 登录、毛孩档案、订单 / 服务入口 |
| `messages` | `MessageCenterPage` | 人商会话 / 站内信（不再占底栏） |
| `circle-detail` | `CirclePostDetailPage` | 圈子帖详情、点赞、评论 |
| `circle-compose` | `CircleComposePage` | 发布图文 / 短视频 / 纯文字 |
| `medical` | `MedicalHubPage` | 医疗：线上问诊 / 线下就医 |
| `care` | `CareHubPage` | 上门和寄养 |
| `adopt` / `listing-detail` | 领养 / 宠物售卖 | |
| `mall` / `product` / `cart` / `shop-orders` | 商城 | |
| `orders` / `qrcode` / `review` | 服务订单闭环 | |
| `map` / `location` | 附近地图 / 服务定位 | |
| `detail` / `booking` | 商户详情与预约 | |

首页分类见 `HomePage.vue` → `open-medical` / `open-care` / `open-adopt` / `open-mall` / `open-pets` / `open-messages`。

## 毛孩子圈子

| 项 | 说明 |
|---|---|
| Feed | `GET /users/community/posts?category=` |
| 详情 | `GET /users/community/posts/:id` |
| 发帖 / 点赞 / 评论 | 需登录；`POST .../posts`、`.../like`、`.../comments` |
| 媒体 | 本地选图/短视频转 data URL（演示）；种子帖用外链图 |
| 入口 | 底栏「圈子」；发帖需先登录（「我的」） |

## AI 助手与记忆

| 项 | 说明 |
|---|---|
| 发送 | `POST /agent/chat`，带 `sessionId` + 稳定 `guestKey` + 可选 JWT |
| 历史 | `GET /agent/memory`；进入 Tab 时拉取；本地气泡优先保留 |
| 游客键 | `localStorage.petpal_ai_guest`（勿与 sessionId 混用） |
| 会话 id | `localStorage.petpal_ai_session` |
| 登录合并 | `mergeAiSessionAfterLogin()` → `POST /agent/memory/merge` |
| 档案 | 登录后网关注入 `x-user-id`，编排层注入宠物 / 预约 / 订单 |

## 定位

- `src/lib/user-location.ts`：高精度采样、精度门控、加权融合、WGS84→GCJ-02；有 Key 时并行高德定位
- `src/lib/amap.ts`：高德 JS / LiteMap；需配置 `VITE_AMAP_JS_KEY`，安全密钥 `VITE_AMAP_SECURITY_CODE`
- 定位页：`LocationPickerPage`（搜索换点 / 恢复精确定位）

## API 封装

`src/api.ts`：统一 `code === OK` 解析；含商城、预约、`chat` / `aiHistory` / `mergeAiSession`、**`communityPosts` 等圈子方法**。

## 依赖后端

至少：`gateway`、`auth`、`user`（含圈子）、`merchant`、`message`。  
AI Tab 额外：`agent-gateway:3006` + `orchestrator:8000`（`pnpm agent:ensure`）。
