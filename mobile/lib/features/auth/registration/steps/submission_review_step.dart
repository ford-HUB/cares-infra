import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';
import '../models/registration_data.dart';
import '../widgets/registration_section_card.dart';

class SubmissionReviewStep extends StatelessWidget {
  const SubmissionReviewStep({
    super.key,
    required this.data,
  });

  final RegistrationData data;

  Widget _reviewRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 130,
            child: Text(
              label,
              style: const TextStyle(
                fontSize: 13,
                color: AppColors.textSecondary,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: AppColors.textPrimary,
              ),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.accent.withValues(alpha: 0.15),
            borderRadius: BorderRadius.circular(12),
          ),
          child: const Row(
            children: [
              Icon(Icons.verified_user_outlined, color: AppColors.textPrimary),
              SizedBox(width: 12),
              Expanded(
                child: Text(
                  'Review your information before submitting your registration for review.',
                  style: TextStyle(
                    fontSize: 14,
                    height: 1.4,
                    color: AppColors.textPrimary,
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        RegistrationSectionCard(
          title: 'Account Details',
          children: [
            _reviewRow('Account Type', data.accountTypeLabel),
            if (data.isRegularUser) _reviewRow('Role', data.userRoleLabel),
          ],
        ),
        const SizedBox(height: 12),
        RegistrationSectionCard(
          title: 'Personal Information',
          children: [
            _reviewRow('Name', '${data.firstName} ${data.lastName}'),
            _reviewRow('Email', data.email),
            _reviewRow('Phone', data.phoneNumber),
            _reviewRow('School ID', data.schoolIdNumber),
          ],
        ),
        const SizedBox(height: 12),
        RegistrationSectionCard(
          title: 'Academic Information',
          children: [
            _reviewRow('Department', data.department ?? '—'),
            _reviewRow('Course', data.course ?? '—'),
            _reviewRow('Year Level', data.yearLevel ?? '—'),
          ],
        ),
        const SizedBox(height: 12),
        RegistrationSectionCard(
          title: 'Verification Documents',
          children: [
            _reviewRow(
              'School ID',
              data.schoolIdImagePath != null ? 'Uploaded' : 'Missing',
            ),
            _reviewRow(
              'Selfie',
              data.selfieImagePath != null ? 'Uploaded' : 'Missing',
            ),
          ],
        ),
      ],
    );
  }
}
