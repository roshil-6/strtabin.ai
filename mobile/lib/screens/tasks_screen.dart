import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/app_state.dart';

class TasksScreen extends StatelessWidget {
  const TasksScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            const _TasksHeader(),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  _TaskTile(
                    title: 'Task 1',
                    subtitle: 'Strategy review',
                    isDone: false,
                  ),
                  _TaskTile(
                    title: 'Task 2',
                    subtitle: 'Research phase',
                    isDone: true,
                  ),
                  _TaskTile(
                    title: 'Task 3',
                    subtitle: 'Draft outline',
                    isDone: false,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _TasksHeader extends StatelessWidget {
  const _TasksHeader();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
      child: Row(
        children: [
          IconButton(
            onPressed: () {
              context.read<AppState>().selectedNavIndex = 0;
            },
            icon: const Icon(Icons.arrow_back_rounded),
            style: IconButton.styleFrom(foregroundColor: Colors.white70),
          ),
          Expanded(
            child: Text(
              'Tasks',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.w700,
                  ),
            ),
          ),
        ],
      ),
    );
  }
}

class _TaskTile extends StatelessWidget {
  final String title;
  final String subtitle;
  final bool isDone;

  const _TaskTile({
    required this.title,
    required this.subtitle,
    required this.isDone,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF0E0E0E),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white.withOpacity(0.06)),
      ),
      child: Row(
        children: [
          Icon(
            isDone ? Icons.check_circle_rounded : Icons.radio_button_unchecked,
            color: isDone ? const Color(0xFFF97316) : Colors.white38,
            size: 24,
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        color: Colors.white,
                        decoration: isDone ? TextDecoration.lineThrough : null,
                      ),
                ),
                Text(
                  subtitle,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: Colors.white54,
                      ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
