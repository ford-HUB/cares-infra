import 'package:flutter/material.dart';

import 'package:mobile/core/services/auth_session.dart';

import 'package:mobile/core/theme/app_theme.dart';

import 'package:mobile/features/auth/presentation/screens/login_screen.dart';

import 'package:mobile/features/dashboard/beneficiary/data/beneficiary_personal_profile_store.dart';
import 'package:mobile/features/dashboard/data/donation_store.dart';
import 'package:mobile/features/dashboard/data/mock_donor_ranks.dart';
import 'package:mobile/features/dashboard/donor/data/donor_profile_store.dart';
import 'package:mobile/features/dashboard/donor/screens/donor_profile_section_edit_screen.dart';
import 'package:mobile/features/dashboard/beneficiary/data/beneficiary_profile_store.dart';
import 'package:mobile/features/dashboard/beneficiary/screens/beneficiary_assistance_edit_screen.dart';
import 'package:mobile/features/dashboard/data/assistance_request_data.dart';
import 'package:mobile/features/dashboard/widgets/assistance_request_widgets.dart';
import 'package:mobile/features/dashboard/data/certificate_data.dart';
import 'package:mobile/features/dashboard/data/event_feedback_store.dart';
import 'package:mobile/features/dashboard/domain/mock_profile.dart';
import 'package:mobile/features/dashboard/screens/help_support_screen.dart';
import 'package:mobile/features/dashboard/screens/profile_screens.dart';

import 'package:mobile/features/dashboard/domain/volunteer_profile.dart';

import 'package:mobile/features/dashboard/presentation/screens/volunteer_profile_section_edit_screen.dart';

import 'package:mobile/features/dashboard/presentation/widgets/stats_row.dart';

