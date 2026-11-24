# 宠伴 PetPal — 项目缺失项详细实施指导

> **文档版本**：v1.0.0  
> **编写日期**：2026-08-05  
> **适用仓库**：`d:\petserver`（Monorepo 空壳 + UI 壳阶段）  
> **对齐文档**：  
> - 《宠物综合服务平台完整计划 V3》  
> - 《宠伴 PetPal 界面设计规范（开发可执行版）》  
> - 仓库内 `docs/ARCHITECTURE.md`、`README.md`

---

## 0. 怎么用这份文档

### 0.1 当前项目真实状态（务必先读）

本仓库**已经具备**：

| 已有项 | 说明 |
|--------|------|
| Monorepo 工程 | pnpm + turbo，apps / services / agents / packages |
| Nest 微服务空壳 | gateway / auth / user / merchant / inspect / message / agent-gateway |
| Agent 编排占位 | FastAPI + 关键词意图路由（非真大模型） |
| 前端 UI 壳 | user-web / merchant-web / admin-web / inspect-mini / Flutter 主题与部分页面 |
| Design Tokens | `@petpal/design-tokens` + Flutter `AppColors` 等 |
| Docker Compose 定义 | PostgreSQL / Redis / MinIO（业务代码尚未真正使用） |

本仓库**尚未具备**可上线业务能力：无真实数据库表、无真实登录、无预约/支付/考察闭环、无地图/推送/OCR、无完整 Agent。

### 0.2 建议阅读与实施顺序

1. 先读 **第 1 章总览缺口地图**，建立全局图。  
2. 按 **P0 → P1 → P2 → P3** 实施，不要并行摊开所有模块。  
3. 每一节都按固定结构阅读：  
   - **缺口是什么**  
   - **为什么现在必须补**  
   - **目标验收标准**  
   - **推荐技术落点（文件/服务）**  
   - **数据模型要点**  
   - **API / 页面清单**  
   - **实现步骤（可照着做）**  
   - **风险与合规注意**  
4. 每完成一块，更新本文件末尾的「完成勾选清单」。

### 0.3 推荐里程碑（与 V3 路线对齐）

| 里程碑 | 目标 | 建议周期 |
|--------|------|----------|
| M1 地基 | DB + 登录鉴权 + 用户/宠物基础 | 1~2 周 |
| M2 找店闭环 | 商户入库 + 列表详情 + 地图距离 | 2~3 周 |
| M3 预约闭环 | 预约 → 核销 → 评价 → 信用分回流 | 2~3 周 |
| M4 严选闭环 | 入驻 → 初筛占位 → 考察 → 盲审 → 上线 | 3~4 周 |
| M5 Agent 增强 | 真 LLM + RAG + A2/A6 工具调用 | 2~3 周 |
| M6 支付与合规 | 微信支付/支付宝、推送、隐私权利 | 并行穿插 |

---

## 1. 缺口总览地图

```text
┌─────────────────────────────────────────────────────────────┐
│                        客户端层                              │
│  缺：规范 14 页完整落地 / Flutter 与 H5 对齐 / 真图标素材      │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                        接入层                                │
│  缺：JWT 校验 / 限流 / 防重放 / 统一错误码透传                 │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                     Agent 层                                 │
│  缺：真大模型 / RAG / 工具白名单 / Temporal / A8 风控策略      │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                     业务服务层                               │
│  缺：预约交易 / 信用分引擎 / 考察工单真流程 / 消息真实投递     │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                       数据层                                 │
│  缺：Prisma Schema / 迁移 / Redis 会话缓存 / OSS 影像业务    │
└─────────────────────────────────────────────────────────────┘
```

### 1.1 按优先级汇总

| 优先级 | 缺口域 | 不补的后果 |
|--------|--------|------------|
| **P0** | 数据库、登录鉴权、核心业务 API | 前端永远只能看 mock，无法联调 |
| **P0** | 预约核销评价闭环 | MVP「找店—到店—评价」跑不通 |
| **P0** | 严选考察最小闭环 | 差异化壁垒（严选）无法验证 |
| **P1** | 地图、消息推送、宠物建档 | 体验不完整，排序与触达失真 |
| **P1** | 设计规范剩余页面 | 产品流程断点多 |
| **P2** | 真 Agent、信用分引擎细化 | AI 与品质飞轮价值不足 |
| **P2** | Flutter 对齐、图标插画 | 多端体验不一致 |
| **P3** | 支付、电商、问诊、会员 | 属 V1/V2，勿在 MVP 抢跑 |
| **P3** | 合规证照、监控 CI | 上线前必须，但可与开发并行 |

---

