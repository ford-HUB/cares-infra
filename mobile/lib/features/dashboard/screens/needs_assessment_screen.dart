import 'package:flutter/material.dart';

import '../../../core/theme/app_theme.dart';
import '../data/assistance_request_data.dart';

/// How the Needs Assessment Survey screen is opened from the card.
enum NeedsAssessmentMode { take, view, update }

/// Static Needs Assessment Survey screen for the prototype.
///
/// * [NeedsAssessmentMode.view] renders the submitted answers read-only.
/// * [NeedsAssessmentMode.take] / [NeedsAssessmentMode.update] walk through
///   the five survey steps; submitting only shows a confirmation — nothing is
///   persisted and no backend is called.
class NeedsAssessmentScreen extends StatelessWidget {
  const NeedsAssessmentScreen({
    super.key,
    required this.mode,
    required this.summary,
  });

  final NeedsAssessmentMode mode;
  final NeedsAssessmentSummary summary;

  static void open(
    BuildContext context, {
    required NeedsAssessmentMode mode,
    required NeedsAssessmentSummary summary,
  }) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => NeedsAssessmentScreen(mode: mode, summary: summary),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return switch (mode) {
      NeedsAssessmentMode.view => _AssessmentViewScreen(summary: summary),
      NeedsAssessmentMode.take => const _AssessmentWizard(isUpdate: false),
      NeedsAssessmentMode.update => _AssessmentWizard(
        isUpdate: true,
        initial: summary.response,
      ),
    };
  }
}

// ---------------------------------------------------------------------------
// Take / Update — five-step wizard
// ---------------------------------------------------------------------------

class _AssessmentWizard extends StatefulWidget {
  const _AssessmentWizard({required this.isUpdate, this.initial});

  final bool isUpdate;
  final NeedsAssessmentResponse? initial;

  @override
  State<_AssessmentWizard> createState() => _AssessmentWizardState();
}

class _AssessmentWizardState extends State<_AssessmentWizard> {
  static const _stepCount = 5;
  static const _stepTitles = [
    'Your needs',
    'How serious is it?',
    'What makes it difficult?',
    'Community problems',
    'Tell us more',
  ];

  int _step = 0;

  late final Set<String> _householdNeeds;
  late final TextEditingController _otherHouseholdNeed;
  String? _seriousness;
  late final Set<String> _barriers;
  late final TextEditingController _otherBarrier;
  String? _communityProblem;
  late final TextEditingController _otherCommunityProblem;
  late final TextEditingController _additionalConcern;

  @override
  void initState() {
    super.initState();
    final r = widget.initial;
    _householdNeeds = {...?r?.householdNeeds};
    _otherHouseholdNeed = TextEditingController(
      text: r?.otherHouseholdNeed ?? '',
    );
    _seriousness = r?.seriousness;
    _barriers = {...?r?.barriers};
    _otherBarrier = TextEditingController(text: r?.otherBarrier ?? '');
    _communityProblem = r?.communityProblem;
    _otherCommunityProblem = TextEditingController(
      text: r?.otherCommunityProblem ?? '',
    );
    _additionalConcern = TextEditingController(
      text: r?.additionalConcern ?? '',
    );
  }

  @override
  void dispose() {
    _otherHouseholdNeed.dispose();
    _otherBarrier.dispose();
    _otherCommunityProblem.dispose();
    _additionalConcern.dispose();
    super.dispose();
  }

  bool get _isLastStep => _step == _stepCount - 1;

  /// Whether the current step has enough input to move on. "Other" requires
  /// the free-text field to be filled in.
  bool get _canContinue => switch (_step) {
    0 =>
      _householdNeeds.isNotEmpty &&
          (!_householdNeeds.contains(kOtherOption) ||
              _otherHouseholdNeed.text.trim().isNotEmpty),
    1 => _seriousness != null,
    2 =>
      _barriers.isNotEmpty &&
          (!_barriers.contains(kOtherOption) ||
              _otherBarrier.text.trim().isNotEmpty),
    3 =>
      _communityProblem != null &&
          (_communityProblem != kOtherOption ||
              _otherCommunityProblem.text.trim().isNotEmpty),
    _ => true,
  };

