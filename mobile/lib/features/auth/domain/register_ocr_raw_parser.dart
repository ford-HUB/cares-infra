/// Fills missing structured fields from raw OCR text when the server parser
/// returns raw text but incomplete field values.
class RegisterOcrRawParser {
  const RegisterOcrRawParser._();

  static ({
    String firstname,
    String lastname,
    String middleName,
    String gender,
    int age,
    String currentAddress,
    String phoneNumber,
    String idNumber,
  })
  parse(String frontText, String backText) {
    final combined = '$frontText\n$backText';
    final lines = combined
        .split('\n')
        .map((line) => line.trim())
        .where((line) => line.isNotEmpty)
        .toList();

    final name = _extractName(lines);
    return (
      firstname: name.$1,
      lastname: name.$3,
      middleName: name.$2,
      gender: _extractGender(combined),
      age: _extractAge(combined, lines),
      currentAddress: _extractAddress(lines, combined),
      phoneNumber: _extractPhone(combined, lines),
      idNumber: _extractIdNumber(combined),
    );
  }

  static (String, String, String) _extractName(List<String> lines) {
    for (final line in lines) {
      final inline = RegExp(
        r"\bNAME\s+([A-Za-z][A-Za-z\s.']+?)(?:\s*[*|]?\s*$)",
        caseSensitive: false,
      ).firstMatch(line);
      if (inline != null) {
        final candidate = _cleanName(inline.group(1) ?? '');
        if (candidate.isNotEmpty && _looksLikePersonName(candidate)) {
          return _splitName(candidate);
        }
      }
    }

    for (var i = 0; i < lines.length; i++) {
      final line = lines[i];
      final isNameLabel =
          RegExp(
            r'^[\s.,|:]+NAME\s*[|:]?\s*$',
            caseSensitive: false,
          ).hasMatch(_stripLeadingJunk(line)) ||
          RegExp(
            r'^NAME\s*[|:]?\s*$',
            caseSensitive: false,
          ).hasMatch(_stripLeadingJunk(line));
      final hasLooseNameLabel =
          !isNameLabel &&
          RegExp(r'\bNAME\b', caseSensitive: false).hasMatch(line);

      if (!isNameLabel && !hasLooseNameLabel) continue;

      if (hasLooseNameLabel) {
        final sameLine = RegExp(
          r"\bNAME\s+([A-Za-z].+)$",
          caseSensitive: false,
        ).firstMatch(line);
        if (sameLine != null) {
          final candidate = _cleanName(sameLine.group(1) ?? '');
          if (candidate.isNotEmpty && _looksLikePersonName(candidate)) {
            return _splitName(candidate);
          }
        }
      }

      for (var offset = 1; offset <= 3; offset++) {
        final nextIndex = i + offset;
        if (nextIndex >= lines.length) break;
        final candidate = _cleanName(lines[nextIndex]);
        if (candidate.isNotEmpty && _looksLikePersonName(candidate)) {
          return _splitName(candidate);
        }
      }
    }

    for (final line in lines) {
      final person = RegExp(
        r'^([A-Za-z]{2,}(?:\s+[A-Za-z]{1,}(?:\.\s*|\s+))*'
        r'[A-Za-z]{2,}(?:\s+[A-Za-z]\.?)?\s+[A-Za-z]{2,})\s*$',
        caseSensitive: false,
      ).firstMatch(_stripLeadingJunk(line));
      if (person != null) {
        final candidate = _cleanName(person.group(1) ?? '');
        if (candidate.isNotEmpty && _looksLikePersonName(candidate)) {
          return _splitName(candidate);
        }
      }
    }

    return ('', '', '');
  }

  static String _stripLeadingJunk(String value) {
    var cleaned = value.trim();
    while (cleaned.isNotEmpty) {
      final code = cleaned.codeUnitAt(0);
      final isJunk =
          cleaned.startsWith(RegExp(r'[\s.,|:`;]')) ||
          code == 0x2018 ||
          code == 0x2019 ||
          code == 0x201C ||
          code == 0x201D ||
          cleaned[0] == "'" ||
          cleaned[0] == '"';
      if (!isJunk) break;
      cleaned = cleaned.substring(1).trimLeft();
    }
    return cleaned;
  }

