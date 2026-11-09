import 'package:flutter/material.dart';
import 'package:mobile/core/theme/app_theme.dart';

/// The screen's single primary action: a green gradient pill-cornered button
/// with an optional leading icon, lifted by a soft green shadow.
///
/// Pass `onPressed: null` to disable it; [loading] swaps the label for a
/// spinner and keeps full colour so the press still reads as in progress.
class GradientButton extends StatelessWidget {
  const GradientButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.icon,
    this.loading = false,
    this.height = 54,
  });

  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final bool loading;
  final double height;

  @override
  Widget build(BuildContext context) {
    const radius = BorderRadius.all(Radius.circular(12));
    final enabled = onPressed != null && !loading;

    return Opacity(
      opacity: onPressed == null && !loading ? 0.6 : 1,
      child: DecoratedBox(
        decoration: const BoxDecoration(
          gradient: AppGradients.primaryButton,
          borderRadius: radius,
          boxShadow: [
            BoxShadow(
              color: Color(0x401F5F28),
              blurRadius: 14,
              offset: Offset(0, 6),
            ),
          ],
        ),
        child: Material(
          type: MaterialType.transparency,
          child: InkWell(
            borderRadius: radius,
            onTap: enabled ? onPressed : null,
            child: SizedBox(
              height: height,
              child: Center(
                child: loading
                    ? const SizedBox(
                        width: 22,
                        height: 22,
                        child: CircularProgressIndicator(
                          strokeWidth: 2.2,
                          color: Colors.white,
                        ),
                      )
                    : Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          if (icon != null) ...[
                            Icon(icon, color: Colors.white, size: 22),
                            const SizedBox(width: 12),
                          ],
                          Text(
                            label,
                            style: const TextStyle(
                              fontSize: 17,
                              fontWeight: FontWeight.w700,
                              color: Colors.white,
                            ),
                          ),
                        ],
                      ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
