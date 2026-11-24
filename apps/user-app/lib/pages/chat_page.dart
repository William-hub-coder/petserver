import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import '../config.dart';
import '../theme/app_colors.dart';
import '../theme/app_radius.dart';
import '../theme/app_spacing.dart';
import '../theme/app_text_styles.dart';

class ChatPage extends StatefulWidget {
  const ChatPage({super.key});

  @override
  State<ChatPage> createState() => _ChatPageState();
}

class _ChatPageState extends State<ChatPage> {
  final _controller = TextEditingController();
  final _messages = <_Msg>[
    const _Msg(
      text: '你好，我是宠伴智能客服。可以帮你找严选商家、答养宠问题。',
      isUser: false,
    ),
  ];
  bool _sending = false;

  Future<void> _send() async {
    final text = _controller.text.trim();
    if (text.isEmpty || _sending) return;
    setState(() {
      _messages.add(_Msg(text: text, isUser: true));
      _sending = true;
      _controller.clear();
    });
    try {
      final res = await http.post(
        Uri.parse('${AppConfig.apiBaseUrl}/agent/chat'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'message': text}),
      );
      if (res.statusCode == 200) {
        final json = jsonDecode(res.body) as Map<String, dynamic>;
        final data = json['data'] as Map<String, dynamic>? ?? {};
        setState(() {
          _messages.add(_Msg(text: '${data['reply'] ?? '无回复'}', isUser: false));
        });
      } else {
        setState(() {
          _messages.add(const _Msg(text: '服务异常，已降级人工排队占位。', isUser: false));
        });
      }
    } catch (_) {
      setState(() {
        _messages.add(const _Msg(text: '网络异常，请稍后重试。', isUser: false));
      });
    } finally {
      setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          width: double.infinity,
          padding: EdgeInsets.fromLTRB(
            AppSpacing.lg,
            MediaQuery.of(context).padding.top + AppSpacing.md,
            AppSpacing.lg,
            AppSpacing.md,
          ),
          color: AppColors.cardBg,
          child: const Column(
            children: [
              Text('AI 助手', style: AppTextStyles.h3),
              SizedBox(height: 4),
              Text('每一家店，我们都替你看过。', style: AppTextStyles.small),
            ],
          ),
        ),
        Container(
          width: double.infinity,
          color: AppColors.accentLight,
          padding: const EdgeInsets.symmetric(vertical: 6),
          child: Text(
            '内容由 AI 生成，仅供参考',
            textAlign: TextAlign.center,
            style: AppTextStyles.small.copyWith(color: AppColors.accent),
          ),
        ),
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.all(AppSpacing.lg),
            itemCount: _messages.length,
            itemBuilder: (context, i) {
              final m = _messages[i];
              return Align(
                alignment: m.isUser ? Alignment.centerRight : Alignment.centerLeft,
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 280),
                  child: Column(
                    crossAxisAlignment:
                        m.isUser ? CrossAxisAlignment.end : CrossAxisAlignment.start,
                    children: [
                      if (!m.isUser)
                        Container(
                          margin: const EdgeInsets.only(bottom: 4),
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: AppColors.accentLight,
                            borderRadius: BorderRadius.circular(AppRadius.full),
                          ),
                          child: Text(
                            'AI 生成',
                            style: AppTextStyles.small.copyWith(color: AppColors.accent),
                          ),
                        ),
                      Container(
                        margin: const EdgeInsets.only(bottom: AppSpacing.md),
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        decoration: BoxDecoration(
                          color: m.isUser ? AppColors.primary : AppColors.cardBg,
                          borderRadius: BorderRadius.only(
                            topLeft: Radius.circular(m.isUser ? AppRadius.lg : AppRadius.sm),
                            topRight: Radius.circular(m.isUser ? AppRadius.sm : AppRadius.lg),
                            bottomLeft: const Radius.circular(AppRadius.lg),
                            bottomRight: const Radius.circular(AppRadius.lg),
                          ),
                          boxShadow: const [
                            BoxShadow(color: Color(0x0F000000), blurRadius: 8, offset: Offset(0, 2)),
                          ],
                        ),
                        child: Text(
                          m.text,
                          style: AppTextStyles.body.copyWith(
                            color: m.isUser ? Colors.white : AppColors.textPrimary,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
        SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(AppSpacing.lg, 0, AppSpacing.lg, AppSpacing.sm),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _controller,
                    decoration: InputDecoration(
                      hintText: '问问附近医院、洗护、寄养…',
                      hintStyle: AppTextStyles.caption,
                      filled: true,
                      fillColor: AppColors.cardBg,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(AppRadius.full),
                        borderSide: const BorderSide(color: AppColors.border),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(AppRadius.full),
                        borderSide: const BorderSide(color: AppColors.primary),
                      ),
                    ),
                    onSubmitted: (_) => _send(),
                  ),
                ),
                const SizedBox(width: AppSpacing.sm),
                FilledButton(
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.accent,
                    shape: const CircleBorder(),
                    padding: const EdgeInsets.all(12),
                  ),
                  onPressed: _sending ? null : _send,
                  child: const Icon(Icons.send, size: 20),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _Msg {
  const _Msg({required this.text, required this.isUser});
  final String text;
  final bool isUser;
}
