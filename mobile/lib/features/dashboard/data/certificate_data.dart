import 'package:flutter/foundation.dart';

import 'certificate_service.dart';

/// One signature line as printed on an issued certificate.
class CertificateSignatory {
  const CertificateSignatory({
    required this.id,
    required this.name,
    required this.title,
    required this.department,
    this.signatureUrl,
  });

  factory CertificateSignatory.fromJson(Map<String, dynamic> json) {
    return CertificateSignatory(
      id: json['id'] as String,
      name: json['name'] as String? ?? '',
      title: json['title'] as String? ?? '',
      department: json['department'] as String? ?? '',
      signatureUrl: json['signature_url'] as String?,
    );
  }

  final String id;
  final String name;
  final String title;
  final String department;

  /// API path of the signature image the line was issued with; null when the
  /// coordinator had none uploaded on the day.
  final String? signatureUrl;
}

/// A certificate the issuing scheduler generated for this volunteer from the
/// template a director deployed to the event. Every field is as it read on
/// the day of issue — the server froze the sheet, so nothing here moves if
/// the event or template is edited later.
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
    this.eventId,
    this.recipientName = '',
    this.headline = '',
    this.body = '',
    this.category = 'participation',
    this.orientation = 'landscape',
    this.accent = 'emerald',
    this.frame = 'plain',
    this.sealLabel = '',
    this.showSeal = false,
    this.signatories = const [],
    this.claimedAt,
  });

  factory CaresCertificate.fromJson(Map<String, dynamic> json) {
    final design = json['design'] as Map<String, dynamic>? ?? const {};
    final signatories = (design['signatories'] as List<dynamic>? ?? const [])
        .map((e) => CertificateSignatory.fromJson(e as Map<String, dynamic>))
        .toList();

    return CaresCertificate(
      id: json['id'] as String,
      title: json['template_name'] as String? ?? 'Certificate',
      eventName: json['event_name'] as String? ?? '',
      organization: json['organization'] as String? ?? '',
      issuedDate: DateTime.parse(json['issued_at'] as String).toLocal(),
      certificateNumber: json['certificate_number'] as String? ?? '',
      hoursCompleted: (json['hours_rendered'] as num?)?.toDouble() ?? 0,
      eventDate: json['event_date'] == null
          ? null
          : DateTime.parse(json['event_date'] as String).toLocal(),
      eventId: json['event_id'] as int?,
      recipientName: json['recipient_name'] as String? ?? '',
      headline: json['headline'] as String? ?? '',
      body: json['body'] as String? ?? '',
      category: json['category'] as String? ?? 'participation',
      orientation: json['orientation'] as String? ?? 'landscape',
      accent: design['accent'] as String? ?? 'emerald',
      frame: design['frame'] as String? ?? 'plain',
      sealLabel: design['seal_label'] as String? ?? '',
      showSeal: design['show_seal'] as bool? ?? false,
      signatories: signatories,
      claimedAt: json['claimed_at'] == null
          ? null
          : DateTime.parse(json['claimed_at'] as String).toLocal(),
    );
  }

  final String id;

  /// The deployed template's name — the award line on the sheet.
  final String title;
  final String eventName;
  final String organization;
  final DateTime issuedDate;
  final String certificateNumber;
  final double hoursCompleted;

  /// Day the event itself took place.
  final DateTime? eventDate;

  /// Server id of the event, so a completed card can find its own certificate.
  final int? eventId;

  final String recipientName;

  /// Headline and award text with every placeholder already filled in.
  final String headline;
  final String body;
  final String category;
  final String orientation;
  final String accent;
  final String frame;
  final String sealLabel;
  final bool showSeal;
  final List<CertificateSignatory> signatories;

  /// When this device (or another) first opened the certificate.
  final DateTime? claimedAt;

  bool get isLandscape => orientation == 'landscape';

  String get hoursLabel {
    final rounded = (hoursCompleted * 10).round() / 10;
    final whole = rounded == rounded.roundToDouble();
    return whole ? '${rounded.round()}h' : '${rounded.toStringAsFixed(1)}h';
  }

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

  String downloadFileName(String recipient) {
    final safeName = recipient
        .trim()
        .replaceAll(RegExp(r'[^\w\s-]'), '')
        .replaceAll(RegExp(r'\s+'), '_');
    return 'CARES_${safeName.isEmpty ? 'Volunteer' : safeName}_$certificateNumber.txt';
  }

  String downloadContent(String recipient) {
    final lines = signatories
        .map((s) => '${s.name} — ${s.title}, ${s.department}')
        .join('\n');
    return '''
CARES — ${headline.isEmpty ? 'Certificate' : headline}
==================================

Certificate: $title
Certificate No.: $certificateNumber

${body.isEmpty ? 'This certifies that $recipient has successfully completed volunteer service for $eventName.' : body}

$eventName
$organization
${eventDateLabel == null ? '' : 'Held on $eventDateLabel'}

Hours rendered: $hoursLabel
Date issued: $issuedOnLabel

${lines.isEmpty ? '' : 'Signed by:\n$lines\n'}
CARES Community Action and Resource Engagement System
''';
  }
}

/// The volunteer's certificate wallet — what the issuing scheduler has
/// generated for them. The truth lives on the server; this mirrors it so the
/// activity tab, the event details screen and the wallet redraw together.
///
/// A certificate lands here once the event is over, attendance was verified
/// and the post-event feedback is in: the scheduler checks all three, so the
/// wallet can show "generating" between the feedback going in and the sheet
/// coming out.
class CertificateStore extends ChangeNotifier {
  CertificateStore._();

  static final CertificateStore instance = CertificateStore._();

  final Map<String, CaresCertificate> _byId = {};
  bool _hydrated = false;
  bool _refreshing = false;

  /// True once the server has answered at least once this session.
  bool get hydrated => _hydrated;

  List<CaresCertificate> get all {
    final list = _byId.values.toList()
      ..sort((a, b) => b.issuedDate.compareTo(a.issuedDate));
    return list;
  }

  int get count => _byId.length;

  /// The certificate for a server event, or null while none has been issued.
  CaresCertificate? forEvent(int? serverEventId) {
    if (serverEventId == null) return null;
    for (final certificate in _byId.values) {
      if (certificate.eventId == serverEventId) return certificate;
    }
    return null;
  }

  CaresCertificate? byId(String id) => _byId[id];

  /// Replaces everything with the server's list.
  void hydrate(List<CaresCertificate> certificates) {
    _byId
      ..clear()
      ..addEntries(certificates.map((c) => MapEntry(c.id, c)));
    _hydrated = true;
    notifyListeners();
  }

  /// One certificate, freshly opened — keeps `claimedAt` in step.
  void upsert(CaresCertificate certificate) {
    _byId[certificate.id] = certificate;
    notifyListeners();
  }

  /// Best effort: a failed wallet fetch leaves what is already held.
  Future<void> refresh({CertificateService? service}) async {
    if (_refreshing) return;
    _refreshing = true;
    try {
      final certificates = await (service ?? CertificateService()).fetchMine();
      hydrate(certificates);
    } catch (_) {
      // Leave the store as-is; the next refresh retries.
    } finally {
      _refreshing = false;
    }
  }

  /// Forgets everything — on sign-out, so the next account starts clean.
  void clear() {
    _byId.clear();
    _hydrated = false;
    notifyListeners();
  }
}