  static String _cleanName(String value) {
    var cleaned = value.replaceAll(RegExp(r'\s+'), ' ').trim();
    cleaned = _stripLeadingJunk(cleaned);
    cleaned = cleaned
        .split(
          RegExp(
            r'\b(?:ADDRESS|TEL|ID\s*NO|BIRTHDATE)\b',
            caseSensitive: false,
          ),
        )
        .first;
    return cleaned.replaceAll(RegExp(r'[ .*]+$'), '').trim();
  }

  static bool _looksLikePersonName(String text) {
    final tokens = text.split(' ');
    if (tokens.length < 2 || tokens.length > 5) return false;
    if (RegExp(
      r'\b(UNIVERSITY|COLLEGE|STUDENT|EMERGENCY|NON-TRANSFERABLE|NOTIFY|SIGNATURE)\b',
      caseSensitive: false,
    ).hasMatch(text)) {
      return false;
    }
    return tokens.every(
      (token) => RegExp(r"^[A-Za-z][A-Za-z.']*$").hasMatch(token),
    );
  }

  static (String, String, String) _splitName(String value) {
    if (value.isEmpty) return ('', '', '');

    if (value.contains(',')) {
      final parts = value.split(',');
      final last = parts.first.trim();
      final firstPart = parts.sublist(1).join(',').trim().split(' ');
      final first = firstPart.isNotEmpty ? firstPart.first : '';
      final middle = firstPart.length > 1 ? firstPart.sublist(1).join(' ') : '';
      return (first, middle, last);
    }

    final tokens = value.split(' ');
    if (tokens.length >= 4 &&
        RegExp(r'^[A-Za-z]\.?$').hasMatch(tokens[tokens.length - 2])) {
      return (
        tokens.first,
        tokens.sublist(1, tokens.length - 1).join(' '),
        tokens.last,
      );
    }
    if (tokens.length >= 3) {
      return (tokens.first, tokens[1], tokens.sublist(2).join(' '));
    }
    if (tokens.length == 2) {
      return (tokens.first, '', tokens.last);
    }
    return (value, '', '');
  }

  static String preferAddress(String existing, String parsed) {
    final current = existing.trim();
    final candidate = parsed.trim();
    if (candidate.isEmpty) return current;
    if (current.isEmpty) return candidate;
    if (candidate.length > current.length) return candidate;
    if (candidate.contains(',') && !current.contains(',')) return candidate;
    return current;
  }

  static String _cleanAddressValue(String value) {
    var cleaned = value.replaceAll(RegExp(r'\s+'), ' ').trim();
    cleaned = cleaned.replaceFirst(RegExp(r'^[^A-Za-z0-9]+'), '');
    cleaned = cleaned.replaceAll(RegExp(r'[.\s|]+$'), '');
    return cleaned.trim();
  }

  static String _extractAddress(List<String> lines, String combined) {
    for (final line in lines) {
      final inline = RegExp(
        r'\bADDRESS\.?\s*[:\-]?\s*(.+)$',
        caseSensitive: false,
      ).firstMatch(line);
      if (inline != null) {
        final value = _cleanAddressValue(inline.group(1)!);
        if (value.isNotEmpty && !_looksLikePhone(value)) return value;
      }
    }

    final collected = <String>[];
    for (var i = 0; i < lines.length; i++) {
      if (RegExp(
        r'\bADDRESS\s*[.:]?\s*$',
        caseSensitive: false,
      ).hasMatch(lines[i])) {
        for (var offset = 1; offset <= 3; offset++) {
          final nextIndex = i + offset;
          if (nextIndex >= lines.length) break;
          final candidate = _cleanAddressValue(lines[nextIndex]);
          if (candidate.isEmpty ||
              _looksLikePhone(candidate) ||
              RegExp(
                r'\b(?:TEL|PHONE|BIRTHDATE|NAME)\b',
                caseSensitive: false,
              ).hasMatch(candidate)) {
            break;
          }
          collected.add(candidate);
        }
        if (collected.isNotEmpty) return collected.join(', ');
      }
    }

    for (final pattern in [
      RegExp(
        r'\bDECA\s+HOME[S]?\s*\d*'
        r'(?:\s*,\s*[A-Za-z][A-Za-z\s,.\-]*|\s+[A-Za-z][A-Za-z]+)*',
        caseSensitive: false,
      ),
      RegExp(
        r'\b(?:DECA\s+)?HOME[S]?\s*\d*'
        r'(?:\s*,\s*[A-Za-z][A-Za-z\s,.\-]*|\s+[A-Za-z][A-Za-z]+)*',
        caseSensitive: false,
      ),
    ]) {
      final match = pattern.firstMatch(combined);
      if (match != null) {
        final value = _cleanAddressValue(match.group(0)!);
        if (value.isNotEmpty && !_looksLikePhone(value)) return value;
      }
    }

    return '';
  }

