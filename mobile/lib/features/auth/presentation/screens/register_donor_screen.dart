import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/core/services/api_client.dart';
import 'package:mobile/core/services/auth_session.dart';
import 'package:mobile/core/session/donor_session.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/core/utils/phone_number_format.dart';
import 'package:mobile/features/auth/data/donor_auth_service.dart';
import 'package:mobile/features/auth/data/models/donor_auth_models.dart';
import 'package:mobile/features/auth/data/models/login_api_models.dart';
import 'package:mobile/features/auth/data/models/registration_api_models.dart';
import 'package:mobile/features/auth/data/social_auth_client.dart';
import 'package:mobile/features/auth/presentation/providers/password_policy_provider.dart';
import 'package:mobile/features/auth/presentation/providers/register_flow_provider.dart';
import 'package:mobile/features/auth/presentation/screens/email_verification_screen.dart';
import 'package:mobile/features/auth/presentation/utils/conflict_focus.dart';
import 'package:mobile/features/auth/presentation/widgets/account_exists_dialog.dart';
import 'package:mobile/features/auth/presentation/widgets/cares_terms_dialog.dart';
import 'package:mobile/features/auth/presentation/widgets/register_form_field.dart';
import 'package:mobile/features/auth/presentation/widgets/registration_form_card.dart';
import 'package:mobile/features/auth/presentation/widgets/social_auth_buttons.dart';
import 'package:mobile/features/auth/presentation/widgets/terms_agreement_checkbox.dart';
import 'package:mobile/features/auth/registration/widgets/password_strength_indicator.dart';
import 'package:mobile/features/dashboard/presentation/screens/donor_dashboard_screen.dart';

/// Donor sign-up.
///
/// The Google / Facebook route is wired end to end: the provider token goes to
/// `POST /v1/auth/donor/oauth`, which either signs an existing donor straight in or
/// hands back a verified profile plus a ticket that `POST /v1/auth/donor/register`
/// spends to create the account.
///
/// The email + password route has no provider to vouch for the address, so it borrows
/// the volunteer OTP step: "Create donor account" mails a code, the
/// [EmailVerificationScreen] confirms it, and only then does
/// `POST /v1/auth/donor/register-email` create the account.
class RegisterDonorScreen extends ConsumerStatefulWidget {
  const RegisterDonorScreen({super.key});

  @override
  ConsumerState<RegisterDonorScreen> createState() =>
      _RegisterDonorScreenState();
}

class _RegisterDonorScreenState extends ConsumerState<RegisterDonorScreen> {
  final _firstNameController = TextEditingController();
  final _middleNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _addressController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  final _emailFocus = FocusNode();
  final _phoneFocus = FocusNode();

  /// Set when the server says the email or phone number belongs to another
  /// account; the input shows the message and takes focus until edited.
  RegistrationConflict? _conflict;

  final _socialAuthClient = SocialAuthClient();
  final _donorAuthService = DonorAuthService();

  bool _obscurePassword = true;
  bool _obscureConfirmPassword = true;
  bool _acceptedTerms = false;

  /// Set once a provider has verified the donor and the server has confirmed they are
  /// new here. Held together with [_oauthTicket], which is the only proof the register
  /// call accepts — losing one makes the other useless.
  DonorOAuthProfile? _linkedAccount;
  String? _oauthTicket;

  /// Which provider button is mid-flight, so only that one shows a spinner.
  SocialAuthProvider? _pendingProvider;
  bool _submitting = false;

  bool get _isSocialSignUp => _linkedAccount != null;

  bool get _isBusy => _pendingProvider != null || _submitting;

  bool get _passwordsMatch =>
      _confirmPasswordController.text == _passwordController.text;

  bool get _canSubmit {
    if (_isBusy) return false;

    final baseDetailsFilled =
        _firstNameController.text.trim().isNotEmpty &&
        _lastNameController.text.trim().isNotEmpty &&
        _emailController.text.trim().contains('@') &&
        // The server needs both: `phone_number` is unique on the user record, and the
        // address is what donation receipts are issued against.
        isValidPhilippinePhone(_phoneController.text) &&
        _addressController.text.trim().isNotEmpty &&
        _acceptedTerms;

    if (!baseDetailsFilled) return false;
    if (_isSocialSignUp) return true;

    // Submit unlocks on exactly the rules the chips under the field are asking for.
    return ref
            .read(currentPasswordPolicyProvider)
            .isSatisfiedBy(_passwordController.text) &&
        _passwordsMatch;
  }

