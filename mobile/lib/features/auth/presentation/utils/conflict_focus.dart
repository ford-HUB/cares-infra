import 'package:flutter/material.dart';

/// Waits for layout; safe before the first frame or from `didUpdateWidget`.
void focusConflictField(State state, FocusNode node) {
  WidgetsBinding.instance.addPostFrameCallback((_) {
    if (!state.mounted) return;
    node.requestFocus();
    final context = node.context;
    if (context != null) {
      Scrollable.ensureVisible(
        context,
        alignment: 0.2,
        duration: const Duration(milliseconds: 300),
      );
    }
  });
}
