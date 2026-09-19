class CaresDonation {
  const CaresDonation({
    required this.id,
    required this.title,
    required this.organization,
    required this.category,
    required this.tags,
    required this.description,
    required this.goalAmount,
    required this.raisedAmount,
    required this.daysLeft,
    required this.deadline,
    this.isFeatured = false,
    this.eventId,
    this.eventDateLabel,
    this.location,
    this.acceptsMonetary = true,
    this.acceptsGoods = true,
    this.neededGoods = const [],
  });

  final String id;
  final String title;
  final String organization;
  final String category;
  final List<String> tags;
  final String description;
  final double goalAmount;
  final double raisedAmount;
  final int daysLeft;
  final DateTime deadline;
  final bool isFeatured;

  /// The director-created event this campaign came from, when the campaign is
  /// an event with "Accepted Donations" enabled.
  final String? eventId;
  final String? eventDateLabel;
  final String? location;

  /// Which donation types the director enabled on the event. A donor can only
  /// give in the ways the event accepts — never join it as a volunteer.
  final bool acceptsMonetary;
  final bool acceptsGoods;

  /// Items the event asks for, shown in the goods flow.
  final List<NeededGood> neededGoods;

  bool get isEventCampaign => eventId != null;

  /// Goods-only events have no peso target, so funding progress is meaningless
  /// for them.
  bool get hasFundingGoal => acceptsMonetary && goalAmount > 0;

  /// What the event will take, for cards and detail headers.
  String get acceptedDonationsLabel {
    if (acceptsMonetary && acceptsGoods) return 'Money & goods';
    if (acceptsMonetary) return 'Money';
    if (acceptsGoods) return 'Goods';
    return 'None';
  }

  String get fundingSummaryLabel =>
      acceptsMonetary ? '$raisedLabel raised' : 'Accepts goods donations';

  String get compactFundingLabel =>
      acceptsMonetary ? '$raisedLabel raised' : 'Goods';

  double get progress => goalAmount == 0 ? 0 : raisedAmount / goalAmount;

  String get progressPercentLabel => '${(progress * 100).round()}%';

  String get raisedLabel => _formatPeso(raisedAmount);

  String get goalLabel => _formatPeso(goalAmount);

  String get countdownLeftLabel => '${daysLeft}d left';

  String get countdownLabel => '${daysLeft}d';

  String get monthLabel {
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    return months[deadline.month - 1];
  }

  String get dayLabel => deadline.day.toString();

  String get formattedDeadline =>
      '${deadline.month}/${deadline.day}/${deadline.year}';

  bool matchesCategory(String category) {
    if (category == 'All') return true;
    return this.category == category;
  }

  bool matchesQuery(String query) {
    if (query.trim().isEmpty) return true;
    final q = query.trim().toLowerCase();
    return title.toLowerCase().contains(q) ||
        organization.toLowerCase().contains(q) ||
        category.toLowerCase().contains(q) ||
        tags.any((tag) => tag.toLowerCase().contains(q));
  }

  static String _formatPeso(double amount) {
    if (amount >= 1000) {
      final thousands = amount / 1000;
      return '₱${thousands.toStringAsFixed(thousands >= 10 ? 0 : 1)}k';
    }
    return '₱${amount.toStringAsFixed(0)}';
  }
}

const kDonationFilterCategories = ['All', 'Environment', 'Education', 'Health'];

/// An item a campaign currently needs, shown in the goods donation flow.
class NeededGood {
  const NeededGood({required this.name});

  final String name;
}

/// An event created by a Director.
///
/// The "Accepted Donations" panel on the director's event form drives
/// [acceptsMonetary] / [acceptsGoods]. Only events that accept at least one
/// kind of donation are surfaced to donors as campaigns — see [kDonorCampaigns].
/// Everything here is static mock data.
class DirectorEvent {
  const DirectorEvent({
    required this.id,
    required this.title,
    required this.organizer,
    required this.category,
    required this.tags,
    required this.description,
    required this.eventDate,
    required this.location,
    this.acceptsMonetary = false,
    this.acceptsGoods = false,
    this.goodsNeeded = const [],
    this.fundGoal = 0,
    this.fundRaised = 0,
    this.isFeatured = false,
  });

  final String id;
  final String title;
  final String organizer;
  final String category;
  final List<String> tags;
  final String description;
  final DateTime eventDate;
  final String location;

  /// "Accepted Donations" toggles set by the director.
  final bool acceptsMonetary;
  final bool acceptsGoods;

  /// Goods types the director ticked when [acceptsGoods] is on.
  final List<String> goodsNeeded;

  final double fundGoal;
  final double fundRaised;
  final bool isFeatured;

