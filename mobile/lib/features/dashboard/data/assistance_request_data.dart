import 'package:flutter/foundation.dart';
import 'package:latlong2/latlong.dart';
import 'package:mobile/core/services/api_client.dart';
import 'package:mobile/core/services/auth_session.dart';
import 'package:mobile/features/dashboard/data/assistance_request_service.dart';
import 'package:mobile/features/dashboard/data/needs_assessment_service.dart';

/// Lifecycle of a beneficiary assistance request.
enum AssistanceRequestStatus {
  pending,
  underReview,
  approved,
  completed,
  declined,
  cancelled,
}

extension AssistanceRequestStatusX on AssistanceRequestStatus {
  String get label => switch (this) {
    AssistanceRequestStatus.pending => 'Pending',
    AssistanceRequestStatus.underReview => 'Under Review',
    AssistanceRequestStatus.approved => 'Approved',
    AssistanceRequestStatus.completed => 'Completed',
    AssistanceRequestStatus.declined => 'Declined',
    AssistanceRequestStatus.cancelled => 'Cancelled',
  };

  /// Pending and under-review requests are the beneficiary's current ones.
  bool get isCurrent =>
      this == AssistanceRequestStatus.pending ||
      this == AssistanceRequestStatus.underReview;
}

/// Where the household stands in the CARES needs assessment.
enum NeedsAssessmentStatus { notStarted, scheduled, inProgress, completed }

extension NeedsAssessmentStatusX on NeedsAssessmentStatus {
  String get label => switch (this) {
    NeedsAssessmentStatus.notStarted => 'Not Started',
    NeedsAssessmentStatus.scheduled => 'Scheduled',
    NeedsAssessmentStatus.inProgress => 'In Progress',
    NeedsAssessmentStatus.completed => 'Completed',
  };
}

/// One step in a request's progress trail.
class RequestTimelineEntry {
  const RequestTimelineEntry({
    required this.label,
    required this.date,
    required this.done,
    this.note,
  });

  final String label;
  final DateTime? date;
  final bool done;
  final String? note;
}

/// A proof / supporting document attached to a request (ID, bill, medical
/// certificate, photo of damage, ...). [path] is the local file while the
/// form is being filled in, and the stored file's URL once it is filed.
class RequestAttachment {
  const RequestAttachment({
    required this.name,
    required this.path,
    this.sizeBytes,
  });

  final String name;
  final String path;
  final int? sizeBytes;

  String get extension {
    final dot = name.lastIndexOf('.');
    return dot == -1 ? '' : name.substring(dot + 1).toLowerCase();
  }

  bool get isImage =>
      const {'jpg', 'jpeg', 'png', 'webp', 'heic'}.contains(extension);

  String get sizeLabel {
    final bytes = sizeBytes;
    if (bytes == null) return '';
    if (bytes < 1024) return '$bytes B';
    if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(0)} KB';
    return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
  }
}

class AssistanceRequest {
  const AssistanceRequest({
    required this.id,
    required this.referenceNumber,
    required this.title,
    required this.category,
    required this.description,
    required this.submittedOn,
    required this.status,
    required this.needsAssessment,
    required this.urgency,
    required this.householdSize,
    required this.assignedOrganization,
    required this.items,
    required this.timeline,
    this.lastUpdatedOn,
    this.assessmentDate,
    this.statusNote,
    this.attachments = const [],
    this.location,
    this.locationDetails,
    this.canEdit = false,
    this.canCancel = false,
    this.cancelReason,
  });

  final String id;
  final String referenceNumber;
  final String title;
  final String category;
  final String description;
  final DateTime submittedOn;
  final DateTime? lastUpdatedOn;
  final AssistanceRequestStatus status;
  final NeedsAssessmentStatus needsAssessment;
  final DateTime? assessmentDate;
  final String urgency;
  final int householdSize;
  final String assignedOrganization;
  final List<String> items;
  final List<RequestTimelineEntry> timeline;
  final String? statusNote;

