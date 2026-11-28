import 'package:flutter/services.dart';

/// Canonical `+639XXXXXXXXX` so the `phone_number` unique check can't be dodged
/// with `09…`. Anything else is returned trimmed; [isValidPhilippinePhone]
/// decides.
String normalizePhilippinePhone(String raw) {
  final compact = raw.replaceAll(RegExp(r'[^0-9+]'), '');
  final digits = compact.startsWith('+') ? compact.substring(1) : compact;

  if (RegExp(r'^09\d{9}$').hasMatch(digits)) return '+63${digits.substring(1)}';
  if (RegExp(r'^639\d{9}$').hasMatch(digits)) return '+$digits';
  return raw.trim();
}

/// The server's `PhoneNumberSchema` shape.
final _canonicalPhMobile = RegExp(r'^\+639\d{9}$');

bool isValidPhilippinePhone(String raw) =>
    _canonicalPhMobile.hasMatch(normalizePhilippinePhone(raw));

/// Null when valid or empty.
String? philippinePhoneError(String raw) {
  if (raw.trim().isEmpty || isValidPhilippinePhone(raw)) return null;
  return 'Enter an 11-digit PH mobile number (09XXXXXXXXX)';
}

/// Rewrites a full local `09…` number to `+639…` in place so the user sees what
/// is saved.
class PhilippinePhoneFormatter extends TextInputFormatter {
  const PhilippinePhoneFormatter();

  /// `+63` plus ten digits.
  static const maxLength = 13;

  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) {
    var text = newValue.text.replaceAll(RegExp(r'[^0-9+]'), '');
    text = text.startsWith('+')
        ? '+${text.substring(1).replaceAll('+', '')}'
        : text.replaceAll('+', '');

    final normalized = normalizePhilippinePhone(text);
    if (normalized != text) {
      // The prefix changed under the cursor, so park it at the end.
      return TextEditingValue(
        text: normalized,
        selection: TextSelection.collapsed(offset: normalized.length),
      );
    }

    if (text.length > maxLength) return oldValue;

    if (text == newValue.text) return newValue;
    return TextEditingValue(
      text: text,
      selection: TextSelection.collapsed(
        offset: newValue.selection.baseOffset.clamp(0, text.length),
      ),
    );
  }
}