  @override
  void dispose() {
    _firstNameController.dispose();
    _middleNameController.dispose();
    _lastNameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _addressController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    _emailFocus.dispose();
    _phoneFocus.dispose();
    super.dispose();
  }

  String? _conflictMessageFor(RegistrationConflictField field) =>
      _conflict?.field == field ? _conflict!.message : null;

  void _clearConflict(RegistrationConflictField field) {
    if (_conflict?.field == field) _conflict = null;
  }

  /// Highlights and focuses the field the server rejected. Runs on this page
  /// directly from a failed send, or via the OTP screen after it pops itself.
  Future<void> _showConflict(RegistrationConflict conflict) async {
    if (!mounted) return;
    setState(() => _conflict = conflict);
    switch (conflict.field) {
      case RegistrationConflictField.email:
        focusConflictField(this, _emailFocus);
        await showAccountExistsDialog(
          context,
          email: _emailController.text.trim(),
        );
        return;
      case RegistrationConflictField.phoneNumber:
        focusConflictField(this, _phoneFocus);
      case RegistrationConflictField.idNumber:
        break;
    }
    _showMessage(conflict.message);
  }

  void _showMessage(String message) {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(content: Text(message), behavior: SnackBarBehavior.floating),
      );
  }

  /// Runs the provider consent flow, then asks the server what that identity means
  /// here: an existing donor is signed in on the spot, a new one comes back as a
  /// verified profile that seeds the form below.
  Future<void> _linkSocialAccount(SocialAuthProvider provider) async {
    if (_isBusy) return;

    FocusManager.instance.primaryFocus?.unfocus();
    setState(() => _pendingProvider = provider);

    try {
      final token = await _socialAuthClient.signIn(provider);
      final result = await _donorAuthService.exchangeProviderToken(token);

      if (!mounted) return;

      if (result.isSignedIn) {
        final session = result.session!;
        _showMessage('Welcome back, ${session.firstName}.');
        // Nothing was typed in — the login payload carries only a first name, and
        // the donor profile screen fills the rest in from the server.
        _enterDashboard(
          session,
          middleName: '',
          lastName: '',
          phoneNumber: '',
          address: '',
        );
        return;
      }

      if (!result.needsRegistration) {
        _showMessage('${provider.label} sign-in did not complete. Try again.');
        return;
      }

      final profile = result.profile!;
      setState(() {
        _linkedAccount = profile;
        _oauthTicket = result.oauthTicket;
        _firstNameController.text = profile.firstName;
        _middleNameController.text = profile.middleName;
        _lastNameController.text = profile.lastName;
        _emailController.text = profile.email;
        _passwordController.clear();
        _confirmPasswordController.clear();
      });

      _showMessage(
        '${provider.label} verified — add your contact details to finish.',
      );
    } on SocialAuthException catch (error) {
      // Backing out of the provider sheet is a choice, not a failure to report.
      if (!error.cancelled && mounted) {
        _showMessage(error.message);
      }
    } on ApiException catch (error) {
      if (mounted) _showMessage(error.message);
    } finally {
      if (mounted) setState(() => _pendingProvider = null);
    }
  }

  Future<void> _unlinkSocialAccount() async {
    // Drops the provider's cached session too, so the next tap offers the chooser
    // rather than silently re-linking the account they just backed out of.
    await _socialAuthClient.signOut();
    if (!mounted) return;

    setState(() {
      _linkedAccount = null;
      _oauthTicket = null;
      _firstNameController.clear();
      _middleNameController.clear();
      _lastNameController.clear();
      _emailController.clear();
    });
  }

  Future<void> _submit() async {
    if (!_canSubmit) return;

    FocusManager.instance.primaryFocus?.unfocus();

    if (_isSocialSignUp) {
      await _submitSocialSignUp();
      return;
    }

    await _sendVerificationCode();
  }

  /// Email + password path: mail a code, then hand off to the OTP screen. The account
  /// is created from that screen's `onVerified`, so a wrong or expired code never
  /// leaves a half-made donor behind.
  Future<void> _sendVerificationCode() async {
    final email = _emailController.text.trim();
    setState(() => _submitting = true);

    try {
      final registrationService = ref.read(authRegistrationServiceProvider);
      final sendResult = await registrationService.sendVerificationCode(
        email: email,
        phoneNumber: _phoneController.text,
      );
      if (!mounted) return;

      setState(() => _submitting = false);

      if (!sendResult.sent && sendResult.reused) {
        _showMessage(
          sendResult.verified
              ? 'Your email is already verified. Enter the same code to continue.'
              : 'Your verification code is still active. Check your email and enter it below.',
        );
      }

      await Navigator.of(context).push<void>(
        MaterialPageRoute(
          builder: (_) => EmailVerificationScreen(
            email: email,
            initialExpiresInSeconds: sendResult.expiresInSeconds,
            emailAlreadyVerified: sendResult.verified,
            codeReused: sendResult.reused,
            onConflict: _showConflict,
            onVerified: _createEmailDonor,
          ),
        ),
      );
    } on ApiException catch (error) {
      if (!mounted) return;
      setState(() => _submitting = false);
      final conflict = RegistrationConflict.fromException(error);
      if (conflict != null) {
        unawaited(_showConflict(conflict));
        return;
      }
      _showMessage(error.message);
    } catch (_) {
      if (!mounted) return;
      setState(() => _submitting = false);
      _showMessage('Failed to send verification code.');
    }
  }

  /// Runs on the OTP screen once the code is accepted. Errors are left to propagate:
  /// the verification screen shows them and clears the code for another try.
  Future<void> _createEmailDonor(BuildContext otpContext) async {
    final session = await _donorAuthService.registerDonorWithEmail(
      email: _emailController.text,
      password: _passwordController.text,
      firstName: _firstNameController.text,
      middleName: _middleNameController.text,
      lastName: _lastNameController.text,
      phoneNumber: _phoneController.text,
      address: _addressController.text,
    );

    if (!otpContext.mounted) return;
    _enterDashboard(
      session,
      middleName: _middleNameController.text.trim(),
      lastName: _lastNameController.text.trim(),
      phoneNumber: _phoneController.text.trim(),
      address: _addressController.text.trim(),
      navigatorContext: otpContext,
    );
  }

  Future<void> _submitSocialSignUp() async {
    final ticket = _oauthTicket;
    if (ticket == null) {
      _showMessage('That sign-in expired. Tap the provider button again.');
      return;
    }

    setState(() => _submitting = true);

    try {
      final session = await _donorAuthService.registerDonor(
        oauthTicket: ticket,
        firstName: _firstNameController.text,
        middleName: _middleNameController.text,
        lastName: _lastNameController.text,
        phoneNumber: _phoneController.text,
        address: _addressController.text,
      );

      if (!mounted) return;
      _enterDashboard(
        session,
        middleName: _middleNameController.text.trim(),
        lastName: _lastNameController.text.trim(),
        phoneNumber: _phoneController.text.trim(),
        address: _addressController.text.trim(),
      );
    } on ApiException catch (error) {
      if (!mounted) return;
      // A spent or expired ticket cannot be retried — send them back to the button.
      if (error.statusCode == 401) {
        setState(() {
          _linkedAccount = null;
          _oauthTicket = null;
        });
      }
      final conflict = RegistrationConflict.fromException(error);
      if (conflict != null) {
        unawaited(_showConflict(conflict));
        return;
      }
      _showMessage(error.message);
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  /// Stores the token every later API call authenticates with, then opens the dashboard.
  void _enterDashboard(
    LoginResponse session, {
    required String middleName,
    required String lastName,
    required String phoneNumber,
    required String address,
    BuildContext? navigatorContext,
  }) {
    AuthSession.setAccessToken(session.accessToken);

    final donor = DonorSessionUser(
      userId: session.userId,
      firstName: session.firstName,
      middleName: middleName,
      lastName: lastName,
      email: session.email,
      phoneNumber: phoneNumber,
      address: address,
      avatarUrl: _linkedAccount?.avatarUrl,
    );

    DonorSession.instance.register(donor);
    _openDashboard(donor, navigatorContext ?? context);
  }

  /// [navigatorContext] is whichever screen is on top — this form, or the OTP screen
  /// pushed above it on the email path. Both share the root navigator, so the whole
  /// sign-up stack is cleared either way.
  void _openDashboard(DonorSessionUser donor, BuildContext navigatorContext) {
    Navigator.of(navigatorContext).pushAndRemoveUntil(
      MaterialPageRoute<void>(
        builder: (_) => DonorDashboardScreen(donor: donor),
      ),
      (_) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        foregroundColor: AppColors.primary,
      ),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(20, 4, 20, 8),
                keyboardDismissBehavior:
                    ScrollViewKeyboardDismissBehavior.onDrag,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const _DonorHeroPanel(),
                    const SizedBox(height: 20),
                    if (_isSocialSignUp)
                      _LinkedAccountCard(
                        account: _linkedAccount!,
                        onUnlink: _unlinkSocialAccount,
                      )
                    else
                      SocialAuthButtons(
                        showDivider: false,
                        enabled: !_isBusy,
                        pendingProvider: _pendingProvider,
                        onProviderTap: _linkSocialAccount,
                      ),
                    const SizedBox(height: 20),
                    if (!_isSocialSignUp) ...[
                      _sectionDivider('or sign up with email'),
                      const SizedBox(height: 20),
                    ],
                    _nameSection(),
                    const SizedBox(height: 16),
                    _accountSection(),
                    const SizedBox(height: 16),
                    _contactSection(),
                    const SizedBox(height: 16),
                    _termsRow(),
                    const SizedBox(height: 8),
                  ],
                ),
              ),
            ),
            _bottomBar(),
          ],
        ),
      ),
    );
  }

  Widget _sectionDivider(String label) {
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
              letterSpacing: 0.3,
              color: AppColors.secondary.withValues(alpha: 0.9),
            ),
          ),
        ),
        line,
      ],
    );
  }

  Widget _nameSection() {
    return _FormCard(
      icon: Icons.badge_outlined,
      title: 'Your name',
      subtitle: 'This is how campaigns will thank you.',
      children: [
        RegisterFormField(
          label: 'First Name',
          controller: _firstNameController,
          textInputAction: TextInputAction.next,
          onChanged: (_) => setState(() {}),
        ),
        const SizedBox(height: 14),
        RegisterFormField(
          label: 'Middle Name',
          hint: 'Optional',
          controller: _middleNameController,
          textInputAction: TextInputAction.next,
          onChanged: (_) => setState(() {}),
        ),
        const SizedBox(height: 14),
        RegisterFormField(
          label: 'Last Name',
          controller: _lastNameController,
          textInputAction: TextInputAction.next,
          onChanged: (_) => setState(() {}),
        ),
      ],
    );
  }

  Widget _contactSection() {
    return _FormCard(
      icon: Icons.place_outlined,
      title: 'Contact details',
      subtitle: 'Where we reach you and address your receipts.',
      children: [
        RegisterFormField(
          label: 'Phone Number',
          controller: _phoneController,
          focusNode: _phoneFocus,
          errorText:
              _conflictMessageFor(RegistrationConflictField.phoneNumber) ??
              philippinePhoneError(_phoneController.text),
          keyboardType: TextInputType.phone,
          textInputAction: TextInputAction.next,
          inputFormatters: const [PhilippinePhoneFormatter()],
          onChanged: (_) => setState(
            () => _clearConflict(RegistrationConflictField.phoneNumber),
          ),
        ),
        const SizedBox(height: 14),
        RegisterFormField(
          label: 'Address',
          hint: 'Street, barangay, city',
          controller: _addressController,
          keyboardType: TextInputType.streetAddress,
          textInputAction: TextInputAction.done,
          maxLines: 2,
          onChanged: (_) => setState(() {}),
        ),
      ],
    );
  }

  Widget _accountSection() {
    final password = _passwordController.text;
    final confirm = _confirmPasswordController.text;

    return _FormCard(
      icon: Icons.lock_outline_rounded,
      title: 'Sign-in details',
      subtitle: _isSocialSignUp
          ? 'Managed by ${_linkedAccount!.provider.label} — no password needed.'
          : 'Used every time you sign in to CARES.',
      // The provider owns this address; the server reads it off the ticket, so editing
      // it here would change nothing but confuse the donor.
      children: [
        RegisterFormField(
          label: 'Email',
          controller: _emailController,
          focusNode: _emailFocus,
          errorText: _conflictMessageFor(RegistrationConflictField.email),
          keyboardType: TextInputType.emailAddress,
          textInputAction: TextInputAction.next,
          readOnly: _isSocialSignUp,
          onChanged: (_) =>
              setState(() => _clearConflict(RegistrationConflictField.email)),
        ),
        if (!_isSocialSignUp) ...[
          const SizedBox(height: 14),
          RegisterFormField(
            label: 'Password',
            controller: _passwordController,
            obscureText: _obscurePassword,
            textInputAction: TextInputAction.next,
            onChanged: (_) => setState(() {}),
            suffixIcon: IconButton(
              icon: Icon(
                _obscurePassword
                    ? Icons.visibility_outlined
                    : Icons.visibility_off_outlined,
              ),
              onPressed: () =>
                  setState(() => _obscurePassword = !_obscurePassword),
            ),
          ),
          const SizedBox(height: 10),
          PasswordStrengthIndicator(password: password),
          const SizedBox(height: 10),
          // Only the rules still outstanding; the row collapses once they are all met.
          PasswordRuleChips(password: password),
          const SizedBox(height: 14),
          RegisterFormField(
            label: 'Confirm Password',
            controller: _confirmPasswordController,
            obscureText: _obscureConfirmPassword,
            textInputAction: TextInputAction.done,
            onChanged: (_) => setState(() {}),
            onSubmitted: (_) => _submit(),
            suffixIcon: IconButton(
              icon: Icon(
                _obscureConfirmPassword
                    ? Icons.visibility_outlined
                    : Icons.visibility_off_outlined,
              ),
              onPressed: () => setState(
                () => _obscureConfirmPassword = !_obscureConfirmPassword,
              ),
            ),
          ),
          if (confirm.isNotEmpty) ...[
            const SizedBox(height: 8),
            Row(
              children: [
                Icon(
                  _passwordsMatch
                      ? Icons.check_circle_rounded
                      : Icons.error_outline_rounded,
                  size: 16,
                  color: _passwordsMatch
                      ? AppColors.secondary
                      : AppColors.heart,
                ),
                const SizedBox(width: 6),
                Text(
                  _passwordsMatch
                      ? 'Passwords match'
                      : 'Passwords do not match',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: _passwordsMatch
                        ? AppColors.secondary
                        : AppColors.heart,
                  ),
                ),
              ],
            ),
          ],
        ],
      ],
    );
  }

  Widget _termsRow() {
    return TermsAgreementCheckbox(
      audience: CaresTermsAudience.donor,
      accepted: _acceptedTerms,
      onChanged: (value) => setState(() => _acceptedTerms = value),
    );
  }

  Widget _bottomBar() {
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
      decoration: BoxDecoration(
        color: AppColors.background,
        border: Border(top: BorderSide(color: AppColors.borderLight)),
      ),
      child: SizedBox(
        width: double.infinity,
        height: 54,
        child: ElevatedButton(
          onPressed: _canSubmit ? _submit : null,
          child: _submitting
              ? const SizedBox(
                  width: 22,
                  height: 22,
                  child: CircularProgressIndicator(
                    strokeWidth: 2.4,
                    color: Colors.white,
                  ),
                )
              : Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      _isSocialSignUp
                          ? 'Continue as ${_linkedAccount!.firstName}'
                          : 'Create donor account',
                      style: const TextStyle(
                        fontSize: 15.5,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(width: 8),
                    const Icon(Icons.arrow_forward_rounded, size: 18),
                  ],
                ),
        ),
      ),
    );
  }
}

