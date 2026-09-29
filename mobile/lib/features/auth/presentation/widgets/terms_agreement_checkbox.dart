import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/auth/presentation/widgets/cares_terms_dialog.dart';

/// Sign-up consent row: the box only ticks after the notice has been read to the end,
/// so tapping either the box or the inline link opens the dialog first.
class TermsAgreementCheckbox extends StatefulWidget {
  const TermsAgreementCheckbox({
    super.key,
    required this.audience,
    required this.accepted,
    required this.onChanged,
  });

  final CaresTermsAudience audience;
  final bool accepted;
  final ValueChanged<bool> onChanged;

  @override
  State<TermsAgreementCheckbox> createState() => _TermsAgreementCheckboxState();
}

class _TermsAgreementCheckboxState extends State<TermsAgreementCheckbox> {
  /// Lives with the state so the inline link is not rebuilt into a leak.
  late final TapGestureRecognizer _linkRecognizer = TapGestureRecognizer()
    ..onTap = _openTerms;

  @override
  void dispose() {
    _linkRecognizer.dispose();
    super.dispose();
  }

  String get _linkLabel => switch (widget.audience) {
    CaresTermsAudience.donor => 'CARES donor terms and privacy notice',
    CaresTermsAudience.volunteer => 'CARES volunteer terms and privacy notice',
    CaresTermsAudience.beneficiary =>
      'CARES beneficiary terms and privacy notice',
  };

  Future<void> _openTerms() async {
    final accepted = await showCaresTermsDialog(context, widget.audience);
    if (!mounted || !accepted) return;
    widget.onChanged(true);
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 24,
            height: 24,
            child: Checkbox(
              value: widget.accepted,
              visualDensity: VisualDensity.compact,
              materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(6),
              ),
              // Ticking it needs the notice read first; unticking is always allowed.
              onChanged: (value) {
                if (value == true) {
                  _openTerms();
                  return;
                }
                widget.onChanged(false);
              },
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text.rich(
              TextSpan(
                style: TextStyle(
                  fontSize: 13,
                  height: 1.4,
                  color: AppColors.secondary.withValues(alpha: 0.95),
                ),
                children: [
                  const TextSpan(text: 'I agree to the '),
                  TextSpan(
                    text: _linkLabel,
                    style: const TextStyle(
                      fontWeight: FontWeight.w700,
                      color: AppColors.primary,
                      decoration: TextDecoration.underline,
                      decorationColor: AppColors.primary,
                    ),
                    recognizer: _linkRecognizer,
                  ),
                  const TextSpan(text: '.'),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
