import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:mobile/core/constants/app_assets.dart';
import 'package:mobile/core/constants/app_copy.dart';
import 'package:mobile/core/navigation/dashboard_router.dart';
import 'package:mobile/core/services/api_client.dart';
import 'package:mobile/core/services/auth_session.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/auth/data/auth_login_service.dart';
import 'package:mobile/features/auth/presentation/screens/register_type_selection_screen.dart';
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
    if (_isSigningIn) return;

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
              'Use the email and password you registered with.',
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
            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: _isSigningIn ? null : _signIn,
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
