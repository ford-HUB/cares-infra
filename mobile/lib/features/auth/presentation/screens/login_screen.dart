import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:mobile/core/navigation/dashboard_router.dart';
import 'package:mobile/core/services/api_client.dart';
import 'package:mobile/core/services/auth_session.dart';
import 'package:mobile/core/services/session_storage.dart';
import 'package:mobile/features/auth/data/auth_login_service.dart';
import 'package:mobile/features/auth/data/auth_registration_service.dart';
import 'package:mobile/features/auth/data/donor_auth_service.dart';
import 'package:mobile/features/auth/data/models/registration_api_models.dart';
import 'package:mobile/features/auth/data/social_auth_client.dart';
import 'package:mobile/features/auth/presentation/screens/email_verification_screen.dart';
import 'package:mobile/features/auth/presentation/screens/register_donor_screen.dart';
import 'package:mobile/features/auth/presentation/screens/register_type_selection_screen.dart';
import 'package:mobile/features/auth/presentation/screens/registration_under_review_screen.dart';
import 'package:mobile/features/auth/presentation/screens/reset_password_screen.dart';
import 'package:mobile/features/auth/presentation/widgets/app_version_badge.dart';
import 'package:mobile/features/auth/presentation/widgets/donor_only_sign_in_dialog.dart';
import 'package:mobile/features/auth/presentation/widgets/forgot_password_dialog.dart';
import 'package:mobile/features/auth/presentation/widgets/login/login_form_card.dart';
import 'package:mobile/features/auth/presentation/widgets/login/login_hero_header.dart';
import 'package:mobile/features/auth/presentation/widgets/login/login_support_email.dart';
import 'package:mobile/features/auth/presentation/widgets/social_auth_buttons.dart';
import 'package:mobile/shared/widgets/brand_wave.dart';
import 'package:mobile/shared/widgets/staggered_reveal.dart';

/// Sign-in screen — shown after the entry splash completes.
class LoginScreen extends StatefulWidget {
  const LoginScreen({
    super.key,
    this.onHeaderPullStart,
    this.onHeaderPullUpdate,
    this.onHeaderPullEnd,
  });

