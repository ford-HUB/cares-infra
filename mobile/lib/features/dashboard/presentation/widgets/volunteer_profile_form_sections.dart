import 'package:flutter/material.dart';
import 'package:mobile/features/dashboard/domain/volunteer_profile.dart';
import 'package:mobile/features/dashboard/presentation/widgets/selectable_options_section.dart';
import 'package:mobile/features/dashboard/presentation/widgets/selection_section_card.dart';
import 'package:mobile/features/dashboard/presentation/widgets/volunteer_profile_hours_section.dart';

class VolunteerProfileFormSections extends StatelessWidget {
  const VolunteerProfileFormSections({
    super.key,
    required this.interestOptions,
    required this.selectedInterestLabels,
    required this.selectedSkills,
    required this.selectedAvailability,
    required this.hoursPerWeek,
    required this.onToggleInterest,
    required this.onToggleSkill,
    required this.onToggleAvailability,
    required this.onHoursChanged,
    this.interestsEmptyMessage,
  });

  final List<ProfileSelectableOption> interestOptions;
  final Set<String> selectedInterestLabels;
  final Set<String> selectedSkills;
  final Set<String> selectedAvailability;
  final int? hoursPerWeek;
  final ValueChanged<String> onToggleInterest;
  final ValueChanged<String> onToggleSkill;
  final ValueChanged<String> onToggleAvailability;
  final ValueChanged<int?> onHoursChanged;
  final String? interestsEmptyMessage;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SelectableOptionsSection(
          title: 'Interests',
          subtitle: 'What areas are you passionate about?',
          options: interestOptions,
          selected: selectedInterestLabels,
          onToggle: onToggleInterest,
          emptyMessage: interestsEmptyMessage ?? 'No interests available right now.',
        ),
        const SizedBox(height: 16),
        SelectableOptionsSection(
          title: 'Skills',
          subtitle: 'What can you contribute?',
          options: VolunteerProfileOptions.skills,
          selected: selectedSkills,
          onToggle: onToggleSkill,
        ),
        const SizedBox(height: 16),
        SelectionSectionCard(
          title: 'Availability',
          subtitle: 'Which days are you available?',
          options: VolunteerProfileOptions.availability,
          selected: selectedAvailability,
          onToggle: onToggleAvailability,
        ),
        const SizedBox(height: 16),
        VolunteerProfileHoursSection(
          selectedHours: hoursPerWeek,
          onChanged: onHoursChanged,
        ),
      ],
    );
  }
}
