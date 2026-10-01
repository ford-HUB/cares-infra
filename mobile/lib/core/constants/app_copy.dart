/// Copy aligned with UCLM CARES (uclmcares.online guest portal & program materials).
abstract final class AppCopy {
  static const String appName = 'CARES';
  static const String fullName =
      'Community Awareness, Relations & Extension Services';
  static const String slogan = 'Democratize. Lead. Transform.';
  static const String ringMotto = 'DEMOCRATIZE · LEAD · TRANSFORM';
  static const String websiteUrl = 'https://uclmcares.online';
  static const String websiteLabel = 'uclmcares.online';

  static const String vision =
      'University of Cebu fosters a visible community extension program that gives hope and transforms lives.';
  static const String visionSnippet = vision;
  static const String mission =
      'Carry out integrated and sustainable extension programs responsive to social, economic, and environmental needs.';
  static const String guestTagline =
      'Empowering communities through awareness, building relationships, and providing meaningful extension services that create lasting positive impact.';

  static const String filmMascotName = 'CARES Buddy';
  static const String filmBeginCta = "Let's begin";
  static const String filmNextCta = 'Next';
  static const String filmBackCta = 'Back';

  /// Mascot-led board slides — mirrors the uclmcares.online guest overview.
  static const List<IntroSlide> filmSlides = [
    IntroSlide(
      boardTitle: 'Welcome',
      boardBody:
          'Hi! I\'m CARES Buddy. This app works with our official portal — visit uclmcares.online anytime for news, partners, and program details.',
      mascotAsset: 'assets/images/mascot/waving.png',
    ),
    IntroSlide(
      boardTitle: 'What is CARES?',
      boardBody:
          '$fullName — the University of Cebu community extension program. $guestTagline',
      mascotAsset: 'assets/images/mascot/smile.png',
    ),
    IntroSlide(
      boardTitle: 'Our Vision',
      boardBody: vision,
      mascotAsset: 'assets/images/mascot/happy.png',
    ),
    IntroSlide(
      boardTitle: 'Our Mission',
      boardBody: mission,
      mascotAsset: 'assets/images/mascot/smile.png',
    ),
    IntroSlide(
      boardTitle: 'Our Motto',
      boardBody:
          '$slogan\n\nWe democratize knowledge, lead with purpose, and transform communities through outreach.',
      mascotAsset: 'assets/images/mascot/happy.png',
    ),
    IntroSlide(
      boardTitle: 'What We Commit To',
      boardBody:
          '• Harmonious relations with partner communities\n'
          '• Research-based extension that enhances instruction\n'
          '• Shared resources across UC campuses and partners\n'
          '• Involving faculty, students, staff, and alumni in service',
      mascotAsset: 'assets/images/mascot/confuse.png',
    ),
    IntroSlide(
      boardTitle: 'Extension Programs',
      boardBody:
          'College-led outreach across UC — computer literacy (CLIP), health education (HELP), livelihood, environment, crime prevention, disaster readiness, and more.',
      mascotAsset: 'assets/images/mascot/smile.png',
    ),
    IntroSlide(
      boardTitle: 'Partners & Community',
      boardBody:
          'CARES works with trusted community partners and beneficiaries. Explore partners, testimonials, and impact stories on $websiteLabel.',
      mascotAsset: 'assets/images/mascot/waving.png',
    ),
    IntroSlide(
      boardTitle: 'This Mobile App',
      boardBody:
          'Register with your school details, verify your identity, and sign in to join activities, log volunteer hours, and follow your extension journey.',
      mascotAsset: 'assets/images/mascot/smile.png',
    ),
    IntroSlide(
      boardTitle: 'Ready to Start?',
      boardBody:
          'Tap below to sign in or create your account. For the full guest experience — programs, partners, and updates — open $websiteLabel.',
      mascotAsset: 'assets/images/mascot/happy.png',
    ),
  ];

  static const String leadingContinueCta = 'Continue';
  static const String leadingSkipCta = 'Skip';
  static const String leadingBackCta = 'Back';
  static const String leadingPullHint = 'Pull down for our story';

  /// Leading story told between the splash and login — one beat per photo in
  /// assets/images/leadings/, ordered from first light to the Christmas team.
  static const List<LeadingSlideCopy> leadingSlides = [
    LeadingSlideCopy(
      kicker: 'Meet CARES',
      title: 'It starts before sunrise.',
      body:
          '$fullName — the University of Cebu\'s community extension program, '
          'where students, faculty, and staff show up for the people around them.',
    ),
    LeadingSlideCopy(
      kicker: 'World Clean Up Day · Sept 20, 2025',
      title: 'Cleaner streets, one bag at a time.',
      body:
          'Volunteers from the College of Business and Accountancy joined the '
          'worldwide clean-up, clearing roadsides side by side with the community.',
    ),
    LeadingSlideCopy(
      kicker: 'Campus outreach',
      title: 'Caring starts close to home.',
      body:
          'From refreshment drives to school donations, CARES makes sure the '
          'people nearest to us are looked after too.',
    ),
    LeadingSlideCopy(
      kicker: 'Christmas Gift Giving · Dec 20, 2025',
      title: 'A Christmas they\'ll remember.',
      body:
          'Children from our partner communities filled the covered court in '
          'Santa hats and went home with gifts prepared by CARES volunteers.',
    ),
    LeadingSlideCopy(
      kicker: 'UCLM CARES',
      title: 'Now it\'s your turn.',
      body:
          'Every activity began with someone who chose to show up. Join events, '
          'log your hours, and grow with a community that gives back. $slogan',
    ),
  ];
}

/// One beat of the leading story: a short label, a headline, and a line of body.
class LeadingSlideCopy {
  const LeadingSlideCopy({
    required this.kicker,
    required this.title,
    required this.body,
  });

  final String kicker;
  final String title;
  final String body;
}

/// One beat on the welcome presentation board.
class IntroSlide {
  const IntroSlide({
    required this.boardTitle,
    required this.boardBody,
    required this.mascotAsset,
  });

  final String boardTitle;
  final String boardBody;
  final String mascotAsset;
}
