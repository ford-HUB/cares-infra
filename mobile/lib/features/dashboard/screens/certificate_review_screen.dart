import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../../core/session/static_user_session.dart';
import '../../../core/theme/app_theme.dart';
import '../data/certificate_data.dart';
import '../data/certificate_service.dart';

/// The issued certificate, drawn from the frozen sheet the server generated:
/// the deployed template's headline and award text with the volunteer's
/// details filled in, and the signature lines as they were issued.
class CertificateReviewScreen extends StatefulWidget {
  const CertificateReviewScreen({super.key, required this.certificate});

  final CaresCertificate certificate;

  static void open(BuildContext context, CaresCertificate certificate) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => CertificateReviewScreen(certificate: certificate),
      ),
    );
  }

  @override
  State<CertificateReviewScreen> createState() =>
      _CertificateReviewScreenState();
}

class _CertificateReviewScreenState extends State<CertificateReviewScreen> {
  late CaresCertificate _certificate = widget.certificate;

  @override
  void initState() {
    super.initState();
    _claim();
  }

  /// Opening the sheet is what the portal counts as "claimed"; the fresh copy
  /// also carries anything the wallet list left out. Best effort.
  Future<void> _claim() async {
    try {
      final opened = await CertificateService().open(_certificate.id);
      CertificateStore.instance.upsert(opened);
      if (mounted) setState(() => _certificate = opened);
    } catch (_) {
      // Keep showing what the wallet already holds.
    }
  }

  Future<void> _download(BuildContext context) async {
    await downloadCertificate(context, _certificate);
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
          _CertificateSheet(certificate: _certificate),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(
                Icons.verified_rounded,
                size: 15,
                color: AppColors.textMuted,
              ),
              const SizedBox(width: 6),
              Flexible(
                child: Text(
                  'Issued ${_certificate.issuedOnLabel} · '
                  'No. ${_certificate.certificateNumber}',
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppColors.textMuted,
                  ),
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

/// The template's accent, as the portal's customizer names them.
Color certificateAccentColor(String accent) {
  return switch (accent) {
    'sky' => const Color(0xFF0284C7),
    'violet' => const Color(0xFF7C3AED),
    'rose' => const Color(0xFFE11D48),
    'amber' => const Color(0xFFD97706),
    'slate' => const Color(0xFF475569),
    _ => AppColors.primary,
  };
}

class _CertificateSheet extends StatelessWidget {
  const _CertificateSheet({required this.certificate});

  final CaresCertificate certificate;

  @override
  Widget build(BuildContext context) {
    final accent = certificateAccentColor(certificate.accent);
    final recipient = certificate.recipientName.trim().isEmpty
        ? (StaticUserSession.instance.currentUser?.fullName ?? 'Volunteer')
        : certificate.recipientName;
    final headline = certificate.headline.trim().isEmpty
        ? 'Certificate of Participation'
        : certificate.headline;
    final body = certificate.body.trim().isEmpty
        ? 'This certifies that $recipient has successfully completed '
              'volunteer service for ${certificate.eventName}.'
        : certificate.body;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: accent.withValues(alpha: 0.35), width: 1.5),
        boxShadow: [
          BoxShadow(
            color: accent.withValues(alpha: 0.10),
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
              color: accent.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(
              Icons.workspace_premium_rounded,
              color: accent,
              size: 30,
            ),
          ),
          const SizedBox(height: 16),
          Text(
            headline.toUpperCase(),
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w800,
              letterSpacing: 2,
              color: accent,
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
              color: accent.withValues(alpha: 0.35),
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(height: 20),
          Text(
            recipient,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 26,
              fontWeight: FontWeight.w800,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 14),
          Text(
            body,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 14,
              height: 1.5,
              color: AppColors.textSecondary,
            ),
          ),
          const SizedBox(height: 12),
          Text(
            certificate.organization,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: AppColors.textSecondary,
            ),
          ),
          if (certificate.signatories.isNotEmpty) ...[
            const SizedBox(height: 24),
            _SignatoryRow(signatories: certificate.signatories, accent: accent),
          ],
          if (certificate.showSeal && certificate.sealLabel.isNotEmpty) ...[
            const SizedBox(height: 16),
            _Seal(label: certificate.sealLabel, accent: accent),
          ],
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
                  value: certificate.hoursLabel,
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

/// The signature lines, left to right as laid out on the sheet. A line whose
/// coordinator had a signature on file shows it above the rule.
class _SignatoryRow extends StatelessWidget {
  const _SignatoryRow({required this.signatories, required this.accent});

  final List<CertificateSignatory> signatories;
  final Color accent;

  @override
  Widget build(BuildContext context) {
    final service = CertificateService();
    return Row(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        for (var i = 0; i < signatories.length; i++) ...[
          if (i > 0) const SizedBox(width: 12),
          Expanded(
            child: Column(
              children: [
                SizedBox(
                  height: 40,
                  child: signatories[i].signatureUrl == null
                      ? const SizedBox.shrink()
                      : Image.network(
                          service.imageUrl(signatories[i].signatureUrl!),
                          headers: service.imageHeaders,
                          fit: BoxFit.contain,
                          errorBuilder: (_, _, _) => const SizedBox.shrink(),
                        ),
                ),
                const SizedBox(height: 6),
                Container(height: 1, color: AppColors.borderLight),
                const SizedBox(height: 6),
                Text(
                  signatories[i].name,
                  textAlign: TextAlign.center,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                  ),
                ),
                Text(
                  signatories[i].title,
                  textAlign: TextAlign.center,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 10,
                    color: AppColors.textSecondary,
                  ),
                ),
                Text(
                  signatories[i].department,
                  textAlign: TextAlign.center,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 10,
                    color: AppColors.textMuted,
                  ),
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }
}

class _Seal extends StatelessWidget {
  const _Seal({required this.label, required this.accent});

  final String label;
  final Color accent;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      decoration: BoxDecoration(
        shape: BoxShape.rectangle,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: accent.withValues(alpha: 0.6), width: 1.5),
        color: accent.withValues(alpha: 0.06),
      ),
      child: Text(
        label.toUpperCase(),
        style: TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.w800,
          letterSpacing: 1.5,
          color: accent,
        ),
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
  final recipientName = certificate.recipientName.trim().isNotEmpty
      ? certificate.recipientName
      : (StaticUserSession.instance.currentUser?.fullName ?? 'Volunteer');
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
