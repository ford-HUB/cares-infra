import 'package:flutter/material.dart';

import 'package:mobile/core/navigation/dashboard_router.dart';
import 'package:mobile/core/services/api_client.dart';
import 'package:mobile/core/services/auth_session.dart';
import 'package:mobile/core/session/role_account_store.dart';

import 'package:mobile/core/session/app_role.dart';

import 'package:mobile/core/session/role_session.dart';

import 'package:mobile/core/theme/app_theme.dart';

import 'package:mobile/features/auth/presentation/screens/login_screen.dart';

import 'package:mobile/features/dashboard/data/donation_store.dart';
import 'package:mobile/features/dashboard/data/mobile_profile_models.dart';
import 'package:mobile/features/dashboard/data/profile_service.dart';
import 'package:mobile/features/dashboard/donor/data/donor_profile_store.dart';
import 'package:mobile/features/dashboard/donor/screens/donor_profile_section_edit_screen.dart';
import 'package:mobile/features/dashboard/data/activity_log_service.dart';
import 'package:mobile/features/dashboard/data/assistance_request_data.dart';
import 'package:mobile/features/dashboard/data/certificate_data.dart';
import 'package:mobile/features/dashboard/data/event_feedback_store.dart';
import 'package:mobile/features/dashboard/domain/mock_profile.dart';
import 'package:mobile/features/dashboard/screens/help_support_screen.dart';
import 'package:mobile/features/dashboard/screens/switch_role_screen.dart';
import 'package:mobile/features/dashboard/screens/profile_screens.dart';
import 'package:mobile/features/interests/domain/user_interest.dart';

import 'package:mobile/features/dashboard/domain/volunteer_profile.dart';

<<<<<<< HEAD
import 'package:mobile/features/dashboard/presentation/screens/volunteer_profile_section_edit_screen.dart';

=======
import 'package:mobile/features/dashboard/presentation/screens/account_security_screen.dart';
import 'package:mobile/features/dashboard/presentation/screens/activity_logs_screen.dart';
import 'package:mobile/features/dashboard/presentation/screens/location_records_screen.dart';
import 'package:mobile/features/dashboard/presentation/screens/permissions_screen.dart';
import 'package:mobile/features/dashboard/presentation/screens/mobile_profile_edit_screen.dart';
import 'package:mobile/features/dashboard/presentation/screens/role_unlock_screen.dart';
import 'package:mobile/features/dashboard/presentation/widgets/profile_tab_skeleton.dart';
>>>>>>> b9e7830bed6470d46c3822e3904dc72b99d68b4f
import 'package:mobile/features/dashboard/presentation/widgets/stats_row.dart';

/// Profile tab for every mobile role. On first build it pulls the signed-in
/// person's record from `GET /profile/me/mobile` into [RoleAccountStore]; the
/// body then renders the section that matches the role (volunteer, donor or
/// beneficiary) from that record, with the local stores as fallback.
class ProfileTabScreen extends StatefulWidget {
  const ProfileTabScreen({
    super.key,
    required this.displayName,
    this.email,
    this.points = 240,
    this.volunteerProfile,
    this.profileComplete = false,
    this.isBeneficiary = false,
    this.completionPercent,
    this.isDonor = false,
    this.onOpenDonations,
  });

  final String displayName;
  final String? email;
  final int points;
  final VolunteerProfile? volunteerProfile;
  final bool profileComplete;
  final bool isBeneficiary;
  final int? completionPercent;
  final bool isDonor;
  final VoidCallback? onOpenDonations;

  String get roleType => isBeneficiary
      ? RoleAccountStore.beneficiary
      : isDonor
      ? RoleAccountStore.donor
      : RoleAccountStore.volunteer;

  @override
  State<ProfileTabScreen> createState() => _ProfileTabScreenState();
}

class _ProfileTabScreenState extends State<ProfileTabScreen> {
  final ProfileService _profileService = ProfileService();

  bool _syncing = false;
  String? _syncError;

  @override
  void initState() {
    super.initState();
    // Fetch once per role; a sign-out clears the store and the next mount
    // re-syncs.
    final account = RoleAccountStore.instance.byType(widget.roleType);
    if (account?.serverProfile == null) _sync();
  }

  Future<void> _sync() async {
    if (!AuthSession.isSignedIn) return;
    setState(() {
      _syncing = true;
      _syncError = null;
    });
    try {
      await _profileService.syncRoleAccount(roleType: widget.roleType);
      if (!mounted) return;
      setState(() => _syncing = false);
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _syncing = false;
        _syncError = e.message;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _syncing = false;
        _syncError = 'Could not load your profile.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: RoleAccountStore.instance,
      builder: (context, _) {
        final account = RoleAccountStore.instance.byType(widget.roleType);
        // First load has nothing to render yet: show the skeleton instead of a
        // half-empty profile.
        if (_syncing && account?.serverProfile == null) {
          return const ProfileTabSkeleton();
        }
        return _ProfileTabBody(
          displayName: widget.displayName,
          email: widget.email,
          points: widget.points,
          volunteerProfile: widget.volunteerProfile,
          profileComplete: widget.profileComplete,
          isBeneficiary: widget.isBeneficiary,
          completionPercent: widget.completionPercent,
          isDonor: widget.isDonor,
          onOpenDonations: widget.onOpenDonations,
          server: account?.serverProfile,
          syncError: _syncError,
          onRetrySync: _sync,
        );
      },
    );
  }
}

class _ProfileTabBody extends StatelessWidget {
  const _ProfileTabBody({
    required this.server,
    required this.syncError,
    required this.onRetrySync,

    required this.displayName,

    this.email,

    this.points = 240,

    this.volunteerProfile,

    this.profileComplete = false,

    this.isBeneficiary = false,

    this.completionPercent,

    this.isDonor = false,

    this.onOpenDonations,

    this.onVolunteerProfileUpdated,
  });

  final String displayName;

  final String? email;

  final int points;

  final VolunteerProfile? volunteerProfile;

  final bool profileComplete;

  /// Renders the beneficiary variant: assistance stats and personal details
  /// instead of volunteer interests and certificates.
  final bool isBeneficiary;

  /// Overrides the volunteer completion maths (e.g. beneficiary profiles).
  final int? completionPercent;

  /// Renders the donor variant: giving stats, interest profiling, and
  /// donation preferences instead of volunteer or beneficiary details.
  final bool isDonor;

