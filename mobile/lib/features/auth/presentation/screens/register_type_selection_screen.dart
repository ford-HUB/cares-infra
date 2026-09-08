import 'package:flutter/material.dart';
import 'package:mobile/core/constants/app_copy.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/auth/domain/registration_role_type.dart';
import 'package:mobile/features/auth/domain/volunteer_type.dart';
import 'package:mobile/features/auth/presentation/screens/register_donor_screen.dart';
import 'package:mobile/features/auth/presentation/screens/register_flow_screen.dart';
import 'package:mobile/features/auth/presentation/screens/register_role_placeholder_screen.dart';
import 'package:mobile/features/auth/presentation/widgets/registration_role_option_card.dart';

/// First step of registration — pick volunteer, donor, or beneficiary.
class RegisterTypeSelectionScreen extends StatefulWidget {
  const RegisterTypeSelectionScreen({super.key});

  @override
  State<RegisterTypeSelectionScreen> createState() =>
      _RegisterTypeSelectionScreenState();
}

class _RegisterTypeSelectionScreenState
    extends State<RegisterTypeSelectionScreen> {
  static const _roleAccents = {
    RegistrationRoleType.volunteer: AppColors.primary,
    RegistrationRoleType.donor: AppColors.heart,
    RegistrationRoleType.beneficiary: Color(0xFF42A5F5),
  };

  bool _volunteerExpanded = false;
  VolunteerType _selectedVolunteerType = VolunteerType.student;

  void _onRoleSelected(RegistrationRoleType roleType) {
    if (roleType == RegistrationRoleType.volunteer) {
      setState(() => _volunteerExpanded = !_volunteerExpanded);
      return;
    }

    if (roleType == RegistrationRoleType.beneficiary) {
      Navigator.of(context).push(
        MaterialPageRoute<void>(
          builder: (_) => const RegisterFlowScreen(
            roleType: RegistrationRoleType.beneficiary,
          ),
        ),
      );
      return;
    }

    if (roleType == RegistrationRoleType.donor) {
      Navigator.of(context).push(
        MaterialPageRoute<void>(
          builder: (_) => const RegisterDonorScreen(),
        ),
      );
      return;
    }

    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => RegisterRolePlaceholderScreen(roleType: roleType),
      ),
    );
  }

  void _startVolunteerRegistration() {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => RegisterFlowScreen(
          roleType: RegistrationRoleType.volunteer,
          volunteerType: _selectedVolunteerType,
        ),
      ),
    );
  }

  Widget _volunteerExpandedContent() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Divider(height: 1, color: Color(0xFFE6EFE3)),
          const SizedBox(height: 16),
          Text(
            'TYPE OF VOLUNTEER',
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w800,
              letterSpacing: 1,
              color: AppColors.secondary.withValues(alpha: 0.9),
            ),
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              for (final type in VolunteerType.values) ...[
                Expanded(
                  child: _VolunteerTypeChip(
                    label: type.label,
                    isSelected: _selectedVolunteerType == type,
                    onTap: () =>
                        setState(() => _selectedVolunteerType = type),
                  ),
                ),
                if (type != VolunteerType.values.last)
                  const SizedBox(width: 8),
              ],
            ],
          ),
          const SizedBox(height: 10),
          Text(
            _volunteerTypeHint,
            style: TextStyle(
              fontSize: 12.5,
              height: 1.35,
              color: AppColors.secondary.withValues(alpha: 0.85),
            ),
          ),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: _startVolunteerRegistration,
            child: const Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text('Continue to ID upload'),
                SizedBox(width: 8),
                Icon(Icons.arrow_forward_rounded, size: 18),
              ],
            ),
          ),
        ],
      ),
    );
  }

  String get _volunteerTypeHint => switch (_selectedVolunteerType) {
    VolunteerType.student =>
      'You will upload your school ID and confirm your course and year level.',
    VolunteerType.staff =>
      'You will upload your school ID and confirm your department.',
    VolunteerType.alumni =>
      'You will upload your school ID and confirm your course and graduation year.',
  };

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: Column(
        children: [
          const _RegisterHeader(),
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(20, 24, 20, 28),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    children: [
                      Text(
                        'CHOOSE YOUR ROLE',
                        style: TextStyle(
                          fontSize: 11.5,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 1.1,
                          color: AppColors.secondary.withValues(alpha: 0.9),
                        ),
                      ),
                      const SizedBox(width: 10),
                      const Expanded(
                        child: Divider(height: 1, color: Color(0xFFE6EFE3)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  for (final roleType in RegistrationRoleType.values) ...[
                    RegistrationRoleOptionCard(
                      roleType: roleType,
                      accentColor: _roleAccents[roleType]!,
                      isExpanded:
                          roleType == RegistrationRoleType.volunteer &&
                          _volunteerExpanded,
                      expandedChild: roleType == RegistrationRoleType.volunteer
                          ? _volunteerExpandedContent()
                          : null,
                      onTap: () => _onRoleSelected(roleType),
                    ),
                    const SizedBox(height: 14),
                  ],
                  const SizedBox(height: 10),
                  Text(
                    AppCopy.slogan,
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.3,
                      color: AppColors.textMuted.withValues(alpha: 0.9),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Green gradient band at the top of the role picker. It keeps the brand colour
/// in one bounded place so the cards below can sit on plain white.
class _RegisterHeader extends StatelessWidget {
  const _RegisterHeader();

  @override
  Widget build(BuildContext context) {
    final topInset = MediaQuery.paddingOf(context).top;

    return Container(
      width: double.infinity,
      padding: EdgeInsets.fromLTRB(20, topInset + 8, 20, 28),
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            AppColors.primaryDark,
            AppColors.primary,
            AppColors.secondary,
          ],
        ),
        borderRadius: BorderRadius.vertical(bottom: Radius.circular(28)),
        boxShadow: [
          BoxShadow(
            color: Color(0x2E1F5F28),
            blurRadius: 22,
            offset: Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              IconButton(
                onPressed: () => Navigator.of(context).maybePop(),
                icon: const Icon(Icons.arrow_back_rounded),
                color: Colors.white,
                tooltip: 'Back',
              ),
              const SizedBox(width: 4),
              const Text(
                'Create account',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: Colors.white,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          const Text(
            'How are you joining CARES?',
            style: TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.w800,
              color: Colors.white,
              height: 1.25,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Each role has its own registration process. '
            'Choose the one that fits you.',
            style: TextStyle(
              fontSize: 13.5,
              height: 1.45,
              color: Color(0xFFE3F2E4),
            ),
          ),
        ],
      ),
    );
  }
}

/// One of the three volunteer sub-types, as a tappable pill.
class _VolunteerTypeChip extends StatelessWidget {
  const _VolunteerTypeChip({
    required this.label,
    required this.isSelected,
    required this.onTap,
  });

  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          padding: const EdgeInsets.symmetric(vertical: 12),
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: isSelected ? AppColors.primary : Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isSelected ? AppColors.primary : const Color(0xFFD9E7D6),
              width: isSelected ? 1.5 : 1,
            ),
          ),
          child: Text(
            label,
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w700,
              color: isSelected ? Colors.white : AppColors.primaryDark,
            ),
          ),
        ),
      ),
    );
  }
}
