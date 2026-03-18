import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

class FlowNode {
  final String id;
  String label;
  Offset position;
  bool isSelected;
  String type; // 'step', 'idea', 'option'

  FlowNode({
    required this.id,
    required this.label,
    required this.position,
    this.isSelected = false,
    this.type = 'step',
  });

  FlowNode copyWith({
    String? id,
    String? label,
    Offset? position,
    bool? isSelected,
    String? type,
  }) {
    return FlowNode(
      id: id ?? this.id,
      label: label ?? this.label,
      position: position ?? this.position,
      isSelected: isSelected ?? this.isSelected,
      type: type ?? this.type,
    );
  }
}

class FlowEdge {
  final String id;
  final String sourceId;
  final String targetId;

  FlowEdge({
    required this.id,
    required this.sourceId,
    required this.targetId,
  });
}

class FlowState extends ChangeNotifier {
  final List<FlowNode> _nodes = [];
  final List<FlowEdge> _edges = [];

  List<FlowNode> get nodes => List.unmodifiable(_nodes);
  List<FlowEdge> get edges => List.unmodifiable(_edges);

  FlowNode? get selectedNode =>
      _nodes.cast<FlowNode?>().firstWhere((n) => n?.isSelected ?? false, orElse: () => null);

  void addBox() {
    final newNode = FlowNode(
      id: 'step-${DateTime.now().millisecondsSinceEpoch}',
      label: 'New Workflow Step',
      position: const Offset(200, 200),
      type: 'step',
    );
    _nodes.add(newNode);
    notifyListeners();
  }

  void addOption() {
    final sel = selectedNode;
    if (sel == null) {
      return;
    }
    final time = DateTime.now().millisecondsSinceEpoch;
    final nodeA = FlowNode(
      id: 'node-$time-a',
      label: 'Option A',
      position: Offset(sel.position.dx + 180, sel.position.dy - 80),
      type: 'option',
    );
    final nodeB = FlowNode(
      id: 'node-$time-b',
      label: 'Option B',
      position: Offset(sel.position.dx + 180, sel.position.dy + 80),
      type: 'option',
    );
    _nodes.addAll([nodeA, nodeB]);
    _edges.addAll([
      FlowEdge(id: 'edge-$time-a', sourceId: sel.id, targetId: nodeA.id),
      FlowEdge(id: 'edge-$time-b', sourceId: sel.id, targetId: nodeB.id),
    ]);
    notifyListeners();
  }

  void addBranch() {
    final sel = selectedNode;
    if (sel == null) return;
    final newNode = FlowNode(
      id: 'node-${DateTime.now().millisecondsSinceEpoch}',
      label: '',
      position: Offset(sel.position.dx + 180, sel.position.dy),
      type: 'step',
    );
    _nodes.add(newNode);
    _edges.add(FlowEdge(
      id: 'edge-${DateTime.now().millisecondsSinceEpoch}',
      sourceId: sel.id,
      targetId: newNode.id,
    ));
    notifyListeners();
  }

  void addIdea() {
    final newNode = FlowNode(
      id: 'idea-${DateTime.now().millisecondsSinceEpoch}',
      label: 'New Idea',
      position: const Offset(200, 200),
      type: 'idea',
    );
    _nodes.add(newNode);
    notifyListeners();
  }

  void selectNode(String? id) {
    for (var n in _nodes) {
      n.isSelected = n.id == id;
    }
    notifyListeners();
  }

  void updateNodePosition(String id, Offset position) {
    final idx = _nodes.indexWhere((n) => n.id == id);
    if (idx >= 0) {
      _nodes[idx] = _nodes[idx].copyWith(position: position);
      notifyListeners();
    }
  }

  void updateNodeLabel(String id, String label) {
    final idx = _nodes.indexWhere((n) => n.id == id);
    if (idx >= 0) {
      _nodes[idx] = _nodes[idx].copyWith(label: label);
      notifyListeners();
    }
  }

  void deleteNode(String id) {
    _nodes.removeWhere((n) => n.id == id);
    _edges.removeWhere((e) => e.sourceId == id || e.targetId == id);
    notifyListeners();
  }
}
