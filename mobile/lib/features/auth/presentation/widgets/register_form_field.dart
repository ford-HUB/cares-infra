import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:mobile/core/theme/app_theme.dart';

class RegisterFormField extends StatelessWidget {
  const RegisterFormField({
    super.key,
    required this.label,
    required this.controller,
    this.hint,
    this.keyboardType,
    this.textInputAction,
    this.obscureText = false,
    this.readOnly = false,
    this.maxLines = 1,
    this.suffixIcon,
    this.onChanged,
    this.onSubmitted,
    this.inputFormatters,
    this.focusNode,
    this.autofocus = false,
  });

  final String label;
  final TextEditingController controller;
  final String? hint;
  final TextInputType? keyboardType;
  final TextInputAction? textInputAction;
  final bool obscureText;
  final bool readOnly;
  final int maxLines;
  final Widget? suffixIcon;
  final ValueChanged<String>? onChanged;
  final ValueChanged<String>? onSubmitted;
  final List<TextInputFormatter>? inputFormatters;
  final FocusNode? focusNode;
  final bool autofocus;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: AppColors.secondary.withValues(alpha: 0.95),
          ),
        ),
        const SizedBox(height: 6),
        TextField(
          controller: controller,
          focusNode: focusNode,
          autofocus: autofocus,
          keyboardType: keyboardType,
          textInputAction: textInputAction,
          obscureText: obscureText,
          readOnly: readOnly,
          maxLines: maxLines,
          onChanged: onChanged,
          onSubmitted: onSubmitted,
          onTapOutside: (_) => FocusManager.instance.primaryFocus?.unfocus(),
          inputFormatters: inputFormatters,
          decoration: InputDecoration(
            hintText: hint ?? label,
            suffixIcon:
                suffixIcon ??
                (readOnly
                    ? Icon(
                        Icons.lock_outline,
                        size: 18,
                        color: AppColors.secondary.withValues(alpha: 0.55),
                      )
                    : null),
            filled: readOnly,
            fillColor: readOnly
                ? AppColors.fieldFill.withValues(alpha: 0.65)
                : null,
          ),
        ),
      ],
    );
  }
}
