import 'package:flutter/material.dart';

import '../../../../core/theme/app_theme.dart';
import '../../data/assistance_request_data.dart';
import '../../screens/assistance_request_details_screen.dart';
import '../../screens/assistance_request_form_screen.dart';
import '../../screens/needs_assessment_screen.dart';
import '../../widgets/assistance_request_widgets.dart';

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

  static const _filters = ['Current', 'Approved', 'Completed', 'History'];

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

  @override
  Widget build(BuildContext context) {
    final requests = _visibleRequests;

    return SafeArea(
      bottom: false,
      child: ColoredBox(
        color: AppColors.background,
        child: RefreshIndicator(
          onRefresh: _refresh,
          child: CustomScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            slivers: [
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Request',
                        style: TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.w800,
                          color: AppColors.primaryDark,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'File and track your assistance needs.',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w500,
                          color: AppColors.secondary.withValues(alpha: 0.95),
                        ),
                      ),
                      const SizedBox(height: 18),
                      FilledButton.icon(
                        onPressed: _openRequestForm,
                        icon: const Icon(Icons.add_circle_outline_rounded),
                        label: const Text('Request Assistance'),
                        style: FilledButton.styleFrom(
                          backgroundColor: AppColors.primary,
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
                      const SizedBox(height: 18),
                      Row(
                        children: [
                          Expanded(
                            child: _SummaryCard(
                              icon: Icons.hourglass_top_rounded,
                              value: '${_store.currentRequests.length}',
                              label: 'Pending',
                              color: AppColors.accentOrange,
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: _SummaryCard(
                              icon: Icons.verified_rounded,
                              value: '${_store.approvedRequests.length}',
                              label: 'Approved',
                              color: AppColors.primary,
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: _SummaryCard(
                              icon: Icons.task_alt_rounded,
                              value: '${_store.completedRequests.length}',
                              label: 'Completed',
                              color: AppColors.primaryDark,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 18),
                      NeedsAssessmentCard(
                        summary: _assessment.summary,
                        isLoading:
                            !_assessment.hasLoaded && _assessment.isLoading,
                        onTakeAssessment: () => NeedsAssessmentScreen.open(
                          context,
                          mode: NeedsAssessmentMode.take,
                          summary: _assessment.summary,
                        ),
                        onViewAssessment: () => NeedsAssessmentScreen.open(
                          context,
                          mode: NeedsAssessmentMode.view,
                          summary: _assessment.summary,
                        ),
                        onUpdateAssessment: () => NeedsAssessmentScreen.open(
                          context,
                          mode: NeedsAssessmentMode.update,
                          summary: _assessment.summary,
                        ),
                      ),
                      const SizedBox(height: 18),
                      _RequestFilterBar(
                        filters: _filters,
                        selectedIndex: _selectedFilter,
                        onChanged: (index) =>
                            setState(() => _selectedFilter = index),
                      ),
                      const SizedBox(height: 4),
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
                          style: const TextStyle(
                            color: AppColors.textSecondary,
                          ),
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
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(20, 40, 20, 40),
                    child: Center(
                      child: Text(
                        _emptyMessage,
                        textAlign: TextAlign.center,
                        style: const TextStyle(color: AppColors.textSecondary),
                      ),
                    ),
                  ),
                )
              else
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
                  sliver: SliverList(
                    delegate: SliverChildBuilderDelegate((context, index) {
                      final request = requests[index];
                      return AssistanceRequestCard(
                        request: request,
                        onTap: () => AssistanceRequestDetailsScreen.open(
                          context,
                          request,
                        ),
                      );
                    }, childCount: requests.length),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SummaryCard extends StatelessWidget {
  const _SummaryCard({
    required this.icon,
    required this.value,
    required this.label,
    required this.color,
  });

  final IconData icon;
  final String value;
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 8),
      decoration: AppDecorations.surfaceCard(),
      child: Column(
        children: [
          Icon(icon, color: color, size: 20),
          const SizedBox(height: 8),
          Text(
            value,
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w800,
              color: color,
              height: 1,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w500,
              color: AppColors.textSecondary,
            ),
          ),
        ],
      ),
    );
  }
}

class _RequestFilterBar extends StatelessWidget {
  const _RequestFilterBar({
    required this.filters,
    required this.selectedIndex,
    required this.onChanged,
  });

  final List<String> filters;
  final int selectedIndex;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: AppColors.inputFill.withValues(alpha: 0.65),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        children: List.generate(filters.length, (index) {
          final selected = index == selectedIndex;
          return Expanded(
            child: Material(
              color: Colors.transparent,
              child: InkWell(
                onTap: () => onChanged(index),
                borderRadius: BorderRadius.circular(10),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  padding: const EdgeInsets.symmetric(vertical: 10),
                  decoration: BoxDecoration(
                    color: selected ? AppColors.primary : Colors.transparent,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  alignment: Alignment.center,
                  child: Text(
                    filters[index],
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 12.5,
                      fontWeight: FontWeight.w700,
                      color: selected ? Colors.white : AppColors.textSecondary,
                    ),
                  ),
                ),
              ),
            ),
          );
        }),
      ),
    );
  }
}
