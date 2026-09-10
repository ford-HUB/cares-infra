import 'package:flutter/material.dart';
import 'package:lottie/lottie.dart';
import 'package:mobile/core/services/api_client.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/interests/data/interests_service.dart';
import 'package:mobile/features/interests/domain/user_interest.dart';

/// Shows a blocking popup for a volunteer to pick the event types they care
/// about. Options mirror the portal's event categories. The dialog saves the
/// picks itself and only closes once the server has accepted them; it returns
/// the saved set, or `null` if it was dismissed without saving.
Future<Set<UserInterest>?> showInterestSelectionDialog(
  BuildContext context, {
  InterestsService? interestsService,
}) {
  return showDialog<Set<UserInterest>>(
    context: context,
    barrierDismissible: false,
    builder: (_) => InterestSelectionDialog(
      interestsService: interestsService ?? InterestsService(),
    ),
  );
}

class InterestSelectionDialog extends StatefulWidget {
  const InterestSelectionDialog({super.key, required this.interestsService});

  final InterestsService interestsService;

  @override
  State<InterestSelectionDialog> createState() =>
      _InterestSelectionDialogState();
}

class _InterestSelectionDialogState extends State<InterestSelectionDialog> {
  final Set<UserInterest> _selected = {};
  bool _isSaving = false;
  String? _errorMessage;

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
  }

  Future<void> _continue() async {
    if (_selected.isEmpty || _isSaving) return;

    setState(() {
      _isSaving = true;
      _errorMessage = null;
    });

    try {
      await widget.interestsService.saveInterests(interests: _selected);
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
      canPop: false,
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
              const Padding(
                padding: EdgeInsets.fromLTRB(24, 28, 24, 16),
                child: _DialogHeader(),
              ),
              Flexible(
                child: GridView.builder(
                  shrinkWrap: true,
                  padding: const EdgeInsets.fromLTRB(20, 4, 20, 4),
                  gridDelegate:
                      const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 2,
                        mainAxisSpacing: 12,
                        crossAxisSpacing: 12,
                        childAspectRatio: 0.86,
                      ),
                  itemCount: UserInterest.values.length,
                  itemBuilder: (_, index) {
                    final interest = UserInterest.values[index];
                    return _InterestCard(
                      interest: interest,
                      isSelected: _selected.contains(interest),
                      onTap: () => _toggle(interest),
                    );
                  },
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
                child: _DialogFooter(
                  selectedCount: _selected.length,
                  isSaving: _isSaving,
                  errorMessage: _errorMessage,
                  onContinue: _selected.isEmpty ? null : _continue,
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
  const _DialogHeader();

  @override
  Widget build(BuildContext context) {
    return Column(
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
            color: AppColors.secondary.withValues(alpha: 0.95),
          ),
        ),
      ],
    );
  }
}

class _DialogFooter extends StatelessWidget {
  const _DialogFooter({
    required this.selectedCount,
    required this.isSaving,
    required this.errorMessage,
    required this.onContinue,
  });

  final int selectedCount;
  final bool isSaving;
  final String? errorMessage;
  final VoidCallback? onContinue;

  @override
  Widget build(BuildContext context) {
    final buttonLabel = selectedCount == 0
        ? 'Select at least one'
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

/// The animated artwork on a card. Plays the category's Lottie file and
/// falls back to the Material icon if the asset has not been added yet, so
/// the picker never shows a broken slot.
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
