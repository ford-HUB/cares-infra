import 'package:flutter/material.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/auth/domain/registration_role_type.dart';

class RegistrationRoleOptionCard extends StatefulWidget {
  const RegistrationRoleOptionCard({
    super.key,
    required this.roleType,
    required this.accentColor,
    required this.onTap,
    this.isExpanded = false,
    this.expandedChild,
  });

  final RegistrationRoleType roleType;
  final Color accentColor;
  final VoidCallback onTap;
  final bool isExpanded;
  final Widget? expandedChild;

  @override
  State<RegistrationRoleOptionCard> createState() =>
      _RegistrationRoleOptionCardState();
}

class _RegistrationRoleOptionCardState extends State<RegistrationRoleOptionCard>
    with SingleTickerProviderStateMixin {
  /// Springs the card back to full size after a tap, so expanding feels
  /// physical instead of a plain height change.
  late final AnimationController _bounceController = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 620),
    value: 1,
  );

  late final Animation<double> _bounce = Tween<double>(begin: 0.94, end: 1)
      .animate(
        CurvedAnimation(parent: _bounceController, curve: Curves.elasticOut),
      );

  @override
  void dispose() {
    _bounceController.dispose();
    super.dispose();
  }

  void _handleTap() {
    _bounceController.forward(from: 0);
    widget.onTap();
  }

  @override
  Widget build(BuildContext context) {
    return ScaleTransition(scale: _bounce, child: _buildCard());
  }

  Widget _buildCard() {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 250),
      curve: Curves.easeOutCubic,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: widget.isExpanded
              ? widget.accentColor
              : const Color(0xFFE6EFE3),
          width: widget.isExpanded ? 1.5 : 1,
        ),
        // The page behind these cards is white, so they need their own lift.
        boxShadow: [
          BoxShadow(
            color: widget.isExpanded
                ? widget.accentColor.withValues(alpha: 0.16)
                : const Color(0x141F5F28),
            blurRadius: widget.isExpanded ? 18 : 14,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: _handleTap,
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Row(
                  children: [
                    _RoleIconTile(
                      icon: widget.roleType.icon,
                      accentColor: widget.accentColor,
                      isActive: widget.isExpanded,
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            widget.roleType.title,
                            style: const TextStyle(
                              fontSize: 17,
                              fontWeight: FontWeight.w700,
                              color: AppColors.primaryDark,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            widget.roleType.subtitle,
                            style: TextStyle(
                              fontSize: 13,
                              height: 1.35,
                              color: AppColors.secondary.withValues(
                                alpha: 0.95,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    // Swap the chevron only — the old quarter turn on top of
                    // the swapped icon pointed it sideways.
                    Icon(
                      widget.isExpanded
                          ? Icons.keyboard_arrow_up_rounded
                          : Icons.arrow_forward_ios_rounded,
                      size: widget.isExpanded ? 24 : 16,
                      color: widget.isExpanded
                          ? widget.accentColor
                          : AppColors.textMuted,
                    ),
                  ],
                ),
              ),
            ),
          ),
          AnimatedCrossFade(
            firstChild: const SizedBox.shrink(),
            secondChild: widget.expandedChild ?? const SizedBox.shrink(),
            crossFadeState: widget.isExpanded && widget.expandedChild != null
                ? CrossFadeState.showSecond
                : CrossFadeState.showFirst,
            duration: const Duration(milliseconds: 420),
            reverseDuration: const Duration(milliseconds: 260),
            // Overshoots the final height a touch on the way open.
            sizeCurve: Curves.easeOutBack,
            firstCurve: Curves.easeOutCubic,
            secondCurve: Curves.easeOutCubic,
          ),
        ],
      ),
    );
  }
}

/// The rounded badge in front of each role. It reads as a tinted chip while
/// idle and fills with the role's colour once the card is open.
class _RoleIconTile extends StatelessWidget {
  const _RoleIconTile({
    required this.icon,
    required this.accentColor,
    required this.isActive,
  });

  final IconData icon;
  final Color accentColor;
  final bool isActive;

  @override
  Widget build(BuildContext context) {
    final deepAccent = Color.lerp(accentColor, Colors.black, 0.22)!;

    return AnimatedContainer(
      duration: const Duration(milliseconds: 260),
      curve: Curves.easeOutCubic,
      width: 54,
      height: 54,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: isActive
              ? [accentColor, deepAccent]
              : [
                  accentColor.withValues(alpha: 0.18),
                  accentColor.withValues(alpha: 0.07),
                ],
        ),
        borderRadius: BorderRadius.circular(17),
        border: Border.all(
          color: isActive
              ? Colors.transparent
              : accentColor.withValues(alpha: 0.22),
        ),
        boxShadow: [
          BoxShadow(
            color: accentColor.withValues(alpha: isActive ? 0.32 : 0.10),
            blurRadius: isActive ? 14 : 8,
            offset: const Offset(0, 5),
          ),
        ],
      ),
      child: AnimatedSwitcher(
        duration: const Duration(milliseconds: 220),
        child: Icon(
          icon,
          key: ValueKey(isActive),
          size: 27,
          color: isActive ? Colors.white : accentColor,
        ),
      ),
    );
  }
}
