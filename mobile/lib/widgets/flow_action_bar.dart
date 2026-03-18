import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/flow_state.dart';

class FlowActionBar extends StatelessWidget {
  const FlowActionBar({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: const Color(0xFF0A0A0A),
        border: Border(
          top: BorderSide(color: Colors.white.withOpacity(0.06)),
        ),
      ),
      child: SafeArea(
        top: false,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
          children: [
            _ActionButton(
              icon: Icons.add_box_rounded,
              label: 'Add Box',
              onTap: () => context.read<FlowState>().addBox(),
            ),
            _ActionButton(
              icon: Icons.account_tree_rounded,
              label: 'Branch',
              onTap: () => context.read<FlowState>().addBranch(),
            ),
            _ActionButton(
              icon: Icons.call_split_rounded,
              label: 'Option',
              onTap: () {
                final state = context.read<FlowState>();
                if (state.selectedNode == null) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Select a node first to add options'),
                      behavior: SnackBarBehavior.floating,
                    ),
                  );
                  return;
                }
                state.addOption();
              },
            ),
            _ActionButton(
              icon: Icons.lightbulb_outline_rounded,
              label: 'Idea',
              onTap: () => context.read<FlowState>().addIdea(),
            ),
          ],
        ),
      ),
    );
  }
}

class _ActionButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _ActionButton({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 22, color: const Color(0xFFF97316)),
              const SizedBox(height: 4),
              Text(
                label,
                style: const TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w600,
                  color: Colors.white70,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
