import 'package:flutter/material.dart';

import 'package:mobile/core/services/auth_session.dart';

import 'package:mobile/core/theme/app_theme.dart';

import 'package:mobile/features/auth/presentation/screens/login_screen.dart';

import 'package:mobile/features/dashboard/domain/mock_profile.dart';

import 'package:mobile/features/dashboard/domain/volunteer_profile.dart';

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

  });



  final String displayName;

  final String? email;

  final int points;

  final VolunteerProfile? volunteerProfile;

  final bool profileComplete;

  final VoidCallback? onEditProfile;



  void _showMockAction(BuildContext context, String message) {

    ScaffoldMessenger.of(context).showSnackBar(

      SnackBar(

        content: Text(message),

        behavior: SnackBarBehavior.floating,

      ),

    );

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

    final profile = _ResolvedProfile.from(

      displayName: displayName,

      email: email,

      points: points,

      mockProfile: mockProfile,

      volunteerProfile: volunteerProfile,

      profileComplete: profileComplete,

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

                    _CompletionBanner(percent: profile.profileCompletionPercent),

                  ],

                  const SizedBox(height: 16),

                  StatsRow(

                    serviceHours: profile.serviceHours,

                    activities: profile.activitiesCompleted,

                    points: profile.points,

                  ),

                  const SizedBox(height: 20),

                  _SectionTitle(title: 'Interests'),

                  const SizedBox(height: 8),

                  if (profile.interests.isEmpty)

                    _EmptySectionHint(

                      message: 'Add your interests to get better event matches.',

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

                  _SectionTitle(title: 'Skills'),

                  const SizedBox(height: 8),

                  if (profile.skills.isEmpty)

                    _EmptySectionHint(

                      message: 'Add skills so coordinators know what you offer.',

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

                  const SizedBox(height: 12),

                  _InfoRow(

                    icon: Icons.event_available_outlined,

                    label: 'Availability',

                    value: profile.availability,

                  ),

                  const SizedBox(height: 20),

                  _SectionTitle(title: 'Account'),

                  const SizedBox(height: 8),

                  _MenuTile(

                    icon: Icons.edit_outlined,

                    label: 'Edit Profile',

                    onTap: onEditProfile ??

                        () => _showMockAction(

                              context,

                              'Profile editing coming soon.',

                            ),

                  ),

                  _MenuTile(

                    icon: Icons.help_outline,

                    label: 'Help & support',

                    onTap: () =>

                        _showMockAction(context, 'Help center coming soon.'),

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

  }) {

    final hasVolunteerData = volunteerProfile != null &&

        (volunteerProfile.interests.isNotEmpty ||

            volunteerProfile.skills.isNotEmpty ||

            volunteerProfile.availability.isNotEmpty);



    return _ResolvedProfile(

      displayName: displayName,

      email: email ?? mockProfile.email,

      roleLabel: mockProfile.roleLabel,

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

        color: Colors.white,

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

                    color: AppColors.primaryDark,

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

                    color: AppColors.secondary.withValues(alpha: 0.95),

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

                        color: AppColors.primary.withValues(alpha: 0.12),

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

                        color: AppColors.secondary.withValues(alpha: 0.9),

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

  const _SectionTitle({required this.title});



  final String title;



  @override

  Widget build(BuildContext context) {

    return Text(

      title,

      style: const TextStyle(

        fontSize: 15,

        fontWeight: FontWeight.w800,

        color: AppColors.primaryDark,

      ),

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

  });



  final IconData icon;

  final String label;

  final VoidCallback onTap;

  final bool destructive;



  @override

  Widget build(BuildContext context) {

    final color = destructive ? AppColors.heart : AppColors.primaryDark;



    return Material(

      color: Colors.white,

      borderRadius: BorderRadius.circular(12),

      child: InkWell(

        onTap: onTap,

        borderRadius: BorderRadius.circular(12),

        child: Container(

          margin: const EdgeInsets.only(bottom: 8),

          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),

          decoration: BoxDecoration(

            borderRadius: BorderRadius.circular(12),

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

              Icon(

                Icons.chevron_right,

                color: color.withValues(alpha: 0.7),

              ),

            ],

          ),

        ),

      ),

    );

  }

}

