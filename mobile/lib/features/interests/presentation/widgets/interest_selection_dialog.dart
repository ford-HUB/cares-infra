import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:lottie/lottie.dart';
import 'package:mobile/core/services/api_client.dart';
import 'package:mobile/core/session/role_account_store.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/interests/data/interests_service.dart';
import 'package:mobile/features/interests/domain/user_interest.dart';

/// Saves the picks itself and closes only once the server accepts; null if
/// dismissed unsaved. The save is a full replace, so pass [initialSelection]
/// when editing. Outside-school volunteers aren't offered School; "Others"
/// requires its text.
Future<Set<UserInterest>?> showInterestSelectionDialog(
  BuildContext context, {
  InterestsService? interestsService,
  Set<UserInterest> initialSelection = const {},
  bool dismissible = false,
}) {
  return showDialog<Set<UserInterest>>(
    context: context,
    barrierDismissible: dismissible,
    builder: (_) => InterestSelectionDialog(
      interestsService: interestsService ?? InterestsService(),
      initialSelection: initialSelection,
      dismissible: dismissible,
    ),
  );
}

class InterestSelectionDialog extends StatefulWidget {
  const InterestSelectionDialog({
    super.key,
    required this.interestsService,
    this.initialSelection = const {},
    this.dismissible = false,
  });

  final InterestsService interestsService;
  final Set<UserInterest> initialSelection;
  final bool dismissible;

  @override
  State<InterestSelectionDialog> createState() =>
      _InterestSelectionDialogState();
}

class _InterestSelectionDialogState extends State<InterestSelectionDialog> {
  final bool _outsideSchool =
      RoleAccountStore.instance.volunteerFromOutsideSchool;
  late final List<UserInterest> _options = UserInterestX.selectable(
    outsideSchool: _outsideSchool,
  );
  late final Set<UserInterest> _selected = {
    ...UserInterestX.allowed(
      widget.initialSelection,
      outsideSchool: _outsideSchool,
    ),
  };
  late final TextEditingController _otherController = TextEditingController(
    text: RoleAccountStore.instance.volunteerOtherInterest ?? '',
  )..addListener(_onOtherChanged);
  final FocusNode _otherFocus = FocusNode();
  bool _isSaving = false;
  String? _errorMessage;

  bool get _othersSelected => _selected.contains(UserInterest.others);

  String get _otherText => _otherController.text.trim();

  /// Others needs a description before the picks can be saved.
  bool get _canContinue =>
      _selected.isNotEmpty && (!_othersSelected || _otherText.isNotEmpty);

  @override
  void dispose() {
    _otherController.dispose();
    _otherFocus.dispose();
    super.dispose();
  }

  void _onOtherChanged() {
    // Rebuilds the footer so the button enables as soon as text is typed.
    setState(() => _errorMessage = null);
  }

