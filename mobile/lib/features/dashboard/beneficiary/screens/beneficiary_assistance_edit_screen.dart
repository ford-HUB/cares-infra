import 'package:flutter/material.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/dashboard/beneficiary/data/beneficiary_profile_store.dart';
import 'package:mobile/features/dashboard/beneficiary/domain/beneficiary_profile.dart';
import 'package:mobile/features/dashboard/presentation/widgets/selectable_options_section.dart';
import 'package:mobile/features/dashboard/presentation/widgets/selection_section_card.dart';

/// The assistance-related sections a beneficiary can edit on their own.
enum BeneficiaryProfileSection { assistanceNeeds, household, visitAvailability }

extension BeneficiaryProfileSectionX on BeneficiaryProfileSection {
  String get title => switch (this) {
    BeneficiaryProfileSection.assistanceNeeds => 'Assistance Needs',
    BeneficiaryProfileSection.household => 'Household Situation',
    BeneficiaryProfileSection.visitAvailability => 'Visit Availability',
  };

  String get intro => switch (this) {
    BeneficiaryProfileSection.assistanceNeeds =>
      'Update the kinds of support your household needs from CARES.',
    BeneficiaryProfileSection.household =>
      'Keep your household details current so requests are prioritised fairly.',
    BeneficiaryProfileSection.visitAvailability =>
      'Tell us when a field officer can visit for your needs assessment.',
  };

  IconData get icon => switch (this) {
    BeneficiaryProfileSection.assistanceNeeds =>
      Icons.volunteer_activism_outlined,
    BeneficiaryProfileSection.household => Icons.family_restroom_rounded,
    BeneficiaryProfileSection.visitAvailability =>
      Icons.event_available_outlined,
  };
}

/// Focused editor for one assistance-related section, opened from the edit
/// icon beside that section on the beneficiary profile.
class BeneficiaryAssistanceEditScreen extends StatefulWidget {
  const BeneficiaryAssistanceEditScreen({super.key, required this.section});

  final BeneficiaryProfileSection section;

  static Future<BeneficiaryProfile?> open(
    BuildContext context,
    BeneficiaryProfileSection section,
  ) {
    return Navigator.of(context).push<BeneficiaryProfile>(
      MaterialPageRoute<BeneficiaryProfile>(
        builder: (_) => BeneficiaryAssistanceEditScreen(section: section),
      ),
    );
  }

  @override
  State<BeneficiaryAssistanceEditScreen> createState() =>
      _BeneficiaryAssistanceEditScreenState();
}

class _BeneficiaryAssistanceEditScreenState
    extends State<BeneficiaryAssistanceEditScreen> {
  final _store = BeneficiaryProfileStore.instance;

  late Set<String> _needs;
  late Set<String> _situation;
  late Set<String> _visitDays;
  late Set<String> _visitTimes;
  int? _householdSize;
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    final profile = _store.profile;
    _needs = {...profile.assistanceNeeds};
    _situation = {...profile.householdSituation};
    _visitDays = {...profile.visitAvailability};
    _visitTimes = {...profile.visitTimes};
    _householdSize = profile.householdSize;
  }

  void _toggle(Set<String> set, String value) {
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
    BeneficiaryProfileSection.assistanceNeeds => _needs.isNotEmpty,
    BeneficiaryProfileSection.household => _situation.isNotEmpty,
    BeneficiaryProfileSection.visitAvailability => _visitDays.isNotEmpty,
  };

  String get _validationMessage => switch (widget.section) {
    BeneficiaryProfileSection.assistanceNeeds =>
      'Select at least one assistance need.',
    BeneficiaryProfileSection.household =>
      'Select at least one household situation.',
    BeneficiaryProfileSection.visitAvailability =>
      'Select at least one day a field officer can visit.',
  };

  Future<void> _save() async {
    if (!_isValid) {
      _showMessage(_validationMessage);
      return;
    }

    setState(() => _isSaving = true);

    // Mock save — assistance details live in memory for the prototype.
    await Future<void>.delayed(const Duration(milliseconds: 300));
    if (!mounted) return;

    final saved = _store.save(
      _store.profile.copyWith(
        assistanceNeeds: _needs,
        householdSituation: _situation,
        visitAvailability: _visitDays,
        visitTimes: _visitTimes,
        householdSize: _householdSize,
      ),
    );

    setState(() => _isSaving = false);
    if (!mounted) return;
    _showMessage('${widget.section.title} updated.');
    Navigator.of(context).pop(saved);
  }

  List<Widget> _sectionFields() {
    switch (widget.section) {
      case BeneficiaryProfileSection.assistanceNeeds:
        return [
          SelectableOptionsSection(
            title: 'Assistance needs',
            subtitle: 'What kind of support does your household need?',
            options: BeneficiaryProfileOptions.assistanceNeeds,
            selected: _needs,
            onToggle: (value) => _toggle(_needs, value),
          ),
        ];

      case BeneficiaryProfileSection.household:
        return [
          SelectableOptionsSection(
            title: 'Household situation',
            subtitle: 'What describes your household today?',
            options: BeneficiaryProfileOptions.householdSituation,
            selected: _situation,
            onToggle: (value) => _toggle(_situation, value),
          ),
          const SizedBox(height: 16),
          _HouseholdSizeCard(
            selectedSize: _householdSize,
            onChanged: (value) => setState(() => _householdSize = value),
          ),
        ];

      case BeneficiaryProfileSection.visitAvailability:
        return [
          SelectionSectionCard(
            title: 'Preferred visit days',
            subtitle: 'Which days can a field officer visit?',
            options: BeneficiaryProfileOptions.visitDays,
            selected: _visitDays,
            onToggle: (value) => _toggle(_visitDays, value),
          ),
          const SizedBox(height: 16),
          SelectionSectionCard(
            title: 'Preferred visit times',
            subtitle: 'What time of day works best?',
            options: BeneficiaryProfileOptions.visitTimes,
            selected: _visitTimes,
            onToggle: (value) => _toggle(_visitTimes, value),
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

class _HouseholdSizeCard extends StatelessWidget {
  const _HouseholdSizeCard({
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
            'How many people live in your household?',
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