class ProfileTabScreen extends StatelessWidget {
  const ProfileTabScreen({
    super.key,

    required this.displayName,

    this.email,

    this.points = 240,

    this.volunteerProfile,

    this.profileComplete = false,

    this.onEditProfile,

    this.isBeneficiary = false,

    this.onOpenRequests,

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

  final VoidCallback? onEditProfile;

  /// Renders the beneficiary variant: assistance stats and household details
  /// instead of volunteer interests, skills, and certificates.
  final bool isBeneficiary;

  final VoidCallback? onOpenRequests;

  /// Overrides the volunteer completion maths (e.g. beneficiary profiles).
  final int? completionPercent;

  /// Renders the donor variant: giving stats, interest profiling, and
  /// donation preferences instead of volunteer or beneficiary details.
  final bool isDonor;

  final VoidCallback? onOpenDonations;

  /// Called after a volunteer edits their interests, skills, or availability
  /// from the section edit icons.
  final ValueChanged<VolunteerProfile>? onVolunteerProfileUpdated;

  void _showMockAction(BuildContext context, String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), behavior: SnackBarBehavior.floating),
    );
  }

  Future<void> _editDonorSection(
    BuildContext context,

    DonorProfileSection section,
  ) async {
    await DonorProfileSectionEditScreen.open(context, section);
  }

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

  void _signOut(BuildContext context) {
    AuthSession.clear();

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

    final beneficiaryProfile = BeneficiaryProfileStore.instance.profile;

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

    final donorTierName = MockDonorRanks.tierForAmount(donorTotalDonated).name;

    final personalProfile = BeneficiaryPersonalProfileStore.instance.profile;

    final latestRequest = requestStore.history.isEmpty
        ? null
        : requestStore.history.first;

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
    );

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

                  _ProfileHeader(profile: profile),

                  if (!profileComplete) ...[
                    const SizedBox(height: 16),

                    _CompletionBanner(
                      percent:
                          completionPercent ?? profile.profileCompletionPercent,
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

                      onEdit: onEditProfile,
                    ),

                    const SizedBox(height: 8),

                    _InfoRow(
                      icon: Icons.badge_outlined,

                      label: 'Full name',

                      value: donorPersonal.fullName.isEmpty
                          ? displayName
                          : donorPersonal.fullName,
                    ),

                    const SizedBox(height: 12),

                    _InfoRow(
                      icon: Icons.call_outlined,

                      label: 'Contact number',

                      value: donorPersonal.contactNumber.isEmpty
                          ? 'Not set'
                          : donorPersonal.contactNumber,
                    ),

                    const SizedBox(height: 12),

                    _InfoRow(
                      icon: Icons.home_outlined,

                      label: 'Address',

                      value: donorPersonal.address.isEmpty
                          ? 'Not set'
                          : donorPersonal.address,
                    ),

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

                    const SizedBox(height: 20),

                    _SectionTitle(
                      title: 'Giving Availability',

                      onEdit: () => _editDonorSection(
                        context,

                        DonorProfileSection.givingPreferences,
                      ),
                    ),

                    const SizedBox(height: 8),

                    _InfoRow(
                      icon: Icons.event_available_outlined,

                      label: 'Frequency & budget',

                      value: donorProfile.givingLabel,
                    ),

                    const SizedBox(height: 12),

                    _InfoRow(
                      icon: Icons.workspace_premium_outlined,

                      label: 'Donor tier',

                      value: '$donorTierName Donor',
                    ),
                  ] else if (isBeneficiary) ...[
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

                    const SizedBox(height: 20),

                    _SectionTitle(
                      title: 'Skills',

                      onEdit: () => _editVolunteerSection(
                        context,

                        VolunteerProfileSection.skills,
                      ),
                    ),

                    const SizedBox(height: 8),

                    if (profile.skills.isEmpty)
                      _EmptySectionHint(
                        message:
                            'Add skills so coordinators know what you offer.',
                      )
                    else
                      Wrap(
                        spacing: 8,

                        runSpacing: 8,

                        children: [
                          for (final skill in profile.skills)
                            _ChipTag(label: skill),
                        ],
                      ),

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
                  ],

                  const SizedBox(height: 20),

                  _SectionTitle(title: 'Account'),

                  const SizedBox(height: 8),

                  _MenuTile(
                    icon: Icons.edit_outlined,

                    label: 'Edit Profile',

                    onTap:
                        onEditProfile ??
                        () => _showMockAction(
                          context,

                          'Profile editing coming soon.',
                        ),
                  ),

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
                  else if (isBeneficiary)
                    _MenuTile(
                      icon: Icons.request_page_outlined,

                      label: 'My Requests',

                      trailingLabel: '${requestStore.history.length}',

                      onTap:
                          onOpenRequests ??
                          () => _showMockAction(
                            context,

                            'Open the Request tab to manage your requests.',
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

    required this.skills,

    required this.availability,

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
  }) {
    final hasVolunteerData =
        volunteerProfile != null &&
        (volunteerProfile.interests.isNotEmpty ||
            volunteerProfile.skills.isNotEmpty ||
            volunteerProfile.availability.isNotEmpty);

    return _ResolvedProfile(
      displayName: displayName,

      email: email ?? mockProfile.email,

      roleLabel: roleLabel ?? mockProfile.roleLabel,

      memberSince: mockProfile.memberSince,

      points: points,

      serviceHours: mockProfile.serviceHours,

      activitiesCompleted: mockProfile.activitiesCompleted,

      interests: hasVolunteerData
          ? volunteerProfile.interestLabels
          : const <String>[],

      skills: hasVolunteerData
          ? (volunteerProfile.skills.toList()..sort())
          : const <String>[],

      availability: hasVolunteerData
          ? volunteerProfile.availabilityLabel
          : 'Not set',

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

  final List<String> skills;

  final String availability;

  final int profileCompletionPercent;
}

class _ProfileHeader extends StatelessWidget {
  const _ProfileHeader({required this.profile});

  final _ResolvedProfile profile;

  @override
  Widget build(BuildContext context) {
    final initial = profile.displayName.isNotEmpty
        ? profile.displayName[0].toUpperCase()
        : '?';

    return Container(
      padding: const EdgeInsets.all(16),

      decoration: BoxDecoration(
        color: AppColors.primary,

        borderRadius: BorderRadius.circular(16),

        border: Border.all(color: AppColors.fieldBorder),
      ),

      child: Row(
        children: [
          CircleAvatar(
            radius: 32,

            backgroundColor: AppColors.primaryDark,

            child: Text(
              initial,

              style: const TextStyle(
                color: Colors.white,

                fontSize: 26,

                fontWeight: FontWeight.w800,
              ),
            ),
          ),

          const SizedBox(width: 14),

          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,

              children: [
                Text(
                  profile.displayName,

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
                  profile.email,

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

                    Text(
                      'Member since ${profile.memberSince}',

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

class _CompletionBanner extends StatelessWidget {
  const _CompletionBanner({required this.percent});

  final int percent;

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
        ],
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle({required this.title, this.onEdit});

  final String title;

  /// Optional per-section edit action — used by the beneficiary assistance,
  /// household, and visit-availability cards, and by the volunteer interests,
  /// skills, and availability cards.
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
