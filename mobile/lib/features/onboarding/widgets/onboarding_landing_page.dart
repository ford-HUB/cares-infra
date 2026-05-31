import 'package:flutter/material.dart';
import '../../../shared/widgets/app_branding_header.dart';

class OnboardingLandingPage extends StatelessWidget {
  const OnboardingLandingPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 32),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: const [
          AppBrandingHeader(logoSize: 180, logoShadow: true),
        ],
      ),
    );
  }
}
