import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/flow_state.dart';

class FlowCanvas extends StatelessWidget {
  const FlowCanvas({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<FlowState>(
      builder: (context, state, _) {
        return InteractiveViewer(
          minScale: 0.5,
          maxScale: 3.0,
          boundaryMargin: const EdgeInsets.all(500),
          child: SizedBox(
            width: 2000,
            height: 2000,
            child: CustomPaint(
              size: const Size(2000, 2000),
              painter: _FlowBackgroundPainter(),
              foregroundPainter: _FlowForegroundPainter(
                nodes: state.nodes,
                edges: state.edges,
              ),
              child: Stack(
                children: state.nodes.map((node) {
                    return _FlowNodeWidget(
                      key: ValueKey(node.id),
                      node: node,
                      onTap: () => state.selectNode(node.id),
                      onPanUpdate: (d) {
                        state.updateNodePosition(
                          node.id,
                          node.position + d,
                        );
                      },
                      onLabelChanged: (v) =>
                          state.updateNodeLabel(node.id, v),
                    );
                  }).toList(),
              ),
            ),
          ),
        );
      },
    );
  }
}

class _FlowBackgroundPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    const gap = 24.0;
    const dotSize = 1.5;
    final paint = Paint()
      ..color = Colors.white.withOpacity(0.06)
      ..style = PaintingStyle.fill;

    for (var x = 0.0; x < size.width + gap; x += gap) {
      for (var y = 0.0; y < size.height + gap; y += gap) {
        canvas.drawCircle(Offset(x, y), dotSize, paint);
      }
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class _FlowForegroundPainter extends CustomPainter {
  final List<FlowNode> nodes;
  final List<FlowEdge> edges;

  _FlowForegroundPainter({required this.nodes, required this.edges});

  FlowNode? _find(String id) {
    for (final n in nodes) {
      if (n.id == id) return n;
    }
    return null;
  }

  @override
  void paint(Canvas canvas, Size size) {
    for (final edge in edges) {
      final src = _find(edge.sourceId);
      final tgt = _find(edge.targetId);
      if (src == null || tgt == null) continue;

      const nodeW = 120.0;
      const nodeH = 48.0;
      final start = Offset(src.position.dx + nodeW / 2, src.position.dy + nodeH);
      final end = Offset(tgt.position.dx + nodeW / 2, tgt.position.dy);
      final midY = (start.dy + end.dy) / 2;
      final path = Path()
        ..moveTo(start.dx, start.dy)
        ..cubicTo(start.dx, midY, end.dx, midY, end.dx, end.dy);

      final pathPaint = Paint()
        ..color = const Color(0xFF00FF87).withOpacity(0.6)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2;

      canvas.drawPath(path, pathPaint);
    }
  }

  @override
  bool shouldRepaint(covariant _FlowForegroundPainter oldDelegate) {
    return oldDelegate.nodes != nodes || oldDelegate.edges != edges;
  }
}

class _FlowNodeWidget extends StatelessWidget {
  final FlowNode node;
  final VoidCallback onTap;
  final void Function(Offset) onPanUpdate;
  final void Function(String) onLabelChanged;

  const _FlowNodeWidget({
    super.key,
    required this.node,
    required this.onTap,
    required this.onPanUpdate,
    required this.onLabelChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Positioned(
      left: node.position.dx,
      top: node.position.dy,
      child: GestureDetector(
        onTap: onTap,
        onPanUpdate: (d) => onPanUpdate(d.delta),
        child: Container(
          width: 120,
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          decoration: BoxDecoration(
            color: node.type == 'idea'
                ? const Color(0xFFF97316).withOpacity(0.12)
                : const Color(0xFF0E0E0E),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: node.isSelected
                  ? const Color(0xFFF97316)
                  : Colors.white.withOpacity(0.1),
              width: node.isSelected ? 2 : 1,
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.3),
                blurRadius: 12,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Text(
            node.label.isEmpty ? '...' : node.label,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Colors.white,
                  fontSize: 13,
                ),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ),
    );
  }
}
