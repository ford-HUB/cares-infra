import 'package:flutter/material.dart';

import '../../../core/services/api_client.dart';
import '../../../core/theme/app_theme.dart';
import '../data/assistance_request_data.dart';
import '../widgets/assistance_location_widgets.dart';
import '../widgets/assistance_request_widgets.dart';
import 'assistance_request_form_screen.dart';

/// Full details of one assistance request: status, progress trail, needs
/// assessment, where it is needed, and what was requested. While the server
/// allows it, the beneficiary can edit or cancel it from here.
class AssistanceRequestDetailsScreen extends StatefulWidget {
  const AssistanceRequestDetailsScreen({super.key, required this.request});

  final AssistanceRequest request;

  static void open(BuildContext context, AssistanceRequest request) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => AssistanceRequestDetailsScreen(request: request),
      ),
    );
  }

  @override
  State<AssistanceRequestDetailsScreen> createState() =>
      _AssistanceRequestDetailsScreenState();
}

class _AssistanceRequestDetailsScreenState
    extends State<AssistanceRequestDetailsScreen> {
  late AssistanceRequest _request = widget.request;
  bool _isCancelling = false;

  Future<void> _edit() async {
    final updated = await AssistanceRequestFormScreen.openEdit(
      context,
      _request,
    );
    if (updated == null || !mounted) return;
    setState(() => _request = updated);
  }

  Future<void> _cancel() async {
    final reason = await showCancelRequestSheet(context, _request);
    if (reason == null || !mounted) return;

    setState(() => _isCancelling = true);
    try {
      final cancelled = await AssistanceRequestStore.instance.cancel(
        _request.id,
        reason: reason,
      );
      if (!mounted) return;
      setState(() {
        _request = cancelled;
        _isCancelling = false;
      });
      _showMessage('Your request was cancelled.');
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _isCancelling = false);
      _showMessage(e.message);
      // The server refused because the request moved on — show where it is.
      await AssistanceRequestStore.instance.load();
      if (!mounted) return;
      final fresh = AssistanceRequestStore.instance.requests
          .where((r) => r.id == _request.id)
          .firstOrNull;
      if (fresh != null) setState(() => _request = fresh);
    } catch (_) {
      if (!mounted) return;
      setState(() => _isCancelling = false);
      _showMessage('Could not cancel your request. Please try again.');
    }
  }

  void _showMessage(String message) {
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    final request = _request;
    final statusColor = assistanceStatusColor(request.status);
    final location = request.location;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Request Details'),
        centerTitle: true,
        backgroundColor: AppColors.background,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
      ),
      bottomNavigationBar: request.canEdit || request.canCancel
          ? _RequestActions(
              canEdit: request.canEdit,
              canCancel: request.canCancel,
              isCancelling: _isCancelling,
              onEdit: _edit,
              onCancel: _cancel,
            )
          : null,
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 28),
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: AppDecorations.surfaceCard(),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Text(
                        request.title,
                        style: const TextStyle(
                          fontSize: 19,
                          fontWeight: FontWeight.w800,
                          color: AppColors.textPrimary,
                          height: 1.25,
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    RequestStatusPill.status(request.status),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  request.referenceNumber,
                  style: const TextStyle(
                    fontSize: 12.5,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textSecondary,
                  ),
                ),
                if (request.statusNote != null) ...[
                  const SizedBox(height: 12),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: statusColor.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: statusColor.withValues(alpha: 0.22),
                      ),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(
                          assistanceStatusIcon(request.status),
                          size: 18,
                          color: statusColor,
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            request.statusNote!,
                            style: const TextStyle(
                              fontSize: 13,
                              height: 1.45,
                              color: AppColors.textSecondary,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 20),
          const _SectionTitle('Request information'),
          const SizedBox(height: 10),
          Container(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 4),
            decoration: AppDecorations.surfaceCard(),
            child: Column(
              children: [
                _DetailRow(
                  icon: Icons.category_outlined,
                  label: 'Category',
                  value: request.category,
                ),
                _DetailRow(
                  icon: Icons.priority_high_rounded,
                  label: 'Urgency',
                  value: request.urgency,
                ),
                _DetailRow(
                  icon: Icons.groups_outlined,
                  label: 'Household size',
                  value: '${request.householdSize} members',
                ),
                _DetailRow(
                  icon: Icons.calendar_today_rounded,
                  label: 'Date submitted',
                  value: request.submittedOnLabel,
                ),
                _DetailRow(
                  icon: Icons.update_rounded,
                  label: 'Last updated',
                  value: request.lastUpdatedLabel,
                ),
                _DetailRow(
                  icon: Icons.apartment_rounded,
                  label: 'Handled by',
                  value: request.assignedOrganization,
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          const _SectionTitle('Needs assessment'),
          const SizedBox(height: 10),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: AppDecorations.surfaceCard(),
            child: Row(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: needsAssessmentColor(
                      request.needsAssessment,
                    ).withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(
                    Icons.assignment_ind_outlined,
                    size: 20,
                    color: needsAssessmentColor(request.needsAssessment),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Status: ${request.needsAssessment.label}',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          color: needsAssessmentColor(request.needsAssessment),
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        'Assessment date: ${request.assessmentDateLabel}',
                        style: const TextStyle(
                          fontSize: 12.5,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          if (location != null) ...[
            const SizedBox(height: 20),
            const _SectionTitle('Location'),
            const SizedBox(height: 10),
            AssistanceLocationPreview(
              location: location,
              details: request.locationDetails,
            ),
          ],
          const SizedBox(height: 20),
          const _SectionTitle('Description'),
          const SizedBox(height: 10),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: AppDecorations.surfaceCard(),
            child: Text(
              request.description,
              style: const TextStyle(
                fontSize: 14,
                height: 1.55,
                color: AppColors.textSecondary,
              ),
            ),
          ),
          if (request.items.isNotEmpty) ...[
            const SizedBox(height: 20),
            const _SectionTitle('Requested items'),
            const SizedBox(height: 10),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: AppDecorations.surfaceCard(),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: request.items
                    .map(
                      (item) => Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: Row(
                          children: [
                            const Icon(
                              Icons.check_circle_outline_rounded,
                              size: 16,
                              color: AppColors.primary,
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Text(
                                item,
                                style: const TextStyle(
                                  fontSize: 13.5,
                                  color: AppColors.textSecondary,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    )
                    .toList(),
              ),
            ),
          ],
          if (request.attachments.isNotEmpty) ...[
            const SizedBox(height: 20),
            const _SectionTitle('Proof documents'),
            const SizedBox(height: 10),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
              decoration: AppDecorations.surfaceCard(),
              child: Column(
                children: request.attachments
                    .map(
                      (file) => Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: Row(
                          children: [
                            Icon(
                              file.isImage
                                  ? Icons.image_outlined
                                  : Icons.description_outlined,
                              size: 18,
                              color: AppColors.primary,
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Text(
                                file.name,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  fontSize: 13.5,
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.textPrimary,
                                ),
                              ),
                            ),
                            if (file.sizeLabel.isNotEmpty) ...[
                              const SizedBox(width: 8),
                              Text(
                                file.sizeLabel,
                                style: const TextStyle(
                                  fontSize: 12,
                                  color: AppColors.textMuted,
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                    )
                    .toList(),
              ),
            ),
          ],
          const SizedBox(height: 20),
          const _SectionTitle('Request progress'),
          const SizedBox(height: 10),
          Container(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 4),
            decoration: AppDecorations.surfaceCard(),
            child: Column(
              children: List.generate(request.timeline.length, (index) {
                return _TimelineTile(
                  entry: request.timeline[index],
                  isLast: index == request.timeline.length - 1,
                );
              }),
            ),
          ),
        ],
      ),
    );
  }
}

/// Edit / Cancel bar under the details. Editing is only offered until the
/// relief desk starts screening; cancelling until the request is completed.
class _RequestActions extends StatelessWidget {
  const _RequestActions({
    required this.canEdit,
    required this.canCancel,
    required this.isCancelling,
    required this.onEdit,
    required this.onCancel,
  });

  final bool canEdit;
  final bool canCancel;
  final bool isCancelling;
  final VoidCallback onEdit;
  final VoidCallback onCancel;

  @override
  Widget build(BuildContext context) {
    final shape = RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(14),
    );
    return SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
        child: Row(
          children: [
            if (canCancel)
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: isCancelling ? null : onCancel,
                  icon: isCancelling
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.block_rounded, size: 18),
                  label: Text(
                    isCancelling ? 'Cancelling...' : 'Cancel Request',
                  ),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.error,
                    side: const BorderSide(color: AppColors.error),
                    minimumSize: const Size.fromHeight(50),
                    shape: shape,
                  ),
                ),
              ),
            if (canCancel && canEdit) const SizedBox(width: 12),
            if (canEdit)
              Expanded(
                child: FilledButton.icon(
                  onPressed: isCancelling ? null : onEdit,
                  icon: const Icon(Icons.edit_rounded, size: 18),
                  label: const Text('Edit Request'),
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    minimumSize: const Size.fromHeight(50),
                    shape: shape,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

/// Confirms a cancellation. Returns the optional reason (possibly empty)
/// when confirmed, or null when the beneficiary keeps the request.
Future<String?> showCancelRequestSheet(
  BuildContext context,
  AssistanceRequest request,
) {
  return showModalBottomSheet<String>(
    context: context,
    isScrollControlled: true,
    backgroundColor: AppColors.surface,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
    ),
    builder: (_) => _CancelRequestSheet(request: request),
  );
}

class _CancelRequestSheet extends StatefulWidget {
  const _CancelRequestSheet({required this.request});

  final AssistanceRequest request;

  @override
  State<_CancelRequestSheet> createState() => _CancelRequestSheetState();
}

class _CancelRequestSheetState extends State<_CancelRequestSheet> {
  final _reasonController = TextEditingController();

  @override
  void dispose() {
    _reasonController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final approved = widget.request.status == AssistanceRequestStatus.approved;

    return Padding(
      padding: EdgeInsets.fromLTRB(
        24,
        20,
        24,
        20 + MediaQuery.viewInsetsOf(context).bottom,
      ),
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'Cancel this request?',
              style: TextStyle(
                fontSize: 19,
                fontWeight: FontWeight.w800,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              '${widget.request.referenceNumber} will be withdrawn and the '
              'relief desk will stop processing it.'
              '${approved ? ' It is already approved, so any assistance '
                        'set aside for you will be released to others.' : ''}'
              ' This cannot be undone — you can file a new request later.',
              style: const TextStyle(
                fontSize: 13.5,
                height: 1.5,
                color: AppColors.textSecondary,
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _reasonController,
              maxLength: 300,
              maxLines: 3,
              minLines: 2,
              textCapitalization: TextCapitalization.sentences,
              decoration: InputDecoration(
                hintText: 'Reason for cancelling (optional)',
                filled: true,
                fillColor: AppColors.background,
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
            const SizedBox(height: 8),
            FilledButton(
              onPressed: () =>
                  Navigator.of(context).pop(_reasonController.text.trim()),
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.error,
                minimumSize: const Size.fromHeight(50),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
              ),
              child: const Text('Yes, cancel request'),
            ),
            const SizedBox(height: 6),
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              style: TextButton.styleFrom(
                foregroundColor: AppColors.textSecondary,
                minimumSize: const Size.fromHeight(46),
              ),
              child: const Text('Keep request'),
            ),
          ],
        ),
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle(this.title);

  final String title;

  @override
  Widget build(BuildContext context) {
    return Text(
      title,
      style: const TextStyle(
        fontSize: 16,
        fontWeight: FontWeight.w800,
        color: AppColors.textPrimary,
      ),
    );
  }
}

class _DetailRow extends StatelessWidget {
  const _DetailRow({
    required this.icon,
    required this.label,
    required this.value,
  });

  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 16, color: AppColors.textMuted),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              label,
              style: const TextStyle(
                fontSize: 12.5,
                color: AppColors.textMuted,
              ),
            ),
          ),
          Expanded(
            flex: 2,
            child: Text(
              value,
              textAlign: TextAlign.right,
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: AppColors.textPrimary,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _TimelineTile extends StatelessWidget {
  const _TimelineTile({required this.entry, required this.isLast});

  final RequestTimelineEntry entry;
  final bool isLast;

  @override
  Widget build(BuildContext context) {
    final color = entry.done ? AppColors.primary : AppColors.textMuted;

    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Column(
            children: [
              Container(
                width: 22,
                height: 22,
                decoration: BoxDecoration(
                  color: entry.done
                      ? AppColors.primary.withValues(alpha: 0.15)
                      : AppColors.inputFill.withValues(alpha: 0.5),
                  shape: BoxShape.circle,
                  border: Border.all(color: color.withValues(alpha: 0.5)),
                ),
                child: Icon(
                  entry.done
                      ? Icons.check_rounded
                      : Icons.radio_button_unchecked_rounded,
                  size: 13,
                  color: color,
                ),
              ),
              if (!isLast)
                Expanded(
                  child: Container(
                    width: 2,
                    margin: const EdgeInsets.symmetric(vertical: 2),
                    color: AppColors.borderLight,
                  ),
                ),
            ],
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    entry.label,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: entry.done
                          ? AppColors.textPrimary
                          : AppColors.textMuted,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    entry.date == null
                        ? 'Pending'
                        : formatRequestDate(entry.date!),
                    style: const TextStyle(
                      fontSize: 12,
                      color: AppColors.textMuted,
                    ),
                  ),
                  if (entry.note != null) ...[
                    const SizedBox(height: 4),
                    Text(
                      entry.note!,
                      style: const TextStyle(
                        fontSize: 12.5,
                        height: 1.4,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
