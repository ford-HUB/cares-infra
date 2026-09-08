import 'package:flutter/material.dart';
import 'package:mobile/core/session/donor_session.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/auth/data/mock_social_accounts.dart';
import 'package:mobile/features/auth/presentation/widgets/register_form_field.dart';
import 'package:mobile/features/auth/presentation/widgets/social_auth_buttons.dart';
import 'package:mobile/features/auth/registration/widgets/password_strength_indicator.dart';
import 'package:mobile/features/dashboard/presentation/screens/donor_dashboard_screen.dart';

/// Local-only donor registration — no backend, API, or auth integration yet.
/// Google / Facebook sign-up is presentation only and uses mock accounts.
class RegisterDonorScreen extends StatefulWidget {
  const RegisterDonorScreen({super.key});

  @override
  State<RegisterDonorScreen> createState() => _RegisterDonorScreenState();
}

class _RegisterDonorScreenState extends State<RegisterDonorScreen> {
  final _firstNameController = TextEditingController();
  final _middleNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();

  bool _obscurePassword = true;
  bool _obscureConfirmPassword = true;
  bool _acceptedTerms = false;
  MockSocialAccount? _linkedAccount;

  bool get _isSocialSignUp => _linkedAccount != null;

  bool get _passwordsMatch =>
      _confirmPasswordController.text == _passwordController.text;

  bool get _canSubmit {
    final baseDetailsFilled =
        _firstNameController.text.trim().isNotEmpty &&
        _lastNameController.text.trim().isNotEmpty &&
        _emailController.text.trim().contains('@') &&
        _acceptedTerms;

    if (!baseDetailsFilled) return false;
    if (_isSocialSignUp) return true;

    return _passwordController.text.length >= 8 && _passwordsMatch;
  }

  @override
  void dispose() {
    _firstNameController.dispose();
    _middleNameController.dispose();
    _lastNameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  void _showMessage(String message) {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(content: Text(message), behavior: SnackBarBehavior.floating),
      );
  }

  /// Fills the form from a local fixture — no OAuth call, no server call.
  void _linkSocialAccount(SocialAuthProvider provider) {
    final account = mockSocialAccounts[provider];
    if (account == null) return;

    setState(() {
      _linkedAccount = account;
      _firstNameController.text = account.firstName;
      _middleNameController.text = account.middleName;
      _lastNameController.text = account.lastName;
      _emailController.text = account.email;
      _passwordController.clear();
      _confirmPasswordController.clear();
    });

    FocusManager.instance.primaryFocus?.unfocus();
    _showMessage(
      '${provider.label} account linked (sample data — not connected yet).',
    );
  }

  void _unlinkSocialAccount() {
    setState(() {
      _linkedAccount = null;
      _firstNameController.clear();
      _middleNameController.clear();
      _lastNameController.clear();
      _emailController.clear();
    });
  }

  void _submit() {
    if (!_canSubmit) return;

    final donor = DonorSessionUser(
      firstName: _firstNameController.text.trim(),
      middleName: _middleNameController.text.trim(),
      lastName: _lastNameController.text.trim(),
      email: _emailController.text.trim(),
      password: _isSocialSignUp
          ? 'social:${_linkedAccount!.provider.name}'
          : _passwordController.text,
    );

    DonorSession.instance.register(donor);

    Navigator.of(context).pushAndRemoveUntil(
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

  Widget _accountSection() {
    final password = _passwordController.text;
    final confirm = _confirmPasswordController.text;

    return _FormCard(
      icon: Icons.lock_outline_rounded,
      title: 'Sign-in details',
      subtitle: _isSocialSignUp
          ? 'Managed by ${_linkedAccount!.provider.label} — no password needed.'
          : 'Used every time you sign in to CARES.',
      children: [
        RegisterFormField(
          label: 'Email',
          controller: _emailController,
          keyboardType: TextInputType.emailAddress,
          textInputAction: TextInputAction.next,
          readOnly: _isSocialSignUp,
          onChanged: (_) => setState(() {}),
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
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _RuleChip(
                label: '8+ characters',
                met: password.length >= 8,
              ),
              _RuleChip(
                label: 'Upper & lower case',
                met:
                    RegExp(r'[A-Z]').hasMatch(password) &&
                    RegExp(r'[a-z]').hasMatch(password),
              ),
              _RuleChip(
                label: 'A number',
                met: RegExp(r'[0-9]').hasMatch(password),
              ),
            ],
          ),
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
                  color: _passwordsMatch ? AppColors.secondary : AppColors.heart,
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
    return InkWell(
      borderRadius: BorderRadius.circular(12),
      onTap: () => setState(() => _acceptedTerms = !_acceptedTerms),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SizedBox(
              width: 24,
              height: 24,
              child: Checkbox(
                value: _acceptedTerms,
                visualDensity: VisualDensity.compact,
                materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(6),
                ),
                onChanged: (value) =>
                    setState(() => _acceptedTerms = value ?? false),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                'I agree to the CARES donor terms and privacy notice.',
                style: TextStyle(
                  fontSize: 13,
                  height: 1.4,
                  color: AppColors.secondary.withValues(alpha: 0.95),
                ),
              ),
            ),
          ],
        ),
      ),
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
          child: Row(
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
          colors: [AppColors.primaryDark, AppColors.primary, AppColors.secondary],
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
                      style: TextStyle(
                        fontSize: 13,
                        color: Color(0xFFE3F2E4),
                      ),
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
                Icon(perk.$1, size: 17, color: Colors.white.withValues(alpha: 0.9)),
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

/// Shown once a donor "links" Google or Facebook (sample data only).
class _LinkedAccountCard extends StatelessWidget {
  const _LinkedAccountCard({required this.account, required this.onUnlink});

  final MockSocialAccount account;
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
                decoration: const BoxDecoration(
                  color: AppColors.accentLight,
                  shape: BoxShape.circle,
                ),
                child: Text(
                  account.initials,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w800,
                    color: AppColors.primaryDark,
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
                  'Linked with ${account.provider.label} · sample data',
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

/// Small pass/fail pill for password requirements.
class _RuleChip extends StatelessWidget {
  const _RuleChip({required this.label, required this.met});

  final String label;
  final bool met;

  @override
  Widget build(BuildContext context) {
    final color = met ? AppColors.secondary : AppColors.textMuted;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: met
            ? AppColors.accentLight.withValues(alpha: 0.45)
            : AppColors.background,
        borderRadius: BorderRadius.circular(AppColors.pillRadius),
        border: Border.all(color: met ? AppColors.light : AppColors.borderLight),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            met ? Icons.check_rounded : Icons.circle_outlined,
            size: 13,
            color: color,
          ),
          const SizedBox(width: 5),
          Text(
            label,
            style: TextStyle(
              fontSize: 11.5,
              fontWeight: FontWeight.w600,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}
