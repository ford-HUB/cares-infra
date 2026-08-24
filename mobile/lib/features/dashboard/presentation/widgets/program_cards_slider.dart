import 'package:flutter/material.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/dashboard/domain/mock_program.dart';

class ProgramCardsSlider extends StatefulWidget {
  const ProgramCardsSlider({
    super.key,
    required this.programs,
    required this.onProgramTap,
    this.expand = false,
  });

  final List<MockProgram> programs;
  final ValueChanged<MockProgram> onProgramTap;
  final bool expand;

  @override
  State<ProgramCardsSlider> createState() => _ProgramCardsSliderState();
}

class _ProgramCardsSliderState extends State<ProgramCardsSlider> {
  final PageController _pageController = PageController(viewportFraction: 1);
  int _currentPage = 0;

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (widget.programs.isEmpty) return const SizedBox.shrink();

    final pageView = ClipRect(
      child: PageView.builder(
        controller: _pageController,
        clipBehavior: Clip.hardEdge,
        itemCount: widget.programs.length,
        onPageChanged: (index) => setState(() => _currentPage = index),
        itemBuilder: (context, index) {
          final program = widget.programs[index];
          return _ProgramCard(
            program: program,
            onTap: () => widget.onProgramTap(program),
          );
        },
      ),
    );

    final dots = Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        for (var i = 0; i < widget.programs.length; i++)
          AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            margin: const EdgeInsets.symmetric(horizontal: 3),
            width: i == _currentPage ? 18 : 7,
            height: 7,
            decoration: BoxDecoration(
              color: i == _currentPage
                  ? AppColors.primary
                  : AppColors.light.withValues(alpha: 0.85),
              borderRadius: BorderRadius.circular(8),
            ),
          ),
      ],
    );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text(
          'Programs',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w800,
            color: AppColors.primaryDark,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          'Swipe to see more programs',
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w500,
            color: AppColors.secondary.withValues(alpha: 0.95),
          ),
        ),
        const SizedBox(height: 10),
        if (widget.expand)
          Expanded(child: pageView)
        else
          SizedBox(height: 220, child: pageView),
        const SizedBox(height: 8),
        dots,
      ],
    );
  }
}

class _ProgramCard extends StatelessWidget {
  const _ProgramCard({required this.program, required this.onTap});

  final MockProgram program;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(16),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Expanded(
              child: Stack(
                fit: StackFit.expand,
                children: [
                  Image.network(
                    program.coverImageUrl,
                    fit: BoxFit.cover,
                    errorBuilder: (context, error, stackTrace) => Container(
                      color: AppColors.light.withValues(alpha: 0.5),
                      child: const Icon(
                        Icons.event_note_outlined,
                        color: AppColors.primaryDark,
                      ),
                    ),
                  ),
                  Positioned(
                    top: 8,
                    left: 8,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 3,
                      ),
                      decoration: BoxDecoration(
                        color: AppColors.primary,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        '${program.events.length} events',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 8, 12, 10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    program.title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w800,
                      color: AppColors.primaryDark,
                      height: 1.15,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Wrap(
                    spacing: 4,
                    runSpacing: 4,
                    children: [
                      for (final tag in program.interestTags.take(2))
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 7,
                            vertical: 2,
                          ),
                          decoration: BoxDecoration(
                            color: AppColors.light.withValues(alpha: 0.4),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            tag,
                            style: const TextStyle(
                              fontSize: 9,
                              fontWeight: FontWeight.w600,
                              color: AppColors.primaryDark,
                            ),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      const Icon(
                        Icons.auto_awesome,
                        size: 14,
                        color: AppColors.primary,
                      ),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(
                          '${program.profileMatchPercent}% profile match',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: AppColors.secondary.withValues(alpha: 0.95),
                          ),
                        ),
                      ),
                      const Icon(
                        Icons.arrow_forward_ios,
                        size: 12,
                        color: AppColors.primaryDark,
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
