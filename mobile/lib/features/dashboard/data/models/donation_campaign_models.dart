import 'package:mobile/core/constants/goods_types.dart';
import 'package:mobile/features/dashboard/data/donation_format.dart';
import 'package:mobile/features/dashboard/data/models/recommended_event_models.dart';

/// A director event with "Accepted Donations" enabled, as the donor sees it —
/// `GET /events/donations` row. Every figure comes off the event itself;
/// nothing here is authored on the app side.
class DonationCampaign {
  const DonationCampaign(this.event);

  final RecommendedEvent event;

  int get eventId => event.id;
  String get id => 'event-${event.id}';
  String get title => event.title;
  String get organization => event.organizerName;
  String get category => event.category;
  String get description => event.description;
  String get location => event.location;
  DateTime get eventDate => event.startsAt;

  /// Which donation types the director enabled. A donor can only give in the
  /// ways the event accepts — never join it as a volunteer.
  bool get acceptsMonetary => event.fundsDonation;
  bool get acceptsGoods => event.goodsDonation;

  /// Goods the event asks for, in catalog order.
  List<GoodsType> get neededGoods => GoodsTypes.forEvent(event.goodsTypes);

  int get raisedAmount => event.fundsRaised;
  int get donationsCount => event.donationsCount;

  /// What the event will take, for cards and detail headers.
  String get acceptedDonationsLabel {
    if (acceptsMonetary && acceptsGoods) return 'Money & goods';
    if (acceptsMonetary) return 'Money';
    if (acceptsGoods) return 'Goods';
    return 'None';
  }

  String get raisedLabel => DonationFormat.peso(raisedAmount);

  String get fundingSummaryLabel =>
      acceptsMonetary ? '$raisedLabel raised' : 'Accepts goods donations';

  String get compactFundingLabel =>
      acceptsMonetary ? '$raisedLabel raised' : 'Goods';

  /// `3 donors` / `1 donor` — a second line under the raised figure.
  String get donorsLabel =>
      '$donationsCount ${donationsCount == 1 ? 'donation' : 'donations'}';

  int get daysLeft {
    final now = DateTime.now();
    final days = eventDate
        .difference(DateTime(now.year, now.month, now.day))
        .inDays;
    return days < 0 ? 0 : days;
  }

  String get countdownLeftLabel => '${daysLeft}d left';

  String get countdownLabel => '${daysLeft}d';

  String get eventDateLabel => DonationFormat.dateOnly(eventDate);

  String get monthLabel => DonationFormat.dateOnly(eventDate).split(' ').first;

  String get dayLabel => eventDate.day.toString();

  String get formattedDeadline =>
      '${eventDate.month}/${eventDate.day}/${eventDate.year}';

  bool matchesCategory(String category) {
    if (category == 'All') return true;
    return this.category.toLowerCase() == category.toLowerCase();
  }

  bool matchesQuery(String query) {
    if (query.trim().isEmpty) return true;
    final q = query.trim().toLowerCase();
    return title.toLowerCase().contains(q) ||
        organization.toLowerCase().contains(q) ||
        category.toLowerCase().contains(q) ||
        location.toLowerCase().contains(q) ||
        neededGoods.any((g) => g.label.toLowerCase().contains(q));
  }
}

/// "All" plus every category present, in first-seen order.
List<String> campaignCategories(List<DonationCampaign> campaigns) {
  final seen = <String>{};
  for (final c in campaigns) {
    final category = c.category.trim();
    if (category.isNotEmpty) seen.add(category);
  }
  return ['All', ...seen];
}

/// Up to five titles / organisers / categories that contain the query.
List<String> campaignSearchSuggestions(
  List<DonationCampaign> campaigns,
  String query,
) {
  if (query.trim().isEmpty) return const [];
  final q = query.trim().toLowerCase();
  final suggestions = <String>{};
  for (final campaign in campaigns) {
    if (campaign.title.toLowerCase().contains(q)) {
      suggestions.add(campaign.title);
    }
    if (campaign.organization.toLowerCase().contains(q)) {
      suggestions.add(campaign.organization);
    }
    if (campaign.category.toLowerCase().contains(q)) {
      suggestions.add(campaign.category);
    }
    for (final good in campaign.neededGoods) {
      if (good.label.toLowerCase().contains(q)) suggestions.add(good.label);
    }
  }
  return suggestions.take(5).toList();
}
