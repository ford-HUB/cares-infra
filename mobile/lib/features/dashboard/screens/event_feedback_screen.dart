import 'package:flutter/material.dart';

import '../../../core/services/api_client.dart';
import '../../../core/session/static_user_session.dart';
import '../../../core/theme/app_theme.dart';
import '../data/event_evaluation_service.dart';
import '../data/event_feedback_store.dart';
import '../data/models/event_evaluation_models.dart';
import '../domain/cares_event.dart';

/// Post-event feedback form. The questions are whatever the director
/// published in the portal's Evaluation questionnaire; submitting here
/// records the answers server-side and unlocks the event certificate.
class EventFeedbackScreen extends StatefulWidget {
  const EventFeedbackScreen({super.key, required this.event});

  final CaresEvent event;

  /// Returns `true` when feedback was submitted.
  static Future<bool> open(BuildContext context, CaresEvent event) async {
    final submitted = await Navigator.of(context).push<bool>(
      MaterialPageRoute<bool>(
        builder: (_) => EventFeedbackScreen(event: event),
      ),
    );
    return submitted ?? false;
  }

  @override
  State<EventFeedbackScreen> createState() => _EventFeedbackScreenState();
}

class _EventFeedbackScreenState extends State<EventFeedbackScreen> {
  final _store = EventFeedbackStore.instance;
  final _service = EventEvaluationService();

  /// Answers keyed by question id, in the shape the server stores them:
  /// a string, a list of strings, or a number.
  final Map<String, dynamic> _answers = {};

  EventEvaluation? _evaluation;
  bool _loading = true;
  String? _loadError;
  bool _isSubmitting = false;
  bool _showValidation = false;