/// Gradient intro panel at the top of the donor sign-up form.
class _DonorHeroPanel extends StatelessWidget {
  const _DonorHeroPanel();

  static const _perks = [
    (Icons.volunteer_activism_outlined, 'Back campaigns you care about'),
    (Icons.insights_outlined, 'Track the impact of every peso'),
    (Icons.receipt_long_outlined, 'Keep your donation receipts'),
  ];

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 22, 20, 20),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            AppColors.primaryDark,
            AppColors.primary,
            AppColors.secondary,
          ],
        ),
        boxShadow: const [
          BoxShadow(
            color: Color(0x331F5F28),
            blurRadius: 20,
            offset: Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 46,
                height: 46,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.18),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.favorite_rounded,
                  color: Colors.white,
                  size: 24,
                ),
              ),
              const SizedBox(width: 14),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Become a CARES donor',
                      style: TextStyle(
                        fontSize: 19,
                        fontWeight: FontWeight.w800,
                        color: Colors.white,
                        height: 1.2,
                      ),
                    ),
                    SizedBox(height: 4),
                    Text(
                      'Takes about a minute to set up.',
                      style: TextStyle(fontSize: 13, color: Color(0xFFE3F2E4)),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 18),
          for (final perk in _perks) ...[
            Row(
              children: [
                Icon(
                  perk.$1,
                  size: 17,
                  color: Colors.white.withValues(alpha: 0.9),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    perk.$2,
                    style: const TextStyle(
                      fontSize: 13,
                      height: 1.35,
                      color: Color(0xFFEAF5E9),
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ],
            ),
            if (perk != _perks.last) const SizedBox(height: 10),
          ],
        ],
      ),
    );
  }
}

