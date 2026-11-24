import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../theme/app_radius.dart';
import '../theme/app_spacing.dart';
import '../theme/app_text_styles.dart';

class ProfilePage extends StatelessWidget {
  const ProfilePage({super.key});

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: AppColors.background,
      child: ListView(
        padding: EdgeInsets.zero,
        children: [
          Container(
            padding: EdgeInsets.fromLTRB(
              AppSpacing.lg,
              MediaQuery.of(context).padding.top + AppSpacing.xxl,
              AppSpacing.lg,
              AppSpacing.xxl,
            ),
            decoration: const BoxDecoration(
              gradient: LinearGradient(colors: [AppColors.primary, AppColors.primaryDark]),
            ),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 32,
                  backgroundColor: Colors.white.withOpacity(0.2),
                  child: const Text('宠', style: TextStyle(color: Colors.white, fontSize: 24)),
                ),
                const SizedBox(width: AppSpacing.md),
                const Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('宠伴用户', style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w600)),
                    SizedBox(height: 4),
                    Text('每一家店，我们都替你看过。', style: TextStyle(color: Color(0xD9FFFFFF), fontSize: 13)),
                  ],
                ),
              ],
            ),
          ),
          Container(
            margin: const EdgeInsets.all(AppSpacing.lg),
            padding: const EdgeInsets.all(AppSpacing.lg),
            decoration: BoxDecoration(
              color: AppColors.cardBg,
              borderRadius: BorderRadius.circular(AppRadius.md),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('我的宠物', style: AppTextStyles.h3),
                const SizedBox(height: AppSpacing.md),
                Container(
                  height: 72,
                  decoration: BoxDecoration(
                    color: AppColors.primaryLight,
                    borderRadius: BorderRadius.circular(AppRadius.md),
                    border: Border.all(color: AppColors.primary),
                  ),
                  child: const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.add, color: AppColors.primary),
                      SizedBox(width: 8),
                      Text('添加第一只宠物', style: TextStyle(color: AppColors.primary, fontSize: 13)),
                    ],
                  ),
                ),
              ],
            ),
          ),
          ...['我的订单', '我的预约', '收藏的严选店', '隐私与个性化', '消息偏好']
              .map(
                (e) => Container(
                  margin: const EdgeInsets.fromLTRB(AppSpacing.lg, 0, AppSpacing.lg, AppSpacing.md),
                  decoration: BoxDecoration(
                    color: AppColors.cardBg,
                    borderRadius: BorderRadius.circular(AppRadius.md),
                  ),
                  child: ListTile(
                    title: Text(e, style: AppTextStyles.body),
                    trailing: const Icon(Icons.chevron_right, color: AppColors.textTertiary),
                  ),
                ),
              ),
        ],
      ),
    );
  }
}
