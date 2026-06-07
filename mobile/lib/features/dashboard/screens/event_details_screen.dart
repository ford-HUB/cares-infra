import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';
import '../data/mock_events.dart';

class EventDetailsScreen extends StatelessWidget {
  const EventDetailsScreen({super.key, required this.event});

  final CaresEvent event;

  static void open(BuildContext context, CaresEvent event) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => EventDetailsScreen(event: event),
      ),
    );
  }

  void _register(BuildContext context) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Registered for ${event.title} (static prototype).'),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  Widget _infoTile({
    required IconData icon,
    required String label,
    required String value,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: AppColors.inputFill,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, size: 20, color: AppColors.primary),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppColors.textMuted,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  value,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary,
                    height: 1.35,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final filledPercent = (event.capacityFilled * 100).round();

    return Scaffold(
      backgroundColor: AppColors.background,
      body: Column(
        children: [
          Expanded(
            child: CustomScrollView(
              slivers: [
                SliverAppBar(
                  expandedHeight: 220,
                  pinned: true,
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  leading: IconButton(
                    icon: const Icon(Icons.arrow_back_rounded),
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                  flexibleSpace: FlexibleSpaceBar(
                    background: Stack(
                      fit: StackFit.expand,
                      children: [
                        const DecoratedBox(
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                              colors: [AppColors.primary, AppColors.primaryLight],
                            ),
                          ),
                        ),
                        Positioned(
                          right: -30,
                          bottom: -30,
                          child: Icon(
                            Icons.volunteer_activism_rounded,
                            size: 180,
                            color: Colors.white.withValues(alpha: 0.12),
                          ),
                        ),
                        Padding(
                          padding: const EdgeInsets.fromLTRB(20, 72, 20, 20),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisAlignment: MainAxisAlignment.end,
                            children: [
                              if (event.isFeatured)
                                Container(
                                  margin: const EdgeInsets.only(bottom: 10),
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 10,
                                    vertical: 4,
                                  ),
                                  decoration: BoxDecoration(
                                    color: Colors.white.withValues(alpha: 0.22),
                                    borderRadius: BorderRadius.circular(20),
                                  ),
                                  child: const Text(
                                    'Featured Event',
                                    style: TextStyle(
                                      color: Colors.white,
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ),
                              Text(
                                event.organization,
                                style: TextStyle(
                                  color: Colors.white.withValues(alpha: 0.9),
                                  fontSize: 14,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                              const SizedBox(height: 6),
                              Text(
                                event.title,
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 24,
                                  fontWeight: FontWeight.w800,
                                  height: 1.2,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(20, 24, 20, 24),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Row(
                          children: [
                            _CountdownChip(daysUntil: event.daysUntil),
                            const SizedBox(width: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 10,
                                vertical: 6,
                              ),
                              decoration: BoxDecoration(
                                color: AppColors.primary.withValues(alpha: 0.12),
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: Text(
                                '${event.slotsLeft} slots left',
                                style: const TextStyle(
                                  color: AppColors.primary,
                                  fontWeight: FontWeight.w700,
                                  fontSize: 13,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 24),
                        Container(
                          padding: const EdgeInsets.all(18),
                          decoration: BoxDecoration(
                            color: AppColors.surface,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: AppColors.inputFill),
                          ),
                          child: Column(
                            children: [
                              _infoTile(
                                icon: Icons.calendar_today_rounded,
                                label: 'Date',
                                value:
                                    '${event.monthLabel} ${event.dayLabel}, ${event.date.year}',
                              ),
                              _infoTile(
                                icon: Icons.schedule_rounded,
                                label: 'Time',
                                value: event.time,
                              ),
                              _infoTile(
                                icon: Icons.location_on_outlined,
                                label: 'Location',
                                value: event.location,
                              ),
                              _infoTile(
                                icon: Icons.groups_rounded,
                                label: 'Organizer',
                                value: event.organization,
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 20),
                        const Text(
                          'About this event',
                          style: TextStyle(
                            fontSize: 17,
                            fontWeight: FontWeight.w800,
                            color: AppColors.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 10),
                        Text(
                          event.description,
                          style: const TextStyle(
                            fontSize: 15,
                            height: 1.55,
                            color: AppColors.textSecondary,
                          ),
                        ),
                        const SizedBox(height: 24),
                        const Text(
                          'Registration status',
                          style: TextStyle(
                            fontSize: 17,
                            fontWeight: FontWeight.w800,
                            color: AppColors.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 12),
                        Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: AppColors.surface,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: AppColors.inputFill),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment:
                                    MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    '$filledPercent% filled',
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w600,
                                      color: AppColors.textPrimary,
                                    ),
                                  ),
                                  Text(
                                    '${event.slotsLeft} spots available',
                                    style: const TextStyle(
                                      fontSize: 13,
                                      color: AppColors.textSecondary,
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 10),
                              ClipRRect(
                                borderRadius: BorderRadius.circular(6),
                                child: LinearProgressIndicator(
                                  value: event.capacityFilled,
                                  minHeight: 8,
                                  backgroundColor: AppColors.inputFill,
                                  color: AppColors.primary,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
          SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
              child: FilledButton(
                onPressed: () => _register(context),
                child: const Text('Register for Event'),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _CountdownChip extends StatelessWidget {
  const _CountdownChip({required this.daysUntil});

  final int daysUntil;

  @override
  Widget build(BuildContext context) {
    final urgent = daysUntil <= 3;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: urgent
            ? AppColors.secondary.withValues(alpha: 0.12)
            : AppColors.inputFill,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        daysUntil == 0 ? 'Today' : 'In ${daysUntil}d',
        style: TextStyle(
          fontSize: 13,
          fontWeight: FontWeight.w700,
          color: urgent ? AppColors.secondary : AppColors.primary,
        ),
      ),
    );
  }
}
