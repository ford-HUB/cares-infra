import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../../core/session/static_user_session.dart';
import '../../../core/theme/app_theme.dart';
import '../data/certificate_data.dart';

class CertificateReviewScreen extends StatelessWidget {
  const CertificateReviewScreen({super.key, required this.certificate});

  final CaresCertificate certificate;

  static void open(BuildContext context, CaresCertificate certificate) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => CertificateReviewScreen(certificate: certificate),
      ),
    );
  }

  String get _recipientName {
    final user = StaticUserSession.instance.currentUser;
    if (user == null || user.fullName.trim().isEmpty) return 'Volunteer';
    return user.fullName;
  }

  Future<void> _download(BuildContext context) async {
    await downloadCertificate(context, certificate);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Certificate'),
        centerTitle: true,
        backgroundColor: AppColors.background,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
        actions: [
          IconButton(
            onPressed: () => _download(context),
            icon: const Icon(Icons.download_rounded),
            tooltip: 'Download certificate',
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
        children: [
          _CertificatePreview(
            certificate: certificate,
            recipientName: _recipientName,
          ),
          const SizedBox(height: 12),
          const Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.info_outline_rounded,
                size: 15,
                color: AppColors.textMuted,
              ),
              SizedBox(width: 6),
              Flexible(
                child: Text(
                  'Sample certificate design — preview only.',
                  style: TextStyle(fontSize: 12, color: AppColors.textMuted),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          FilledButton.icon(
            onPressed: () => _download(context),
            icon: const Icon(Icons.download_rounded),
            label: const Text('Download Certificate'),
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.primary,
              minimumSize: const Size.fromHeight(50),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _CertificatePreview extends StatelessWidget {
  const _CertificatePreview({
    required this.certificate,
    required this.recipientName,
  });

  final CaresCertificate certificate;
  final String recipientName;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.primary.withValues(alpha: 0.25)),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withValues(alpha: 0.08),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.workspace_premium_rounded,
              color: AppColors.primary,
              size: 30,
            ),
          ),
          const SizedBox(height: 16),
          const Text(
            'CARES',
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w800,
              letterSpacing: 2,
              color: AppColors.primary,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            certificate.title,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.w800,
              color: AppColors.textPrimary,
              height: 1.3,
            ),
          ),
          const SizedBox(height: 20),
          Container(
            width: 48,
            height: 3,
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.35),
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(height: 20),
          const Text(
            'This certifies that',
            style: TextStyle(fontSize: 14, color: AppColors.textSecondary),
          ),
          const SizedBox(height: 8),
          Text(
            recipientName,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 26,
              fontWeight: FontWeight.w800,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 16),
          const Text(
            'has successfully completed volunteer service for',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 14, color: AppColors.textSecondary),
          ),
          const SizedBox(height: 12),
          Text(
            certificate.eventName,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            certificate.organization,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 14,
              color: AppColors.textSecondary,
            ),
          ),
          const SizedBox(height: 24),
          Row(
            children: [
              if (certificate.eventDateLabel != null) ...[
                Expanded(
                  child: _DetailChip(
                    label: 'Event date',
                    value: certificate.eventDateLabel!,
                  ),
                ),
                const SizedBox(width: 10),
              ],
              Expanded(
                child: _DetailChip(
                  label: 'Hours',
                  value: '${certificate.hoursCompleted}h',
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _DetailChip(
                  label: 'Issued',
                  value: certificate.issuedOnLabel,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Text(
            'Certificate No. ${certificate.certificateNumber}',
            style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
          ),
        ],
      ),
    );
  }
}

class _DetailChip extends StatelessWidget {
  const _DetailChip({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 10),
      decoration: BoxDecoration(
        color: AppColors.inputFill,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        children: [
          Text(
            label,
            style: const TextStyle(
              fontSize: 12,
              color: AppColors.textSecondary,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary,
            ),
          ),
        ],
      ),
    );
  }
}

Future<void> downloadCertificate(
  BuildContext context,
  CaresCertificate certificate,
) async {
  final user = StaticUserSession.instance.currentUser;
  final recipientName = user == null || user.fullName.trim().isEmpty
      ? 'Volunteer'
      : user.fullName;
  final content = certificate.downloadContent(recipientName);
  await Clipboard.setData(ClipboardData(text: content));
  if (!context.mounted) return;
  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(
      content: Text('${certificate.title} downloaded.'),
      behavior: SnackBarBehavior.floating,
    ),
  );
}
