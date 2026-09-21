import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// The six accents the portal's customizer offers, in the Tailwind shades the
/// portal draws them with, so a sheet reads the same on the phone.
class CertificateAccentPalette {
  const CertificateAccentPalette({
    required this.frame,
    required this.rule,
    required this.sealFill,
    required this.sealInk,
    required this.headline,
    required this.solid,
    required this.tint,
  });

  /// Sheet border (`-300`).
  final Color frame;

  /// The short rule under the headline (`-400`).
  final Color rule;

  /// Stamp seal disc (`-100`) and its ink (`-600`).
  final Color sealFill;
  final Color sealInk;

  /// Headline text (`-700`).
  final Color headline;

  /// Frame panels, ribbons and bands (`-700`).
  final Color solid;

  /// Soft wash behind an ornament (`-50`).
  final Color tint;
}

const _palettes = <String, CertificateAccentPalette>{
  'emerald': CertificateAccentPalette(
    frame: Color(0xFF6EE7B7),
    rule: Color(0xFF34D399),
    sealFill: Color(0xFFD1FAE5),
    sealInk: Color(0xFF059669),
    headline: Color(0xFF047857),
    solid: Color(0xFF047857),
    tint: Color(0xFFECFDF5),
  ),
  'sky': CertificateAccentPalette(
    frame: Color(0xFF7DD3FC),
    rule: Color(0xFF38BDF8),
    sealFill: Color(0xFFE0F2FE),
    sealInk: Color(0xFF0284C7),
    headline: Color(0xFF0369A1),
    solid: Color(0xFF0369A1),
    tint: Color(0xFFF0F9FF),
  ),
  'violet': CertificateAccentPalette(
    frame: Color(0xFFC4B5FD),
    rule: Color(0xFFA78BFA),
    sealFill: Color(0xFFEDE9FE),
    sealInk: Color(0xFF7C3AED),
    headline: Color(0xFF6D28D9),
    solid: Color(0xFF6D28D9),
    tint: Color(0xFFF5F3FF),
  ),
  'rose': CertificateAccentPalette(
    frame: Color(0xFFFDA4AF),
    rule: Color(0xFFFB7185),
    sealFill: Color(0xFFFFE4E6),
    sealInk: Color(0xFFE11D48),
    headline: Color(0xFFBE123C),
    solid: Color(0xFFBE123C),
    tint: Color(0xFFFFF1F2),
  ),
  'amber': CertificateAccentPalette(
    frame: Color(0xFFFCD34D),
    rule: Color(0xFFFBBF24),
    sealFill: Color(0xFFFEF3C7),
    sealInk: Color(0xFFD97706),
    headline: Color(0xFFB45309),
    solid: Color(0xFFB45309),
    tint: Color(0xFFFFFBEB),
  ),
  'slate': CertificateAccentPalette(
    frame: Color(0xFFCBD5E1),
    rule: Color(0xFF94A3B8),
    sealFill: Color(0xFFF1F5F9),
    sealInk: Color(0xFF475569),
    headline: Color(0xFF334155),
    solid: Color(0xFF334155),
    tint: Color(0xFFF8FAFC),
  ),
};

CertificateAccentPalette certificatePalette(String accent) =>
    _palettes[accent] ?? _palettes['emerald']!;

/// Gilt used by the ornate frames (`amber-400` / `amber-300`).
const certificateGilt = Color(0xFFFBBF24);
const certificateGiltLight = Color(0xFFFCD34D);

/// Text greys the portal sets the wording in.
const certificateInk = Color(0xFF1F2937);
const certificateInkSoft = Color(0xFF4B5563);
const certificateInkMuted = Color(0xFF9CA3AF);
const certificateRuleGrey = Color(0xFFD1D5DB);
const certificateBorderGrey = Color(0xFFE5E7EB);

/// The Google Fonts family behind each face the customizer offers.
const _fontFamilies = <String, String>{
  'old_english': 'UnifrakturMaguntia',
  'pirata': 'Pirata One',
  'cinzel': 'Cinzel',
  'playfair': 'Playfair Display',
  'cormorant': 'Cormorant Garamond',
  'garamond': 'EB Garamond',
  'baskerville': 'Libre Baskerville',
  'lora': 'Lora',
  'merriweather': 'Merriweather',
  'great_vibes': 'Great Vibes',
  'pinyon': 'Pinyon Script',
  'dancing_script': 'Dancing Script',
  'montserrat': 'Montserrat',
  'lato': 'Lato',
  'inter': 'Inter',
};

/// Frames that set their wording in a serif when the director left the font
/// on "frame default".
const _serifFrames = {'classic', 'royal'};

/// Blocks the ornate frames set in an italic serif regardless of the frame's
/// base face (the award name on diagonal/corners, the signature name on corners).
bool _frameItalicSerif(String frame, String element) {
  if (element == 'title') {
    return frame == 'royal' || frame == 'diagonal' || frame == 'corners';
  }
  if (element == 'signatures') return frame == 'corners';
  return false;
}

/// The text style for one block: the picked face, else the frame's own
/// typography — the same fall-through the portal's `resolveElementFont` does.
/// Google Fonts are fetched on first use; if that fails the platform face
/// stands in, so the sheet still draws offline.
TextStyle certificateFontStyle({
  required String fontId,
  required String frame,
  required String element,
  required TextStyle base,
}) {
  final family = _fontFamilies[fontId];
  if (family != null) {
    try {
      return GoogleFonts.getFont(family, textStyle: base);
    } catch (_) {
      return base;
    }
  }

  final italicSerif = _frameItalicSerif(frame, element);
  if (_serifFrames.contains(frame) || italicSerif) {
    try {
      return GoogleFonts.getFont(
        'Lora',
        textStyle: base.copyWith(
          fontStyle: italicSerif ? FontStyle.italic : base.fontStyle,
        ),
      );
    } catch (_) {
      return base.copyWith(
        fontStyle: italicSerif ? FontStyle.italic : base.fontStyle,
      );
    }
  }
  return base;
}

/// Letter-spacing (in em) each frame gives the headline.
double certificateHeadlineTracking(String frame) {
  return switch (frame) {
    'classic' => 0.35,
    'royal' => 0.3,
    'minimal' => 0.3,
    'modern' => 0.28,
    'corners' => 0.2,
    _ => 0.25,
  };
}

FontWeight certificateHeadlineWeight(String frame) {
  return switch (frame) {
    'diagonal' => FontWeight.w700,
    'corners' => FontWeight.w800,
    'modern' => FontWeight.w600,
    _ => FontWeight.w400,
  };
}