  String get _participantEmail =>
      StaticUserSession.instance.currentUser?.email ?? 'guest@cares.local';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final serverId = widget.event.serverId;
    if (serverId == null) {
      setState(() {
        _loading = false;
        _loadError = 'This event is not available for feedback.';
      });
      return;
    }
    setState(() {
      _loading = true;
      _loadError = null;
    });
    try {
      final evaluation = await _service.fetchForEvent(serverId);
      if (!mounted) return;
      setState(() {
        _evaluation = evaluation;
        _loading = false;
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _loadError = e.message;
      });
    }
  }

  List<EvaluationQuestion> get _questions =>
      _evaluation?.form?.questions ?? const [];

  /// A question counts as answered when the value is non-empty for its type.
  bool _isAnswered(EvaluationQuestion q) {
    final value = _answers[q.id];
    if (value == null) return false;
    if (value is String) return value.trim().isNotEmpty;
    if (value is List) return value.isNotEmpty;
    return true;
  }

  List<EvaluationQuestion> get _missingRequired =>
      _questions.where((q) => q.required && !_isAnswered(q)).toList();

  bool get _canSubmit =>
      (_evaluation?.canSubmit ?? false) &&
      _questions.isNotEmpty &&
      _missingRequired.isEmpty;

  void _setAnswer(String id, dynamic value) {
    setState(() {
      if (value == null || (value is String && value.trim().isEmpty)) {
        _answers.remove(id);
      } else {
        _answers[id] = value;
      }
    });
  }

  Future<void> _submit() async {
    final evaluation = _evaluation;
    final serverId = widget.event.serverId;
    if (evaluation == null || serverId == null || _isSubmitting) return;
    if (_missingRequired.isNotEmpty) {
      setState(() => _showValidation = true);
      return;
    }

    setState(() => _isSubmitting = true);
    try {
      final submission = await _service.submit(serverId, {
        for (final q in _questions)
          if (_answers.containsKey(q.id)) q.id: _answers[q.id],
      });
      if (!mounted) return;
      _store.markSubmitted(
        eventId: widget.event.id,
        participantEmail: _participantEmail,
        submittedAt: submission.submittedAt,
        answers: submission.answers,
      );
      setState(() => _isSubmitting = false);
      await showFeedbackThankYouDialog(context, widget.event);
      if (!mounted) return;
      Navigator.of(context).pop(true);
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _isSubmitting = false);
      // Already submitted elsewhere: mirror the server rather than retry.
      if (e.statusCode == 409) {
        _store.markSubmitted(
          eventId: widget.event.id,
          participantEmail: _participantEmail,
          submittedAt: DateTime.now(),
        );
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.message), behavior: SnackBarBehavior.floating),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Submit Feedback'),
        centerTitle: true,
        backgroundColor: AppColors.background,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _loadError != null
          ? _MessageState(
              icon: Icons.cloud_off_rounded,
              title: 'Could not load the questionnaire',
              message: _loadError!,
              actionLabel: 'Try again',
              onAction: _load,
            )
          : _buildLoaded(context, _evaluation!),
    );
  }

  Widget _buildLoaded(BuildContext context, EventEvaluation evaluation) {
    final form = evaluation.form;
    if (evaluation.submission != null) {
      return _MessageState(
        icon: Icons.task_alt_rounded,
        title: 'Feedback already submitted',
        message:
            'Thanks — your answers for ${evaluation.eventTitle} are on '
            'record. Your certificate is unlocked.',
        actionLabel: 'Back',
        onAction: () => Navigator.of(context).pop(false),
      );
    }
    if (form == null || form.questions.isEmpty) {
      return _MessageState(
        icon: Icons.hourglass_top_rounded,
        title: 'Questionnaire not ready yet',
        message:
            'The CARES office has not published the feedback form for this '
            'event. Check back a little later.',
        actionLabel: 'Refresh',
        onAction: _load,
      );
    }
    if (!evaluation.canSubmit) {
      return _MessageState(
        icon: Icons.lock_clock_rounded,
        title: 'Feedback not open',
        message: evaluation.eventStatus == 'Completed'
            ? 'Only volunteers who took part in this event can give feedback.'
            : 'Feedback opens once the event has been marked as completed.',
        actionLabel: 'Back',
        onAction: () => Navigator.of(context).pop(false),
      );
    }

    final missing = _missingRequired;
    return Column(
      children: [
        Expanded(
          child: ListView(
            keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
            children: [
              Text(
                form.title,
                style: const TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w800,
                  color: AppColors.textPrimary,
                  height: 1.25,
                ),
              ),
              if (form.description.trim().isNotEmpty) ...[
                const SizedBox(height: 6),
                Text(
                  form.description,
                  style: const TextStyle(
                    fontSize: 13,
                    height: 1.5,
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
              const SizedBox(height: 6),
              Text(
                evaluation.eventTitle,
                style: const TextStyle(
                  fontSize: 12.5,
                  fontWeight: FontWeight.w700,
                  color: AppColors.primary,
                ),
              ),
              const SizedBox(height: 18),
              for (var i = 0; i < form.questions.length; i++) ...[
                if (i > 0) const SizedBox(height: 14),
                _QuestionCard(
                  index: i + 1,
                  question: form.questions[i],
                  value: _answers[form.questions[i].id],
                  showError:
                      _showValidation &&
                      form.questions[i].required &&
                      !_isAnswered(form.questions[i]),
                  onChanged: (value) => _setAnswer(form.questions[i].id, value),
                ),
              ],
            ],
          ),
        ),
        SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 4, 20, 16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (missing.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: Text(
                      '${missing.length} required '
                      '${missing.length == 1 ? 'question' : 'questions'} left.',
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 12,
                        color: AppColors.textMuted,
                      ),
                    ),
                  ),
                FilledButton.icon(
                  onPressed: _isSubmitting ? null : _submit,
                  icon: _isSubmitting
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Icon(Icons.send_rounded),
                  label: Text(
                    _isSubmitting ? 'Submitting...' : 'Submit Feedback',
                  ),
                  style: FilledButton.styleFrom(
                    backgroundColor: _canSubmit
                        ? AppColors.primary
                        : AppColors.primary.withValues(alpha: 0.55),
                    minimumSize: const Size.fromHeight(52),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

/// Full-screen notice for the states where there is nothing to fill in.
class _MessageState extends StatelessWidget {
  const _MessageState({
    required this.icon,
    required this.title,
    required this.message,
    required this.actionLabel,
    required this.onAction,
  });

  final IconData icon;
  final String title;
  final String message;
  final String actionLabel;
  final VoidCallback onAction;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, size: 30, color: AppColors.primary),
            ),
            const SizedBox(height: 18),
            Text(
              title,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w800,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              message,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 13.5,
                height: 1.5,
                color: AppColors.textSecondary,
              ),
            ),
            const SizedBox(height: 20),
            OutlinedButton(
              onPressed: onAction,
              style: OutlinedButton.styleFrom(
                foregroundColor: AppColors.primary,
                side: const BorderSide(color: AppColors.primary),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: Text(actionLabel),
            ),
          ],
        ),
      ),
    );
  }
}