  /// An event is only a donor campaign when the director enabled at least one
  /// accepted donation type.
  bool get acceptsDonations => acceptsMonetary || acceptsGoods;

  int get daysLeft {
    final now = DateTime.now();
    final days = eventDate
        .difference(DateTime(now.year, now.month, now.day))
        .inDays;
    return days < 0 ? 0 : days;
  }

  /// The donor-facing campaign view of this event.
  CaresDonation toCampaign() => CaresDonation(
    id: id,
    title: title,
    organization: organizer,
    category: category,
    tags: tags,
    description: description,
    goalAmount: fundGoal,
    raisedAmount: fundRaised,
    daysLeft: daysLeft,
    deadline: eventDate,
    isFeatured: isFeatured,
    eventId: id,
    eventDateLabel: _formatEventDate(eventDate),
    location: location,
    acceptsMonetary: acceptsMonetary,
    acceptsGoods: acceptsGoods,
    neededGoods: [for (final name in goodsNeeded) NeededGood(name: name)],
  );

  static String _formatEventDate(DateTime date) {
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    return '${months[date.month - 1]} ${date.day}, ${date.year}';
  }
}

/// Mock events as a Director would have created them. Some accept donations,
/// some are volunteer-only — the volunteer-only ones must never show up in the
/// donor Campaign module.
final kMockDirectorEvents = <DirectorEvent>[
  DirectorEvent(
    id: 'evt-flood-relief',
    title: 'Flood Relief Operation',
    organizer: 'CARES Disaster Response',
    category: 'Health',
    tags: ['relief', 'disaster', 'families'],
    description:
        'Provide emergency food packs, clean water, hygiene kits, and temporary '
        'shelter for families displaced by the recent flooding in low-lying '
        'barangays.',
    eventDate: DateTime(2026, 10, 12),
    location: 'Barangay Tipolo Covered Court',
    acceptsMonetary: true,
    acceptsGoods: true,
    goodsNeeded: ['Rice', 'Bottled Water', 'Blankets', 'Hygiene Kits'],
    fundGoal: 200000,
    fundRaised: 84500,
    isFeatured: true,
  ),
  DirectorEvent(
    id: 'evt-medical-mission',
    title: 'Community Medical Mission',
    organizer: 'CARES Health Team',
    category: 'Health',
    tags: ['health', 'medical'],
    description:
        'Support medical missions, health kits, and wellness programs for '
        'underserved communities in Cebu.',
    eventDate: DateTime(2026, 10, 24),
    location: 'Cebu City Health Center',
    acceptsMonetary: true,
    acceptsGoods: true,
    goodsNeeded: ['Medicine', 'Hygiene Kits', 'Vitamins'],
    fundGoal: 50000,
    fundRaised: 32400,
    isFeatured: true,
  ),
  DirectorEvent(
    id: 'evt-school-supplies',
    title: 'School Supplies Drive',
    organizer: 'DepEd Volunteers',
    category: 'Education',
    tags: ['education', 'supplies'],
    description:
        'Help provide notebooks, pencils, and learning materials for students '
        'in partner schools.',
    eventDate: DateTime(2026, 11, 8),
    location: 'Mandaue Central Elementary School',
    acceptsGoods: true,
    goodsNeeded: ['School Supplies', 'Books', 'Bags'],
    isFeatured: true,
  ),
  DirectorEvent(
    id: 'evt-tree-planting-fund',
    title: 'Coastal Reforestation Drive',
    organizer: 'CARES Environment Team',
    category: 'Environment',
    tags: ['environment', 'trees'],
    description:
        'Fund native tree seedlings and maintenance for coastal reforestation '
        'sites.',
    eventDate: DateTime(2026, 10, 3),
    location: 'Cordova Coastal Greenbelt',
    acceptsMonetary: true,
    fundGoal: 15000,
    fundRaised: 9200,
  ),
  DirectorEvent(
    id: 'evt-community-pantry',
    title: 'Community Pantry Day',
    organizer: 'CARES Outreach',
    category: 'Health',
    tags: ['food', 'community'],
    description:
        'Provide rice, canned goods, and hygiene kits for families in need.',
    eventDate: DateTime(2026, 10, 18),
    location: 'Barangay Guadalupe Plaza',
    acceptsMonetary: true,
    acceptsGoods: true,
    goodsNeeded: ['Rice', 'Canned Goods', 'Hygiene Kits'],
    fundGoal: 30000,
    fundRaised: 21500,
  ),
  DirectorEvent(
    id: 'evt-scholarship-fund',
    title: 'Scholarship Assistance Fund',
    organizer: 'College of Education',
    category: 'Education',
    tags: ['scholarship', 'students'],
    description:
        'Support student volunteers and beneficiaries with school fees and '
        'materials.',
    eventDate: DateTime(2026, 11, 20),
    location: 'UCLM Extension Hall',
    acceptsMonetary: true,
    fundGoal: 40000,
    fundRaised: 12800,
  ),
  // ---- Goods-only: the director enabled "Goods & Supplies" alone. ----
  DirectorEvent(
    id: 'evt-relief-goods-drive',
    title: 'Typhoon Relief Goods Drive',
    organizer: 'CARES Disaster Response',
    category: 'Health',
    tags: ['relief', 'goods', 'families'],
    description:
        'Collect canned goods, blankets, and hygiene kits for families in '
        'evacuation centers after the storm. This drive accepts donated items '
        'only — no cash is collected.',
    eventDate: DateTime(2026, 10, 28),
    location: 'Barangay Basak Evacuation Center',
    acceptsGoods: true,
    goodsNeeded: ['Canned Goods', 'Blankets', 'Hygiene Kits', 'Bottled Water'],
  ),
  // ---- Money-only: the director enabled "Monetary Donations" alone. ----
  DirectorEvent(
    id: 'evt-medicine-fund',
    title: 'Emergency Medicine Fund',
    organizer: 'CARES Health Team',
    category: 'Health',
    tags: ['health', 'medicine', 'fund'],
    description:
        'Raise funds to stock emergency medicine and laboratory supplies for '
        'partner barangay health stations. This campaign accepts monetary '
        'donations only.',
    eventDate: DateTime(2026, 11, 14),
    location: 'Cebu City Health Center',
    acceptsMonetary: true,
    fundGoal: 60000,
    fundRaised: 18400,
  ),
  // ---- Volunteer-only events: no accepted donations, so no campaign. ----
  DirectorEvent(
    id: 'evt-clean-up-drive',
    title: 'Community Clean-Up Drive',
    organizer: 'CARES Environment Team',
    category: 'Environment',
    tags: ['environment', 'cleanup'],
    description:
        'Join neighbors for a park-wide cleanup. Gloves and bags provided.',
    eventDate: DateTime(2026, 10, 9),
    location: 'Central Park, Main Street',
  ),
  DirectorEvent(
    id: 'evt-youth-mentorship',
    title: 'Youth Mentorship Program',
    organizer: 'CARES Education Team',
    category: 'Education',
    tags: ['education', 'mentorship'],
    description: 'Guide students through career exploration workshops.',
    eventDate: DateTime(2026, 11, 2),
    location: 'Community Learning Center',
  ),
];

