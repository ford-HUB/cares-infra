class CaresCertificate {
  const CaresCertificate({
    required this.id,
    required this.title,
    required this.eventName,
    required this.organization,
    required this.issuedDate,
    required this.certificateNumber,
    required this.hoursCompleted,
  });

  final String id;
  final String title;
  final String eventName;
  final String organization;
  final DateTime issuedDate;
  final String certificateNumber;
  final int hoursCompleted;

  String get issuedMonthYear {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    return '${months[issuedDate.month - 1]} ${issuedDate.year}';
  }

  String get issuedOnLabel {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    return '${months[issuedDate.month - 1]} ${issuedDate.day}, ${issuedDate.year}';
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

List<CaresCertificate> certificatesForCount(int count) {
  if (count <= 0) return [];
  return kMockCertificates.take(count).toList();
}