  /// Vertical drags on the green header, used by [AppFlow] to pull the leading
  /// story back down over login. Null when login is pushed on its own (e.g.
  /// after a session ends), and then the header has no handle.
  final GestureDragStartCallback? onHeaderPullStart;
  final GestureDragUpdateCallback? onHeaderPullUpdate;
  final GestureDragEndCallback? onHeaderPullEnd;

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
  final AuthRegistrationService _registrationService =
      AuthRegistrationService();
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
      await _completeSignIn(context, email: email, password: password);
    } on ApiException catch (error) {
      if (!mounted) return;
      if (_isEmailNotVerified(error)) {
        await _verifyEmailThenSignIn(email: email, password: password);
        return;
      }
      if (_showRegistrationReview(error, email: email)) return;
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

  Future<void> _completeSignIn(
    BuildContext navContext, {
    required String email,
    required String password,
  }) async {
    final loginResult = await _authLoginService.login(
      email: email,
      password: password,
    );
    if (!navContext.mounted) return;

    AuthSession.start(
      StoredSession(
        accessToken: loginResult.accessToken,
        roleType: loginResult.roleType,
        email: loginResult.email,
        firstName: loginResult.firstName,
        hasInterests: loginResult.hasInterests,
      ),
    );

    DashboardRouter.navigateToRoleDashboard(
      navContext,
      roleType: loginResult.roleType,
      email: loginResult.email,
      firstName: loginResult.firstName,
      profileComplete: loginResult.hasInterests,
      hasInterests: loginResult.hasInterests,
    );
  }

  /// A beneficiary whose sign-up a director has not approved (or refused) gets
  /// the review screen rather than a passing toast. True when it was shown.
  bool _showRegistrationReview(ApiException error, {required String email}) {
    final state = registrationReviewStateOf(error);
    if (state == null) return false;
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => RegistrationUnderReviewScreen(
          email: email,
          state: state,
          message: error.message,
        ),
      ),
    );
    return true;
  }

  /// The server's 403 for an account whose sign-up OTP was never completed.
  bool _isEmailNotVerified(ApiException error) {
    if (error.statusCode != 403) return false;
    final errors = error.errors;
    if (errors is! List) return false;
    return errors.any(
      (issue) => issue is Map && issue['code'] == 'EMAIL_NOT_VERIFIED',
    );
  }

  /// Right password, unproven email: mail a code and run the same OTP screen as
  /// sign-up. Once the code is accepted the sign-in is retried from that screen —
  /// the server stamps the account verified on that retry, since it has both the
  /// password and the code.
  Future<void> _verifyEmailThenSignIn({
    required String email,
    required String password,
  }) async {
    final SendVerificationResponse sendResult;
    try {
      sendResult = await _registrationService.sendVerificationCode(
        email: email,
        purpose: VerificationPurpose.login,
      );
    } on ApiException catch (error) {
      if (!mounted) return;
      _showMessage(error.message);
      return;
    }
    if (!mounted) return;

    _showMessage(
      sendResult.sent
          ? 'Your email is not verified yet. We sent a code to $email.'
          : 'Your email is not verified yet. Enter the code we already sent to $email.',
    );

    await Navigator.of(context).push<void>(
      MaterialPageRoute(
        builder: (_) => EmailVerificationScreen(
          email: email,
          purpose: VerificationPurpose.login,
          initialExpiresInSeconds: sendResult.expiresInSeconds,
          emailAlreadyVerified: sendResult.verified,
          codeReused: sendResult.reused,
          onVerified: (otpContext) =>
              _completeSignIn(otpContext, email: email, password: password),
        ),
      ),
    );
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
        AuthSession.start(
          StoredSession(
            accessToken: session.accessToken,
            roleType: session.roleType,
            email: session.email,
            firstName: session.firstName,
            hasInterests: session.hasInterests,
          ),
        );

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
      if (_showRegistrationReview(error, email: '')) return;
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

  void _openRegister() {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => const RegisterTypeSelectionScreen(),
      ),
    );
  }

  /// How far the card rides up over the hero's wave.
  static const double _cardOverlap = 40;
  static const double _footerWaveHeight = 92;

  @override
  Widget build(BuildContext context) {
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.light,
      child: Scaffold(
        backgroundColor: Colors.white,
        body: AnimatedBuilder(
          animation: _introController,
          builder: (context, _) {
            final t = _introController.value;
            return LayoutBuilder(
              builder: (context, constraints) => SingleChildScrollView(
                keyboardDismissBehavior:
                    ScrollViewKeyboardDismissBehavior.onDrag,
                child: ConstrainedBox(
                  constraints: BoxConstraints(minHeight: constraints.maxHeight),
                  child: Stack(
                    children: [
                      const Positioned(
                        left: 0,
                        right: 0,
                        bottom: 0,
                        child: BrandWave.footer(height: _footerWaveHeight),
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          LoginHeroHeader(
                            progress: t,
                            onPullStart: widget.onHeaderPullStart,
                            onPullUpdate: widget.onHeaderPullUpdate,
                            onPullEnd: widget.onHeaderPullEnd,
                          ),
                          Transform.translate(
                            offset: const Offset(0, -_cardOverlap),
                            child: Padding(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 16,
                              ),
                              child: _buildBody(t),
                            ),
                          ),
                          // Keeps the register prompt clear of the footer wave.
                          const SizedBox(height: _footerWaveHeight - 30),
                        ],
                      ),
                      // Support inbox, centred on the footer band; opens a
                      // pre-filled email.
                      // The side insets keep it clear of the version badge;
                      // on a narrow phone it scales down rather than overlap.
                      Positioned(
                        left: 48,
                        right: 48,
                        bottom: 2 + MediaQuery.viewPaddingOf(context).bottom,
                        child: Center(
                          child: FittedBox(
                            fit: BoxFit.scaleDown,
                            child: StaggeredReveal(
                              progress: t,
                              start: 0.7,
                              end: 1,
                              lift: 10,
                              child: const LoginSupportEmail(),
                            ),
                          ),
                        ),
                      ),
                      // Release version on the footer band; opens the notes.
                      Positioned(
                        right: 4,
                        bottom: 2 + MediaQuery.viewPaddingOf(context).bottom,
                        child: StaggeredReveal(
                          progress: t,
                          start: 0.7,
                          end: 1,
                          lift: 10,
                          child: const AppVersionBadge(),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        ),
      ),
    );
  }

  Widget _buildBody(double t) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        StaggeredReveal(
          progress: t,
          start: 0.3,
          end: 0.6,
          child: LoginFormCard(
            emailController: _emailController,
            passwordController: _passwordController,
            obscurePassword: _obscurePassword,
            onToggleObscure: () =>
                setState(() => _obscurePassword = !_obscurePassword),
            isSigningIn: _isSigningIn,
            isBusy: _isBusy,
            pendingProvider: _pendingProvider,
            onSignIn: _signIn,
            onForgotPassword: _forgotPassword,
            onProviderTap: _signInWithProvider,
          ),
        ),
        const SizedBox(height: 12),
        StaggeredReveal(
          progress: t,
          start: 0.58,
          end: 0.8,
          child: LoginRegisterPrompt(onRegister: _openRegister),
        ),
      ],
    );
  }
}
