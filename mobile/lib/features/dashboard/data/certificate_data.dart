import 'package:flutter/foundation.dart';
import 'package:mobile/core/services/api_client.dart' show ApiException;

import 'certificate_service.dart';
import 'models/certificate_design.dart';

export 'models/certificate_design.dart';

/// Frozen by the server on issue, so later event or template edits don't move
/// it.
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
    this.design,
    this.claimedAt,
  });

  factory CaresCertificate.fromJson(Map<String, dynamic> json) {
    final design = json['design'] as Map<String, dynamic>?;

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
      design: design == null ? null : CertificateDesign.fromJson(design),
      claimedAt: json['claimed_at'] == null
          ? null
          : DateTime.parse(json['claimed_at'] as String).toLocal(),
    );
  }

  final String id;

  /// The deployed template's name (the award line).
  final String title;
  final String eventName;
  final String organization;
  final DateTime issuedDate;
  final String certificateNumber;
  final double hoursCompleted;

  final DateTime? eventDate;

  /// Lets a completed card find its own certificate.
  final int? eventId;

  final String recipientName;

  /// Placeholders already filled in.
  final String headline;
  final String body;
  final String category;
  final String orientation;

  /// The frozen sheet: frame, layout, artwork, wording, signatures.
  final CertificateDesign? design;

  List<CertificateSignatory> get signatories => design?.signatories ?? const [];
  String get accent => design?.accent ?? 'emerald';

  /// First opened, on any device.
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

/// Server mirror shared by the activity tab, event details and wallet. Issued
/// once the event is over, attendance verified and feedback in, so the wallet
/// can show "generating" in between.
class CertificateStore extends ChangeNotifier {
  CertificateStore._();

  static final CertificateStore instance = CertificateStore._();

  final Map<String, CaresCertificate> _byId = {};
  bool _hydrated = false;
  bool _refreshing = false;
  String? _lastError;

  bool get hydrated => _hydrated;

  /// Lets screens tell "not issued yet" from "could not ask the server".
  String? get lastError => _lastError;

  List<CaresCertificate> get all {
    final list = _byId.values.toList()
      ..sort((a, b) => b.issuedDate.compareTo(a.issuedDate));
    return list;
  }

  int get count => _byId.length;

  CaresCertificate? forEvent(int? serverEventId) {
    if (serverEventId == null) return null;
    for (final certificate in _byId.values) {
      if (certificate.eventId == serverEventId) return certificate;
    }
    return null;
  }

  CaresCertificate? byId(String id) => _byId[id];

  void hydrate(List<CaresCertificate> certificates) {
    _byId
      ..clear()
      ..addEntries(certificates.map((c) => MapEntry(c.id, c)));
    _hydrated = true;
    notifyListeners();
  }

  /// Keeps `claimedAt` in step after opening.
  void upsert(CaresCertificate certificate) {
    _byId[certificate.id] = certificate;
    notifyListeners();
  }

  /// A failed fetch keeps what is held and records [lastError].
  Future<bool> refresh({CertificateService? service}) async {
    if (_refreshing) return _lastError == null;
    _refreshing = true;
    try {
      final certificates = await (service ?? CertificateService()).fetchMine();
      _lastError = null;
      hydrate(certificates);
      return true;
    } on ApiException catch (error) {
      _lastError = error.message;
      notifyListeners();
      return false;
    } catch (error) {
      _lastError = 'Could not load your certificates ($error)';
      notifyListeners();
      return false;
    } finally {
      _refreshing = false;
    }
  }

  /// On sign-out, so the next account starts clean.
  void clear() {
    _byId.clear();
    _hydrated = false;
    _lastError = null;
    notifyListeners();
  }
}
