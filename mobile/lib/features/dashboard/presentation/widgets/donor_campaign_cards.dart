import 'package:flutter/material.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/core/widgets/skeleton.dart';
import 'package:mobile/features/dashboard/data/models/donation_campaign_models.dart';
import 'package:mobile/features/dashboard/presentation/utils/home_event_format.dart';
import 'package:mobile/features/dashboard/presentation/widgets/home_event_image.dart';
import 'package:mobile/features/dashboard/presentation/widgets/popular_event_deck.dart';

/// Horizontal deck of white poster cards for the donor home — the same
/// footprint and look as [PopularEventDeck], with what the event accepts
/// over the photo and the raised figure beside a "DONATE" pill instead of
/// slots and "JOIN NOW".
class DonorCampaignDeck extends StatelessWidget {
  const DonorCampaignDeck({
    super.key,
    required this.campaigns,
    required this.gutter,
    required this.onOpen,
  });

  final List<DonationCampaign> campaigns;
  final double gutter;
  final ValueChanged<DonationCampaign> onOpen;

  static const double cardWidth = PopularEventDeck.cardWidth;
  static const double cardHeight = PopularEventDeck.cardHeight;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: cardHeight,
      child: ListView.separated(
        padding: EdgeInsets.symmetric(horizontal: gutter),
        clipBehavior: Clip.none,
        scrollDirection: Axis.horizontal,
        itemCount: campaigns.length,
        separatorBuilder: (_, _) => const SizedBox(width: 16),
        itemBuilder: (context, index) => SizedBox(
          width: cardWidth,
          child: DonorCampaignCard(
            campaign: campaigns[index],
            onOpen: () => onOpen(campaigns[index]),
          ),
        ),
      ),
    );
  }
}

class DonorCampaignCard extends StatelessWidget {
  const DonorCampaignCard({
    super.key,
    required this.campaign,
    required this.onOpen,
  });

  final DonationCampaign campaign;
  final VoidCallback onOpen;

  static const _radius = 22.0;

  @override
  Widget build(BuildContext context) {
    final event = campaign.event;
    final place = event.location.isEmpty ? event.organizerName : event.location;

    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(_radius),
      elevation: 6,
      shadowColor: Colors.black.withValues(alpha: 0.18),
      child: InkWell(
        onTap: onOpen,
        borderRadius: BorderRadius.circular(_radius),
        child: Padding(
          padding: const EdgeInsets.all(10),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              AspectRatio(
                aspectRatio: 216 / 150,
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(16),
                  child: Stack(
                    fit: StackFit.expand,
                    children: [
                      HomeEventImage(event: event),
                      Positioned(
                        top: 8,
                        left: 8,
                        child: DonationAcceptsBadge(campaign: campaign),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 12),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 4),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      campaign.title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 15.5,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF1B1F24),
                        letterSpacing: -0.2,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        _Meta(
                          icon: Icons.calendar_today_rounded,
                          text: homeEventRangeLabel(
                            event.startsAt,
                            event.endsAt,
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: _Meta(
                            icon: Icons.location_on_rounded,
                            text: place,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),
                    Row(
                      children: [
                        Expanded(child: _RaisedLine(campaign: campaign)),
                        _DonatePill(onPressed: onOpen),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// "Money & goods" over the photo, in the same pill as the volunteer deck's
/// slots badge; goods-only campaigns take the warm accent so they stand out
/// from the money majority.
class DonationAcceptsBadge extends StatelessWidget {
  const DonationAcceptsBadge({super.key, required this.campaign});

  final DonationCampaign campaign;

  @override
  Widget build(BuildContext context) {
    final goodsOnly = campaign.acceptsGoods && !campaign.acceptsMonetary;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: goodsOnly
            ? AppColors.accentOrange
            : Colors.black.withValues(alpha: 0.45),
        borderRadius: BorderRadius.circular(AppColors.pillRadius),
      ),
      child: Text(
        campaign.acceptedDonationsLabel,
        style: const TextStyle(
          fontSize: 10.5,
          fontWeight: FontWeight.w700,
          color: Colors.white,
        ),
      ),
    );
  }
}

/// "₱12k raised · 4 donations" for a money campaign, the donation count
/// alone for goods-only — there is no peso figure to show for those.
class _RaisedLine extends StatelessWidget {
  const _RaisedLine({required this.campaign});

  final DonationCampaign campaign;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        const Icon(
          Icons.volunteer_activism_rounded,
          size: 15,
          color: Color(0xFF6B7280),
        ),
        const SizedBox(width: 5),
        Flexible(
          child: Text(
            campaign.acceptsMonetary
                ? '${campaign.raisedLabel} raised · ${campaign.donorsLabel}'
                : campaign.donorsLabel,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: Color(0xFF6B7280),
            ),
          ),
        ),
      ],
    );
  }
}

class _Meta extends StatelessWidget {
  const _Meta({required this.icon, required this.text});

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 12, color: AppColors.accentOrange),
        const SizedBox(width: 4),
        Flexible(
          child: Text(
            text,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w500,
              color: Color(0xFF6B7280),
            ),
          ),
        ),
      ],
    );
  }
}

