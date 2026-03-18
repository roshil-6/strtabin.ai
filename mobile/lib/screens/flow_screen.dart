import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/app_state.dart';
import '../providers/flow_state.dart';
import '../widgets/flow_canvas.dart';
import '../widgets/flow_action_bar.dart';

class FlowScreen extends StatelessWidget {
  const FlowScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => FlowState(),
      child: const _FlowScreenContent(),
    );
  }
}

class _FlowScreenContent extends StatelessWidget {
  const _FlowScreenContent();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            const _FlowHeader(),
            const Expanded(child: FlowCanvas()),
            const FlowActionBar(),
          ],
        ),
      ),
    );
  }
}

class _FlowHeader extends StatelessWidget {
  const _FlowHeader();

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
            style: IconButton.styleFrom(
              foregroundColor: Colors.white70,
            ),
          ),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _getTitle(context),
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        color: Colors.white,
                        fontWeight: FontWeight.w700,
                      ),
                ),
                Text(
                  'Workflow Map',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: Colors.white38,
                        fontSize: 11,
                      ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  String _getTitle(BuildContext context) {
    final folderId = context.watch<AppState>().currentFolderId;
    if (folderId == null || folderId == 'general') {
      return 'General Projects';
    }
    return 'Folder';
  }
}
