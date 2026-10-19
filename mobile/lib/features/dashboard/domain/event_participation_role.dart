/// What a volunteer registers to do at an event — the server's
/// `EventParticipationRole`. [regular] is confirmed on registration; the
/// others are held pending until a Director or Coordinator approves them,
/// on what they know of the volunteer — nothing is uploaded as proof.
enum EventParticipationRole {
  regular(
    apiValue: 'REGULAR',
    label: 'Regular',
    description: 'Participate as a regular event volunteer.',
  ),
  organizer(
    apiValue: 'ORGANIZER',
    label: 'Organizer',
    description:
        'Assist the Director or Coordinator in organizing and managing the event.',
  ),
  facilitator(
    apiValue: 'FACILITATOR',
    label: 'Facilitator',
    description: 'Facilitate event activities or guide participants.',
  ),
  speaker(
    apiValue: 'SPEAKER',
    label: 'Speaker',
    description: 'Speak during the event as an invited or assigned speaker.',
  );

  const EventParticipationRole({
    required this.apiValue,
    required this.label,
    required this.description,
  });

  final String apiValue;
  final String label;
  final String description;

  /// Every role but Regular goes to a Director or Coordinator for review.
  bool get requiresApproval => this != EventParticipationRole.regular;

  /// Null for a missing or unrecognised value, so an older server reads as
  /// "no role on record" instead of failing the whole event row.
  static EventParticipationRole? fromApi(String? value) {
    for (final role in values) {
      if (role.apiValue == value) return role;
    }
    return null;
  }
}

/// Where a volunteer's event role stands — the server's `EventRoleApproval`.
enum EventRoleApproval {
  approved('APPROVED'),
  pending('PENDING'),

  /// Not approved: the registration stands and the volunteer takes part as
  /// Regular.
  rejected('REJECTED');

  const EventRoleApproval(this.apiValue);

  final String apiValue;

  static EventRoleApproval? fromApi(String? value) {
    for (final approval in values) {
      if (approval.apiValue == value) return approval;
    }
    return null;
  }
}
