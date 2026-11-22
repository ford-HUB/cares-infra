import 'package:mobile/core/models/password_policy.dart';

/// When the Create Account step of self-registration may continue. The
/// password rules are passed in — they belong to the administrator.
abstract final class RegistrationAccountRules {
  /// A light shape check; the server validates the address properly.
  static bool emailValid(String email) =>
      email.contains('@') && email.contains('.');

  static bool passwordsMatch(String password, String confirmPassword) =>
      confirmPassword.isNotEmpty && password == confirmPassword;

  static bool isComplete({
    required String email,
    required String password,
    required String confirmPassword,
    required bool acceptedTerms,
    required PasswordPolicy policy,
  }) =>
      emailValid(email) &&
      policy.isSatisfiedBy(password) &&
      passwordsMatch(password, confirmPassword) &&
      acceptedTerms;
}
