import 'package:flutter/material.dart';
import '../models/registration_data.dart';
import '../widgets/registration_option_card.dart';

class UserRoleStep extends StatelessWidget {
  const UserRoleStep({
    super.key,
    required this.selectedRole,
    required this.onRoleSelected,
  });

  final UserRole? selectedRole;
  final ValueChanged<UserRole> onRoleSelected;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        RegistrationOptionCard(
          title: 'Student',
          description:
              'Enrolled students participating in outreach, donations, and extension activities.',
          icon: Icons.school_outlined,
          isSelected: selectedRole == UserRole.student,
          onTap: () => onRoleSelected(UserRole.student),
        ),
        const SizedBox(height: 12),
        RegistrationOptionCard(
          title: 'Staff',
          description:
              'University staff supporting community programs and extension services.',
          icon: Icons.badge_outlined,
          isSelected: selectedRole == UserRole.staff,
          onTap: () => onRoleSelected(UserRole.staff),
        ),
        const SizedBox(height: 12),
        RegistrationOptionCard(
          title: 'Faculty',
          description:
              'Faculty members leading and participating in community engagement initiatives.',
          icon: Icons.menu_book_outlined,
          isSelected: selectedRole == UserRole.faculty,
          onTap: () => onRoleSelected(UserRole.faculty),
        ),
      ],
    );
  }
}
