import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:mobile/core/services/api_client.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/dashboard/data/user_request_service.dart';
import 'package:mobile/features/dashboard/domain/cares_event.dart';

/// A beneficiary applying for an event. The application is not a
/// registration: it carries a proof of residency (a PDF of a barangay
/// certificate or similar) and waits as "Pending approval" until a director
/// accepts it on the portal — only then is the place booked.
///
/// Resolves to `true` once the application is filed.
Future<bool> showBeneficiaryEventApplicationDialog(
  BuildContext context,
  CaresEvent event,
) async {
  final applied = await showDialog<bool>(
    context: context,
    barrierDismissible: false,
    builder: (_) => _BeneficiaryEventApplicationDialog(event: event),
  );
  return applied ?? false;
}

class _BeneficiaryEventApplicationDialog extends StatefulWidget {
  const _BeneficiaryEventApplicationDialog({required this.event});

  final CaresEvent event;

  @override
  State<_BeneficiaryEventApplicationDialog> createState() =>
      _BeneficiaryEventApplicationDialogState();
}

class _BeneficiaryEventApplicationDialogState
    extends State<_BeneficiaryEventApplicationDialog> {
  static const _maxBytes = 10 * 1024 * 1024;

  final _requests = UserRequestService();

  _PickedPdf? _proof;
  bool _submitting = false;
  String? _error;

  Future<void> _pickPdf() async {
    if (_submitting) return;
    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: const ['pdf'],
        withData: false,
      );
      final file = result?.files.single;
      final path = file?.path;
      if (file == null || path == null || !mounted) return;

      if (!file.name.toLowerCase().endsWith('.pdf')) {
        setState(() => _error = 'Only PDF files are accepted.');
        return;
      }
      if (file.size > _maxBytes) {
        setState(() => _error = 'The PDF must be 10 MB or smaller.');
        return;
      }
      setState(() {
        _proof = _PickedPdf(path: path, name: file.name, size: file.size);
        _error = null;
      });
    } catch (_) {
      if (mounted) setState(() => _error = 'Could not open the file picker.');
    }
  }

  Future<void> _submit() async {
    final proof = _proof;
    final eventId = widget.event.serverId;
    if (proof == null || eventId == null || _submitting) return;

    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      await _requests.applyForEvent(
        eventId: eventId,
        proofPath: proof.path,
        proofName: proof.name,
        proofMimeType: 'application/pdf',
      );
      if (!mounted) return;
      Navigator.of(context).pop(true);
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _submitting = false;
        _error = e.message;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _submitting = false;
        _error = 'Could not submit your application. Please try again.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final proof = _proof;

    return AlertDialog(
      backgroundColor: Colors.white,
      surfaceTintColor: Colors.transparent,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      titlePadding: const EdgeInsets.fromLTRB(22, 22, 22, 0),
      contentPadding: const EdgeInsets.fromLTRB(22, 14, 22, 4),
      actionsPadding: const EdgeInsets.fromLTRB(16, 4, 16, 14),
      title: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.12),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.volunteer_activism_outlined,
              color: AppColors.primary,
              size: 22,
            ),
          ),
          const SizedBox(width: 12),
          
        ],
      ),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              widget.event.title,
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w700,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              'Attach a PDF proof of residency — a barangay certificate or a '
              'similar document that shows your address.',
              style: TextStyle(
                fontSize: 12.5,
                height: 1.4,
                color: AppColors.secondary.withValues(alpha: 0.95),
              ),
            ),
            const SizedBox(height: 12),
            _PdfSlot(
              proof: proof,
              enabled: !_submitting,
              onPick: _pickPdf,
              onClear: () => setState(() => _proof = null),
            ),
            if (_error != null) ...[
              const SizedBox(height: 8),
              Text(
                _error!,
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: AppColors.heart,
                ),
              ),
            ],
            const SizedBox(height: 12),
            const _ApprovalNotice(),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: _submitting
              ? null
              : () => Navigator.of(context).pop(false),
          child: const Text('Cancel'),
        ),
        FilledButton.icon(
          onPressed: proof == null || _submitting ? null : _submit,
          icon: _submitting
              ? const SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: Colors.white,
                  ),
                )
              : const Icon(Icons.send_rounded, size: 18),
          label: Text(_submitting ? 'Submitting…' : 'Submit'),
          style: FilledButton.styleFrom(
            backgroundColor: AppColors.primaryDark,
            foregroundColor: Colors.white,
            shape: const StadiumBorder(),
          ),
        ),
      ],
    );
  }
}

class _PickedPdf {
  const _PickedPdf({
    required this.path,
    required this.name,
    required this.size,
  });

  final String path;
  final String name;
  final int size;

  String get sizeLabel {
    if (size < 1024 * 1024) return '${(size / 1024).toStringAsFixed(0)} KB';
    return '${(size / (1024 * 1024)).toStringAsFixed(1)} MB';
  }
}

/// The upload slot: a call to action until a PDF is chosen, then the file's
/// name and size with a way to swap or drop it.
class _PdfSlot extends StatelessWidget {
  const _PdfSlot({
    required this.proof,
    required this.enabled,
    required this.onPick,
    required this.onClear,
  });

  final _PickedPdf? proof;
  final bool enabled;
  final VoidCallback onPick;
  final VoidCallback onClear;

  @override
  Widget build(BuildContext context) {
    final picked = proof;
    if (picked == null) {
      return Material(
        color: AppColors.light.withValues(alpha: 0.28),
        borderRadius: BorderRadius.circular(14),
        child: InkWell(
          onTap: enabled ? onPick : null,
          borderRadius: BorderRadius.circular(14),
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 18, horizontal: 14),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppColors.primary, width: 1.2),
            ),
            child: const Column(
              children: [
                Icon(
                  Icons.picture_as_pdf_rounded,
                  color: AppColors.primary,
                  size: 30,
                ),
                SizedBox(height: 8),
                Text(
                  'Choose PDF file',
                  style: TextStyle(
                    fontSize: 13.5,
                    fontWeight: FontWeight.w800,
                    color: AppColors.primaryDark,
                  ),
                ),
                SizedBox(height: 2),
                Text(
                  'PDF only, up to 10 MB',
                  style: TextStyle(
                    fontSize: 11.5,
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.fromLTRB(12, 10, 4, 10),
      decoration: AppDecorations.surfaceCard(),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Icon(
              Icons.picture_as_pdf_rounded,
              color: AppColors.primary,
              size: 22,
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  picked.name,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  '${picked.sizeLabel} · Ready to submit',
                  style: const TextStyle(
                    fontSize: 11.5,
                    fontWeight: FontWeight.w600,
                    color: AppColors.primary,
                  ),
                ),
              ],
            ),
          ),
          TextButton(
            onPressed: enabled ? onPick : null,
            child: const Text('Change'),
          ),
          IconButton(
            onPressed: enabled ? onClear : null,
            tooltip: 'Remove',
            icon: const Icon(Icons.close_rounded, size: 18),
          ),
        ],
      ),
    );
  }
}

class _ApprovalNotice extends StatelessWidget {
  const _ApprovalNotice();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.accentOrange.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: AppColors.accentOrange.withValues(alpha: 0.25),
        ),
      ),
      child: const Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(
            Icons.hourglass_top_rounded,
            color: AppColors.accentOrange,
            size: 18,
          ),
          SizedBox(width: 8),
          Expanded(
            child: Text(
              'Your application stays "Pending approval" until a CARES director '
              'reviews your proof. Once approved, your place is confirmed.',
              style: TextStyle(
                fontSize: 12,
                height: 1.4,
                color: AppColors.textSecondary,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
