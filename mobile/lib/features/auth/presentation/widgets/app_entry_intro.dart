import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:mobile/core/constants/app_assets.dart';
import 'package:mobile/core/theme/app_theme.dart';

/// Splash intro: the CARES poster (outreach photos, the seal and the
/// wordmark) fades up out of the brand green, a quick glass shine crosses the
/// seal, then a pane of frosted glass slides up over it and closes the splash.
///
/// The fade-in happens against [splashGround] — the poster's own ground
/// colour, painted behind it here rather than left to the caller's gradient,
/// so there is no colour shift as the poster arrives. The pane is clear glass:
/// it never tints or goes solid, so the splash hands off with the poster still
/// there, frosted, behind it.
///
/// The seal is baked into the poster, so the shine sits on top of it. Its
/// position is kept in the image's own pixels ([_sealCentre], [_sealRadius])
/// and mapped through the cover fit by [_PosterMap], so it stays on the seal
/// whatever the screen's aspect ratio. The wordmark gets no light pass — it is
/// already pure white, so nothing would read.
///
/// Beats:
///   0.00-0.30  poster fades in
///   0.00-0.90  poster settles from a slight zoom, one continuous ease
///   0.40-0.58  soft halo blooms around the seal and fades
///   0.44-0.56  glass dome highlight on the seal
///   0.46-0.60  shine band sweeps across the seal
///   0.58-0.72  glint twinkles on the seal's rim
///   0.76-0.96  glass pane slides up from the bottom over the poster
///   0.93-1.00  its frosting deepens as it settles home
///
/// The close is held off while an update panel is up ([contentBottomInset]) —
/// the splash is holding for the user to read the panel, so the poster behind
/// it should stay sharp rather than blur away under them.
class AppEntryIntro extends StatelessWidget {
  const AppEntryIntro({
    super.key,
    required this.progress,
    this.contentBottomInset = 0,
  });

  /// Poster's ground green, sampled from its edges.
  static const Color splashGround = Color(0xFF035B34);

  /// Master animation value in [0, 1].
  final double progress;

  /// Lifts the poster (and hides the loader) to keep the seal and wordmark
  /// clear of a panel covering the foot of the splash.
  final double contentBottomInset;

  /// Poster size in pixels, and where the seal sits on it.
  static const Size _imageSize = Size(941, 1671);
  static const Offset _sealCentre = Offset(468.5, 614.5);
  static const double _sealRadius = 193;

  /// Eased slice of [progress] between [start] and [end].
  static double _seg(
    double progress,
    double start,
    double end, [
    Curve curve = Curves.easeOutCubic,
  ]) {
    if (end <= start) return progress >= end ? 1 : 0;
    return curve.transform(
      ((progress - start) / (end - start)).clamp(0.0, 1.0),
    );
  }