  /// Proof documents the beneficiary attached when filing.
  final List<RequestAttachment> attachments;

  /// Where the assistance is needed, pinned on the form's map.
  final LatLng? location;

  /// Landmark or address details typed beside the pin.
  final String? locationDetails;

  /// The server's call: true until the relief desk starts screening it.
  final bool canEdit;

  /// The server's call: true until it is completed, declined, or cancelled.
  final bool canCancel;

  /// Why the beneficiary withdrew it, when they said.
  final String? cancelReason;

  String get submittedOnLabel => formatRequestDate(submittedOn);

  String get lastUpdatedLabel =>
      lastUpdatedOn == null ? '—' : formatRequestDate(lastUpdatedOn!);

  String get assessmentDateLabel => assessmentDate == null
      ? 'Not scheduled'
      : formatRequestDate(assessmentDate!);
}

String formatRequestDate(DateTime date) {
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
  return '${months[date.month - 1]} ${date.day}, ${date.year}';
}

/// Assistance categories on the Request Assistance form, keyed to the
/// server's `AssistanceCategory` codes.
const kAssistanceCategoryCodes = {
  'Food': 'FOOD',
  'Medical Assistance': 'MEDICAL',
  'Educational Support': 'EDUCATION',
  'Financial Assistance': 'FINANCIAL',
  'Livelihood': 'LIVELIHOOD',
  'Disaster Relief': 'DISASTER_RELIEF',
};

final kAssistanceCategories = kAssistanceCategoryCodes.keys.toList();

/// Urgency choices, keyed to the server's `AssistanceUrgency` codes.
const kAssistanceUrgencyCodes = {
  'Low': 'LOW',
  'Normal': 'NORMAL',
  'High': 'HIGH',
  'Urgent': 'URGENT',
};

final kAssistanceUrgencyLevels = kAssistanceUrgencyCodes.keys.toList();

/// "What do you need?" choices on the Request Assistance form. Picking
/// [kOtherOption] reveals a free-text field for the beneficiary's own need.
const kAssistanceNeedOptions = [
  'Food Pack',
  'Medicine / medical check-up',
  'School supplies',
  'Financial Allowance',
  'Training',
  'Emergency relief goods',
  kOtherOption,
];

String _labelFor(Map<String, String> codes, String? code) {
  for (final entry in codes.entries) {
    if (entry.value == code) return entry.key;
  }
  return code ?? '';
}

DateTime? _parseDate(Object? value) =>
    value is String ? DateTime.tryParse(value)?.toLocal() : null;

LatLng? _parseLocation(Object? latitude, Object? longitude) =>
    latitude is num && longitude is num
    ? LatLng(latitude.toDouble(), longitude.toDouble())
    : null;

