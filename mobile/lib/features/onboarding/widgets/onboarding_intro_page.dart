import 'package:flutter/material.dart';
import 'onboarding_hero_image.dart';
import 'onboarding_headline.dart';

class OnboardingIntroPageData {
  const OnboardingIntroPageData({
    required this.headline,
    required this.description,
    required this.illustrationType,
  });

  final String headline;
  final String description;
  final OnboardingIllustrationType illustrationType;
}

class OnboardingIntroPage extends StatelessWidget {
  const OnboardingIntroPage({
    super.key,
    required this.data,
  });

  final OnboardingIntroPageData data;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(24, 8, 24, 16),
      child: Column(
        children: [
          OnboardingHeroImage(type: data.illustrationType),
          const SizedBox(height: 32),
          OnboardingHeadline(text: data.headline),
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

const List<OnboardingIntroPageData> kOnboardingIntroPages = [
  OnboardingIntroPageData(
    headline: 'Every donation changes a life.',
    description:
        'Join thousands of donors making a real difference in communities that need it most.',
    illustrationType: OnboardingIllustrationType.impact,
  ),
  OnboardingIntroPageData(
    headline: 'See where your generosity goes.',
    description:
        'Full transparency—follow your donation from your hands to those who need it.',
    illustrationType: OnboardingIllustrationType.transparency,
  ),
  OnboardingIntroPageData(
    headline: 'Together we lift each other up.',
    description:
        'Connect with drives, campaigns, and causes that align with your values.',
    illustrationType: OnboardingIllustrationType.community,
  ),
];
