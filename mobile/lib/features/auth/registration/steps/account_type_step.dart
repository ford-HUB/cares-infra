import 'package:flutter/material.dart';
import '../models/registration_data.dart';
import '../widgets/registration_option_card.dart';

class AccountTypeStep extends StatelessWidget {
  const AccountTypeStep({
    super.key,
    required this.selectedType,
    required this.onTypeSelected,
  });

  final AccountType? selectedType;
  final ValueChanged<AccountType> onTypeSelected;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        RegistrationOptionCard(
          title: 'Regular User',
          description:
              'For students, staff, and faculty members who want to participate in community outreach programs, donations, and extension services.',
          icon: Icons.groups_rounded,
          isSelected: selectedType == AccountType.regularUser,
          onTap: () => onTypeSelected(AccountType.regularUser),
        ),
        const SizedBox(height: 16),
        RegistrationOptionCard(
          title: 'Beneficiary',
          description:
              'For individuals or groups applying for assistance and support through community programs.',
          icon: Icons.volunteer_activism_rounded,
          isSelected: selectedType == AccountType.beneficiary,
          onTap: () => onTypeSelected(AccountType.beneficiary),
        ),
      ],
    );
  }
}
