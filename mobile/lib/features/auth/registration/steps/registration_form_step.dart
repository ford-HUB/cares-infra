import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../shared/widgets/auth_text_field.dart';
import '../data/academic_options.dart';
import '../models/registration_data.dart';
import '../utils/password_strength.dart';
import '../widgets/password_strength_indicator.dart';
import '../widgets/registration_section_card.dart';

class RegistrationFormStep extends StatefulWidget {
  const RegistrationFormStep({
    super.key,
    required this.data,
    required this.formKey,
  });

  final RegistrationData data;
  final GlobalKey<FormState> formKey;

  @override
  State<RegistrationFormStep> createState() => _RegistrationFormStepState();
}

class _RegistrationFormStepState extends State<RegistrationFormStep> {
  late final TextEditingController _firstNameController;
  late final TextEditingController _lastNameController;
  late final TextEditingController _emailController;
  late final TextEditingController _phoneController;
  late final TextEditingController _schoolIdController;
  late final TextEditingController _passwordController;
  late final TextEditingController _confirmPasswordController;
  bool _obscurePassword = true;
  bool _obscureConfirm = true;

  RegistrationData get data => widget.data;

  @override
  void initState() {
    super.initState();
    _firstNameController = TextEditingController(text: data.firstName);
    _lastNameController = TextEditingController(text: data.lastName);
    _emailController = TextEditingController(text: data.email);
    _phoneController = TextEditingController(text: data.phoneNumber);
    _schoolIdController = TextEditingController(text: data.schoolIdNumber);
    _passwordController = TextEditingController(text: data.password);
    _confirmPasswordController = TextEditingController(text: data.confirmPassword);
    _passwordController.addListener(_syncPassword);
  }

  void _syncPassword() => setState(() {});

  void _syncToData() {
    data.firstName = _firstNameController.text.trim();
    data.lastName = _lastNameController.text.trim();
    data.email = _emailController.text.trim();
    data.phoneNumber = _phoneController.text.trim();
    data.schoolIdNumber = _schoolIdController.text.trim();
    data.password = _passwordController.text;
    data.confirmPassword = _confirmPasswordController.text;
  }