/// One question in its own card, with the input the question type calls for.
class _QuestionCard extends StatelessWidget {
  const _QuestionCard({
    required this.index,
    required this.question,
    required this.value,
    required this.showError,
    required this.onChanged,
  });

  final int index;
  final EvaluationQuestion question;
  final dynamic value;
  final bool showError;
  final ValueChanged<dynamic> onChanged;

  @override
  Widget build(BuildContext context) {
    final borderColor = showError ? AppColors.heart : AppColors.inputFill;
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: borderColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text.rich(
            TextSpan(
              text: question.title.trim().isEmpty
                  ? 'Question $index'
                  : question.title,
              style: const TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w700,
                color: AppColors.textPrimary,
                height: 1.35,
              ),
              children: [
                if (question.required)
                  const TextSpan(
                    text: ' *',
                    style: TextStyle(color: AppColors.heart),
                  ),
              ],
            ),
          ),
          if (question.description.trim().isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(
              question.description,
              style: const TextStyle(
                fontSize: 12,
                color: AppColors.textSecondary,
                height: 1.4,
              ),
            ),
          ],
          const SizedBox(height: 10),
          _buildInput(context),
          if (showError) ...[
            const SizedBox(height: 8),
            const Text(
              'This question is required.',
              style: TextStyle(
                fontSize: 11.5,
                fontWeight: FontWeight.w600,
                color: AppColors.heart,
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildInput(BuildContext context) {
    switch (question.type) {
      case EvaluationQuestionType.shortAnswer:
        return _TextAnswer(
          value: value as String?,
          maxLines: 1,
          maxLength: 200,
          hint: 'Your answer',
          onChanged: onChanged,
        );
      case EvaluationQuestionType.paragraph:
        return _TextAnswer(
          value: value as String?,
          maxLines: 5,
          maxLength: 1000,
          hint: 'Share your thoughts...',
          onChanged: onChanged,
        );
      case EvaluationQuestionType.multipleChoice:
        return RadioGroup<String>(
          groupValue: value as String?,
          onChanged: onChanged,
          child: Column(
            children: [
              for (final option in question.options)
                RadioListTile<String>(
                  value: option,
                  title: Text(option, style: const TextStyle(fontSize: 14)),
                  dense: true,
                  contentPadding: EdgeInsets.zero,
                  activeColor: AppColors.primary,
                ),
            ],
          ),
        );
      case EvaluationQuestionType.checkboxes:
        final selected = (value as List?)?.cast<String>() ?? const <String>[];
        return Column(
          children: [
            for (final option in question.options)
              CheckboxListTile(
                value: selected.contains(option),
                onChanged: (checked) {
                  final next = [...selected];
                  if (checked == true) {
                    if (!next.contains(option)) next.add(option);
                  } else {
                    next.remove(option);
                  }
                  onChanged(next);
                },
                title: Text(option, style: const TextStyle(fontSize: 14)),
                dense: true,
                contentPadding: EdgeInsets.zero,
                controlAffinity: ListTileControlAffinity.leading,
                activeColor: AppColors.primary,
              ),
          ],
        );
      case EvaluationQuestionType.dropdown:
        return DropdownButtonFormField<String>(
          initialValue: value as String?,
          items: [
            for (final option in question.options)
              DropdownMenuItem(value: option, child: Text(option)),
          ],
          onChanged: onChanged,
          decoration: _fieldDecoration('Choose one'),
        );
      case EvaluationQuestionType.linearScale:
        return _ScaleAnswer(
          question: question,
          value: value as int?,
          onChanged: onChanged,
        );
      case EvaluationQuestionType.starRating:
        return _StarAnswer(
          question: question,
          value: value as int?,
          onChanged: onChanged,
        );
      case EvaluationQuestionType.date:
        return _DateAnswer(value: value as String?, onChanged: onChanged);
    }
  }
}

InputDecoration _fieldDecoration(String hint) => InputDecoration(
  hintText: hint,
  filled: true,
  fillColor: AppColors.background,
  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
  border: OutlineInputBorder(
    borderRadius: BorderRadius.circular(12),
    borderSide: const BorderSide(color: AppColors.inputFill),
  ),
  enabledBorder: OutlineInputBorder(
    borderRadius: BorderRadius.circular(12),
    borderSide: const BorderSide(color: AppColors.inputFill),
  ),
  focusedBorder: OutlineInputBorder(
    borderRadius: BorderRadius.circular(12),
    borderSide: const BorderSide(color: AppColors.primary),
  ),
);

class _TextAnswer extends StatefulWidget {
  const _TextAnswer({
    required this.value,
    required this.maxLines,
    required this.maxLength,
    required this.hint,
    required this.onChanged,
  });

  final String? value;
  final int maxLines;
  final int maxLength;
  final String hint;
  final ValueChanged<dynamic> onChanged;

  @override
  State<_TextAnswer> createState() => _TextAnswerState();
}

class _TextAnswerState extends State<_TextAnswer> {
  late final _controller = TextEditingController(text: widget.value ?? '');

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: _controller,
      maxLines: widget.maxLines,
      maxLength: widget.maxLength,
      textInputAction: widget.maxLines == 1
          ? TextInputAction.done
          : TextInputAction.newline,
      onChanged: widget.onChanged,
      decoration: _fieldDecoration(widget.hint).copyWith(counterText: ''),
    );
  }
}

/// 1..N buttons in a row with the director's end labels underneath.
class _ScaleAnswer extends StatelessWidget {
  const _ScaleAnswer({
    required this.question,
    required this.value,
    required this.onChanged,
  });

