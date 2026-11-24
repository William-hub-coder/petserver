# `@petpal/db`

Prisma schema / client / seed。本地 MVP 默认 **SQLite**（`prisma/dev.db`），通过仓库根目录 `.env` 的 `DATABASE_URL` 配置。

## 常用命令

```bash
pnpm --filter @petpal/db generate
pnpm --filter @petpal/db exec prisma migrate deploy
pnpm --filter @petpal/db seed
# seed 已串联：主种子 + 扩展服务 + 商城商品 + 领养/售宠 + 圈子示例帖
# 仅主种子：pnpm --filter @petpal/db run seed:core
# 仅圈子：pnpm --filter @petpal/db run seed:community
```

## 与预约频道相关的字段

见 `prisma/schema.prisma`：

- `MerchantService.kind`：`onsite` | `online_consult` | `home_visit`
- `Booking.channel`：创建时从服务 kind 拷贝
- `Booking.addressSnapshot` / `note`：上门地址、问诊症状等

## 领养 / 宠物售卖

- `PetListing.channel`：`adopt` | `sale`
- `PetAdoptApplication`：领养申请
- `Conversation.kind=adoption` + `listingId`

演示数据：`prisma/seed-listings.ts`。

## AI 对话记忆

与人商 `Conversation` 分离：

| 模型 | 表 | 说明 |
|---|---|---|
| `AgentSession` | `agent_sessions` | `userId?` / `guestKey?` / `summary` / `mergedIntoId` |
| `AgentMessage` | `agent_messages` | `role`：user \| assistant \| system \| tool |

迁移目录示例：`prisma/migrations/20260805090000_agent_memory/`。  
业务读写经 `message` 服务 `/messages/ai/*`，Python orchestrator **不直连**本库。

## 毛孩子圈子

| 模型 | 表 | 说明 |
|---|---|---|
| `CommunityPost` | `community_posts` | 标题/正文/分类/媒体、点赞数与评论数 |
| `CommunityLike` | `community_likes` | `postId` + `userId` 唯一 |
| `CommunityComment` | `community_comments` | 帖子评论 |

分类：`experience` / `daily` / `help` / `other`。  
迁移：`prisma/migrations/20260806102000_community_circle/`。  
种子：`prisma/seed-community.ts`。  
API 归属 **`user` 服务** `/users/community/*`（非 message）。
