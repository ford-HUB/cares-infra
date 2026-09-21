import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../../data/certificate_data.dart';
import '../../data/certificate_service.dart';
import '../utils/certificate_palette.dart';
import 'certificate_frame_ornament.dart';
import 'certificate_seal_mark.dart';

/// Point size is set on an 11in-wide sheet in the portal; the same point
/// converts to a fraction of whatever width the sheet is drawn at here.
const _sheetWidthPt = 792.0;

/// Top to bottom, the blocks the portal's editor places.
const _elementOrder = ['headline', 'title', 'body', 'seal', 'signatures'];

/// The issued certificate, drawn as the director designed it: the frame and
/// accent, every block at the position and size it was dragged to, the placed
/// images in their own stacking order, the seal, and the signature lines with
/// the images they were issued with. Everything is relative to the sheet's
/// width, so the same layout reads identically on the phone, in the export
/// and on the portal.
class CertificateSheet extends StatelessWidget {
  const CertificateSheet({super.key, required this.certificate});

  final CaresCertificate certificate;

  @override
  Widget build(BuildContext context) {
    final design = certificate.design;
    final portrait = !certificate.isLandscape;

    return AspectRatio(
      aspectRatio: portrait ? 3 / 4 : 4 / 3,
      child: LayoutBuilder(
        builder: (context, constraints) {
          final width = constraints.maxWidth;
          final height = constraints.maxHeight;
          if (design == null) {
            return _FallbackSheet(certificate: certificate, width: width);
          }
          return _DesignedSheet(
            certificate: certificate,
            design: design,
            width: width,
            height: height,
          );
        },
      ),
    );
  }
}

class _DesignedSheet extends StatelessWidget {
  const _DesignedSheet({
    required this.certificate,
    required this.design,
    required this.width,
    required this.height,
  });

  final CaresCertificate certificate;
  final CertificateDesign design;
  final double width;
  final double height;

  double _pt(double pt) => pt * width / _sheetWidthPt;

