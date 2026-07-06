import 'package:flutter/material.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/dashboard/domain/mock_program.dart';
import 'package:mobile/features/dashboard/presentation/widgets/program_cards_slider.dart';
import 'package:mobile/features/dashboard/presentation/widgets/program_gallery_slider.dart';

class ProgramsTabScreen extends StatelessWidget {
  const ProgramsTabScreen({
    super.key,
    this.userInterests = MockVolunteerInterests.defaults,
  });

  final Set<String> userInterests;

  void _openProgram(BuildContext context, MockProgram program) {
    openProgramDetail(context, program);
  }

  @override
  Widget build(BuildContext context) {
    final matchedPrograms = MockPrograms.matchedForInterests(userInterests);

    return SafeArea(
      bottom: false,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Events',
                  style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                    color: AppColors.primaryDark,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Upcoming events matched to your interests',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                    color: AppColors.secondary.withValues(alpha: 0.95),
                  ),
                ),
                const SizedBox(height: 14),
                ProgramGallerySlider(
                  programs: matchedPrograms,
                  onProgramTap: (program) => _openProgram(context, program),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 8),
              child: ProgramCardsSlider(
                programs: matchedPrograms,
                expand: true,
                onProgramTap: (program) => _openProgram(context, program),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
