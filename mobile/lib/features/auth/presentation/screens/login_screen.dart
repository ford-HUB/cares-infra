import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:mobile/core/constants/app_copy.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/auth/presentation/screens/register_flow_screen.dart';
import 'package:mobile/features/auth/presentation/widgets/animated_illustration.dart';

/// Sign-in screen — shown after the welcome film completes.
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
              _LoginBackground(progress: t, ambient: ambient),
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
            onPressed: () {},
            child: const Text('Sign In'),
          ),
        ),
      ),
      _field(t, 0.58, 0.76, _registerRow()),
    ];

    return Column(
      children: fields
          .expand((w) => [w, const SizedBox(height: 14)])
          .toList()
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
                builder: (_) => const RegisterFlowScreen(),
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
  const _LoginBackground({required this.progress, required this.ambient});

  final double progress;
  final double ambient;

  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      painter: _LoginBgPainter(progress: progress, ambient: ambient),
      size: Size.infinite,
    );
  }
}

class _LoginBgPainter extends CustomPainter {
  _LoginBgPainter({required this.progress, required this.ambient});

  final double progress;
  final double ambient;

  @override
  void paint(Canvas canvas, Size size) {
    final rect = Offset.zero & size;
    canvas.drawRect(
      rect,
      Paint()
        ..shader = const LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0xFFE8F5E9), AppColors.background, Color(0xFFF9FBE7)],
        ).createShader(rect),
    );

    final fadeIn = Curves.easeOut.transform(progress.clamp(0.0, 1.0));
    final center = Offset(size.width * 0.5, size.height * 0.15);
    canvas.drawCircle(
      center,
      size.width * 0.5,
      Paint()
        ..shader = RadialGradient(
          colors: [
            AppColors.secondary.withValues(alpha: 0.1 * fadeIn),
            Colors.transparent,
          ],
        ).createShader(Rect.fromCircle(center: center, radius: size.width * 0.5)),
    );

    final leafPaint = Paint()
      ..color = AppColors.light.withValues(alpha: 0.3 * fadeIn);
    for (var i = 0; i < 10; i++) {
      final phase = ambient * math.pi * 2 + i;
      final x = size.width * (0.15 + (i % 3) * 0.28) + math.sin(phase) * 10;
      final y = size.height * (0.1 + (i ~/ 3) * 0.2) + math.cos(phase) * 8;
      canvas.drawCircle(Offset(x, y), 3, leafPaint);
    }
  }

  @override
  bool shouldRepaint(_LoginBgPainter old) =>
      old.progress != progress || old.ambient != ambient;
}
