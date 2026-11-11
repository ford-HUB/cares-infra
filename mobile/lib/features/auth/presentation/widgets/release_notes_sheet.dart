import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/core/constants/app_copy.dart';
import 'package:mobile/core/models/app_release.dart';
import 'package:mobile/core/services/app_update_service.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/auth/presentation/providers/app_update_provider.dart';
import 'package:mobile/features/auth/presentation/widgets/release_notes_markdown.dart';
import 'package:mobile/shared/widgets/gradient_button.dart';
import 'package:mobile/shared/widgets/ground_card.dart';
import 'package:url_launcher/url_launcher.dart';

/// Share of the screen the sheet opens at.
const double _sheetInitialSize = 0.7;

/// Share of the screen the sheet expands to — the whole screen.
const double _sheetMaxSize = 1.0;

/// Dragged down to this share, the modal closes.
const double _sheetMinSize = 0.4;

/// Released below this share (from the header), the sheet closes instead of
/// settling back at [_sheetInitialSize].
const double _sheetCloseBelow = 0.55;

/// Corner radius of the sheet while it is not full screen.
const double _sheetRadius = 26;

/// Opens the release history read from GitHub Releases, newest first. The
/// sheet slides up to 70% of the screen. Scrolling the notes (or dragging the
/// header up) expands it to full screen; scrolling back to the top and
/// pulling down shrinks it again, and pulling past 70% closes it.
Future<void> showReleaseNotesSheet(BuildContext context) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    barrierColor: AppColors.navBar.withValues(alpha: 0.45),
    sheetAnimationStyle: const AnimationStyle(
      duration: Duration(milliseconds: 520),
      reverseDuration: Duration(milliseconds: 320),
    ),
    builder: (_) => const _ReleaseNotesSheet(),
  );
}

class _ReleaseNotesSheet extends ConsumerStatefulWidget {
  const _ReleaseNotesSheet();

  @override
  ConsumerState<_ReleaseNotesSheet> createState() => _ReleaseNotesSheetState();
}

class _ReleaseNotesSheetState extends ConsumerState<_ReleaseNotesSheet> {
  final _sheet = DraggableScrollableController();

  /// Current sheet size as a share of the screen, driving the status-bar
  /// inset and corner radius as the sheet reaches the top.
  final _extent = ValueNotifier<double>(_sheetInitialSize);

  @override
  void dispose() {
    _sheet.dispose();
    _extent.dispose();
    super.dispose();
  }

  void _onHeaderDrag(DragUpdateDetails d, double screenHeight) {
    if (!_sheet.isAttached) return;
    final next = (_sheet.size - d.primaryDelta! / screenHeight).clamp(
      _sheetMinSize,
      _sheetMaxSize,
    );
    _sheet.jumpTo(next);
  }

  void _onHeaderDragEnd(DragEndDetails d) {
    if (!_sheet.isAttached) return;
    final size = _sheet.size;
    final velocity = d.primaryVelocity ?? 0;

    final bool close;
    final double target;
    if (velocity > 700) {
      // Flung down: one step down from where it is.
      close = size <= _sheetInitialSize + 0.02;
      target = _sheetInitialSize;
    } else if (velocity < -700) {
      close = false;
      target = _sheetMaxSize;
    } else {
      close = size < _sheetCloseBelow;
      target = size > (_sheetInitialSize + _sheetMaxSize) / 2
          ? _sheetMaxSize
          : _sheetInitialSize;
    }

    if (close) {
      // The modal may already have closed itself on reaching the min size.
      final route = ModalRoute.of(context);
      if (route != null && route.isCurrent) Navigator.of(context).pop();
      return;
    }
    _sheet.animateTo(
      target,
      duration: const Duration(milliseconds: 280),
      curve: Curves.easeOutCubic,
    );
  }

