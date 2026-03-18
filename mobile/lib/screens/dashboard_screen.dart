import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/app_state.dart';
import '../widgets/project_card.dart';

class DashboardScreen extends StatelessWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: CustomScrollView(
          slivers: [
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 24, 20, 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Stratabin',
                      style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                            color: Colors.white,
                            fontSize: 28,
                          ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Strategy Workspace',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: Colors.white54,
                            fontSize: 14,
                          ),
                    ),
                  ],
                ),
              ),
            ),
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: _FolderSection(
                  title: 'General Projects',
                  folderId: 'general',
                ),
              ),
            ),
            const SliverToBoxAdapter(child: SizedBox(height: 24)),
          ],
        ),
      ),
    );
  }
}

class _FolderSection extends StatelessWidget {
  final String title;
  final String folderId;

  const _FolderSection({
    required this.title,
    required this.folderId,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              title,
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.w700,
                  ),
            ),
            TextButton.icon(
              onPressed: () {
                context.read<AppState>().currentFolderId = folderId;
                context.read<AppState>().selectedNavIndex = 1;
              },
              icon: const Icon(Icons.account_tree_rounded, size: 18),
              label: const Text('Map'),
              style: TextButton.styleFrom(
                foregroundColor: const Color(0xFFF97316),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        SizedBox(
          height: 140,
          child: ListView(
            scrollDirection: Axis.horizontal,
            children: List.generate(10, (i) {
              return Padding(
                padding: EdgeInsets.only(right: i < 9 ? 12 : 0),
                child: ProjectCard(
                  title: 'Project ${i + 1}',
                  onTap: () {
                    context.read<AppState>().currentProjectId = 'proj-$i';
                    context.read<AppState>().selectedNavIndex = 2;
                  },
                ),
              );
            }),
          ),
        ),
      ],
    );
  }
}
