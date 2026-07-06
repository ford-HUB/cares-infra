import 'package:flutter/material.dart';
import 'package:mobile/core/theme/app_theme.dart';

/// Presentation board — expands to fill available height above navigation.
class InfoBoard extends StatelessWidget {
  const InfoBoard({
    super.key,
    required this.title,
    required this.body,
    this.slideIndex = 0,
    this.slideCount = 1,
    this.expand = false,
    this.bottomInset = 0,
  });

  final String title;
  final String body;
  final int slideIndex;
  final int slideCount;
  final bool expand;
  final double bottomInset;

  @override
  Widget build(BuildContext context) {
    final content = Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(
            color: AppColors.primary,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
          ),
          child: Row(
            children: [
              const Icon(Icons.school_rounded, color: Colors.white, size: 20),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'UCLM CARES',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 1.1,
                    color: Colors.white.withValues(alpha: 0.95),
                  ),
                ),
              ),
              Text(
                '${slideIndex + 1} of $slideCount',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: Colors.white.withValues(alpha: 0.9),
                ),
              ),
            ],
          ),
        ),
        Expanded(
          child: Container(
            margin: const EdgeInsets.all(10),
            padding: EdgeInsets.fromLTRB(16, 14, 16, 16 + bottomInset),
            decoration: BoxDecoration(
              color: const Color(0xFFFFFDE7),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: AppColors.fieldBorder),
            ),
            child: LayoutBuilder(
              builder: (context, constraints) {
                return SingleChildScrollView(
                  child: ConstrainedBox(
                    constraints: BoxConstraints(minHeight: constraints.maxHeight),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          title,
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 17,
                            fontWeight: FontWeight.w800,
                            color: AppColors.primaryDark,
                            letterSpacing: -0.2,
                          ),
                        ),
                        const SizedBox(height: 12),
                        Text(
                          body,
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 14,
                            height: 1.5,
                            fontWeight: FontWeight.w500,
                            color: AppColors.primaryDark.withValues(alpha: 0.9),
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        ),
      ],
    );

    if (!expand) {
      return Container(
        width: double.infinity,
        constraints: const BoxConstraints(maxWidth: 400),
        decoration: _boardDecoration,
        child: content,
      );
    }

    return Container(
      width: double.infinity,
      decoration: _boardDecoration,
      child: content,
    );
  }

  static final _boardDecoration = BoxDecoration(
    color: AppColors.primaryDark,
    borderRadius: BorderRadius.circular(16),
    boxShadow: [
      BoxShadow(
        color: AppColors.primary.withValues(alpha: 0.18),
        blurRadius: 16,
        offset: const Offset(0, 8),
      ),
    ],
  );
}
