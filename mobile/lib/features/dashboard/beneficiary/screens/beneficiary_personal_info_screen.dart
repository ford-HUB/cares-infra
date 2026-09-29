import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:mobile/core/utils/phone_number_format.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/auth/presentation/providers/password_policy_provider.dart';
import 'package:mobile/features/auth/presentation/widgets/registration_form_card.dart';
import 'package:mobile/features/auth/registration/utils/password_strength.dart';
import 'package:mobile/features/dashboard/beneficiary/data/beneficiary_personal_profile_store.dart';
import 'package:mobile/features/dashboard/beneficiary/domain/beneficiary_personal_profile.dart';

/// Beneficiary "Edit Profile" — personal information only.
/// Assistance, household, and visit details are edited from their own cards
/// on the profile page.
class BeneficiaryPersonalInfoScreen extends StatefulWidget {
  const BeneficiaryPersonalInfoScreen({super.key});

  static Future<BeneficiaryPersonalProfile?> open(BuildContext context) {
    return Navigator.of(context).push<BeneficiaryPersonalProfile>(
      MaterialPageRoute<BeneficiaryPersonalProfile>(
        builder: (_) => const BeneficiaryPersonalInfoScreen(),
      ),
    );
  }

  @override
  State<BeneficiaryPersonalInfoScreen> createState() =>
      _BeneficiaryPersonalInfoScreenState();
}

