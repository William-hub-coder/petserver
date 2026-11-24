import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import '../config.dart';
import '../theme/app_colors.dart';
import '../theme/app_radius.dart';
import '../theme/app_spacing.dart';
import '../theme/app_text_styles.dart';
import '../widgets/credit_score_ring.dart';
import '../widgets/trust_badge.dart';

class MerchantListPage extends StatefulWidget {
  const MerchantListPage({super.key});

  @override
  State<MerchantListPage> createState() => _MerchantListPageState();
}

class _MerchantListPageState extends State<MerchantListPage> {
  List<dynamic> _items = [];
  String _status = '加载中…';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final res = await http.get(Uri.parse('${AppConfig.apiBaseUrl}/merchants'));
      if (res.statusCode == 200) {
        final json = jsonDecode(res.body) as Map<String, dynamic>;
        setState(() {
          _items = (json['data'] as List<dynamic>?) ?? [];
          _status = '';
        });
      } else {
        setState(() => _status = 'HTTP ${res.statusCode}');
      }
    } catch (e) {
      setState(() {
        _status = '';
        _items = [
          {
            'name': '暖爪宠物医院（静安店）',
            'creditScore': 92,
            'distanceKm': 1.2,
            'selectedBadge': true,
          },
          {
            'name': '毛孩洗护美学馆',
            'creditScore': 86,
            'distanceKm': 0.8,
            'selectedBadge': true,
          },
        ];
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: AppColors.background,
      child: Column(
        children: [
          Container(
            width: double.infinity,
            padding: EdgeInsets.fromLTRB(
              AppSpacing.lg,
              MediaQuery.of(context).padding.top + AppSpacing.md,
              AppSpacing.lg,
              AppSpacing.md,
            ),
            decoration: const BoxDecoration(
              color: AppColors.cardBg,
              border: Border(bottom: BorderSide(color: AppColors.divider, width: 0.5)),
            ),
            child: Column(
              children: [
                const Text('找店', style: AppTextStyles.h3),
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
                      Text('搜索商家、服务', style: AppTextStyles.caption),
                    ],
                  ),
                ),
              ],
            ),
          ),
          if (_status.isNotEmpty)
            Padding(
              padding: const EdgeInsets.all(AppSpacing.lg),
              child: Text(_status, style: AppTextStyles.caption),
            ),
          Expanded(
            child: RefreshIndicator(
              color: AppColors.primary,
              onRefresh: _load,
              child: ListView.separated(
                padding: const EdgeInsets.all(AppSpacing.lg),
                itemCount: _items.length,
                separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.md),
                itemBuilder: (context, i) {
                  final m = _items[i] as Map<String, dynamic>;
                  return _MerchantTile(data: m);
                },
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _MerchantTile extends StatelessWidget {
  const _MerchantTile({required this.data});
  final Map<String, dynamic> data;

  @override
  Widget build(BuildContext context) {
    final score = (data['creditScore'] as num?)?.toInt() ?? 80;
    return Container(
      decoration: BoxDecoration(
        color: AppColors.cardBg,
        borderRadius: BorderRadius.circular(AppRadius.md),
        boxShadow: const [
          BoxShadow(color: Color(0x0F000000), blurRadius: 8, offset: Offset(0, 2)),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Stack(
            children: [
              Container(
                height: 140,
                width: double.infinity,
                decoration: const BoxDecoration(
                  gradient: LinearGradient(colors: [AppColors.primary, AppColors.info]),
                ),
              ),
              const Positioned(top: 8, right: 8, child: TrustBadge()),
              Positioned(
                right: 8,
                bottom: -28,
                child: Container(
                  padding: const EdgeInsets.all(2),
                  decoration: const BoxDecoration(
                    color: Colors.white,
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(color: Color(0x0F000000), blurRadius: 8),
                    ],
                  ),
                  child: CreditScoreRing(score: score, size: 56),
                ),
              ),
            ],
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(AppSpacing.lg, 32, AppSpacing.lg, AppSpacing.lg),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('${data['name']}', style: AppTextStyles.h3),
                const SizedBox(height: AppSpacing.sm),
                Text(
                  '📍 ${data['distanceKm'] ?? '-'} km · 实地考察认证',
                  style: AppTextStyles.caption,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
