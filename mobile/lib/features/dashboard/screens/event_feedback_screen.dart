import 'package:flutter/material.dart';

import '../../../core/session/static_user_session.dart';
import '../../../core/theme/app_theme.dart';
import '../data/event_feedback_store.dart';
import '../data/mock_events.dart';

/// Post-event feedback form. Submitting here unlocks the event certificate.
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
  final _commentsController = TextEditingController();

  int _overallRating = 0;
  int _organizationRating = 0;
  int _experienceRating = 0;
  bool _isSubmitting = false;

  String get _participantEmail =>
      StaticUserSession.instance.currentUser?.email ?? 'guest@cares.local';

  bool get _canSubmit =>
      _overallRating > 0 && _organizationRating > 0 && _experienceRating > 0;

  @override
  void dispose() {
    _commentsController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_canSubmit || _isSubmitting) return;

    setState(() => _isSubmitting = true);

    // Mock submission delay — no backend call in the prototype.
    await Future<void>.delayed(const Duration(milliseconds: 400));
    if (!mounted) return;

    _store.submit(
      eventId: widget.event.id,
      participantEmail: _participantEmail,
      overallRating: _overallRating,
      organizationRating: _organizationRating,
      volunteerExperienceRating: _experienceRating,
      comments: _commentsController.text,
    );

    setState(() => _isSubmitting = false);

    await showFeedbackThankYouDialog(context, widget.event);
    if (!mounted) return;
    Navigator.of(context).pop(true);
  }

  @override
  Widget build(BuildContext context) {
    final event = widget.event;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Give Feedback'),
        centerTitle: true,
        backgroundColor: AppColors.background,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView(
              keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
              children: [
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.inputFill),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          color: AppColors.primary.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Icon(
                          Icons.event_available_rounded,
                          color: AppColors.primary,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              event.title,
                              style: const TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w700,
                                color: AppColors.textPrimary,
                                height: 1.3,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              '${event.longDateLabel} · ${event.organization}',
                              style: const TextStyle(
                                fontSize: 12,
                                color: AppColors.textSecondary,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),
                const Text(
                  'How was the event?',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 6),
                const Text(
                  'Your feedback helps organizers improve future events. '
                  'Complete this form to unlock your certificate.',
                  style: TextStyle(
                    fontSize: 13,
                    height: 1.5,
                    color: AppColors.textSecondary,
                  ),
                ),
                const SizedBox(height: 20),
                _RatingField(
                  icon: Icons.emoji_events_outlined,
                  label: 'Overall experience',
                  helper: 'How would you rate the event as a whole?',
                  value: _overallRating,
                  onChanged: (value) => setState(() => _overallRating = value),
                ),
                const SizedBox(height: 14),
                _RatingField(
                  icon: Icons.assignment_turned_in_outlined,
                  label: 'Event organization',
                  helper: 'Schedule, instructions, and on-site coordination.',
                  value: _organizationRating,
                  onChanged: (value) =>
                      setState(() => _organizationRating = value),
                ),
                const SizedBox(height: 14),
                _RatingField(
                  icon: Icons.volunteer_activism_outlined,
                  label: 'Volunteer experience',
                  helper: 'How supported and valued did you feel?',
                  value: _experienceRating,
                  onChanged: (value) =>
                      setState(() => _experienceRating = value),
                ),
                const SizedBox(height: 22),
                const Text(
                  'Comments or suggestions',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 4),
                const Text(
                  'Optional',
                  style: TextStyle(fontSize: 12, color: AppColors.textMuted),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: _commentsController,
                  maxLines: 5,
                  maxLength: 500,
                  textInputAction: TextInputAction.newline,
                  decoration: InputDecoration(
                    hintText:
                        'Share what went well or what could be improved...',
                    filled: true,
                    fillColor: AppColors.surface,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: const BorderSide(color: AppColors.inputFill),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: const BorderSide(color: AppColors.inputFill),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: const BorderSide(color: AppColors.primary),
                    ),
                  ),
                ),
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
                  if (!_canSubmit)
                    const Padding(
                      padding: EdgeInsets.only(bottom: 10),
                      child: Text(
                        'Rate all three categories to submit your feedback.',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 12,
                          color: AppColors.textMuted,
                        ),
                      ),
                    ),
                  FilledButton.icon(
                    onPressed: _canSubmit && !_isSubmitting ? _submit : null,
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
                      backgroundColor: AppColors.primary,
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
      ),
    );
  }
}

class _RatingField extends StatelessWidget {
  const _RatingField({
    required this.icon,
    required this.label,
    required this.helper,
    required this.value,
    required this.onChanged,
  });

  final IconData icon;
  final String label;
  final String helper;
  final int value;
  final ValueChanged<int> onChanged;

  static const _valueLabels = [
    'Poor',
    'Fair',
    'Good',
    'Very good',
    'Excellent',
  ];

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.inputFill),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 18, color: AppColors.primary),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  label,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                  ),
                ),
              ),
              if (value > 0)
                Text(
                  _valueLabels[value - 1],
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: AppColors.primary,
                  ),
                ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            helper,
            style: const TextStyle(
              fontSize: 12,
              color: AppColors.textSecondary,
              height: 1.4,
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: List.generate(5, (index) {
              final star = index + 1;
              final filled = star <= value;
              return Expanded(
                child: IconButton(
                  onPressed: () => onChanged(star),
                  visualDensity: VisualDensity.compact,
                  tooltip: '$star star${star == 1 ? '' : 's'}',
                  icon: Icon(
                    filled ? Icons.star_rounded : Icons.star_outline_rounded,
                    size: 32,
                    color: filled
                        ? AppColors.accentOrange
                        : AppColors.textMuted,
                  ),
                ),
              );
            }),
          ),
        ],
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
                color: AppColors.primary,
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
            const SizedBox(height: 18),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                  color: AppColors.primary.withValues(alpha: 0.2),
                ),
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
