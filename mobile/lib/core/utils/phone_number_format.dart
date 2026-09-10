import 'package:flutter/services.dart';

/// Philippine mobile numbers are stored in one shape — `+639XXXXXXXXX` — so the
/// unique check on `phone_number` can't be dodged by typing the same number as
/// `0991…` in one sign-up and `+63991…` in another.
///
/// Accepts the 11-digit local form `09XXXXXXXXX` (spaces or dashes ignored) and
/// the already-canonical `+639XXXXXXXXX`. Anything else is returned trimmed and
/// untouched — [isValidPhilippinePhone] is what decides whether it may be sent.
String normalizePhilippinePhone(String raw) {
  final compact = raw.replaceAll(RegExp(r'[^0-9+]'), '');
  final digits = compact.startsWith('+') ? compact.substring(1) : compact;

  if (RegExp(r'^09\d{9}$').hasMatch(digits)) return '+63${digits.substring(1)}';
  if (RegExp(r'^639\d{9}$').hasMatch(digits)) return '+$digits';
  return raw.trim();
}

/// The only shape the server accepts — see `PhoneNumberSchema` on the API.
final _canonicalPhMobile = RegExp(r'^\+639\d{9}$');

/// True once [raw] is a complete Philippine mobile number, in either form.
bool isValidPhilippinePhone(String raw) =>
    _canonicalPhMobile.hasMatch(normalizePhilippinePhone(raw));

/// Inline message for a non-empty phone field that is not yet a valid number;
/// null when it is valid or still empty.
String? philippinePhoneError(String raw) {
  if (raw.trim().isEmpty || isValidPhilippinePhone(raw)) return null;
  return 'Enter an 11-digit PH mobile number (09XXXXXXXXX)';
}

/// Keeps a phone input to digits with an optional leading `+`, and the moment a
/// full local number (`09XXXXXXXXX`) is typed or pasted, rewrites it in place to
/// `+639XXXXXXXXX` so the user sees exactly what will be saved.
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
      // A complete local number just landed — swap to the canonical form and
      // park the cursor at the end, since the prefix changed under it.
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