/// Shown once a provider has verified the donor and the server confirmed they are new.
class _LinkedAccountCard extends StatelessWidget {
  const _LinkedAccountCard({required this.account, required this.onUnlink});

  final DonorOAuthProfile account;
  final VoidCallback onUnlink;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: AppDecorations.surfaceCard().copyWith(
        border: Border.all(color: AppColors.secondary, width: 1.4),
      ),
      child: Column(
        children: [
          Row(
            children: [
              Container(
                width: 44,
                height: 44,
                alignment: Alignment.center,
                clipBehavior: Clip.antiAlias,
                decoration: const BoxDecoration(
                  color: AppColors.accentLight,
                  shape: BoxShape.circle,
                ),
                child: account.avatarUrl == null
                    ? Text(
                        account.initials,
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w800,
                          color: AppColors.primaryDark,
                        ),
                      )
                    : Image.network(
                        account.avatarUrl!,
                        width: 44,
                        height: 44,
                        fit: BoxFit.cover,
                        // A provider avatar is decoration — falling back to initials
                        // beats an error box if the CDN is unreachable.
                        errorBuilder: (_, _, _) => Text(
                          account.initials,
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w800,
                            color: AppColors.primaryDark,
                          ),
                        ),
                      ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      account.fullName,
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      account.email,
                      style: TextStyle(
                        fontSize: 12.5,
                        color: AppColors.secondary.withValues(alpha: 0.95),
                      ),
                    ),
                  ],
                ),
              ),
              account.provider == SocialAuthProvider.google
                  ? const GoogleGlyph(size: 22)
                  : const FacebookGlyph(size: 22),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              const Icon(
                Icons.check_circle_rounded,
                size: 16,
                color: AppColors.secondary,
              ),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  'Verified with ${account.provider.label}',
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: AppColors.secondary,
                  ),
                ),
              ),
              TextButton(
                onPressed: onUnlink,
                child: const Text(
                  'Use another way',
                  style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/// White card grouping one set of related fields.
class _FormCard extends StatelessWidget {
  const _FormCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.children,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: AppDecorations.surfaceCard(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Container(
                width: 34,
                height: 34,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: AppColors.accentLight.withValues(alpha: 0.6),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, size: 18, color: AppColors.primaryDark),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w800,
                        color: AppColors.primaryDark,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      subtitle,
                      style: TextStyle(
                        fontSize: 12.5,
                        height: 1.35,
                        color: AppColors.secondary.withValues(alpha: 0.9),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          ...children,
        ],
      ),
    );
  }
}
