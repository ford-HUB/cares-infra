import 'package:flutter/material.dart';
import '../../../core/session/static_user_session.dart';
import '../../../core/theme/app_theme.dart';
import '../../auth/registration/data/academic_options.dart';

class ProfileEditScreen extends StatefulWidget {
  const ProfileEditScreen({super.key, required this.user});

  final StaticSessionUser user;

  static void open(BuildContext context, StaticSessionUser user) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(builder: (_) => ProfileEditScreen(user: user)),
    );
  }

  @override
  State<ProfileEditScreen> createState() => _ProfileEditScreenState();
}

class _ProfileEditScreenState extends State<ProfileEditScreen> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _fullNameController;
  late final TextEditingController _emailController;
  late final TextEditingController _phoneController;
  late final TextEditingController _schoolIdController;

  String? _department;
  String? _course;

  @override
  void initState() {
    super.initState();
    final user = widget.user;
    _fullNameController = TextEditingController(
      text: user.fullName.isEmpty ? '' : user.fullName,
    );
    _emailController = TextEditingController(text: user.email);
    _phoneController = TextEditingController(text: user.phoneNumber);
    _schoolIdController = TextEditingController(text: user.schoolIdNumber);
    _department = user.department ?? 'College of Education';
    _course = user.course ?? _defaultCourseFor(_department);
  }

  @override
  void dispose() {
    _fullNameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _schoolIdController.dispose();
    super.dispose();
  }

  String? _defaultCourseFor(String? department) {
    final courses = coursesForDepartment(department);
    if (courses.isEmpty) return null;
    return courses.first;
  }

  void _onDepartmentChanged(String? value) {
    if (value == null) return;
    setState(() {
      _department = value;
      final courses = coursesForDepartment(value);
      if (_course == null || !courses.contains(_course)) {
        _course = courses.isEmpty ? null : courses.first;
      }
    });
  }

  void _applyFullName(String fullName) {
    final parts = fullName.trim().split(RegExp(r'\s+'));
    if (parts.isEmpty) {
      widget.user.firstName = '';
      widget.user.lastName = '';
    } else if (parts.length == 1) {
      widget.user.firstName = parts.first;
      widget.user.lastName = '';
    } else {
      widget.user.lastName = parts.last;
      widget.user.firstName = parts.sublist(0, parts.length - 1).join(' ');
    }
  }

  void _save() {
    if (!_formKey.currentState!.validate()) return;

    final user = widget.user;
    _applyFullName(_fullNameController.text);
    user.email = _emailController.text.trim();
    user.phoneNumber = _phoneController.text.trim();
    user.schoolIdNumber = _schoolIdController.text.trim();
    user.department = _department;
    user.course = _course;

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Profile updated successfully.'),
        behavior: SnackBarBehavior.floating,
      ),
    );
    Navigator.of(context).pop();
  }

  InputDecoration _fieldDecoration({
    required String hint,
    required IconData icon,
    Widget? suffixIcon,
  }) {
    return InputDecoration(
      hintText: hint,
      filled: true,
      fillColor: AppColors.inputFill,
      prefixIcon: Icon(icon, color: AppColors.textMuted, size: 20),
      suffixIcon: suffixIcon,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: BorderSide.none,
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: BorderSide.none,
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
      ),
      hintStyle: const TextStyle(color: AppColors.textMuted, fontSize: 15),
    );
  }

  @override
  Widget build(BuildContext context) {
    final courses = coursesForDepartment(_department);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text(
          'Edit Profile',
          style: TextStyle(fontWeight: FontWeight.w800),
        ),
        centerTitle: true,
        backgroundColor: AppColors.background,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
          children: [
            Center(
              child: Stack(
                clipBehavior: Clip.none,
                children: [
                  Container(
                    width: 108,
                    height: 108,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: AppColors.inputFill,
                      border: Border.all(
                        color: AppColors.primary.withValues(alpha: 0.15),
                        width: 3,
                      ),
                    ),
                    child: const Icon(
                      Icons.person_rounded,
                      size: 52,
                      color: AppColors.primary,
                    ),
                  ),
                  Positioned(
                    right: 0,
                    bottom: 0,
                    child: Material(
                      color: AppColors.primary,
                      shape: const CircleBorder(),
                      elevation: 2,
                      child: InkWell(
                        onTap: () {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('Photo upload coming soon.'),
                              behavior: SnackBarBehavior.floating,
                            ),
                          );
                        },
                        customBorder: const CircleBorder(),
                        child: const Padding(
                          padding: EdgeInsets.all(8),
                          child: Icon(
                            Icons.camera_alt_rounded,
                            color: Colors.white,
                            size: 18,
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 28),
            const _SectionHeader(title: 'Personal Details'),
            const SizedBox(height: 16),
            const _FieldLabel('Full Name'),
            const SizedBox(height: 8),
            TextFormField(
              controller: _fullNameController,
              textCapitalization: TextCapitalization.words,
              decoration: _fieldDecoration(
                hint: 'Juan dela Cruz',
                icon: Icons.person_outline_rounded,
              ),
              validator: (value) {
                if (value == null || value.trim().isEmpty) {
                  return 'Full name is required';
                }
                return null;
              },
            ),
            const SizedBox(height: 16),
            const _FieldLabel('Email Address'),
            const SizedBox(height: 8),
            TextFormField(
              controller: _emailController,
              keyboardType: TextInputType.emailAddress,
              decoration: _fieldDecoration(
                hint: 'email@example.com',
                icon: Icons.mail_outline_rounded,
              ),
              validator: (value) {
                if (value == null || value.trim().isEmpty) {
                  return 'Email is required';
                }
                if (!value.contains('@')) {
                  return 'Enter a valid email address';
                }
                return null;
              },
            ),
            const SizedBox(height: 16),
            const _FieldLabel('Phone Number'),
            const SizedBox(height: 8),
            TextFormField(
              controller: _phoneController,
              keyboardType: TextInputType.phone,
              decoration: _fieldDecoration(
                hint: '09XX XXX XXXX',
                icon: Icons.phone_outlined,
              ),
            ),
            const SizedBox(height: 16),
            const _FieldLabel('ID Number'),
            const SizedBox(height: 8),
            TextFormField(
              controller: _schoolIdController,
              decoration: _fieldDecoration(
                hint: 'e.g. 2021-00123',
                icon: Icons.badge_outlined,
              ),
            ),
            const SizedBox(height: 28),
            const _SectionHeader(title: 'Academic Information'),
            const SizedBox(height: 16),
            const _FieldLabel('Department'),
            const SizedBox(height: 8),
            DropdownButtonFormField<String>(
              key: ValueKey('department-$_department'),
              initialValue: _department,
              decoration: _fieldDecoration(
                hint: 'Select department',
                icon: Icons.school_outlined,
              ),
              icon: const Icon(Icons.keyboard_arrow_down_rounded),
              items: kDepartmentCourses.keys
                  .map(
                    (dept) => DropdownMenuItem(
                      value: dept,
                      child: Text(dept),
                    ),
                  )
                  .toList(),
              onChanged: _onDepartmentChanged,
            ),
            const SizedBox(height: 16),
            const _FieldLabel('Course'),
            const SizedBox(height: 8),
            DropdownButtonFormField<String>(
              key: ValueKey('course-$_department-$_course'),
              initialValue: courses.contains(_course) ? _course : null,
              decoration: _fieldDecoration(
                hint: 'Select course',
                icon: Icons.menu_book_outlined,
              ),
              icon: const Icon(Icons.keyboard_arrow_down_rounded),
              items: courses
                  .map(
                    (course) => DropdownMenuItem(
                      value: course,
                      child: Text(course),
                    ),
                  )
                  .toList(),
              onChanged: courses.isEmpty
                  ? null
                  : (value) => setState(() => _course = value),
            ),
            const SizedBox(height: 32),
            FilledButton(
              onPressed: _save,
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.primary,
                minimumSize: const Size.fromHeight(50),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
              ),
              child: const Text(
                'Save Changes',
                style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.title});

  final String title;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 4,
          height: 22,
          decoration: BoxDecoration(
            color: AppColors.primary,
            borderRadius: BorderRadius.circular(2),
          ),
        ),
        const SizedBox(width: 10),
        Text(
          title,
          style: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w800,
            color: AppColors.textPrimary,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Container(
            height: 1,
            color: AppColors.inputFill,
          ),
        ),
      ],
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
        fontSize: 14,
        fontWeight: FontWeight.w600,
        color: AppColors.textSecondary,
      ),
    );
  }
}
