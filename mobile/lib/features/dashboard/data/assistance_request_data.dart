import 'package:flutter/foundation.dart';

/// Lifecycle of a beneficiary assistance request.
enum AssistanceRequestStatus {
  pending,
  underReview,
  approved,
  completed,
  declined,
}

extension AssistanceRequestStatusX on AssistanceRequestStatus {
  String get label => switch (this) {
    AssistanceRequestStatus.pending => 'Pending',
    AssistanceRequestStatus.underReview => 'Under Review',
    AssistanceRequestStatus.approved => 'Approved',
    AssistanceRequestStatus.completed => 'Completed',
    AssistanceRequestStatus.declined => 'Declined',
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
/// certificate, photo of damage, ...). Only the local file reference is kept
/// in the prototype — nothing is uploaded.
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

/// Assistance categories offered to beneficiaries in the prototype.
const kAssistanceCategories = [
  'Food',
  'Medical Assistance',
  'Educational Support',
  'Financial Assistance',
  'Livelihood',
  'Disaster Relief',
];

const kAssistanceUrgencyLevels = ['Low', 'Normal', 'High', 'Urgent'];

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

final _kMockAssistanceRequests = <AssistanceRequest>[
  AssistanceRequest(
    id: 'req-1',
    referenceNumber: 'CARES-AR-2026-0148',
    title: 'Monthly food pack for household',
    category: 'Food & Nutrition',
    description:
        'Requesting a monthly family food pack while our household income is '
        'reduced. Two of the children are still in elementary school.',
    submittedOn: DateTime(2026, 8, 28),
    lastUpdatedOn: DateTime(2026, 9, 1),
    status: AssistanceRequestStatus.pending,
    needsAssessment: NeedsAssessmentStatus.scheduled,
    assessmentDate: DateTime(2026, 9, 8),
    urgency: 'Normal',
    householdSize: 5,
    assignedOrganization: 'CARES Community Relief Desk',
    items: ['Rice (10kg)', 'Canned goods', 'Cooking oil'],
    timeline: [
      RequestTimelineEntry(
        label: 'Request submitted',
        date: DateTime(2026, 8, 28),
        done: true,
      ),
      RequestTimelineEntry(
        label: 'Initial screening',
        date: DateTime(2026, 9, 1),
        done: true,
        note: 'Documents received and verified by the relief desk.',
      ),
      RequestTimelineEntry(
        label: 'Needs assessment visit',
        date: DateTime(2026, 9, 8),
        done: false,
        note: 'A field officer will visit the household.',
      ),
      RequestTimelineEntry(label: 'Approval decision', date: null, done: false),
      RequestTimelineEntry(
        label: 'Assistance released',
        date: null,
        done: false,
      ),
    ],
    statusNote: 'Waiting for the scheduled needs assessment visit.',
  ),
  AssistanceRequest(
    id: 'req-2',
    referenceNumber: 'CARES-AR-2026-0131',
    title: 'Medicine support for maintenance',
    category: 'Medical Assistance',
    description:
        'Monthly maintenance medicine for hypertension and diabetes for two '
        'senior members of the household.',
    submittedOn: DateTime(2026, 8, 12),
    lastUpdatedOn: DateTime(2026, 8, 20),
    status: AssistanceRequestStatus.underReview,
    needsAssessment: NeedsAssessmentStatus.inProgress,
    assessmentDate: DateTime(2026, 8, 22),
    urgency: 'High',
    householdSize: 5,
    assignedOrganization: 'CARES Health Unit',
    items: ['Maintenance medicine', 'Free BP monitoring'],
    timeline: [
      RequestTimelineEntry(
        label: 'Request submitted',
        date: DateTime(2026, 8, 12),
        done: true,
      ),
      RequestTimelineEntry(
        label: 'Initial screening',
        date: DateTime(2026, 8, 15),
        done: true,
      ),
      RequestTimelineEntry(
        label: 'Needs assessment visit',
        date: DateTime(2026, 8, 22),
        done: true,
        note: 'Assessment ongoing — medical records under validation.',
      ),
      RequestTimelineEntry(label: 'Approval decision', date: null, done: false),
      RequestTimelineEntry(
        label: 'Assistance released',
        date: null,
        done: false,
      ),
    ],
    statusNote: 'The health unit is validating the submitted prescriptions.',
  ),
  AssistanceRequest(
    id: 'req-3',
    referenceNumber: 'CARES-AR-2026-0097',
    title: 'School supplies for two students',
    category: 'Educational Support',
    description:
        'School kits and uniforms for two students entering Grades 4 and 7 '
        'this school year.',
    submittedOn: DateTime(2026, 7, 18),
    lastUpdatedOn: DateTime(2026, 8, 2),
    status: AssistanceRequestStatus.approved,
    needsAssessment: NeedsAssessmentStatus.completed,
    assessmentDate: DateTime(2026, 7, 26),
    urgency: 'Normal',
    householdSize: 5,
    assignedOrganization: 'CARES Extension Office',
    items: ['2 school kits', '2 sets of uniforms', 'Notebooks'],
    timeline: [
      RequestTimelineEntry(
        label: 'Request submitted',
        date: DateTime(2026, 7, 18),
        done: true,
      ),
      RequestTimelineEntry(
        label: 'Initial screening',
        date: DateTime(2026, 7, 21),
        done: true,
      ),
      RequestTimelineEntry(
        label: 'Needs assessment visit',
        date: DateTime(2026, 7, 26),
        done: true,
      ),
      RequestTimelineEntry(
        label: 'Approval decision',
        date: DateTime(2026, 8, 2),
        done: true,
        note: 'Approved for release during the school supply drive.',
      ),
      RequestTimelineEntry(
        label: 'Assistance released',
        date: null,
        done: false,
        note: 'Claim at the CARES Extension Office on Sep 12, 2026.',
      ),
    ],
    statusNote: 'Approved — ready for claiming on Sep 12, 2026.',
  ),
  AssistanceRequest(
    id: 'req-4',
    referenceNumber: 'CARES-AR-2026-0054',
    title: 'Roof repair materials after typhoon',
    category: 'Shelter & Repair',
    description:
        'Materials to repair the roof damaged during the storm last quarter.',
    submittedOn: DateTime(2026, 5, 9),
    lastUpdatedOn: DateTime(2026, 6, 14),
    status: AssistanceRequestStatus.completed,
    needsAssessment: NeedsAssessmentStatus.completed,
    assessmentDate: DateTime(2026, 5, 16),
    urgency: 'Urgent',
    householdSize: 5,
    assignedOrganization: 'CARES Disaster Response Team',
    items: ['GI sheets (6)', 'Plywood (4)', 'Nails and sealant'],
    timeline: [
      RequestTimelineEntry(
        label: 'Request submitted',
        date: DateTime(2026, 5, 9),
        done: true,
      ),
      RequestTimelineEntry(
        label: 'Initial screening',
        date: DateTime(2026, 5, 12),
        done: true,
      ),
      RequestTimelineEntry(
        label: 'Needs assessment visit',
        date: DateTime(2026, 5, 16),
        done: true,
      ),
      RequestTimelineEntry(
        label: 'Approval decision',
        date: DateTime(2026, 5, 30),
        done: true,
      ),
      RequestTimelineEntry(
        label: 'Assistance released',
        date: DateTime(2026, 6, 14),
        done: true,
        note: 'Materials received and signed for by the household head.',
      ),
    ],
    statusNote: 'Completed — materials released on Jun 14, 2026.',
  ),
  AssistanceRequest(
    id: 'req-5',
    referenceNumber: 'CARES-AR-2026-0021',
    title: 'Livelihood starter kit',
    category: 'Livelihood',
    description:
        'Sari-sari store starter kit to restart a small neighborhood store.',
    submittedOn: DateTime(2026, 3, 4),
    lastUpdatedOn: DateTime(2026, 3, 27),
    status: AssistanceRequestStatus.declined,
    needsAssessment: NeedsAssessmentStatus.completed,
    assessmentDate: DateTime(2026, 3, 15),
    urgency: 'Low',
    householdSize: 5,
    assignedOrganization: 'CARES Livelihood Program',
    items: ['Starter goods', 'Small capital grant'],
    timeline: [
      RequestTimelineEntry(
        label: 'Request submitted',
        date: DateTime(2026, 3, 4),
        done: true,
      ),
      RequestTimelineEntry(
        label: 'Initial screening',
        date: DateTime(2026, 3, 9),
        done: true,
      ),
      RequestTimelineEntry(
        label: 'Needs assessment visit',
        date: DateTime(2026, 3, 15),
        done: true,
      ),
      RequestTimelineEntry(
        label: 'Approval decision',
        date: DateTime(2026, 3, 27),
        done: true,
        note: 'Batch quota already filled. Reapply in the next cycle.',
      ),
    ],
    statusNote: 'Not approved for this cycle — reapplication is allowed.',
  ),
];

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

/// Static survey content for the prototype. Flip [state] to preview the
/// other card states (`notCompleted`, `completed`, `needsUpdate`).
final kMockNeedsAssessment = NeedsAssessmentSummary(
  state: BeneficiaryAssessmentState.completed,
  submittedOn: DateTime(2026, 7, 26),
  updateAvailable: true,
  response: kMockNeedsAssessmentResponse,
);

const kMockNeedsAssessmentResponse = NeedsAssessmentResponse(
  householdNeeds: ['Food', 'Healthcare', 'Education'],
  seriousness: 'Serious',
  barriers: ['Lack of money', 'Distance'],
  communityProblem: 'Environmental',
  additionalConcern:
      'Our area floods during the rainy season and the nearest health center '
      'is far. One senior in the household needs maintenance medication.',
);

/// In-memory assistance request store for the static prototype phase.
class AssistanceRequestStore extends ChangeNotifier {
  AssistanceRequestStore._();

  static final AssistanceRequestStore instance = AssistanceRequestStore._();

  final List<AssistanceRequest> _requests = [..._kMockAssistanceRequests];

  List<AssistanceRequest> get requests => List.unmodifiable(
    _requests..sort((a, b) => b.submittedOn.compareTo(a.submittedOn)),
  );

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

  AssistanceRequest submit({
    required String title,
    required String category,
    required String description,
    required String urgency,
    required int householdSize,
    List<RequestAttachment> attachments = const [],
  }) {
    final now = DateTime.now();
    final serial = (148 + _requests.length).toString().padLeft(4, '0');
    final request = AssistanceRequest(
      id: 'req-${now.millisecondsSinceEpoch}',
      referenceNumber: 'CARES-AR-${now.year}-$serial',
      title: title,
      category: category,
      description: description,
      submittedOn: now,
      lastUpdatedOn: now,
      status: AssistanceRequestStatus.pending,
      needsAssessment: NeedsAssessmentStatus.notStarted,
      urgency: urgency,
      householdSize: householdSize,
      assignedOrganization: 'CARES Community Relief Desk',
      items: const [],
      attachments: attachments,
      timeline: [
        RequestTimelineEntry(label: 'Request submitted', date: now, done: true),
        const RequestTimelineEntry(
          label: 'Initial screening',
          date: null,
          done: false,
        ),
        const RequestTimelineEntry(
          label: 'Needs assessment visit',
          date: null,
          done: false,
        ),
        const RequestTimelineEntry(
          label: 'Approval decision',
          date: null,
          done: false,
        ),
        const RequestTimelineEntry(
          label: 'Assistance released',
          date: null,
          done: false,
        ),
      ],
      statusNote: 'Submitted — waiting for initial screening.',
    );

    _requests.add(request);
    notifyListeners();
    return request;
  }
}
