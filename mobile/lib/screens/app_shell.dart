import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/app_state.dart';
import 'dashboard_screen.dart';
import 'flow_screen.dart';
import 'write_screen.dart';
import 'tasks_screen.dart';
import 'strab_screen.dart';

class AppShell extends StatelessWidget {
  const AppShell({super.key});

  static const List<_NavItem> _navItems = [
    _NavItem(icon: Icons.home_rounded, label: 'Home'),
    _NavItem(icon: Icons.account_tree_rounded, label: 'Flow'),
    _NavItem(icon: Icons.edit_note_rounded, label: 'Write'),
    _NavItem(icon: Icons.check_circle_outline_rounded, label: 'Tasks'),
    _NavItem(icon: Icons.smart_toy_rounded, label: 'STRAB'),
  ];

  @override
  Widget build(BuildContext context) {
    return Consumer<AppState>(
      builder: (context, state, _) {
        return Scaffold(
          body: IndexedStack(
            index: state.selectedNavIndex,
            children: [
              const DashboardScreen(),
              const FlowScreen(),
              const WriteScreen(),
              const TasksScreen(),
              const StrabScreen(),
            ],
          ),
          bottomNavigationBar: _MobileBottomNav(
            items: _navItems,
            currentIndex: state.selectedNavIndex,
            onTap: (i) => state.selectedNavIndex = i,
          ),
        );
      },
    );
  }
}

class _NavItem {
  final IconData icon;
  final String label;
  const _NavItem({required this.icon, required this.label});
}

class _MobileBottomNav extends StatelessWidget {
  final List<_NavItem> items;
  final int currentIndex;
  final ValueChanged<int> onTap;

  const _MobileBottomNav({
    required this.items,
    required this.currentIndex,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF0E0E0E),
        border: Border(
          top: BorderSide(color: Colors.white.withOpacity(0.06)),
        ),
      ),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: List.generate(items.length, (i) {
              final item = items[i];
              final selected = i == currentIndex;
              return Expanded(
                child: Material(
                  color: Colors.transparent,
                  child: InkWell(
                    onTap: () => onTap(i),
                    borderRadius: BorderRadius.circular(12),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            item.icon,
                            size: 24,
                            color: selected
                                ? const Color(0xFFF97316)
                                : Colors.white54,
                          ),
                          const SizedBox(height: 4),
                          Text(
                            item.label,
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight:
                                  selected ? FontWeight.w600 : FontWeight.w500,
                              color: selected
                                  ? const Color(0xFFF97316)
                                  : Colors.white54,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              );
            }),
          ),
        ),
      ),
    );
  }
}