/// Every event the Director opened for donations, as donor campaigns. Events
/// without "Accepted Donations" are filtered out here and never reach the
/// donor Campaign module.
final kDonorCampaigns = [
  for (final event in kMockDirectorEvents)
    if (event.acceptsDonations) event.toCampaign(),
];

final kMockFeaturedDonations = [
  for (final campaign in kDonorCampaigns)
    if (campaign.isFeatured) campaign,
];

final kMockDonationCampaigns = [
  for (final campaign in kDonorCampaigns)
    if (!campaign.isFeatured) campaign,
];

final kMockAllDonations = kDonorCampaigns;

const _defaultNeededGoods = [
  NeededGood(name: 'Rice'),
  NeededGood(name: 'Canned Goods'),
  NeededGood(name: 'School Supplies'),
  NeededGood(name: 'Blankets'),
];

/// The goods a campaign's event asks for, falling back to a generic list when
/// the director ticked no specific goods types.
List<NeededGood> neededGoodsForCampaign(String campaignId) {
  final campaign = findDonationById(campaignId);
  final needs = campaign?.neededGoods ?? const <NeededGood>[];
  return needs.isEmpty ? _defaultNeededGoods : needs;
}

CaresDonation? findDonationById(String id) {
  for (final donation in kMockAllDonations) {
    if (donation.id == id) return donation;
  }
  return null;
}

List<String> donationSearchSuggestionsFor(String query) {
  if (query.trim().isEmpty) return const [];
  final q = query.trim().toLowerCase();
  final suggestions = <String>{};

  for (final donation in kMockAllDonations) {
    if (donation.title.toLowerCase().contains(q)) {
      suggestions.add(donation.title);
    }
    if (donation.organization.toLowerCase().contains(q)) {
      suggestions.add(donation.organization);
    }
    for (final tag in donation.tags) {
      if (tag.toLowerCase().contains(q)) suggestions.add(tag);
    }
    if (donation.category.toLowerCase().contains(q)) {
      suggestions.add(donation.category);
    }
  }

  return suggestions.take(5).toList();
}
