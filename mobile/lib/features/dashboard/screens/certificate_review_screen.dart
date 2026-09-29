import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';
import '../data/certificate_data.dart';
import '../data/certificate_service.dart';
import '../presentation/utils/certificate_pdf.dart';
import '../presentation/widgets/certificate_sheet.dart';

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

  /// Wraps the drawn sheet so the export captures exactly what is on screen.
  final _sheetKey = GlobalKey();
  bool _exporting = false;

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

  /// Rasterises the sheet as shown, wraps it in a PDF of the sheet's own
  /// proportions, and offers it through the share sheet.
  Future<void> _download() async {
    if (_exporting) return;
    setState(() => _exporting = true);
    try {
      final file = await exportCertificatePdf(
        boundaryKey: _sheetKey,
        certificate: _certificate,
      );
      if (!mounted) return;
      final shared = await shareCertificatePdf(file, _certificate);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            shared
                ? 'PDF saved: ${file.path.split('/').last}'
                : 'PDF saved to ${file.path}',
          ),
          behavior: SnackBarBehavior.floating,
          duration: const Duration(seconds: 5),
        ),
      );
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('The certificate could not be exported: $error'),
          behavior: SnackBarBehavior.floating,
        ),
      );
    } finally {
      if (mounted) setState(() => _exporting = false);
    }
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
            onPressed: _exporting ? null : _download,
            icon: const Icon(Icons.download_rounded),
            tooltip: 'Download certificate',
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
        children: [
          // Pinch to zoom in on the wording; the sheet is drawn at the phone's
          // width, which is small for a landscape certificate.
          InteractiveViewer(
            minScale: 1,
            maxScale: 4,
            child: RepaintBoundary(
              key: _sheetKey,
              child: CertificateSheet(certificate: _certificate),
            ),
          ),
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
          Row(
            children: [
              if (_certificate.eventDateLabel != null) ...[
                Expanded(
                  child: _DetailChip(
                    label: 'Event date',
                    value: _certificate.eventDateLabel!,
                  ),
                ),
                const SizedBox(width: 10),
              ],
              Expanded(
                child: _DetailChip(
                  label: 'Hours',
                  value: _certificate.hoursLabel,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _DetailChip(
                  label: 'Issued',
                  value: _certificate.issuedOnLabel,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          FilledButton.icon(
            onPressed: _exporting ? null : _download,
            icon: _exporting
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  )
                : const Icon(Icons.download_rounded),
            label: Text(
              _exporting ? 'Preparing PDF…' : 'Download Certificate (PDF)',
            ),
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
