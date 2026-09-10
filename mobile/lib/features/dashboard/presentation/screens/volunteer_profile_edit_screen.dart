import 'package:flutter/material.dart';
import 'package:mobile/core/services/api_client.dart';
import 'package:mobile/core/utils/phone_number_format.dart';
import 'package:mobile/features/auth/data/models/registration_api_models.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/core/constants/uclm_departments.dart';
import 'package:mobile/features/dashboard/data/volunteer_account_service.dart';
import 'package:mobile/features/dashboard/data/volunteer_profile_service.dart';
import 'package:mobile/features/dashboard/domain/volunteer_account_profile.dart';
import 'package:mobile/features/dashboard/domain/volunteer_profile.dart';
import 'package:mobile/features/dashboard/presentation/widgets/personal_information_section.dart';
import 'package:mobile/features/dashboard/presentation/widgets/volunteer_profile_form_sections.dart';
import 'package:mobile/features/interests/data/interests_service.dart';
import 'package:mobile/features/interests/domain/user_interest.dart';

/// Post-onboarding profile management — view and edit all volunteer information.
class VolunteerProfileEditScreen extends StatefulWidget {
  const VolunteerProfileEditScreen({
    super.key,
    this.initialProfile,
    this.fallbackEmail,
    this.fallbackFirstName,
  });

  final VolunteerProfile? initialProfile;
  final String? fallbackEmail;
  final String? fallbackFirstName;

  @override
  State<VolunteerProfileEditScreen> createState() =>
      _VolunteerProfileEditScreenState();
}

class _VolunteerProfileEditScreenState
    extends State<VolunteerProfileEditScreen> {
  final VolunteerProfileService _profileService = VolunteerProfileService();
  final VolunteerAccountService _accountService = VolunteerAccountService();

  final _firstNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();

  /// Server rejection of the phone number (already on another account).
  String? _phoneConflict;
  final _idNumberController = TextEditingController();

  final Set<UserInterest> _selectedInterests = {};
  final Set<String> _selectedSkills = {};
  final Set<String> _selectedAvailability = {};
  int? _hoursPerWeek;

  String? _department;
  String? _course;

  List<InterestCatalogItem> _catalog = const [];
  bool _isLoading = true;
  bool _isSaving = false;
  String? _loadError;

  @override
  void initState() {
    super.initState();
    _applyVolunteerProfile(widget.initialProfile);
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

  void _applyVolunteerProfile(VolunteerProfile? profile) {
    if (profile == null) return;
    _selectedInterests
      ..clear()
      ..addAll(profile.interests);
    _selectedSkills
      ..clear()
      ..addAll(profile.skills);
    _selectedAvailability
      ..clear()
      ..addAll(profile.availability);
    _hoursPerWeek = profile.hoursPerWeek;
  }

  void _applyAccountProfile(VolunteerAccountProfile profile) {
    _firstNameController.text = profile.firstName;
    _lastNameController.text = profile.lastName;
    _emailController.text = profile.email;
    _phoneController.text = normalizePhilippinePhone(profile.phoneNumber);
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
      final results = await Future.wait([
        _profileService.fetchInterestCatalog(),
        _accountService.fetchAccount(),
      ]);

      if (!mounted) return;

      final catalog = results[0] as List<InterestCatalogItem>;
      final account = results[1] as VolunteerAccountProfile;

      setState(() {
        _catalog = catalog;
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

  List<ProfileSelectableOption> get _interestOptions {
    return _catalog
        .map((item) => item.asUserInterest)
        .whereType<UserInterest>()
        .map(
          (interest) => ProfileSelectableOption(
            label: interest.label,
            icon: interest.icon,
            accentColor: interest.accentColor,
          ),
        )
        .toList();
  }

  void _toggleInterestByLabel(String label) {
    final interest = _catalog
        .map((item) => item.asUserInterest)
        .whereType<UserInterest>()
        .where((item) => item.label == label)
        .firstOrNull;
    if (interest == null) return;

    setState(() {
      if (_selectedInterests.contains(interest)) {
        _selectedInterests.remove(interest);
      } else {
        _selectedInterests.add(interest);
      }
    });
  }

  void _toggleString(Set<String> set, String value) {
    setState(() {
      if (set.contains(value)) {
        set.remove(value);
      } else {
        set.add(value);
      }
    });
  }

  void _showMessage(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), behavior: SnackBarBehavior.floating),
    );
  }

  Future<void> _save() async {
    final firstName = _firstNameController.text.trim();
    final lastName = _lastNameController.text.trim();
    final phone = normalizePhilippinePhone(_phoneController.text);

    if (firstName.isEmpty || lastName.isEmpty) {
      _showMessage('Please enter your first and last name.');
      return;
    }

    if (phone.isEmpty) {
      _showMessage('Please enter your phone number.');
      return;
    }
    if (!isValidPhilippinePhone(phone)) {
      _showMessage('Enter an 11-digit PH mobile number (09XXXXXXXXX).');
      return;
    }

    if (_selectedInterests.isEmpty ||
        _selectedSkills.isEmpty ||
        _selectedAvailability.isEmpty) {
      _showMessage('Please complete interests, skills, and availability.');
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

      final savedProfile = await _profileService.saveProfile(
        VolunteerProfile(
          interests: _selectedInterests,
          skills: _selectedSkills,
          availability: _selectedAvailability,
          hoursPerWeek: _hoursPerWeek,
          profileComplete: widget.initialProfile?.profileComplete ?? false,
        ),
      );

      if (!mounted) return;

      Navigator.of(context).pop(
        VolunteerProfileEditResult(account: account, profile: savedProfile),
      );
    } on ApiException catch (error) {
      if (!mounted) return;
      final conflict = RegistrationConflict.fromException(error);
      if (conflict?.field == RegistrationConflictField.phoneNumber) {
        setState(() => _phoneConflict = conflict!.message);
      }
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
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        PersonalInformationSection(
                          firstNameController: _firstNameController,
                          lastNameController: _lastNameController,
                          emailController: _emailController,
                          phoneController: _phoneController,
                          idNumberController: _idNumberController,
                          department: _department,
                          course: _course,
                          phoneError: _phoneConflict,
                          onPhoneChanged: (_) =>
                              setState(() => _phoneConflict = null),
                        ),
                        const SizedBox(height: 16),
                        VolunteerProfileFormSections(
                          interestOptions: _interestOptions,
                          selectedInterestLabels: _selectedInterests
                              .map((interest) => interest.label)
                              .toSet(),
                          selectedSkills: _selectedSkills,
                          selectedAvailability: _selectedAvailability,
                          hoursPerWeek: _hoursPerWeek,
                          onToggleInterest: _toggleInterestByLabel,
                          onToggleSkill: (value) =>
                              _toggleString(_selectedSkills, value),
                          onToggleAvailability: (value) =>
                              _toggleString(_selectedAvailability, value),
                          onHoursChanged: (value) =>
                              setState(() => _hoursPerWeek = value),
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

class VolunteerProfileEditResult {
  const VolunteerProfileEditResult({
    required this.account,
    required this.profile,
  });

  final VolunteerAccountProfile account;
  final VolunteerProfile profile;
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
