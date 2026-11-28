import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/auth/presentation/widgets/registration_form_card.dart';

/// Matches the server's `REGISTRATION_DOCUMENT_MAX_BYTES`.
const int kRegistrationDocumentMaxBytes = 10 * 1024 * 1024;

/// Held by the flow and uploaded when the step is left.
class RegistrationDocumentCard extends StatefulWidget {
  const RegistrationDocumentCard({
    super.key,
    required this.title,
    required this.description,
    required this.document,
    required this.onChanged,
  });

  final String title;

  /// Accepted types and size limit are appended.
  final String description;

  final PlatformFile? document;
  final ValueChanged<PlatformFile?> onChanged;

  @override
  State<RegistrationDocumentCard> createState() =>
      _RegistrationDocumentCardState();
}

class _RegistrationDocumentCardState extends State<RegistrationDocumentCard> {
  static const _maxMb = kRegistrationDocumentMaxBytes ~/ (1024 * 1024);

  String? _error;

  Future<void> _pick() async {
    FocusManager.instance.primaryFocus?.unfocus();
    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.any,
        withData: false,
      );
      final file = result?.files.single;
      if (file == null || file.path == null || !mounted) return;

      if (file.size > kRegistrationDocumentMaxBytes) {
        setState(
          () => _error = 'That file is over $_maxMb MB. Pick a smaller one.',
        );
        return;
      }
      setState(() => _error = null);
      widget.onChanged(file);
    } catch (_) {
      if (!mounted) return;
      setState(() => _error = 'Could not open that file. Try another.');
    }
  }

  @override
  Widget build(BuildContext context) {
    final document = widget.document;
    return RegistrationFormCard(
      icon: Icons.attach_file_rounded,
      title: widget.title,
      subtitle: '${widget.description} Any file type, up to $_maxMb MB.',
      children: [
        if (document == null)
          OutlinedButton.icon(
            onPressed: () => _pick(),
            icon: const Icon(Icons.upload_file_rounded),
            label: const Text('Choose a file'),
          )
        else
          Container(
            padding: const EdgeInsets.fromLTRB(12, 10, 4, 10),
            decoration: BoxDecoration(
              color: AppColors.background,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.borderLight),
            ),
            child: Row(
              children: [
                const Icon(
                  Icons.insert_drive_file_outlined,
                  color: AppColors.primary,
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        document.name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 13.5,
                          fontWeight: FontWeight.w600,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        _formatSize(document.size),
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppColors.textMuted,
                        ),
                      ),
                    ],
                  ),
                ),
                TextButton(
                  onPressed: () => _pick(),
                  child: const Text('Replace'),
                ),
                IconButton(
                  tooltip: 'Remove file',
                  onPressed: () => widget.onChanged(null),
                  icon: const Icon(Icons.close_rounded, size: 20),
                  color: AppColors.textSecondary,
                ),
              ],
            ),
          ),
        if (_error != null) ...[
          const SizedBox(height: 8),
          Text(
            _error!,
            style: const TextStyle(fontSize: 12, color: AppColors.error),
          ),
        ] else if (document == null) ...[
          const SizedBox(height: 8),
          const Text(
            'Required — a director reviews it before your account opens.',
            style: TextStyle(fontSize: 12, color: AppColors.textMuted),
          ),
        ],
      ],
    );
  }

  static String _formatSize(int bytes) {
    if (bytes >= 1024 * 1024) {
      return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
    }
    if (bytes >= 1024) return '${(bytes / 1024).toStringAsFixed(0)} KB';
    return '$bytes B';
  }
}
