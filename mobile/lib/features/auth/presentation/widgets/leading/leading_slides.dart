import 'package:flutter/widgets.dart';
import 'package:mobile/core/constants/app_assets.dart';
import 'package:mobile/core/constants/app_copy.dart';

/// Includes where the subject sits so portrait crops keep them in frame.
class LeadingSlide {
  const LeadingSlide({
    required this.copy,
    required this.asset,
    this.focal = Alignment.center,
  });

  final LeadingSlideCopy copy;
  final String asset;
  final Alignment focal;
}

final List<LeadingSlide> leadingSlides = [
  LeadingSlide(
    copy: AppCopy.leadingSlides[0],
    asset: AppAssets.leadingSunriseCleanup,
    focal: const Alignment(-0.1, -0.2),
  ),
  LeadingSlide(
    copy: AppCopy.leadingSlides[1],
    asset: AppAssets.leadingCleanUpDay,
    focal: const Alignment(0.12, -0.3),
  ),
  LeadingSlide(
    copy: AppCopy.leadingSlides[2],
    asset: AppAssets.leadingCampusOutreach,
    focal: const Alignment(0.2, 0),
  ),
  LeadingSlide(
    copy: AppCopy.leadingSlides[3],
    asset: AppAssets.leadingChristmasGiving,
    focal: const Alignment(-0.1, 0),
  ),
  LeadingSlide(
    copy: AppCopy.leadingSlides[4],
    asset: AppAssets.leadingChristmasTeam,
    focal: const Alignment(0.06, -0.2),
  ),
];

/// ~1450px, 2–3 MB masters decoded at screen height (plus zoom headroom). Use
/// it everywhere so precache and paint share a key.
ImageProvider leadingImage(BuildContext context, String asset) {
  final media = MediaQuery.of(context);
  final height = (media.size.height * media.devicePixelRatio * 1.15).round();
  return ResizeImage(AssetImage(asset), height: height);
}

/// Call during the splash so the first crossfade never waits on a decode.
void precacheLeadingSlides(BuildContext context) {
  for (final slide in leadingSlides) {
    precacheImage(leadingImage(context, slide.asset), context);
  }
}
