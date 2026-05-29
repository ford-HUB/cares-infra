import 'package:flutter/material.dart';
import 'onboarding_illustration.dart';

class OnboardingPageData {
  const OnboardingPageData({
    required this.title,
    required this.description,
    required this.illustrationType,
  });

  final String title;
  final String description;
  final OnboardingIllustrationType illustrationType;
}

class OnboardingPageContent extends StatelessWidget {
  const OnboardingPageContent({
    super.key,
    required this.data,
  });

  final OnboardingPageData data;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 28),
      child: Column(
        children: [
          const SizedBox(height: 16),
          OnboardingIllustration(type: data.illustrationType),
          const SizedBox(height: 40),
          Text(
            data.title,
            style: Theme.of(context).textTheme.headlineLarge,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 16),
          Text(
            data.description,
            style: Theme.of(context).textTheme.bodyLarge,
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}

const List<OnboardingPageData> kOnboardingPages = [
  OnboardingPageData(
    title: 'Welcome to CARES',
    description:
        'Community Awareness, Relations & Extension Services — helping communities through donations, outreach, and care.',
    illustrationType: OnboardingIllustrationType.welcome,
  ),
  OnboardingPageData(
    title: 'Discover Donation Drives',
    description:
        'Browse active drives and causes near you — from food banks to school supplies and emergency relief.',
    illustrationType: OnboardingIllustrationType.discover,
  ),
  OnboardingPageData(
    title: 'Make an Impact',
    description:
        'Democratize, lead, and transform. Donate, volunteer, or share a drive — and strengthen your community.',
    illustrationType: OnboardingIllustrationType.impact,
  ),
];
