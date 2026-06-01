import 'package:flutter/material.dart';
import '../models/registration_data.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../shared/widgets/auth_text_field.dart';
import '../widgets/registration_option_card.dart';

class AccountTypeStep extends StatefulWidget {
  const AccountTypeStep({
    super.key,
    required this.data,
    required this.onChanged,
  });

  final RegistrationData data;
  final VoidCallback onChanged;

  @override
  State<AccountTypeStep> createState() => _AccountTypeStepState();
}

class _AccountTypeStepState extends State<AccountTypeStep> {
  late final TextEditingController _organizationController;

  RegistrationData get data => widget.data;

  @override
  void initState() {
    super.initState();
    _organizationController =
        TextEditingController(text: data.organizationName);
  }

  @override
  void dispose() {
    _organizationController.dispose();
    super.dispose();
  }

  void _selectAccountType(AccountType type) {
    if (data.accountType != type) {
      data.accountType = type;
      if (type == AccountType.regularUser) {
        data.clearBeneficiaryFields();
        _organizationController.clear();
      } else {
        data.userRole = null;
      }
    } else {
      data.accountType = type;
    }
    widget.onChanged();
  }

  void _selectBeneficiaryType(BeneficiaryType type) {
    data.beneficiaryType = type;
    if (type == BeneficiaryType.individual) {
      data.organizationName = '';
      _organizationController.clear();
    }
    widget.onChanged();
  }

  void _syncOrganizationName(String value) {
    data.organizationName = value.trim();
    widget.onChanged();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        RegistrationOptionCard(
          title: 'Regular User',
          description:
              'For students, staff, and faculty members who want to participate in community outreach programs, donations, and extension services.',
          icon: Icons.groups_rounded,
          isSelected: data.accountType == AccountType.regularUser,
          onTap: () => _selectAccountType(AccountType.regularUser),
        ),
        const SizedBox(height: 16),
        RegistrationOptionCard(
          title: 'Beneficiary',
          description:
              'For individuals or groups applying for assistance and support through community programs.',
          icon: Icons.volunteer_activism_rounded,
          isSelected: data.accountType == AccountType.beneficiary,
          onTap: () => _selectAccountType(AccountType.beneficiary),
        ),
        if (data.isBeneficiary) ...[
          const SizedBox(height: 28),
          const Text(
            'Beneficiary Type',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 12),
          RegistrationOptionCard(
            title: 'Individual',
            description:
                'Register as an individual beneficiary seeking community assistance and support.',
            icon: Icons.person_outline_rounded,
            isSelected: data.beneficiaryType == BeneficiaryType.individual,
            onTap: () => _selectBeneficiaryType(BeneficiaryType.individual),
          ),
          const SizedBox(height: 12),
          RegistrationOptionCard(
            title: 'Organization Member',
            description:
                "I'm in an Organization — register as a member of a group or organization.",
            icon: Icons.business_outlined,
            isSelected:
                data.beneficiaryType == BeneficiaryType.organizationMember,
            onTap: () =>
                _selectBeneficiaryType(BeneficiaryType.organizationMember),
          ),
          if (data.isOrganizationMember) ...[
            const SizedBox(height: 16),
            AuthTextField(
              controller: _organizationController,
              label: 'Organization Name',
              hintText: 'Enter your organization name',
              icon: Icons.apartment_outlined,
              textInputAction: TextInputAction.done,
              onChanged: _syncOrganizationName,
            ),
            if (data.organizationName.isEmpty)
              const Padding(
                padding: EdgeInsets.only(top: 8),
                child: Text(
                  'Organization name is required to continue.',
                  style: TextStyle(
                    fontSize: 12,
                    color: AppColors.secondary,
                  ),
                ),
              ),
          ],
        ],
      ],
    );
  }
}
