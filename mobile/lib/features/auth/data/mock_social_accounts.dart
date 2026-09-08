import 'package:mobile/features/auth/presentation/widgets/social_auth_buttons.dart';

/// Sample profiles returned when a donor "signs up" with Google or Facebook.
///
/// Local fixtures only — the real OAuth handshake is not wired yet, so the UI
/// borrows these to show what a linked account looks like.
class MockSocialAccount {
  const MockSocialAccount({
    required this.provider,
    required this.firstName,
    required this.middleName,
    required this.lastName,
    required this.email,
  });

  final SocialAuthProvider provider;
  final String firstName;
  final String middleName;
  final String lastName;
  final String email;

  String get fullName => [
    firstName,
    if (middleName.isNotEmpty) middleName,
    lastName,
  ].join(' ');

  String get initials {
    final first = firstName.isNotEmpty ? firstName[0] : '';
    final last = lastName.isNotEmpty ? lastName[0] : '';
    return '$first$last'.toUpperCase();
  }
}

const Map<SocialAuthProvider, MockSocialAccount> mockSocialAccounts = {
  SocialAuthProvider.google: MockSocialAccount(
    provider: SocialAuthProvider.google,
    firstName: 'Maria',
    middleName: 'Santos',
    lastName: 'Dela Cruz',
    email: 'maria.delacruz@gmail.com',
  ),
  SocialAuthProvider.facebook: MockSocialAccount(
    provider: SocialAuthProvider.facebook,
    firstName: 'Jose',
    middleName: 'Reyes',
    lastName: 'Mercado',
    email: 'jose.mercado@facebook.com',
  ),
};
