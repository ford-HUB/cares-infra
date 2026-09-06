import 'package:flutter/material.dart';
import 'package:mobile/core/session/static_user_session.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/auth/registration/models/registration_data.dart';
import 'package:mobile/features/dashboard/beneficiary/data/beneficiary_personal_profile_store.dart';
import 'package:mobile/features/dashboard/beneficiary/domain/beneficiary_personal_profile.dart';
import 'package:mobile/features/dashboard/beneficiary/screens/beneficiary_document_upload_screen.dart';

/// True when the signed-in account is a beneficiary, whose event joining is
/// gated on a verified identity/residency document.
bool get isBeneficiarySession =>
    StaticUserSession.instance.currentUser?.accountType ==
    AccountType.beneficiary;

/// Copy for each blocked state of the event joining flow.
class _GateCopy {
  const _GateCopy({
    required this.title,
    required this.message,
    required this.action,
    required this.icon,
    required this.color,
  });

  final String title;
  final String message;
  final String action;
  final IconData icon;
  final Color color;
}

_GateCopy _copyFor(
  BeneficiaryVerificationState state,
  VerificationDocument? document,
) {
  switch (state) {
    case BeneficiaryVerificationState.none:
      return const _GateCopy(
        title: 'Document Verification Required',
        message:
            'You need at least one valid document on file before joining an '
            'event. Upload a valid government-issued ID, proof of residency, '
            'barangay certificate, or another document that verifies your '
            'identity or residency.',
        action: 'Upload Document',
        icon: Icons.badge_outlined,
        color: AppColors.accentOrange,
      );

    case BeneficiaryVerificationState.underReview:
      return const _GateCopy(
        title: 'Document Under Review',
        message:
            'Your document has been submitted and is currently being '
            'reviewed. You can join events once your document is verified.',
        action: 'Upload Another Document',
        icon: Icons.hourglass_top_rounded,
        color: AppColors.accentOrange,
      );

    case BeneficiaryVerificationState.rejected:
      final reason = document?.rejectionReason;
      return _GateCopy(
        title: 'Document Rejected',
        message: reason == null
            ? 'Your document was rejected, so you cannot join events yet. '
                  'Please upload a new valid document.'
            : 'Your document was rejected: $reason\n\nPlease upload a new '
                  'valid document to join events.',
        action: 'Upload a New Document',
        icon: Icons.error_outline_rounded,
        color: AppColors.heart,
      );

    case BeneficiaryVerificationState.verified:
      return const _GateCopy(
        title: 'Document Verified',
        message: 'Your document is verified. You can join events.',
        action: 'Continue',
        icon: Icons.verified_rounded,
        color: AppColors.primary,
      );
  }
}

/// Blocks joining and explains what the beneficiary has to do next.
/// Returns true when a document was uploaded from the dialog.
Future<bool> showBeneficiaryVerificationRequiredDialog(
  BuildContext context,
) async {
  final store = BeneficiaryPersonalProfileStore.instance;
  final state = store.verificationState;
  final document = switch (state) {
    BeneficiaryVerificationState.rejected => store.profile.rejectedDocument,
    BeneficiaryVerificationState.underReview =>
      store.profile.documentUnderReview,
    _ => null,
  };
  final copy = _copyFor(state, document);

  final upload = await showDialog<bool>(
    context: context,
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
                color: copy.color.withValues(alpha: 0.14),
                shape: BoxShape.circle,
              ),
              child: Icon(copy.icon, size: 32, color: copy.color),
            ),
            const SizedBox(height: 20),
            Text(
              copy.title,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w800,
                color: AppColors.textPrimary,
                height: 1.25,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              copy.message,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 14,
                height: 1.55,
                color: AppColors.textSecondary,
              ),
            ),
            if (document?.fileName != null) ...[
              const SizedBox(height: 14),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 10,
                ),
                decoration: BoxDecoration(
                  color: AppColors.background,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.inputFill),
                ),
                child: Row(
                  children: [
                    const Icon(
                      Icons.insert_drive_file_outlined,
                      size: 18,
                      color: AppColors.primary,
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        '${document!.label} · ${document.fileName}',
                        maxLines: 2,
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 22),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => Navigator.of(ctx).pop(false),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.textSecondary,
                      side: const BorderSide(color: AppColors.inputFill),
                      minimumSize: const Size.fromHeight(48),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: const Text('Close'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: FilledButton(
                    onPressed: () => Navigator.of(ctx).pop(true),
                    style: FilledButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      minimumSize: const Size.fromHeight(48),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: Text(copy.action),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    ),
  );

  if (upload != true || !context.mounted) return false;

  return BeneficiaryDocumentUploadScreen.open(
    context,
    initialDocumentId: document?.id,
  );
}

/// Status strip shown above the Join button on an event for beneficiaries.
class BeneficiaryVerificationBanner extends StatelessWidget {
  const BeneficiaryVerificationBanner({
    super.key,
    required this.state,
    required this.document,
    required this.onAction,
  });

  final BeneficiaryVerificationState state;
  final VerificationDocument? document;
  final VoidCallback onAction;

  @override
  Widget build(BuildContext context) {
    if (state == BeneficiaryVerificationState.verified) {
      return const SizedBox.shrink();
    }

    final copy = _copyFor(state, document);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: copy.color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: copy.color.withValues(alpha: 0.25)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(copy.icon, size: 20, color: copy.color),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      copy.title,
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w800,
                        color: copy.color,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      copy.message,
                      style: const TextStyle(
                        fontSize: 12.5,
                        height: 1.45,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: onAction,
              icon: const Icon(Icons.upload_file_rounded, size: 18),
              label: Text(copy.action),
              style: OutlinedButton.styleFrom(
                foregroundColor: copy.color,
                side: BorderSide(color: copy.color.withValues(alpha: 0.5)),
                minimumSize: const Size.fromHeight(44),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
