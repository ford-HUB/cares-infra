import 'package:flutter/material.dart';
import '../models/registration_data.dart';
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
  RegistrationData get data => widget.data;

  void _selectAccountType(AccountType type) {
    if (data.accountType != type) {
      data.accountType = type;
      if (type == AccountType.regularUser) {
        data.clearBeneficiaryFields();
      } else {
        data.userRole = null;
      }
    } else {
      data.accountType = type;
    }
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
      ],
    );
  }
}