  @override
  Widget build(BuildContext context) {
    final service = CertificateService();
    final uploadedFrame = design.frameSvgUrl;
    final behind = design.images.where((image) => image.z < 0).toList()
      ..sort((a, b) => a.z.compareTo(b.z));
    final inFront = design.images.where((image) => image.z >= 0).toList()
      ..sort((a, b) => a.z.compareTo(b.z));

    return ClipRRect(
      borderRadius: BorderRadius.circular(width * 0.012),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          border: uploadedFrame == null
              ? certificateSheetBorder(design.frame, design.accent, width)
              : null,
        ),
        child: Stack(
          clipBehavior: Clip.none,
          children: [
            if (uploadedFrame != null)
              Positioned.fill(
                child: SvgPicture.network(
                  service.imageUrl(uploadedFrame),
                  headers: service.imageHeaders,
                  fit: BoxFit.contain,
                ),
              )
            else
              Positioned.fill(
                child: CertificateFrameOrnament(
                  frame: design.frame,
                  accent: design.accent,
                ),
              ),
            for (final image in behind) _placedImage(image, service),
            for (final id in _elementOrder)
              if (_visible(id)) _placedElement(id),
            for (final image in inFront) _placedImage(image, service),
          ],
        ),
      ),
    );
  }

  bool _visible(String id) {
    if (id == 'seal') return design.showSeal;
    if (id == 'signatures') return design.signatories.isNotEmpty;
    return true;
  }

  /// A block centred on its layout point, spanning its width; when the
  /// director fixed its height the text is centred and scaled down to fit.
  Widget _placedElement(String id) {
    final position = design.positionOf(id);
    final fixedHeight = design.heightOf(id);
    // The seal is drawn at its own diameter; every other block spans its width.
    final blockWidth = width * design.widthOf(id) / 100;
    final blockHeight = fixedHeight == null ? null : height * fixedHeight / 100;

    Widget content = _element(id);
    if (blockHeight != null) {
      content = SizedBox(
        width: blockWidth,
        height: blockHeight,
        child: FittedBox(
          fit: BoxFit.scaleDown,
          alignment: Alignment.center,
          child: SizedBox(width: blockWidth, child: content),
        ),
      );
    } else {
      content = SizedBox(width: blockWidth, child: content);
    }

    return Positioned(
      left: width * position.x / 100,
      top: height * position.y / 100,
      child: FractionalTranslation(
        translation: const Offset(-0.5, -0.5),
        child: content,
      ),
    );
  }

  Widget _placedImage(CertificateImage image, CertificateService service) {
    final w = width * image.width / 100;
    final h = height * image.height / 100;
    Widget picture = Image.network(
      service.imageUrl(image.url),
      headers: service.imageHeaders,
      width: w,
      height: h,
      fit: BoxFit.cover,
      errorBuilder: (_, _, _) => SizedBox(width: w, height: h),
    );
    picture = switch (image.shape) {
      'circle' => ClipOval(child: picture),
      'rounded' => ClipRRect(
        borderRadius: BorderRadius.circular(width * 0.012),
        child: picture,
      ),
      'triangle' => ClipPath(clipper: _TriangleClipper(), child: picture),
      _ => picture,
    };
    return Positioned(
      left: width * image.x / 100,
      top: height * image.y / 100,
      child: FractionalTranslation(
        translation: const Offset(-0.5, -0.5),
        child: picture,
      ),
    );
  }

  TextAlign _textAlign(String id) => switch (design.alignOf(id)) {
    'left' => TextAlign.left,
    'right' => TextAlign.right,
    _ => TextAlign.center,
  };

  CrossAxisAlignment _crossAlign(String id) => switch (design.alignOf(id)) {
    'left' => CrossAxisAlignment.start,
    'right' => CrossAxisAlignment.end,
    _ => CrossAxisAlignment.center,
  };

  TextStyle _style(String id, {double scale = 1, TextStyle? base}) {
    final size = _pt(design.fontSizePtOf(id) * scale);
    return certificateFontStyle(
      fontId: design.fontOf(id),
      frame: design.frame,
      element: id,
      base: (base ?? const TextStyle()).copyWith(fontSize: size),
    );
  }

  Widget _element(String id) {
    final tone = certificatePalette(design.accent);

    if (id == 'headline') {
      final style = _style(
        id,
        base: TextStyle(
          color: tone.headline,
          fontWeight: certificateHeadlineWeight(design.frame),
          height: 1.25,
        ),
      );
      return Column(
        crossAxisAlignment: _crossAlign(id),
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            design.headline.toUpperCase(),
            textAlign: _textAlign(id),
            style: style.copyWith(
              letterSpacing:
                  (style.fontSize ?? 12) *
                  certificateHeadlineTracking(design.frame),
            ),
          ),
          SizedBox(height: width * 0.012),
          Container(
            height: width * 0.005,
            width: width * 0.14,
            decoration: BoxDecoration(
              color: tone.rule,
              borderRadius: BorderRadius.circular(width),
            ),
          ),
        ],
      );
    }

    if (id == 'title') {
      return Text(
        certificate.title,
        textAlign: _textAlign(id),
        style: _style(
          id,
          base: const TextStyle(
            color: certificateInk,
            fontWeight: FontWeight.w600,
            height: 1.2,
          ),
        ),
      );
    }

    if (id == 'body') {
      return Text(
        design.body,
        textAlign: _textAlign(id),
        style: _style(
          id,
          base: const TextStyle(color: certificateInkSoft, height: 1.6),
        ),
      );
    }

    if (id == 'seal') {
      final alignment = switch (design.alignOf(id)) {
        'left' => Alignment.centerLeft,
        'right' => Alignment.centerRight,
        _ => Alignment.center,
      };
      return Align(
        alignment: alignment,
        child: CertificateSealMark(
          design: design,
          diameter: width * design.widthOf('seal') / 100,
          labelStyle: _style(id, base: const TextStyle(height: 1)),
        ),
      );
    }

    return _signatures();
  }

  Widget _signatures() {
    final id = 'signatures';
    final service = CertificateService();
    final nameStyle = _style(
      id,
      base: const TextStyle(color: certificateInk, fontWeight: FontWeight.w600),
    );
    final titleStyle = _style(
      id,
      scale: 0.9,
      base: const TextStyle(color: certificateInkSoft),
    );
    final departmentStyle = _style(
      id,
      scale: 0.8,
      base: const TextStyle(color: certificateInkMuted),
    );
    final gap = width * 0.04;
    final lineMax = width * 0.30;
    final signatureHeight = _pt(design.fontSizePtOf(id)) * 3;
    final justify = switch (design.alignOf(id)) {
      'left' => MainAxisAlignment.start,
      'right' => MainAxisAlignment.end,
      _ => MainAxisAlignment.spaceEvenly,
    };

    return Row(
      mainAxisAlignment: justify,
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        for (var i = 0; i < design.signatories.length; i++) ...[
          if (i > 0) SizedBox(width: gap),
          Flexible(
            child: ConstrainedBox(
              constraints: BoxConstraints(maxWidth: lineMax),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  SizedBox(
                    height: signatureHeight,
                    child: design.signatories[i].signatureUrl == null
                        ? null
                        : Image.network(
                            service.imageUrl(
                              design.signatories[i].signatureUrl!,
                            ),
                            headers: service.imageHeaders,
                            fit: BoxFit.contain,
                            errorBuilder: (_, _, _) => const SizedBox.shrink(),
                          ),
                  ),
                  SizedBox(height: width * 0.008),
                  Container(height: 1, color: certificateRuleGrey),
                  SizedBox(height: width * 0.008),
                  Text(
                    design.signatories[i].name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    textAlign: TextAlign.center,
                    style: nameStyle,
                  ),
                  Text(
                    design.signatories[i].title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    textAlign: TextAlign.center,
                    style: titleStyle,
                  ),
                  Text(
                    design.signatories[i].department,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    textAlign: TextAlign.center,
                    style: departmentStyle,
                  ),
                ],
              ),
            ),
          ),
        ],
      ],
    );
  }
}

class _TriangleClipper extends CustomClipper<Path> {
  @override
  Path getClip(Size size) => Path()
    ..moveTo(size.width / 2, 0)
    ..lineTo(size.width, size.height)
    ..lineTo(0, size.height)
    ..close();

  @override
  bool shouldReclip(covariant CustomClipper<Path> oldClipper) => false;
}

/// A certificate issued before the sheet design travelled with it: plain
/// wording on a white sheet, so it still prints.
class _FallbackSheet extends StatelessWidget {
  const _FallbackSheet({required this.certificate, required this.width});

  final CaresCertificate certificate;
  final double width;

  @override
  Widget build(BuildContext context) {
    final tone = certificatePalette(certificate.accent);
    return Container(
      padding: EdgeInsets.all(width * 0.06),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: certificateBorderGrey),
        borderRadius: BorderRadius.circular(width * 0.012),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            certificate.headline.toUpperCase(),
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: width * 0.02,
              letterSpacing: width * 0.005,
              color: tone.headline,
            ),
          ),
          SizedBox(height: width * 0.02),
          Text(
            certificate.title,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: width * 0.05,
              fontWeight: FontWeight.w600,
              color: certificateInk,
            ),
          ),
          SizedBox(height: width * 0.03),
          Text(
            certificate.body,
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: width * 0.02, color: certificateInkSoft),
          ),
        ],
      ),
    );
  }
}
