/// The sheet as the director designed it in the portal's customizer, exactly as
/// the server froze it on the issued certificate. Positions and sizes are the
/// portal's own units — percent of the sheet for placement, points on an
/// 11-inch-wide sheet for type — so the app draws the same certificate.
class CertificateDesign {
  const CertificateDesign({
    required this.accent,
    required this.frame,
    required this.layout,
    required this.headline,
    required this.body,
    this.frameSvgUrl,
    this.font = 'default',
    this.elementFonts = const {},
    this.elementSizes = const {},
    this.elementWidths = const {},
    this.elementHeights = const {},
    this.elementAligns = const {},
    this.showSeal = false,
    this.sealLabel = '',
    this.sealStyle,
    this.sealAccent,
    this.sealSvgUrl,
    this.images = const [],
    this.signatories = const [],
  });

  factory CertificateDesign.fromJson(Map<String, dynamic> json) {
    Map<String, T> mapOf<T>(String key, T Function(Object?) convert) {
      final raw = json[key] as Map<String, dynamic>? ?? const {};
      return {for (final e in raw.entries) e.key: convert(e.value)};
    }

    final layoutRaw = json['layout'] as Map<String, dynamic>? ?? const {};
    final layout = <String, CertificatePoint>{
      for (final e in layoutRaw.entries)
        e.key: CertificatePoint.fromJson(e.value as Map<String, dynamic>),
    };

    return CertificateDesign(
      accent: json['accent'] as String? ?? 'emerald',
      frame: json['frame'] as String? ?? 'plain',
      frameSvgUrl: json['frame_svg_url'] as String?,
      layout: layout,
      font: json['font'] as String? ?? 'default',
      elementFonts: mapOf('element_fonts', (v) => v as String),
      elementSizes: mapOf('element_sizes', (v) => (v as num).toDouble()),
      elementWidths: mapOf('element_widths', (v) => (v as num).toDouble()),
      elementHeights: mapOf('element_heights', (v) => (v as num).toDouble()),
      elementAligns: mapOf('element_aligns', (v) => v as String),
      headline: json['headline'] as String? ?? '',
      body: json['body'] as String? ?? '',
      showSeal: json['show_seal'] as bool? ?? false,
      sealLabel: json['seal_label'] as String? ?? '',
      sealStyle: json['seal_style'] as String?,
      sealAccent: json['seal_accent'] as String?,
      sealSvgUrl: json['seal_svg_url'] as String?,
      images: (json['images'] as List<dynamic>? ?? const [])
          .map((e) => CertificateImage.fromJson(e as Map<String, dynamic>))
          .toList(),
      signatories: (json['signatories'] as List<dynamic>? ?? const [])
          .map((e) => CertificateSignatory.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }

  final String accent;
  final String frame;

  /// The app's route to an uploaded SVG frame, drawn instead of the preset.
  final String? frameSvgUrl;

  /// Centre of each block (`headline`, `title`, `body`, `seal`, `signatures`)
  /// as a percentage of the sheet.
  final Map<String, CertificatePoint> layout;
  final String font;
  final Map<String, String> elementFonts;

  /// Points, on a 792pt-wide sheet.
  final Map<String, double> elementSizes;

  /// Percent of the sheet width a block spans.
  final Map<String, double> elementWidths;

  /// Percent of the sheet height, when the director fixed a block's height.
  final Map<String, double> elementHeights;
  final Map<String, String> elementAligns;

  /// Already filled in — no `{{placeholders}}` remain on an issued sheet.
  final String headline;
  final String body;
  final bool showSeal;
  final String sealLabel;
  final String? sealStyle;
  final String? sealAccent;
  final String? sealSvgUrl;
  final List<CertificateImage> images;
  final List<CertificateSignatory> signatories;

  static const defaultLayout = <String, CertificatePoint>{
    'headline': CertificatePoint(50, 25),
    'title': CertificatePoint(50, 43),
    'body': CertificatePoint(50, 58),
    'seal': CertificatePoint(50, 73),
    'signatures': CertificatePoint(50, 88),
  };

  static const defaultSizesPt = <String, double>{
    'headline': 16,
    'title': 40,
    'body': 16,
    'seal': 12,
    'signatures': 14,
  };

  static const defaultWidths = <String, double>{
    'headline': 80,
    'title': 80,
    'body': 70,
    'seal': 10,
    'signatures': 80,
  };

  CertificatePoint positionOf(String id) =>
      layout[id] ?? defaultLayout[id] ?? const CertificatePoint(50, 50);

  double fontSizePtOf(String id) =>
      elementSizes[id] ?? defaultSizesPt[id] ?? 16;

  double widthOf(String id) => elementWidths[id] ?? defaultWidths[id] ?? 80;

  double? heightOf(String id) => elementHeights[id];

  String alignOf(String id) => elementAligns[id] ?? 'center';

  /// Its own override first, then the sheet font; `default` leaves the
  /// frame's own typography.
  String fontOf(String id) {
    final override = elementFonts[id];
    if (override != null && override != 'default') return override;
    return font;
  }

  String get resolvedSealStyle => sealStyle ?? 'stamp';
  String get resolvedSealAccent => sealAccent ?? accent;
}

class CertificatePoint {
  const CertificatePoint(this.x, this.y);

  factory CertificatePoint.fromJson(Map<String, dynamic> json) =>
      CertificatePoint(
        (json['x'] as num?)?.toDouble() ?? 50,
        (json['y'] as num?)?.toDouble() ?? 50,
      );

  final double x;
  final double y;
}

/// An image the director placed on the sheet, centred at (x, y) percent.
class CertificateImage {
  const CertificateImage({
    required this.id,
    required this.url,
    required this.x,
    required this.y,
    required this.width,
    required this.height,
    required this.shape,
    required this.z,
  });

  factory CertificateImage.fromJson(Map<String, dynamic> json) =>
      CertificateImage(
        id: json['id'] as String,
        url: json['url'] as String,
        x: (json['x'] as num).toDouble(),
        y: (json['y'] as num).toDouble(),
        width: (json['width'] as num).toDouble(),
        height: (json['height'] as num).toDouble(),
        shape: json['shape'] as String? ?? 'square',
        z: (json['z'] as num?)?.toInt() ?? 0,
      );

  final String id;
  final String url;
  final double x;
  final double y;
  final double width;
  final double height;
  final String shape;

  /// Below zero prints behind the wording, above zero in front.
  final int z;
}

/// One signature line as printed on an issued certificate.
class CertificateSignatory {
  const CertificateSignatory({
    required this.id,
    required this.name,
    required this.title,
    required this.department,
    this.signatureUrl,
  });

  factory CertificateSignatory.fromJson(Map<String, dynamic> json) {
    return CertificateSignatory(
      id: json['id'] as String,
      name: json['name'] as String? ?? '',
      title: json['title'] as String? ?? '',
      department: json['department'] as String? ?? '',
      signatureUrl: json['signature_url'] as String?,
    );
  }

  final String id;
  final String name;
  final String title;
  final String department;

  /// API path of the signature image the line was issued with; null when the
  /// coordinator had none uploaded on the day.
  final String? signatureUrl;
}
