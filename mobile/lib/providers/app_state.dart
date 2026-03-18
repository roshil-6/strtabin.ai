import 'package:flutter/foundation.dart';

class AppState extends ChangeNotifier {
  int _selectedNavIndex = 0;
  int get selectedNavIndex => _selectedNavIndex;
  set selectedNavIndex(int v) {
    if (_selectedNavIndex != v) {
      _selectedNavIndex = v;
      notifyListeners();
    }
  }

  String? _currentProjectId;
  String? get currentProjectId => _currentProjectId;
  set currentProjectId(String? v) {
    _currentProjectId = v;
    notifyListeners();
  }

  String? _currentFolderId;
  String? get currentFolderId => _currentFolderId;
  set currentFolderId(String? v) {
    _currentFolderId = v;
    notifyListeners();
  }
}
