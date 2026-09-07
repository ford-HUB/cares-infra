import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:mobile/core/constants/app_copy.dart';
import 'package:mobile/core/navigation/dashboard_router.dart';
import 'package:mobile/core/services/api_client.dart';
import 'package:mobile/core/services/auth_session.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/auth/data/auth_login_service.dart';
import 'package:mobile/features/auth/presentation/screens/register_type_selection_screen.dart';
import 'package:mobile/features/auth/presentation/widgets/animated_illustration.dart';
import 'package:mobile/features/auth/presentation/widgets/sun_weather_panel.dart';

/// Sign-in screen — shown after the entry splash completes.
class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen>
    with TickerProviderStateMixin {
  late final AnimationController _introController;
  late final AnimationController _ambientController;

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
    _ambientController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 6),
    )..repeat();

    _introController.forward();
  }

  @override
  void dispose() {
    _introController.dispose();
    _ambientController.dispose();
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
      animation: Listenable.merge([_introController, _ambientController]),
      builder: (context, _) {
        final t = _introController.value;
        final ambient = _ambientController.value;

        return Scaffold(
          body: Stack(
            children: [
              const _LoginBackground(),
              Positioned(
                top: MediaQuery.paddingOf(context).top - 12,
                right: -8,
                child: SunWeatherPanel(
                  size: math.min(MediaQuery.sizeOf(context).width * 0.27, 108),
                  passwordVisible: !_obscurePassword,
                  progress: t,
                  ambient: ambient,
                ),
              ),
              SafeArea(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.symmetric(horizontal: 28),
                  child: Column(
                    children: [
                      const SizedBox(height: 24),
                      _buildHeader(t),
                      const SizedBox(height: 28),
                      _buildForm(t),
                      const SizedBox(height: 20),
                      _buildFooter(t),
                      const SizedBox(height: 16),
                    ],
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildHeader(double t) {
    final logoProgress = _interval(t, 0.0, 0.5);
    final titleOpacity = _interval(t, 0.2, 0.45);
    final subtitleOpacity = _interval(t, 0.3, 0.55);

    return Column(
      children: [
        AnimatedIllustration(progress: logoProgress, size: 132),
        const SizedBox(height: 20),
        Opacity(
          opacity: titleOpacity,
          child: Transform.translate(
            offset: Offset(0, (1 - titleOpacity) * 20),
            child: const Text(
              AppCopy.appName,
              style: TextStyle(
                fontSize: 36,
                fontWeight: FontWeight.w800,
                color: AppColors.primary,
                letterSpacing: 2,
              ),
            ),
          ),
        ),
        const SizedBox(height: 8),
        Opacity(
          opacity: subtitleOpacity,
          child: Transform.translate(
            offset: Offset(0, (1 - subtitleOpacity) * 16),
            child: const Text(
              AppCopy.fullName,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 14,
                height: 1.4,
                color: AppColors.secondary,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildForm(double t) {
    final fields = <Widget>[
      _field(t, 0.35, 0.52, _emailField()),
      _field(t, 0.42, 0.6, _passwordField()),
      _field(
        t,
        0.5,
        0.68,
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
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
        ),
      ),
      _field(t, 0.58, 0.76, _registerRow()),
    ];

    return Column(
      children: fields.expand((w) => [w, const SizedBox(height: 14)]).toList()
        ..removeLast(),
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
              color: AppColors.light.withValues(alpha: 0.95),
            ),
          ),
        ],
      ),
    );
  }
}

class _LoginBackground extends StatelessWidget {
  const _LoginBackground();

  @override
  Widget build(BuildContext context) {
    return const CustomPaint(painter: _LoginBgPainter(), size: Size.infinite);
  }
}

class _LoginBgPainter extends CustomPainter {
  const _LoginBgPainter();

  static const _skyTop = Color(0xFF81D4FA);
  static const _skyMid = Color(0xFFFFF9C4);
  static const _skyBottom = Color(0xFFF1F8E9);

  @override
  void paint(Canvas canvas, Size size) {
    final rect = Offset.zero & size;

    canvas.drawRect(
      rect,
      Paint()
        ..shader = const LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [_skyTop, _skyMid, _skyBottom],
          stops: [0.0, 0.45, 1.0],
        ).createShader(rect),
    );
  }

  @override
  bool shouldRepaint(_LoginBgPainter old) => false;
}
