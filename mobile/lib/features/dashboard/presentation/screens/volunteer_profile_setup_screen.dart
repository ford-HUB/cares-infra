import 'package:flutter/material.dart';
import 'package:mobile/core/services/api_client.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/dashboard/data/volunteer_profile_service.dart';
import 'package:mobile/features/dashboard/domain/volunteer_profile.dart';
import 'package:mobile/features/dashboard/presentation/widgets/selectable_options_section.dart';
import 'package:mobile/features/dashboard/presentation/widgets/selection_section_card.dart';
import 'package:mobile/features/onboarding/data/onboarding_service.dart';
import 'package:mobile/features/onboarding/domain/user_interest.dart';

class VolunteerProfileSetupScreen extends StatefulWidget {
  const VolunteerProfileSetupScreen({
    super.key,
    this.initialProfile,
  });

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
      SnackBar(
        content: Text(message),
        behavior: SnackBarBehavior.floating,
      ),
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
          'Volunteer Profile',
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
                              style: Theme.of(context)
                                  .textTheme
                                  .titleLarge
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
                            SelectableOptionsSection(
                              title: 'Interests',
                              subtitle: 'What areas are you passionate about?',
                              options: _interestOptions,
                              selected: _selectedInterests
                                  .map((interest) => interest.label)
                                  .toSet(),
                              onToggle: _toggleInterestByLabel,
                              emptyMessage: 'No interests available right now.',
                            ),
                            const SizedBox(height: 16),
                            SelectableOptionsSection(
                              title: 'Skills',
                              subtitle: 'What can you contribute?',
                              options: VolunteerProfileOptions.skills,
                              selected: _selectedSkills,
                              onToggle: (value) =>
                                  _toggleString(_selectedSkills, value),
                            ),
                            const SizedBox(height: 16),
                            SelectionSectionCard(
                              title: 'Availability',
                              subtitle: 'When do you prefer to volunteer?',
                              options: VolunteerProfileOptions.availability,
                              selected: _selectedAvailability,
                              onToggle: (value) =>
                                  _toggleString(_selectedAvailability, value),
                            ),
                            const SizedBox(height: 16),
                            _HoursSection(
                              selectedHours: _hoursPerWeek,
                              onChanged: (value) =>
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
                              : const Text('Save Profile'),
                        ),
                      ),
                    ),
                  ],
                ),
    );
  }
}

class _HoursSection extends StatelessWidget {
  const _HoursSection({
    required this.selectedHours,
    required this.onChanged,
  });

  final int? selectedHours;
  final ValueChanged<int?> onChanged;

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
            'Hours per week',
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w800,
              color: AppColors.primaryDark,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Optional — helps coordinators plan assignments.',
            style: TextStyle(
              fontSize: 12,
              height: 1.35,
              color: AppColors.secondary.withValues(alpha: 0.95),
            ),
          ),
          const SizedBox(height: 14),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: VolunteerProfileOptions.hoursPerWeek.map((hours) {
              final isSelected = selectedHours == hours;
              return FilterChip(
                label: Text('$hours hrs'),
                selected: isSelected,
                onSelected: (_) => onChanged(isSelected ? null : hours),
                selectedColor: AppColors.primary.withValues(alpha: 0.14),
                checkmarkColor: AppColors.primaryDark,
                labelStyle: TextStyle(
                  fontSize: 12,
                  fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                  color: isSelected
                      ? AppColors.primaryDark
                      : AppColors.secondary.withValues(alpha: 0.95),
                ),
                side: BorderSide(
                  color: isSelected ? AppColors.primary : AppColors.fieldBorder,
                ),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(20),
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({
    required this.message,
    required this.onRetry,
  });

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
            OutlinedButton(
              onPressed: onRetry,
              child: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }
}