  final VoidCallback? onOpenDonations;

<<<<<<< HEAD
  /// Called after a volunteer edits their interests, skills, or availability
  /// from the section edit icons.
  final ValueChanged<VolunteerProfile>? onVolunteerProfileUpdated;
=======
  /// The role's record from the server, null until synced.
  final MobileProfile? server;

  final String? syncError;

  final VoidCallback onRetrySync;
>>>>>>> b9e7830bed6470d46c3822e3904dc72b99d68b4f

  void _showMockAction(BuildContext context, String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), behavior: SnackBarBehavior.floating),
    );
  }

  String get _roleType => isBeneficiary
      ? RoleAccountStore.beneficiary
      : isDonor
      ? RoleAccountStore.donor
      : RoleAccountStore.volunteer;

  Future<void> _openEdit(BuildContext context) =>
      MobileProfileEditScreen.open(context, _roleType);

  Future<void> _editDonorSection(
    BuildContext context,

    DonorProfileSection section,
  ) async {
    await DonorProfileSectionEditScreen.open(context, section);
  }

<<<<<<< HEAD
  Future<void> _editVolunteerSection(
    BuildContext context,

    VolunteerProfileSection section,
  ) async {
    final saved = await VolunteerProfileSectionEditScreen.open(
      context,

      section,

      initialProfile: volunteerProfile,
    );

    if (saved != null) {
      onVolunteerProfileUpdated?.call(saved);
    }
  }

  Future<void> _editAssistanceSection(
    BuildContext context,

    BeneficiaryProfileSection section,
  ) async {
    await BeneficiaryAssistanceEditScreen.open(context, section);
  }

  Future<void> _switchRole(BuildContext context) async {
    await SwitchRoleScreen.open(context);
  }

