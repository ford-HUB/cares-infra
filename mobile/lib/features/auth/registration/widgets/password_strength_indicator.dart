import 'package:flutter/material.dart';
import '../utils/password_strength.dart';

class PasswordStrengthIndicator extends StatelessWidget {
  const PasswordStrengthIndicator({
    super.key,
    required this.password,
  });

  final String password;

  @override
  Widget build(BuildContext context) {
    final result = evaluatePasswordStrength(password);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: LinearProgressIndicator(
            value: password.isEmpty ? 0 : result.score.clamp(0.0, 1.0),
            minHeight: 5,
            backgroundColor: const Color(0xFFEBEBEB),
            color: Color(result.colorValue),
          ),
        ),
        const SizedBox(height: 6),
        Text(
          'Password strength: ${result.label}',
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w500,
            color: Color(result.colorValue),
          ),
        ),
      ],
    );
  }
}