  static String normalizeIdNumber(String value) =>
      value.replaceAll(RegExp(r'\D'), '');

  static String _extractIdNumber(String text) {
    final hyphenated = RegExp(r'\b(\d{4}-\d{4,6})\b').firstMatch(text);
    if (hyphenated != null) return normalizeIdNumber(hyphenated.group(1)!);

    final spaced = RegExp(r'\b(\d{4})[\s\-](\d{4,6})\b').firstMatch(text);
    if (spaced != null) {
      return normalizeIdNumber('${spaced.group(1)}${spaced.group(2)}');
    }

    final eightDigit = RegExp(
      r'\b(\d{8})\b',
    ).firstMatch(_normalizeDigits(text));
    if (eightDigit != null) return eightDigit.group(1)!;

    return '';
  }

  static String _extractPhone(String text, List<String> lines) {
    for (final line in lines) {
      final tel = RegExp(
        r'\bTEL\.?\s*NO\.?\s*[.:]?\s*(0\d{10,11})',
        caseSensitive: false,
      ).firstMatch(line);
      if (tel != null) return tel.group(1)!;
    }

    final compact = text.replaceAll(' ', '');
    final direct = RegExp(r'(\+63\d{10}|09\d{9})').firstMatch(compact);
    if (direct != null) return direct.group(1)!;

    return '';
  }

  static String _extractGender(String text) {
    final match = RegExp(
      r'\b(MALE|FEMALE)\b',
      caseSensitive: false,
    ).firstMatch(text);
    return match != null ? match.group(1)!.toUpperCase() : '';
  }

  static int _extractAge(String text, List<String> lines) {
    final ageLabel = RegExp(
      r'\b(?:AGE|Edad)\s*[:\-]?\s*(\d{1,3})\b',
      caseSensitive: false,
    ).firstMatch(text);
    if (ageLabel != null) return int.parse(ageLabel.group(1)!);

    for (final line in lines) {
      if (!RegExp(
        r'\b(?:BIRTHDATE|BIRTH\s*DATE|DOB)\b',
        caseSensitive: false,
      ).hasMatch(line)) {
        continue;
      }
      final parsed = _parseDate(line);
      if (parsed != null) return _ageFromBirth(parsed);
    }

    return 0;
  }

  static DateTime? _parseDate(String value) {
    final normalized = _normalizeDigits(value);
    final match = RegExp(
      r'(\d{1,2})\D{1,3}(\d{1,2})\D{1,3}((?:19|20)\d{2})',
    ).firstMatch(normalized);
    if (match == null) return null;

    final month = int.parse(match.group(1)!);
    final day = int.parse(match.group(2)!);
    final year = int.parse(match.group(3)!);
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return DateTime(year, month, day);
  }

  static int _ageFromBirth(DateTime birthDate) {
    final now = DateTime.now();
    var age = now.year - birthDate.year;
    if (now.month < birthDate.month ||
        (now.month == birthDate.month && now.day < birthDate.day)) {
      age--;
    }
    return age < 0 ? 0 : age;
  }

  static String _normalizeDigits(String value) {
    return value
        .replaceAll('O', '0')
        .replaceAll('o', '0')
        .replaceAll('I', '1')
        .replaceAll('l', '1')
        .replaceAll('|', '1')
        .replaceAll('U', '0')
        .replaceAll('B', '8')
        .replaceAll('S', '5')
        .replaceAll('Z', '2');
  }

  static bool _looksLikePhone(String line) {
    return RegExp(r'(\+63\d{10}|09\d{9})').hasMatch(line.replaceAll(' ', ''));
  }
}
