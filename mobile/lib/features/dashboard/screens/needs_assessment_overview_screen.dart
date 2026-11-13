import 'package:flutter/material.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/dashboard/data/assistance_request_data.dart';
import 'package:mobile/features/dashboard/screens/needs_assessment_screen.dart';
import 'package:mobile/features/dashboard/widgets/assistance_request_widgets.dart';
import 'package:mobile/shared/widgets/header_back_control.dart';
import 'package:mobile/shared/widgets/header_band.dart';

/// Dedicated Needs Assessment page, opened from the Request tab's action
/// dialog. Shows where the beneficiary stands with the survey and offers
/// Take / View / Update — the card that used to sit on the Request tab.
class NeedsAssessmentOverviewScreen extends StatefulWidget {
  const NeedsAssessmentOverviewScreen({super.key});

  static Future<void> open(BuildContext context) {
    return Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => const NeedsAssessmentOverviewScreen(),
      ),
    );
  }

  @override
  State<NeedsAssessmentOverviewScreen> createState() =>
      _NeedsAssessmentOverviewScreenState();
}

class _NeedsAssessmentOverviewScreenState
    extends State<NeedsAssessmentOverviewScreen> {
  final _assessment = NeedsAssessmentStore.instance;

  @override
  void initState() {
    super.initState();
    _assessment.addListener(_onChanged);
    if (!_assessment.hasLoaded) _assessment.load();
  }

  @override
  void dispose() {
    _assessment.removeListener(_onChanged);
    super.dispose();
  }

  void _onChanged() {
    if (mounted) setState(() {});
  }

  void _open(NeedsAssessmentMode mode) => NeedsAssessmentScreen.open(
    context,
    mode: mode,
    summary: _assessment.summary,
  );

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Column(
        children: [
          const HeaderBand(
            padding: EdgeInsets.fromLTRB(20, 8, 20, 28),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                HeaderBackControl(),
                SizedBox(height: 14),
                HeaderBandTitle(
                  title: 'Needs Assessment',
                  subtitle: 'Tell us what your household and community need.',
                ),
              ],
            ),
          ),
          Expanded(
            child: RefreshIndicator(
              onRefresh: _assessment.load,
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.fromLTRB(16, 22, 16, 32),
                children: [
                  NeedsAssessmentCard(
                    summary: _assessment.summary,
                    isLoading: !_assessment.hasLoaded && _assessment.isLoading,
                    onTakeAssessment: () => _open(NeedsAssessmentMode.take),
                    onViewAssessment: () => _open(NeedsAssessmentMode.view),
                    onUpdateAssessment: () => _open(NeedsAssessmentMode.update),
                  ),
                  const SizedBox(height: 16),
                  const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 6),
                    child: Text(
                      'Your answers help CARES match your household with the '
                      'right programs.',
                      style: TextStyle(
                        fontSize: 13,
                        height: 1.45,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
