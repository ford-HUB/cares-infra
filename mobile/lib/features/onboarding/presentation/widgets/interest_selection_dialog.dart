import 'package:flutter/material.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/onboarding/domain/user_interest.dart';

/// Shows a blocking popup for the user to pick one or more interests after login.
Future<Set<UserInterest>?> showInterestSelectionDialog(BuildContext context) {
  return showDialog<Set<UserInterest>>(
    context: context,
    barrierDismissible: false,
    builder: (_) => const InterestSelectionDialog(),
  );
}

class InterestSelectionDialog extends StatefulWidget {
  const InterestSelectionDialog({super.key});

  @override
  State<InterestSelectionDialog> createState() => _InterestSelectionDialogState();
}

class _InterestSelectionDialogState extends State<InterestSelectionDialog> {
  final Set<UserInterest> _selected = {};

  void _toggle(UserInterest interest) {
    setState(() {
      if (_selected.contains(interest)) {
        _selected.remove(interest);
      } else {
        _selected.add(interest);
      }
    });
  }

  void _continue() {
    if (_selected.isEmpty) return;
    Navigator.of(context).pop(Set<UserInterest>.from(_selected));
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: AppColors.background,
      insetPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(24, 28, 24, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'What interests you?',
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
              'Choose the areas you would like to follow in CARES.',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 14,
                height: 1.45,
                color: AppColors.secondary.withValues(alpha: 0.95),
              ),
            ),
            const SizedBox(height: 24),
            for (final interest in UserInterest.values) ...[
              _InterestOptionTile(
                interest: interest,
                isSelected: _selected.contains(interest),
                onTap: () => _toggle(interest),
              ),
              const SizedBox(height: 10),
            ],
            const SizedBox(height: 8),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _selected.isEmpty ? null : _continue,
                child: const Text('Continue'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _InterestOptionTile extends StatelessWidget {
  const _InterestOptionTile({
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

    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeOutCubic,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: isSelected ? accent : AppColors.fieldBorder,
              width: isSelected ? 1.5 : 1,
            ),
            boxShadow: isSelected
                ? [
                    BoxShadow(
                      color: accent.withValues(alpha: 0.12),
                      blurRadius: 10,
                      offset: const Offset(0, 3),
                    ),
                  ]
                : null,
          ),
          child: Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: accent.withValues(alpha: 0.14),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(interest.icon, color: accent, size: 26),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Text(
                  interest.label,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: AppColors.primaryDark,
                  ),
                ),
              ),
              AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                width: 24,
                height: 24,
                decoration: BoxDecoration(
                  color: isSelected ? accent : Colors.transparent,
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(
                    color: isSelected ? accent : AppColors.light,
                    width: 1.5,
                  ),
                ),
                child: isSelected
                    ? const Icon(Icons.check_rounded, size: 16, color: Colors.white)
                    : null,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