  @override
  Widget build(BuildContext context) {
    final installed = ref.watch(installedVersionProvider).valueOrNull;
    final history = ref.watch(releaseHistoryProvider);
    final entries = history.valueOrNull ?? const <AppReleaseEntry>[];

    // Offer the newest installable release when it is above this build.
    final newest = entries.where((e) => e.installable != null).firstOrNull;
    final update =
        AppUpdateService.isSupported &&
            installed != null &&
            newest != null &&
            AppRelease.compareVersions(newest.version, installed) > 0
        ? newest.installable
        : null;

    final media = MediaQuery.of(context);
    final bottomInset = media.viewPadding.bottom;
    final topInset = media.viewPadding.top;
    final screenHeight = media.size.height;

    final Widget content = history.when(
      skipLoadingOnRefresh: false,
      loading: () => const _Loading(key: ValueKey('loading')),
      error: (_, _) => _Notice(
        key: const ValueKey('error'),
        text: AppCopy.releaseNotesLoadFailed,
        action: AppCopy.updateRetry,
        onAction: () => ref.invalidate(releaseHistoryProvider),
      ),
      data: (list) {
        if (AppUpdateService.releasesRepo == null) {
          return const _Notice(
            key: ValueKey('unavailable'),
            text: AppCopy.releaseNotesUnavailable,
          );
        }
        if (list.isEmpty) {
          return const _Notice(
            key: ValueKey('empty'),
            text: AppCopy.releaseNotesEmpty,
          );
        }
        return Column(
          key: const ValueKey('list'),
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            for (var i = 0; i < list.length; i++) ...[
              if (i > 0) const SizedBox(height: 12),
              _Entrance(
                index: i,
                child: _ReleaseCard(
                  entry: list[i],
                  isLatest: i == 0,
                  isInstalled: installed == list[i].version,
                ),
              ),
            ],
            if (AppUpdateService.releasesPageUrl case final url?) ...[
              const SizedBox(height: 10),
              Center(
                child: TextButton.icon(
                  onPressed: () => _openUrl(context, url),
                  icon: const Icon(Icons.open_in_new_rounded, size: 18),
                  label: const Text(AppCopy.releaseNotesAllOnGitHub),
                  style: TextButton.styleFrom(
                    foregroundColor: AppColors.primaryDark,
                    textStyle: const TextStyle(fontWeight: FontWeight.w800),
                  ),
                ),
              ),
            ],
          ],
        );
      },
    );

    // Pinned header — dragging it moves the sheet: up to full screen, down
    // to 70% and then closed.
    final header = GestureDetector(
      behavior: HitTestBehavior.opaque,
      onVerticalDragUpdate: (d) => _onHeaderDrag(d, screenHeight),
      onVerticalDragEnd: _onHeaderDragEnd,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 10, 20, 14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const _Handle(),
            const SizedBox(height: 14),
            IconTileHeading(
              icon: Icons.new_releases_rounded,
              title: AppCopy.releaseNotesTitle,
              body: installed == null
                  ? null
                  : update == null
                  ? AppCopy.releaseNotesInstalledBody(installed)
                  : AppCopy.releaseNotesUpdateBody(installed, update.version),
            ),
            AnimatedSize(
              duration: const Duration(milliseconds: 280),
              curve: Curves.easeOutCubic,
              alignment: Alignment.topCenter,
              child: update == null
                  ? const SizedBox(width: double.infinity)
                  : Padding(
                      padding: const EdgeInsets.only(top: 14),
                      child: _UpdateAction(release: update),
                    ),
            ),
          ],
        ),
      ),
    );

    return NotificationListener<DraggableScrollableNotification>(
      onNotification: (n) {
        _extent.value = n.extent;
        return false; // Let the modal see it so it can close at min size.
      },
      child: DraggableScrollableSheet(
        controller: _sheet,
        expand: false,
        initialChildSize: _sheetInitialSize,
        minChildSize: _sheetMinSize,
        maxChildSize: _sheetMaxSize,
        snap: true,
        snapSizes: const [_sheetInitialSize],
        builder: (context, scrollController) {
          final body = Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              header,
              const Divider(
                height: 1,
                thickness: 1,
                color: AppColors.cardBorder,
              ),
              Expanded(
                child: SingleChildScrollView(
                  controller: scrollController,
                  // Always scrollable so a short list (loading, empty)
                  // still drives the sheet up and down.
                  physics: const BouncingScrollPhysics(
                    parent: AlwaysScrollableScrollPhysics(),
                  ),
                  padding: EdgeInsets.fromLTRB(16, 16, 16, 24 + bottomInset),
                  child: AnimatedSwitcher(
                    duration: const Duration(milliseconds: 280),
                    switchInCurve: Curves.easeOutCubic,
                    switchOutCurve: Curves.easeInCubic,
                    layoutBuilder: (current, previous) => Stack(
                      alignment: Alignment.topCenter,
                      children: [...previous, ?current],
                    ),
                    child: content,
                  ),
                ),
              ),
            ],
          );

          return ValueListenableBuilder<double>(
            valueListenable: _extent,
            child: body,
            builder: (context, extent, child) {
              // How far the sheet's top has slid under the status bar:
              // 0 while clear of it, 1 once full screen.
              final gap = screenHeight * (1 - extent);
              final under = topInset <= 0
                  ? (extent >= _sheetMaxSize ? 1.0 : 0.0)
                  : ((topInset - gap) / topInset).clamp(0.0, 1.0);
              final radius = _sheetRadius * (1 - under);
              return DecoratedBox(
                decoration: BoxDecoration(
                  color: AppColors.background,
                  borderRadius: BorderRadius.vertical(
                    top: Radius.circular(radius),
                  ),
                  boxShadow: const [
                    BoxShadow(
                      color: Color(0x33000000),
                      blurRadius: 24,
                      offset: Offset(0, -4),
                    ),
                  ],
                ),
                child: Padding(
                  padding: EdgeInsets.only(top: topInset * under),
                  child: child,
                ),
              );
            },
          );
        },
      ),
    );
  }
}

