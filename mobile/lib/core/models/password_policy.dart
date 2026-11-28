class PasswordRule {
  const PasswordRule({required this.label, required this.isMet});

  final String label;
  final bool Function(String password) isMet;
}

/// Mirrors the portal-set rules so the form states what the server enforces.
class PasswordPolicy {
  const PasswordPolicy({
    required this.minLength,
    required this.requireUppercase,
    required this.requireLowercase,
    required this.requireNumber,
    required this.requireSymbol,
  });

  /// Used until `/v1/security-policy/password-rules` answers or when
  /// unreachable; matches server `DEFAULT_SECURITY_POLICY`.
  static const PasswordPolicy fallback = PasswordPolicy(
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
    requireSymbol: false,
  );

  final int minLength;
  final bool requireUppercase;
  final bool requireLowercase;
  final bool requireNumber;
  final bool requireSymbol;

  factory PasswordPolicy.fromJson(Map<String, dynamic> json) {
    return PasswordPolicy(
      minLength:
          (json['password_min_length'] as num?)?.toInt() ?? fallback.minLength,
      requireUppercase:
          json['password_require_uppercase'] as bool? ??
          fallback.requireUppercase,
      requireLowercase:
          json['password_require_lowercase'] as bool? ??
          fallback.requireLowercase,
      requireNumber:
          json['password_require_number'] as bool? ?? fallback.requireNumber,
      requireSymbol:
          json['password_require_symbol'] as bool? ?? fallback.requireSymbol,
    );
  }

  /// Upper- and lowercase merge into one rule when both are required.
  List<PasswordRule> get rules {
    return [
      PasswordRule(
        label: '$minLength+ characters',
        isMet: (password) => password.length >= minLength,
      ),
      if (requireUppercase && requireLowercase)
        PasswordRule(
          label: 'Upper & lower case',
          isMet: (password) =>
              RegExp(r'[A-Z]').hasMatch(password) &&
              RegExp(r'[a-z]').hasMatch(password),
        )
      else ...[
        if (requireUppercase)
          PasswordRule(
            label: 'An uppercase letter',
            isMet: (password) => RegExp(r'[A-Z]').hasMatch(password),
          ),
        if (requireLowercase)
          PasswordRule(
            label: 'A lowercase letter',
            isMet: (password) => RegExp(r'[a-z]').hasMatch(password),
          ),
      ],
      if (requireNumber)
        PasswordRule(
          label: 'A number',
          isMet: (password) => RegExp(r'[0-9]').hasMatch(password),
        ),
      if (requireSymbol)
        PasswordRule(
          label: 'A symbol',
          isMet: (password) => RegExp(r'[^A-Za-z0-9]').hasMatch(password),
        ),
    ];
  }

  List<PasswordRule> unmetRules(String password) {
    return rules.where((rule) => !rule.isMet(password)).toList();
  }

  bool isSatisfiedBy(String password) => unmetRules(password).isEmpty;
}