  @override
  Widget build(BuildContext context) {
    final zoom = 1.0 + 0.08 * (1 - _seg(progress, 0, 0.90));

    // Close, unless a panel has risen over the foot of the splash: the splash
    // then holds, and the poster behind the panel should stay sharp. The hold
    // ramps in over the panel's first few pixels so neither one pops.
    final panelHold = (contentBottomInset / 40).clamp(0.0, 1.0);
    final fadeIn = _seg(progress, 0, 0.30, Curves.easeOut);

    // The close runs on its own 0-1 clock so the pane's travel and its
    // frosting can be shaped separately without one re-easing the other.
    final closeT = ((progress - 0.76) / 0.24).clamp(0.0, 1.0) * (1 - panelHold);
    // easeInOutCubic: the pane takes up slack, runs, and settles into the
    // frame — a sash sliding home, not a sheet thrown up.
    final rise = Curves.easeInOutCubic.transform(
      (closeT / 0.84).clamp(0.0, 1.0),
    );
    // Frosting deepens a little as the pane settles home. It never tints or
    // goes opaque — the poster stays readable through the glass.
    final frost = Curves.easeIn.transform(
      ((closeT - 0.70) / 0.30).clamp(0.0, 1.0),
    );

    return Stack(
      fit: StackFit.expand,
      children: [
        // The poster's own ground, so the fade-in resolves to the same green
        // instead of to whatever the caller paints behind the splash.
        const ColoredBox(color: splashGround, child: SizedBox.expand()),

        Opacity(
          opacity: fadeIn,
          child: Transform.translate(
            offset: Offset(0, -contentBottomInset / 2),
            child: LayoutBuilder(
              builder: (context, box) {
                final map = _PosterMap.cover(
                  Size(box.maxWidth, box.maxHeight),
                  _imageSize,
                  zoom,
                );
                return ClipRect(
                  child: Stack(
                    fit: StackFit.expand,
                    children: [
                      Transform.scale(
                        scale: zoom,
                        child: const Image(
                          image: AssetImage(AppAssets.entrySplash),
                          fit: BoxFit.cover,
                          gaplessPlayback: true,
                        ),
                      ),
                      CustomPaint(
                        painter: _PosterShinePainter(
                          progress: progress,
                          map: map,
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
          ),
        ),

        // Hairline loader so the wait reads as progress, not lag.
        Positioned(
          left: 0,
          right: 0,
          bottom: 64,
          child: Opacity(
            opacity: contentBottomInset > 0 ? 0 : _seg(progress, 0.2, 0.38),
            child: Center(
              child: SizedBox(
                width: 64,
                height: 2,
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(AppColors.pillRadius),
                  child: Stack(
                    children: [
                      ColoredBox(
                        color: Colors.white.withValues(alpha: 0.22),
                        child: const SizedBox.expand(),
                      ),
                      FractionallySizedBox(
                        widthFactor: Curves.easeInOut.transform(progress),
                        child: ColoredBox(
                          color: Colors.white.withValues(alpha: 0.85),
                          child: const SizedBox.expand(),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),

        // Slides up over everything, loader included, to shut the splash.
        if (rise > 0)
          IgnorePointer(
            child: ClipPath(
              clipper: _GlassPaneClipper(rise: rise),
              child: BackdropFilter(
                filter: ui.ImageFilter.blur(
                  sigmaX: 8 + 12 * frost,
                  sigmaY: 8 + 12 * frost,
                ),
                // Nothing painted on the glass itself — only the blur.
                child: const SizedBox.expand(),
              ),
            ),
          ),

        // The pane's own edge and sheen, over the glass it belongs to.
        if (rise > 0)
          IgnorePointer(child: CustomPaint(painter: _GlassPanePainter(rise))),
      ],
    );
  }
}

/// Depth of the lime crest band riding the closing pane's wave.
const double _kCrestBand = 26;

/// The brand wave carried on the leading edge of the closing pane — the same
/// dip-then-climb curve `BrandWave` paints elsewhere, so the splash closes
/// with the shape the rest of the app is built on.
///
/// [rise] is the pane's travel, 0 (clear of the screen) to 1 (home). The
/// travel overshoots by the wave's amplitude and the crest band at the top,
/// and by the amplitude at the bottom: at 0 the trough is clear of the foot,
/// and at 1 the wave and its band have gone off the head, leaving flat green
/// for the curtain that slides away next. [drop] pushes the whole curve down,
/// which is how the bands along the edge are cut.
Path _paneCrest(Size size, double rise, {double drop = 0}) {
  final w = size.width;
  final amp = math.min(22.0, size.width * 0.062);
  final travel = size.height + amp * 2 + _kCrestBand;
  final y = travel * (1 - rise) - amp - _kCrestBand + drop;
  return Path()
    ..moveTo(0, y + amp * 0.35)
    ..cubicTo(w * 0.30, y + amp, w * 0.64, y - amp * 0.9, w, y - amp * 0.55);
}

/// [_paneCrest] closed down to the foot of the screen — the pane's body.
Path _paneBody(Size size, double rise, {double drop = 0}) =>
    _paneCrest(size, rise, drop: drop)
      ..lineTo(size.width, size.height)
      ..lineTo(0, size.height)
      ..close();

/// Shapes the frosted pane so the blur stops at the wave, not at a straight
/// line.
class _GlassPaneClipper extends CustomClipper<Path> {
  const _GlassPaneClipper({required this.rise});

  final double rise;

  @override
  Path getClip(Size size) => _paneBody(size, rise);

  @override
  bool shouldReclip(_GlassPaneClipper oldClipper) => oldClipper.rise != rise;
}

/// What makes the rising pane read as glass rather than an area of blur: the
/// brand wave on its leading edge with a bold border along it, the light it
/// gathers just inside that edge, and a broad diagonal sheen across the face.
///
/// The frosting itself is a [BackdropFilter] in the widget tree — this only
/// paints the pane's own edge and highlights, over the glass they belong to.
class _GlassPanePainter extends CustomPainter {
  const _GlassPanePainter(this.rise);

  /// How far the pane has travelled, 0 (out of frame) to 1 (home).
  final double rise;

  /// Depth of the glow gathered below the crest band.
  static const double _edgeGlow = 34;

  /// The slice of pane between the crest pushed down [from] and [to].
  Path _slice(Size size, double from, double to) => Path.combine(
    PathOperation.difference,
    _paneBody(size, rise, drop: from),
    _paneBody(size, rise, drop: to),
  );

  @override
  void paint(Canvas canvas, Size size) {
    if (rise <= 0) return;
    final rect = Offset.zero & size;

    // Lime crest riding the wave, the brand band the app closes every photo
    // hero with.
    canvas.drawPath(
      _slice(size, 0, _kCrestBand),
      Paint()
        ..shader = const LinearGradient(
          colors: [AppColors.secondary, AppColors.waveHighlight],
        ).createShader(rect),
    );

    // Light gathered just inside the edge, falling away into the pane.
    canvas.drawPath(
      _slice(size, _kCrestBand, _kCrestBand + _edgeGlow),
      Paint()
        ..shader = LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            Colors.white.withValues(alpha: 0.22),
            Colors.white.withValues(alpha: 0),
          ],
        ).createShader(rect),
    );

    // Sheen: one broad, soft diagonal band down the face of the pane, the way
    // a window catches the light in a room.
    canvas.save();
    canvas.clipPath(_paneBody(size, rise, drop: _kCrestBand));
    canvas.translate(size.width * 0.5, size.height * (1 - rise * 0.7));
    canvas.rotate(-math.pi / 9);
    final band = Rect.fromCenter(
      center: Offset.zero,
      width: size.width * 0.38,
      height: size.height * 2.4,
    );
    canvas.drawRect(
      band,
      Paint()
        ..shader = LinearGradient(
          colors: [
            Colors.white.withValues(alpha: 0),
            Colors.white.withValues(alpha: 0.10),
            Colors.white.withValues(alpha: 0),
          ],
        ).createShader(band),
    );
    canvas.restore();

    // The bold border along the wave: a soft bloom under a heavy white rule,
    // so the closing edge has real weight against the photos behind it.
    final crest = _paneCrest(size, rise);
    canvas.drawPath(
      crest,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 9
        ..color = Colors.white.withValues(alpha: 0.22)
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 6),
    );
    canvas.drawPath(
      crest,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 4
        ..strokeCap = StrokeCap.square
        ..color = Colors.white,
    );
  }

  @override
  bool shouldRepaint(_GlassPanePainter oldDelegate) => oldDelegate.rise != rise;
}

/// Maps poster pixels onto the screen. The poster is cover-fitted and centred,
/// then scaled by `zoom` about the centre of the area — the same transform the
/// [Image] gets, so painted effects land on the artwork.
class _PosterMap {
  const _PosterMap({required this.origin, required this.scale});

  factory _PosterMap.cover(Size area, Size image, double zoom) {
    final scale =
        math.max(area.width / image.width, area.height / image.height) * zoom;
    return _PosterMap(
      origin: Offset(
        (area.width - image.width * scale) / 2,
        (area.height - image.height * scale) / 2,
      ),
      scale: scale,
    );
  }

  final Offset origin;
  final double scale;

  Offset point(Offset p) => origin + p * scale;
  double size(double v) => v * scale;
}

/// Everything that plays on the seal while the poster is up: halo, glass
/// highlight, shine sweep and rim glint. All white, kept light so the seal's
/// colours read through.
class _PosterShinePainter extends CustomPainter {
  const _PosterShinePainter({required this.progress, required this.map});

  final double progress;
  final _PosterMap map;

  /// Sweep direction: tilted so the band crosses top-left to bottom-right.
  static const double _bandAngle = math.pi / 7;

  Offset get _centre => map.point(AppEntryIntro._sealCentre);
  double get _radius => map.size(AppEntryIntro._sealRadius);

  @override
  void paint(Canvas canvas, Size size) {
    _paintHalo(canvas);

    final seal = Path()
      ..addOval(Rect.fromCircle(center: _centre, radius: _radius * 0.99));
    canvas.save();
    canvas.clipPath(seal);
    _paintDome(canvas);
    _paintSweep(canvas);
    canvas.restore();

    _paintGlint(canvas);
  }

  /// Soft white bloom just outside the rim, rising and falling once.
  void _paintHalo(Canvas canvas) {
    final t = ((progress - 0.40) / 0.18).clamp(0.0, 1.0);
    if (t <= 0 || t >= 1) return;
    final fade = math.sin(t * math.pi);
    canvas.drawCircle(
      _centre,
      _radius * (1.0 + 0.04 * t),
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = _radius * 0.08
        ..color = Colors.white.withValues(alpha: 0.32 * fade)
        ..maskFilter = MaskFilter.blur(BlurStyle.normal, _radius * 0.08),
    );
  }

  /// Curved reflection across the upper half, like light on a glass dome.
  void _paintDome(Canvas canvas) {
    final t = ((progress - 0.44) / 0.12).clamp(0.0, 1.0);
    if (t <= 0 || t >= 1) return;
    final fade = math.sin(t * math.pi);
    final rect = Rect.fromCenter(
      center: _centre.translate(0, -_radius * 0.42),
      width: _radius * 1.7,
      height: _radius * 1.05,
    );
    canvas.drawOval(
      rect,
      Paint()
        ..shader = LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            Colors.white.withValues(alpha: 0.32 * fade),
            Colors.white.withValues(alpha: 0),
          ],
        ).createShader(rect),
    );
  }

  /// The shine: a bright band with a thinner one trailing it, flicked across
  /// the seal in one quick pass.
  void _paintSweep(Canvas canvas) {
    final raw = ((progress - 0.46) / 0.14).clamp(0.0, 1.0);
    if (raw <= 0 || raw >= 1) return;
    final t = Curves.easeInOutCubic.transform(raw);

    canvas.save();
    canvas.translate(_centre.dx, _centre.dy);
    canvas.rotate(_bandAngle);

    // Travel from fully left of the seal to fully right of it.
    final travel = _radius * 1.5;
    final x = -travel + 2 * travel * t;
    _band(canvas, x, _radius * 0.55, 0.75);
    _band(canvas, x - _radius * 0.46, _radius * 0.16, 0.42);

    canvas.restore();
  }

  void _band(Canvas canvas, double x, double width, double alpha) {
    final rect = Rect.fromLTWH(
      x - width / 2,
      -_radius * 1.6,
      width,
      _radius * 3.2,
    );
    canvas.drawRect(
      rect,
      Paint()
        ..shader = LinearGradient(
          colors: [
            Colors.white.withValues(alpha: 0),
            Colors.white.withValues(alpha: alpha),
            Colors.white.withValues(alpha: 0),
          ],
        ).createShader(rect),
    );
  }

  /// Four-point sparkle on the upper-right rim, where the sweep exits.
  void _paintGlint(Canvas canvas) {
    final t = ((progress - 0.58) / 0.14).clamp(0.0, 1.0);
    if (t <= 0 || t >= 1) return;
    final pop = math.sin(t * math.pi);
    final at =
        _centre +
        Offset(math.cos(-math.pi / 4), math.sin(-math.pi / 4)) * _radius * 0.86;
    final arm = _radius * 0.16 * pop;
    final waist = arm * 0.16;

    canvas.save();
    canvas.translate(at.dx, at.dy);
    canvas.rotate(t * math.pi / 4);

    canvas.drawCircle(
      Offset.zero,
      arm * 0.7,
      Paint()
        ..color = Colors.white.withValues(alpha: 0.45 * pop)
        ..maskFilter = MaskFilter.blur(BlurStyle.normal, arm * 0.4),
    );

    final star = Path()
      ..moveTo(0, -arm)
      ..quadraticBezierTo(waist, -waist, arm, 0)
      ..quadraticBezierTo(waist, waist, 0, arm)
      ..quadraticBezierTo(-waist, waist, -arm, 0)
      ..quadraticBezierTo(-waist, -waist, 0, -arm)
      ..close();
    canvas.drawPath(
      star,
      Paint()..color = Colors.white.withValues(alpha: 0.95 * pop),
    );
    canvas.restore();
  }

  @override
  bool shouldRepaint(_PosterShinePainter oldDelegate) =>
      oldDelegate.progress != progress ||
      oldDelegate.map.origin != map.origin ||
      oldDelegate.map.scale != map.scale;
}
