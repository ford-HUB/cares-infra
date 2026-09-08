import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';
import '../../presentation/widgets/register_form_field.dart';
import '../models/registration_data.dart';
import '../utils/password_strength.dart';
import '../widgets/password_strength_indicator.dart';
import '../../presentation/widgets/registration_form_card.dart';

/// Beneficiary sign-up form, built on the same pattern as the donor form:
/// gradient hero panel, then one white card per idea — name, who you are,
/// organization details (only when relevant), sign-in details.
class BeneficiaryRegistrationFormStep extends StatefulWidget {
  const BeneficiaryRegistrationFormStep({
    super.key,
    required this.data,
    required this.formKey,
    required this.onChanged,
  });

  final RegistrationData data;
  final GlobalKey<FormState> formKey;
  final VoidCallback onChanged;

  @override
  State<BeneficiaryRegistrationFormStep> createState() =>
      _BeneficiaryRegistrationFormStepState();
}

class _BeneficiaryRegistrationFormStepState
    extends State<BeneficiaryRegistrationFormStep> {
  late final TextEditingController _firstNameController;
  late final TextEditingController _middleNameController;
  late final TextEditingController _lastNameController;
  late final TextEditingController _organizationController;
  late final TextEditingController _organizationRoleController;
  late final TextEditingController _organizationAddressController;
  late final TextEditingController _emailController;
  late final TextEditingController _passwordController;
  late final TextEditingController _confirmPasswordController;

  bool _obscurePassword = true;
  bool _obscureConfirmPassword = true;

  static const List<String> _organizationTypes = [
    'Non-profit / NGO',
    "People's Organization",
    'School / Academic Institution',
    'Barangay / LGU Unit',
    'Religious Group',
    'Other',
  ];

  RegistrationData get data => widget.data;

  bool get _passwordsMatch =>
      _confirmPasswordController.text == _passwordController.text;

  @override
  void initState() {
    super.initState();
    _firstNameController = TextEditingController(text: data.firstName);
    _middleNameController = TextEditingController(text: data.middleName);
    _lastNameController = TextEditingController(text: data.lastName);
    _organizationController = TextEditingController(
      text: data.organizationName,
    );
    _organizationRoleController = TextEditingController(
      text: data.organizationRole,
    );
    _organizationAddressController = TextEditingController(
      text: data.organizationAddress,
    );
    _emailController = TextEditingController(text: data.email);
    _passwordController = TextEditingController(text: data.password);
    _confirmPasswordController = TextEditingController(
      text: data.confirmPassword,
    );
  }

  @override
  void dispose() {
    _firstNameController.dispose();
    _middleNameController.dispose();
    _lastNameController.dispose();
    _organizationController.dispose();
    _organizationRoleController.dispose();
    _organizationAddressController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  void _syncToData() {
    data.firstName = _firstNameController.text.trim();
    data.middleName = _middleNameController.text.trim();
    data.lastName = _lastNameController.text.trim();
    data.email = _emailController.text.trim();
    data.password = _passwordController.text;
    data.confirmPassword = _confirmPasswordController.text;
    if (data.isOrganizationMember) {
      data.organizationName = _organizationController.text.trim();
      data.organizationRole = _organizationRoleController.text.trim();
      data.organizationAddress = _organizationAddressController.text.trim();
    }
  }

  void _onFieldChanged(String _) {
    _syncToData();
    setState(() {});
    widget.onChanged();
  }

  void _selectBeneficiaryType(BeneficiaryType type) {
    data.beneficiaryType = type;
    if (type == BeneficiaryType.individual) {
      data.clearOrganizationFields();
      _organizationController.clear();
      _organizationRoleController.clear();
      _organizationAddressController.clear();
    }
    setState(() {});
    widget.onChanged();
  }

  @override
  Widget build(BuildContext context) {
    return Form(
      key: widget.formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const RegistrationHeroPanel(
            icon: Icons.volunteer_activism_rounded,
            title: 'Register as a beneficiary',
            subtitle: 'Just the basics — takes about a minute.',
            highlights: [
              (Icons.assignment_turned_in_outlined, 'Apply for assistance programs'),
              (Icons.groups_2_outlined, 'Register on your own or for a group'),
              (Icons.notifications_active_outlined, 'Get updates on your requests'),
            ],
          ),
          const SizedBox(height: 20),
          _nameSection(),
          const SizedBox(height: 16),
          _typeSection(),
          if (data.isOrganizationMember) ...[
            const SizedBox(height: 16),
            _organizationSection(),
          ],
          const SizedBox(height: 16),
          _accountSection(),
        ],
      ),
    );
  }

  Widget _nameSection() {
    return RegistrationFormCard(
      icon: Icons.badge_outlined,
      title: 'Your name',
      subtitle: 'Use the name that appears on your valid ID.',
      children: [
        RegisterFormField(
          label: 'First Name',
          controller: _firstNameController,
          textInputAction: TextInputAction.next,
          onChanged: _onFieldChanged,
        ),
        const SizedBox(height: 14),
        RegisterFormField(
          label: 'Middle Name',
          hint: 'Optional',
          controller: _middleNameController,
          textInputAction: TextInputAction.next,
          onChanged: _onFieldChanged,
        ),
        const SizedBox(height: 14),
        RegisterFormField(
          label: 'Last Name',
          controller: _lastNameController,
          textInputAction: TextInputAction.next,
          onChanged: _onFieldChanged,
        ),
      ],
    );
  }

  Widget _typeSection() {
    return RegistrationFormCard(
      icon: Icons.people_outline_rounded,
      title: 'Who are you registering as?',
      subtitle: 'Pick one — an organization adds a few extra details.',
      children: [
        RegistrationChoiceTile(
          icon: Icons.person_outline_rounded,
          title: 'Individual',
          description: 'You are applying for assistance for yourself.',
          isSelected: data.beneficiaryType == BeneficiaryType.individual,
          onTap: () => _selectBeneficiaryType(BeneficiaryType.individual),
        ),
        const SizedBox(height: 12),
        RegistrationChoiceTile(
          icon: Icons.business_outlined,
          title: 'Organization',
          description: 'You represent a group, association, or institution.',
          isSelected:
              data.beneficiaryType == BeneficiaryType.organizationMember,
          onTap: () =>
              _selectBeneficiaryType(BeneficiaryType.organizationMember),
        ),
        if (data.beneficiaryType == null) ...[
          const SizedBox(height: 10),
          const Text(
            'Select one to continue.',
            style: TextStyle(fontSize: 12, color: AppColors.textMuted),
          ),
        ],
      ],
    );
  }

  Widget _organizationSection() {
    return RegistrationFormCard(
      icon: Icons.apartment_outlined,
      title: 'Organization details',
      subtitle: 'Tell us about the group you are registering for.',
      children: [
        RegisterFormField(
          label: 'Organization Name',
          hint: 'e.g. Barangay Malinis Women’s Association',
          controller: _organizationController,
          textInputAction: TextInputAction.next,
          onChanged: _onFieldChanged,
        ),
        const SizedBox(height: 14),
        _organizationTypeField(),
        const SizedBox(height: 14),
        RegisterFormField(
          label: 'Your Role in the Organization',
          hint: 'e.g. President, Secretary, Member',
          controller: _organizationRoleController,
          textInputAction: TextInputAction.next,
          onChanged: _onFieldChanged,
        ),
        const SizedBox(height: 14),
        RegisterFormField(
          label: 'Organization Address',
          hint: 'Where the organization operates',
          controller: _organizationAddressController,
          textInputAction: TextInputAction.next,
          onChanged: _onFieldChanged,
        ),
      ],
    );
  }

  Widget _organizationTypeField() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          'Organization Type',
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: AppColors.secondary.withValues(alpha: 0.95),
          ),
        ),
        const SizedBox(height: 6),
        DropdownButtonFormField<String>(
          initialValue: data.organizationType,
          isExpanded: true,
          hint: const Text('Select organization type'),
          items: _organizationTypes
              .map((type) => DropdownMenuItem(value: type, child: Text(type)))
              .toList(),
          onChanged: (value) {
            data.organizationType = value;
            setState(() {});
            widget.onChanged();
          },
        ),
      ],
    );
  }

  Widget _accountSection() {
    final password = _passwordController.text;
    final confirm = _confirmPasswordController.text;

    return RegistrationFormCard(
      icon: Icons.lock_outline_rounded,
      title: 'Sign-in details',
      subtitle: 'Used every time you sign in to CARES.',
      children: [
        RegisterFormField(
          label: 'Email',
          controller: _emailController,
          keyboardType: TextInputType.emailAddress,
          textInputAction: TextInputAction.next,
          onChanged: _onFieldChanged,
        ),
        const SizedBox(height: 14),
        RegisterFormField(
          label: 'Password',
          controller: _passwordController,
          obscureText: _obscurePassword,
          textInputAction: TextInputAction.next,
          onChanged: _onFieldChanged,
          suffixIcon: IconButton(
            icon: Icon(
              _obscurePassword
                  ? Icons.visibility_outlined
                  : Icons.visibility_off_outlined,
            ),
            onPressed: () =>
                setState(() => _obscurePassword = !_obscurePassword),
          ),
        ),
        const SizedBox(height: 10),
        PasswordStrengthIndicator(password: password),
        const SizedBox(height: 10),
        PasswordRuleChips(password: password),
        const SizedBox(height: 14),
        RegisterFormField(
          label: 'Confirm Password',
          controller: _confirmPasswordController,
          obscureText: _obscureConfirmPassword,
          textInputAction: TextInputAction.done,
          onChanged: _onFieldChanged,
          suffixIcon: IconButton(
            icon: Icon(
              _obscureConfirmPassword
                  ? Icons.visibility_outlined
                  : Icons.visibility_off_outlined,
            ),
            onPressed: () => setState(
              () => _obscureConfirmPassword = !_obscureConfirmPassword,
            ),
          ),
        ),
        if (confirm.isNotEmpty) ...[
          const SizedBox(height: 8),
          PasswordMatchNote(matches: _passwordsMatch),
        ],
        if (password.isNotEmpty && validatePassword(password) != null) ...[
          const SizedBox(height: 8),
          Text(
            validatePassword(password)!,
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: AppColors.heart,
            ),
          ),
        ],
      ],
    );
  }
}
