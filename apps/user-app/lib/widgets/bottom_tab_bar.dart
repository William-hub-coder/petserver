import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../theme/app_text_styles.dart';

/// 5 Tab + 中间 AI FAB — 对齐设计规范 BottomTabBar
class PetBottomTabBar extends StatelessWidget {
  const PetBottomTabBar({
    super.key,
    required this.currentIndex,
    required this.onTabChanged,
    this.unreadMessageCount = 0,
  });

  final int currentIndex;
  final ValueChanged<int> onTabChanged;
  final int unreadMessageCount;

  @override
  Widget build(BuildContext context) {
    final bottom = MediaQuery.of(context).padding.bottom;
    return SizedBox(
      height: 56 + bottom,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          Positioned.fill(
            child: DecoratedBox(
              decoration: const BoxDecoration(
                color: AppColors.cardBg,
                border: Border(top: BorderSide(color: AppColors.divider, width: 0.5)),
                boxShadow: [
                  BoxShadow(
                    color: Color(0x0F000000),
                    blurRadius: 12,
                    offset: Offset(0, -2),
                  ),
                ],
              ),
              child: Padding(
                padding: EdgeInsets.only(bottom: bottom),
                child: Row(
                  children: [
                    _TabItem(
                      label: '首页',
                      selected: currentIndex == 0,
                      icon: Icons.home_outlined,
                      activeIcon: Icons.home,
                      onTap: () => onTabChanged(0),
                    ),
                    _TabItem(
                      label: '找店',
                      selected: currentIndex == 1,
                      icon: Icons.storefront_outlined,
                      activeIcon: Icons.storefront,
                      onTap: () => onTabChanged(1),
                    ),
                    const SizedBox(width: 56),
                    _TabItem(
                      label: '消息',
                      selected: currentIndex == 3,
                      icon: Icons.chat_bubble_outline,
                      activeIcon: Icons.chat_bubble,
                      badge: unreadMessageCount,
                      onTap: () => onTabChanged(3),
                    ),
                    _TabItem(
                      label: '我的',
                      selected: currentIndex == 4,
                      icon: Icons.person_outline,
                      activeIcon: Icons.person,
                      onTap: () => onTabChanged(4),
                    ),
                  ],
                ),
              ),
            ),
          ),
          Positioned(
            top: -16,
            left: 0,
            right: 0,
            child: Center(
              child: GestureDetector(
                onTap: () => onTabChanged(2),
                child: Container(
                  width: 56,
                  height: 56,
                  decoration: const BoxDecoration(
                    color: AppColors.accent,
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: Color(0x14000000),
                        blurRadius: 16,
                        offset: Offset(0, 4),
                      ),
                    ],
                  ),
                  child: const Icon(Icons.auto_awesome, color: Colors.white, size: 28),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _TabItem extends StatelessWidget {
  const _TabItem({
    required this.label,
    required this.selected,
    required this.icon,
    required this.activeIcon,
    required this.onTap,
    this.badge = 0,
  });

  final String label;
  final bool selected;
  final IconData icon;
  final IconData activeIcon;
  final VoidCallback onTap;
  final int badge;

  @override
  Widget build(BuildContext context) {
    final color = selected ? AppColors.primary : AppColors.textTertiary;
    return Expanded(
      child: InkWell(
        onTap: onTap,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Stack(
              clipBehavior: Clip.none,
              children: [
                Icon(selected ? activeIcon : icon, size: 24, color: color),
                if (badge > 0)
                  Positioned(
                    right: -10,
                    top: -4,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 4),
                      constraints: const BoxConstraints(minWidth: 16, minHeight: 16),
                      decoration: const BoxDecoration(
                        color: AppColors.danger,
                        borderRadius: BorderRadius.all(Radius.circular(999)),
                      ),
                      child: Text(
                        badge > 99 ? '99+' : '$badge',
                        textAlign: TextAlign.center,
                        style: AppTextStyles.small.copyWith(color: Colors.white, fontSize: 10),
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 2),
            Text(label, style: AppTextStyles.small.copyWith(color: color)),
          ],
        ),
      ),
    );
  }
}
