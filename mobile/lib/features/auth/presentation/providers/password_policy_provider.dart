import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/core/models/password_policy.dart';
import 'package:mobile/features/auth/data/password_policy_api.dart';

final passwordPolicyApiProvider = Provider<PasswordPolicyApi>(
  (ref) => PasswordPolicyApi(),
);

/// The rules every password field on the app validates and reports against. Fetched
/// once per app run — the administrator changing the policy mid-session is rare, and
/// the server rejects a password that slips through anyway.
final passwordPolicyProvider = FutureProvider<PasswordPolicy>((ref) {
  return ref.read(passwordPolicyApiProvider).fetchPolicy();
});

/// The resolved policy, falling back while the fetch is in flight or after it failed,
/// so a field never has to render a loading state for something this small.
final currentPasswordPolicyProvider = Provider<PasswordPolicy>((ref) {
  return ref
      .watch(passwordPolicyProvider)
      .maybeWhen(
        data: (policy) => policy,
        orElse: () => PasswordPolicy.fallback,
      );
});