## 2. P0-1：数据库与 Prisma（地基）

### 2.1 缺口是什么

- 计划选定 **Prisma**，但仓库中**没有** `schema.prisma`、没有 migration、没有 DB Client 封装。  
- 各服务目前返回硬编码 JSON（stub）。  
- Docker Compose 定义了 PostgreSQL，但服务启动不依赖、也不读写库。

### 2.2 为什么必须先补

没有表结构，后面登录、商户、预约、考察全部会反复返工。表是全项目契约。

### 2.3 目标验收标准

- [ ] `packages/db`（或各服务独立 prisma）可 `prisma migrate dev` 成功  
- [ ] 本地 `pnpm docker:up` 后，业务服务能连上 PG 并完成一次读写  
- [ ] 至少存在：用户、宠物、商户、预约、考察任务、评价、消息 基础表  
- [ ] 表名前缀或 schema 隔离：`auth_*` / `user_*` / `merchant_*` / `inspect_*` / `message_*`

### 2.4 推荐落点

```text
packages/db/
  prisma/
    schema.prisma
    migrations/
  src/
    index.ts          # 导出 PrismaClient 单例
  package.json
```

初期可用「单库 + 表前缀」降低复杂度；后期再拆库。

### 2.5 建议核心表（MVP 最小集）

#### users / pets

```text
User
  id, phone(unique), nickname, avatarUrl
  privacyAcceptedAt, privacyVersion
  createdAt, updatedAt, deletedAt

Pet
  id, userId, name, type(cat|dog|other), breed
  birthday, weightKg, sterilized, vaccinated
  avatarUrl, tags(json)
  createdAt, updatedAt
```

#### merchants

```text
Merchant
  id, name, category, status(draft|pending_inspect|online|rejected|offline)
  creditScore, creditGrade(S|A|B|C|D)
  lat, lng, address, city, district
  openTime, closeTime, priceLevel
  coverUrl, highlight
  selectedBadge(bool), lastInspectedAt
  ownerUserId(nullable)
  createdAt, updatedAt

MerchantService
  id, merchantId, name, priceCents, durationMin, enabled

MerchantApplication
  id, merchantId, stage(apply|ai_screen|inspect|review|online)
  licenseImages(json), contactPhone
  aiScreenResult(json), createdAt
```

#### bookings / reviews

```text
Booking
  id, userId, merchantId, petId, serviceId
  status(pending|confirmed|cancelled|verified|reviewed)
  bookingAt, verifyCode, amountCents
  createdAt, verifiedAt

Review
  id, bookingId, userId, merchantId
  rating(1-5), content, images(json)
  createdAt
  # 约束：仅 verified 订单可评价；同 booking 唯一
```

#### inspect

```text
InspectTask
  id, merchantId, assigneeId, type(scheduled|surprise|mystery)
  status(assigned|checked_in|submitted|reviewed)
  checkInLat, checkInLng, checkInAt, bssidMatched

InspectScoreItem
  id, taskId, dimension, score, maxScore, comment, photoIds(json)

InspectReview
  id, taskId, reviewerId, decision(pass|conditional|reject)
  scoreTotal, explainJson, createdAt

CreditScoreLog
  id, merchantId, scoreBefore, scoreAfter, reason, createdAt
```

#### message

```text
Message
  id, userId, channel(inbox|push|sms)
  title, body, type(system|order|marketing)
  readAt, createdAt

MessageTemplate
  id, code, title, bodyTemplate, enabled
```

### 2.6 实现步骤

1. 新建 `packages/db`，安装 `prisma` / `@prisma/client`。  
2. 配置 `DATABASE_URL`（与 `.env.example` 对齐）。  
3. 写 `schema.prisma`，执行：  
   `pnpm --filter @petpal/db exec prisma migrate dev --name init_mvp`  
4. 在各 Nest 服务中注入 Prisma（或先集中在一个 BFF 服务，降低微服务复杂度）。  
5. 写 seed 脚本：导入 4~10 家示例严选商户 + 服务项。  
6. 冒烟：`GET /merchants` 从 DB 读，不再读死数据。

### 2.7 风险

- 过早拆多库会导致事务困难；MVP 用单库。  
- 手机号、地址属于敏感字段，后续再加加密列；MVP 至少做好访问审计预留。

---

## 3. P0-2：登录鉴权（Auth）

### 3.1 缺口是什么

- `services/auth` 返回固定 `shell-token`。  
- gateway **没有** JWT 校验中间件。  
- 无短信验证码、无 refresh token、无会话吊销。

### 3.2 目标验收标准

