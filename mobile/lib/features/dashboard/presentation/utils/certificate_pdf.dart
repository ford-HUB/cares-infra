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

/// Pixels across the long edge of the rasterised sheet — 300dpi on an 11in
/// sheet, so the PDF prints as sharply as the portal's own export would.
const _targetPixelsWide = 3300.0;

/// The sheet as printed: US Letter in the certificate's orientation, in
/// PDF points, matching the 792pt width the portal sizes type against.
PdfPageFormat _pageFormat(CaresCertificate certificate) =>
    certificate.isLandscape
    ? const PdfPageFormat(792, 594)
    : const PdfPageFormat(594, 792);

/// Turns the sheet drawn under [boundaryKey] into a one-page PDF that looks
/// exactly like the preview: the rendered pixels are captured at print
/// resolution and laid on a page of the sheet's own proportions, edge to
/// edge, so nothing is re-flowed or re-typeset on the way out.
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

/// Where the PDF is kept on the device: the app's Downloads folder on
/// Android (visible in Files under Android/data), the documents folder
/// elsewhere. The file stays there whether or not the share sheet is used.
Future<Directory> _downloadsDirectory() async {
  if (Platform.isAndroid) {
    final downloads = await getDownloadsDirectory();
    if (downloads != null) return downloads;
  }
  return getApplicationDocumentsDirectory();
}

/// Hands the PDF to the system share sheet — Save to Files / Drive, or send
/// it on. Returns false when the share plugin is not in this build (the app
/// was hot-reloaded after the dependency was added and needs a full rebuild);
/// the file is already saved, so the caller can point at it instead.
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
