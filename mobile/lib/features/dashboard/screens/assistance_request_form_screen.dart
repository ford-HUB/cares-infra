import 'package:flutter/material.dart';

import '../../../core/theme/app_theme.dart';
import '../data/assistance_request_data.dart';

/// Static "Request Assistance" form. Submitting files a mock request into the
/// in-memory store — no backend call in the prototype.
class AssistanceRequestFormScreen extends StatefulWidget {
  const AssistanceRequestFormScreen({super.key});

  /// Returns the created request when one was filed.
  static Future<AssistanceRequest?> open(BuildContext context) {
    return Navigator.of(context).push<AssistanceRequest>(
      MaterialPageRoute<AssistanceRequest>(
        builder: (_) => const AssistanceRequestFormScreen(),
      ),
    );
  }

  @override
  State<AssistanceRequestFormScreen> createState() =>
      _AssistanceRequestFormScreenState();
}

class _AssistanceRequestFormScreenState
    extends State<AssistanceRequestFormScreen> {
  final _store = AssistanceRequestStore.instance;
  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _householdController = TextEditingController(text: '5');

  String _category = kAssistanceCategories.first;
  String _urgency = 'Normal';
  bool _isSubmitting = false;

  bool get _canSubmit =>
      _titleController.text.trim().isNotEmpty &&
      _descriptionController.text.trim().isNotEmpty;

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    _householdController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_canSubmit || _isSubmitting) return;

    setState(() => _isSubmitting = true);

    // Mock submission delay — no backend call in the prototype.
    await Future<void>.delayed(const Duration(milliseconds: 400));
    if (!mounted) return;

    final request = _store.submit(
      title: _titleController.text.trim(),
      category: _category,
      description: _descriptionController.text.trim(),
      urgency: _urgency,
      householdSize: int.tryParse(_householdController.text.trim()) ?? 1,
    );

    setState(() => _isSubmitting = false);

    await showRequestSubmittedDialog(context, request);
    if (!mounted) return;
    Navigator.of(context).pop(request);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Request Assistance'),
        centerTitle: true,
        backgroundColor: AppColors.background,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView(
              keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
              children: [
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(
                      color: AppColors.primary.withValues(alpha: 0.2),
                    ),
                  ),
                  child: const Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Icon(
                        Icons.info_outline_rounded,
                        size: 18,
                        color: AppColors.primary,
                      ),
                      SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          'Tell us what your household needs. A field officer '
                          'reviews every request and may schedule a needs '
                          'assessment visit.',
                          style: TextStyle(
                            fontSize: 12.5,
                            height: 1.45,
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
                const _FieldLabel('What do you need?'),
                const SizedBox(height: 8),
                TextField(
                  controller: _titleController,
                  textCapitalization: TextCapitalization.sentences,
                  onChanged: (_) => setState(() {}),
                  decoration: _inputDecoration(
                    'e.g. Monthly food pack for household',
                  ),
                ),
                const SizedBox(height: 18),
                const _FieldLabel('Assistance category'),
                const SizedBox(height: 8),
                DropdownButtonFormField<String>(
                  initialValue: _category,
                  decoration: _inputDecoration(''),
                  items: kAssistanceCategories
                      .map(
                        (category) => DropdownMenuItem(
                          value: category,
                          child: Text(category),
                        ),
                      )
                      .toList(),
                  onChanged: (value) =>
                      setState(() => _category = value ?? _category),
                ),
                const SizedBox(height: 18),
                const _FieldLabel('Urgency'),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: kAssistanceUrgencyLevels.map((level) {
                    final selected = level == _urgency;
                    return ChoiceChip(
                      label: Text(level),
                      selected: selected,
                      onSelected: (_) => setState(() => _urgency = level),
                      selectedColor: AppColors.primary,
                      backgroundColor: AppColors.surface,
                      side: BorderSide(
                        color: selected
                            ? AppColors.primary
                            : AppColors.inputFill,
                      ),
                      labelStyle: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: selected
                            ? Colors.white
                            : AppColors.textSecondary,
                      ),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 18),
                const _FieldLabel('Household size'),
                const SizedBox(height: 8),
                TextField(
                  controller: _householdController,
                  keyboardType: TextInputType.number,
                  decoration: _inputDecoration('Number of members'),
                ),
                const SizedBox(height: 18),
                const _FieldLabel('Describe your situation'),
                const SizedBox(height: 8),
                TextField(
                  controller: _descriptionController,
                  maxLines: 5,
                  maxLength: 500,
                  textCapitalization: TextCapitalization.sentences,
                  onChanged: (_) => setState(() {}),
                  decoration: _inputDecoration(
                    'Share details that help the relief desk understand your '
                    'needs...',
                  ),
                ),
              ],
            ),
          ),
          SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 4, 20, 16),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (!_canSubmit)
                    const Padding(
                      padding: EdgeInsets.only(bottom: 10),
                      child: Text(
                        'Add a title and a description to submit your request.',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 12,
                          color: AppColors.textMuted,
                        ),
                      ),
                    ),
                  FilledButton.icon(
                    onPressed: _canSubmit && !_isSubmitting ? _submit : null,
                    icon: _isSubmitting
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : const Icon(Icons.send_rounded),
                    label: Text(
                      _isSubmitting ? 'Submitting...' : 'Submit Request',
                    ),
                    style: FilledButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      minimumSize: const Size.fromHeight(52),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  InputDecoration _inputDecoration(String hint) {
    return InputDecoration(
      hintText: hint.isEmpty ? null : hint,
      filled: true,
      fillColor: AppColors.surface,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: AppColors.inputFill),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: AppColors.inputFill),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: AppColors.primary),
      ),
    );
  }
}

class _FieldLabel extends StatelessWidget {
  const _FieldLabel(this.label);

  final String label;

  @override
  Widget build(BuildContext context) {
    return Text(
      label,
      style: const TextStyle(
        fontSize: 14.5,
        fontWeight: FontWeight.w700,
        color: AppColors.textPrimary,
      ),
    );
  }
}

/// Confirmation shown after a request is filed.
Future<void> showRequestSubmittedDialog(
  BuildContext context,
  AssistanceRequest request,
) {
  return showDialog<void>(
    context: context,
    barrierDismissible: false,
    builder: (ctx) => Dialog(
      backgroundColor: AppColors.surface,
      insetPadding: const EdgeInsets.symmetric(horizontal: 28),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(24, 28, 24, 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.12),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.assignment_turned_in_rounded,
                size: 32,
                color: AppColors.primary,
              ),
            ),
            const SizedBox(height: 20),
            const Text(
              'Request submitted',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w800,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              'Your request is now pending review. Reference number '
              '${request.referenceNumber}.',
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 14,
                height: 1.55,
                color: AppColors.textSecondary,
              ),
            ),
            const SizedBox(height: 22),
            FilledButton(
              onPressed: () => Navigator.of(ctx).pop(),
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.primary,
                minimumSize: const Size.fromHeight(48),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: const Text('Done'),
            ),
          ],
        ),
      ),
    ),
  );
}
