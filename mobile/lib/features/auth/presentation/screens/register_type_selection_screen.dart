import 'package:flutter/material.dart';
import 'package:mobile/core/constants/app_copy.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/auth/domain/registration_role_type.dart';
import 'package:mobile/features/auth/domain/volunteer_type.dart';
import 'package:mobile/features/auth/presentation/screens/register_flow_screen.dart';
import 'package:mobile/features/auth/presentation/screens/register_role_placeholder_screen.dart';
import 'package:mobile/features/auth/presentation/widgets/animated_illustration.dart';
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
          const Divider(height: 1),
          const SizedBox(height: 16),
          Text(
            'Type of volunteer',
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: AppColors.secondary.withValues(alpha: 0.95),
            ),
          ),
          const SizedBox(height: 8),
          DropdownButtonFormField<VolunteerType>(
            isExpanded: true,
            initialValue: _selectedVolunteerType,
            decoration: const InputDecoration(hintText: 'Select type'),
            items: VolunteerType.values
                .map(
                  (type) => DropdownMenuItem(
                    value: type,
                    child: Text(type.label, overflow: TextOverflow.ellipsis),
                  ),
                )
                .toList(),
            selectedItemBuilder: (context) => VolunteerType.values
                .map(
                  (type) => Align(
                    alignment: Alignment.centerLeft,
                    child: Text(type.label, overflow: TextOverflow.ellipsis),
                  ),
                )
                .toList(),
            onChanged: (value) {
              if (value == null) return;
              setState(() => _selectedVolunteerType = value);
            },
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _startVolunteerRegistration,
              child: const Text('Continue to ID upload'),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        foregroundColor: AppColors.primary,
        title: const Text(
          'Create account',
          style: TextStyle(fontWeight: FontWeight.w700),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Center(child: AnimatedIllustration(progress: 1, size: 100)),
              const SizedBox(height: 20),
              const Text(
                'How are you joining CARES?',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                  color: AppColors.primaryDark,
                  height: 1.25,
                ),
              ),
              const SizedBox(height: 10),
              Text(
                'Each role has its own registration process. Choose the one that fits you.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 14,
                  height: 1.45,
                  color: AppColors.secondary.withValues(alpha: 0.95),
                ),
              ),
              const SizedBox(height: 28),
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
                const SizedBox(height: 12),
              ],
              const SizedBox(height: 8),
              Text(
                AppCopy.slogan,
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: AppColors.light.withValues(alpha: 0.95),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
