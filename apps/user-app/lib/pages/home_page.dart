import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../theme/app_radius.dart';
import '../theme/app_spacing.dart';
import '../theme/app_text_styles.dart';
import '../widgets/credit_score_ring.dart';
import '../widgets/trust_badge.dart';

class HomePage extends StatelessWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: AppColors.background,
      child: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(
            child: Container(
              padding: EdgeInsets.fromLTRB(
                AppSpacing.lg,
                MediaQuery.of(context).padding.top + AppSpacing.md,
                AppSpacing.lg,
                AppSpacing.md,
              ),
              decoration: const BoxDecoration(
                color: AppColors.cardBg,
                boxShadow: [
                  BoxShadow(color: Color(0x0A000000), blurRadius: 8, offset: Offset(0, 2)),
                ],
              ),
              child: Column(
                children: [
                  Row(
                    children: [
                      const Icon(Icons.location_on, size: 20, color: AppColors.primary),
                      const SizedBox(width: AppSpacing.xs),
                      const Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('上海', style: AppTextStyles.bodyStrong),
                          Text('当前所在城市', style: AppTextStyles.small),
                        ],
                      ),
                      const Icon(Icons.arrow_drop_down, color: AppColors.textTertiary),
                      const Spacer(),
                      IconButton(
                        onPressed: () {},
                        icon: const Icon(Icons.search, color: AppColors.textPrimary),
                      ),
                      IconButton(
                        onPressed: () {},
                        icon: const Badge(
                          smallSize: 8,
                          child: Icon(Icons.notifications_none, color: AppColors.textPrimary),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.md),
                  Container(
                    height: 40,
                    padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
                    decoration: BoxDecoration(
                      color: AppColors.background,
                      borderRadius: BorderRadius.circular(AppRadius.full),
                    ),
                    child: const Row(
                      children: [
                        Icon(Icons.search, size: 20, color: AppColors.textTertiary),
                        SizedBox(width: AppSpacing.sm),
                        Text('搜索商户、服务、宠物用品…', style: AppTextStyles.caption),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          SliverToBoxAdapter(
            child: Container(
              margin: const EdgeInsets.all(AppSpacing.lg),
              height: 140,
              padding: const EdgeInsets.all(AppSpacing.lg),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(AppRadius.lg),
                gradient: const LinearGradient(
                  colors: [AppColors.primary, AppColors.primaryDark],
                ),
              ),
              child: const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    '每一家店，我们都替你看过。',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w600,
                      color: Colors.white,
                    ),
                  ),
                  SizedBox(height: AppSpacing.sm),
                  Text(
                    '宠伴严选 · 实地认证商家',
                    style: TextStyle(fontSize: 13, color: Color(0xD9FFFFFF)),
                  ),
                ],
              ),
            ),
          ),
          SliverToBoxAdapter(
            child: Container(
              margin: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
              padding: const EdgeInsets.symmetric(
                vertical: AppSpacing.lg,
                horizontal: AppSpacing.md,
              ),
              decoration: BoxDecoration(
                color: AppColors.cardBg,
                borderRadius: BorderRadius.circular(AppRadius.lg),
                boxShadow: const [
                  BoxShadow(color: Color(0x0F000000), blurRadius: 8, offset: Offset(0, 2)),
                ],
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: const [
                  _Quick('洗护美容', Icons.content_cut, AppColors.accent),
                  _Quick('宠物医疗', Icons.medical_services, AppColors.info),
                  _Quick('宠物寄养', Icons.home_work, AppColors.trustGreen),
                  _Quick('训练培训', Icons.school, AppColors.trustGold),
                  _Quick('严选商品', Icons.shopping_bag, Color(0xFF9C6ADE)),
                ],
              ),
            ),
          ),
          SliverToBoxAdapter(
            child: Container(
              margin: const EdgeInsets.all(AppSpacing.lg),
              height: 72,
              decoration: BoxDecoration(
                color: AppColors.primaryLight,
                borderRadius: BorderRadius.circular(AppRadius.md),
                border: Border.all(color: AppColors.primary, style: BorderStyle.solid),
              ),
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.add_circle, color: AppColors.primary, size: 28),
                  SizedBox(width: AppSpacing.sm),
                  Text('添加宠物档案，获取专属推荐', style: TextStyle(color: AppColors.primary, fontSize: 13)),
                ],
              ),
            ),
          ),
          const SliverToBoxAdapter(
            child: Padding(
              padding: EdgeInsets.symmetric(horizontal: AppSpacing.lg),
              child: Row(
                children: [
                  Icon(Icons.verified, size: 20, color: AppColors.trustGold),
                  SizedBox(width: AppSpacing.sm),
                  Text('严选推荐', style: AppTextStyles.h2),
                ],
              ),
            ),
          ),
          SliverToBoxAdapter(
            child: SizedBox(
              height: 220,
              child: ListView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.all(AppSpacing.lg),
                children: const [
                  _RecoCard(name: '暖爪宠物医院', score: 92, rating: 4.9),
                  SizedBox(width: AppSpacing.md),
                  _RecoCard(name: '毛孩洗护美学馆', score: 86, rating: 4.7),
                ],
              ),
            ),
          ),
          const SliverToBoxAdapter(child: SizedBox(height: 80)),
        ],
      ),
    );
  }
}

class _Quick extends StatelessWidget {
  const _Quick(this.label, this.icon, this.color);
  final String label;
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            color: color.withOpacity(0.12),
            borderRadius: BorderRadius.circular(AppRadius.md),
          ),
          child: Icon(icon, size: 24, color: color),
        ),
        const SizedBox(height: AppSpacing.xs),
        Text(label, style: AppTextStyles.small.copyWith(color: AppColors.textPrimary)),
      ],
    );
  }
}

class _RecoCard extends StatelessWidget {
  const _RecoCard({required this.name, required this.score, required this.rating});
  final String name;
  final int score;
  final double rating;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 260,
      decoration: BoxDecoration(
        color: AppColors.cardBg,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        boxShadow: const [
          BoxShadow(color: Color(0x0F000000), blurRadius: 8, offset: Offset(0, 2)),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            height: 120,
            width: double.infinity,
            decoration: const BoxDecoration(
              gradient: LinearGradient(colors: [AppColors.primary, AppColors.info]),
            ),
            padding: const EdgeInsets.all(AppSpacing.sm),
            alignment: Alignment.topLeft,
            child: const TrustBadge(),
          ),
          Padding(
            padding: const EdgeInsets.all(AppSpacing.md),
            child: Row(
              children: [
                Expanded(child: Text(name, style: AppTextStyles.h3, maxLines: 1, overflow: TextOverflow.ellipsis)),
                CreditScoreRing(score: score, size: 40, showLabel: false),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
            child: Text('★ $rating · 严选认证', style: AppTextStyles.caption),
          ),
        ],
      ),
    );
  }
}