  final EvaluationQuestion question;
  final int? value;
  final ValueChanged<dynamic> onChanged;

  @override
  Widget build(BuildContext context) {
    final max = question.scaleMax.clamp(2, 10);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            for (var step = 1; step <= max; step++) ...[
              if (step > 1) const SizedBox(width: 6),
              Expanded(
                child: InkWell(
                  onTap: () => onChanged(step),
                  borderRadius: BorderRadius.circular(10),
                  child: Container(
                    height: 40,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: value == step
                          ? AppColors.primary
                          : AppColors.background,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                        color: value == step
                            ? AppColors.primary
                            : AppColors.inputFill,
                      ),
                    ),
                    child: Text(
                      '$step',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: value == step
                            ? Colors.white
                            : AppColors.textPrimary,
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ],
        ),
        if (question.scaleMinLabel.isNotEmpty ||
            question.scaleMaxLabel.isNotEmpty) ...[
          const SizedBox(height: 6),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                question.scaleMinLabel,
                style: const TextStyle(
                  fontSize: 11.5,
                  color: AppColors.textMuted,
                ),
              ),
              Text(
                question.scaleMaxLabel,
                style: const TextStyle(
                  fontSize: 11.5,
                  color: AppColors.textMuted,
                ),
              ),
            ],
          ),
        ],
      ],
    );
  }
}

