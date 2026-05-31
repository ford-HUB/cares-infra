import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import '../auth/login_screen.dart';
import 'widgets/onboarding_intro_page.dart';
import 'widgets/onboarding_landing_page.dart';
import 'widgets/onboarding_page_indicator.dart';

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final PageController _pageController = PageController();
  int _currentPage = 0;

  static const int _introPageCount = 3;
  static const int _pageCount = 4;
  static const int _landingPageIndex = 3;

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  bool get _isLandingPage => _currentPage == _landingPageIndex;
  bool get _isLastIntroPage => _currentPage == _introPageCount - 1;

  void _goToLogin() {
    Navigator.of(context).push(
      PageRouteBuilder<void>(
        pageBuilder: (context, animation, secondaryAnimation) =>
            const LoginScreen(),
        transitionsBuilder: (context, animation, secondaryAnimation, child) {
          return SlideTransition(
            position: Tween<Offset>(
              begin: const Offset(0, 0.06),
              end: Offset.zero,
            ).animate(
              CurvedAnimation(parent: animation, curve: Curves.easeOutCubic),
            ),
            child: FadeTransition(
              opacity: CurvedAnimation(
                parent: animation,
                curve: Curves.easeOut,
              ),
              child: child,
            ),
          );
        },
        transitionDuration: const Duration(milliseconds: 400),
      ),
    );
  }

  void _onPrimaryAction() {
    if (_isLandingPage) {
      _goToLogin();
      return;
    }

    _pageController.nextPage(
      duration: const Duration(milliseconds: 450),
      curve: Curves.easeInOutCubic,
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
              padding: const EdgeInsets.fromLTRB(8, 8, 16, 0),
              child: Align(
                alignment: Alignment.centerRight,
                child: AnimatedOpacity(
                  duration: const Duration(milliseconds: 250),
                  opacity: _isLandingPage ? 0 : 1,
                  child: IgnorePointer(
                    ignoring: _isLandingPage,
                    child: TextButton(
                      onPressed: _goToLogin,
                      child: const Text(
                        'Skip',
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w500,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
            Expanded(
              child: PageView.builder(
                controller: _pageController,
                itemCount: _pageCount,
                physics: const BouncingScrollPhysics(),
                onPageChanged: (index) => setState(() => _currentPage = index),
                itemBuilder: (context, index) {
                  if (index == _landingPageIndex) {
                    return const OnboardingLandingPage();
                  }
                  return OnboardingIntroPage(
                    data: kOnboardingIntroPages[index],
                  );
                },
              ),
            ),
            const SizedBox(height: 8),
            OnboardingPageIndicator(
              count: _pageCount,
              currentIndex: _currentPage,
            ),
            const SizedBox(height: 24),
            Padding(
              padding: const EdgeInsets.fromLTRB(28, 0, 28, 32),
              child: AnimatedSwitcher(
                duration: const Duration(milliseconds: 300),
                switchInCurve: Curves.easeOutCubic,
                switchOutCurve: Curves.easeInCubic,
                child: SizedBox(
                  key: ValueKey(_isLandingPage),
                  width: double.infinity,
                  child: FilledButton(
                    onPressed: _onPrimaryAction,
                    child: Text(
                      _isLandingPage
                          ? 'Get Started'
                          : _isLastIntroPage
                              ? 'Continue'
                              : 'Next',
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
