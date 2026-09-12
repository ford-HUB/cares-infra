import 'package:flutter/material.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/dashboard/data/assistance_request_data.dart';
import 'package:mobile/features/dashboard/domain/mock_event.dart';
import 'package:mobile/features/dashboard/presentation/widgets/featured_events_carousel.dart';
import 'package:mobile/features/dashboard/presentation/widgets/home_header.dart';
import 'package:mobile/features/dashboard/presentation/widgets/profile_completion_card.dart';
import 'package:mobile/features/dashboard/presentation/widgets/stats_row.dart';
import 'package:mobile/features/dashboard/screens/assistance_request_details_screen.dart';
import 'package:mobile/features/dashboard/widgets/assistance_request_widgets.dart';

/// Beneficiary home tab — same structure and styling as the volunteer home
/// tab (header, featured events, stats row, action card), with assistance
/// requests in place of volunteer service stats.
class BeneficiaryHomeTab extends StatefulWidget {
  const BeneficiaryHomeTab({
    super.key,
    required this.firstName,
    this.onRequestAssistance,
    this.onViewRequests,
    this.showProfileCompletionCard = false,
    this.onCompleteProfile,
  });

  final String firstName;
  final VoidCallback? onRequestAssistance;
  final VoidCallback? onViewRequests;
  final bool showProfileCompletionCard;
  final VoidCallback? onCompleteProfile;

  @override
  State<BeneficiaryHomeTab> createState() => _BeneficiaryHomeTabState();
}

class _BeneficiaryHomeTabState extends State<BeneficiaryHomeTab> {
  final _store = AssistanceRequestStore.instance;

  @override
  void initState() {
    super.initState();
    _store.addListener(_onStoreChanged);
  }

  @override
  void dispose() {
    _store.removeListener(_onStoreChanged);
    super.dispose();
  }

  void _onStoreChanged() {
    if (mounted) setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final current = _store.currentRequests;
    final approved = _store.approvedRequests;
    final completed = _store.completedRequests;
    final latest = _store.history.isEmpty ? null : _store.history.first;

    return SafeArea(
      bottom: false,
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 8),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            HomeHeader(
              firstName: widget.firstName,
              points: 0,
              badgeLabel: '${current.length} active',
            ),
            const SizedBox(height: 22),
            FeaturedEventsCarousel(events: MockEvents.featured),
            const SizedBox(height: 22),
            StatsRow.custom(
              items: [
                StatsRowItem(
                  icon: Icons.hourglass_top_outlined,
                  value: '${current.length}',
                  label: 'Pending',
                  iconBackground: const Color(0xFFFFE0B2),
                  iconColor: AppColors.accentOrange,
                ),
                StatsRowItem(
                  icon: Icons.verified_outlined,
                  value: '${approved.length}',
                  label: 'Approved',
                ),
                StatsRowItem(
                  icon: Icons.task_alt_outlined,
                  value: '${completed.length}',
                  label: 'Completed',
                ),
              ],
            ),
            if (widget.showProfileCompletionCard) ...[
              const SizedBox(height: 16),
              ProfileCompletionCard(
                onTap: widget.onCompleteProfile,
                title: 'Complete Your Profile',
                subtitle:
                    'Add your contact details & household size to speed up assistance',
                icon: Icons.assignment_ind_outlined,
              ),
            ],
            const SizedBox(height: 16),
            _RequestAssistanceCard(onTap: widget.onRequestAssistance),
            const SizedBox(height: 16),
            NeedsAssessmentCard(summary: kMockNeedsAssessment),
            if (latest != null) ...[
              const SizedBox(height: 20),
              Row(
                children: [
                  const Expanded(
                    child: Text(
                      'Latest request',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                        color: AppColors.primaryDark,
                      ),
                    ),
                  ),
                  if (widget.onViewRequests != null)
                    TextButton(
                      onPressed: widget.onViewRequests,
                      child: const Text('See all'),
                    ),
                ],
              ),
              const SizedBox(height: 8),
              AssistanceRequestCard(
                request: latest,
                onTap: () =>
                    AssistanceRequestDetailsScreen.open(context, latest),
              ),
            ],
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }
}

/// Primary action card — mirrors the volunteer profile-completion card.
class _RequestAssistanceCard extends StatelessWidget {
  const _RequestAssistanceCard({this.onTap});

  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.light.withValues(alpha: 0.28),
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppColors.primaryDark, width: 1.2),
          ),
          child: Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: const BoxDecoration(
                  color: AppColors.primaryDark,
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.volunteer_activism_outlined,
                  color: Colors.white,
                  size: 22,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Request Assistance',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w800,
                        color: AppColors.primaryDark,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Tell CARES what your household needs and track it here',
                      style: TextStyle(
                        fontSize: 12,
                        height: 1.35,
                        fontWeight: FontWeight.w500,
                        color: AppColors.secondary.withValues(alpha: 0.95),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              const Icon(
                Icons.chevron_right_rounded,
                color: AppColors.primaryDark,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
