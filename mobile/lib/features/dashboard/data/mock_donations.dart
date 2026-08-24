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

  double get progress => goalAmount == 0 ? 0 : raisedAmount / goalAmount;

  String get progressPercentLabel => '${(progress * 100).round()}%';

  String get raisedLabel => _formatPeso(raisedAmount);

  String get goalLabel => _formatPeso(goalAmount);

  String get countdownLeftLabel => '${daysLeft}d left';

  String get countdownLabel => '${daysLeft}d';

  String get monthLabel {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
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

final kMockFeaturedDonations = [
  CaresDonation(
    id: 'don-1',
    title: 'CARES Health Fund',
    organization: 'CARES Health Team',
    category: 'Health',
    tags: ['health', 'medical'],
    description:
        'Support medical missions, health kits, and wellness programs for underserved communities in Cebu.',
    goalAmount: 50000,
    raisedAmount: 32400,
    daysLeft: 12,
    deadline: DateTime(2026, 6, 30),
    isFeatured: true,
  ),
  CaresDonation(
    id: 'don-2',
    title: 'School Supplies Drive',
    organization: 'DepEd Volunteers',
    category: 'Education',
    tags: ['education', 'supplies'],
    description:
        'Help provide notebooks, pencils, and learning materials for students in partner schools.',
    goalAmount: 25000,
    raisedAmount: 18750,
    daysLeft: 18,
    deadline: DateTime(2026, 7, 15),
    isFeatured: true,
  ),
];

final kMockDonationCampaigns = [
  CaresDonation(
    id: 'don-3',
    title: 'Tree Planting Fund',
    organization: 'CARES Environment Team',
    category: 'Environment',
    tags: ['environment', 'trees'],
    description:
        'Fund native tree seedlings and maintenance for coastal reforestation sites.',
    goalAmount: 15000,
    raisedAmount: 9200,
    daysLeft: 8,
    deadline: DateTime(2026, 6, 20),
  ),
  CaresDonation(
    id: 'don-4',
    title: 'Community Pantry Support',
    organization: 'CARES Outreach',
    category: 'Health',
    tags: ['food', 'community'],
    description:
        'Provide rice, canned goods, and hygiene kits for families in need.',
    goalAmount: 30000,
    raisedAmount: 21500,
    daysLeft: 21,
    deadline: DateTime(2026, 7, 5),
  ),
  CaresDonation(
    id: 'don-5',
    title: 'Scholarship Assistance Fund',
    organization: 'College of Education',
    category: 'Education',
    tags: ['scholarship', 'students'],
    description:
        'Support student volunteers and beneficiaries with school fees and materials.',
    goalAmount: 40000,
    raisedAmount: 12800,
    daysLeft: 30,
    deadline: DateTime(2026, 7, 20),
  ),
];

final kMockAllDonations = [
  ...kMockFeaturedDonations,
  ...kMockDonationCampaigns,
];

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
