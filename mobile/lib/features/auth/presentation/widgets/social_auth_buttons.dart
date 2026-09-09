import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:mobile/core/theme/app_theme.dart';

/// Third-party sign-in providers offered in the UI.
///
/// The buttons stay presentation-only: they report a tap and render a pending state.
/// Talking to Google, Facebook, and the CARES backend is the caller's job — see
/// `SocialAuthClient` and `DonorAuthService`.
enum SocialAuthProvider {
  google('Google'),
  facebook('Facebook');

  const SocialAuthProvider(this.label);

  final String label;
}

/// "or continue with" divider plus the Google / Facebook buttons.
class SocialAuthButtons extends StatelessWidget {
  const SocialAuthButtons({
    super.key,
    required this.onProviderTap,
    this.dividerLabel = 'or continue with',
    this.showDivider = true,
    this.compact = false,
    this.pendingProvider,
    this.enabled = true,
  });

  final ValueChanged<SocialAuthProvider> onProviderTap;
  final String dividerLabel;
  final bool showDivider;

  /// The provider whose sign-in is in flight — it shows a spinner in place of its glyph.
  final SocialAuthProvider? pendingProvider;

  /// False while any sign-in or submit is running, so a second provider cannot be
  /// started on top of the first.
  final bool enabled;

  /// Side-by-side icon buttons instead of full-width labelled rows.
  final bool compact;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (showDivider) ...[
          _DividerLabel(label: dividerLabel),
          const SizedBox(height: 16),
        ],
        if (compact)
          Row(
            children: [
              for (final provider in SocialAuthProvider.values) ...[
                Expanded(
                  child: SocialAuthButton(
                    provider: provider,
                    compact: true,
                    enabled: enabled,
                    pending: pendingProvider == provider,
                    onTap: () => onProviderTap(provider),
                  ),
                ),
                if (provider != SocialAuthProvider.values.last)
                  const SizedBox(width: 12),
              ],
            ],
          )
        else
          for (final provider in SocialAuthProvider.values) ...[
            SocialAuthButton(
              provider: provider,
              enabled: enabled,
              pending: pendingProvider == provider,
              onTap: () => onProviderTap(provider),
            ),
            if (provider != SocialAuthProvider.values.last)
              const SizedBox(height: 12),
          ],
      ],
    );
  }
}

/// A single provider button — white card, brand glyph, subtle press feedback.
class SocialAuthButton extends StatelessWidget {
  const SocialAuthButton({
    super.key,
    required this.provider,
    required this.onTap,
    this.compact = false,
    this.enabled = true,
    this.pending = false,
  });

  final SocialAuthProvider provider;
  final VoidCallback onTap;
  final bool compact;
  final bool enabled;
  final bool pending;

  @override
  Widget build(BuildContext context) {
    final glyph = pending
        ? const SizedBox(
            width: 22,
            height: 22,
            child: CircularProgressIndicator(
              strokeWidth: 2.2,
              color: AppColors.primary,
            ),
          )
        : provider == SocialAuthProvider.google
        ? const GoogleGlyph(size: 22)
        : const FacebookGlyph(size: 22);

    return Opacity(
      opacity: enabled ? 1 : 0.55,
      child: Material(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
        child: InkWell(
          onTap: enabled ? onTap : null,
          borderRadius: BorderRadius.circular(14),
          child: Ink(
            height: 54,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppColors.borderCard),
              boxShadow: const [
                BoxShadow(
                  color: Color(0x0F1F5F28),
                  blurRadius: 10,
                  offset: Offset(0, 4),
                ),
              ],
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                glyph,
                const SizedBox(width: 10),
                Text(
                  compact ? provider.label : 'Continue with ${provider.label}',
                  style: const TextStyle(
                    fontSize: 14.5,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _DividerLabel extends StatelessWidget {
  const _DividerLabel({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    final line = Expanded(
      child: Container(height: 1, color: AppColors.borderLight),
    );

    return Row(
      children: [
        line,
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          child: Text(
            label,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              letterSpacing: 0.4,
              color: AppColors.secondary.withValues(alpha: 0.9),
            ),
          ),
        ),
        line,
      ],
    );
  }
}

/// Official brand marks, drawn from each provider's published vector artwork
/// via `flutter_svg` so the logos match the real thing instead of being
/// approximated by hand-painted arcs.
///
/// The markup is inlined rather than bundled as an asset: it keeps the logos
/// versioned with the widget that uses them and avoids a network fetch.
class _BrandMarks {
  const _BrandMarks._();

  /// Google "G" — the four-colour mark.
  static const String google = '''
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.28-3.14.76-4.59l-7.97-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
  <path fill="none" d="M0 0h48v48H0z"/>
</svg>
''';

  /// Facebook "f" — white glyph on the brand-blue disc.
  static const String facebook = '''
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36">
  <path fill="#1877F2" d="M36 18C36 8.06 27.94 0 18 0S0 8.06 0 18c0 8.98 6.58 16.43 15.19 17.78V23.2h-4.57V18h4.57v-3.96c0-4.51 2.69-7 6.8-7 1.97 0 4.03.35 4.03.35v4.43h-2.27c-2.24 0-2.94 1.39-2.94 2.81V18h5l-.8 5.2h-4.2v12.58C29.42 34.43 36 26.98 36 18z"/>
  <path fill="#fff" d="M25.01 23.2l.8-5.2h-5v-3.37c0-1.42.7-2.81 2.94-2.81h2.27V7.39s-2.06-.35-4.03-.35c-4.11 0-6.8 2.49-6.8 7V18h-4.57v5.2h4.57v12.58a18.2 18.2 0 0 0 5.62 0V23.2h4.2z"/>
</svg>
''';
}

/// Four-colour Google "G", rendered from the official vector mark.
class GoogleGlyph extends StatelessWidget {
  const GoogleGlyph({super.key, this.size = 22});

  final double size;

  @override
  Widget build(BuildContext context) {
    return SvgPicture.string(
      _BrandMarks.google,
      width: size,
      height: size,
      semanticsLabel: 'Google',
    );
  }
}

/// Facebook "f" on the brand blue disc, rendered from the official vector mark.
class FacebookGlyph extends StatelessWidget {
  const FacebookGlyph({super.key, this.size = 22});

  final double size;

  @override
  Widget build(BuildContext context) {
    return SvgPicture.string(
      _BrandMarks.facebook,
      width: size,
      height: size,
      semanticsLabel: 'Facebook',
    );
  }
}
