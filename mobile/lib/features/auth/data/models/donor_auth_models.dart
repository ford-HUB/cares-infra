import 'package:mobile/features/auth/data/models/login_api_models.dart';
import 'package:mobile/features/auth/presentation/widgets/social_auth_buttons.dart';

/// The verified profile the server returns for a provider account that has no CARES
/// user yet. These values seed the donor form; the server keeps its own copy against
/// the ticket, so editing the name here cannot change which account gets created.
class DonorOAuthProfile {
  const DonorOAuthProfile({
    required this.provider,
    required this.email,
    required this.firstName,
    required this.middleName,
    required this.lastName,
    required this.avatarUrl,
  });

  factory DonorOAuthProfile.fromJson(Map<String, dynamic> json) {
    return DonorOAuthProfile(
      provider: _providerFromApi(json['provider'] as String? ?? ''),
      email: json['email'] as String? ?? '',
      firstName: json['firstname'] as String? ?? '',
      middleName: json['middle_name'] as String? ?? '',
      lastName: json['lastname'] as String? ?? '',
      avatarUrl: json['avatar'] as String?,
    );
  }

  final SocialAuthProvider provider;
  final String email;
  final String firstName;
  final String middleName;
  final String lastName;
  final String? avatarUrl;

  String get fullName => [
    firstName,
    if (middleName.isNotEmpty) middleName,
    lastName,
  ].where((part) => part.isNotEmpty).join(' ');

  String get initials {
    final first = firstName.isNotEmpty ? firstName[0] : '';
    final last = lastName.isNotEmpty ? lastName[0] : '';
    final initials = '$first$last'.trim();
    return initials.isEmpty ? '?' : initials.toUpperCase();
  }

  static SocialAuthProvider _providerFromApi(String value) {
    return value.toUpperCase() == 'FACEBOOK'
        ? SocialAuthProvider.facebook
        : SocialAuthProvider.google;
  }
}

/// The outcome of `POST /v1/auth/donor/oauth`: either the donor is already known and
/// [session] signs them in, or they are new and [profile] plus [oauthTicket] carry the
/// verified identity into the registration call.
class DonorOAuthResult {
  const DonorOAuthResult({
    required this.status,
    required this.session,
    required this.profile,
    required this.oauthTicket,
  });

  factory DonorOAuthResult.fromJson(Map<String, dynamic> json) {
    final session = json['session'] as Map<String, dynamic>?;
    final profile = json['profile'] as Map<String, dynamic>?;

    return DonorOAuthResult(
      status: json['status'] as String? ?? '',
      session: session == null ? null : LoginResponse.fromJson(session),
      profile: profile == null ? null : DonorOAuthProfile.fromJson(profile),
      oauthTicket: json['oauth_ticket'] as String?,
    );
  }

  final String status;
  final LoginResponse? session;
  final DonorOAuthProfile? profile;
  final String? oauthTicket;

  bool get isSignedIn => status == 'signed_in' && session != null;

  bool get needsRegistration =>
      status == 'registration_required' &&
      profile != null &&
      oauthTicket != null;
}
