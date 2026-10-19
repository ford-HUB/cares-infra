import 'package:flutter/material.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/dashboard/data/event_participants_service.dart';
import 'package:mobile/features/dashboard/data/event_registration_store.dart';
import 'package:mobile/features/dashboard/domain/cares_event.dart';

/// Everyone registered for an event, the signed-in volunteer first.
///
/// Server events load their volunteers from `GET /events/:id/participants`;
/// prototype fixtures (no server id) only know the local registration store.
class EventParticipantsScreen extends StatefulWidget {
  const EventParticipantsScreen({super.key, required this.event});

  final CaresEvent event;

  static void open(BuildContext context, CaresEvent event) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => EventParticipantsScreen(event: event),
      ),
    );
  }

  @override
  State<EventParticipantsScreen> createState() =>
      _EventParticipantsScreenState();
}

class _EventParticipantsScreenState extends State<EventParticipantsScreen> {
  final _service = EventParticipantsService();

  late Future<List<EventParticipant>> _participants;

  CaresEvent get _event => widget.event;

  @override
  void initState() {
    super.initState();
    _participants = _load();
  }

  Future<List<EventParticipant>> _load() async {
    final serverId = _event.serverId;
    if (serverId == null) {
      return EventRegistrationStore.instance
          .participationsForEvent(_event.id)
          .map((p) => EventParticipant(name: p.participantName, isMe: true))
          .toList();
    }
    final rows = await _service.list(serverId);
    return [...rows.where((p) => p.isMe), ...rows.where((p) => !p.isMe)];
  }

  Future<void> _refresh() async {
    final next = _load();
    setState(() => _participants = next);
    await next.catchError((_) => <EventParticipant>[]);
  }

  @override
  Widget build(BuildContext context) {
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
      body: FutureBuilder<List<EventParticipant>>(
        future: _participants,
        builder: (context, snapshot) {
          final rows = snapshot.data ?? const <EventParticipant>[];
          return Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 4, 20, 12),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        _event.title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF1B1F24),
                        ),
                      ),
                    ),
                    if (snapshot.hasData)
                      Text(
                        '${rows.length} / ${_event.totalCapacity}',
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          color: AppColors.accentOrange,
                        ),
                      ),
                  ],
                ),
              ),
              Expanded(child: _body(snapshot, rows)),
            ],
          );
        },
      ),
    );
  }

  Widget _body(
    AsyncSnapshot<List<EventParticipant>> snapshot,
    List<EventParticipant> rows,
  ) {
    if (snapshot.connectionState != ConnectionState.done) {
      return const Center(child: CircularProgressIndicator());
    }
    if (snapshot.hasError) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              "Couldn't load the participants.",
              style: TextStyle(color: Color(0xFF6B7280)),
            ),
            const SizedBox(height: 8),
            TextButton(onPressed: _refresh, child: const Text('Try again')),
          ],
        ),
      );
    }
    return RefreshIndicator(
      onRefresh: _refresh,
      child: rows.isEmpty
          ? ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              children: const [
                SizedBox(height: 120),
                Center(
                  child: Text(
                    'No one has registered yet.',
                    style: TextStyle(color: Color(0xFF6B7280)),
                  ),
                ),
              ],
            )
          : ListView.separated(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
              itemCount: rows.length,
              separatorBuilder: (_, _) => const SizedBox(height: 8),
              itemBuilder: (_, i) => _ParticipantTile(
                participant: rows[i],
                color:
                    AppColors.communityRing[i %
                        AppColors.communityRing.length],
              ),
            ),
    );
  }
}

class _ParticipantTile extends StatelessWidget {
  const _ParticipantTile({required this.participant, required this.color});

  final EventParticipant participant;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final initials = participant.name
        .trim()
        .split(RegExp(r'\s+'))
        .take(2)
        .map((p) => p.isEmpty ? '' : p[0].toUpperCase())
        .join();
    final role = participant.approvedSpecialRole;
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
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  participant.name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF1B1F24),
                  ),
                ),
                if (role != null)
                  Text(
                    role.label,
                    style: const TextStyle(
                      fontSize: 12,
                      color: Color(0xFF6B7280),
                    ),
                  ),
              ],
            ),
          ),
          if (participant.attended) ...[
            const _Pill(label: 'Attended', color: Color(0xFF16A34A)),
            const SizedBox(width: 6),
          ],
          if (participant.isMe)
            const _Pill(label: 'You', color: AppColors.accentOrange),
        ],
      ),
    );
  }
}

class _Pill extends StatelessWidget {
  const _Pill({required this.label, required this.color});

  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(AppColors.pillRadius),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w800,
          color: color,
        ),
      ),
    );
  }
}