- [ ] 手机号 + 验证码登录（开发环境可用固定码 `123456`）  
- [ ] 签发 accessToken（短）+ refreshToken（长）  
- [ ] gateway 校验 JWT，下游收到 `x-user-id` 内部头  
- [ ] 未登录访问受保护接口返回 401  
- [ ] 前端登录态持久化（localStorage / Flutter secure storage）

### 3.3 推荐落点

```text
services/auth/src/
  auth.controller.ts      # /auth/sms/send /auth/login /auth/refresh
  auth.service.ts
  jwt.module.ts
  sms.provider.ts         # 开发用 Memory，生产接阿里云/腾讯云

services/gateway/src/
  auth.guard.ts           # 校验 Authorization Bearer
  proxy.service.ts        # 转发时附加 x-user-id / x-request-id
```

### 3.4 API 清单

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/auth/sms/send` | body: `{ phone }` |
| POST | `/auth/login` | body: `{ phone, code }` → tokens + user |
| POST | `/auth/refresh` | body: `{ refreshToken }` |
| POST | `/auth/logout` | 吊销 refresh（可选） |
| GET | `/users/me` | 需登录 |

### 3.5 实现步骤

1. 选 JWT 库：`@nestjs/jwt` + `passport-jwt`（或 jose）。  
2. `.env`：`JWT_SECRET`、`JWT_EXPIRES_IN=2h`、`REFRESH_EXPIRES_IN=30d`。  
3. 验证码：Redis 存 `sms:{phone}`，TTL 5 分钟；开发模式打印到日志。  
4. gateway 白名单：`/auth/*`、`/health`、公开商户列表可先匿名。  
5. 前端：  
   - user-web：登录页（可先做 Profile 入口弹层）  
   - merchant-web：替换当前「点一下进工作台」  
6. 写集成测试：无 token → 401；有 token → 200。

### 3.6 合规注意

- 登录前必须有隐私协议同意记录（见第 12 章）。  
- 短信仅用于登录/安全，勿滥发营销短信。

---

## 4. P0-3：用户与宠物档案

### 4.1 缺口是什么

- `services/user` 仅 stub。  
- 设计规范中的 **宠物建档页 / 宠物档案页** 未落地。  
- 首页「添加宠物」按钮无真实流程。

### 4.2 目标验收标准

- [ ] 登录用户可创建/编辑/删除（软删）宠物  
- [ ] 新用户引导：隐私同意 → 建档（可跳过）→ 首页  
- [ ] A1 新客引导可读取宠物类型做推荐上下文（即便先规则）

### 4.3 页面（对照设计规范）

| 页面 | 路由 | 状态 |
|------|------|------|
| SplashPage | `/splash` | 缺 |
| PrivacyAuthPage | `/privacy-auth` | 缺 |
| PetOnboardingPage | `/pet/onboarding` | 缺 |
| PetProfilePage | `/pet/:id` | 缺 |

### 4.4 API 清单

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/users/me` | 含 pets 摘要 |
| PATCH | `/users/me` | 昵称头像 |
| POST | `/users/pets` | 创建 |
| PATCH | `/users/pets/:id` | 更新 |
| DELETE | `/users/pets/:id` | 软删 |
| POST | `/users/privacy/accept` | `{ version }` |

### 4.5 实现步骤

1. 后端 CRUD + 归属校验（只能改自己的宠物）。  
2. user-web 增加路由级页面（不要只做按钮占位）。  
3. 建档字段最少：类型、昵称、品种、生日或年龄。  
4. 跳过建档也要写 `onboardingSkippedAt`，避免每次弹窗。  
5. Flutter 同步同一流程（可晚于 H5）。

---

## 5. P0-4：商户服务（找店）

### 5.1 缺口是什么

- 用户端商家数据主要来自 `apps/user-web/src/data/mock.ts`。  
- `services/merchant` 返回 2 条壳数据，字段远少于 UI。  
- 无商户详情 API、无服务项目 API、无真实信用分。

### 5.2 目标验收标准

- [ ] `GET /merchants` 支持 city / category / sort / keyword / lat,lng  
- [ ] `GET /merchants/:id` 返回详情 + services + 最近评价 + 考察摘要  
- [ ] user-web **删除对 mock 的强依赖**（可保留 fallback）  
- [ ] 排序公式可配置：信用分 50% + 距离 20% + 履约 20% + 资质 10%（先简化）

### 5.3 API 清单

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/merchants` | 列表筛选排序 |
| GET | `/merchants/:id` | 详情 |
| GET | `/merchants/:id/services` | 服务项 |
| GET | `/merchants/:id/reviews` | 评价分页 |
| GET | `/merchants/:id/inspect-summary` | 脱敏考察摘要 |
| GET | `/merchants/apply/status` | 商家端入驻进度（需商家身份） |
| POST | `/merchants/apply` | 提交入驻申请 |

### 5.4 实现步骤

1. seed 商户与服务项（对齐现 UI 的 4 家样例可入库）。  
2. 列表 DTO 与前端 `Merchant` 类型对齐（见 `mock.ts` 字段）。  
3. 距离计算：有 lat/lng 时用 Haversine；无定位时按 city。  
4. 详情半屏页改为请求 `/merchants/:id`。  
5. 管理后台商户列表改读同一 API。

### 5.5 地图（可与本节并行，属 P1）

见第 8 章；没有地图时先用手选城市 + 文本地址。

---

## 6. P0-5：预约 → 核销 → 评价闭环（MVP 核心）

### 6.1 缺口是什么

这是计划里「找店—预约—核销—评价」飞轮的主干，目前**整条链路不存在**：

- 无 Booking 服务/表  
- 无核销码生成与核销接口  
- 无评价写入与防刷  
- 商家端预约/扫码页是静态假数据  

### 6.2 目标验收标准

- [ ] 用户可对在线商户某服务选择日期时段并创建预约  
- [ ] 生成核销码（二维码内容可为 bookingId + 签名）  
- [ ] 商家扫码或输入码后状态变为 `verified`  
- [ ] 仅核销后可评价；评价后更新商户评分聚合  
- [ ] A6 消息：预约成功 / 提醒 / 邀评（至少站内信）

### 6.3 建议服务划分

短期可在 `merchant` 服务内先做 Booking 模块；中期拆 `services/booking`。

```text
services/merchant/src/booking/
  或新建 services/booking/
```

### 6.4 状态机（必须严格）

```text
pending ──确认──► confirmed ──核销──► verified ──评价──► reviewed
   │                 │
   └──取消──► cancelled
```

非法跳转一律 409。

### 6.5 API 清单

| 方法 | 路径 | 角色 |
|------|------|------|
| GET | `/merchants/:id/timeslots?date=` | 用户 |
| POST | `/bookings` | 用户 |
| GET | `/bookings` | 用户/商家（不同 filter） |
| GET | `/bookings/:id` | 双方 |
| GET | `/bookings/:id/qrcode` | 用户 |
| POST | `/bookings/:id/cancel` | 用户/商家 |
| POST | `/bookings/verify` | 商家 `{ code }` |
| POST | `/reviews` | 用户 `{ bookingId, rating, content }` |

### 6.6 前端页面（设计规范）

| 页面 | 路由 | 端 |
|------|------|-----|
| BookingPage | `/merchant/:id/booking` | 用户 |
| VerificationCodePage | `/order/:id/qrcode` | 用户 |
| ReviewPage | `/order/:id/review` | 用户 |
| OrderListPage | `/orders` | 用户 |
| BookingManagePage | `/bookings` | 商家 |
| ScanVerifyPage | `/scan` | 商家 |

### 6.7 实现步骤（建议拆 PR）

**PR-A 后端状态机 + API**  
1. 表 Booking / Review  
2. 创建预约（校验商户 online、服务 enabled）  
3. verify 接口幂等（重复核销返回已核销）  

**PR-B 用户端页面**  
1. 详情页「立即预约」进入 BookingPage  
2. 时段选择器（可先简单：上午/下午/晚上 + 整点）  
3. 核销码页（用 QR 库生成）  

**PR-C 商家端**  
1. 预约列表读 API  
2. 扫码页：H5 可先「手动输码」；小程序再接相机  

**PR-D 评价与回流**  
1. 核销后站内信邀评  
2. 评价写入后重算 `Merchant.rating` / `reviewCount`  
3. 触发信用分日志（可先 +0.1 占位规则）

### 6.8 防刷评分（必须做最小版）

- 仅 `verified` 订单可评  
- 一单一评  
- 记录 deviceId / IP（先存日志，风控模型可后置）  
- 近 90 天评价加权（可后置，先记 `createdAt`）

---

## 7. P0-6：严选考察最小闭环

### 7.1 缺口是什么

计划差异化核心，但目前只有：

- inspect 服务 stub（任务列表/签到/评审队列假数据）  
- 考察小程序 4 页 UI 壳  
- **没有**：SOP 模板、照片上传、盲审决策落库、上线状态变更、信用分初始化

### 7.2 目标验收标准（MVP 可砍神秘访客/蓝牙）

- [ ] 商家提交入驻申请  
- [ ] 运营/系统创建考察任务并指派  
- [ ] 考察端：签到 → SOP 打分 → 上传照片 → 提交报告  
- [ ] 后台盲审：通过 / 有条件通过 / 拒绝，并写可解释扣分  
- [ ] 通过后商户 `status=online`，获得初始信用分与严选徽章  
- [ ] 用户端展示「实地考察」标签与摘要

### 7.3 建议模块与落点

```text
services/inspect/
  application/     # 或放 merchant
  task/
  scorecard/
  review/
  media/           # 预签名上传 MinIO
  credit/

apps/inspect-mini/ # 真接口对接
apps/admin-web/    # 盲审工作台做完
```

### 7.4 SOP 模板

按商户类型存储 JSON 模板（医院/美容/寄养权重不同），参考计划表 10-3。

```json
{
  "category": "hospital",
  "dimensions": [
    { "key": "license", "name": "资质证照", "max": 20 },
    { "key": "hygiene", "name": "环境卫生", "max": 25 },
    { "key": "equipment", "name": "设备设施", "max": 20 },
    { "key": "service", "name": "服务能力", "max": 20 },
    { "key": "safety", "name": "安全合规", "max": 15 }
  ]
}
```

### 7.5 评审决策规则（落地用）

| 总分 | 决策 | 动作 |
|------|------|------|
| ≥80 | 通过 | online + 初始信用分 |
| 70~79 | 有条件通过 | online 但降权，30 天整改 |
| 60~69 | 暂不通过 | 整改期，不展示 |
| <60 或红线 | 拒绝 | 6 个月不可再申请 |

可解释扣分示例格式（必须落库）：

```text
候诊区地面毛发残留（照片#12，扣2分）
```

### 7.6 API 清单（最小）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/merchants/apply` | 入驻申请 |
| POST | `/inspect/tasks` | 创建任务（后台） |
| GET | `/inspect/tasks` | 专员任务列表 |
| POST | `/inspect/tasks/:id/check-in` | 签到 |
| PUT | `/inspect/tasks/:id/scores` | 提交打分 |
| POST | `/inspect/tasks/:id/media` | 获取上传 URL |
| POST | `/inspect/tasks/:id/submit` | 提交报告 |
| GET | `/inspect/reviews/queue` | 盲审队列 |
| POST | `/inspect/reviews/:id/decide` | 盲审决策 |
| GET | `/inspect/credit/:merchantId` | 信用分 |

### 7.7 影像与存证（MVP 务实版）

1. 前端直传 MinIO（预签名 PUT）。  
2. DB 只存 objectKey、gps、timestamp、uploaderId。  
3. 报告提交时计算 hash，写入审计表（追加写）。  
4. **先不要上区块链**；KMS + RFC3161 可列为 P2。

### 7.8 明确可延后（V2/V3）

- 蓝牙信标 / MDM 工作机  
- 神秘访客系统  
- AI 考察复核（CV/NLP）  
- 贿赂风险图谱  

MVP 用：GPS 签到 + 时间戳水印文案 + 服务端校验必填照片点位。

---

## 8. P1：地图与定位

### 8.1 缺口

- 无高德 Key、无定位授权、无逆地理、无导航跳转。  
- 距离字段多为写死。

### 8.2 验收

- [ ] 用户授权后获取 GCJ-02 坐标  
- [ ] 列表按距离排序可用  
- [ ] 详情页一键打开高德/系统地图导航  
- [ ] 拒绝定位时降级为城市选择，不阻断浏览

### 8.3 实施要点

1. 申请高德 Web/JS API 与小程序 Key。  
2. user-web：浏览器 Geolocation → 后端排序。  
3. Flutter：`geolocator` + 高德 Flutter SDK（注意合规）。  
4. 坐标系：国内只用 GCJ-02，不要用 WGS84 直接展示。  
5. 隐私：定位权限按需申请，文案说明用途。

---

## 9. P1：消息中心真实投递（A6）

### 9.1 缺口

- `services/message` 仅 stub。  
- 无推送、无短信、无模板渲染、无节流。

### 9.2 验收

- [ ] 预约/核销/考察节点写入站内信  
- [ ] 消息列表已读/未读可用  
- [ ] 模板表可配置  
- [ ] 预留 push provider 接口（个推/极光）

### 9.3 触发矩阵（MVP）

| 事件 | 通道 |
|------|------|
| 注册欢迎 | inbox |
| 预约成功 | inbox（+ 可选 push） |
| 预约前 2h 提醒 | inbox/push |
| 核销成功 | inbox |
| 邀评 | inbox |
| 考察结果（商家） | inbox |
| 登录异常 | sms（后置） |

### 9.4 实现步骤

1. Message / MessageTemplate 表。  
2. 领域事件先用进程内 EventEmitter；后续换 MQ。  
3. `packages/shared` 已有 `DomainEvents` 常量，直接复用。  
4. 营销类消息必须有开关（用户设置页）。

---

## 10. P1：前端页面补齐（对照设计规范）

### 10.1 用户端（规范 14 页）

| 页面 | 当前 | 你需要做的 |
|------|------|------------|
| SplashPage | 缺 | 启动 Logo + 初始化 |
| PrivacyAuthPage | 缺 | 协议勾选 + 版本号落库 |
| PetOnboardingPage | 缺 | 建档向导 |
| HomePage | H5 已较强 | 接真 API、去 mock |
| MerchantListPage | H5 有 | 接筛选 API |
| MerchantDetailPage | H5 半屏壳 | 接详情/服务/评价 API |
| BookingPage | 缺 | 完整预约 |
| VerificationCodePage | 缺 | 二维码展示 |
| AIChatPage | H5 有 | 接真 LLM |
| PetProfilePage | 缺 | 档案详情 |
| MessageCenterPage | H5 有 | 接消息 API |
| ReviewPage | 缺 | 星级+文字+图 |
| ProfilePage | H5 有 | 登录态/设置真功能 |
| OrderListPage | 缺 | 订单状态列表 |

### 10.2 商家端（规范 5 页）

| 页面 | 当前 | 你需要做的 |
|------|------|------------|
| MerchantDashboard | UI 有 | 接经营数据 API |
| BookingManagePage | 静态 | 接预约列表/确认 |
| ScanVerifyPage | 输码壳 | 接 verify API + 扫码 |
| CreditScorePage | 静态图 | 接信用分明细 |
| PriceListPage | 静态 | 服务项 CRUD |

### 10.3 考察端（规范 4 页）

| 页面 | 当前 | 你需要做的 |
|------|------|------------|
| InspectionTaskList | UI | 接任务 API |
| SOPScorePage | UI | 动态模板打分提交 |
| PhotoUploadPage | 弱 | 预签名上传 + 必拍点位校验 |
| InspectionReportPage | UI | 报告预览与提交 |

### 10.4 后台

| 能力 | 当前 | 你需要做的 |
|------|------|------------|
| 盲审队列 | 列表壳 | 详情、打分、决策、冲突处理 |
| 商户列表 | 读 stub | 筛选、上下架、信用分 |
| 消息模板 | 读 stub | 编辑启用 |

### 10.5 Flutter

- 目前主题与部分页面有，但**远落后于 user-web**。  
- 策略建议：H5/小程序先闭环，再把 Flutter 当正式用户 App 对齐。  
- 需执行 `flutter create` 生成平台目录（若尚未生成）。

---

## 11. P2：Agent 体系做实

### 11.1 现状

- orchestrator：关键词分类 + 固定话术。  
- agent-gateway：转发 + 降级。  
- 无工具调用、无 RAG、无会话记忆、无评测。

### 11.2 MVP 应做成什么样

| Agent | MVP 范围 |
|-------|----------|
| A1 | 意图识别（模型或混合）+ 通用 FAQ RAG |
| A2 | 工具：`search_merchants` / `get_merchant` |
| A6 | 不对话，走事件触发 |
| A8 | 基础限流日志 + 异常登录检测占位 |
| A3/A5/A7 | 只做意图识别提示「未上线」，不要做假交易/假诊疗 |

### 11.3 关键落点

```text
agents/orchestrator/
  app/
    graph.py              # 升级为真 LangGraph
    tools/
      merchants.py
    rag/
      ingest.py
      retrieve.py
    prompts/
      a1_system.md
services/agent-gateway/
  tool_whitelist.ts       # 工具白名单与鉴权
```

### 11.4 必须遵守的铁律（计划原文工程化）

1. Agent **禁止直连业务库写操作**。  
2. 下单/取消/核销只能调业务 API，失败要可解释。  
3. 健康相关：紧急症状固定话术转线下；回答标注「仅供参考」。  
4. 所有对外回复 `aiGenerated: true`（已有字段，需前端始终展示）。  
5. 高风险（退款、投诉升级）转人工。

### 11.5 实施步骤

1. 选已备案国内模型 API，密钥进环境变量。  
2. 建知识库：平台规则、养宠科普（需审核）、入驻 SOP 说明。  
3. LangGraph：`classify → route → tool/rag → reply`。  
4. 加会话表 `ChatSession` / `ChatMessage`。  
5. 做 50 条回归用例（找店/闲聊/急症/注入攻击）。  

### 11.6 Temporal（可后置）

支付超时关单、考察任务超时升级，等 Booking/Inspect 稳定后再接，避免过早复杂化。

---

## 12. P2/P3：安全、隐私与合规

### 12.1 缺口

- 无 WAF/网关限流实装  
- 无隐私协议版本管理与撤回  
- 无数据导出/注销  
- 无操作审计查询台  
- Agent 提示注入防护弱  

### 12.2 必须落地的产品能力

| 能力 | 说明 |
|------|------|
| 隐私弹窗 | 首次启动，不同意则仅浏览有限功能 |
| 权限最小化 | 定位/相册按需 |
| 用户权利 | 查询、更正、导出、删除、注销 |
| AI 标识 | 对话与生成内容标识 |
| 未成年限制 | 实名后限制交易（可后置） |

### 12.3 安全最小集

1. HTTPS（部署层）。  
2. gateway：JWT + 基础 rate limit（IP/用户）。  
3. 防重放：可选 timestamp + nonce（支付前必须上）。  
4. 审计日志表：谁在何时调了何接口、改了何资源。  
5. 管理后台与盲审账号 RBAC。

### 12.4 证照与备案（上线前并行）

- App 备案、ICP  
- 生成式 AI 备案/安全评估（若面向公众提供对话）  
- 地图 SDK 合规授权  
- 电商 EDI（开第三方商家入驻前）  

---

## 13. P3：支付 / 电商 / 问诊（不要抢跑）

以下**不是当前空壳阶段的立即任务**，但指导如下，避免错误开工：

### 13.1 支付

- 平台不碰资金清算，接微信/支付宝。  
- 需独立 `services/payment` + 支付回调验签 + 对账。  
- 与 Booking 状态机联动：支付成功才 `confirmed`（若预付模式）。  
- MVP 也可「到店付」，先把核销闭环跑通。

### 13.2 电商 A3

- V1：货架商城 + 导购问答。  
- 活体不做线上交易。  
- 饲料资质审核与广告话术红线。

### 13.3 问诊 A5

- 只做健康咨询 + 分诊，不开处方。  
- 医生资质人工审核。  
- 急症固定转线下医院（联动 A2）。

---

## 14. 工程化与质量缺口

### 14.1 测试

- 缺单元测试、接口测试、e2e。  
- 建议：  
  - 服务层：Jest + Supertest  
  - Agent：用例集 JSON  
  - 前端：关键预约流 Playwright  

### 14.2 CI

- 缺 GitHub Actions / 其它 CI。  
- 最低：`pnpm install` → `build` → `lint` → `test`。  

### 14.3 可观测性

- 统一 `x-request-id`  
- 结构化日志  
- 关键路径埋点（预约转化漏斗）  

### 14.4 环境与密钥

- `.env.example` 已有雏形，需补齐：短信、高德、LLM、支付、对象存储。  
- **禁止**把真实密钥提交进 Git。  

---

## 15. 推荐目录演进（方便你按文件写）

```text
packages/
  db/                 # Prisma 统一 schema（建议新增）
  shared/             # 已有：错误码、事件、意图
  design-tokens/      # 已有

services/
  gateway/            # 补 JWT Guard、限流
  auth/               # 补短信登录
  user/               # 补宠物档案
  merchant/           # 补商户真 CRUD；短期可含 booking
  booking/            # （建议新增）预约核销评价
  inspect/            # 补考察真流程
  message/            # 补站内信与模板
  agent-gateway/      # 补工具白名单
  payment/            # V1 再加

agents/
  orchestrator/       # 补 LLM + RAG + tools

apps/
  user-web/           # 主预览端，优先接真 API
  user-app/           # Flutter 对齐（第二波）
  merchant-web/
  admin-web/
  inspect-mini/
```

---

## 16. 接口约定（全项目统一，减少返工）

### 16.1 成功响应

```json
{
  "code": "OK",
  "data": {}
}
```

### 16.2 失败响应

```json
{
  "code": "UNAUTHORIZED",
  "message": "登录已失效",
  "details": null
}
```

错误码复用 `packages/shared` 的 `ErrorCode`。

### 16.3 鉴权头

```text
Authorization: Bearer <accessToken>
```

gateway 校验后转：

```text
x-user-id: <uuid>
x-user-role: user|merchant|inspector|admin
x-request-id: <uuid>
```

### 16.4 分页

```text
GET /resource?page=1&pageSize=20
→ { list, page, pageSize, total }
```

---

## 17. 本地开发补齐清单（环境）

按顺序确保：

1. Node 20+、pnpm 9、Docker Desktop  
2. `pnpm docker:up` 成功（若 Docker Hub 超时：配镜像加速或代理）  
3. 复制 `.env.example` → `.env` 并填写  
4. `pnpm install`  
5. `pnpm --filter @petpal/db exec prisma migrate dev`（db 包建好后）  
6. `pnpm dev:services`  
7. `pnpm agent:dev`  
8. `pnpm --filter @petpal/user-web dev`  

---

## 18. 分周实施建议（一人或小团队）

### 第 1 周：地基

- packages/db + 迁移 + seed  
- auth 短信登录（开发固定码）  
- gateway JWT  
- users/me + pets CRUD  

### 第 2 周：找店

- merchants 真列表/详情  
- user-web 去 mock  
- 城市筛选 + 基础排序  

### 第 3 周：预约核销

- booking 状态机  
- 用户预约页 + 核销码页  
- 商家预约列表 + 输码核销  

### 第 4 周：评价与消息

- 评价防刷最小版  
- 站内信事件  
- 信用分日志占位  

### 第 5~6 周：严选闭环

- 入驻申请  
- 考察小程序对接  
- 后台盲审决策  
- 用户端严选徽章真数据  

### 第 7 周：Agent

- LLM + 商户检索工具  
- FAQ RAG  
- 急症话术与注入测试  

---

## 19. 完成勾选清单（实施时打勾）

### P0

- [x] Prisma Schema 与迁移（本地 MVP 暂用 SQLite：`packages/db`）  
- [x] Seed 数据  
- [x] 短信登录 + JWT（开发码 `123456`）  
- [x] Gateway 鉴权  
- [x] 宠物档案 CRUD（引导完整页可继续打磨）  
- [x] 商户列表/详情真 API  
- [x] 预约创建  
- [x] 核销  
- [x] 评价  
- [ ] 考察任务提交（M4，未纳入本轮）  
- [ ] 盲审决策（M4）  
- [ ] 商户上线与徽章（M4；seed 已有严选在线店）  

### P1

- [ ] 高德定位与导航  
- [x] 消息模板与站内信（预约成功/邀评写入 inbox）  
- [ ] 设计规范剩余页面  
- [ ] 商家价目 CRUD  
- [x] 信用分展示接真数据（评价回流 +1 占位）  

### P2

- [x] LLM 联调（DeepSeek，可插拔 `LLM_PROVIDER`）  
- [ ] RAG 知识库  
- [ ] A2 工具调用  
- [ ] Flutter 对齐 H5  
- [ ] 图标与插画资源  
- [ ] 审计日志查询  

### P3

- [ ] 支付  
- [ ] 推送/短信生产通道  
- [ ] 电商/问诊（按阶段）  
- [ ] CI/CD  
- [ ] 备案与合规材料  

---

## 20. 写代码时的「不要做」清单

1. 不要让 LLM 直接拼 SQL 写生产库。  
2. 不要在前端写死信用分规则当最终规则（规则应在服务端）。  
3. 不要上线前做活体交易、在线处方药。  
4. 不要跳过核销直接开放评价。  
5. 不要盲审页面展示专员/商户明文联系方式。  
6. 不要把密钥提交到仓库。  
7. 不要同一阶段并行「支付 + 问诊 + 直播」导致 MVP 失控。  

---

## 21. 相关仓库路径速查

| 用途 | 路径 |
|------|------|
| 架构说明 | `docs/ARCHITECTURE.md` |
| 根启动说明 | `README.md` |
| 共享错误码/事件 | `packages/shared/src/` |
| 设计 Tokens | `packages/design-tokens/tokens.css` |
| 用户端 H5 | `apps/user-web/` |
| 用户端 Flutter | `apps/user-app/` |
| 商家端 | `apps/merchant-web/` |
| 后台 | `apps/admin-web/` |
| 考察小程序 | `apps/inspect-mini/` |
| 网关 | `services/gateway/` |
| 认证 | `services/auth/` |
| 商户 | `services/merchant/` |
| 考察 | `services/inspect/` |
| 消息 | `services/message/` |
| Agent 网关 | `services/agent-gateway/` |
| 编排器 | `agents/orchestrator/` |
| 基础设施 | `docker/docker-compose.yml` |
| 环境变量模板 | `.env.example` |

---

## 22. 文档维护

- 每完成一个 P0 勾选项，更新第 19 章勾选状态。  
- 若表结构有重大变更，同步改第 2 章并增加 migration 说明。  
- 接口新增时同步第 16 章约定，避免前后端各写一套。  

---

**结语**：当前仓库已经把「能看见、能点、能跑通健康检查」做完了。从现在开始，价值几乎全部取决于 **P0：数据库 + 登录 + 预约核销 + 严选闭环**。请严格按优先级推进；需要把某一章再拆成「接口字段级说明书」时，可以指定章节继续细化。
