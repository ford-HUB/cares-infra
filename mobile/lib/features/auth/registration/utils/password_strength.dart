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

PasswordStrengthResult evaluatePasswordStrength(String password) {
  if (password.isEmpty) {
    return const PasswordStrengthResult(
      strength: PasswordStrength.weak,
      score: 0,
      label: 'Enter a password',
      colorValue: 0xFF9CA3AF,
    );
  }

  var score = 0.0;
  if (password.length >= 8) score += 0.25;
  if (password.length >= 12) score += 0.15;
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
  if (score < 0.6) {
    return PasswordStrengthResult(
      strength: PasswordStrength.fair,
      score: score,
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

String? validatePassword(String? value) {
  if (value == null || value.isEmpty) {
    return 'Password is required';
  }
  if (value.length < 8) {
    return 'Password must be at least 8 characters';
  }
  return null;
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
