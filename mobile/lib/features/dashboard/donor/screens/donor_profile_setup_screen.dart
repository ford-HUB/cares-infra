import 'package:flutter/material.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/dashboard/donor/data/donor_profile_store.dart';
import 'package:mobile/features/dashboard/donor/domain/donor_profile.dart';
import 'package:mobile/features/dashboard/presentation/widgets/selectable_options_section.dart';
import 'package:mobile/features/dashboard/presentation/widgets/selection_section_card.dart';
import 'package:mobile/features/interests/domain/user_interest.dart';

/// Donor interest profiling — same structure, design, and functionality as
/// the volunteer profiling: interests, what they give, how often, how much.
class DonorProfileSetupScreen extends StatefulWidget {
  const DonorProfileSetupScreen({super.key, this.initialProfile});

  final DonorProfile? initialProfile;

  static Future<DonorProfile?> open(
    BuildContext context, {
    DonorProfile? initialProfile,
  }) {
    return Navigator.of(context).push<DonorProfile>(
      MaterialPageRoute<DonorProfile>(
        builder: (_) => DonorProfileSetupScreen(initialProfile: initialProfile),
      ),
    );
  }

  @override
  State<DonorProfileSetupScreen> createState() =>
      _DonorProfileSetupScreenState();
}

class _DonorProfileSetupScreenState extends State<DonorProfileSetupScreen> {
  final _store = DonorProfileStore.instance;

  final Set<UserInterest> _selectedInterests = {};
  final Set<String> _selectedTypes = {};
  final Set<String> _selectedFrequency = {};
  int? _monthlyBudget;
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    final profile = widget.initialProfile ?? _store.profile;
    _selectedInterests.addAll(profile.interests);
    _selectedTypes.addAll(profile.donationTypes);
    _selectedFrequency.addAll(profile.givingFrequency);
    _monthlyBudget = profile.monthlyBudget;
  }

  void _toggleInterestByLabel(String label) {
    final interest = DonorProfileOptions.interestForLabel(label);
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

  Future<void> _submit() async {
    if (_selectedInterests.isEmpty ||
        _selectedTypes.isEmpty ||
        _selectedFrequency.isEmpty) {
      _showMessage(
        'Please complete interests, donation types, and giving frequency.',
      );
      return;
    }

    setState(() => _isSaving = true);
    FocusManager.instance.primaryFocus?.unfocus();

    // Mock save — the donor profile lives in memory for the prototype.
    await Future<void>.delayed(const Duration(milliseconds: 350));
    if (!mounted) return;

    final saved = _store.save(
      DonorProfile(
        interests: {..._selectedInterests},
        donationTypes: {..._selectedTypes},
        givingFrequency: {..._selectedFrequency},
        monthlyBudget: _monthlyBudget,
        profileComplete: true,
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
          'Complete Your Profile',
          style: TextStyle(fontWeight: FontWeight.w800),
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
                  Text(
                    'Tell us what you care about',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w800,
                      color: AppColors.primaryDark,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Your interests and giving preferences help CARES match '
                    'you with the campaigns that need you most.',
                    style: TextStyle(
                      fontSize: 14,
                      height: 1.45,
                      color: AppColors.secondary.withValues(alpha: 0.95),
                    ),
                  ),
                  const SizedBox(height: 24),
                  DonorProfileFormSections(
                    selectedInterestLabels: _selectedInterests
                        .map((interest) => interest.label)
                        .toSet(),
                    selectedDonationTypes: _selectedTypes,
                    selectedFrequency: _selectedFrequency,
                    monthlyBudget: _monthlyBudget,
                    onToggleInterest: _toggleInterestByLabel,
                    onToggleDonationType: (value) =>
                        _toggleString(_selectedTypes, value),
                    onToggleFrequency: (value) =>
                        _toggleString(_selectedFrequency, value),
                    onBudgetChanged: (value) =>
                        setState(() => _monthlyBudget = value),
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

/// The donor profiling sections — mirrors `VolunteerProfileFormSections`.
class DonorProfileFormSections extends StatelessWidget {
  const DonorProfileFormSections({
    super.key,
    required this.selectedInterestLabels,
    required this.selectedDonationTypes,
    required this.selectedFrequency,
    required this.monthlyBudget,
    required this.onToggleInterest,
    required this.onToggleDonationType,
    required this.onToggleFrequency,
    required this.onBudgetChanged,
  });

  final Set<String> selectedInterestLabels;
  final Set<String> selectedDonationTypes;
  final Set<String> selectedFrequency;
  final int? monthlyBudget;
  final ValueChanged<String> onToggleInterest;
  final ValueChanged<String> onToggleDonationType;
  final ValueChanged<String> onToggleFrequency;
  final ValueChanged<int?> onBudgetChanged;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SelectableOptionsSection(
          title: 'Interests',
          subtitle: 'What areas are you passionate about?',
          options: DonorProfileOptions.interests,
          selected: selectedInterestLabels,
          onToggle: onToggleInterest,
        ),
        const SizedBox(height: 16),
        SelectableOptionsSection(
          title: 'Donation types',
          subtitle: 'What would you like to give?',
          options: DonorProfileOptions.donationTypes,
          selected: selectedDonationTypes,
          onToggle: onToggleDonationType,
        ),
        const SizedBox(height: 16),
        SelectionSectionCard(
          title: 'Giving frequency',
          subtitle: 'How often would you like to give?',
          options: DonorProfileOptions.givingFrequency,
          selected: selectedFrequency,
          onToggle: onToggleFrequency,
        ),
        const SizedBox(height: 16),
        DonorMonthlyBudgetSection(
          selectedBudget: monthlyBudget,
          onChanged: onBudgetChanged,
        ),
      ],
    );
  }
}

/// Monthly giving budget — mirrors the volunteer "Hours per week" section.
class DonorMonthlyBudgetSection extends StatelessWidget {
  const DonorMonthlyBudgetSection({
    super.key,
    required this.selectedBudget,
    required this.onChanged,
  });

  final int? selectedBudget;
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
            'Monthly giving budget',
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w800,
              color: AppColors.primaryDark,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Optional — helps CARES suggest campaigns within your budget.',
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
            children: DonorProfileOptions.monthlyBudgets.map((amount) {
              final isSelected = selectedBudget == amount;
              return FilterChip(
                label: Text(DonorProfileOptions.pesoLabel(amount)),
                selected: isSelected,
                onSelected: (_) => onChanged(isSelected ? null : amount),
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
