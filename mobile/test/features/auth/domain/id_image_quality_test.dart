import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:image/image.dart' as img;
import 'package:mobile/features/auth/domain/id_image_quality.dart';

void main() {
  /// A card-sized photo with dark "text" strokes on a mid-grey ground.
  Uint8List cardPhoto({
    int width = 1600,
    int height = 1000,
    int ground = 170,
    int ink = 30,
    int glareWidth = 0,
  }) {
    final image = img.Image(width: width, height: height);
    img.fill(image, color: img.ColorRgb8(ground, ground, ground));
    for (var y = 80; y < height - 80; y += 40) {
      for (var x = 80; x < width - 80; x += 24) {
        img.fillRect(
          image,
          x1: x,
          y1: y,
          x2: x + 12,
          y2: y + 18,
          color: img.ColorRgb8(ink, ink, ink),
        );
      }
    }
    if (glareWidth > 0) {
      img.fillRect(
        image,
        x1: 0,
        y1: 0,
        x2: glareWidth,
        y2: height,
        color: img.ColorRgb8(255, 255, 255),
      );
    }
    return img.encodePng(image);
  }

  List<IdImageIssue> issuesOf(Uint8List bytes) =>
      IdImageQualityRules.evaluate(IdImageQualityRules.measure(bytes)!);

  group('IdImageQualityRules', () {
    test('accepts a sharp, well-lit photo', () {
      expect(issuesOf(cardPhoto()), isEmpty);
    });

    test('rejects a file that is not an image', () {
      expect(
        IdImageQualityRules.measure(Uint8List.fromList([1, 2, 3])),
        isNull,
      );
    });

    test('rejects a photo that is too small', () {
      expect(
        issuesOf(cardPhoto(width: 600, height: 380)),
        contains(IdImageIssue.tooSmall),
      );
    });

    test('rejects a dark photo', () {
      expect(
        issuesOf(cardPhoto(ground: 35, ink: 5)),
        contains(IdImageIssue.tooDark),
      );
    });

    test('rejects an overexposed photo', () {
      expect(
        issuesOf(cardPhoto(ground: 250, ink: 200)),
        contains(IdImageIssue.overexposed),
      );
    });

    test('rejects glare covering part of the card', () {
      expect(
        issuesOf(cardPhoto(glareWidth: 200)),
        contains(IdImageIssue.glare),
      );
    });

    test('rejects a blurry photo', () {
      final sharp = img.decodePng(cardPhoto())!;
      final blurred = img.gaussianBlur(sharp, radius: 12);
      expect(
        issuesOf(img.encodePng(blurred)),
        contains(IdImageIssue.blurry),
      );
    });

    test('rejects a featureless, washed-out photo', () {
      final issues = issuesOf(cardPhoto(ink: 165));
      expect(issues, contains(IdImageIssue.lowContrast));
      expect(issues, contains(IdImageIssue.blurry));
    });
  });

  group('IdTextReadabilityRules', () {
    const front =
        'UNIVERSITY OF CEBU LAPU-LAPU AND MANDAUE\n'
        'STUDENT\n'
        'MARIA L SANTOS\n'
        '2021-08452\n';
    const back =
        'ADDRESS: Looc, Mandaue City, Cebu\n'
        'TEL NO. 09171234567\n';

    test('needs enough text on each side', () {
      expect(IdTextReadabilityRules.isReadable(IdCardSide.front, front), true);
      expect(IdTextReadabilityRules.isReadable(IdCardSide.front, 'AB'), false);
      expect(IdTextReadabilityRules.isReadable(IdCardSide.back, back), true);
      expect(IdTextReadabilityRules.isReadable(IdCardSide.back, 'x'), false);
    });

    test('front passes with either the name or the ID number', () {
      expect(
        IdTextReadabilityRules.missingKeyFields(frontText: front),
        isEmpty,
      );
      expect(
        IdTextReadabilityRules.missingKeyFields(frontText: 'STUDENT\n12345'),
        ['name', 'ID number'],
      );
    });

    test('both sides together must give the name and the ID number', () {
      expect(
        IdTextReadabilityRules.missingKeyFields(
          frontText: front,
          backText: back,
        ),
        isEmpty,
      );
      expect(
        IdTextReadabilityRules.missingKeyFields(
          frontText: 'STUDENT\nMARIA L SANTOS',
          backText: back,
        ),
        ['ID number'],
      );
    });
  });
}
