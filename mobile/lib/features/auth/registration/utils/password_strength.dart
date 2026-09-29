import 'package:mobile/core/models/password_policy.dart';

enum PasswordStrength { weak, fair, good, strong }

class PasswordStrengthResult {
  const PasswordStrengthResult({
    required this.strength,
    required this.score,
    required this.label,
    required this.colorValue,
  });

  final PasswordStrength strength;
  final double score;
  final String label;
  final int colorValue;
}

PasswordStrengthResult evaluatePasswordStrength(
  String password, {
  PasswordPolicy policy = PasswordPolicy.fallback,
}) {
  if (password.isEmpty) {
    return const PasswordStrengthResult(
      strength: PasswordStrength.weak,
      score: 0,
      label: 'Enter a password',
      colorValue: 0xFF9CA3AF,
    );
  }

  var score = 0.0;
  if (password.length >= policy.minLength) score += 0.25;
  if (password.length >= policy.minLength + 4) score += 0.15;
  if (RegExp(r'[A-Z]').hasMatch(password)) score += 0.2;
  if (RegExp(r'[a-z]').hasMatch(password)) score += 0.15;
  if (RegExp(r'[0-9]').hasMatch(password)) score += 0.15;
  if (RegExp(r'[^A-Za-z0-9]').hasMatch(password)) score += 0.1;

  if (score < 0.35) {
    return PasswordStrengthResult(
      strength: PasswordStrength.weak,
      score: score,
      label: 'Weak',
      colorValue: 0xFFD32F2F,
    );
  }

  // Green means "the form will accept this". A password can score well on variety
  // and still miss a rule the administrator set, so it stays orange until every
  // rule is met — otherwise the bar says Good while the submit button stays off.
  if (score < 0.6 || !policy.isSatisfiedBy(password)) {
    return PasswordStrengthResult(
      strength: PasswordStrength.fair,
      score: score.clamp(0.0, 0.6),
      label: 'Fair',
      colorValue: 0xFFFF9800,
    );
  }
  if (score < 0.85) {
    return PasswordStrengthResult(
      strength: PasswordStrength.good,
      score: score,
      label: 'Good',
      colorValue: 0xFF3CB371,
    );
  }
  return PasswordStrengthResult(
    strength: PasswordStrength.strong,
    score: 1,
    label: 'Strong',
    colorValue: 0xFF2E7D32,
  );
}

/// Mirrors the server's own check, so the form refuses what the API would refuse.
String? validatePassword(
  String? value, {
  PasswordPolicy policy = PasswordPolicy.fallback,
}) {
  if (value == null || value.isEmpty) {
    return 'Password is required';
  }

  final unmet = policy.unmetRules(value);
  if (unmet.isEmpty) return null;

  // One message, listing only what is still missing — the same rules the chips show.
  return 'Password needs ${unmet.map((rule) => rule.label.toLowerCase()).join(', ')}';
}

String? validateConfirmPassword(String? value, String password) {
  if (value == null || value.isEmpty) {
    return 'Please re-enter your password';
  }
  if (value != password) {
    return 'Passwords do not match';
  }
  return null;
}