  void _next() {
    if (!_canContinue) return;
    if (_isLastStep) {
      _submit();
      return;
    }
    setState(() => _step++);
  }

  void _back() {
    if (_step == 0) {
      Navigator.of(context).pop();
      return;
    }
    setState(() => _step--);
  }

  Future<void> _submit() async {
    // Prototype only — the response is not stored anywhere.
    final response = NeedsAssessmentResponse(
      householdNeeds: _householdNeeds.toList(),
      otherHouseholdNeed: _otherHouseholdNeed.text,
      seriousness: _seriousness ?? '',
      barriers: _barriers.toList(),
      otherBarrier: _otherBarrier.text,
      communityProblem: _communityProblem ?? '',
      otherCommunityProblem: _otherCommunityProblem.text,
      additionalConcern: _additionalConcern.text,
    );

    await showAssessmentSubmittedDialog(
      context,
      response: response,
      isUpdate: widget.isUpdate,
    );
    if (!mounted) return;
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: _step == 0,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _back();
      },
      child: Scaffold(
        backgroundColor: AppColors.background,
        appBar: AppBar(
          title: Text(
            widget.isUpdate ? 'Update Assessment' : 'Needs Assessment',
          ),
          centerTitle: true,
          backgroundColor: AppColors.background,
          foregroundColor: AppColors.textPrimary,
          elevation: 0,
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_rounded),
            onPressed: _back,
          ),
        ),
        body: Column(
          children: [
            _StepProgressHeader(
              step: _step,
              stepCount: _stepCount,
              title: _stepTitles[_step],
            ),
            Expanded(
              child: ListView(
                key: ValueKey(_step),
                keyboardDismissBehavior:
                    ScrollViewKeyboardDismissBehavior.onDrag,
                padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
                children: [_buildStep()],
              ),
            ),
            SafeArea(
              top: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
                child: SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                    onPressed: _canContinue ? _next : null,
                    style: FilledButton.styleFrom(
                      backgroundColor: AppColors.primaryDark,
                      foregroundColor: Colors.white,
                      disabledBackgroundColor: AppColors.accentLight,
                      disabledForegroundColor: AppColors.textMuted,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: Text(
                      _isLastStep
                          ? (widget.isUpdate
                                ? 'Submit Updated Assessment'
                                : 'Submit Assessment')
                          : 'Next',
                      style: const TextStyle(
                        fontSize: 14.5,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStep() {
    return switch (_step) {
      0 => _QuestionCard(
        question: 'What does your household currently need help with?',
        hint: 'Select all that apply.',
        child: _CheckboxGroup(
          options: kHouseholdNeedOptions,
          selected: _householdNeeds,
          otherController: _otherHouseholdNeed,
          onChanged: () => setState(() {}),
        ),
      ),
      1 => _QuestionCard(
        question: 'How serious is your most important need?',
        child: _RadioGroup(
          options: kNeedSeriousnessOptions,
          value: _seriousness,
          onChanged: (v) => setState(() => _seriousness = v),
        ),
      ),
      2 => _QuestionCard(
        question:
            'What makes it difficult for your household to meet this need?',
        hint: 'Select all that apply.',
        child: _CheckboxGroup(
          options: kNeedBarrierOptions,
          selected: _barriers,
          otherController: _otherBarrier,
          exclusiveOption: kNoDifficultyOption,
          onChanged: () => setState(() {}),
        ),
      ),
      3 => _QuestionCard(
        question: 'What problems do you commonly observe in your community?',
        child: _RadioGroup(
          options: kCommunityProblemOptions,
          value: _communityProblem,
          otherController: _otherCommunityProblem,
          otherHint: 'Describe the problem',
          onChanged: (v) => setState(() => _communityProblem = v),
          onOtherChanged: () => setState(() {}),
        ),
      ),
      _ => _QuestionCard(
        question:
            'Is there another need or concern you would like CARES to know '
            'about?',
        hint: 'Optional.',
        child: TextField(
          controller: _additionalConcern,
          minLines: 5,
          maxLines: 8,
          textCapitalization: TextCapitalization.sentences,
          style: const TextStyle(fontSize: 13.5, color: AppColors.textPrimary),
          decoration: _inputDecoration('Type your response here...'),
        ),
      ),
    };
  }
}

/// "Step 2 of 5 — Most important need" plus a segmented progress bar.
class _StepProgressHeader extends StatelessWidget {
  const _StepProgressHeader({
    required this.step,
    required this.stepCount,
    required this.title,
  });

  final int step;
  final int stepCount;
  final String title;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 4, 20, 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              for (var i = 0; i < stepCount; i++) ...[
                Expanded(
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    height: 5,
                    decoration: BoxDecoration(
                      color: i <= step
                          ? AppColors.primary
                          : AppColors.accentLight,
                      borderRadius: BorderRadius.circular(999),
                    ),
                  ),
                ),
                if (i < stepCount - 1) const SizedBox(width: 6),
              ],
            ],
          ),
          const SizedBox(height: 10),
          Text(
            'Step ${step + 1} of $stepCount — $title',
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w800,
              color: AppColors.textSecondary,
            ),
          ),
        ],
      ),
    );
  }
}

