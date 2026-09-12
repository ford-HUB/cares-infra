import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:mobile/core/constants/app_assets.dart';
import 'package:mobile/core/constants/app_copy.dart';
import 'package:mobile/core/navigation/dashboard_router.dart';
import 'package:mobile/core/services/api_client.dart';
import 'package:mobile/core/services/auth_session.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/auth/data/auth_login_service.dart';
import 'package:mobile/features/auth/data/donor_auth_service.dart';
import 'package:mobile/features/auth/data/social_auth_client.dart';
import 'package:mobile/features/auth/presentation/screens/register_donor_screen.dart';
import 'package:mobile/features/auth/presentation/screens/register_type_selection_screen.dart';
import 'package:mobile/features/auth/presentation/screens/reset_password_screen.dart';
import 'package:mobile/features/auth/presentation/widgets/donor_only_sign_in_dialog.dart';
import 'package:mobile/features/auth/presentation/widgets/forgot_password_dialog.dart';
import 'package:mobile/features/auth/presentation/widgets/social_auth_buttons.dart';
import 'package:mobile/features/auth/presentation/widgets/weather_panel.dart';

/// Sign-in screen — shown after the entry splash completes.
class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen>
    with SingleTickerProviderStateMixin {
  late final AnimationController _introController;

  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;
  bool _isSigningIn = false;

  final AuthLoginService _authLoginService = AuthLoginService();
  final SocialAuthClient _socialAuthClient = SocialAuthClient();
  final DonorAuthService _donorAuthService = DonorAuthService();

  /// Which provider button is mid-flight, so only that one shows a spinner.
  SocialAuthProvider? _pendingProvider;

  bool get _isBusy => _isSigningIn || _pendingProvider != null;

  @override
  void initState() {
    super.initState();
    _introController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2200),
    );
    _introController.forward();
  }

  @override
  void dispose() {
    _introController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  double _interval(double t, double start, double end) {
    if (t <= start) return 0;
    if (t >= end) return 1;
    return Curves.easeOutCubic.transform((t - start) / (end - start));
  }

  void _showMessage(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), behavior: SnackBarBehavior.floating),
    );
  }

  Future<void> _signIn() async {
    if (_isBusy) return;

    final email = _emailController.text.trim();
    final password = _passwordController.text;

    if (email.isEmpty || password.isEmpty) {
      _showMessage('Please enter your email and password.');
      return;
    }

    setState(() => _isSigningIn = true);
    FocusManager.instance.primaryFocus?.unfocus();

    AuthSession.clear();

    try {
      final loginResult = await _authLoginService.login(
        email: email,
        password: password,
      );
      if (!mounted) return;

      AuthSession.setAccessToken(loginResult.accessToken);

      if (!mounted) return;

      DashboardRouter.navigateToRoleDashboard(
        context,
        roleType: loginResult.roleType,
        email: loginResult.email,
        firstName: loginResult.firstName,
        profileComplete: loginResult.hasInterests,
        hasInterests: loginResult.hasInterests,
      );
    } on ApiException catch (error) {
      if (!mounted) return;
      _showMessage(error.message);
    } catch (error) {
      if (!mounted) return;
      _showMessage('Sign in failed. Please try again.');
    } finally {
      if (mounted) {
        setState(() => _isSigningIn = false);
      }
    }
  }

  /// Google / Facebook sign-in for donors who registered through a provider.
  ///
  /// The provider token goes to `POST /v1/auth/donor/oauth`. A known donor is
  /// signed straight in; an account the server has never seen gets a dialog
  /// explaining that social sign-in is donor-only and, if they agree, is sent
  /// on to the donor sign-up to finish registering with that same provider.
  Future<void> _signInWithProvider(SocialAuthProvider provider) async {
    if (_isBusy) return;

    FocusManager.instance.primaryFocus?.unfocus();
    setState(() => _pendingProvider = provider);

    AuthSession.clear();

    try {
      final token = await _socialAuthClient.signIn(provider);
      final result = await _donorAuthService.exchangeProviderToken(token);
      if (!mounted) return;

      if (result.isSignedIn) {
        final session = result.session!;
        AuthSession.setAccessToken(session.accessToken);

        DashboardRouter.navigateToRoleDashboard(
          context,
          roleType: session.roleType,
          email: session.email,
          firstName: session.firstName,
          profileComplete: session.hasInterests,
          hasInterests: session.hasInterests,
        );
        return;
      }

      if (result.needsRegistration) {
        // The provider vouched for them but there is no CARES account yet. The
        // cached provider session is dropped so the sign-up's own button can run
        // the consent flow cleanly and mint a fresh ticket.
        await _socialAuthClient.signOut();
        if (!mounted) return;

        final proceed = await showDonorOnlySignInDialog(
          context,
          provider: provider,
          email: result.profile?.email ?? '',
        );
        if (!mounted || !proceed) return;

        Navigator.of(context).push(
          MaterialPageRoute<void>(builder: (_) => const RegisterDonorScreen()),
        );
        return;
      }

      _showMessage('${provider.label} sign-in did not complete. Try again.');
    } on SocialAuthException catch (error) {
      // Backing out of the provider sheet is a choice, not a failure to report.
      if (!error.cancelled && mounted) {
        _showMessage(error.message);
      }
    } on ApiException catch (error) {
      if (!mounted) return;
      _showMessage(error.message);
    } catch (error) {
      if (!mounted) return;
      _showMessage('${provider.label} sign-in failed. Please try again.');
    } finally {
      if (mounted) {
        setState(() => _pendingProvider = null);
      }
    }
  }

  /// Runs the whole reset flow: the dialog collects the email and the emailed
  /// code, and only once it hands back a token do we open the new-password
  /// screen. The email already typed into the form is carried in as a head start.
  Future<void> _forgotPassword() async {
    if (_isBusy) return;

    final result = await showForgotPasswordDialog(
      context,
      initialEmail: _emailController.text.trim(),
    );
    if (!mounted || result == null) return;

    final updated = await Navigator.of(context).push<bool>(
      MaterialPageRoute<bool>(
        builder: (_) => ResetPasswordScreen(
          email: result.email,
          resetToken: result.resetToken,
        ),
      ),
    );
    if (!mounted || updated != true) return;

    // The password just changed, so whatever is in the field is stale.
    setState(() {
      _emailController.text = result.email;
      _passwordController.clear();
    });
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _introController,
      builder: (context, _) {
        final t = _introController.value;

        return Scaffold(
          backgroundColor: Colors.white,
          body: SingleChildScrollView(
            keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _buildHeader(t),
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 24, 20, 28),
                  child: Column(
                    children: [
                      _buildForm(t),
                      const SizedBox(height: 18),
                      _field(t, 0.58, 0.76, _registerRow()),
                      const SizedBox(height: 24),
                      _buildFooter(t),
                    ],
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  /// Green band carrying the wordmark and the live weather. The rest of the
  /// page stays white so the sign-in card is the thing you look at.
  Widget _buildHeader(double t) {
    final topInset = MediaQuery.paddingOf(context).top;
    final titleOpacity = _interval(t, 0.1, 0.4);
    final subtitleOpacity = _interval(t, 0.2, 0.5);

    return Container(
      decoration: BoxDecoration(
        borderRadius: const BorderRadius.vertical(bottom: Radius.circular(32)),
        color: AppColors.primaryDark,
        // The outreach photo carries the texture. BlendMode.color keeps its
        // light and shade but repaints every hue in the palette green, so the
        // band still reads as one green header rather than a photo.
        image: const DecorationImage(
          image: AssetImage(AppAssets.loginEntryBanner),
          fit: BoxFit.cover,
          alignment: Alignment.center,
          colorFilter: ColorFilter.mode(AppColors.primary, BlendMode.color),
        ),
        boxShadow: const [
          BoxShadow(
            color: Color(0x331F5F28),
            blurRadius: 24,
            offset: Offset(0, 12),
          ),
        ],
      ),
      // Scrim: the band's original gradient, now translucent so the photo
      // shows through — opaque at the top-left to hold the wordmark, thinner
      // toward the bottom-right behind the sun panel.
      child: Container(
        padding: EdgeInsets.fromLTRB(24, topInset + 20, 24, 32),
        decoration: BoxDecoration(
          borderRadius: const BorderRadius.vertical(
            bottom: Radius.circular(32),
          ),
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              AppColors.primaryDark.withValues(alpha: 0.92),
              AppColors.primary.withValues(alpha: 0.82),
              AppColors.secondary.withValues(alpha: 0.70),
            ],
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // No fixed height here: the panel sizes itself from `width`, and
            // clamping it would clip the weather animation.
            Align(
              alignment: Alignment.centerRight,
              child: WeatherPanel(
                width: math.min(MediaQuery.sizeOf(context).width * 0.46, 190),
                progress: t,
              ),
            ),
            Opacity(
              opacity: titleOpacity,
              child: Transform.translate(
                offset: Offset(0, (1 - titleOpacity) * 18),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'WELCOME BACK',
                      style: TextStyle(
                        fontSize: 11.5,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 1.4,
                        color: Colors.white.withValues(alpha: 0.85),
                      ),
                    ),
                    const SizedBox(height: 6),
                    const Text(
                      AppCopy.appName,
                      style: TextStyle(
                        fontSize: 34,
                        fontWeight: FontWeight.w800,
                        color: Colors.white,
                        letterSpacing: 2,
                        height: 1.1,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 8),
            Opacity(
              opacity: subtitleOpacity,
              child: Transform.translate(
                offset: Offset(0, (1 - subtitleOpacity) * 14),
                child: const Text(
                  AppCopy.fullName,
                  style: TextStyle(
                    fontSize: 13,
                    height: 1.4,
                    color: Color(0xFFE3F2E4),
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildForm(double t) {
    return _field(
      t,
      0.3,
      0.6,
      Container(
        padding: const EdgeInsets.all(20),
        decoration: AppDecorations.surfaceCard().copyWith(
          boxShadow: const [
            BoxShadow(
              color: Color(0x121F5F28),
              blurRadius: 18,
              offset: Offset(0, 8),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'Sign in to your account',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w800,
                color: AppColors.primaryDark,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'Use the email and password you registered with, or the '
              'Google / Facebook account you signed up through.',
              style: TextStyle(
                fontSize: 12.5,
                height: 1.35,
                color: AppColors.secondary.withValues(alpha: 0.9),
              ),
            ),
            const SizedBox(height: 18),
            _emailField(),
            const SizedBox(height: 14),
            _passwordField(),
            const SizedBox(height: 4),
            Align(
              alignment: Alignment.centerRight,
              child: TextButton(
                onPressed: _isBusy ? null : _forgotPassword,
                style: TextButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 4),
                  minimumSize: const Size(0, 32),
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
                child: const Text(
                  'Forgot password?',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: AppColors.primary,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 12),
            ElevatedButton(
              onPressed: _isBusy ? null : _signIn,
              child: _isSigningIn
                  ? const SizedBox(
                      width: 22,
                      height: 22,
                      child: CircularProgressIndicator(
                        strokeWidth: 2.2,
                        color: Colors.white,
                      ),
                    )
                  : const Text('Sign In'),
            ),
            const SizedBox(height: 20),
            // Donors who signed up through Google / Facebook have no password to
            // type, so the same providers sign them in here.
            SocialAuthButtons(
              compact: true,
              dividerLabel: 'donors continue with',
              enabled: !_isBusy,
              pendingProvider: _pendingProvider,
              onProviderTap: _signInWithProvider,
            ),
          ],
        ),
      ),
    );
  }

  Widget _emailField() {
    return TextField(
      controller: _emailController,
      keyboardType: TextInputType.emailAddress,
      textInputAction: TextInputAction.next,
      decoration: const InputDecoration(
        hintText: 'Email address',
        prefixIcon: Icon(Icons.mail_outline_rounded),
        // A soft tint keeps the fields legible inside the white card.
        fillColor: AppColors.background,
      ),
    );
  }

  Widget _passwordField() {
    return TextField(
      controller: _passwordController,
      obscureText: _obscurePassword,
      textInputAction: TextInputAction.done,
      decoration: InputDecoration(
        hintText: 'Password',
        fillColor: AppColors.background,
        prefixIcon: const Icon(Icons.lock_outline_rounded),
        suffixIcon: IconButton(
          icon: Icon(
            _obscurePassword
                ? Icons.visibility_outlined
                : Icons.visibility_off_outlined,
          ),
          onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
        ),
      ),
    );
  }

  Widget _registerRow() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Text(
          "Don't have an account? ",
          style: TextStyle(
            color: AppColors.secondary.withValues(alpha: 0.9),
            fontSize: 14,
          ),
        ),
        GestureDetector(
          onTap: () {
            Navigator.of(context).push(
              MaterialPageRoute<void>(
                builder: (_) => const RegisterTypeSelectionScreen(),
              ),
            );
          },
          child: const Text(
            'Register',
            style: TextStyle(
              color: AppColors.primary,
              fontSize: 14,
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
      ],
    );
  }

  Widget _field(double t, double start, double end, Widget child) {
    final opacity = _interval(t, start, end);
    return Opacity(
      opacity: opacity,
      child: Transform.translate(
        offset: Offset(0, (1 - opacity) * 28),
        child: child,
      ),
    );
  }

  Widget _buildFooter(double t) {
    final opacity = _interval(t, 0.72, 0.95);
    return Opacity(
      opacity: opacity,
      child: Column(
        children: [
          Text(
            AppCopy.slogan,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: AppColors.secondary.withValues(alpha: 0.85),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            AppCopy.visionSnippet,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 11,
              height: 1.35,
              color: AppColors.textMuted.withValues(alpha: 0.95),
            ),
          ),
        ],
      ),
    );
  }
}