/// One row of `GET /assistance-requests/me`.
AssistanceRequest assistanceRequestFromJson(Map<String, dynamic> json) {
  return AssistanceRequest(
    id: json['assistance_request_id'] as String,
    referenceNumber: json['reference_label'] as String? ?? '',
    title: json['title'] as String? ?? '',
    category: _labelFor(kAssistanceCategoryCodes, json['category'] as String?),
    description: json['description'] as String? ?? '',
    submittedOn: _parseDate(json['created_at']) ?? DateTime.now(),
    lastUpdatedOn: _parseDate(json['updated_at']),
    status: switch (json['status'] as String?) {
      'UNDER_REVIEW' => AssistanceRequestStatus.underReview,
      'APPROVED' => AssistanceRequestStatus.approved,
      'COMPLETED' => AssistanceRequestStatus.completed,
      'DECLINED' => AssistanceRequestStatus.declined,
      'CANCELLED' => AssistanceRequestStatus.cancelled,
      _ => AssistanceRequestStatus.pending,
    },
    needsAssessment: switch (json['assessment_status'] as String?) {
      'SCHEDULED' => NeedsAssessmentStatus.scheduled,
      'IN_PROGRESS' => NeedsAssessmentStatus.inProgress,
      'COMPLETED' => NeedsAssessmentStatus.completed,
      _ => NeedsAssessmentStatus.notStarted,
    },
    assessmentDate: _parseDate(json['assessment_date']),
    urgency: _labelFor(kAssistanceUrgencyCodes, json['urgency'] as String?),
    householdSize: json['household_size'] as int? ?? 1,
    assignedOrganization:
        json['assigned_organization'] as String? ?? 'Not yet assigned',
    items: [
      for (final item in json['items'] as List<dynamic>? ?? const [])
        item as String,
    ],
    statusNote: json['status_note'] as String?,
    location: _parseLocation(
      json['location_latitude'],
      json['location_longitude'],
    ),
    locationDetails: json['location_details'] as String?,
    canEdit: json['can_edit'] as bool? ?? false,
    canCancel: json['can_cancel'] as bool? ?? false,
    cancelReason: json['cancel_reason'] as String?,
    attachments: [
      for (final file in json['attachments'] as List<dynamic>? ?? const [])
        RequestAttachment(
          name: (file as Map<String, dynamic>)['name'] as String? ?? '',
          path: file['url'] as String? ?? '',
          sizeBytes: file['size_bytes'] as int?,
        ),
    ],
    timeline: [
      for (final entry in json['timeline'] as List<dynamic>? ?? const [])
        RequestTimelineEntry(
          label: (entry as Map<String, dynamic>)['label'] as String? ?? '',
          date: _parseDate(entry['date']),
          done: entry['done'] as bool? ?? false,
          note: entry['note'] as String?,
        ),
    ],
  );
}

/// Where the beneficiary stands with the Needs Assessment Survey — the
/// self-reported questionnaire about household needs and community concerns
/// that later feeds the community needs clustering model.
enum BeneficiaryAssessmentState { notCompleted, completed, needsUpdate }

extension BeneficiaryAssessmentStateX on BeneficiaryAssessmentState {
  String get label => switch (this) {
    BeneficiaryAssessmentState.notCompleted => 'Not completed yet',
    BeneficiaryAssessmentState.completed => 'Assessment completed',
    BeneficiaryAssessmentState.needsUpdate => 'Update your assessment',
  };

  bool get hasSubmission => this != BeneficiaryAssessmentState.notCompleted;
}

/// Option lists for the Needs Assessment Survey. "Other" is always last and
/// prompts for a free-text entry when selected.
const kOtherOption = 'Other';

/// Q1 — what the household currently needs help with (select all that apply).
const kHouseholdNeedOptions = [
  'Food',
  'Healthcare',
  'Education',
  'Livelihood',
  'Financial Assistance',
  kOtherOption,
];

/// Q2 — how serious the most important need is (single choice).
const kNeedSeriousnessOptions = [
  'Not serious',
  'Slightly serious',
  'Moderately serious',
  'Serious',
  'Very serious',
];

/// Q3 — what makes it difficult to meet the need (select all that apply).
/// [kNoDifficultyOption] is exclusive: picking it clears every other choice.
const kNoDifficultyOption = 'No difficulty';

const kNeedBarrierOptions = [
  'Lack of money',
  'Lack of available services',
  'Distance',
  'Lack of information',
  'Lack of required documents',
  'Limited opportunities',
  kOtherOption,
  kNoDifficultyOption,
];

/// Q4 — the problem most commonly observed in the community (single choice).
const kCommunityProblemOptions = [
  'Food',
  'Healthcare',
  'Education',
  'Livelihood',
  'Financial Assistance',
  'Environmental',
  kOtherOption,
];