class _QuestionCard extends StatelessWidget {
  const _QuestionCard({required this.question, this.hint, required this.child});

  final String question;
  final String? hint;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: AppDecorations.surfaceCard(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            question,
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w800,
              color: AppColors.textPrimary,
              height: 1.3,
            ),
          ),
          if (hint != null) ...[
            const SizedBox(height: 4),
            Text(
              hint!,
              style: const TextStyle(
                fontSize: 12.5,
                color: AppColors.textSecondary,
              ),
            ),
          ],
          const SizedBox(height: 14),
          child,
        ],
      ),
    );
  }
}

/// Multi-select list; selecting "Other" reveals a text field beneath it.
/// [exclusiveOption] (e.g. "No difficulty") cannot be combined with any
/// other choice — picking it clears the rest, and picking anything else
/// clears it.
class _CheckboxGroup extends StatelessWidget {
  const _CheckboxGroup({
    required this.options,
    required this.selected,
    required this.otherController,
    required this.onChanged,
    this.exclusiveOption,
  });

  final List<String> options;
  final Set<String> selected;
  final TextEditingController otherController;
  final VoidCallback onChanged;
  final String? exclusiveOption;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        for (final option in options) ...[
          _OptionTile(
            label: option,
            selected: selected.contains(option),
            control: Checkbox(
              value: selected.contains(option),
              onChanged: (_) => _toggle(option),
              activeColor: AppColors.primary,
              visualDensity: VisualDensity.compact,
            ),
            onTap: () => _toggle(option),
          ),
          if (option == kOtherOption && selected.contains(kOtherOption))
            Padding(
              padding: const EdgeInsets.only(top: 4, bottom: 6),
              child: TextField(
                controller: otherController,
                autofocus: true,
                textCapitalization: TextCapitalization.sentences,
                onChanged: (_) => onChanged(),
                style: const TextStyle(
                  fontSize: 13.5,
                  color: AppColors.textPrimary,
                ),
                decoration: _inputDecoration('Please specify'),
              ),
            ),
        ],
      ],
    );
  }

  void _toggle(String option) {
    if (selected.remove(option)) {
      onChanged();
      return;
    }
    if (option == exclusiveOption) {
      selected.clear();
    } else if (exclusiveOption != null) {
      selected.remove(exclusiveOption);
    }
    selected.add(option);
    onChanged();
  }
}

