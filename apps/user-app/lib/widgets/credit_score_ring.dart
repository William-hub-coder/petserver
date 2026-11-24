import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../theme/app_text_styles.dart';

class CreditScoreRing extends StatelessWidget {
  const CreditScoreRing({
    super.key,
    required this.score,
    this.size = 56,
    this.showLabel = true,
  });

  final int score;
  final double size;
  final bool showLabel;

  Color get _color {
    if (score >= 85) return AppColors.trustGreen;
    if (score >= 70) return AppColors.warning;
    if (score >= 60) return AppColors.trustGold;
    return AppColors.danger;
  }

  String get _grade {
    if (score >= 85) return '优秀';
    if (score >= 70) return '良好';
    if (score >= 60) return '一般';
    return '待改善';
  }

  @override
  Widget build(BuildContext context) {
    final stroke = size <= 56 ? 6.0 : 8.0;
    return SizedBox(
      width: size,
      height: size,
      child: CustomPaint(
        painter: _RingPainter(
          progress: score.clamp(0, 100) / 100,
          color: _color,
          stroke: stroke,
        ),
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                '$score',
                style: (size >= 80 ? AppTextStyles.h1 : AppTextStyles.bodyStrong)
                    .copyWith(fontSize: size >= 80 ? 24 : 14, height: 1),
              ),
              if (showLabel)
                Text(
                  _grade,
                  style: AppTextStyles.small.copyWith(color: _color, fontSize: 10),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _RingPainter extends CustomPainter {
  _RingPainter({required this.progress, required this.color, required this.stroke});

  final double progress;
  final Color color;
  final double stroke;

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = (size.width - stroke) / 2;
    final bg = Paint()
      ..color = AppColors.divider
      ..style = PaintingStyle.stroke
      ..strokeWidth = stroke;
    final fg = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = stroke
      ..strokeCap = StrokeCap.round;
    canvas.drawCircle(center, radius, bg);
    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      -math.pi / 2,
      2 * math.pi * progress,
      false,
      fg,
    );
  }

  @override
  bool shouldRepaint(covariant _RingPainter oldDelegate) =>
      oldDelegate.progress != progress || oldDelegate.color != color;
}