  void _toggle(UserInterest interest) {
    if (_isSaving) return;
    setState(() {
      _errorMessage = null;
      if (_selected.contains(interest)) {
        _selected.remove(interest);
      } else {
        _selected.add(interest);
      }
    });
    if (interest == UserInterest.others) {
      if (_othersSelected) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted && _otherText.isEmpty) _otherFocus.requestFocus();
        });
      } else {
        _otherFocus.unfocus();
      }
    }
  }

  Future<void> _continue() async {
    if (!_canContinue || _isSaving) return;
    _otherFocus.unfocus();

    setState(() {
      _isSaving = true;
      _errorMessage = null;
    });

    try {
      await widget.interestsService.saveInterests(
        interests: _selected,
        // Always sent from the picker so un-picking Others clears the text.
        otherInterest: _othersSelected ? _otherText : '',
      );
      if (!mounted) return;
      Navigator.of(context).pop(Set<UserInterest>.from(_selected));
    } on ApiException catch (error) {
      if (!mounted) return;
      setState(() {
        _isSaving = false;
        _errorMessage = error.message;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _isSaving = false;
        _errorMessage = 'Could not save your interests. Please try again.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final maxHeight = MediaQuery.sizeOf(context).height * 0.82;

    return PopScope(
      canPop: widget.dismissible && !_isSaving,
      child: Dialog(
        backgroundColor: AppColors.background,
        insetPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        child: ConstrainedBox(
          constraints: BoxConstraints(maxHeight: maxHeight),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(24, 28, 24, 16),
                child: _DialogHeader(
                  onClose: widget.dismissible && !_isSaving
                      ? () => Navigator.of(context).pop()
                      : null,
                ),
              ),
              Flexible(
                child: GridView.builder(
                  shrinkWrap: true,
                  padding: const EdgeInsets.fromLTRB(20, 4, 20, 4),
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    mainAxisSpacing: 12,
                    crossAxisSpacing: 12,
                    childAspectRatio: 0.86,
                  ),
                  itemCount: _options.length,
                  itemBuilder: (_, index) {
                    final interest = _options[index];
                    return _InterestCard(
                      interest: interest,
                      isSelected: _selected.contains(interest),
                      onTap: () => _toggle(interest),
                    );
                  },
                ),
              ),
              AnimatedSize(
                duration: const Duration(milliseconds: 220),
                curve: Curves.easeOutCubic,
                alignment: Alignment.topCenter,
                child: _othersSelected
                    ? Padding(
                        padding: const EdgeInsets.fromLTRB(20, 14, 20, 0),
                        child: _OtherInterestField(
                          controller: _otherController,
                          focusNode: _otherFocus,
                          enabled: !_isSaving,
                          onSubmitted: _continue,
                        ),
                      )
                    : const SizedBox(width: double.infinity),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
                child: _DialogFooter(
                  selectedCount: _selected.length,
                  needsOtherText: _othersSelected && _otherText.isEmpty,
                  isSaving: _isSaving,
                  errorMessage: _errorMessage,
                  onContinue: _canContinue ? _continue : null,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _DialogHeader extends StatelessWidget {
  const _DialogHeader({this.onClose});

  /// Only when dismissible (editing from the profile).
  final VoidCallback? onClose;

  @override
  Widget build(BuildContext context) {
    final header = Column(
      children: [
        Container(
          width: 56,
          height: 56,
          decoration: BoxDecoration(
            color: AppColors.primary.withValues(alpha: 0.12),
            shape: BoxShape.circle,
          ),
          child: const Icon(
            Icons.interests_rounded,
            color: AppColors.primary,
            size: 30,
          ),
        ),
        const SizedBox(height: 14),
        const Text(
          'What events interest you?',
          textAlign: TextAlign.center,
          style: TextStyle(
            fontSize: 22,
            fontWeight: FontWeight.w800,
            color: AppColors.primaryDark,
            height: 1.25,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          'Pick the types of events you want to hear about. '
          'You can change these anytime from your profile.',
          textAlign: TextAlign.center,
          style: TextStyle(
            fontSize: 14,
            height: 1.45,
            color: AppColors.textSecondary,
          ),
        ),
      ],
    );

    if (onClose == null) return header;

    // Overlay the close button on the corner so it adds no vertical space.
    return Stack(
      clipBehavior: Clip.none,
      children: [
        header,
        Positioned(
          top: -12,
          right: -8,
          child: IconButton(
            onPressed: onClose,
            icon: const Icon(Icons.close_rounded, size: 22),
            color: AppColors.secondary,
            tooltip: 'Close',
            visualDensity: VisualDensity.compact,
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
          ),
        ),
      ],
    );
  }
}

class _OtherInterestField extends StatelessWidget {
  const _OtherInterestField({
    required this.controller,
    required this.focusNode,
    required this.enabled,
    required this.onSubmitted,
  });

  final TextEditingController controller;
  final FocusNode focusNode;
  final bool enabled;
  final VoidCallback onSubmitted;

  /// Mirrors the server's limit on `other_interest`.
  static const int maxLength = 100;

  @override
  Widget build(BuildContext context) {
    final accent = UserInterest.others.accentColor;

    return TextField(
      controller: controller,
      focusNode: focusNode,
      enabled: enabled,
      maxLength: maxLength,
      textCapitalization: TextCapitalization.sentences,
      textInputAction: TextInputAction.done,
      // The server accepts plain text only.
      inputFormatters: [FilteringTextInputFormatter.deny(RegExp('[<>]'))],
      onSubmitted: (_) => onSubmitted(),
      decoration: InputDecoration(
        labelText: 'Your other interest',
        hintText: 'e.g. Tree planting, coastal clean-ups',
        prefixIcon: Icon(UserInterest.others.icon, color: accent),
        filled: true,
        fillColor: Colors.white,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppColors.cardRadius),
          borderSide: const BorderSide(color: AppColors.fieldBorder),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppColors.cardRadius),
          borderSide: const BorderSide(color: AppColors.fieldBorder),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppColors.cardRadius),
          borderSide: const BorderSide(color: AppColors.primary, width: 2),
        ),
      ),
    );
  }
}

class _DialogFooter extends StatelessWidget {
  const _DialogFooter({
    required this.selectedCount,
    required this.needsOtherText,
    required this.isSaving,
    required this.errorMessage,
    required this.onContinue,
  });

  final int selectedCount;

  final bool needsOtherText;
  final bool isSaving;
  final String? errorMessage;
  final VoidCallback? onContinue;

  @override
  Widget build(BuildContext context) {
    final buttonLabel = selectedCount == 0
        ? 'Select at least one'
        : needsOtherText
        ? 'Tell us your other interest'
        : 'Continue with $selectedCount selected';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (errorMessage != null) ...[
          Text(
            errorMessage!,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 13,
              color: AppColors.error,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 10),
        ],
        SizedBox(
          height: 50,
          child: ElevatedButton(
            onPressed: isSaving ? null : onContinue,
            child: isSaving
                ? const SizedBox(
                    width: 22,
                    height: 22,
                    child: CircularProgressIndicator(
                      strokeWidth: 2.5,
                      color: Colors.white,
                    ),
                  )
                : Text(buttonLabel),
          ),
        ),
      ],
    );
  }
}

class _InterestCard extends StatelessWidget {
  const _InterestCard({
    required this.interest,
    required this.isSelected,
    required this.onTap,
  });

  final UserInterest interest;
  final bool isSelected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final accent = interest.accentColor;

    return Semantics(
      button: true,
      selected: isSelected,
      label: interest.label,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(AppColors.cardRadius),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 220),
            curve: Curves.easeOutCubic,
            padding: const EdgeInsets.fromLTRB(12, 12, 12, 14),
            decoration: BoxDecoration(
              color: isSelected ? accent.withValues(alpha: 0.08) : Colors.white,
              borderRadius: BorderRadius.circular(AppColors.cardRadius),
              border: Border.all(
                color: isSelected ? accent : AppColors.fieldBorder,
                width: isSelected ? 2 : 1,
              ),
              boxShadow: [
                BoxShadow(
                  color: isSelected
                      ? accent.withValues(alpha: 0.18)
                      : Colors.black.withValues(alpha: 0.04),
                  blurRadius: isSelected ? 14 : 8,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: _InterestArt(interest: interest, accent: accent),
                    ),
                    _SelectionBadge(accent: accent, isSelected: isSelected),
                  ],
                ),
                const Spacer(),
                Text(
                  interest.label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w800,
                    color: isSelected ? accent : AppColors.primaryDark,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  interest.description,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 11.5,
                    height: 1.3,
                    color: AppColors.textSecondary,
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

/// Falls back to the Material icon if the Lottie asset is missing.
class _InterestArt extends StatelessWidget {
  const _InterestArt({required this.interest, required this.accent});

  final UserInterest interest;
  final Color accent;

  static const double _size = 64;

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        width: _size,
        height: _size,
        decoration: BoxDecoration(
          color: accent.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(16),
        ),
        clipBehavior: Clip.antiAlias,
        child: Lottie.asset(
          interest.lottieAsset,
          fit: BoxFit.contain,
          repeat: true,
          errorBuilder: (_, _, _) =>
              Icon(interest.icon, color: accent, size: 32),
        ),
      ),
    );
  }
}

class _SelectionBadge extends StatelessWidget {
  const _SelectionBadge({required this.accent, required this.isSelected});

  final Color accent;
  final bool isSelected;

  @override
  Widget build(BuildContext context) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 200),
      width: 24,
      height: 24,
      decoration: BoxDecoration(
        color: isSelected ? accent : Colors.transparent,
        shape: BoxShape.circle,
        border: Border.all(
          color: isSelected ? accent : AppColors.light,
          width: 1.5,
        ),
      ),
      child: isSelected
          ? const Icon(Icons.check_rounded, size: 16, color: Colors.white)
          : null,
    );
  }
}
