import 'event_feedback_store.dart';
import 'event_registration_store.dart';
import 'mock_events.dart';

class CaresCertificate {
  const CaresCertificate({
    required this.id,
    required this.title,
    required this.eventName,
    required this.organization,
    required this.issuedDate,
    required this.certificateNumber,
    required this.hoursCompleted,
    this.eventDate,
  });

  final String id;
  final String title;
  final String eventName;
  final String organization;
  final DateTime issuedDate;
  final String certificateNumber;
  final int hoursCompleted;

  /// Day the event itself took place (null for legacy demo certificates).
  final DateTime? eventDate;

  String? get eventDateLabel {
    final date = eventDate;
    if (date == null) return null;
    return _longDate(date);
  }

  String get issuedMonthYear {
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
    return '${months[issuedDate.month - 1]} ${issuedDate.year}';
  }

  String get issuedOnLabel => _longDate(issuedDate);

  static String _longDate(DateTime date) {
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

  String downloadFileName(String recipientName) {
    final safeName = recipientName
        .trim()
        .replaceAll(RegExp(r'[^\w\s-]'), '')
        .replaceAll(RegExp(r'\s+'), '_');
    return 'CARES_${safeName.isEmpty ? 'Volunteer' : safeName}_$id.txt';
  }

  String downloadContent(String recipientName) {
    return '''
CARES — Certificate of Recognition
==================================

Certificate: $title
Certificate No.: $certificateNumber

This certifies that

$recipientName

has successfully completed volunteer service for

$eventName
$organization
${eventDateLabel == null ? '' : 'Held on $eventDateLabel'}

Hours completed: $hoursCompleted
Date issued: $issuedOnLabel

CARES Community Action and Resource Engagement System
''';
  }
}

final kMockCertificates = [
  CaresCertificate(
    id: 'CERT-2026-001',
    title: 'Community Service Certificate',
    eventName: 'School Supplies Distribution',
    organization: 'DepEd Volunteers',
    issuedDate: DateTime(2026, 6, 21),
    certificateNumber: 'CSC-2026-0041',
    hoursCompleted: 4,
  ),
  CaresCertificate(
    id: 'CERT-2026-002',
    title: 'Volunteer Excellence Award',
    eventName: 'Medical Mission — Minglanilla',
    organization: 'CARES Health Team',
    issuedDate: DateTime(2026, 5, 28),
    certificateNumber: 'VEA-2026-0018',
    hoursCompleted: 6,
  ),
];

/// Mock certificate generated for a completed event once feedback is in.
CaresCertificate certificateForEvent(CaresEvent event) {
  final digits = RegExp(r'\d+').firstMatch(event.id)?.group(0) ?? '1';
  final serial = digits.padLeft(4, '0');
  return CaresCertificate(
    id: 'CERT-${event.date.year}-$serial',
    title: 'Certificate of Volunteer Participation',
    eventName: event.title,
    organization: event.organization,
    issuedDate: event.date.add(const Duration(days: 1)),
    certificateNumber: 'CARES-${event.date.year}-$serial',
    hoursCompleted: event.hoursCompleted ?? 0,
    eventDate: event.date,
  );
}

/// Certificates the volunteer has actually received: one per completed event
/// whose feedback was submitted, plus the earlier demo certificates.
///
/// This is the volunteer's certificate wallet — a certificate only lands here
/// once the post-event feedback unlocked it.
List<CaresCertificate> earnedCertificatesFor(String email) {
  final feedbackStore = EventFeedbackStore.instance;

  final fromEvents = EventRegistrationStore.instance
      .participationsForEmail(email)
      .map((p) => findEventById(p.eventId))
      .whereType<CaresEvent>()
      .where(
        (event) =>
            event.isCompleted && feedbackStore.hasSubmitted(event.id, email),
      )
      .map(certificateForEvent)
      .toList();

  final all = [...fromEvents, ...kMockCertificates]
    ..sort((a, b) => b.issuedDate.compareTo(a.issuedDate));
  return all;
}
