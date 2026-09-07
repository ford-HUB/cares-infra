import 'package:flutter/material.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/dashboard/beneficiary/data/beneficiary_personal_profile_store.dart';
import 'package:mobile/features/dashboard/beneficiary/domain/beneficiary_personal_profile.dart';

/// Upload one verification document. Submitting marks it "Under Review" —
/// a CARES reviewer verifies it before the beneficiary can join events.
class BeneficiaryDocumentUploadScreen extends StatefulWidget {
  const BeneficiaryDocumentUploadScreen({super.key, this.initialDocumentId});

  final String? initialDocumentId;

  /// Returns true when a document was submitted.
  static Future<bool> open(
    BuildContext context, {
    String? initialDocumentId,
  }) async {
    final submitted = await Navigator.of(context).push<bool>(
      MaterialPageRoute<bool>(
        builder: (_) => BeneficiaryDocumentUploadScreen(
          initialDocumentId: initialDocumentId,
        ),
      ),
    );
    return submitted ?? false;
  }

  @override
  State<BeneficiaryDocumentUploadScreen> createState() =>
      _BeneficiaryDocumentUploadScreenState();
}

class _BeneficiaryDocumentUploadScreenState
    extends State<BeneficiaryDocumentUploadScreen> {
  final _store = BeneficiaryPersonalProfileStore.instance;

  late String _selectedId;
  String? _pickedFileName;
  bool _isSubmitting = false;

  List<VerificationDocument> get _documents => _store.profile.documents;

  @override
  void initState() {
    super.initState();
    _selectedId = widget.initialDocumentId ?? _documents.first.id;
  }

  VerificationDocument get _selectedDocument =>
      _documents.firstWhere((doc) => doc.id == _selectedId);

  void _pickFile() {
    // Mock file picker — the prototype records a file name only.
    setState(() {
      _pickedFileName = '${_selectedId.replaceAll('-', '_')}_scan.jpg';
    });
  }

  Future<void> _submit() async {
    final fileName = _pickedFileName;
    if (fileName == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Attach a photo or file of your document first.'),
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    setState(() => _isSubmitting = true);

    // Mock submission — no upload endpoint in the prototype.
    await Future<void>.delayed(const Duration(milliseconds: 400));
    if (!mounted) return;

    _store.submitDocument(_selectedId, fileName);
    setState(() => _isSubmitting = false);

    await showDocumentSubmittedDialog(context, _selectedDocument.label);
    if (!mounted) return;
    Navigator.of(context).pop(true);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        foregroundColor: AppColors.primaryDark,
        title: const Text(
          'Upload Document',
          style: TextStyle(fontWeight: FontWeight.w800),
        ),
      ),
      body: Column(
        children: [
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
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
                            'Upload one document that verifies your identity '
                            'or residency. CARES reviews it before you can '
                            'join events.',
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
                  const Text(
                    'Document type',
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w800,
                      color: AppColors.primaryDark,
                    ),
                  ),
                  const SizedBox(height: 10),
                  for (final document in _documents) ...[
                    _DocumentOptionTile(
                      document: document,
                      selected: document.id == _selectedId,
                      onTap: () => setState(() {
                        _selectedId = document.id;
                        _pickedFileName = null;
                      }),
                    ),
                    const SizedBox(height: 10),
                  ],
                  const SizedBox(height: 10),
                  _FilePickerCard(
                    fileName: _pickedFileName,
                    onPick: _pickFile,
                    onClear: _pickedFileName == null
                        ? null
                        : () => setState(() => _pickedFileName = null),
                  ),
                ],
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
            child: SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _isSubmitting ? null : _submit,
                child: _isSubmitting
                    ? const SizedBox(
                        width: 22,
                        height: 22,
                        child: CircularProgressIndicator(
                          strokeWidth: 2.2,
                          color: Colors.white,
                        ),
                      )
                    : const Text('Submit for Review'),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _DocumentOptionTile extends StatelessWidget {
  const _DocumentOptionTile({
    required this.document,
    required this.selected,
    required this.onTap,
  });

  final VerificationDocument document;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Ink(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: selected ? AppColors.primary : AppColors.fieldBorder,
              width: selected ? 1.6 : 1,
            ),
          ),
          child: Row(
            children: [
              Icon(
                selected
                    ? Icons.radio_button_checked_rounded
                    : Icons.radio_button_unchecked_rounded,
                size: 20,
                color: selected ? AppColors.primary : AppColors.textMuted,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      document.label,
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: AppColors.primaryDark,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      document.description,
                      style: TextStyle(
                        fontSize: 12,
                        height: 1.35,
                        color: AppColors.secondary.withValues(alpha: 0.95),
                      ),
                    ),
                  ],
                ),
              ),
              if (document.status != VerificationDocumentStatus.missing) ...[
                const SizedBox(width: 8),
                Text(
                  document.status.label,
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: switch (document.status) {
                      VerificationDocumentStatus.verified => AppColors.primary,
                      VerificationDocumentStatus.pending =>
                        AppColors.accentOrange,
                      VerificationDocumentStatus.rejected => AppColors.heart,
                      VerificationDocumentStatus.missing => AppColors.textMuted,
                    },
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _FilePickerCard extends StatelessWidget {
  const _FilePickerCard({
    required this.fileName,
    required this.onPick,
    this.onClear,
  });

  final String? fileName;
  final VoidCallback onPick;
  final VoidCallback? onClear;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.fieldBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Document photo or file',
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w800,
              color: AppColors.primaryDark,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Make sure your name and address are readable.',
            style: TextStyle(
              fontSize: 12,
              height: 1.35,
              color: AppColors.secondary.withValues(alpha: 0.95),
            ),
          ),
          const SizedBox(height: 14),
          if (fileName == null)
            OutlinedButton.icon(
              onPressed: onPick,
              icon: const Icon(Icons.attach_file_rounded, size: 18),
              label: const Text('Attach document'),
              style: OutlinedButton.styleFrom(
                minimumSize: const Size.fromHeight(46),
              ),
            )
          else
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.background,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.fieldBorder),
              ),
              child: Row(
                children: [
                  const Icon(
                    Icons.insert_drive_file_outlined,
                    size: 20,
                    color: AppColors.primary,
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      fileName!,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: AppColors.primaryDark,
                      ),
                    ),
                  ),
                  IconButton(
                    onPressed: onClear,
                    icon: const Icon(Icons.close_rounded, size: 18),
                    color: AppColors.textMuted,
                    tooltip: 'Remove attachment',
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

/// Confirmation shown right after a document is submitted for review.
Future<void> showDocumentSubmittedDialog(
  BuildContext context,
  String documentLabel,
) {
  return showDialog<void>(
    context: context,
    barrierDismissible: false,
    builder: (ctx) => AlertDialog(
      backgroundColor: AppColors.background,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
      contentPadding: const EdgeInsets.fromLTRB(24, 28, 24, 8),
      actionsPadding: const EdgeInsets.fromLTRB(24, 0, 24, 20),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 64,
            height: 64,
            decoration: BoxDecoration(
              color: AppColors.accentOrange.withValues(alpha: 0.14),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.hourglass_top_rounded,
              color: AppColors.accentOrange,
              size: 34,
            ),
          ),
          const SizedBox(height: 20),
          const Text(
            'Document Under Review',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w800,
              color: AppColors.primaryDark,
            ),
          ),
          const SizedBox(height: 10),
          Text(
            'Your $documentLabel has been submitted and is currently being '
            'reviewed. You can join events once your document is verified.',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 14,
              height: 1.45,
              color: AppColors.secondary.withValues(alpha: 0.95),
            ),
          ),
        ],
      ),
      actions: [
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Got it'),
          ),
        ),
      ],
    ),
  );
}
