import 'dart:io';

import 'package:flutter/material.dart';

/// Front-camera photos are saved unmirrored; flip for natural preview.
class UnmirroredFaceImage extends StatelessWidget {
  const UnmirroredFaceImage({
    super.key,
    required this.filePath,
    this.fit = BoxFit.cover,
  });

  final String filePath;
  final BoxFit fit;

  @override
  Widget build(BuildContext context) {
    return Transform.flip(
      flipX: true,
      child: Image.file(File(filePath), fit: fit),
    );
  }
}
