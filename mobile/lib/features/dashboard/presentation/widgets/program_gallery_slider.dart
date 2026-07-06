import 'package:flutter/material.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/dashboard/domain/mock_program.dart';
import 'package:mobile/features/dashboard/presentation/screens/program_detail_screen.dart';

class ProgramGallerySlider extends StatefulWidget {
  const ProgramGallerySlider({
    super.key,
    required this.programs,
    required this.onProgramTap,
  });

  final List<MockProgram> programs;
  final ValueChanged<MockProgram> onProgramTap;

  @override
  State<ProgramGallerySlider> createState() => _ProgramGallerySliderState();
}

class _ProgramGallerySliderState extends State<ProgramGallerySlider> {
  final PageController _pageController = PageController(viewportFraction: 1);
  int _currentPage = 0;

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  void _goToPage(int index) {
    if (index < 0 || index >= widget.programs.length) return;
    if (!_pageController.hasClients) return;
    _pageController.animateToPage(
      index,
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeOutCubic,
    );
  }

  @override
  Widget build(BuildContext context) {
    if (widget.programs.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Expanded(
              child: Text(
                'Matched for You',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                  color: AppColors.primaryDark,
                ),
              ),
            ),
            Text(
              'Swipe to explore',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w500,
                color: AppColors.secondary.withValues(alpha: 0.9),
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        SizedBox(
          height: 188,
          width: double.infinity,
          child: ClipRect(
            child: PageView.builder(
              controller: _pageController,
              clipBehavior: Clip.hardEdge,
              itemCount: widget.programs.length,
              onPageChanged: (index) => setState(() => _currentPage = index),
              itemBuilder: (context, index) {
                final program = widget.programs[index];
                return _GalleryCard(
                  program: program,
                  onTap: () => widget.onProgramTap(program),
                );
              },
            ),
          ),
        ),
        const SizedBox(height: 8),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            for (var i = 0; i < widget.programs.length; i++)
              GestureDetector(
                onTap: () => _goToPage(i),
                child: AnimatedContainer(
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
              ),
          ],
        ),
      ],
    );
  }
}

class _GalleryCard extends StatelessWidget {
  const _GalleryCard({
    required this.program,
    required this.onTap,
  });

  final MockProgram program;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      borderRadius: BorderRadius.circular(18),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Stack(
          fit: StackFit.expand,
          children: [
            Image.network(
              program.coverImageUrl,
              fit: BoxFit.cover,
              errorBuilder: (context, error, stackTrace) => Container(
                color: AppColors.light.withValues(alpha: 0.5),
                child: const Icon(
                  Icons.collections_outlined,
                  size: 48,
                  color: AppColors.primaryDark,
                ),
              ),
            ),
            DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Colors.black.withValues(alpha: 0.15),
                    Colors.black.withValues(alpha: 0.75),
                  ],
                ),
              ),
            ),
            Positioned(
              top: 12,
              left: 12,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: AppColors.accent.withValues(alpha: 0.95),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(
                      Icons.auto_awesome,
                      size: 14,
                      color: AppColors.primaryDark,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      '${program.profileMatchPercent}% match',
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                        color: AppColors.primaryDark,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            Positioned(
              left: 14,
              right: 14,
              bottom: 14,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    program.title,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                      height: 1.15,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    program.subtitle,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.9),
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                    ),
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

void openProgramDetail(BuildContext context, MockProgram program) {
  Navigator.of(context).push(
    MaterialPageRoute<void>(
      builder: (_) => ProgramDetailScreen(program: program),
    ),
  );
}
