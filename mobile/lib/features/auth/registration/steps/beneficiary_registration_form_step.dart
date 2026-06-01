import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../shared/widgets/auth_text_field.dart';
import '../models/registration_data.dart';
import '../widgets/image_upload_card.dart';
import '../widgets/registration_section_card.dart';

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
  late final TextEditingController _addressController;
  late final TextEditingController _phoneController;
  late final TextEditingController _emailController;
  late final TextEditingController _organizationController;

  static const List<String> _genders = [
    'Male', 'Female',
    'Prefer not to say'];

  RegistrationData get data => widget.data;

  @override
  void initState() {
    super.initState();
    _firstNameController = TextEditingController(text: data.firstName);
    _middleNameController = TextEditingController(text: data.middleName);
    _lastNameController = TextEditingController(text: data.lastName);
    _addressController = TextEditingController(text: data.address);
    _phoneController = TextEditingController(text: data.phoneNumber);
    _emailController = TextEditingController(text: data.email);
    _organizationController = TextEditingController(
      text: data.organizationName,
    );
  }

  void _syncToData() {
    data.firstName = _firstNameController.text.trim();
    data.middleName = _middleNameController.text.trim();
    data.lastName = _lastNameController.text.trim();
    data.address = _addressController.text.trim();
    data.phoneNumber = _phoneController.text.trim();
    data.email = _emailController.text.trim();
    if (data.isOrganizationMember) {
      data.organizationName = _organizationController.text.trim();
    }
  }

  Future<void> _pickDateOfBirth() async {
    final now = DateTime.now();
    final initial = data.dateOfBirth != null
        ? DateTime.tryParse(data.dateOfBirth!) ??
              DateTime(now.year - 25, now.month, now.day)
        : DateTime(now.year - 25, now.month, now.day);

    final picked = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: DateTime(1900),
      lastDate: now,
      helpText: 'Select date of birth',
    );

    if (picked != null) {
      setState(() {
        data.dateOfBirth =
            '${picked.year}-${picked.month.toString().padLeft(2, '0')}-${picked.day.toString().padLeft(2, '0')}';
      });
      widget.onChanged();
    }
  }

  String _formatDisplayDate(String? iso) {
    if (iso == null) return '';
    final parsed = DateTime.tryParse(iso);
    if (parsed == null) return iso;
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    return '${months[parsed.month - 1]} ${parsed.day}, ${parsed.year}';
  }

  InputDecoration _boxedDecoration({Widget? suffixIcon}) {
    return InputDecoration(
      filled: true,
      fillColor: AppColors.inputFill,
      suffixIcon: suffixIcon,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
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
        borderSide: BorderSide(
          color: AppColors.primary.withValues(alpha: 0.5),
          width: 1.5,
        ),
      ),
    );
  }

  @override
  void dispose() {
    _firstNameController.dispose();
    _middleNameController.dispose();
    _lastNameController.dispose();
    _addressController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    _organizationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
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
                validator: (v) => v == null || v.trim().isEmpty
                    ? 'First name is required'
                    : null,
              ),
              const SizedBox(height: 16),
              AuthTextField(
                controller: _middleNameController,
                label: 'Middle Name (optional)',
                icon: Icons.person_outline_rounded,
                textInputAction: TextInputAction.next,
              ),
              const SizedBox(height: 16),
              AuthTextField(
                controller: _lastNameController,
                label: 'Last Name',
                icon: Icons.person_outline_rounded,
                textInputAction: TextInputAction.next,
                validator: (v) => v == null || v.trim().isEmpty
                    ? 'Last name is required'
                    : null,
              ),
              const SizedBox(height: 16),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Date of Birth',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                      color: AppColors.textSecondary,
                    ),
                  ),
                  const SizedBox(height: 8),
                  InkWell(
                    onTap: _pickDateOfBirth,
                    borderRadius: BorderRadius.circular(12),
                    child: InputDecorator(
                      decoration: _boxedDecoration(
                        suffixIcon: const Icon(
                          Icons.calendar_today_outlined,
                          color: AppColors.textMuted,
                          size: 20,
                        ),
                      ),
                      child: Text(
                        data.dateOfBirth != null
                            ? _formatDisplayDate(data.dateOfBirth)
                            : 'Select your date of birth',
                        style: TextStyle(
                          fontSize: 15,
                          color: data.dateOfBirth != null
                              ? AppColors.textPrimary
                              : AppColors.textMuted,
                        ),
                      ),
                    ),
                  ),
                  if (data.dateOfBirth == null)
                    const Padding(
                      padding: EdgeInsets.only(top: 6),
                      child: Text(
                        'Date of birth is required',
                        style: TextStyle(
                          fontSize: 12,
                          color: AppColors.secondary,
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 16),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Gender',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                      color: AppColors.textSecondary,
                    ),
                  ),
                  const SizedBox(height: 8),
                  DropdownButtonFormField<String>(
                    initialValue: data.gender,
                    decoration: _boxedDecoration(),
                    hint: const Text('Select gender'),
                    items: _genders
                        .map((g) => DropdownMenuItem(value: g, child: Text(g)))
                        .toList(),
                    onChanged: (value) {
                      setState(() => data.gender = value);
                      widget.onChanged();
                    },
                    validator: (v) =>
                        v == null || v.isEmpty ? 'Gender is required' : null,
                  ),
                ],
              ),
              const SizedBox(height: 16),
              AuthTextField(
                controller: _addressController,
                label: 'Address',
                icon: Icons.location_on_outlined,
                textInputAction: TextInputAction.next,
                validator: (v) => v == null || v.trim().isEmpty
                    ? 'Address is required'
                    : null,
              ),
              const SizedBox(height: 16),
              AuthTextField(
                controller: _phoneController,
                label: 'Contact Number',
                hintText: '09123456789',
                icon: Icons.phone_outlined,
                keyboardType: TextInputType.phone,
                textInputAction: TextInputAction.next,
                validator: (v) => v == null || v.trim().isEmpty
                    ? 'Contact number is required'
                    : null,
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
                  if (v == null || v.trim().isEmpty) {
                    return 'Email address is required';
                  }
                  if (!v.contains('@')) return 'Enter a valid email address';
                  return null;
                },
              ),
              if (data.isOrganizationMember) ...[
                const SizedBox(height: 16),
                AuthTextField(
                  controller: _organizationController,
                  label: 'Organization Name',
                  icon: Icons.apartment_outlined,
                  textInputAction: TextInputAction.next,
                  validator: (v) => v == null || v.trim().isEmpty
                      ? 'Organization name is required'
                      : null,
                ),
              ],
            ],
          ),
          const SizedBox(height: 16),
          ImageUploadCard(
            title: 'Face Picture Upload',
            instructions:
                'Take a clear photo of your face or upload from gallery. Your face must be fully visible with no masks, sunglasses, or heavy obstructions.',
            imagePath: data.facePicturePath,
            onImageSelected: (path) {
              data.facePicturePath = path;
              widget.onChanged();
            },
          ),
          if (data.facePicturePath == null) ...[
            const SizedBox(height: 12),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.accentYellow.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Row(
                children: [
                  Icon(
                    Icons.info_outline,
                    size: 18,
                    color: AppColors.textSecondary,
                  ),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'A face picture is required before you can continue.',
                      style: TextStyle(
                        fontSize: 13,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}