=======
>>>>>>> b9e7830bed6470d46c3822e3904dc72b99d68b4f
  void _signOut(BuildContext context) {
    AuthSession.clear();
    RoleAccountStore.instance.clear();

    RoleSession.instance.clear();

    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute<void>(builder: (_) => const LoginScreen()),

      (_) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    final mockProfile = MockProfiles.forUser(
      displayName: displayName,

      email: email,

      points: points,
    );

    final requestStore = AssistanceRequestStore.instance;

<<<<<<< HEAD
    final roleSession = RoleSession.instance;

    final beneficiaryProfile = BeneficiaryProfileStore.instance.profile;

=======
>>>>>>> b9e7830bed6470d46c3822e3904dc72b99d68b4f
    final donorProfile = DonorProfileStore.instance.profile;

    final donorPersonal = DonorPersonalProfileStore.instance.profile;

    final donorTotalDonated = DonationStore.instance
        .totalDonatedDisplayForEmail(donorPersonal.email);

    final donorDonationsCount = DonationStore.instance.donationsCountForEmail(
      donorPersonal.email,
    );

    final donorDonations = DonationStore.instance.donationsForEmail(
      donorPersonal.email,
    );

    final donorCampaignsSupported = donorDonations.isEmpty
        ? donorDonationsCount
        : donorDonations.map((d) => d.campaignTitle).toSet().length;

    final profile = _ResolvedProfile.from(
      displayName: displayName,

      email: email,

      points: points,

      mockProfile: mockProfile,

      volunteerProfile: volunteerProfile,

      profileComplete: profileComplete,

      roleLabel: isBeneficiary
          ? 'Beneficiary'
          : isDonor
          ? 'Donor'
          : null,

      server: server,
    );

    // Completion comes from the server's own read of the record; the local
    // props are only a fallback for prototype paths that never signed in.
    final serverCompletion = server?.completion;
    final isProfileComplete = serverCompletion?.complete ?? profileComplete;
    final completedPercent =
        serverCompletion?.percent ??
        completionPercent ??
        profile.profileCompletionPercent;

    final volunteerServer = server?.volunteer;
    final donorServer = server?.donor;

    return SafeArea(
      bottom: false,

      child: CustomScrollView(
        slivers: [
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),

            sliver: SliverToBoxAdapter(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,

                children: [
                  const Text(
                    'Profile',

                    style: TextStyle(
                      fontSize: 22,

                      fontWeight: FontWeight.w800,

                      color: AppColors.primaryDark,
                    ),
                  ),

                  const SizedBox(height: 16),

                  _ProfileHeader(profile: profile, roleType: _roleType),

                  if (syncError != null) ...[
                    const SizedBox(height: 12),

                    _SyncErrorBanner(message: syncError!, onRetry: onRetrySync),
                  ],

                  if (!isProfileComplete) ...[
                    const SizedBox(height: 16),

                    _CompletionBanner(
                      percent: completedPercent,
                      missing: serverCompletion?.missing ?? const [],
                    ),
                  ],

                  const SizedBox(height: 16),

                  if (isDonor)
                    StatsRow.custom(
                      items: [
                        StatsRowItem(
                          icon: Icons.favorite_outline_rounded,

                          value: DonationStore.formatPeso(donorTotalDonated),

                          label: 'Donated',

                          iconBackground: const Color(0xFFFFE0B2),

                          iconColor: const Color(0xFFE65100),
                        ),

                        StatsRowItem(
                          icon: Icons.card_giftcard_rounded,

                          value: '$donorDonationsCount',

                          label: 'Donations',
                        ),

                        StatsRowItem(
                          icon: Icons.campaign_outlined,

                          value: '$donorCampaignsSupported',

                          label: 'Campaigns',
                        ),
                      ],
                    )
                  else if (isBeneficiary)
                    StatsRow.custom(
                      items: [
                        StatsRowItem(
                          icon: Icons.hourglass_top_outlined,

                          value: '${requestStore.currentRequests.length}',

                          label: 'Pending',
                          iconBackground: const Color(0xFFFFE0B2),
                          iconColor: AppColors.accentOrange,
                        ),

                        StatsRowItem(
                          icon: Icons.verified_outlined,

                          value: '${requestStore.approvedRequests.length}',

                          label: 'Approved',
                        ),

                        StatsRowItem(
                          icon: Icons.task_alt_outlined,

                          value: '${requestStore.completedRequests.length}',

                          label: 'Completed',
                        ),
                      ],
                    )
                  else
                    StatsRow(
                      serviceHours: profile.serviceHours,

                      activities: profile.activitiesCompleted,

                      points: profile.points,
                    ),

                  const SizedBox(height: 20),

                  if (isDonor) ...[
                    _SectionTitle(
                      title: 'Personal Information',

                      onEdit: () => _openEdit(context),
                    ),

                    const SizedBox(height: 8),

                    _InfoRow(
                      icon: Icons.badge_outlined,

                      label: 'Full name',

                      value: donorPersonal.fullName.isEmpty
                          ? (server?.fullName.isNotEmpty ?? false)
                                ? server!.fullName
                                : displayName
                          : donorPersonal.fullName,
                    ),

                    const SizedBox(height: 12),

                    _InfoRow(
                      icon: Icons.call_outlined,

                      label: 'Contact number',

                      value: donorPersonal.contactNumber.isEmpty
                          ? _orNotSet(server?.phoneNumber)
                          : donorPersonal.contactNumber,
                    ),

                    const SizedBox(height: 12),

                    _InfoRow(
                      icon: Icons.home_outlined,

                      label: 'Address',

                      value: donorPersonal.address.isEmpty
                          ? _orNotSet(server?.address.display)
                          : donorPersonal.address,
                    ),

                    if (donorServer != null) ...[
                      const SizedBox(height: 12),

                      _InfoRow(
                        icon: Icons.login_rounded,
                        label: 'Sign-in method',
                        value: donorServer.signInLabel,
                      ),
                    ],

                    const SizedBox(height: 12),

                    _InfoRow(
                      icon: Icons.apartment_rounded,

                      label: 'Organization',

                      value: donorPersonal.organization.isEmpty
                          ? 'Individual donor'
                          : donorPersonal.organization,
                    ),

                    const SizedBox(height: 20),

                    _SectionTitle(
                      title: 'Interests',

                      onEdit: () => _editDonorSection(
                        context,

                        DonorProfileSection.interests,
                      ),
                    ),

                    const SizedBox(height: 8),

                    if (donorProfile.interests.isEmpty)
                      _EmptySectionHint(
                        message:
                            'Tap the edit icon to pick the causes you care about.',
                      )
                    else
                      Wrap(
                        spacing: 8,

                        runSpacing: 8,

                        children: [
                          for (final interest in donorProfile.interestLabels)
                            _ChipTag(label: interest),
                        ],
                      ),

                    const SizedBox(height: 20),

                    _SectionTitle(
                      title: 'Donation Preferences',

                      onEdit: () => _editDonorSection(
                        context,

                        DonorProfileSection.donationTypes,
                      ),
                    ),

                    const SizedBox(height: 8),

                    if (donorProfile.donationTypes.isEmpty)
                      _EmptySectionHint(
                        message:
                            'Tap the edit icon to tell CARES what you want to '
                            'give.',
                      )
                    else
                      Wrap(
                        spacing: 8,

                        runSpacing: 8,

                        children: [
                          for (final type in donorProfile.donationTypeLabels)
                            _ChipTag(label: type),
                        ],
                      ),
                  ] else if (isBeneficiary) ...[
<<<<<<< HEAD
                    _SectionTitle(
                      title: 'Personal Information',

                      onEdit: onEditProfile,
                    ),

                    const SizedBox(height: 8),

                    _InfoRow(
                      icon: Icons.badge_outlined,

                      label: 'Full name',

                      value: personalProfile.fullName.isEmpty
                          ? displayName
                          : personalProfile.fullName,
                    ),

                    const SizedBox(height: 12),

                    _InfoRow(
                      icon: Icons.call_outlined,

                      label: 'Contact number',

                      value: personalProfile.contactNumber.isEmpty
                          ? 'Not set'
                          : personalProfile.contactNumber,
                    ),

                    const SizedBox(height: 12),

                    _InfoRow(
                      icon: Icons.home_outlined,

                      label: 'Address',

                      value: personalProfile.address.isEmpty
                          ? 'Not set'
                          : personalProfile.address,
                    ),

                    const SizedBox(height: 12),

                    _InfoRow(
                      icon: Icons.cake_outlined,

                      label: 'Date of birth',

                      value: personalProfile.dateOfBirth.isEmpty
                          ? 'Not set'
                          : personalProfile.dateOfBirth,
                    ),

                    const SizedBox(height: 12),

                    _InfoRow(
                      icon: Icons.verified_user_outlined,

                      label: 'Verification documents',

                      value:
                          '${personalProfile.verifiedDocumentCount}/'
                          '${personalProfile.documents.length} verified',
                    ),

                    const SizedBox(height: 20),

                    _SectionTitle(
                      title: 'Assistance Needs',

                      onEdit: () => _editAssistanceSection(
                        context,

                        BeneficiaryProfileSection.assistanceNeeds,
                      ),
                    ),

                    const SizedBox(height: 8),

                    if (beneficiaryProfile.assistanceNeeds.isEmpty)
                      _EmptySectionHint(
                        message:
                            'Tap the edit icon to tell CARES what your household '
                            'needs.',
                      )
                    else
                      Wrap(
                        spacing: 8,

                        runSpacing: 8,

                        children: [
                          for (final need
                              in beneficiaryProfile.assistanceNeedLabels)
                            _ChipTag(label: need),
                        ],
                      ),

                    const SizedBox(height: 20),

                    _SectionTitle(
                      title: 'Household Situation',

                      onEdit: () => _editAssistanceSection(
                        context,

                        BeneficiaryProfileSection.household,
                      ),
                    ),

                    const SizedBox(height: 8),

                    if (beneficiaryProfile.householdSituation.isEmpty)
                      _EmptySectionHint(
                        message:
                            'Tap the edit icon to add your household situation.',
                      )
                    else
                      Wrap(
                        spacing: 8,

                        runSpacing: 8,

                        children: [
                          for (final item
                              in beneficiaryProfile.householdSituationLabels)
                            _ChipTag(label: item),
                        ],
                      ),

                    const SizedBox(height: 12),

                    _InfoRow(
                      icon: Icons.groups_outlined,

                      label: 'Household size',

                      value: beneficiaryProfile.householdSize != null
                          ? beneficiaryProfile.householdSizeLabel
                          : latestRequest == null
                          ? 'Not set'
                          : '${latestRequest.householdSize} members',
                    ),

                    const SizedBox(height: 20),

                    _SectionTitle(
                      title: 'Visit Availability',

                      onEdit: () => _editAssistanceSection(
                        context,

                        BeneficiaryProfileSection.visitAvailability,
                      ),
                    ),

                    const SizedBox(height: 8),

                    _InfoRow(
                      icon: Icons.event_available_outlined,

                      label: 'Preferred days & times',

                      value: beneficiaryProfile.availabilityLabel,
                    ),

                    const SizedBox(height: 20),

                    _SectionTitle(title: 'Needs Assessment'),

                    const SizedBox(height: 8),

                    NeedsAssessmentCard(summary: kMockNeedsAssessment),

                    const SizedBox(height: 12),

                    // _InfoRow(
                    //   icon: Icons.assignment_outlined,

                    //   label: 'Latest request',

                    //   value: latestRequest?.title ?? 'None filed yet',
                    // ),
                  ] else ...[
                    _SectionTitle(
                      title: 'Interests',

                      onEdit: () => _editVolunteerSection(
                        context,

                        VolunteerProfileSection.interests,
                      ),
                    ),
=======
                    // Beneficiaries see only the header, completion and
                    // request stats here; their details live in the edit flow.
                  ] else ...[
                    if (volunteerServer != null) ...[
                      _SectionTitle(title: 'School Information'),

                      const SizedBox(height: 8),

                      _InfoRow(
                        icon: Icons.badge_outlined,
                        label: 'ID number',
                        value: _orNotSet(volunteerServer.school?.idNumber),
                      ),

                      const SizedBox(height: 12),

                      _InfoRow(
                        icon: Icons.account_balance_outlined,
                        label: 'Department',
                        value: _orNotSet(volunteerServer.school?.department),
                      ),

                      const SizedBox(height: 12),

                      _InfoRow(
                        icon: Icons.menu_book_outlined,
                        label: 'Program',
                        value: volunteerServer.school == null
                            ? 'Not set'
                            : '${volunteerServer.school!.major} · '
                                  '${volunteerServer.school!.yearLevel}',
                      ),

                      const SizedBox(height: 12),

                      _InfoRow(
                        icon: Icons.call_outlined,
                        label: 'Contact number',
                        value: _orNotSet(server?.phoneNumber),
                      ),

                      const SizedBox(height: 20),
                    ],

                    _SectionTitle(title: 'Interests'),
>>>>>>> b9e7830bed6470d46c3822e3904dc72b99d68b4f

                    const SizedBox(height: 8),

                    if (profile.interests.isEmpty)
                      _EmptySectionHint(
                        message:
                            'Add your interests to get better event matches.',
                      )
                    else
                      Wrap(
                        spacing: 8,

                        runSpacing: 8,

                        children: [
                          for (final interest in profile.interests)
                            _ChipTag(label: interest),
                        ],
                      ),
                  ],

                  // Beneficiaries reach their requests from the Request tab, so
                  // the Account shortcut is not repeated here.
                  if (!isBeneficiary) ...[
                    const SizedBox(height: 20),

<<<<<<< HEAD
                    _SectionTitle(
                      title: 'Skills',

                      onEdit: () => _editVolunteerSection(
                        context,

                        VolunteerProfileSection.skills,
                      ),
                    ),
=======
                    _SectionTitle(title: 'Account'),
>>>>>>> b9e7830bed6470d46c3822e3904dc72b99d68b4f

                    const SizedBox(height: 8),

                    if (isDonor)
                      _MenuTile(
                        icon: Icons.card_giftcard_rounded,

                        label: 'My Donations',

                        trailingLabel: '$donorDonationsCount',

                        onTap:
                            onOpenDonations ??
                            () => _showMockAction(
                              context,

                              'Open the Activity tab to see your donations.',
                            ),
                      )
                    else
                      ListenableBuilder(
                        listenable: EventFeedbackStore.instance,

                        builder: (context, _) => _MenuTile(
                          icon: Icons.workspace_premium_outlined,

                          label: 'Certificates',

                          trailingLabel:
                              '${earnedCertificatesFor(certificateWalletEmail()).length}',

                          onTap: () => ProfileCertificatesScreen.open(context),
                        ),
                      ),
<<<<<<< HEAD

                    const SizedBox(height: 20),

                    _SectionTitle(
                      title: 'Availability',

                      onEdit: () => _editVolunteerSection(
                        context,

                        VolunteerProfileSection.availability,
                      ),
                    ),

                    const SizedBox(height: 8),

                    _InfoRow(
                      icon: Icons.event_available_outlined,

                      label: 'Availability',

                      value: profile.availability,
                    ),
=======
>>>>>>> b9e7830bed6470d46c3822e3904dc72b99d68b4f
                  ],

                  const SizedBox(height: 20),

                  _SectionTitle(title: 'Security & Privacy'),

                  const SizedBox(height: 8),

                  _MenuTile(
                    icon: Icons.lock_outline,

                    label: 'Account Security',

                    onTap: () => AccountSecurityScreen.open(
                      context,
                      email: profile.email,
                      usesSocialSignIn: server?.usesSocialSignIn ?? false,
                      signInProviderLabel:
                          server?.signInProviderLabel ??
                          'your sign-in provider',
                    ),
                  ),

<<<<<<< HEAD
                  if (roleSession.canSwitchRole)
                    _MenuTile(
                      icon: Icons.swap_horiz_rounded,

                      label: 'Change Role',

                      trailingLabel: roleSession.activeRole.label,

                      onTap: () => _switchRole(context),
                    ),

                  if (isDonor)
=======
                  _MenuTile(
                    icon: Icons.verified_user_outlined,

                    label: 'Permissions',

                    onTap: () => PermissionsScreen.open(context),
                  ),

                  // Geolocation records are a volunteer-only feature.
                  if (!isDonor && !isBeneficiary)
>>>>>>> b9e7830bed6470d46c3822e3904dc72b99d68b4f
                    _MenuTile(
                      icon: Icons.location_on_outlined,

                      label: 'Geolocation Records',

                      onTap: () => LocationRecordsScreen.open(context),
                    ),

                  _MenuTile(
                    icon: Icons.history_outlined,

                    label: 'Activity Logs',

                    onTap: () => ActivityLogsScreen.open(context),
                  ),

                  const SizedBox(height: 20),

                  _SectionTitle(title: 'Support'),

                  const SizedBox(height: 8),

                  _MenuTile(
                    icon: Icons.help_outline,

                    label: 'Help & support',

                    onTap: () => HelpSupportScreen.open(context),
                  ),

                  _MenuTile(
                    icon: Icons.logout,

                    label: 'Sign out',

                    destructive: true,

                    onTap: () => _signOut(context),
                  ),

                  const SizedBox(height: 24),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

String _orNotSet(String? value) {
  final trimmed = value?.trim() ?? '';
  return trimmed.isEmpty ? 'Not set' : trimmed;
}

class _SyncErrorBanner extends StatelessWidget {
  const _SyncErrorBanner({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(12, 10, 6, 10),
      decoration: BoxDecoration(
        color: const Color(0xFFFFF3E0),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFFFCC80)),
      ),
      child: Row(
        children: [
          const Icon(
            Icons.cloud_off_outlined,
            size: 18,
            color: AppColors.accentOrange,
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              message,
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w500,
                color: AppColors.accentOrange,
              ),
            ),
          ),
          TextButton(onPressed: onRetry, child: const Text('Retry')),
        ],
      ),
    );
  }
}

class _ResolvedProfile {
  const _ResolvedProfile({
    required this.displayName,

    required this.email,

    required this.roleLabel,

    required this.memberSince,

    required this.points,

    required this.serviceHours,

    required this.activitiesCompleted,

    required this.interests,

    required this.profileCompletionPercent,
  });

  factory _ResolvedProfile.from({
    required String displayName,

    required String? email,

    required int points,

    required MockVolunteerProfile mockProfile,

    required VolunteerProfile? volunteerProfile,

    required bool profileComplete,

    String? roleLabel,

    MobileProfile? server,
  }) {
    final hasVolunteerData =
        volunteerProfile != null && volunteerProfile.interests.isNotEmpty;

    // Server record wins wherever it exists; the mock profile only fills the
    // gaps on prototype paths that never signed in.
    final serverVolunteer = server?.volunteer;
    final serverInterests = serverVolunteer == null
        ? const <String>[]
        : (serverVolunteer.interests.map((i) => i.label).toList()..sort());

    return _ResolvedProfile(
      displayName: (server?.fullName.isNotEmpty ?? false)
          ? server!.fullName
          : displayName,

      email: server?.email ?? email ?? mockProfile.email,

      roleLabel: roleLabel ?? mockProfile.roleLabel,

      memberSince: server?.memberSinceLabel ?? mockProfile.memberSince,

      points: points,

      serviceHours:
          serverVolunteer?.serviceHours.round() ?? mockProfile.serviceHours,

      activitiesCompleted:
          serverVolunteer?.activitiesCompleted ??
          mockProfile.activitiesCompleted,

      interests: hasVolunteerData
          ? volunteerProfile.interestLabels
          : serverInterests,

      profileCompletionPercent: profileComplete
          ? 100
          : VolunteerProfileCompletion.calculate(profile: volunteerProfile),
    );
  }

  final String displayName;

  final String email;

  final String roleLabel;

  final String memberSince;

  final int points;

  final int serviceHours;

  final int activitiesCompleted;

  final List<String> interests;

  final int profileCompletionPercent;
}

class _ProfileHeader extends StatelessWidget {
  const _ProfileHeader({required this.profile, required this.roleType});

  final _ResolvedProfile profile;

  /// Which role account the edit badge opens.
  final String roleType;

  Future<void> _edit(BuildContext context) async {
    // The edit screen writes the saved profile back onto the role account, so
    // the header re-renders through the store listener — nothing to do here.
    await MobileProfileEditScreen.open(context, roleType);
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: RoleAccountStore.instance,
      builder: (context, _) => _buildCard(context),
    );
  }

  Widget _buildCard(BuildContext context) {
    // The role's own record (name / email / picture) wins over the generic
    // props so each role shows its own details on the header.
    final store = RoleAccountStore.instance;
    final account = store.accounts
        .where(
          (a) => a.roleLabel.toLowerCase() == profile.roleLabel.toLowerCase(),
        )
        .firstOrNull;

    final displayName = (account?.displayName.trim().isNotEmpty ?? false)
        ? account!.displayName
        : profile.displayName;
    final email = (account?.email.trim().isNotEmpty ?? false)
        ? account!.email
        : profile.email;
    final memberSince = account?.memberSince ?? profile.memberSince;
    final avatarAsset = account?.avatarAssetPath;
    final avatarUrl = account?.avatarUrl;

    final initial = displayName.isNotEmpty ? displayName[0].toUpperCase() : '?';

    final initialText = Text(
      initial,

      style: const TextStyle(
        color: Colors.white,

        fontSize: 26,

        fontWeight: FontWeight.w800,
      ),
    );

    // Server photo first, then any local asset, then the initial.
    final ImageProvider? avatarImage = avatarUrl != null
        ? NetworkImage(avatarUrl, headers: ProfileService().avatarHeaders)
        : avatarAsset != null
        ? AssetImage(avatarAsset)
        : null;

    return Container(
      padding: const EdgeInsets.all(16),

      decoration: BoxDecoration(
        color: AppColors.primary,

        borderRadius: BorderRadius.circular(16),

        border: Border.all(color: AppColors.fieldBorder),
      ),

      child: Row(
        children: [
          // Avatar + edit badge. Tapping either opens the edit screen; the
          // badge is what tells the person the picture (and profile) can
          // change.
          Semantics(
            button: true,
            label: 'Edit profile',
            child: InkWell(
              onTap: () => _edit(context),
              customBorder: const CircleBorder(),
              child: SizedBox(
                width: 64,
                height: 64,
                child: Stack(
                  clipBehavior: Clip.none,
                  children: [
                    Positioned.fill(
                      child: CircleAvatar(
                        radius: 32,

                        backgroundColor: AppColors.primaryDark,

                        backgroundImage: avatarImage,

                        onBackgroundImageError: avatarImage == null
                            ? null
                            : (_, _) {},

                        child: avatarImage != null ? null : initialText,
                      ),
                    ),
                    Positioned(
                      right: -2,
                      bottom: -2,
                      child: Container(
                        width: 26,
                        height: 26,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: Colors.white,
                          border: Border.all(
                            color: AppColors.primary,
                            width: 2,
                          ),
                        ),
                        child: const Icon(
                          Icons.edit_rounded,
                          size: 13,
                          color: AppColors.primaryDark,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),

          const SizedBox(width: 14),

          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,

              children: [
                Text(
                  displayName,

                  maxLines: 1,

                  overflow: TextOverflow.ellipsis,

                  style: const TextStyle(
                    fontSize: 18,

                    fontWeight: FontWeight.w800,

                    color: Colors.white,
                  ),
                ),

                const SizedBox(height: 2),

                Text(
                  email,

                  maxLines: 1,

                  overflow: TextOverflow.ellipsis,

                  style: TextStyle(
                    fontSize: 12,

                    fontWeight: FontWeight.w500,

                    color: const Color.fromARGB(
                      255,
                      206,
                      226,
                      207,
                    ).withValues(alpha: 1),
                  ),
                ),

                const SizedBox(height: 8),

                Wrap(
                  spacing: 8,

                  runSpacing: 4,

                  crossAxisAlignment: WrapCrossAlignment.center,

                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,

                        vertical: 4,
                      ),

                      decoration: BoxDecoration(
                        color: Colors.white,

                        borderRadius: BorderRadius.circular(8),
                      ),

                      child: Text(
                        profile.roleLabel,

                        style: const TextStyle(
                          fontSize: 11,

                          fontWeight: FontWeight.w700,

                          color: AppColors.primaryDark,
                        ),
                      ),
                    ),

                    _RoleSwitchButton(currentRoleLabel: profile.roleLabel),

                    Text(
                      'Member since $memberSince',

                      style: TextStyle(
                        fontSize: 11,

                        fontWeight: FontWeight.w500,

                        color: const Color.fromARGB(
                          255,
                          206,
                          226,
                          207,
                        ).withValues(alpha: 1),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// "Switch account" control inline with the role chip. Tapping it opens a
/// centered dialog listing every role on the account from
/// [RoleAccountStore] — each with its own profile photo and name, the open one
/// marked as current. Unlocked roles switch straight to that dashboard;
/// locked roles open [RoleUnlockScreen] (ID upload + face verification) or
/// activate instantly when the role has no requirement.
class _RoleSwitchButton extends StatelessWidget {
  const _RoleSwitchButton({required this.currentRoleLabel});

  final String currentRoleLabel;

  Future<void> _showSwitcher(BuildContext context) async {
    if (RoleAccountStore.instance.accounts.length < 2) return;

    final selected = await showDialog<RoleAccount>(
      context: context,
      builder: (_) => _RoleSwitchDialog(currentRoleLabel: currentRoleLabel),
    );

    if (selected == null || !context.mounted) return;
    await _open(context, selected);
  }

  Future<void> _open(BuildContext context, RoleAccount role) async {
    final store = RoleAccountStore.instance;

    if (role.isLocked) {
      if (role.requirement == RoleUnlockRequirement.idAndFaceVerification) {
        // Only the volunteer side is gated: a donor/beneficiary-registered
        // account has never shown an ID, so explain the check before
        // starting it.
        final proceed = await _confirmUnlock(context, role);
        if (!proceed || !context.mounted) return;
        await Navigator.of(context).push(
          MaterialPageRoute<void>(
            builder: (_) => RoleUnlockScreen(account: role, skipIntro: true),
          ),
        );
        return;
      }
      // No requirement — activate on the spot.
      store.unlock(role.roleType);
      ActivityLogService.report(
        'account.role.unlocked',
        metadata: {'role': role.roleType, 'method': 'no verification needed'},
      );
    }

    final account = store.byType(role.roleType) ?? role;
    final previous = store.active?.roleType;
    store.activate(account.roleType);
    if (previous != account.roleType) {
      ActivityLogService.report(
        'account.role.switched',
        metadata: {'from': ?previous, 'to': account.roleType},
      );
    }
    if (!context.mounted) return;

    DashboardRouter.navigateToRoleDashboard(
      context,
      roleType: account.roleType,
      email: account.email,
      firstName: account.firstName,
      lastName: account.lastName,
      profileComplete: false,
      hasInterests: false,
    );
  }

  Future<bool> _confirmUnlock(BuildContext context, RoleAccount role) async {
    final result = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => _RoleUnlockDialog(role: role),
    );
    return result ?? false;
  }

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: 'Switch role',
      child: InkWell(
        onTap: () => _showSwitcher(context),
        borderRadius: BorderRadius.circular(8),
        child: const Padding(
          padding: EdgeInsets.all(4),
          child: Icon(Icons.swap_horiz_rounded, size: 18, color: Colors.white),
        ),
      ),
    );
  }
}

/// Centered picker listing every role on the account. Each row carries that
/// role's own profile photo (per-role on the server, never shared across
/// sides), name and role label; the open role is shown first and marked
/// current. Other roles are synced on open so their picture is the one on
/// file for that side, not the one from the dashboard that is open.
class _RoleSwitchDialog extends StatefulWidget {
  const _RoleSwitchDialog({required this.currentRoleLabel});

  final String currentRoleLabel;

  @override
  State<_RoleSwitchDialog> createState() => _RoleSwitchDialogState();
}

class _RoleSwitchDialogState extends State<_RoleSwitchDialog> {
  final ProfileService _profileService = ProfileService();

  @override
  void initState() {
    super.initState();
    _syncOtherRoles();
  }

  /// A role's server record (and photo) is only read when its dashboard is
  /// opened, so unlocked roles that have never been opened this session are
  /// fetched here. Failures leave the row on its initial — never a blocker.
  Future<void> _syncOtherRoles() async {
    if (!AuthSession.isSignedIn) return;
    final store = RoleAccountStore.instance;
    for (final role in store.switchable) {
      if (role.isLocked || role.serverProfile != null) continue;
      try {
        await _profileService.syncRoleAccount(roleType: role.roleType);
      } catch (_) {
        // Leave the row on its initial.
      }
    }
  }

  bool _isCurrent(RoleAccount role) =>
      role.roleLabel.toLowerCase() ==
      widget.currentRoleLabel.trim().toLowerCase();

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: Colors.white,
      surfaceTintColor: Colors.transparent,
      insetPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
      child: ListenableBuilder(
        listenable: RoleAccountStore.instance,
        builder: (context, _) {
          final store = RoleAccountStore.instance;
          final roles = [
            ...store.accounts.where(_isCurrent),
            ...store.accounts.where((a) => !_isCurrent(a)),
          ];

          return Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 20, 12, 4),
                child: Row(
                  children: [
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Switch account',
                            style: TextStyle(
                              fontSize: 17,
                              fontWeight: FontWeight.w800,
                              color: AppColors.textPrimary,
                            ),
                          ),
                          SizedBox(height: 2),
                          Text(
                            'Each role keeps its own profile and photo.',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w500,
                              color: AppColors.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      onPressed: () => Navigator.of(context).pop(),
                      tooltip: 'Close',
                      icon: const Icon(
                        Icons.close_rounded,
                        size: 20,
                        color: AppColors.textMuted,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 8),
              for (var i = 0; i < roles.length; i++) ...[
                if (i > 0)
                  const Divider(
                    height: 1,
                    thickness: 1,
                    indent: 20,
                    endIndent: 20,
                    color: AppColors.fieldBorder,
                  ),
                _RoleSwitchRow(
                  role: roles[i],
                  isCurrent: _isCurrent(roles[i]),
                  onTap: _isCurrent(roles[i])
                      ? null
                      : () => Navigator.of(context).pop(roles[i]),
                ),
              ],
              const SizedBox(height: 12),
            ],
          );
        },
      ),
    );
  }
}

class _RoleSwitchRow extends StatelessWidget {
  const _RoleSwitchRow({
    required this.role,
    required this.isCurrent,
    required this.onTap,
  });

  final RoleAccount role;

  final bool isCurrent;

  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    // Only roles that need a verification step read as locked. Donor and
    // beneficiary sides just switch on tap.
    final locked =
        role.isLocked &&
        role.requirement == RoleUnlockRequirement.idAndFaceVerification;

    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
        child: Row(
          children: [
            _RoleAvatar(role: role, radius: 24),

            const SizedBox(width: 14),

            Expanded(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    role.displayName.isNotEmpty
                        ? role.displayName
                        : role.roleLabel,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: locked
                          ? AppColors.textSecondary
                          : AppColors.textPrimary,
                    ),
                  ),

                  const SizedBox(height: 2),

                  Text(
                    locked
                        ? '${role.roleLabel} · ${role.unlockHint}'
                        : role.roleLabel,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w500,
                      color: locked
                          ? AppColors.textMuted
                          : AppColors.textSecondary,
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(width: 12),

            if (isCurrent)
              const _RoleSwitchBadge(
                icon: Icons.check_circle_rounded,
                label: 'Current',
                filled: true,
              )
            else if (locked)
              const _RoleSwitchBadge(
                icon: Icons.lock_outline_rounded,
                label: 'Unlock',
              )
            else
              const Icon(
                Icons.chevron_right_rounded,
                size: 20,
                color: AppColors.textMuted,
              ),
          ],
        ),
      ),
    );
  }
}

class _RoleSwitchBadge extends StatelessWidget {
  const _RoleSwitchBadge({
    required this.icon,
    required this.label,
    this.filled = false,
  });

  final IconData icon;

  final String label;

  final bool filled;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: filled ? AppColors.primary : AppColors.background,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: filled ? AppColors.primary : AppColors.fieldBorder,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            icon,
            size: 13,
            color: filled ? Colors.white : AppColors.primaryDark,
          ),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              color: filled ? Colors.white : AppColors.primaryDark,
            ),
          ),
        ],
      ),
    );
  }
}

