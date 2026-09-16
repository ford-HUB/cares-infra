import 'dart:async';

import 'package:flutter/material.dart';
import 'package:mobile/core/services/api_client.dart';
import 'package:mobile/core/theme/app_theme.dart';

/// Event photos for a card header. One image is static; two or more cross-
/// fade to the next every [interval] and loop, with a dot strip showing the
/// position. A tap skips ahead; a finger held on the photo pauses the loop.
/// The URLs point at the server's private image stream, so every request
/// carries the session's bearer token.
///
/// Renders [placeholder] when there are no images so callers keep their
/// category-tinted fallback.
class EventImageCarousel extends StatefulWidget {
  const EventImageCarousel({
    super.key,
    required this.imageUrls,
    required this.placeholder,
    this.height,
    this.interval = const Duration(milliseconds: 2500),
  });

  final List<String> imageUrls;
  final Widget placeholder;

  /// Fixed height, or null to fill whatever the parent gives (a hero).
  final double? height;

  /// How long each image stays before it fades to the next one.
  final Duration interval;

  /// Length of the cross-fade between two photos.
  static const fadeDuration = Duration(milliseconds: 900);

  @override
  State<EventImageCarousel> createState() => _EventImageCarouselState();
}

class _EventImageCarouselState extends State<EventImageCarousel> {
  Timer? _timer;
  int _page = 0;

  bool get _autoplay => widget.imageUrls.length > 1;

  @override
  void initState() {
    super.initState();
    _startTimer();
  }

  @override
  void didUpdateWidget(EventImageCarousel oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.imageUrls.length != widget.imageUrls.length ||
        oldWidget.interval != widget.interval) {
      _startTimer();
    }
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _precacheAround(_page);
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  /// Warm the next photo so the fade lands on pixels, not a spinner.
  void _precacheAround(int index) {
    final urls = widget.imageUrls;
    if (urls.length < 2) return;
    final next = urls[(index + 1) % urls.length];
    precacheImage(
      NetworkImage(next, headers: ApiClient().authHeaders()),
      context,
    );
  }

  void _startTimer() {
    _timer?.cancel();
    if (!_autoplay) return;
    _timer = Timer.periodic(widget.interval, (_) => _advance());
  }

  void _advance() {
    if (!mounted || widget.imageUrls.isEmpty) return;
    final next = (_page + 1) % widget.imageUrls.length;
    setState(() => _page = next);
    _precacheAround(next);
  }

  @override
  Widget build(BuildContext context) {
    if (widget.imageUrls.isEmpty) {
      return _sized(widget.placeholder);
    }

    final headers = ApiClient().authHeaders();

    return _sized(
      Stack(
        fit: StackFit.expand,
        children: [
          // A finger on the photo pauses the loop; a tap skips ahead and
          // the timer restarts from that photo.
          Listener(
            onPointerDown: (_) => _timer?.cancel(),
            onPointerUp: (_) => _startTimer(),
            onPointerCancel: (_) => _startTimer(),
            child: GestureDetector(
              behavior: HitTestBehavior.opaque,
              onTap: _autoplay ? _advance : null,
              child: AnimatedSwitcher(
                duration: EventImageCarousel.fadeDuration,
                switchInCurve: Curves.easeInOut,
                switchOutCurve: Curves.easeInOut,
                // Keep the outgoing photo underneath so the fade never shows
                // the placeholder between two images.
                layoutBuilder: (current, previous) => Stack(
                  fit: StackFit.expand,
                  children: [...previous, ?current],
                ),
                child: KeyedSubtree(
                  key: ValueKey(_page),
                  child: Image.network(
                    widget.imageUrls[_page],
                    headers: headers,
                    fit: BoxFit.cover,
                    gaplessPlayback: true,
                    errorBuilder: (_, _, _) => widget.placeholder,
                    loadingBuilder: (context, child, progress) {
                      if (progress == null) return child;
                      return Stack(
                        fit: StackFit.expand,
                        children: [
                          widget.placeholder,
                          const Center(
                            child: SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: AppColors.primary,
                              ),
                            ),
                          ),
                        ],
                      );
                    },
                  ),
                ),
              ),
            ),
          ),
          if (_autoplay)
            Positioned(
              right: 12,
              bottom: 10,
              child: _ImageDots(count: widget.imageUrls.length, current: _page),
            ),
        ],
      ),
    );
  }

  Widget _sized(Widget child) {
    final height = widget.height;
    return height == null
        ? SizedBox.expand(child: child)
        : SizedBox(height: height, child: child);
  }
}

class _ImageDots extends StatelessWidget {
  const _ImageDots({required this.count, required this.current});

  final int count;
  final int current;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.black.withValues(alpha: 0.28),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: List.generate(count, (index) {
          final active = index == current;
          return AnimatedContainer(
            duration: const Duration(milliseconds: 250),
            margin: const EdgeInsets.symmetric(horizontal: 2),
            width: active ? 12 : 5,
            height: 5,
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: active ? 1 : 0.55),
              borderRadius: BorderRadius.circular(3),
            ),
          );
        }),
      ),
    );
  }
}
