import 'package:flutter/material.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/dashboard/beneficiary/data/beneficiary_profile_store.dart';
import 'package:mobile/features/dashboard/beneficiary/domain/beneficiary_profile.dart';
import 'package:mobile/features/dashboard/presentation/widgets/selectable_options_section.dart';
import 'package:mobile/features/dashboard/presentation/widgets/selection_section_card.dart';

/// Onboarding flow for beneficiaries who have not finished setting up their
/// profile — same layout and behaviour as the volunteer setup screen, with
/// household details instead of volunteer interests and skills.
class BeneficiaryProfileSetupScreen extends StatefulWidget {
  const BeneficiaryProfileSetupScreen({super.key, this.initialProfile});

  final BeneficiaryProfile? initialProfile;

  /// Returns the saved profile, or null when the user backed out.
  static Future<BeneficiaryProfile?> open(
    BuildContext context, {
    BeneficiaryProfile? initialProfile,
  }) {
    return Navigator.of(context).push<BeneficiaryProfile>(
      MaterialPageRoute<BeneficiaryProfile>(
        builder: (_) =>
            BeneficiaryProfileSetupScreen(initialProfile: initialProfile),
      ),
    );
  }

  @override
  State<BeneficiaryProfileSetupScreen> createState() =>
      _BeneficiaryProfileSetupScreenState();
}

class _BeneficiaryProfileSetupScreenState
    extends State<BeneficiaryProfileSetupScreen> {
  final _store = BeneficiaryProfileStore.instance;

  final Set<String> _selectedNeeds = {};
  final Set<String> _selectedSituation = {};
  final Set<String> _selectedVisitDays = {};
  final Set<String> _selectedVisitTimes = {};
  int? _householdSize;
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    _applyInitialProfile(widget.initialProfile ?? _store.profile);
  }

  void _applyInitialProfile(BeneficiaryProfile profile) {
    _selectedNeeds
      ..clear()
      ..addAll(profile.assistanceNeeds);
    _selectedSituation
      ..clear()
      ..addAll(profile.householdSituation);
    _selectedVisitDays
      ..clear()
      ..addAll(profile.visitAvailability);
    _selectedVisitTimes
      ..clear()
      ..addAll(profile.visitTimes);
    _householdSize = profile.householdSize;
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
    if (_selectedNeeds.isEmpty ||
        _selectedSituation.isEmpty ||
        _selectedVisitDays.isEmpty) {
      _showMessage(
        'Please complete assistance needs, household situation, and visit days.',
      );
      return;
    }

    setState(() => _isSaving = true);
    FocusManager.instance.primaryFocus?.unfocus();

    // Mock save — the beneficiary profile lives in memory for the prototype.
    await Future<void>.delayed(const Duration(milliseconds: 350));
    if (!mounted) return;

    final saved = _store.save(
      BeneficiaryProfile(
        assistanceNeeds: {..._selectedNeeds},
        householdSituation: {..._selectedSituation},
        visitAvailability: {..._selectedVisitDays},
        visitTimes: {..._selectedVisitTimes},
        householdSize: _householdSize,
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
                    'Tell us about your household',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w800,
                      color: AppColors.primaryDark,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'These details help CARES prioritise your requests and '
                    'schedule your needs assessment visit.',
                    style: TextStyle(
                      fontSize: 14,
                      height: 1.45,
                      color: AppColors.secondary.withValues(alpha: 0.95),
                    ),
                  ),
                  const SizedBox(height: 24),
                  SelectableOptionsSection(
                    title: 'Assistance needs',
                    subtitle: 'What kind of support does your household need?',
                    options: BeneficiaryProfileOptions.assistanceNeeds,
                    selected: _selectedNeeds,
                    onToggle: (value) => _toggleString(_selectedNeeds, value),
                  ),
                  const SizedBox(height: 16),
                  SelectableOptionsSection(
                    title: 'Household situation',
                    subtitle: 'What describes your household today?',
                    options: BeneficiaryProfileOptions.householdSituation,
                    selected: _selectedSituation,
                    onToggle: (value) =>
                        _toggleString(_selectedSituation, value),
                  ),
                  const SizedBox(height: 16),
                  SelectionSectionCard(
                    title: 'Preferred visit days',
                    subtitle: 'Which days can a field officer visit?',
                    options: BeneficiaryProfileOptions.visitDays,
                    selected: _selectedVisitDays,
                    onToggle: (value) =>
                        _toggleString(_selectedVisitDays, value),
                  ),
                  const SizedBox(height: 16),
                  SelectionSectionCard(
                    title: 'Preferred visit times',
                    subtitle: 'What time of day works best?',
                    options: BeneficiaryProfileOptions.visitTimes,
                    selected: _selectedVisitTimes,
                    onToggle: (value) =>
                        _toggleString(_selectedVisitTimes, value),
                  ),
                  const SizedBox(height: 16),
                  _HouseholdSizeSection(
                    selectedSize: _householdSize,
                    onChanged: (value) =>
                        setState(() => _householdSize = value),
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

/// Household size picker — mirrors the volunteer "Hours per week" section.
class _HouseholdSizeSection extends StatelessWidget {
  const _HouseholdSizeSection({
    required this.selectedSize,
    required this.onChanged,
  });

  final int? selectedSize;
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
            'Household size',
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w800,
              color: AppColors.primaryDark,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Optional — helps the relief desk size your assistance.',
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
            children: BeneficiaryProfileOptions.householdSizes.map((size) {
              final isSelected = selectedSize == size;
              final label =
                  size == BeneficiaryProfileOptions.householdSizes.last
                  ? '$size+ members'
                  : '$size member${size == 1 ? '' : 's'}';
              return FilterChip(
                label: Text(label),
                selected: isSelected,
                onSelected: (_) => onChanged(isSelected ? null : size),
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
