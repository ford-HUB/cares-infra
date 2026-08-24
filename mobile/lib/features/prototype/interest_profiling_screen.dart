import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';
import 'models/prototype_user_data.dart';
import 'widgets/prototype_widgets.dart';
import 'profile_completion_screen.dart';

class InterestProfilingScreen extends StatefulWidget {
  const InterestProfilingScreen({super.key, required this.userData});

  final PrototypeUserData userData;

  @override
  State<InterestProfilingScreen> createState() =>
      _InterestProfilingScreenState();
}

class _InterestProfilingScreenState extends State<InterestProfilingScreen> {
  static const _interests = [
    'Environment',
    'Education',
    'Health',
    'Community Service',
    'Technology',
    'Disaster Response',
  ];

  static const _skills = [
    'Leadership',
    'Communication',
    'Teaching',
    'Programming',
    'Graphic Design',
    'First Aid',
  ];

  static const _causes = [
    'Food Security',
    'Youth Development',
    'Environmental Conservation',
    'Healthcare Access',
    'Disaster Relief',
    'Education Equity',
  ];

  static const _volunteerPrefs = [
    'Weekends',
    'Weekdays',
    'Evenings',
    'On-site',
    'Remote',
    'Group Activities',
  ];

  void _toggle(Set<String> set, String value) {
    setState(() {
      if (set.contains(value)) {
        set.remove(value);
      } else {
        set.add(value);
      }
    });
  }

  void _continue() {
    final data = widget.userData;
    if (data.interests.isEmpty ||
        data.skills.isEmpty ||
        data.causes.isEmpty ||
        data.volunteerPreferences.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please select at least one option in each section.'),
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => ProfileCompletionScreen(userData: data),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final data = widget.userData;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        foregroundColor: AppColors.textPrimary,
        title: const Text('Interest Profiling'),
      ),
      body: Column(
        children: [
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(24, 8, 24, 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const PrototypeProgressHeader(
                    step: 1,
                    totalSteps: 2,
                    title: 'Tell us about yourself',
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Your selections help us match you with volunteer opportunities and causes that fit you best.',
                    style: Theme.of(context).textTheme.bodyLarge,
                  ),
                  const SizedBox(height: 24),
                  PrototypeSectionCard(
                    title: 'Interests',
                    subtitle: 'What areas are you passionate about?',
                    options: _interests,
                    selected: data.interests,
                    onToggle: (v) => _toggle(data.interests, v),
                  ),
                  const SizedBox(height: 16),
                  PrototypeSectionCard(
                    title: 'Skills',
                    subtitle: 'What can you contribute?',
                    options: _skills,
                    selected: data.skills,
                    onToggle: (v) => _toggle(data.skills, v),
                  ),
                  const SizedBox(height: 16),
                  PrototypeSectionCard(
                    title: 'Causes to Support',
                    subtitle: 'Which causes matter most to you?',
                    options: _causes,
                    selected: data.causes,
                    onToggle: (v) => _toggle(data.causes, v),
                  ),
                  const SizedBox(height: 16),
                  PrototypeSectionCard(
                    title: 'Volunteer Preferences',
                    subtitle: 'When and how do you prefer to volunteer?',
                    options: _volunteerPrefs,
                    selected: data.volunteerPreferences,
                    onToggle: (v) => _toggle(data.volunteerPreferences, v),
                  ),
                ],
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
            child: FilledButton(
              onPressed: _continue,
              child: const Text('Continue'),
            ),
          ),
        ],
      ),
    );
  }
}
