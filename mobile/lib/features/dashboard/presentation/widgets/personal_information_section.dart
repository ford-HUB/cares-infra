import 'package:flutter/material.dart';
import 'package:mobile/core/theme/app_theme.dart';

class PersonalInformationSection extends StatelessWidget {
  const PersonalInformationSection({
    super.key,
    required this.firstNameController,
    required this.lastNameController,
    required this.emailController,
    required this.phoneController,
    required this.idNumberController,
    required this.department,
    required this.course,
  });

  final TextEditingController firstNameController;
  final TextEditingController lastNameController;
  final TextEditingController emailController;
  final TextEditingController phoneController;
  final TextEditingController idNumberController;
  final String? department;
  final String? course;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.fieldBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Personal Information',
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w800,
              color: AppColors.primaryDark,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Update your account details.',
            style: TextStyle(
              fontSize: 12,
              height: 1.35,
              color: AppColors.secondary.withValues(alpha: 0.95),
            ),
          ),
          const SizedBox(height: 16),
          _FieldLabel('First name'),
          const SizedBox(height: 6),
          _ProfileTextField(
            controller: firstNameController,
            hint: 'First name',
            textCapitalization: TextCapitalization.words,
          ),
          const SizedBox(height: 12),
          _FieldLabel('Last name'),
          const SizedBox(height: 6),
          _ProfileTextField(
            controller: lastNameController,
            hint: 'Last name',
            textCapitalization: TextCapitalization.words,
          ),
          const SizedBox(height: 12),
          _FieldLabel('Email'),
          const SizedBox(height: 6),
          _ProfileTextField(
            controller: emailController,
            hint: 'email@example.com',
            keyboardType: TextInputType.emailAddress,
            readOnly: true,
          ),
          const SizedBox(height: 12),
          _FieldLabel('Phone number'),
          const SizedBox(height: 6),
          _ProfileTextField(
            controller: phoneController,
            hint: '09XX XXX XXXX',
            keyboardType: TextInputType.phone,
          ),
          const SizedBox(height: 12),
          _FieldLabel('ID number'),
          const SizedBox(height: 6),
          _ProfileTextField(
            controller: idNumberController,
            hint: 'e.g. 2021-00123',
            readOnly: true,
          ),
          const SizedBox(height: 12),
          _FieldLabel('Department'),
          const SizedBox(height: 6),
          _ReadOnlyValueField(value: department, hint: 'Not set'),
          const SizedBox(height: 12),
          _FieldLabel('Course'),
          const SizedBox(height: 6),
          _ReadOnlyValueField(value: course, hint: 'Not set'),
        ],
      ),
    );
  }
}

class _FieldLabel extends StatelessWidget {
  const _FieldLabel(this.label);

  final String label;

  @override
  Widget build(BuildContext context) {
    return Text(
      label,
      style: TextStyle(
        fontSize: 12,
        fontWeight: FontWeight.w600,
        color: AppColors.secondary.withValues(alpha: 0.95),
      ),
    );
  }
}

class _ReadOnlyValueField extends StatelessWidget {
  const _ReadOnlyValueField({required this.value, required this.hint});

  final String? value;
  final String hint;

  @override
  Widget build(BuildContext context) {
    final display = value?.trim();
    final hasValue = display != null && display.isNotEmpty;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
      decoration: BoxDecoration(
        color: AppColors.light.withValues(alpha: 0.35),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        hasValue ? display : hint,
        style: TextStyle(
          fontSize: 14,
          height: 1.4,
          fontWeight: hasValue ? FontWeight.w500 : FontWeight.w400,
          color: hasValue
              ? AppColors.primaryDark
              : AppColors.secondary.withValues(alpha: 0.75),
        ),
        softWrap: true,
      ),
    );
  }
}

class _ProfileTextField extends StatelessWidget {
  const _ProfileTextField({
    required this.controller,
    required this.hint,
    this.keyboardType,
    this.textCapitalization = TextCapitalization.none,
    this.readOnly = false,
  });

  final TextEditingController controller;
  final String hint;
  final TextInputType? keyboardType;
  final TextCapitalization textCapitalization;
  final bool readOnly;

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      keyboardType: keyboardType,
      textCapitalization: textCapitalization,
      readOnly: readOnly,
      decoration: InputDecoration(
        hintText: hint,
        filled: true,
        fillColor: readOnly
            ? AppColors.light.withValues(alpha: 0.35)
            : AppColors.inputFill,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 14,
          vertical: 14,
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide.none,
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
        ),
        hintStyle: TextStyle(
          color: AppColors.secondary.withValues(alpha: 0.75),
          fontSize: 14,
        ),
      ),
    );
  }
}
