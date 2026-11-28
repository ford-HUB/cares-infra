/// Unknown values fall back to [shortAnswer] so a new type never blanks the
/// form.
enum EvaluationQuestionType {
  shortAnswer('short_answer'),
  paragraph('paragraph'),
  multipleChoice('multiple_choice'),
  checkboxes('checkboxes'),
  dropdown('dropdown'),
  linearScale('linear_scale'),
  starRating('star_rating'),
  date('date'),
  imageUpload('image_upload');

  const EvaluationQuestionType(this.wire);

  final String wire;

  static EvaluationQuestionType fromWire(String? value) => values.firstWhere(
    (type) => type.wire == value,
    orElse: () => EvaluationQuestionType.shortAnswer,
  );
}

class EvaluationQuestion {
  const EvaluationQuestion({
    required this.id,
    required this.type,
    required this.title,
    required this.description,
    required this.required,
    required this.options,
    required this.scaleMax,
    required this.scaleMinLabel,
    required this.scaleMaxLabel,
    required this.maxFiles,
  });

  factory EvaluationQuestion.fromJson(Map<String, dynamic> json) {
    return EvaluationQuestion(
      id: json['id'] as String,
      type: EvaluationQuestionType.fromWire(json['type'] as String?),
      title: json['title'] as String? ?? '',
      description: json['description'] as String? ?? '',
      required: json['required'] as bool? ?? false,
      options: (json['options'] as List<dynamic>? ?? const [])
          .map((option) => option.toString())
          .toList(),
      scaleMax: json['scale_max'] as int? ?? 5,
      scaleMinLabel: json['scale_min_label'] as String? ?? '',
      scaleMaxLabel: json['scale_max_label'] as String? ?? '',
      maxFiles: json['max_files'] as int? ?? 1,
    );
  }

  final String id;
  final EvaluationQuestionType type;
  final String title;
  final String description;
  final bool required;

  /// Choices for multiple choice, checkboxes and dropdown.
  final List<String> options;

  /// Upper bound for a linear scale (1–N) or the star count.
  final int scaleMax;
  final String scaleMinLabel;
  final String scaleMaxLabel;

  /// Image upload only: how many photos the volunteer may attach.
  final int maxFiles;
}

/// Assigned per event in the portal's Evaluation → Forms; unassigned events get
/// the default.
class EvaluationForm {
  const EvaluationForm({
    required this.id,
    required this.title,
    required this.description,
    required this.questions,
    required this.isDefault,
  });

  factory EvaluationForm.fromJson(Map<String, dynamic> json) {
    return EvaluationForm(
      id: json['evaluation_form_id'] as String,
      title: json['title'] as String? ?? '',
      description: json['description'] as String? ?? '',
      questions: (json['questions'] as List<dynamic>? ?? const [])
          .map((q) => EvaluationQuestion.fromJson(q as Map<String, dynamic>))
          .toList(),
      isDefault: json['is_default'] as bool? ?? false,
    );
  }

  final String id;
  final String title;
  final String description;
  final List<EvaluationQuestion> questions;

  /// The fallback questionnaire; the screen labels it differently.
  final bool isDefault;
}

class EvaluationSubmission {
  const EvaluationSubmission({
    required this.id,
    required this.submittedAt,
    required this.answers,
  });

  factory EvaluationSubmission.fromJson(Map<String, dynamic> json) {
    return EvaluationSubmission(
      id: json['evaluation_response_id'] as String,
      submittedAt: DateTime.parse(json['submitted_at'] as String).toLocal(),
      answers: Map<String, dynamic>.from(
        json['answers'] as Map<String, dynamic>? ?? const {},
      ),
    );
  }

  final String id;
  final DateTime submittedAt;
  final Map<String, dynamic> answers;
}

/// `GET /evaluation/events/:id`: the questionnaire (assigned or default) and
/// whether this volunteer may still answer.
class EventEvaluation {
  const EventEvaluation({
    required this.eventId,
    required this.eventTitle,
    required this.eventStatus,
    required this.form,
    required this.canSubmit,
    required this.submission,
  });

  factory EventEvaluation.fromJson(Map<String, dynamic> json) {
    final form = json['form'] as Map<String, dynamic>?;
    final submission = json['submission'] as Map<String, dynamic>?;
    return EventEvaluation(
      eventId: json['event_id'] as int,
      eventTitle: json['event_title'] as String? ?? '',
      eventStatus: json['event_status'] as String? ?? 'Upcoming',
      form: form == null ? null : EvaluationForm.fromJson(form),
      canSubmit: json['can_submit'] as bool? ?? false,
      submission: submission == null
          ? null
          : EvaluationSubmission.fromJson(submission),
    );
  }

  final int eventId;
  final String eventTitle;
  final String eventStatus;

  /// Null until the director publishes a questionnaire.
  final EvaluationForm? form;

  /// The server's own gate (event over, took part, form published), shown up
  /// front.
  final bool canSubmit;
  final EvaluationSubmission? submission;
}