/// Shown before the ID + face check when a locked volunteer role is tapped:
/// says what the person will have to do, then hands off to
/// [RoleUnlockScreen] on confirm.
class _RoleUnlockDialog extends StatelessWidget {
  const _RoleUnlockDialog({required this.role});

  final RoleAccount role;

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      backgroundColor: Colors.white,
      surfaceTintColor: Colors.transparent,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
      contentPadding: const EdgeInsets.fromLTRB(22, 22, 22, 8),
      actionsPadding: const EdgeInsets.fromLTRB(16, 0, 16, 14),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 22,
                backgroundColor: role.avatarColor,
                child: const Icon(
                  Icons.lock_outline_rounded,
                  color: Colors.white,
                  size: 22,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Switch to ${role.roleLabel}',
                      style: const TextStyle(
                        fontSize: 17,
                        fontWeight: FontWeight.w800,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 2),
                    const Text(
                      'Verification required',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Text(
            'Your account was registered as ${RoleAccountStore.instance.primary?.roleLabel ?? 'a donor'}, '
            'so we still need to confirm you are a student before opening the '
            '${role.roleLabel.toLowerCase()} side.',
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w500,
              color: AppColors.textSecondary,
              height: 1.4,
            ),
          ),
          const SizedBox(height: 14),
          const _UnlockDialogStep(
            number: 1,
            icon: Icons.badge_outlined,
            title: 'Upload your school ID',
            subtitle: 'Front and back, clearly readable.',
          ),
          const SizedBox(height: 10),
          const _UnlockDialogStep(
            number: 2,
            icon: Icons.face_retouching_natural_outlined,
            title: 'Face recognition',
            subtitle: 'A quick selfie matched against your ID photo.',
          ),
          const SizedBox(height: 10),
          _UnlockDialogStep(
            number: 3,
            icon: Icons.swap_horiz_rounded,
            title: 'Switch to ${role.roleLabel}',
            subtitle: 'Once verified, the account changes over right away.',
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(false),
          child: const Text(
            'Not now',
            style: TextStyle(
              fontWeight: FontWeight.w700,
              color: AppColors.textSecondary,
            ),
          ),
        ),
        ElevatedButton(
          onPressed: () => Navigator.of(context).pop(true),
          style: ElevatedButton.styleFrom(
            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
            minimumSize: Size.zero,
          ),
          child: const Text('Start verification'),
        ),
      ],
    );
  }
}

