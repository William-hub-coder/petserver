import 'package:flutter/material.dart';
import 'theme/app_theme.dart';
import 'widgets/bottom_tab_bar.dart';
import 'pages/home_page.dart';
import 'pages/merchant_list_page.dart';
import 'pages/chat_page.dart';
import 'pages/message_page.dart';
import 'pages/profile_page.dart';

void main() {
  runApp(const PetPalApp());
}

class PetPalApp extends StatelessWidget {
  const PetPalApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: '宠伴 PetPal',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      home: const MainShell(),
    );
  }
}

class MainShell extends StatefulWidget {
  const MainShell({super.key});

  @override
  State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _index,
        children: const [
          HomePage(),
          MerchantListPage(),
          ChatPage(),
          MessagePage(),
          ProfilePage(),
        ],
      ),
      bottomNavigationBar: PetBottomTabBar(
        currentIndex: _index,
        unreadMessageCount: 2,
        onTabChanged: (i) => setState(() => _index = i),
      ),
    );
  }
}