class _StarAnswer extends StatelessWidget {
  const _StarAnswer({
    required this.question,
    required this.value,
    required this.onChanged,
  });

  final EvaluationQuestion question;
  final int? value;
  final ValueChanged<dynamic> onChanged;

  @override
  Widget build(BuildContext context) {
    final max = question.scaleMax.clamp(3, 10);
    final current = value ?? 0;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: List.generate(max, (index) {
            final star = index + 1;
            final filled = star <= current;
            return Expanded(
              child: IconButton(
                onPressed: () => onChanged(star),
                visualDensity: VisualDensity.compact,
                padding: EdgeInsets.zero,
                tooltip: '$star star${star == 1 ? '' : 's'}',
                icon: Icon(
                  filled ? Icons.star_rounded : Icons.star_outline_rounded,
                  size: max > 6 ? 24 : 32,
                  color: filled ? AppColors.accentOrange : AppColors.textMuted,
                ),
              ),
            );
          }),
        ),
        if (question.scaleMinLabel.isNotEmpty ||
            question.scaleMaxLabel.isNotEmpty)
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                question.scaleMinLabel,
                style: const TextStyle(
                  fontSize: 11.5,
                  color: AppColors.textMuted,
                ),
              ),
              Text(
                question.scaleMaxLabel,
                style: const TextStyle(
                  fontSize: 11.5,
                  color: AppColors.textMuted,
                ),
              ),
            ],
          ),
      ],
    );
  }
}

/// Stores the pick as `YYYY-MM-DD`, which is what the portal formats.
class _DateAnswer extends StatelessWidget {
  const _DateAnswer({required this.value, required this.onChanged});

  final String? value;
  final ValueChanged<dynamic> onChanged;

  @override
  Widget build(BuildContext context) {
    final picked = value == null ? null : DateTime.tryParse(value!);
    return OutlinedButton.icon(
      onPressed: () async {
        final now = DateTime.now();
        final date = await showDatePicker(
          context: context,
          initialDate: picked ?? now,
          firstDate: DateTime(now.year - 5),
          lastDate: DateTime(now.year + 5),
        );
        if (date == null) return;
        final y = date.year.toString().padLeft(4, '0');
        final m = date.month.toString().padLeft(2, '0');
        final d = date.day.toString().padLeft(2, '0');
        onChanged('$y-$m-$d');
      },
      icon: const Icon(Icons.calendar_today_rounded, size: 16),
      label: Text(
        picked == null
            ? 'Pick a date'
            : '${picked.month}/${picked.day}/${picked.year}',
      ),
      style: OutlinedButton.styleFrom(
        foregroundColor: picked == null
            ? AppColors.textSecondary
            : AppColors.textPrimary,
        alignment: Alignment.centerLeft,
        side: const BorderSide(color: AppColors.inputFill),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        minimumSize: const Size.fromHeight(44),
      ),
    );
  }
}

/// "Thank you for your feedback!" confirmation shown after submission.
Future<void> showFeedbackThankYouDialog(
  BuildContext context,
  CaresEvent event,
) {
  return showDialog<void>(
    context: context,
    barrierDismissible: false,
    builder: (ctx) => Dialog(
      backgroundColor: AppColors.surface,
      insetPadding: const EdgeInsets.symmetric(horizontal: 28),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(24, 28, 24, 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.12),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.favorite_rounded,
                size: 32,
                color: AppColors.heart,
              ),
            ),
            const SizedBox(height: 20),
            const Text(
              'Thank you for your feedback!',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w800,
                color: AppColors.textPrimary,
                height: 1.25,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              'Your feedback for ${event.title} has been recorded. '
              'Your certificate is now unlocked.',
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 14,
                height: 1.55,
                color: AppColors.textSecondary,
              ),
            ),
            const SizedBox(height: 22),
            FilledButton(
              onPressed: () => Navigator.of(ctx).pop(),
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.primary,
                minimumSize: const Size.fromHeight(48),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: const Text('Continue'),
            ),
          ],
        ),
      ),
    ),
  );
}