class _UnlockDialogStep extends StatelessWidget {
  const _UnlockDialogStep({
    required this.number,
    required this.icon,
    required this.title,
    required this.subtitle,
  });

  final int number;
  final IconData icon;
  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(
            color: AppColors.inputFill,
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(icon, color: AppColors.primaryDark, size: 20),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '$number. $title',
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: 1),
              Text(
                subtitle,
                style: const TextStyle(
                  fontSize: 11.5,
                  fontWeight: FontWeight.w500,
                  color: AppColors.textSecondary,
                  height: 1.3,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

/// One role's own picture: the server photo for that side first, then a
/// local asset, then the initial on the role colour. Never borrows another
/// role's photo.
class _RoleAvatar extends StatelessWidget {
  const _RoleAvatar({required this.role, this.radius = 18});

  final RoleAccount role;

  final double radius;

  @override
  Widget build(BuildContext context) {
    final url = role.avatarUrl;
    final asset = role.avatarAssetPath;
    final ImageProvider? image = url != null
        ? NetworkImage(url, headers: ProfileService().avatarHeaders)
        : asset != null
        ? AssetImage(asset)
        : null;

    final avatar = CircleAvatar(
      radius: radius,
      backgroundColor: role.avatarColor,
      backgroundImage: image,
      child: image == null
          ? Text(
              role.initial,
              style: TextStyle(
                color: Colors.white,
                fontSize: radius * 0.85,
                fontWeight: FontWeight.w800,
              ),
            )
          : null,
    );

    if (!role.isLocked) return avatar;

    return Opacity(opacity: 0.55, child: avatar);
  }
}

class _CompletionBanner extends StatelessWidget {
  const _CompletionBanner({required this.percent, this.missing = const []});

  final int percent;

  /// Server keys for the steps still outstanding, newest read wins.
  final List<String> missing;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),

      decoration: BoxDecoration(
        color: AppColors.light.withValues(alpha: 0.28),

        borderRadius: BorderRadius.circular(12),

        border: Border.all(color: AppColors.primaryDark.withValues(alpha: 0.5)),
      ),

      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,

        children: [
          Row(
            children: [
              const Expanded(
                child: Text(
                  'Profile completion',

                  style: TextStyle(
                    fontSize: 13,

                    fontWeight: FontWeight.w700,

                    color: AppColors.primaryDark,
                  ),
                ),
              ),

              Text(
                '$percent%',

                style: const TextStyle(
                  fontSize: 13,

                  fontWeight: FontWeight.w800,

                  color: AppColors.primaryDark,
                ),
              ),
            ],
          ),

          const SizedBox(height: 8),

          ClipRRect(
            borderRadius: BorderRadius.circular(6),

            child: LinearProgressIndicator(
              value: percent / 100,

              minHeight: 8,

              backgroundColor: Colors.white,

              color: AppColors.primary,
            ),
          ),

          if (missing.isNotEmpty) ...[
            const SizedBox(height: 8),

            Text(
              'Still needed: '
              '${missing.map(ProfileCompletion.labelFor).join(', ')}',

              style: const TextStyle(
                fontSize: 12,

                color: AppColors.textSecondary,
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle({required this.title, this.onEdit});

  final String title;

<<<<<<< HEAD
  /// Optional per-section edit action — used by the beneficiary assistance,
  /// household, and visit-availability cards, and by the volunteer interests,
  /// skills, and availability cards.
=======
  /// Optional per-section edit action — used by the personal-information and
  /// donor preference cards.
>>>>>>> b9e7830bed6470d46c3822e3904dc72b99d68b4f
  final VoidCallback? onEdit;

  @override
  Widget build(BuildContext context) {
    final label = Text(
      title,

      style: const TextStyle(
        fontSize: 15,

        fontWeight: FontWeight.w800,

        color: AppColors.primaryDark,
      ),
    );

    if (onEdit == null) return label;

    return Row(
      children: [
        Expanded(child: label),

        IconButton(
          onPressed: onEdit,

          icon: const Icon(Icons.edit_outlined, size: 18),

          color: AppColors.primary,

          tooltip: 'Edit $title',

          visualDensity: VisualDensity.compact,

          padding: EdgeInsets.zero,

          constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
        ),
      ],
    );
  }
}

class _EmptySectionHint extends StatelessWidget {
  const _EmptySectionHint({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,

      padding: const EdgeInsets.all(12),

      decoration: BoxDecoration(
        color: Colors.white,

        borderRadius: BorderRadius.circular(10),

        border: Border.all(color: AppColors.fieldBorder),
      ),

      child: Text(
        message,

        style: TextStyle(
          fontSize: 12,

          height: 1.35,

          color: AppColors.secondary.withValues(alpha: 0.95),
        ),
      ),
    );
  }
}

class _ChipTag extends StatelessWidget {
  const _ChipTag({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),

      decoration: BoxDecoration(
        color: Colors.white,

        borderRadius: BorderRadius.circular(20),

        border: Border.all(color: AppColors.fieldBorder),
      ),

      child: Text(
        label,

        style: const TextStyle(
          fontSize: 12,

          fontWeight: FontWeight.w600,

          color: AppColors.primaryDark,
        ),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({
    required this.icon,

    required this.label,

    required this.value,
  });

  final IconData icon;

  final String label;

  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),

      decoration: BoxDecoration(
        color: Colors.white,

        borderRadius: BorderRadius.circular(12),

        border: Border.all(color: AppColors.fieldBorder),
      ),

      child: Row(
        children: [
          Icon(icon, size: 20, color: AppColors.primaryDark),

          const SizedBox(width: 10),

          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,

              children: [
                Text(
                  label,

                  style: TextStyle(
                    fontSize: 11,

                    fontWeight: FontWeight.w500,

                    color: AppColors.secondary.withValues(alpha: 0.9),
                  ),
                ),

                Text(
                  value,

                  style: const TextStyle(
                    fontSize: 13,

                    fontWeight: FontWeight.w700,

                    color: AppColors.primaryDark,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _MenuTile extends StatelessWidget {
  const _MenuTile({
    required this.icon,

    required this.label,

    required this.onTap,

    this.destructive = false,

    this.trailingLabel,
  });

  final IconData icon;

  final String label;

  final VoidCallback onTap;

  final bool destructive;

  /// Optional count shown before the chevron (e.g. certificates received).
  final String? trailingLabel;

  @override
  Widget build(BuildContext context) {
    final color = destructive ? AppColors.heart : AppColors.primaryDark;

    return Material(
      color: Colors.white,

      // borderRadius: BorderRadius.circular(12),
      child: InkWell(
        onTap: onTap,

        borderRadius: BorderRadius.circular(12),

        child: Container(
          margin: const EdgeInsets.only(bottom: 1),

          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 18),

          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(4),

            border: Border.all(color: AppColors.fieldBorder),
          ),

          child: Row(
            children: [
              Icon(icon, size: 22, color: color),

              const SizedBox(width: 12),

              Expanded(
                child: Text(
                  label,

                  style: TextStyle(
                    fontSize: 14,

                    fontWeight: FontWeight.w600,

                    color: color,
                  ),
                ),
              ),

              if (trailingLabel != null) ...[
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 3,
                  ),

                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.1),

                    borderRadius: BorderRadius.circular(8),
                  ),

                  child: Text(
                    trailingLabel!,

                    style: const TextStyle(
                      fontSize: 12,

                      fontWeight: FontWeight.w700,

                      color: AppColors.primary,
                    ),
                  ),
                ),

                const SizedBox(width: 8),
              ],

              Icon(Icons.chevron_right, color: color.withValues(alpha: 0.7)),
            ],
          ),
        ),
      ),
    );
  }
}
