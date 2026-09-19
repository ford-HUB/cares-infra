import 'package:flutter/material.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/dashboard/data/event_registration_store.dart';
import 'package:mobile/features/dashboard/domain/cares_event.dart';

/// Everyone registered for an event, the signed-in volunteer first.
///
/// The server does not expose a participant list to the mobile client yet,
/// so beyond the local registration store the rows are prototype fixtures
/// sized to the event's registered count — same footing as the rest of the
/// event details flow.
class EventParticipantsScreen extends StatelessWidget {
  const EventParticipantsScreen({super.key, required this.event});

  final CaresEvent event;

  static void open(BuildContext context, CaresEvent event) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => EventParticipantsScreen(event: event),
      ),
    );
  }

  static const _sampleNames = [
    'Maria Santos',
    'Jose Dela Cruz',
    'Angela Reyes',
    'Mark Villanueva',
    'Carla Mendoza',
    'Paolo Garcia',
    'Bea Fernandez',
    'Rico Bautista',
    'Nina Torres',
    'Leo Aquino',
    'Faith Ramos',
    'Ken Castillo',
  ];

  @override
  Widget build(BuildContext context) {
    final store = EventRegistrationStore.instance;
    return ListenableBuilder(
      listenable: store,
      builder: (context, _) {
        final mine = store
            .participationsForEvent(event.id)
            .map((p) => _Row(name: p.participantName, isMe: true))
            .toList();
        final others = List.generate(
          (event.registeredCount - mine.length).clamp(0, 60),
          (i) => _Row(name: _sampleNames[i % _sampleNames.length]),
        );
        final rows = [...mine, ...others];

        return Scaffold(
          backgroundColor: AppColors.background,
          appBar: AppBar(
            backgroundColor: AppColors.background,
            surfaceTintColor: Colors.transparent,
            foregroundColor: const Color(0xFF1B1F24),
            title: const Text(
              'Participants',
              style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800),
            ),
            centerTitle: true,
          ),
          body: Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 4, 20, 12),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        event.title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF1B1F24),
                        ),
                      ),
                    ),
                    Text(
                      '${rows.length} / ${event.totalCapacity}',
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: AppColors.accentOrange,
                      ),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: rows.isEmpty
                    ? const Center(
                        child: Text(
                          'No one has registered yet.',
                          style: TextStyle(color: Color(0xFF6B7280)),
                        ),
                      )
                    : ListView.separated(
                        padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
                        itemCount: rows.length,
                        separatorBuilder: (_, _) => const SizedBox(height: 8),
                        itemBuilder: (_, i) => _ParticipantTile(
                          row: rows[i],
                          color:
                              AppColors.communityRing[i %
                                  AppColors.communityRing.length],
                        ),
                      ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _Row {
  const _Row({required this.name, this.isMe = false});

  final String name;
  final bool isMe;
}

class _ParticipantTile extends StatelessWidget {
  const _ParticipantTile({required this.row, required this.color});

  final _Row row;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final initials = row.name
        .trim()
        .split(RegExp(r'\s+'))
        .take(2)
        .map((p) => p.isEmpty ? '' : p[0].toUpperCase())
        .join();
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 20,
            backgroundColor: color,
            child: Text(
              initials,
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w800,
                fontSize: 14,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              row.name,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w700,
                color: Color(0xFF1B1F24),
              ),
            ),
          ),
          if (row.isMe)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: AppColors.accentOrange.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(AppColors.pillRadius),
              ),
              child: const Text(
                'You',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                  color: AppColors.accentOrange,
                ),
              ),
            ),
        ],
      ),
    );
  }
}
