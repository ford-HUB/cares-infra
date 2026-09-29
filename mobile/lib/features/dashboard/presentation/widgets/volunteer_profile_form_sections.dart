import 'package:flutter/material.dart';
import 'package:mobile/features/dashboard/domain/volunteer_profile.dart';
import 'package:mobile/features/dashboard/presentation/widgets/selectable_options_section.dart';

class VolunteerProfileFormSections extends StatelessWidget {
  const VolunteerProfileFormSections({
    super.key,
    required this.interestOptions,
    required this.selectedInterestLabels,
    required this.onToggleInterest,
    this.interestsEmptyMessage,
  });

  final List<ProfileSelectableOption> interestOptions;
  final Set<String> selectedInterestLabels;
  final ValueChanged<String> onToggleInterest;
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
          emptyMessage:
              interestsEmptyMessage ?? 'No interests available right now.',
        ),
      ],
    );
  }
}
