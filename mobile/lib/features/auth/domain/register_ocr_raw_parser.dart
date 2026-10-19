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

    // The cardholder's name is only printed on the front. The back carries the
    // emergency contact's NAME and the president's signature line, so it is
    // never consulted.
    final name = _extractName(
      frontText
          .split('\n')
          .map((line) => line.trim())
          .where((line) => line.isNotEmpty)
          .toList(),
    );
    return (
      firstname: name.$1,
      lastname: name.$3,
      middleName: name.$2,
      gender: _extractGender(combined),
      age: _extractAge(combined, lines),
      currentAddress: _extractAddress(lines, combined),
      phoneNumber: _extractPhone(combined, lines),
      idNumber: _extractIdNumber(frontText),
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

    // An unlabelled line printed like a name: upper case, first and last
    // words of 2+ letters, initials or words between ("JAY S. ICOY").
    for (final line in lines) {
      final candidate = _cleanName(line);
      if (RegExp(
            r'^[A-Z]{2,}(?:\s+(?:[A-Z]\.?|[A-Z]{2,}))*\s+[A-Z]{2,}$',
          ).hasMatch(candidate) &&
          candidate.replaceAll(RegExp('[^A-Z]'), '').length >= 6 &&
          _looksLikePersonName(candidate)) {
        return _splitName(candidate);
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
    cleaned = _stripLeadingJunk(cleaned).replaceFirst(RegExp(r'^[_\-—–\s]+'), '');
    cleaned = cleaned
        .split(
          RegExp(
            r'\b(?:ADDRESS|TEL|ID\s*NO|BIRTHDATE)\b',
            caseSensitive: false,
          ),
        )
        .first;
    // OCR often glues a middle initial to its neighbours: "JAYS.ICOY", "JAY S.ICOY".
    cleaned = cleaned
        .replaceAllMapped(
          RegExp(r'\b([A-Za-z]{2,})([A-Za-z])\.(?=[A-Za-z]{2,})'),
          (m) => '${m[1]} ${m[2]}. ',
        )
        .replaceAllMapped(
          RegExp(r'\b([A-Za-z])\.(?=[A-Za-z]{2,})'),
          (m) => '${m[1]}. ',
        );
    return cleaned.replaceAll(RegExp(r"[\s.,;:*|_'\-—–]+$"), '').trim();
  }

  static bool _looksLikePersonName(String text) {
    final tokens = text.split(' ');
    if (tokens.length < 2 || tokens.length > 5) return false;
    if (RegExp(
      r'\b(UNIVERSITY|COLLEGE|STUDENT|EMERGENCY|NON-TRANSFERABLE|NOTIFY|SIGNATURE|'
      r'CEBU|MANDAUE|LAPU|PHILIPPINES|PRESIDENT|ATTY)\b',
      caseSensitive: false,
    ).hasMatch(text)) {
      return false;
    }
    // OCR splits labels too: "SIG NATURE".
    final letters = text.replaceAll(RegExp('[^A-Za-z]'), '').toUpperCase();
    if (letters.contains('SIGNATURE') || letters.contains('IDNO')) {
      return false;
    }
    // The coloured course strip on the front ("INFORMATION TECHNOLOGY") is
    // shaped like a two-word name but is never one.
    if (RegExp(
      r'\b(INFORMATION|TECHNOLOGY|COMPUTER|SCIENCE|ENGINEERING|EDUCATION|'
      r'SECONDARY|ELEMENTARY|NURSING|CRIMINOLOGY|ACCOUNTANCY|ACCOUNTING|'
      r'BUSINESS|ADMINISTRATION|MANAGEMENT|HOSPITALITY|TOURISM|MARINE|'
      r'MARITIME|TRANSPORTATION|CUSTOMS|SENIOR|JUNIOR|HIGH|SCHOOL)\b',
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

  // UCLM student IDs are 8 digits (YY + 6-digit serial, e.g. 24247447)
  // printed above the "ID NO ____" line on the front of the card. Mirrors
  // _extract_id_number in microservices/ocr-service/app/ocr_engine.py.
  static const _studentIdLength = 8;
  static const _studentIdMinRealDigits = 6;
  static final _studentIdLabel = RegExp(
    r'\b(?:I[D0O]|1D)\s*(?:N[O0]\b\.?|NUMBER\b|#)\s*[:.]?',
    caseSensitive: false,
  );
  // Exactly 8 digit-like chars (OCR may read 0 as O, 1 as I/l, 8 as B, ...),
  // optionally split by hyphens; bounded on both sides so longer runs such as
  // phone numbers (11 digits) and dates never yield an 8-digit slice.
  static final _studentIdToken = RegExp(
    r'(?<![A-Za-z0-9/])([0-9OoIlUBSZ](?:-?[0-9OoIlUBSZ]){7})(?![A-Za-z0-9/]|-[0-9A-Za-z])',
  );
  static final _schoolYearRange = RegExp(r'^((?:19|20)\d{2})((?:19|20)\d{2})$');

  static List<String> _studentIdCandidates(String line) {
    final candidates = <String>[];
    for (final match in _studentIdToken.allMatches(line)) {
      final raw = match.group(1)!;
      if (RegExp(r'\d').allMatches(raw).length < _studentIdMinRealDigits) {
        continue;
      }
      final digits = normalizeIdNumber(_normalizeDigits(raw));
      if (digits.length != _studentIdLength) continue;
      // "2024-2025" from a school-year row is not an ID.
      final yearRange = _schoolYearRange.firstMatch(digits);
      if (yearRange != null) {
        final gap =
            int.parse(yearRange.group(2)!) - int.parse(yearRange.group(1)!);
        if (gap == 0 || gap == 1) continue;
      }
      candidates.add(digits);
    }
    return candidates;
  }

  static bool _hasPlausibleYearPrefix(String digits) =>
      int.parse(digits.substring(0, 2)) <= (DateTime.now().year % 100) + 1;

  static String _pickStudentId(List<String> candidates) {
    for (final candidate in candidates) {
      if (_hasPlausibleYearPrefix(candidate)) return candidate;
    }
    return candidates.isEmpty ? '' : candidates.first;
  }

  static String _studentIdNearLabel(List<String> lines) {
    for (var index = 0; index < lines.length; index++) {
      final line = lines[index];
      final label = _studentIdLabel.firstMatch(line);
      if (label == null) continue;
      // UCLM prints the number just above the "ID NO ____" line; OCR may also
      // merge it onto the label line or push it below.
      final nearby = [
        line.substring(label.end),
        line.substring(0, label.start),
        if (index > 0) lines[index - 1],
        if (index + 1 < lines.length) lines[index + 1],
      ];
      final picked = _pickStudentId([
        for (final text in nearby) ..._studentIdCandidates(text),
      ]);
      if (picked.isNotEmpty) return picked;
    }
    return '';
  }

  /// The student ID is only printed on the front of the card; the back
  /// carries school years, phone and birthdate, so it is never consulted.
  static String _extractIdNumber(String frontText) {
    final lines = frontText
        .split('\n')
        .map((line) => line.trim())
        .where((line) => line.isNotEmpty)
        .toList();
    final labeled = _studentIdNearLabel(lines);
    if (labeled.isNotEmpty) return labeled;
    return _pickStudentId([
      for (final line in lines) ..._studentIdCandidates(line),
    ]);
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
