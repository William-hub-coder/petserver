# 用户服务（`@petpal/user`）

端口默认 **3002**。经 gateway 暴露为 `/users/*`。

## 职责

- 用户资料：`GET/PATCH /users/me`、隐私同意
- 宠物档案：`POST/PATCH/DELETE /users/pets…`
- **毛孩子圈子**：`/users/community/posts…`（列表、详情、发帖、点赞、评论）

## 圈子接口摘要

| 方法 | 路径 | 鉴权 |
|---|---|---|
| GET | `/users/community/posts` | 公开（可选 JWT 以标记已赞） |
| GET | `/users/community/posts/:id` | 公开 |
| GET | `/users/community/posts/:id/comments` | 公开 |
| POST | `/users/community/posts` | 需登录 |
| POST | `/users/community/posts/:id/like` | 需登录 |
| POST | `/users/community/posts/:id/comments` | 需登录 |

实现：`community.controller.ts` / `community.service.ts`；表见 `@petpal/db`。

## 本地启动

随 `pnpm services:start` 一并编译启动。单独：

```bash
pnpm --filter @petpal/user exec tsc -p tsconfig.build.json --incremental false
pnpm --filter @petpal/user start
```