/// The structured answers of one Needs Assessment Survey — the shape that
/// the community needs clustering model will later consume.
class NeedsAssessmentResponse {
  const NeedsAssessmentResponse({
    required this.householdNeeds,
    this.otherHouseholdNeed = '',
    required this.seriousness,
    required this.barriers,
    this.otherBarrier = '',
    required this.communityProblem,
    this.otherCommunityProblem = '',
    this.additionalConcern = '',
  });

  /// Q1 — everything the household needs help with.
  final List<String> householdNeeds;
  final String otherHouseholdNeed;

  /// Q2 — how serious the most important need is.
  final String seriousness;

  /// Q3 — what makes it difficult to meet that need.
  final List<String> barriers;
  final String otherBarrier;

  /// Q4 — the problem most commonly observed in the community.
  final String communityProblem;
  final String otherCommunityProblem;

  /// Q5 — another need or concern for CARES to know about.
  final String additionalConcern;

  /// Display helpers that swap "Other" for what the beneficiary typed.
  String get householdNeedsLabel =>
      _joinWithOther(householdNeeds, otherHouseholdNeed);

  String get barriersLabel => _joinWithOther(barriers, otherBarrier);

  String get communityProblemLabel =>
      _withOther(communityProblem, otherCommunityProblem);

  static String _withOther(String value, String other) =>
      value == kOtherOption && other.trim().isNotEmpty
      ? 'Other — ${other.trim()}'
      : value;

  static String _joinWithOther(List<String> values, String other) =>
      values.map((v) => _withOther(v, other)).join(', ');
}

/// The beneficiary's own Needs Assessment Survey record.
class NeedsAssessmentSummary {
  const NeedsAssessmentSummary({
    required this.state,
    this.submittedOn,
    this.updateAvailable = false,
    this.response,
  });

  final BeneficiaryAssessmentState state;
  final DateTime? submittedOn;

  /// Whether the beneficiary may revise the submitted assessment.
  final bool updateAvailable;

  /// Submitted answers, null until the survey is completed.
  final NeedsAssessmentResponse? response;

  bool get canUpdate =>
      state == BeneficiaryAssessmentState.needsUpdate || updateAvailable;

  String get submittedOnLabel => submittedOn == null
      ? 'Not yet submitted'
      : formatRequestDate(submittedOn!);
}

/// Survey answers ↔ the codes `v1/residential-needs/me` stores — the same
/// codes the portal's needs clustering works on.
const _kHouseholdNeedCodes = {
  'Food': 'food',
  'Healthcare': 'healthcare',
  'Education': 'education',
  'Livelihood': 'livelihood',
  'Financial Assistance': 'financial',
  kOtherOption: 'other',
};

const _kNeedBarrierCodes = {
  'Lack of money': 'money',
  'Lack of available services': 'services',
  'Distance': 'distance',
  'Lack of information': 'information',
  'Lack of required documents': 'documents',
  'Limited opportunities': 'opportunities',
  kOtherOption: 'other',
  kNoDifficultyOption: 'none',
};

const _kCommunityProblemCodes = {
  'Food': 'food',
  'Healthcare': 'healthcare',
  'Education': 'education',
  'Livelihood': 'livelihood',
  'Financial Assistance': 'financial',
  'Environmental': 'environmental',
  kOtherOption: 'other',
};

String? _nullIfBlank(String value) {
  final trimmed = value.trim();
  return trimmed.isEmpty ? null : trimmed;
}

/// Body of `PUT /residential-needs/me`. Seriousness goes up as 1–5.
Map<String, dynamic> needsAssessmentToJson(NeedsAssessmentResponse r) => {
  'needs': [for (final n in r.householdNeeds) _kHouseholdNeedCodes[n] ?? n],
  'other_need': r.householdNeeds.contains(kOtherOption)
      ? _nullIfBlank(r.otherHouseholdNeed)
      : null,
  'seriousness': kNeedSeriousnessOptions.indexOf(r.seriousness) + 1,
  'barriers': [for (final b in r.barriers) _kNeedBarrierCodes[b] ?? b],
  'other_barrier': r.barriers.contains(kOtherOption)
      ? _nullIfBlank(r.otherBarrier)
      : null,
  'community_problem':
      _kCommunityProblemCodes[r.communityProblem] ?? r.communityProblem,
  'other_community_problem': r.communityProblem == kOtherOption
      ? _nullIfBlank(r.otherCommunityProblem)
      : null,
  'concern': _nullIfBlank(r.additionalConcern),
};

