import 'package:flutter/material.dart';
import 'package:mobile/core/services/api_client.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/dashboard/data/volunteer_profile_service.dart';
import 'package:mobile/features/dashboard/domain/volunteer_profile.dart';
import 'package:mobile/features/dashboard/presentation/widgets/selectable_options_section.dart';
import 'package:mobile/features/dashboard/presentation/widgets/selection_section_card.dart';
import 'package:mobile/features/dashboard/presentation/widgets/volunteer_profile_hours_section.dart';
import 'package:mobile/features/interests/data/interests_service.dart';
import 'package:mobile/features/interests/domain/user_interest.dart';

/// The volunteer profile sections that can be edited on their own.
enum VolunteerProfileSection { interests, skills, availability }

extension VolunteerProfileSectionX on VolunteerProfileSection {
  String get title => switch (this) {
    VolunteerProfileSection.interests => 'Interests',
    VolunteerProfileSection.skills => 'Skills',
    VolunteerProfileSection.availability => 'Availability',
  };

  String get intro => switch (this) {
    VolunteerProfileSection.interests =>
      'Update the causes you care about so CARES can match you with the right '
          'events.',
    VolunteerProfileSection.skills =>
      'Tell coordinators what you can contribute when you join an event.',
    VolunteerProfileSection.availability =>
      'Set the days you can volunteer and how many hours you can give a week.',
  };

  IconData get icon => switch (this) {
    VolunteerProfileSection.interests => Icons.favorite_outline_rounded,
    VolunteerProfileSection.skills => Icons.workspace_premium_outlined,
    VolunteerProfileSection.availability => Icons.event_available_outlined,
  };
}

/// Focused editor for one volunteer profile section, opened from the edit icon
/// beside that section on the volunteer profile.
class VolunteerProfileSectionEditScreen extends StatefulWidget {
  const VolunteerProfileSectionEditScreen({
    super.key,
    required this.section,
    this.initialProfile,
  });

  final VolunteerProfileSection section;
  final VolunteerProfile? initialProfile;

  static Future<VolunteerProfile?> open(
    BuildContext context,
    VolunteerProfileSection section, {
    VolunteerProfile? initialProfile,
  }) {
    return Navigator.of(context).push<VolunteerProfile>(
      MaterialPageRoute<VolunteerProfile>(
        builder: (_) => VolunteerProfileSectionEditScreen(
          section: section,
          initialProfile: initialProfile,
        ),
      ),
    );
  }

  @override
  State<VolunteerProfileSectionEditScreen> createState() =>
      _VolunteerProfileSectionEditScreenState();
}

class _VolunteerProfileSectionEditScreenState
    extends State<VolunteerProfileSectionEditScreen> {
  final VolunteerProfileService _profileService = VolunteerProfileService();

  final Set<UserInterest> _interests = {};
  final Set<String> _skills = {};
  final Set<String> _availability = {};
  int? _hoursPerWeek;
  bool _profileComplete = false;

  List<InterestCatalogItem> _catalog = const [];
  bool _isLoading = true;
  bool _isSaving = false;
  String? _loadError;

  bool get _needsCatalog =>
      widget.section == VolunteerProfileSection.interests;

  @override
  void initState() {
    super.initState();
    _applyProfile(widget.initialProfile);
    _loadData();
  }

  void _applyProfile(VolunteerProfile? profile) {
    if (profile == null) return;
    _interests
      ..clear()
      ..addAll(profile.interests);
    _skills
      ..clear()
      ..addAll(profile.skills);
    _availability
      ..clear()
      ..addAll(profile.availability);
    _hoursPerWeek = profile.hoursPerWeek;
    _profileComplete = profile.profileComplete;
  }

  Future<void> _loadData() async {
    setState(() {
      _isLoading = true;
      _loadError = null;
    });

    try {
      // Only the interests editor needs the catalog; the other sections use
      // the static option lists in VolunteerProfileOptions.
      final catalog = _needsCatalog
          ? await _profileService.fetchInterestCatalog()
          : const <InterestCatalogItem>[];

      if (widget.initialProfile == null) {
        final profile = await _profileService.fetchProfile();
        if (!mounted) return;
        _applyProfile(profile);
      }

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
        _loadError = 'Could not load this section. Please try again.';
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
      if (_interests.contains(interest)) {
        _interests.remove(interest);
      } else {
        _interests.add(interest);
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

  bool get _isValid => switch (widget.section) {
    VolunteerProfileSection.interests => _interests.isNotEmpty,
    VolunteerProfileSection.skills => _skills.isNotEmpty,
    VolunteerProfileSection.availability => _availability.isNotEmpty,
  };

  String get _validationMessage => switch (widget.section) {
    VolunteerProfileSection.interests => 'Select at least one interest.',
    VolunteerProfileSection.skills => 'Select at least one skill.',
    VolunteerProfileSection.availability => 'Select at least one day.',
  };

  Future<void> _save() async {
    if (!_isValid) {
      _showMessage(_validationMessage);
      return;
    }

    setState(() => _isSaving = true);

    try {
      final saved = await _profileService.saveProfile(
        VolunteerProfile(
          interests: _interests,
          skills: _skills,
          availability: _availability,
          hoursPerWeek: _hoursPerWeek,
          profileComplete: _profileComplete,
        ),
      );

      if (!mounted) return;

      _showMessage('${widget.section.title} updated.');
      Navigator.of(context).pop(saved);
    } on ApiException catch (error) {
      if (!mounted) return;
      _showMessage(error.message);
    } catch (_) {
      if (!mounted) return;
      _showMessage('Could not save this section. Please try again.');
    } finally {
      if (mounted) {
        setState(() => _isSaving = false);
      }
    }
  }

  List<Widget> _sectionFields() {
    switch (widget.section) {
      case VolunteerProfileSection.interests:
        return [
          SelectableOptionsSection(
            title: 'Interests',
            subtitle: 'What areas are you passionate about?',
            options: _interestOptions,
            selected: _interests.map((interest) => interest.label).toSet(),
            onToggle: _toggleInterestByLabel,
            emptyMessage: 'No interests available right now.',
          ),
        ];

      case VolunteerProfileSection.skills:
        return [
          SelectableOptionsSection(
            title: 'Skills',
            subtitle: 'What can you contribute?',
            options: VolunteerProfileOptions.skills,
            selected: _skills,
            onToggle: (value) => _toggleString(_skills, value),
          ),
        ];

      case VolunteerProfileSection.availability:
        return [
          SelectionSectionCard(
            title: 'Availability',
            subtitle: 'Which days are you available?',
            options: VolunteerProfileOptions.availability,
            selected: _availability,
            onToggle: (value) => _toggleString(_availability, value),
          ),
          const SizedBox(height: 16),
          VolunteerProfileHoursSection(
            selectedHours: _hoursPerWeek,
            onChanged: (value) => setState(() => _hoursPerWeek = value),
          ),
        ];
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
        title: Text(
          'Edit ${widget.section.title}',
          style: const TextStyle(fontWeight: FontWeight.w800),
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
                        Row(
                          children: [
                            Container(
                              width: 40,
                              height: 40,
                              decoration: BoxDecoration(
                                color: AppColors.primary.withValues(
                                  alpha: 0.12,
                                ),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: Icon(
                                widget.section.icon,
                                size: 20,
                                color: AppColors.primaryDark,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Text(
                                widget.section.intro,
                                style: TextStyle(
                                  fontSize: 13,
                                  height: 1.45,
                                  color: AppColors.secondary.withValues(
                                    alpha: 0.95,
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 20),
                        ..._sectionFields(),
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
