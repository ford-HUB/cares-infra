import 'package:flutter/material.dart';
import 'package:mobile/core/services/api_client.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/core/constants/uclm_departments.dart';
import 'package:mobile/features/dashboard/data/volunteer_account_service.dart';
import 'package:mobile/features/dashboard/domain/volunteer_account_profile.dart';
import 'package:mobile/features/dashboard/presentation/widgets/personal_information_section.dart';

/// Volunteer "Edit Profile" — personal and account information only.
/// Interests, skills, and availability are edited from their own section edit
/// icons on the profile tab (see `VolunteerProfileSectionEditScreen`).
class VolunteerProfileEditScreen extends StatefulWidget {
  const VolunteerProfileEditScreen({
    super.key,
    this.fallbackEmail,
    this.fallbackFirstName,
  });

  final String? fallbackEmail;
  final String? fallbackFirstName;

  static Future<VolunteerAccountProfile?> open(
    BuildContext context, {
    String? fallbackEmail,
    String? fallbackFirstName,
  }) {
    return Navigator.of(context).push<VolunteerAccountProfile>(
      MaterialPageRoute<VolunteerAccountProfile>(
        builder: (_) => VolunteerProfileEditScreen(
          fallbackEmail: fallbackEmail,
          fallbackFirstName: fallbackFirstName,
        ),
      ),
    );
  }

  @override
  State<VolunteerProfileEditScreen> createState() =>
      _VolunteerProfileEditScreenState();
}

class _VolunteerProfileEditScreenState
    extends State<VolunteerProfileEditScreen> {
  final VolunteerAccountService _accountService = VolunteerAccountService();

  final _firstNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _idNumberController = TextEditingController();

  String? _department;
  String? _course;

  bool _isLoading = true;
  bool _isSaving = false;
  String? _loadError;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  @override
  void dispose() {
    _firstNameController.dispose();
    _lastNameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _idNumberController.dispose();
    super.dispose();
  }

  void _applyAccountProfile(VolunteerAccountProfile profile) {
    _firstNameController.text = profile.firstName;
    _lastNameController.text = profile.lastName;
    _emailController.text = profile.email;
    _phoneController.text = profile.phoneNumber;
    _idNumberController.text = profile.idNumber ?? '';
    _department = profile.department ?? UclmDepartments.names.first;
    _course = profile.course ?? _defaultCourseFor(_department);
  }

  void _applyFallbackAccount() {
    _firstNameController.text = widget.fallbackFirstName?.trim() ?? '';
    _lastNameController.text = '';
    _emailController.text = widget.fallbackEmail?.trim() ?? '';
    _department ??= UclmDepartments.names.first;
    _course ??= _defaultCourseFor(_department);
  }

  String? _defaultCourseFor(String? department) {
    final courses = UclmDepartments.coursesFor(department ?? '');
    if (courses.isEmpty) return null;
    return courses.first;
  }

  Future<void> _loadData() async {
    setState(() {
      _isLoading = true;
      _loadError = null;
    });

    try {
      final account = await _accountService.fetchAccount();

      if (!mounted) return;

      setState(() {
        _applyAccountProfile(account);
        _isLoading = false;
      });
    } on ApiException catch (error) {
      if (!mounted) return;
      _applyFallbackAccount();
      setState(() {
        _loadError = error.message;
        _isLoading = false;
      });
    } catch (_) {
      if (!mounted) return;
      _applyFallbackAccount();
      setState(() {
        _loadError = 'Could not load your profile. Please try again.';
        _isLoading = false;
      });
    }
  }

  void _showMessage(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), behavior: SnackBarBehavior.floating),
    );
  }

  Future<void> _save() async {
    final firstName = _firstNameController.text.trim();
    final lastName = _lastNameController.text.trim();
    final phone = _phoneController.text.trim();

    if (firstName.isEmpty || lastName.isEmpty) {
      _showMessage('Please enter your first and last name.');
      return;
    }

    if (phone.isEmpty) {
      _showMessage('Please enter your phone number.');
      return;
    }

    setState(() => _isSaving = true);
    FocusManager.instance.primaryFocus?.unfocus();

    try {
      final account = await _accountService.saveAccount(
        VolunteerAccountProfile(
          firstName: firstName,
          lastName: lastName,
          email: _emailController.text.trim(),
          phoneNumber: phone,
          idNumber: _idNumberController.text.trim().isEmpty
              ? null
              : _idNumberController.text.trim(),
          department: _department,
          course: _course,
        ),
      );

      if (!mounted) return;

      _showMessage('Personal information updated.');
      Navigator.of(context).pop(account);
    } on ApiException catch (error) {
      if (!mounted) return;
      _showMessage(error.message);
    } catch (_) {
      if (!mounted) return;
      _showMessage('Could not save your profile. Please try again.');
    } finally {
      if (mounted) {
        setState(() => _isSaving = false);
      }
    }
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
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                if (_loadError != null)
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 8, 20, 0),
                    child: _InlineErrorBanner(
                      message: _loadError!,
                      onRetry: _loadData,
                    ),
                  ),
                Expanded(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
                    child: PersonalInformationSection(
                      firstNameController: _firstNameController,
                      lastNameController: _lastNameController,
                      emailController: _emailController,
                      phoneController: _phoneController,
                      idNumberController: _idNumberController,
                      department: _department,
                      course: _course,
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
                          : const Text('Save Changes'),
                    ),
                  ),
                ),
              ],
            ),
    );
  }
}

class _InlineErrorBanner extends StatelessWidget {
  const _InlineErrorBanner({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.heart.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.heart.withValues(alpha: 0.35)),
      ),
      child: Row(
        children: [
          Expanded(
            child: Text(
              message,
              style: const TextStyle(
                fontSize: 12,
                color: AppColors.primaryDark,
              ),
            ),
          ),
          TextButton(onPressed: onRetry, child: const Text('Retry')),
        ],
      ),
    );
  }
}
