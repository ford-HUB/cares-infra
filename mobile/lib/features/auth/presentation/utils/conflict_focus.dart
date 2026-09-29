import 'package:flutter/material.dart';

/// Focuses and scrolls to the input a server conflict pointed at, once the
/// step has laid out. Safe to call before the first frame or from
/// `didUpdateWidget`.
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