NeedsAssessmentResponse _needsAssessmentFromJson(Map<String, dynamic> json) {
  final seriousness = json['seriousness'] as int? ?? 0;
  final inRange =
      seriousness >= 1 && seriousness <= kNeedSeriousnessOptions.length;
  return NeedsAssessmentResponse(
    householdNeeds: [
      for (final code in json['needs'] as List<dynamic>? ?? const [])
        _labelFor(_kHouseholdNeedCodes, code as String),
    ],
    otherHouseholdNeed: json['other_need'] as String? ?? '',
    seriousness: inRange ? kNeedSeriousnessOptions[seriousness - 1] : '',
    barriers: [
      for (final code in json['barriers'] as List<dynamic>? ?? const [])
        _labelFor(_kNeedBarrierCodes, code as String),
    ],
    otherBarrier: json['other_barrier'] as String? ?? '',
    communityProblem: _labelFor(
      _kCommunityProblemCodes,
      json['community_problem'] as String?,
    ),
    otherCommunityProblem: json['other_community_problem'] as String? ?? '',
    additionalConcern: json['concern'] as String? ?? '',
  );
}

/// `{ assessment }` from `v1/residential-needs/me` → the card's summary.
NeedsAssessmentSummary needsAssessmentSummaryFromJson(
  Map<String, dynamic> data,
) {
  final assessment = data['assessment'] as Map<String, dynamic>?;
  if (assessment == null) {
    return const NeedsAssessmentSummary(
      state: BeneficiaryAssessmentState.notCompleted,
    );
  }
  return NeedsAssessmentSummary(
    state: BeneficiaryAssessmentState.completed,
    submittedOn: _parseDate(assessment['submitted_at']),
    updateAvailable: true,
    response: _needsAssessmentFromJson(assessment),
  );
}

/// Shared load/error bookkeeping for the beneficiary's server-backed stores.
/// The stores are app-wide singletons, so whatever they hold is tied to the
/// access token it was fetched with — a different sign-in starts empty.
abstract class _AccountScopedStore extends ChangeNotifier {
  String? _owner;
  bool _isLoading = false;
  bool _hasLoaded = false;
  String? _error;

  bool get isLoading => _isLoading;

  /// Whether this account's data has come back at least once.
  bool get hasLoaded => _hasLoaded && _owner == AuthSession.accessToken;

  /// Message from the last failed load, cleared by the next attempt.
  String? get error => _error;

  void _reset();

  void _claimForCurrentAccount() {
    final token = AuthSession.accessToken;
    if (_owner == token) return;
    _owner = token;
    _hasLoaded = false;
    _error = null;
    _reset();
  }