class _BeneficiaryPersonalInfoScreenState
    extends State<BeneficiaryPersonalInfoScreen> {
  final _store = BeneficiaryPersonalProfileStore.instance;

  late final TextEditingController _firstName;
  late final TextEditingController _lastName;
  late final TextEditingController _email;
  late final TextEditingController _contact;
  late final TextEditingController _address;
  late final TextEditingController _dateOfBirth;

  String? _photoLabel;
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    final profile = _store.profile;
    _firstName = TextEditingController(text: profile.firstName);
    _lastName = TextEditingController(text: profile.lastName);
    _email = TextEditingController(text: profile.email);
    _contact = TextEditingController(
      text: normalizePhilippinePhone(profile.contactNumber),
    );
    _address = TextEditingController(text: profile.address);
    _dateOfBirth = TextEditingController(text: profile.dateOfBirth);
    _photoLabel = profile.photoLabel;
  }

  @override
  void dispose() {
    _firstName.dispose();
    _lastName.dispose();
    _email.dispose();
    _contact.dispose();
    _address.dispose();
    _dateOfBirth.dispose();
    super.dispose();
  }

  void _showMessage(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), behavior: SnackBarBehavior.floating),
    );
  }

  Future<void> _pickDateOfBirth() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: DateTime(now.year - 30, now.month, now.day),
      firstDate: DateTime(1920),
      lastDate: now,
      helpText: 'Select date of birth',
    );
    if (picked == null) return;
    setState(() {
      _dateOfBirth.text =
          '${picked.year}-${picked.month.toString().padLeft(2, '0')}-'
          '${picked.day.toString().padLeft(2, '0')}';
    });
  }

  void _changePhoto() {
    // Mock photo capture — the prototype stores a label, not a file.
    setState(() => _photoLabel = 'profile_photo.jpg');
    _showMessage('Photo updated (sample image).');
  }

  Future<void> _changePassword() async {
    final currentController = TextEditingController();
    final newController = TextEditingController();
    final confirmController = TextEditingController();

    final changed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.background,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        title: const Text(
          'Change password',
          style: TextStyle(
            fontWeight: FontWeight.w800,
            color: AppColors.primaryDark,
          ),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            _PasswordField(
              controller: currentController,
              hint: 'Current password',
            ),
            const SizedBox(height: 10),
            _PasswordField(controller: newController, hint: 'New password'),
            // Only the rules the new password has yet to satisfy; the row is empty
            // until the user types and collapses again once they are all met.
            ValueListenableBuilder<TextEditingValue>(
              valueListenable: newController,
              builder: (_, value, _) => value.text.isEmpty
                  ? const SizedBox.shrink()
                  : Padding(
                      padding: const EdgeInsets.only(top: 10),
                      child: PasswordRuleChips(password: value.text),
                    ),
            ),
            const SizedBox(height: 10),
            _PasswordField(
              controller: confirmController,
              hint: 'Confirm new password',
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Cancel'),
          ),
          Consumer(
            builder: (_, ref, _) => ElevatedButton(
              onPressed: () {
                // The same rules the portal enforces, not a second copy of them.
                final problem = validatePassword(
                  newController.text,
                  policy: ref.read(currentPasswordPolicyProvider),
                );
                if (problem != null) {
                  ScaffoldMessenger.of(ctx).showSnackBar(
                    SnackBar(
                      content: Text(problem),
                      behavior: SnackBarBehavior.floating,
                    ),
                  );
                  return;
                }
                if (newController.text != confirmController.text) {
                  ScaffoldMessenger.of(ctx).showSnackBar(
                    const SnackBar(
                      content: Text('Passwords do not match.'),
                      behavior: SnackBarBehavior.floating,
                    ),
                  );
                  return;
                }
                Navigator.of(ctx).pop(true);
              },
              child: const Text('Update'),
            ),
          ),
        ],
      ),
    );

    currentController.dispose();
    newController.dispose();
    confirmController.dispose();

    if (changed == true && mounted) {
      _showMessage('Password updated.');
    }
  }

  Future<void> _save() async {
    if (_firstName.text.trim().isEmpty || _lastName.text.trim().isEmpty) {
      _showMessage('Please enter your first and last name.');
      return;
    }
    if (_contact.text.trim().isNotEmpty &&
        !isValidPhilippinePhone(_contact.text)) {
      _showMessage('Enter an 11-digit PH mobile number (09XXXXXXXXX).');
      return;
    }

    setState(() => _isSaving = true);

    // Mock save — personal details live in memory for the prototype.
    await Future<void>.delayed(const Duration(milliseconds: 350));
    if (!mounted) return;

    final saved = _store.save(
      _store.profile.copyWith(
        firstName: _firstName.text.trim(),
        lastName: _lastName.text.trim(),
        email: _email.text.trim(),
        contactNumber: normalizePhilippinePhone(_contact.text),
        address: _address.text.trim(),
        dateOfBirth: _dateOfBirth.text.trim(),
        photoLabel: _photoLabel,
      ),
    );

    setState(() => _isSaving = false);
    if (!mounted) return;
    Navigator.of(context).pop(saved);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        foregroundColor: AppColors.primaryDark,
        title: const Text(
          'Edit Profile',
          style: TextStyle(fontWeight: FontWeight.w800),
        ),
      ),
      body: Column(
        children: [
          Expanded(
            child: SingleChildScrollView(
              keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  _PhotoSection(
                    initial: _firstName.text.trim().isEmpty
                        ? '?'
                        : _firstName.text.trim()[0].toUpperCase(),
                    photoLabel: _photoLabel,
                    onChangePhoto: _changePhoto,
                  ),
                  const SizedBox(height: 16),
                  _SectionCard(
                    title: 'Personal Information',
                    subtitle: 'Your basic account and contact details.',
                    children: [
                      _FieldLabel('First name'),
                      const SizedBox(height: 6),
                      _ProfileTextField(
                        controller: _firstName,
                        hint: 'First name',
                        textCapitalization: TextCapitalization.words,
                        onChanged: (_) => setState(() {}),
                      ),
                      const SizedBox(height: 12),
                      _FieldLabel('Last name'),
                      const SizedBox(height: 6),
                      _ProfileTextField(
                        controller: _lastName,
                        hint: 'Last name',
                        textCapitalization: TextCapitalization.words,
                      ),
                      const SizedBox(height: 12),
                      _FieldLabel('Email'),
                      const SizedBox(height: 6),
                      _ProfileTextField(
                        controller: _email,
                        hint: 'email@example.com',
                        keyboardType: TextInputType.emailAddress,
                        readOnly: true,
                      ),
                      const SizedBox(height: 12),
                      _FieldLabel('Contact number'),
                      const SizedBox(height: 6),
                      _ProfileTextField(
                        controller: _contact,
                        hint: '+639XXXXXXXXX',
                        keyboardType: TextInputType.phone,
                        inputFormatters: const [PhilippinePhoneFormatter()],
                        errorText: philippinePhoneError(_contact.text),
                        onChanged: (_) => setState(() {}),
                      ),
                      const SizedBox(height: 12),
                      _FieldLabel('Address'),
                      const SizedBox(height: 6),
                      _ProfileTextField(
                        controller: _address,
                        hint: 'House no., street, barangay, city',
                        maxLines: 2,
                        textCapitalization: TextCapitalization.words,
                      ),
                      const SizedBox(height: 12),
                      _FieldLabel('Date of birth'),
                      const SizedBox(height: 6),
                      _ProfileTextField(
                        controller: _dateOfBirth,
                        hint: 'YYYY-MM-DD',
                        readOnly: true,
                        onTap: _pickDateOfBirth,
                        suffixIcon: Icons.calendar_today_rounded,
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  _SectionCard(
                    title: 'Password',
                    subtitle: 'Keep your account secure.',
                    children: [
                      Row(
                        children: [
                          const Expanded(
                            child: Text(
                              '••••••••',
                              style: TextStyle(
                                fontSize: 18,
                                letterSpacing: 2,
                                color: AppColors.primaryDark,
                              ),
                            ),
                          ),
                          OutlinedButton.icon(
                            onPressed: _changePassword,
                            icon: const Icon(
                              Icons.lock_outline_rounded,
                              size: 18,
                            ),
                            label: const Text('Change'),
                          ),
                        ],
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
            child: SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _isSaving ? null : _save,
                child: _isSaving
                    ? const SizedBox(
                        width: 22,
                        height: 22,
                        child: CircularProgressIndicator(
                          strokeWidth: 2.2,
                          color: Colors.white,
                        ),
                      )
                    : const Text('Save Profile'),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _PhotoSection extends StatelessWidget {
  const _PhotoSection({
    required this.initial,
    required this.photoLabel,
    required this.onChangePhoto,
  });

  final String initial;
  final String? photoLabel;
  final VoidCallback onChangePhoto;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.fieldBorder),
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 34,
            backgroundColor: AppColors.primaryDark,
            child: Text(
              initial,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 26,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Profile photo',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w800,
                    color: AppColors.primaryDark,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  photoLabel ?? 'No photo uploaded yet',
                  style: TextStyle(
                    fontSize: 12,
                    color: AppColors.secondary.withValues(alpha: 0.95),
                  ),
                ),
                const SizedBox(height: 8),
                OutlinedButton.icon(
                  onPressed: onChangePhoto,
                  icon: const Icon(Icons.photo_camera_outlined, size: 18),
                  label: const Text('Change photo'),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _SectionCard extends StatelessWidget {
  const _SectionCard({
    required this.title,
    required this.subtitle,
    required this.children,
  });

  final String title;
  final String subtitle;
  final List<Widget> children;

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
          Text(
            title,
            style: const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w800,
              color: AppColors.primaryDark,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            subtitle,
            style: TextStyle(
              fontSize: 12,
              height: 1.35,
              color: AppColors.secondary.withValues(alpha: 0.95),
            ),
          ),
          const SizedBox(height: 16),
          ...children,
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
      style: const TextStyle(
        fontSize: 12.5,
        fontWeight: FontWeight.w700,
        color: AppColors.primaryDark,
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
    this.inputFormatters,
    this.errorText,
    this.maxLines = 1,
    this.onTap,
    this.onChanged,
    this.suffixIcon,
  });

  final TextEditingController controller;
  final String hint;
  final TextInputType? keyboardType;
  final TextCapitalization textCapitalization;
  final bool readOnly;
  final List<TextInputFormatter>? inputFormatters;
  final String? errorText;
  final int maxLines;
  final VoidCallback? onTap;
  final ValueChanged<String>? onChanged;
  final IconData? suffixIcon;

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      keyboardType: keyboardType,
      textCapitalization: textCapitalization,
      readOnly: readOnly,
      inputFormatters: inputFormatters,
      maxLines: maxLines,
      onTap: onTap,
      onChanged: onChanged,
      style: const TextStyle(fontSize: 14, color: AppColors.primaryDark),
      decoration: InputDecoration(
        hintText: hint,
        errorText: errorText,
        errorMaxLines: 2,
        filled: true,
        fillColor: readOnly ? AppColors.surface : Colors.white,
        isDense: true,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 12,
          vertical: 12,
        ),
        suffixIcon: suffixIcon == null
            ? null
            : Icon(suffixIcon, size: 18, color: AppColors.secondary),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.fieldBorder),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.fieldBorder),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.primary),
        ),
      ),
    );
  }
}

class _PasswordField extends StatelessWidget {
  const _PasswordField({required this.controller, required this.hint});

  final TextEditingController controller;
  final String hint;

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      obscureText: true,
      decoration: InputDecoration(
        hintText: hint,
        isDense: true,
        filled: true,
        fillColor: Colors.white,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.fieldBorder),
        ),
      ),
    );
  }
}
