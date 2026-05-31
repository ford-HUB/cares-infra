import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';
import '../models/registration_data.dart';
import '../widgets/image_upload_card.dart';

class IdentityVerificationStep extends StatelessWidget {
  const IdentityVerificationStep({
    super.key,
    required this.data,
    required this.onChanged,
  });

  final RegistrationData data;
  final VoidCallback onChanged;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'To ensure account authenticity and security, please upload the required verification documents.',
          style: TextStyle(
            fontSize: 15,
            height: 1.5,
            color: AppColors.textSecondary,
          ),
        ),
        const SizedBox(height: 24),
        ImageUploadCard(
          title: 'School ID Upload',
          instructions:
              'Upload the front side of a valid school ID. The image must be clear and readable.',
          imagePath: data.schoolIdImagePath,
          onImageSelected: (path) {
            data.schoolIdImagePath = path;
            onChanged();
          },
        ),
        const SizedBox(height: 16),
        ImageUploadCard(
          title: 'Selfie Verification',
          instructions:
              'Take a live selfie or upload a clear face photo. Your face must be visible with no masks, sunglasses, or heavy obstructions.',
          imagePath: data.selfieImagePath,
          onImageSelected: (path) {
            data.selfieImagePath = path;
            onChanged();
          },
        ),
        if (data.schoolIdImagePath == null || data.selfieImagePath == null) ...[
          const SizedBox(height: 16),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.accentYellow.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Row(
              children: [
                Icon(Icons.info_outline, size: 18, color: AppColors.textSecondary),
                SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Both a school ID and selfie are required to continue.',
                    style: TextStyle(
                      fontSize: 13,
                      color: AppColors.textSecondary,
                    ),
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
