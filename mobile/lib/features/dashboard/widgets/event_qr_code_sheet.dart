import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../../../core/theme/app_theme.dart';
import '../data/event_registration_store.dart';

void showEventQrCodeSheet(
  BuildContext context,
  EventParticipation participation,
  String eventTitle,
) {
  showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    backgroundColor: AppColors.surface,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
    ),
    builder: (ctx) => Padding(
      padding: EdgeInsets.fromLTRB(
        24,
        16,
        24,
        24 + MediaQuery.of(ctx).padding.bottom,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: AppColors.inputFill,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(height: 20),
          const Text(
            'Your Event QR Code',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w800,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            eventTitle,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 14,
              color: AppColors.textSecondary,
            ),
          ),
          const SizedBox(height: 24),
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: AppColors.background,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: AppColors.inputFill),
            ),
            child: QrImageView(
              data: participation.qrPayload,
              version: QrVersions.auto,
              size: 220,
              eyeStyle: const QrEyeStyle(
                eyeShape: QrEyeShape.square,
                color: AppColors.primary,
              ),
              dataModuleStyle: const QrDataModuleStyle(
                dataModuleShape: QrDataModuleShape.square,
                color: AppColors.textPrimary,
              ),
            ),
          ),
          const SizedBox(height: 16),
          Text(
            participation.participantName,
            style: const TextStyle(
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            participation.participantEmail,
            style: const TextStyle(
              fontSize: 13,
              color: AppColors.textSecondary,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Show this code at check-in for attendance verification.',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 13,
              color: AppColors.textMuted.withValues(alpha: 0.95),
              height: 1.4,
            ),
          ),
          const SizedBox(height: 20),
          FilledButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Close'),
          ),
        ],
      ),
    ),
  );
}
