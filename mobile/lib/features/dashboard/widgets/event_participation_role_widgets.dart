import 'package:flutter/material.dart';

import '../../../core/theme/app_theme.dart';
import '../domain/event_participation_role.dart';
import 'event_details_widgets.dart';

/// The "Participation Role" picker shown before registering. Regular is the
/// default; picking any other role says up front that it goes to a Director
/// or Coordinator for approval and that nothing has to be uploaded.
class EventParticipationRoleField extends StatelessWidget {
  const EventParticipationRoleField({
    super.key,
    required this.value,
    required this.onChanged,
  });

  final EventParticipationRole value;

  /// Null disables the picker (e.g. while a registration is in flight).
  final ValueChanged<EventParticipationRole>? onChanged;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          DropdownButtonFormField<EventParticipationRole>(
            key: ValueKey(value),
            isExpanded: true,
            initialValue: value,
            decoration: InputDecoration(
              labelText: 'Participation Role',
              filled: true,
              fillColor: AppColors.fieldFill,
            ),
            items: [
              for (final role in EventParticipationRole.values)
                DropdownMenuItem(
                  value: role,
                  child: Text(
                    role == EventParticipationRole.regular
                        ? '${role.label} (Default)'
                        : role.label,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
            ],
            onChanged: onChanged == null
                ? null
                : (role) {
                    if (role != null) onChanged!(role);
                  },
          ),
          const SizedBox(height: 10),
          Text(
            value.description,
            style: const TextStyle(
              fontSize: 13,
              height: 1.45,
              color: kEventMuted,
            ),
          ),
          if (value.requiresApproval) ...[
            const SizedBox(height: 10),
            const _Note(
              icon: Icons.hourglass_top_rounded,
              color: AppColors.warning,
              text:
                  'This role needs approval from the Director or Coordinator '
                  'after you register. No documents are required.',
            ),
          ],
        ],
      ),
    );
  }
}

/// The role on the volunteer's registration and where its review stands.
class EventRoleStatusCard extends StatelessWidget {
  const EventRoleStatusCard({
    super.key,
    required this.role,
    required this.approval,
  });

  final EventParticipationRole role;
  final EventRoleApproval? approval;

  @override
  Widget build(BuildContext context) {
    final (
      String status,
      Color color,
      IconData icon,
      String? note,
    ) = switch (approval) {
      EventRoleApproval.pending => (
        'Pending Approval',
        AppColors.warning,
        Icons.hourglass_top_rounded,
        'Awaiting review by the Director or Coordinator. You are '
            'registered as a regular volunteer in the meantime.',
      ),
      EventRoleApproval.rejected => (
        'Not Approved',
        AppColors.error,
        Icons.info_outline_rounded,
        'You are still registered and will take part as a regular '
            'volunteer.',
      ),
      _ => ('Approved', AppColors.primary, Icons.verified_rounded, null),
    };

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.badge_outlined, size: 20, color: kEventInk),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  role.label,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: kEventInk,
                  ),
                ),
              ),
              // Regular is never reviewed, so it carries no status chip.
              if (role.requiresApproval)
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(icon, size: 13, color: color),
                      const SizedBox(width: 4),
                      Text(
                        status,
                        style: TextStyle(
                          fontSize: 11.5,
                          fontWeight: FontWeight.w700,
                          color: color,
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            role.description,
            style: const TextStyle(
              fontSize: 13,
              height: 1.45,
              color: kEventMuted,
            ),
          ),
          if (role.requiresApproval && note != null) ...[
            const SizedBox(height: 10),
            _Note(icon: icon, color: color, text: note),
          ],
        ],
      ),
    );
  }
}

class _Note extends StatelessWidget {
  const _Note({required this.icon, required this.color, required this.text});

  final IconData icon;
  final Color color;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 16, color: color),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              text,
              style: const TextStyle(
                fontSize: 12.5,
                height: 1.4,
                color: kEventInk,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