  @override
  void dispose() {
    _firstNameController.dispose();
    _lastNameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _schoolIdController.dispose();
    _passwordController.removeListener(_syncPassword);
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  InputDecoration _dropdownDecoration(String label) {
    return InputDecoration(
      labelText: label,
      filled: true,
      fillColor: AppColors.inputFill,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide.none,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final courses = coursesForDepartment(data.department);

    return Form(
      key: widget.formKey,
      autovalidateMode: AutovalidateMode.onUserInteraction,
      onChanged: _syncToData,
      child: Column(
        children: [
          RegistrationSectionCard(
            title: 'Personal Information',
            children: [
              AuthTextField(
                controller: _firstNameController,
                label: 'First Name',
                icon: Icons.person_outline_rounded,
                textInputAction: TextInputAction.next,
                validator: (v) =>
                    v == null || v.trim().isEmpty ? 'First name is required' : null,
              ),
              const SizedBox(height: 16),
              AuthTextField(
                controller: _lastNameController,
                label: 'Last Name',
                icon: Icons.person_outline_rounded,
                textInputAction: TextInputAction.next,
                validator: (v) =>
                    v == null || v.trim().isEmpty ? 'Last name is required' : null,
              ),
              const SizedBox(height: 16),
              AuthTextField(
                controller: _emailController,
                label: 'Email Address',
                hintText: 'you@example.com',
                icon: Icons.mail_outline_rounded,
                keyboardType: TextInputType.emailAddress,
                textInputAction: TextInputAction.next,
                validator: (v) {
                  if (v == null || v.trim().isEmpty) return 'Email is required';
                  if (!v.contains('@')) return 'Enter a valid email address';
                  return null;
                },
              ),
              const SizedBox(height: 16),
              AuthTextField(
                controller: _phoneController,
                label: 'Phone Number',
                icon: Icons.phone_outlined,
                keyboardType: TextInputType.phone,
                textInputAction: TextInputAction.next,
                validator: (v) =>
                    v == null || v.trim().isEmpty ? 'Phone number is required' : null,
              ),
              const SizedBox(height: 16),
              AuthTextField(
                controller: _schoolIdController,
                label: 'School ID Number',
                icon: Icons.badge_outlined,
                textInputAction: TextInputAction.next,
                validator: (v) =>
                    v == null || v.trim().isEmpty ? 'School ID is required' : null,
              ),
            ],
          ),
          const SizedBox(height: 16),
          RegistrationSectionCard(
            title: 'Academic Information',
            children: [
              DropdownButtonFormField<String>(
                initialValue: data.department,
                decoration: _dropdownDecoration('Department'),
                hint: const Text('Select department'),
                items: kDepartmentCourses.keys
                    .map((d) => DropdownMenuItem(value: d, child: Text(d)))
                    .toList(),
                onChanged: (value) {
                  setState(() {
                    data.department = value;
                    data.resetCourseSelection();
                  });
                },
                validator: (v) =>
                    v == null || v.isEmpty ? 'Department is required' : null,
              ),
              const SizedBox(height: 16),
              DropdownButtonFormField<String>(
                initialValue: data.course,
                decoration: _dropdownDecoration('Course/Program'),
                hint: Text(
                  data.department == null
                      ? 'Select a department first'
                      : 'Select course/program',
                ),
                items: courses
                    .map((c) => DropdownMenuItem(value: c, child: Text(c)))
                    .toList(),
                onChanged: data.department == null
                    ? null
                    : (value) => setState(() => data.course = value),
                validator: (v) =>
                    v == null || v.isEmpty ? 'Course/Program is required' : null,
              ),
              const SizedBox(height: 16),
              DropdownButtonFormField<String>(
                initialValue: data.yearLevel,
                decoration: _dropdownDecoration('Year Level'),
                hint: const Text('Select year level'),
                items: kYearLevels
                    .map((y) => DropdownMenuItem(value: y, child: Text(y)))
                    .toList(),
                onChanged: (value) => setState(() => data.yearLevel = value),
                validator: (v) =>
                    v == null || v.isEmpty ? 'Year level is required' : null,
              ),
            ],
          ),
          const SizedBox(height: 16),
          RegistrationSectionCard(
            title: 'Account Security',
            children: [
              AuthTextField(
                controller: _passwordController,
                label: 'Password',
                hintText: '********',
                icon: Icons.lock_outline_rounded,
                obscureText: _obscurePassword,
                textInputAction: TextInputAction.next,
                suffixIcon: IconButton(
                  icon: Icon(
                    _obscurePassword
                        ? Icons.visibility_off_outlined
                        : Icons.visibility_outlined,
                    color: AppColors.textMuted,
                    size: 22,
                  ),
                  onPressed: () =>
                      setState(() => _obscurePassword = !_obscurePassword),
                ),
                validator: validatePassword,
              ),
              const SizedBox(height: 10),
              PasswordStrengthIndicator(password: _passwordController.text),
              const SizedBox(height: 16),
              AuthTextField(
                controller: _confirmPasswordController,
                label: 'Re-enter Password',
                hintText: '********',
                icon: Icons.lock_outline_rounded,
                obscureText: _obscureConfirm,
                textInputAction: TextInputAction.done,
                suffixIcon: IconButton(
                  icon: Icon(
                    _obscureConfirm
                        ? Icons.visibility_off_outlined
                        : Icons.visibility_outlined,
                    color: AppColors.textMuted,
                    size: 22,
                  ),
                  onPressed: () =>
                      setState(() => _obscureConfirm = !_obscureConfirm),
                ),
                validator: (v) =>
                    validateConfirmPassword(v, _passwordController.text),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
