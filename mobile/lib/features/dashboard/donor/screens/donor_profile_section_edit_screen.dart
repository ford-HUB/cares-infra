import 'package:flutter/material.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/dashboard/donor/data/donor_profile_store.dart';
import 'package:mobile/features/dashboard/donor/domain/donor_profile.dart';
import 'package:mobile/features/dashboard/donor/screens/donor_profile_setup_screen.dart';
import 'package:mobile/features/dashboard/presentation/widgets/selectable_options_section.dart';
import 'package:mobile/features/dashboard/presentation/widgets/selection_section_card.dart';
import 'package:mobile/features/interests/domain/user_interest.dart';

/// The donor profile sections that can be edited on their own.
enum DonorProfileSection { interests, donationTypes, givingPreferences }

extension DonorProfileSectionX on DonorProfileSection {
  String get title => switch (this) {
    DonorProfileSection.interests => 'Interests',
    DonorProfileSection.donationTypes => 'Donation Preferences',
    DonorProfileSection.givingPreferences => 'Giving Availability',
  };

  String get intro => switch (this) {
    DonorProfileSection.interests =>
      'Update the causes you care about so CARES can match you with the right '
          'campaigns.',
    DonorProfileSection.donationTypes =>
      'Tell us what you would like to give — cash, goods, or supplies.',
    DonorProfileSection.givingPreferences =>
      'Set how often you would like to give and your monthly budget.',
  };

  IconData get icon => switch (this) {
    DonorProfileSection.interests => Icons.favorite_outline_rounded,
    DonorProfileSection.donationTypes => Icons.card_giftcard_rounded,
    DonorProfileSection.givingPreferences => Icons.event_available_outlined,
  };
}

/// Focused editor for one donor profile section, opened from the edit icon
/// beside that section on the donor profile.
class DonorProfileSectionEditScreen extends StatefulWidget {
  const DonorProfileSectionEditScreen({super.key, required this.section});

  final DonorProfileSection section;

  static Future<DonorProfile?> open(
    BuildContext context,
    DonorProfileSection section,
  ) {
    return Navigator.of(context).push<DonorProfile>(
      MaterialPageRoute<DonorProfile>(
        builder: (_) => DonorProfileSectionEditScreen(section: section),
      ),
    );
  }

  @override
  State<DonorProfileSectionEditScreen> createState() =>
      _DonorProfileSectionEditScreenState();
}

class _DonorProfileSectionEditScreenState
    extends State<DonorProfileSectionEditScreen> {
  final _store = DonorProfileStore.instance;

  late Set<UserInterest> _interests;
  late Set<String> _types;
  late Set<String> _frequency;
  int? _monthlyBudget;
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    final profile = _store.profile;
    _interests = {...profile.interests};
    _types = {...profile.donationTypes};
    _frequency = {...profile.givingFrequency};
    _monthlyBudget = profile.monthlyBudget;
  }

  void _toggleInterestByLabel(String label) {
    final interest = DonorProfileOptions.interestForLabel(label);
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
    DonorProfileSection.interests => _interests.isNotEmpty,
    DonorProfileSection.donationTypes => _types.isNotEmpty,
    DonorProfileSection.givingPreferences => _frequency.isNotEmpty,
  };

  String get _validationMessage => switch (widget.section) {
    DonorProfileSection.interests => 'Select at least one interest.',
    DonorProfileSection.donationTypes => 'Select at least one donation type.',
    DonorProfileSection.givingPreferences =>
      'Select at least one giving frequency.',
  };

  Future<void> _save() async {
    if (!_isValid) {
      _showMessage(_validationMessage);
      return;
    }

    setState(() => _isSaving = true);

    // Mock save — donor preferences live in memory for the prototype.
    await Future<void>.delayed(const Duration(milliseconds: 300));
    if (!mounted) return;

    final saved = _store.save(
      _store.profile.copyWith(
        interests: _interests,
        donationTypes: _types,
        givingFrequency: _frequency,
        monthlyBudget: _monthlyBudget,
      ),
    );

    setState(() => _isSaving = false);
    if (!mounted) return;
    _showMessage('${widget.section.title} updated.');
    Navigator.of(context).pop(saved);
  }

  List<Widget> _sectionFields() {
    switch (widget.section) {
      case DonorProfileSection.interests:
        return [
          SelectableOptionsSection(
            title: 'Interests',
            subtitle: 'What areas are you passionate about?',
            options: DonorProfileOptions.interests,
            selected: _interests.map((interest) => interest.label).toSet(),
            onToggle: _toggleInterestByLabel,
          ),
        ];

      case DonorProfileSection.donationTypes:
        return [
          SelectableOptionsSection(
            title: 'Donation types',
            subtitle: 'What would you like to give?',
            options: DonorProfileOptions.donationTypes,
            selected: _types,
            onToggle: (value) => _toggleString(_types, value),
          ),
        ];

      case DonorProfileSection.givingPreferences:
        return [
          SelectionSectionCard(
            title: 'Giving frequency',
            subtitle: 'How often would you like to give?',
            options: DonorProfileOptions.givingFrequency,
            selected: _frequency,
            onToggle: (value) => _toggleString(_frequency, value),
          ),
          const SizedBox(height: 16),
          DonorMonthlyBudgetSection(
            selectedBudget: _monthlyBudget,
            onChanged: (value) => setState(() => _monthlyBudget = value),
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
      body: Column(
        children: [
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
                          color: AppColors.primary.withValues(alpha: 0.12),
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
                            color: AppColors.secondary.withValues(alpha: 0.95),
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