/// Single-select list; picking "Other" reveals a text field beneath it.
class _RadioGroup extends StatelessWidget {
  const _RadioGroup({
    required this.options,
    required this.value,
    required this.onChanged,
    this.otherController,
    this.otherHint,
    this.onOtherChanged,
  });

  final List<String> options;
  final String? value;
  final ValueChanged<String?> onChanged;
  final TextEditingController? otherController;
  final String? otherHint;
  final VoidCallback? onOtherChanged;

  @override
  Widget build(BuildContext context) {
    return RadioGroup<String>(
      groupValue: value,
      onChanged: onChanged,
      child: Column(
        children: [
          for (final option in options) ...[
            _OptionTile(
              label: option,
              selected: value == option,
              control: Radio<String>(
                value: option,
                activeColor: AppColors.primary,
                visualDensity: VisualDensity.compact,
              ),
              onTap: () => onChanged(option),
            ),
            if (option == kOtherOption &&
                value == kOtherOption &&
                otherController != null)
              Padding(
                padding: const EdgeInsets.only(top: 4, bottom: 6),
                child: TextField(
                  controller: otherController,
                  autofocus: true,
                  textCapitalization: TextCapitalization.sentences,
                  onChanged: (_) => onOtherChanged?.call(),
                  style: const TextStyle(
                    fontSize: 13.5,
                    color: AppColors.textPrimary,
                  ),
                  decoration: _inputDecoration(otherHint ?? 'Please specify'),
                ),
              ),
          ],
        ],
      ),
    );
  }
}

class _OptionTile extends StatelessWidget {
  const _OptionTile({
    required this.label,
    required this.selected,
    required this.control,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final Widget control;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Material(
        color: selected
            ? AppColors.primary.withValues(alpha: 0.08)
            : AppColors.fieldFill,
        borderRadius: BorderRadius.circular(12),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(12),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: selected
                    ? AppColors.borderActive
                    : AppColors.fieldBorder,
                width: selected ? 1.4 : 1,
              ),
            ),
            child: Row(
              children: [
                control,
                const SizedBox(width: 4),
                Expanded(
                  child: Text(
                    label,
                    style: TextStyle(
                      fontSize: 13.5,
                      fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                      color: AppColors.textPrimary,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

InputDecoration _inputDecoration(String hint) => InputDecoration(
  hintText: hint,
  hintStyle: const TextStyle(color: AppColors.textMuted, fontSize: 13.5),
  filled: true,
  fillColor: AppColors.fieldFill,
  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
  enabledBorder: OutlineInputBorder(
    borderRadius: BorderRadius.circular(12),
    borderSide: const BorderSide(color: AppColors.fieldBorder),
  ),
  focusedBorder: OutlineInputBorder(
    borderRadius: BorderRadius.circular(12),
    borderSide: const BorderSide(color: AppColors.borderActive, width: 1.4),
  ),
);

// ---------------------------------------------------------------------------
// Success dialog
// ---------------------------------------------------------------------------

/// Confirmation shown after the survey is submitted or updated. Recaps the
/// key answers and explains how the information will be used.
Future<void> showAssessmentSubmittedDialog(
  BuildContext context, {
  required NeedsAssessmentResponse response,
  required bool isUpdate,
}) {
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
              width: 72,
              height: 72,
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.12),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.task_alt_rounded,
                size: 38,
                color: AppColors.primary,
              ),
            ),
            const SizedBox(height: 18),
            Text(
              isUpdate ? 'Assessment updated' : 'Thank you!',
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 21,
                fontWeight: FontWeight.w800,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              isUpdate
                  ? 'Your Needs Assessment Survey now reflects your latest '
                        'situation.'
                  : 'Your Needs Assessment Survey has been submitted.',
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 14,
                height: 1.5,
                color: AppColors.textSecondary,
              ),
            ),
            const SizedBox(height: 18),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppColors.background,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppColors.borderLight),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _SummaryLine(
                    icon: Icons.checklist_rounded,
                    label: 'Household needs',
                    value: '${response.householdNeeds.length} selected',
                  ),
                  const SizedBox(height: 10),
                  _SummaryLine(
                    icon: Icons.speed_rounded,
                    label: 'Seriousness',
                    value: response.seriousness,
                  ),
                  const SizedBox(height: 10),
                  _SummaryLine(
                    icon: Icons.groups_outlined,
                    label: 'Community problem',
                    value: response.communityProblemLabel,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            const Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(
                  Icons.auto_awesome_outlined,
                  size: 16,
                  color: AppColors.primary,
                ),
                SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'CARES uses your answers to group households with '
                    'similar needs and plan programs for your community. '
                    'You can view or update your assessment anytime from '
                    'your dashboard.',
                    style: TextStyle(
                      fontSize: 12.5,
                      height: 1.45,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),
            FilledButton(
              onPressed: () => Navigator.of(ctx).pop(),
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.primary,
                minimumSize: const Size.fromHeight(48),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: const Text(
                'Back to Dashboard',
                style: TextStyle(fontWeight: FontWeight.w800),
              ),
            ),
          ],
        ),
      ),
    ),
  );
}

