import 'package:flutter/material.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/dashboard/domain/mock_program.dart';

class ProgramEventCard extends StatelessWidget {
  const ProgramEventCard({super.key, required this.event, this.onTap});

  final MockProgramEvent event;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(14),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            SizedBox(
              height: 120,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  Image.network(
                    event.imageUrl,
                    fit: BoxFit.cover,
                    errorBuilder: (context, error, stackTrace) => Container(
                      color: AppColors.light.withValues(alpha: 0.5),
                      child: const Icon(
                        Icons.event,
                        size: 36,
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
                        event.category,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ),
                  Positioned(
                    top: 8,
                    right: 8,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 3,
                      ),
                      decoration: BoxDecoration(
                        color: AppColors.accent.withValues(alpha: 0.95),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        '${event.profileMatchPercent}% match',
                        style: const TextStyle(
                          color: AppColors.primaryDark,
                          fontSize: 10,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    event.title,
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w800,
                      color: AppColors.primaryDark,
                    ),
                  ),
                  if (event.description != null) ...[
                    const SizedBox(height: 4),
                    Text(
                      event.description!,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 12,
                        height: 1.35,
                        color: AppColors.secondary.withValues(alpha: 0.95),
                      ),
                    ),
                  ],
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Icon(
                        Icons.calendar_today_outlined,
                        size: 13,
                        color: AppColors.secondary.withValues(alpha: 0.9),
                      ),
                      const SizedBox(width: 4),
                      Text(
                        event.date,
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: AppColors.secondary.withValues(alpha: 0.95),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Icon(
                        Icons.location_on_outlined,
                        size: 13,
                        color: AppColors.secondary.withValues(alpha: 0.9),
                      ),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(
                          event.location,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: AppColors.secondary.withValues(alpha: 0.95),
                          ),
                        ),
                      ),
                    ],
                  ),
                  if (event.matchedTraits.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: [
                        for (final trait in event.matchedTraits)
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 7,
                              vertical: 3,
                            ),
                            decoration: BoxDecoration(
                              color: AppColors.light.withValues(alpha: 0.35),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              trait,
                              style: const TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w600,
                                color: AppColors.primaryDark,
                              ),
                            ),
                          ),
                      ],
                    ),
                  ],
                  if (event.spotsLeft != null || event.hours != null) ...[
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        if (event.spotsLeft != null)
                          _MetaChip(
                            icon: Icons.people_outline,
                            label: '${event.spotsLeft} spots',
                          ),
                        if (event.spotsLeft != null && event.hours != null)
                          const SizedBox(width: 8),
                        if (event.hours != null)
                          _MetaChip(
                            icon: Icons.schedule_outlined,
                            label: '${event.hours} hrs',
                          ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _MetaChip extends StatelessWidget {
  const _MetaChip({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
      decoration: BoxDecoration(
        color: AppColors.light.withValues(alpha: 0.35),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: AppColors.primaryDark),
          const SizedBox(width: 4),
          Text(
            label,
            style: const TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w600,
              color: AppColors.primaryDark,
            ),
          ),
        ],
      ),
    );
  }
}
