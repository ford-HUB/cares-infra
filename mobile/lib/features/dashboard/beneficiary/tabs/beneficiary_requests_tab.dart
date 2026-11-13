import 'package:flutter/material.dart';

import '../../../../core/theme/app_theme.dart';
import '../../data/assistance_request_data.dart';
import '../../screens/assistance_request_details_screen.dart';
import '../../screens/assistance_request_form_screen.dart';
import '../../screens/needs_assessment_overview_screen.dart';
import '../../widgets/activity_tab_widgets.dart';
import '../../widgets/assistance_request_widgets.dart';
import '../../widgets/request_action_dialog.dart';

/// Beneficiary "Request" tab — where assistance needs are filed and tracked.
class BeneficiaryRequestsTab extends StatefulWidget {
  const BeneficiaryRequestsTab({super.key});

  @override
  State<BeneficiaryRequestsTab> createState() => _BeneficiaryRequestsTabState();
}

class _BeneficiaryRequestsTabState extends State<BeneficiaryRequestsTab> {
  final _store = AssistanceRequestStore.instance;
  final _assessment = NeedsAssessmentStore.instance;
  int _selectedFilter = 0;

  static const _filters = [
    (
      label: 'Current',
      icon: Icons.hourglass_top_rounded,
      hint: 'Requests still waiting on a decision.',
    ),
    (
      label: 'Approved',
      icon: Icons.verified_outlined,
      hint: 'Requests the office has approved.',
    ),
    (
      label: 'Completed',
      icon: Icons.task_alt_rounded,
      hint: 'Assistance you have already received.',
    ),
    (
      label: 'History',
      icon: Icons.history_rounded,
      hint: 'Every request you have filed.',
    ),
  ];

  @override
  void initState() {
    super.initState();
    _store.addListener(_onStoreChanged);
    _assessment.addListener(_onStoreChanged);
    _refresh();
  }

  Future<void> _refresh() => Future.wait([_store.load(), _assessment.load()]);

  @override
  void dispose() {
    _store.removeListener(_onStoreChanged);
    _assessment.removeListener(_onStoreChanged);
    super.dispose();
  }

  void _onStoreChanged() {
    if (mounted) setState(() {});
  }

  List<AssistanceRequest> get _visibleRequests => switch (_selectedFilter) {
    0 => _store.currentRequests,
    1 => _store.approvedRequests,
    2 => _store.completedRequests,
    _ => _store.history,
  };

  String get _emptyMessage => switch (_selectedFilter) {
    0 => 'No pending requests right now.',
    1 => 'No approved requests yet.',
    2 => 'No completed requests yet.',
    _ => 'You have not filed any requests yet.',
  };

  Future<void> _openRequestForm() async {
    final request = await AssistanceRequestFormScreen.open(context);
    if (!mounted || request == null) return;
    setState(() => _selectedFilter = 0);
  }

  /// The tab's one action: ask what the beneficiary wants to start, then
  /// open that screen.
  Future<void> _startAction() async {
    final action = await RequestActionDialog.show(
      context,
      assessment: _assessment.summary,
    );
    if (!mounted || action == null) return;
    switch (action) {
      case RequestAction.assistance:
        await _openRequestForm();
      case RequestAction.assessment:
        await NeedsAssessmentOverviewScreen.open(context);
    }
  }

  @override
  Widget build(BuildContext context) {
    final requests = _visibleRequests;

    return ColoredBox(
      color: AppColors.background,
      child: RefreshIndicator(
        onRefresh: _refresh,
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            SliverToBoxAdapter(
              child: DeepTabHeader(
                title: 'Request',
                bottom: _RequestFilterGrid(
                  filters: _filters,
                  // History is the full log, so it carries no count.
                  counts: [
                    _store.currentRequests.length,
                    _store.approvedRequests.length,
                    _store.completedRequests.length,
                    null,
                  ],
                  selectedIndex: _selectedFilter,
                  onChanged: (index) => setState(() => _selectedFilter = index),
                ),
              ),
            ),
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 22, 16, 0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Same deep forest gradient as the header band above.
                    DecoratedBox(
                      decoration: BoxDecoration(
                        gradient: AppGradients.deepHeader,
                        borderRadius: BorderRadius.circular(14),
                        boxShadow: const [
                          BoxShadow(
                            color: Color(0x2E0B3A1A),
                            blurRadius: 14,
                            offset: Offset(0, 6),
                          ),
                        ],
                      ),
                      child: FilledButton.icon(
                        onPressed: _startAction,
                        icon: const Icon(Icons.add_circle_outline_rounded),
                        label: const Text('Get Assistance'),
                        style: FilledButton.styleFrom(
                          backgroundColor: Colors.transparent,
                          shadowColor: Colors.transparent,
                          foregroundColor: Colors.white,
                          minimumSize: const Size.fromHeight(52),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                          textStyle: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 26),
                    ActivitySection(
                      icon: _filters[_selectedFilter].icon,
                      title: '${_filters[_selectedFilter].label} Requests',
                      subtitle: _filters[_selectedFilter].hint,
                      children: const [],
                    ),
                  ],
                ),
              ),
            ),
            if (requests.isEmpty && !_store.hasLoaded && _store.isLoading)
              const SliverToBoxAdapter(
                child: Padding(
                  padding: EdgeInsets.fromLTRB(20, 40, 20, 40),
                  child: Center(child: CircularProgressIndicator()),
                ),
              )
            else if (requests.isEmpty && _store.error != null)
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 40, 20, 40),
                  child: Column(
                    children: [
                      Text(
                        _store.error!,
                        textAlign: TextAlign.center,
                        style: const TextStyle(color: AppColors.textSecondary),
                      ),
                      const SizedBox(height: 8),
                      TextButton(
                        onPressed: _store.load,
                        child: const Text('Try again'),
                      ),
                    ],
                  ),
                ),
              )
            else if (requests.isEmpty)
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 32),
                sliver: SliverToBoxAdapter(
                  child: ActivityEmptyState(
                    icon: _filters[_selectedFilter].icon,
                    title: 'Nothing Here Yet',
                    message: _emptyMessage,
                  ),
                ),
              )
            else
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 2, 16, 24),
                sliver: SliverList(
                  delegate: SliverChildBuilderDelegate((context, index) {
                    final request = requests[index];
                    return AssistanceRequestCard(
                      request: request,
                      onTap: () =>
                          AssistanceRequestDetailsScreen.open(context, request),
                    );
                  }, childCount: requests.length),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

/// The four request filters as header chips, two per row so every label
/// stays full size on a phone-width band. Each chip but History carries
/// its request count.
class _RequestFilterGrid extends StatelessWidget {
  const _RequestFilterGrid({
    required this.filters,
    required this.counts,
    required this.selectedIndex,
    required this.onChanged,
  });

  final List<({String label, IconData icon, String hint})> filters;
  final List<int?> counts;
  final int selectedIndex;
  final ValueChanged<int> onChanged;

  Widget _chip(int index) => Expanded(
    child: HeaderFilterChip(
      label: filters[index].label,
      icon: filters[index].icon,
      count: counts[index],
      selected: index == selectedIndex,
      onTap: () => onChanged(index),
    ),
  );

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        for (var row = 0; row < filters.length; row += 2) ...[
          if (row > 0) const SizedBox(height: 8),
          Row(
            children: [
              _chip(row),
              const SizedBox(width: 8),
              if (row + 1 < filters.length) _chip(row + 1) else const Spacer(),
            ],
          ),
        ],
      ],
    );
  }
}
