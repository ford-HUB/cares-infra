import 'package:flutter/material.dart';
import 'package:mobile/core/session/donor_session.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/dashboard/presentation/screens/donor_activity_tab.dart';
import 'package:mobile/features/dashboard/presentation/screens/donor_campaigns_tab.dart';
import 'package:mobile/features/dashboard/presentation/screens/donor_home_tab.dart';
import 'package:mobile/features/dashboard/presentation/screens/donor_profile_tab.dart';
import 'package:mobile/features/dashboard/presentation/screens/donor_ranks_tab.dart';
import 'package:mobile/features/dashboard/presentation/widgets/dashboard_bottom_nav.dart';

/// Donor dashboard — mirrors volunteer [HomeScreen] layout with campaign focus.
class DonorDashboardScreen extends StatefulWidget {
  const DonorDashboardScreen({super.key, required this.donor});

  final DonorSessionUser donor;

  @override
  State<DonorDashboardScreen> createState() => _DonorDashboardScreenState();
}

class _DonorDashboardScreenState extends State<DonorDashboardScreen> {
  int _currentTab = 0;

  String get _firstName {
    final name = widget.donor.firstName.trim();
    return name.isEmpty ? 'Donor' : name;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: Column(
        children: [
          Expanded(
            child: IndexedStack(
              index: _currentTab,
              children: [
                DonorHomeTab(firstName: _firstName, email: widget.donor.email),
                DonorCampaignsTab(email: widget.donor.email),
                DonorActivityTab(email: widget.donor.email),
                DonorRanksTab(
                  displayName: widget.donor.fullName,
                  email: widget.donor.email,
                ),
                DonorProfileTab(donor: widget.donor),
              ],
            ),
          ),
          DashboardBottomNav(
            currentIndex: _currentTab,
            onTap: (index) => setState(() => _currentTab = index),
            eventsTabLabel: 'Campaigns',
          ),
        ],
      ),
    );
  }
}