  Future<void> _run(Future<void> Function() fetch, String fallback) async {
    _claimForCurrentAccount();
    if (_isLoading) return;
    _isLoading = true;
    _error = null;
    notifyListeners();
    try {
      await fetch();
      _hasLoaded = true;
    } on ApiException catch (e) {
      _error = e.message;
    } catch (_) {
      _error = fallback;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}

/// The beneficiary's Needs Assessment Survey, read from and saved to
/// `v1/residential-needs/me`. Shows the "not taken yet" state until [load]
/// returns.
class NeedsAssessmentStore extends _AccountScopedStore {
  NeedsAssessmentStore._();

  static final NeedsAssessmentStore instance = NeedsAssessmentStore._();

  static const _empty = NeedsAssessmentSummary(
    state: BeneficiaryAssessmentState.notCompleted,
  );

  final NeedsAssessmentService _service = NeedsAssessmentService();

  NeedsAssessmentSummary _summary = _empty;

  NeedsAssessmentSummary get summary {
    _claimForCurrentAccount();
    return _summary;
  }

  @override
  void _reset() => _summary = _empty;

  Future<void> load() => _run(() async {
    _summary = await _service.fetchMine();
  }, 'Could not load your needs assessment.');

  /// Saves the answers — the first take or an update. Throws [ApiException]
  /// when the server rejects them; the stored survey is left as it was.
  Future<void> submit(NeedsAssessmentResponse response) async {
    _claimForCurrentAccount();
    _summary = await _service.submit(response);
    _hasLoaded = true;
    notifyListeners();
  }
}

/// The beneficiary's assistance requests from `v1/assistance-requests/me`.
class AssistanceRequestStore extends _AccountScopedStore {
  AssistanceRequestStore._();

  static final AssistanceRequestStore instance = AssistanceRequestStore._();

  final AssistanceRequestService _service = AssistanceRequestService();

  List<AssistanceRequest> _requests = const [];

  @override
  void _reset() => _requests = const [];

  /// Newest first.
  List<AssistanceRequest> get requests {
    _claimForCurrentAccount();
    return List.unmodifiable(
      [..._requests]..sort((a, b) => b.submittedOn.compareTo(a.submittedOn)),
    );
  }

  List<AssistanceRequest> get currentRequests =>
      requests.where((r) => r.status.isCurrent).toList();

  List<AssistanceRequest> get approvedRequests => requests
      .where((r) => r.status == AssistanceRequestStatus.approved)
      .toList();

  List<AssistanceRequest> get completedRequests => requests
      .where((r) => r.status == AssistanceRequestStatus.completed)
      .toList();

  /// Everything the beneficiary has ever filed, newest first.
  List<AssistanceRequest> get history => requests;

  Future<void> load() => _run(() async {
    _requests = await _service.fetchMine();
  }, 'Could not load your requests.');

  /// Files a request with its proof documents. Throws [ApiException] when
  /// the server rejects it.
  Future<AssistanceRequest> submit({
    required String title,
    required String category,
    required String description,
    required String urgency,
    LatLng? location,
    String? locationDetails,
    List<RequestAttachment> attachments = const [],
  }) async {
    _claimForCurrentAccount();
    final request = await _service.create(
      title: title,
      categoryCode: kAssistanceCategoryCodes[category] ?? category,
      description: description,
      urgencyCode: kAssistanceUrgencyCodes[urgency] ?? urgency,
      location: location,
      locationDetails: locationDetails,
      attachments: attachments,
    );
    _requests = [request, ..._requests];
    notifyListeners();
    return request;
  }

  /// Saves an edit of a request the relief desk has not picked up yet.
  /// Throws [ApiException] when the server refuses (e.g. it was just
  /// screened); the stored request is left as it was.
  Future<AssistanceRequest> update(
    String id, {
    required String title,
    required String category,
    required String description,
    required String urgency,
    LatLng? location,
    String? locationDetails,
  }) async {
    _claimForCurrentAccount();
    final request = await _service.update(
      id,
      title: title,
      categoryCode: kAssistanceCategoryCodes[category] ?? category,
      description: description,
      urgencyCode: kAssistanceUrgencyCodes[urgency] ?? urgency,
      location: location,
      locationDetails: locationDetails,
    );
    _replace(request);
    return request;
  }

  /// Withdraws a request that has not been completed. Throws [ApiException]
  /// when the server refuses.
  Future<AssistanceRequest> cancel(String id, {String? reason}) async {
    _claimForCurrentAccount();
    final request = await _service.cancel(id, reason: reason);
    _replace(request);
    return request;
  }

  void _replace(AssistanceRequest request) {
    _requests = [for (final r in _requests) r.id == request.id ? request : r];
    notifyListeners();
  }
}
