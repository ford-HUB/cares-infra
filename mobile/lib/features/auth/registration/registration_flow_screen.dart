import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/cares_logo.dart';
import '../login_screen.dart';
import 'models/registration_data.dart';
import 'steps/account_type_step.dart';
import 'steps/identity_verification_step.dart';
import 'steps/registration_form_step.dart';
import 'steps/submission_review_step.dart';
import 'steps/user_role_step.dart';
import 'widgets/registration_progress_header.dart';
import 'widgets/registration_step_actions.dart';

class RegistrationFlowScreen extends StatefulWidget {
  const RegistrationFlowScreen({super.key});

  @override
  State<RegistrationFlowScreen> createState() => _RegistrationFlowScreenState();
}

class _RegistrationFlowScreenState extends State<RegistrationFlowScreen> {
  static const int _totalSteps = 5;

  final RegistrationData _data = RegistrationData();
  final GlobalKey<FormState> _formKey = GlobalKey<FormState>();

  RegistrationFlowStep _currentStep = RegistrationFlowStep.accountType;
  bool _isSubmitting = false;

  int get _stepNumber => switch (_currentStep) {
        RegistrationFlowStep.accountType => 1,
        RegistrationFlowStep.userRole => 2,
        RegistrationFlowStep.registrationForm => 3,
        RegistrationFlowStep.identityVerification => 4,
        RegistrationFlowStep.submission => 5,
      };

  String get _stepTitle => switch (_currentStep) {
        RegistrationFlowStep.accountType => 'Choose Your Account Type',
        RegistrationFlowStep.userRole => 'Select Your Role',
        RegistrationFlowStep.registrationForm => 'Registration Form',
        RegistrationFlowStep.identityVerification => 'Verify Your Identity',
        RegistrationFlowStep.submission => 'Review & Submit',
      };

  bool get _canContinue => switch (_currentStep) {
        RegistrationFlowStep.accountType => _data.accountType != null,
        RegistrationFlowStep.userRole => _data.userRole != null,
        RegistrationFlowStep.registrationForm => true,
        RegistrationFlowStep.identityVerification =>
          _data.schoolIdImagePath != null && _data.selfieImagePath != null,
        RegistrationFlowStep.submission => true,
      };

  void _goBack() {
    switch (_currentStep) {
      case RegistrationFlowStep.accountType:
        Navigator.of(context).pop();
      case RegistrationFlowStep.userRole:
        setState(() => _currentStep = RegistrationFlowStep.accountType);
      case RegistrationFlowStep.registrationForm:
        setState(() {
          _currentStep = _data.isRegularUser
              ? RegistrationFlowStep.userRole
              : RegistrationFlowStep.accountType;
        });
      case RegistrationFlowStep.identityVerification:
        setState(() => _currentStep = RegistrationFlowStep.registrationForm);
      case RegistrationFlowStep.submission:
        setState(() => _currentStep = RegistrationFlowStep.identityVerification);
    }
  }

  void _goNext() {
    switch (_currentStep) {
      case RegistrationFlowStep.accountType:
        setState(() {
          _currentStep = _data.isRegularUser
              ? RegistrationFlowStep.userRole
              : RegistrationFlowStep.registrationForm;
        });
      case RegistrationFlowStep.userRole:
        setState(() => _currentStep = RegistrationFlowStep.registrationForm);
      case RegistrationFlowStep.registrationForm:
        if (_formKey.currentState?.validate() ?? false) {
          setState(() => _currentStep = RegistrationFlowStep.identityVerification);
        }
      case RegistrationFlowStep.identityVerification:
        setState(() => _currentStep = RegistrationFlowStep.submission);
      case RegistrationFlowStep.submission:
        _submitRegistration();
    }
  }

  Future<void> _submitRegistration() async {
    setState(() => _isSubmitting = true);

    // TODO: persist registration data and upload verification images securely.
    await Future<void>.delayed(const Duration(milliseconds: 1500));

    if (!mounted) return;

    setState(() => _isSubmitting = false);

    await showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            Icon(Icons.check_circle_rounded, color: AppColors.accent),
            SizedBox(width: 8),
            Text('Registration Submitted'),
          ],
        ),
        content: const Text(
          'Your registration has been submitted successfully. '
          'You can now sign in once your account is reviewed.',
        ),
        actions: [
          FilledButton(
            onPressed: () {
              Navigator.of(context).pop();
              Navigator.of(context).pushAndRemoveUntil(
                MaterialPageRoute<void>(builder: (_) => const LoginScreen()),
                (_) => false,
              );
            },
            child: const Text('Go to Login'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
              child: Row(
                children: [
                  const CaresLogo(size: 40),
                  const Spacer(),
                  if (_currentStep != RegistrationFlowStep.accountType)
                    TextButton(
                      onPressed: _goBack,
                      child: const Text(
                        'Back',
                        style: TextStyle(color: AppColors.textSecondary),
                      ),
                    ),
                ],
              ),
            ),
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(24, 16, 24, 24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    RegistrationProgressHeader(
                      currentStep: _stepNumber,
                      totalSteps: _totalSteps,
                      title: _stepTitle,
                    ),
                    const SizedBox(height: 24),
                    AnimatedSwitcher(
                      duration: const Duration(milliseconds: 300),
                      switchInCurve: Curves.easeOutCubic,
                      switchOutCurve: Curves.easeInCubic,
                      child: KeyedSubtree(
                        key: ValueKey(_currentStep),
                        child: _buildStepContent(),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
              child: RegistrationStepActions(
                showBack: _currentStep != RegistrationFlowStep.accountType,
                onBack: _goBack,
                onContinue: _goNext,
                continueEnabled: _canContinue,
                continueLabel: _currentStep == RegistrationFlowStep.submission
                    ? 'Submit Registration'
                    : 'Continue',
                isLoading: _isSubmitting,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStepContent() {
    return switch (_currentStep) {
      RegistrationFlowStep.accountType => AccountTypeStep(
          selectedType: _data.accountType,
          onTypeSelected: (type) => setState(() => _data.accountType = type),
        ),
      RegistrationFlowStep.userRole => UserRoleStep(
          selectedRole: _data.userRole,
          onRoleSelected: (role) => setState(() => _data.userRole = role),
        ),
      RegistrationFlowStep.registrationForm => RegistrationFormStep(
          data: _data,
          formKey: _formKey,
        ),
      RegistrationFlowStep.identityVerification => IdentityVerificationStep(
          data: _data,
          onChanged: () => setState(() {}),
        ),
      RegistrationFlowStep.submission => SubmissionReviewStep(data: _data),
    };
  }
}