class _DonatePill extends StatelessWidget {
  const _DonatePill({required this.onPressed});

  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return FilledButton(
      onPressed: onPressed,
      style: FilledButton.styleFrom(
        backgroundColor: const Color(0xFF1B1F24),
        foregroundColor: Colors.white,
        minimumSize: const Size(0, 30),
        padding: const EdgeInsets.symmetric(horizontal: 12),
        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        textStyle: const TextStyle(
          fontSize: 10.5,
          fontWeight: FontWeight.w800,
          letterSpacing: 0.3,
        ),
      ),
      child: const Text('DONATE'),
    );
  }
}

/// Compact row card under the category chips — the donor twin of the
/// volunteer's category row: square thumbnail, title with date • place, and
/// a right column with what the event accepts over "DONATE".
class DonorCampaignRow extends StatelessWidget {
  const DonorCampaignRow({
    super.key,
    required this.campaign,
    required this.onOpen,
  });

  final DonationCampaign campaign;
  final VoidCallback onOpen;

  static const _thumbSize = 62.0;

  @override
  Widget build(BuildContext context) {
    final event = campaign.event;
    final place = event.location.isEmpty ? event.organizerName : event.location;

    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(16),
      elevation: 3,
      shadowColor: Colors.black.withValues(alpha: 0.12),
      child: InkWell(
        onTap: onOpen,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(10),
          child: Row(
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(10),
                child: SizedBox(
                  width: _thumbSize,
                  height: _thumbSize,
                  child: HomeEventImage(event: event, iconSize: 24),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      campaign.title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 14.5,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF1B1F24),
                        letterSpacing: -0.2,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text.rich(
                      TextSpan(
                        children: [
                          TextSpan(text: homeEventDateLabel(event.startsAt)),
                          const TextSpan(
                            text: '  •  ',
                            style: TextStyle(color: AppColors.accentOrange),
                          ),
                          const WidgetSpan(
                            alignment: PlaceholderAlignment.middle,
                            child: Icon(
                              Icons.location_on_rounded,
                              size: 12,
                              color: AppColors.accentOrange,
                            ),
                          ),
                          TextSpan(text: ' $place'),
                        ],
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w500,
                        color: Color(0xFF6B7280),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 10),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    campaign.acceptsMonetary
                        ? '${campaign.raisedLabel} raised'
                        : campaign.acceptedDonationsLabel,
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: AppColors.accentOrange,
                    ),
                  ),
                  const SizedBox(height: 6),
                  const Text(
                    'DONATE',
                    style: TextStyle(
                      fontSize: 10.5,
                      fontWeight: FontWeight.w800,
                      color: Color(0xFF1B1F24),
                      letterSpacing: 0.3,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Three row-card outlines while the list loads.
class DonorCampaignListSkeleton extends StatelessWidget {
  const DonorCampaignListSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return SkeletonLoader(
      child: Column(
        children: [
          for (var i = 0; i < 3; i++)
            Padding(
              padding: EdgeInsets.only(bottom: i < 2 ? 12 : 0),
              child: const SkeletonBox(height: 82, radius: 16),
            ),
        ],
      ),
    );
  }
}
