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
      kicker: 'Meet UCLM CARES',
      title: 'Hope begins with service.',
      body:
          'UCLM CARES brings students, faculty, staff, alumni, and communities together '
          'through meaningful extension programs that address social, economic, and environmental needs.',
    ),
    LeadingSlideCopy(
      kicker: 'Community Empowerment',
      title: 'Creating opportunities, changing lives.',
      body:
          'Through education, skills training, community outreach, and partnerships, '
          'CARES shares knowledge and resources to empower communities and create opportunities for growth.',
    ),
    LeadingSlideCopy(
      kicker: 'Environmental Stewardship',
      title: 'A cleaner future starts with us.',
      body:
          'From cleanup drives to environmental awareness activities, '
          'CARES brings volunteers and communities together to protect the environment and promote responsible practices.',
    ),
    LeadingSlideCopy(
      kicker: 'Compassion in Action',
      title: 'Small acts of kindness. Lasting impact.',
      body:
          'Through outreach and community service, CARES encourages compassion, strengthens partnerships, '
          'and supports the welfare of communities through meaningful acts of service.',
    ),
    LeadingSlideCopy(
      kicker: 'Be part of UCLM CARES',
      title: 'Give hope. Transform lives.',
      body:
          'Be part of a community that creates meaningful change. Join CARES activities, '
          'work alongside fellow volunteers, and help build stronger, more empowered communities. $slogan',
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