class _SummaryLine extends StatelessWidget {
  const _SummaryLine({
    required this.icon,
    required this.label,
    required this.value,
  });

  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 16, color: AppColors.textMuted),
        const SizedBox(width: 8),
        Text(
          label,
          style: const TextStyle(fontSize: 12.5, color: AppColors.textMuted),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            value,
            textAlign: TextAlign.right,
            style: const TextStyle(
              fontSize: 12.5,
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary,
            ),
          ),
        ),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// View — read-only summary of the submitted answers
// ---------------------------------------------------------------------------

class _AssessmentViewScreen extends StatelessWidget {
  const _AssessmentViewScreen({required this.summary});

  final NeedsAssessmentSummary summary;

  @override
  Widget build(BuildContext context) {
    final r = summary.response;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Your Assessment'),
        centerTitle: true,
        backgroundColor: AppColors.background,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 28),
        children: [
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: AppColors.primary.withValues(alpha: 0.2),
              ),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(
                  Icons.visibility_outlined,
                  size: 18,
                  color: AppColors.primary,
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'This is the assessment you submitted on '
                    '${summary.submittedOnLabel}. Use Update from the '
                    'dashboard if your situation has changed.',
                    style: const TextStyle(
                      fontSize: 12.5,
                      height: 1.45,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          if (r == null)
            const _ReadOnlyItem(
              label: 'No answers on file',
              value: 'This assessment has not been submitted yet.',
            )
          else ...[
            _ReadOnlyItem(
              label: 'What your household needs help with',
              value: r.householdNeedsLabel,
            ),
            _ReadOnlyItem(
              label: 'How serious your most important need is',
              value: r.seriousness,
            ),
            _ReadOnlyItem(
              label: 'What makes it difficult to meet this need',
              value: r.barriersLabel,
            ),
            _ReadOnlyItem(
              label: 'Problem commonly observed in your community',
              value: r.communityProblemLabel,
            ),
            _ReadOnlyItem(
              label: 'Other needs or concerns',
              value: r.additionalConcern.trim().isEmpty
                  ? '—'
                  : r.additionalConcern,
            ),
          ],
        ],
      ),
    );
  }
}

class _ReadOnlyItem extends StatelessWidget {
  const _ReadOnlyItem({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: AppDecorations.surfaceCard(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(
              fontSize: 12.5,
              fontWeight: FontWeight.w700,
              color: AppColors.textSecondary,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            value,
            style: const TextStyle(
              fontSize: 14,
              height: 1.4,
              fontWeight: FontWeight.w600,
              color: AppColors.textPrimary,
            ),
          ),
        ],
      ),
    );
  }
}