/// Fades and lifts a release card in, one after another, once the sheet is up.
class _Entrance extends StatelessWidget {
  const _Entrance({required this.index, required this.child});

  final int index;
  final Widget child;

  static const int _stepMs = 70;
  static const int _runMs = 420;

  @override
  Widget build(BuildContext context) {
    final delay = index.clamp(0, 5) * _stepMs;
    final total = _runMs + delay;
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: 1),
      duration: Duration(milliseconds: total),
      curve: Interval(delay / total, 1, curve: Curves.easeOutCubic),
      child: child,
      builder: (context, t, child) => Opacity(
        opacity: t,
        child: Transform.translate(
          offset: Offset(0, 18 * (1 - t)),
          child: child,
        ),
      ),
    );
  }
}

Future<void> _openUrl(BuildContext context, String url) async {
  final messenger = ScaffoldMessenger.maybeOf(context);
  final opened = await launchUrl(
    Uri.parse(url),
    mode: LaunchMode.externalApplication,
  ).catchError((_) => false);
  if (!opened) {
    messenger?.showSnackBar(
      const SnackBar(
        content: Text(AppCopy.releaseNotesOpenFailed),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }
}

class _Handle extends StatelessWidget {
  const _Handle();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Container(
        width: 40,
        height: 4,
        decoration: BoxDecoration(
          color: AppColors.cardBorder,
          borderRadius: BorderRadius.circular(AppColors.pillRadius),
        ),
      ),
    );
  }
}

/// "Update to vX" with download progress, reusing the splash's installer
/// flow through [appUpdateProvider].
class _UpdateAction extends ConsumerWidget {
  const _UpdateAction({required this.release});

  final AppRelease release;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final update = ref.watch(appUpdateProvider);
    final mine = update.release?.version == release.version;
    final phase = mine ? update.phase : AppUpdatePhase.available;
    final downloading = phase == AppUpdatePhase.downloading;
    final retry =
        phase == AppUpdatePhase.failed || phase == AppUpdatePhase.installing;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (downloading) ...[
          ClipRRect(
            borderRadius: BorderRadius.circular(AppColors.pillRadius),
            child: LinearProgressIndicator(
              value: update.progress,
              minHeight: 6,
              backgroundColor: AppColors.softFieldFill,
              color: AppColors.primary,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            update.progress == null
                ? AppCopy.updateDownloading
                : '${AppCopy.updateDownloading} · ${(update.progress! * 100).round()}%',
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: AppColors.primaryDark,
            ),
          ),
        ] else ...[
          if (phase == AppUpdatePhase.failed && update.error != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Text(
                update.error!,
                style: const TextStyle(
                  fontSize: 13,
                  height: 1.4,
                  color: AppColors.error,
                ),
              ),
            ),
          if (phase == AppUpdatePhase.installing)
            const Padding(
              padding: EdgeInsets.only(bottom: 10),
              child: Text(
                '${AppCopy.updateInstalling} ${AppCopy.updateInstallerHint}',
                style: TextStyle(
                  fontSize: 13,
                  height: 1.4,
                  color: AppColors.inkMuted,
                ),
              ),
            ),
          GradientButton(
            label: retry
                ? AppCopy.updateRetry
                : AppCopy.releaseNotesUpdateTo(release.version),
            icon: retry ? Icons.refresh_rounded : Icons.download_rounded,
            onPressed: () =>
                ref.read(appUpdateProvider.notifier).startUpdateTo(release),
          ),
        ],
      ],
    );
  }
}

