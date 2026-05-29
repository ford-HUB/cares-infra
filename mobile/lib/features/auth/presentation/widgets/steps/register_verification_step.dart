import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:mobile/core/theme/app_theme.dart';

/// Static verification UI — demo code [RegisterVerificationStep.demoCode].
class RegisterVerificationStep extends StatefulWidget {
  const RegisterVerificationStep({
    super.key,
    required this.code,
    required this.onCodeChanged,
    this.codeSent = false,
  });

  static const demoCode = '123456';

  final String code;
  final ValueChanged<String> onCodeChanged;
  final bool codeSent;

  @override
  State<RegisterVerificationStep> createState() =>
      _RegisterVerificationStepState();
}

class _RegisterVerificationStepState extends State<RegisterVerificationStep> {
  late final TextEditingController _controller;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(text: widget.code);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          'Verify your email',
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.w800,
                color: AppColors.primaryDark,
              ),
        ),
        const SizedBox(height: 8),
        Text(
          widget.codeSent
              ? 'Enter the 6-digit code we sent to your email.'
              : 'A verification code will be sent when you continue from the previous step.',
          style: TextStyle(
            fontSize: 14,
            height: 1.45,
            color: AppColors.secondary.withValues(alpha: 0.9),
          ),
        ),
        const SizedBox(height: 16),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          decoration: BoxDecoration(
            color: AppColors.accent.withValues(alpha: 0.2),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: AppColors.accent.withValues(alpha: 0.5)),
          ),
          child: Row(
            children: [
              const Icon(Icons.info_outline, size: 20, color: AppColors.primaryDark),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Preview only — use code ${RegisterVerificationStep.demoCode}',
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: AppColors.primaryDark,
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 24),
        TextField(
          controller: _controller,
          onChanged: widget.onCodeChanged,
          keyboardType: TextInputType.number,
          textAlign: TextAlign.center,
          maxLength: 6,
          inputFormatters: [FilteringTextInputFormatter.digitsOnly],
          style: const TextStyle(
            fontSize: 28,
            fontWeight: FontWeight.w700,
            letterSpacing: 12,
          ),
          decoration: InputDecoration(
            counterText: '',
            hintText: '• • • • • •',
            hintStyle: TextStyle(
              letterSpacing: 8,
              color: AppColors.light.withValues(alpha: 0.8),
            ),
            filled: true,
            fillColor: AppColors.fieldFill,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: AppColors.fieldBorder),
            ),
          ),
        ),
        const SizedBox(height: 16),
        TextButton(
          onPressed: () {},
          child: const Text('Resend code'),
        ),
      ],
    );
  }
}
