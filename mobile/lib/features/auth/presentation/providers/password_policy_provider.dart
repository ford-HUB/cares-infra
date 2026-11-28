import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/core/models/password_policy.dart';
import 'package:mobile/features/auth/data/password_policy_api.dart';

final passwordPolicyApiProvider = Provider<PasswordPolicyApi>(
  (ref) => PasswordPolicyApi(),
);

/// Fetched once per run; the server rejects anything a mid-session policy
/// change lets through.
final passwordPolicyProvider = FutureProvider<PasswordPolicy>((ref) {
  return ref.read(passwordPolicyApiProvider).fetchPolicy();
});

/// Falls back while loading or on failure, so fields never show a loading
/// state.
final currentPasswordPolicyProvider = Provider<PasswordPolicy>((ref) {
  return ref
      .watch(passwordPolicyProvider)
      .maybeWhen(
        data: (policy) => policy,
        orElse: () => PasswordPolicy.fallback,
      );
});
