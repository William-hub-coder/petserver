# 宠伴 H5 · 温暖严选 UI 映射

> 设计指导方案 v1.0（Expo/RN）→ 本仓库 `apps/user-web` 落地说明

| 设计层 | H5 代码位置 |
|--------|-------------|
| 颜色/阴影/圆角令牌 | `packages/design-tokens/tokens.css` |
| 全局卡片/按钮/标签/按压 | `apps/user-web/src/styles/app.css` |
| TrustBadge / CreditScoreRing / MerchantCard | `apps/user-web/src/components/*` |
| AI FAB + Tab | `BottomTabBar.vue` |
| 商户实拍封面 | `lib/merchant-cover.ts`（按品类映射 Unsplash） |

**已保留的产品结构**：首页五宫格、医疗 Hub、上门寄养 Hub、商城、地图/定位、配送与上门轨迹、AI、消息、订单——统一到亮色「温暖严选」视觉，不改业务流。
