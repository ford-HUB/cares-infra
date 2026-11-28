import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';
import 'package:path_provider/path_provider.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:share_plus/share_plus.dart';

import '../../data/certificate_data.dart';

/// 300dpi on an 11in sheet.
const _targetPixelsWide = 3300.0;

/// US Letter in PDF points, matching the portal's 792pt type width.
PdfPageFormat _pageFormat(CaresCertificate certificate) =>
    certificate.isLandscape
    ? const PdfPageFormat(792, 594)
    : const PdfPageFormat(594, 792);

/// Captures the rendered pixels at print resolution, so nothing is re-flowed.
Future<File> exportCertificatePdf({
  required GlobalKey boundaryKey,
  required CaresCertificate certificate,
}) async {
  final boundary =
      boundaryKey.currentContext!.findRenderObject() as RenderRepaintBoundary;
  final logicalWidth = boundary.size.width;
  final pixelRatio = (_targetPixelsWide / logicalWidth).clamp(2.0, 8.0);

  final image = await boundary.toImage(pixelRatio: pixelRatio);
  final data = await image.toByteData(format: ui.ImageByteFormat.png);
  image.dispose();
  if (data == null) {
    throw StateError('The certificate could not be rendered');
  }

  final document = pw.Document(
    title: '${certificate.title} — ${certificate.eventName}',
    author: 'CARES',
    subject: certificate.certificateNumber,
  );
  final format = _pageFormat(certificate);
  final picture = pw.MemoryImage(data.buffer.asUint8List());

  document.addPage(
    pw.Page(
      pageFormat: format,
      margin: pw.EdgeInsets.zero,
      build: (_) => pw.SizedBox(
        width: format.width,
        height: format.height,
        child: pw.Image(picture, fit: pw.BoxFit.contain),
      ),
    ),
  );

  final directory = await _downloadsDirectory();
  final safeNumber = certificate.certificateNumber.replaceAll(
    RegExp(r'[^\w-]'),
    '_',
  );
  final file = File('${directory.path}/CARES_$safeNumber.pdf');
  await file.writeAsBytes(await document.save(), flush: true);
  return file;
}

/// App Downloads on Android (Files under Android/data), documents elsewhere;
/// kept whether or not it is shared.
Future<Directory> _downloadsDirectory() async {
  if (Platform.isAndroid) {
    final downloads = await getDownloadsDirectory();
    if (downloads != null) return downloads;
  }
  return getApplicationDocumentsDirectory();
}

/// False when the share plugin isn't in this build (hot reload after adding
/// it); the file is already saved.
Future<bool> shareCertificatePdf(
  File file,
  CaresCertificate certificate,
) async {
  try {
    await SharePlus.instance.share(
      ShareParams(
        files: [XFile(file.path, mimeType: 'application/pdf')],
        subject: '${certificate.title} — ${certificate.eventName}',
        text: 'Certificate No. ${certificate.certificateNumber}',
      ),
    );
    return true;
  } on MissingPluginException {
    return false;
  }
}