class _ReleaseCard extends StatelessWidget {
  const _ReleaseCard({
    required this.entry,
    required this.isLatest,
    required this.isInstalled,
  });

  final AppReleaseEntry entry;
  final bool isLatest;
  final bool isInstalled;

  @override
  Widget build(BuildContext context) {
    final date = entry.publishedAt;
    return GroundCard(
      padding: const EdgeInsets.fromLTRB(18, 16, 18, 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Wrap(
                  spacing: 6,
                  runSpacing: 4,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    Padding(
                      padding: const EdgeInsets.only(right: 2),
                      child: Text(
                        'v${entry.version}',
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w900,
                          color: AppColors.ink,
                        ),
                      ),
                    ),
                    if (isLatest)
                      const _Chip(
                        label: AppCopy.releaseNotesLatest,
                        fill: AppColors.primary,
                        text: Colors.white,
                      ),
                    if (isInstalled)
                      const _Chip(
                        label: AppCopy.releaseNotesInstalled,
                        fill: AppColors.softFieldFill,
                        text: AppColors.primaryDark,
                      ),
                    if (entry.isRequired)
                      _Chip(
                        label: AppCopy.releaseNotesRequired,
                        fill: AppColors.accentOrange.withValues(alpha: 0.12),
                        text: AppColors.accentOrange,
                      ),
                  ],
                ),
              ),
              if (date != null)
                Padding(
                  padding: const EdgeInsets.only(left: 8, top: 4),
                  child: Text(
                    _formatDate(date),
                    style: const TextStyle(
                      fontSize: 12.5,
                      fontWeight: FontWeight.w600,
                      color: AppColors.inkMuted,
                    ),
                  ),
                ),
            ],
          ),
          if (entry.title != null) ...[
            const SizedBox(height: 4),
            Text(
              entry.title!,
              style: const TextStyle(
                fontSize: 14.5,
                fontWeight: FontWeight.w800,
                color: AppColors.primaryDark,
              ),
            ),
          ],
          const SizedBox(height: 12),
          const Divider(
            height: 1,
            thickness: 1,
            color: AppColors.softFieldBorder,
          ),
          const SizedBox(height: 12),
          if (entry.markdown.isEmpty)
            const Text(
              AppCopy.releaseNotesNoNotes,
              style: TextStyle(fontSize: 13.5, color: AppColors.inkMuted),
            )
          else
            ReleaseNotesMarkdown(
              markdown: entry.markdown,
              onOpenLink: (url) => _openUrl(context, url),
            ),
          if (entry.pageUrl case final url?)
            Align(
              alignment: Alignment.centerRight,
              child: TextButton(
                onPressed: () => _openUrl(context, url),
                style: TextButton.styleFrom(
                  foregroundColor: AppColors.primary,
                  textStyle: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                child: const Text(AppCopy.releaseNotesViewOnGitHub),
              ),
            )
          else
            const SizedBox(height: 8),
        ],
      ),
    );
  }

  static const _months = [
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

  static String _formatDate(DateTime d) =>
      '${_months[d.month - 1]} ${d.day}, ${d.year}';
}

class _Chip extends StatelessWidget {
  const _Chip({required this.label, required this.fill, required this.text});

  final String label;
  final Color fill;
  final Color text;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: fill,
        borderRadius: BorderRadius.circular(AppColors.pillRadius),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w800,
          color: text,
        ),
      ),
    );
  }
}

class _Loading extends StatelessWidget {
  const _Loading({super.key});

  @override
  Widget build(BuildContext context) {
    return const Padding(
      padding: EdgeInsets.symmetric(vertical: 36),
      child: Center(
        child: SizedBox(
          width: 26,
          height: 26,
          child: CircularProgressIndicator(
            strokeWidth: 2.6,
            color: AppColors.primary,
          ),
        ),
      ),
    );
  }
}

class _Notice extends StatelessWidget {
  const _Notice({super.key, required this.text, this.action, this.onAction});

  final String text;
  final String? action;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    return GroundCard(
      child: Column(
        children: [
          Text(
            text,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 14,
              height: 1.45,
              color: AppColors.textSecondary,
            ),
          ),
          if (action != null && onAction != null) ...[
            const SizedBox(height: 6),
            TextButton(
              onPressed: onAction,
              style: TextButton.styleFrom(
                foregroundColor: AppColors.primaryDark,
                textStyle: const TextStyle(fontWeight: FontWeight.w800),
              ),
              child: Text(action!),
            ),
          ],
        ],
      ),
    );
  }
}
