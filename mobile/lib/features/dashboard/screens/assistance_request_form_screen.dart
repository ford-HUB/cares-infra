import 'dart:io';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/utils/media_permissions.dart';
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
  final _otherNeedController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _householdController = TextEditingController(text: '5');
  final _attachments = <RequestAttachment>[];

  static const _maxAttachments = 3;
  static const _allowedExtensions = ['pdf', 'jpg', 'jpeg', 'png', 'webp'];

  String? _need;
  String _category = kAssistanceCategories.first;
  String _urgency = 'Normal';
  bool _isSubmitting = false;

  bool get _isOtherNeed => _need == kOtherOption;

  /// The request title: the chosen need, or what was typed under "Other".
  String get _title =>
      _isOtherNeed ? _otherNeedController.text.trim() : (_need ?? '');

  bool get _canSubmit =>
      _title.isNotEmpty && _descriptionController.text.trim().isNotEmpty;

  @override
  void dispose() {
    _otherNeedController.dispose();
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
      title: _title,
      category: _category,
      description: _descriptionController.text.trim(),
      urgency: _urgency,
      householdSize: int.tryParse(_householdController.text.trim()) ?? 1,
      attachments: List.unmodifiable(_attachments),
    );

    setState(() => _isSubmitting = false);

    await showRequestSubmittedDialog(context, request);
    if (!mounted) return;
    Navigator.of(context).pop(request);
  }

  bool get _canAddAttachment => _attachments.length < _maxAttachments;

  void _showMessage(String message) {
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(message)));
  }

  void _addAttachment(RequestAttachment attachment) {
    if (!_canAddAttachment) {
      _showMessage('You can attach up to $_maxAttachments files.');
      return;
    }
    setState(() => _attachments.add(attachment));
  }

  Future<void> _pickProofPhoto() async {
    final permission = await MediaPermissions.ensureCamera();
    if (!mounted) return;
    if (!permission.isGranted) {
      _showMessage(permission.message ?? 'Camera permission is required.');
      return;
    }

    try {
      final file = await ImagePicker().pickImage(
        source: ImageSource.camera,
        imageQuality: 85,
      );
      if (file == null || !mounted) return;
      final size = await File(file.path).length();
      if (!mounted) return;
      _addAttachment(
        RequestAttachment(name: file.name, path: file.path, sizeBytes: size),
      );
    } catch (_) {
      if (mounted) _showMessage('Could not open the camera.');
    }
  }

  Future<void> _pickProofFile() async {
    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: _allowedExtensions,
        withData: false,
      );
      final file = result?.files.single;
      final path = file?.path;
      if (file == null || path == null || !mounted) return;
      _addAttachment(
        RequestAttachment(name: file.name, path: path, sizeBytes: file.size),
      );
    } catch (_) {
      if (mounted) _showMessage('Could not open the file picker.');
    }
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
                DropdownButtonFormField<String>(
                  initialValue: _need,
                  isExpanded: true,
                  hint: const Text(
                    'Select what you need',
                    style: TextStyle(color: AppColors.textMuted),
                  ),
                  decoration: _inputDecoration(''),
                  items: kAssistanceNeedOptions
                      .map(
                        (need) =>
                            DropdownMenuItem(value: need, child: Text(need)),
                      )
                      .toList(),
                  onChanged: (value) => setState(() => _need = value),
                ),
                if (_isOtherNeed) ...[
                  const SizedBox(height: 10),
                  TextField(
                    controller: _otherNeedController,
                    autofocus: true,
                    textCapitalization: TextCapitalization.sentences,
                    onChanged: (_) => setState(() {}),
                    decoration: _inputDecoration(
                      'Please specify what you need',
                    ),
                  ),
                ],
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
                const SizedBox(height: 10),
                const _FieldLabel('Proof / supporting documents'),
                const SizedBox(height: 4),
                const Text(
                  'Optional. Attach an ID, bill, medical certificate, or a '
                  'photo that supports your request (PDF or image, up to '
                  '$_maxAttachments files).',
                  style: TextStyle(
                    fontSize: 12,
                    height: 1.4,
                    color: AppColors.textMuted,
                  ),
                ),
                const SizedBox(height: 10),
                for (var i = 0; i < _attachments.length; i++)
                  _AttachmentTile(
                    attachment: _attachments[i],
                    onRemove: () => setState(() => _attachments.removeAt(i)),
                  ),
                if (_canAddAttachment)
                  Row(
                    children: [
                      Expanded(
                        child: _AttachmentButton(
                          icon: Icons.photo_camera_outlined,
                          label: 'Take photo',
                          onTap: _pickProofPhoto,
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: _AttachmentButton(
                          icon: Icons.upload_file_outlined,
                          label: 'Choose file',
                          onTap: _pickProofFile,
                        ),
                      ),
                    ],
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
                        'Choose what you need and describe your situation to '
                        'submit your request.',
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

/// Dashed-border action used to add a proof document.
class _AttachmentButton extends StatelessWidget {
  const _AttachmentButton({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.fieldFill,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.borderActive, width: 1.2),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 18, color: AppColors.primaryDark),
              const SizedBox(width: 8),
              Text(
                label,
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: AppColors.primaryDark,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// One attached proof document with a thumbnail (for images) or file icon.
class _AttachmentTile extends StatelessWidget {
  const _AttachmentTile({required this.attachment, required this.onRemove});

  final RequestAttachment attachment;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.fromLTRB(10, 8, 4, 8),
      decoration: AppDecorations.surfaceCard(radius: 12),
      child: Row(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: SizedBox(
              width: 44,
              height: 44,
              child: attachment.isImage
                  ? Image.file(
                      File(attachment.path),
                      fit: BoxFit.cover,
                      errorBuilder: (_, _, _) => const _FileIcon(),
                    )
                  : const _FileIcon(),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  attachment.name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  [
                    attachment.extension.toUpperCase(),
                    if (attachment.sizeLabel.isNotEmpty) attachment.sizeLabel,
                  ].join(' · '),
                  style: const TextStyle(
                    fontSize: 11.5,
                    color: AppColors.textMuted,
                  ),
                ),
              ],
            ),
          ),
          IconButton(
            onPressed: onRemove,
            tooltip: 'Remove',
            icon: const Icon(
              Icons.close_rounded,
              size: 20,
              color: AppColors.textMuted,
            ),
          ),
        ],
      ),
    );
  }
}

class _FileIcon extends StatelessWidget {
  const _FileIcon();

  @override
  Widget build(BuildContext context) {
    return Container(
      color: AppColors.primary.withValues(alpha: 0.10),
      child: const Icon(
        Icons.description_outlined,
        size: 22,
        color: AppColors.primary,
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
