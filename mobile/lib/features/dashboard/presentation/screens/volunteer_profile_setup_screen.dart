import 'package:flutter/material.dart';
import 'package:mobile/core/services/api_client.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/dashboard/data/volunteer_profile_service.dart';
import 'package:mobile/features/dashboard/domain/volunteer_profile.dart';
import 'package:mobile/features/dashboard/presentation/widgets/volunteer_profile_form_sections.dart';
import 'package:mobile/features/interests/data/interests_service.dart';
import 'package:mobile/features/interests/domain/user_interest.dart';

/// Onboarding flow for volunteers who have not yet finished setting up their profile.
class VolunteerProfileSetupScreen extends StatefulWidget {
  const VolunteerProfileSetupScreen({super.key, this.initialProfile});

  final VolunteerProfile? initialProfile;

  @override
  State<VolunteerProfileSetupScreen> createState() =>
      _VolunteerProfileSetupScreenState();
}

class _VolunteerProfileSetupScreenState
    extends State<VolunteerProfileSetupScreen> {
  final VolunteerProfileService _profileService = VolunteerProfileService();

  final Set<UserInterest> _selectedInterests = {};
  final Set<String> _selectedSkills = {};
  final Set<String> _selectedAvailability = {};
  int? _hoursPerWeek;

  List<InterestCatalogItem> _catalog = const [];
  bool _isLoading = true;
  bool _isSaving = false;
  String? _loadError;

  @override
  void initState() {
    super.initState();
    _applyInitialProfile(widget.initialProfile);
    _loadCatalog();
  }

  void _applyInitialProfile(VolunteerProfile? profile) {
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

  Future<void> _loadCatalog() async {
    setState(() {
      _isLoading = true;
      _loadError = null;
    });

    try {
      final catalog = await _profileService.fetchInterestCatalog();
      if (!mounted) return;
      setState(() {
        _catalog = catalog;
        _isLoading = false;
      });
    } on ApiException catch (error) {
      if (!mounted) return;
      setState(() {
        _loadError = error.message;
        _isLoading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _loadError = 'Could not load interests. Please try again.';
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
    _toggleInterest(interest);
  }

  void _toggleInterest(UserInterest interest) {
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

  Future<void> _submit() async {
    if (_selectedInterests.isEmpty ||
        _selectedSkills.isEmpty ||
        _selectedAvailability.isEmpty) {
      _showMessage('Please complete interests, skills, and availability.');
      return;
    }

    setState(() => _isSaving = true);
    FocusManager.instance.primaryFocus?.unfocus();

    try {
      final saved = await _profileService.saveProfile(
        VolunteerProfile(
          interests: _selectedInterests,
          skills: _selectedSkills,
          availability: _selectedAvailability,
          hoursPerWeek: _hoursPerWeek,
          profileComplete: true,
        ),
      );
      if (!mounted) return;

      Navigator.of(context).pop(saved);
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
          'Complete Your Profile',
          style: TextStyle(fontWeight: FontWeight.w800),
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _loadError != null
          ? _ErrorState(message: _loadError!, onRetry: _loadCatalog)
          : Column(
              children: [
                Expanded(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Text(
                          'Tell us about yourself',
                          style: Theme.of(context).textTheme.titleLarge
                              ?.copyWith(
                                fontWeight: FontWeight.w800,
                                color: AppColors.primaryDark,
                              ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Your interests and skills help CARES match you with the right volunteer opportunities.',
                          style: TextStyle(
                            fontSize: 14,
                            height: 1.45,
                            color: AppColors.secondary.withValues(alpha: 0.95),
                          ),
                        ),
                        const SizedBox(height: 24),
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
                      onPressed: _isSaving ? null : _submit,
                      child: _isSaving
                          ? const SizedBox(
                              width: 22,
                              height: 22,
                              child: CircularProgressIndicator(
                                strokeWidth: 2.2,
                                color: Colors.white,
                              ),
                            )
                          : const Text('Complete Profile'),
                    ),
                  ),
                ),
              ],
            ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              message,
              textAlign: TextAlign.center,
              style: TextStyle(
                color: AppColors.secondary.withValues(alpha: 0.95),
              ),
            ),
            const SizedBox(height: 16),
            OutlinedButton(onPressed: onRetry, child: const Text('Retry')),
          ],
        ),
      ),
    );
  }
}
