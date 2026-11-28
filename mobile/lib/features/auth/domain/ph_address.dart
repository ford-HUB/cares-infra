part 'ph_address_cebu.dart';

/// Barangay and city must come from [PhAddressDirectory]; the street is free
/// text. [formatted] (`Street, Barangay, City/Municipality, Province`) is the
/// one `current_address` shape sent and shown.
class PhAddress {
  const PhAddress({this.street = '', this.barangay, this.locality});

  final String street;
  final PhBarangay? barangay;
  final PhLocality? locality;

  static const empty = PhAddress();

  static const maxStreetLength = 120;

  /// e.g. "Blk 5 Lot 3, Phase 2 (Ext.)", "#12 Rizal St. & 3rd Ave", "Unit 4/F".
  static final _streetPattern = RegExp(
    r"^[\p{L}\p{M}0-9 .,#'’()/&-]+$",
    unicode: true,
  );

  static String? streetError(String street) {
    final value = street.trim();
    if (value.isEmpty) return 'Enter your house no. and street.';
    if (value.length < 3) return 'Street is too short.';
    if (value.length > maxStreetLength) return 'Street is too long.';
    if (!_streetPattern.hasMatch(value)) {
      return "Use letters, numbers and . , # ' - / ( ) & only.";
    }
    if (!RegExp('[A-Za-zÑñ]').hasMatch(value)) {
      return 'Include the street name, not just a number.';
    }
    return null;
  }

  bool get isComplete =>
      streetError(street) == null &&
      barangay != null &&
      locality != null &&
      barangay!.locality == locality;

  String get formatted {
    if (!isComplete) return '';
    return [
      street.trim(),
      barangay!.name,
      locality!.name,
      locality!.province,
    ].join(', ');
  }

  PhAddress copyWith({String? street}) => PhAddress(
    street: street ?? this.street,
    barangay: barangay,
    locality: locality,
  );

  /// Also fixes the barangay's city/municipality.
  PhAddress withBarangay(PhBarangay? value) => PhAddress(
    street: street,
    barangay: value,
    locality: value?.locality ?? locality,
  );

  /// Drops a barangay the new city doesn't own.
  PhAddress withLocality(PhLocality? value) => PhAddress(
    street: street,
    barangay: barangay?.locality == value ? barangay : null,
    locality: value,
  );

  /// Split columns when present, else the flat `current_address`; [empty] when
  /// unresolvable (e.g. older free text).
  static PhAddress resolve({
    String? street,
    String? barangay,
    String? city,
    String full = '',
  }) {
    final locality = city == null
        ? null
        : PhAddressDirectory.localityNamed(city);
    final picked = locality == null || barangay == null
        ? null
        : PhAddressDirectory.barangayNamed(barangay, locality);
    if (picked != null) {
      return PhAddress(
        street: street?.trim() ?? '',
        barangay: picked,
        locality: locality,
      );
    }
    return parse(full);
  }

  /// Best-effort display split: finds a known city/barangay anywhere ("Brgy.
  /// Looc, Mandaue"); unmatched text stays in [street].
  static PhAddress lenient(String text) {
    final strict = parse(text);
    if (strict.isComplete) return strict;

    final parts = text
        .split(',')
        .map((p) => p.trim())
        .where((p) => p.isNotEmpty)
        .toList();

    var localityIndex = -1;
    PhLocality? locality;
    // A bare "Cebu" is usually the province; it is Cebu City only when no other
    // locality is named.
    var provinceIndex = -1;
    for (var i = parts.length - 1; i >= 0 && locality == null; i--) {
      if (parts[i].toLowerCase() == 'cebu') {
        if (provinceIndex == -1) provinceIndex = i;
        continue;
      }
      locality = PhAddressDirectory.localityLoosely(parts[i]);
      if (locality != null) localityIndex = i;
    }
    if (locality == null && provinceIndex != -1) {
      locality = PhAddressDirectory.localityLoosely(parts[provinceIndex]);
      localityIndex = provinceIndex;
    }

    var barangayIndex = -1;
    PhBarangay? barangay;
    final searchEnd = localityIndex == -1 ? parts.length : localityIndex;
    for (var i = searchEnd - 1; i >= 0 && barangay == null; i--) {
      barangay = PhAddressDirectory.barangayLoosely(parts[i], locality);
      if (barangay != null) barangayIndex = i;
    }

    final streetEnd = barangayIndex != -1 ? barangayIndex : searchEnd;
    final street = barangay == null && locality == null
        ? text.trim()
        : parts.sublist(0, streetEnd).join(', ');
    return PhAddress(
      street: street,
      barangay: barangay,
      locality: barangay?.locality ?? locality,
    );
  }

  /// [empty] when it doesn't resolve against the directory.
  static PhAddress parse(String text) {
    final parts = text.split(',').map((p) => p.trim()).toList();
    if (parts.length < 4) return empty;
    final locality = PhAddressDirectory.localityNamed(parts[parts.length - 2]);
    final barangay = locality == null
        ? null
        : PhAddressDirectory.barangayNamed(parts[parts.length - 3], locality);
    if (barangay == null) return empty;
    return PhAddress(
      street: parts.sublist(0, parts.length - 3).join(', '),
      barangay: barangay,
      locality: locality,
    );
  }
}

class PhLocality {
  const PhLocality(
    this.name,
    this.province,
    this.barangayNames, {
    this.streets = const [],
  });

  final String name;
  final String province;
  final List<String> barangayNames;

  final List<String> streets;

  @override
  String toString() => name;
}

class PhBarangay {
  const PhBarangay(this.name, this.locality);

  final String name;
  final PhLocality locality;

  String get label => '$name, ${locality.name}';

  List<String> get streetSuggestions {
    final own =
        PhAddressDirectory._barangayStreets['${locality.name}|$name'] ??
        const [];
    return {...own, ...locality.streets}.toList();
  }

  @override
  bool operator ==(Object other) =>
      other is PhBarangay && other.name == name && other.locality == locality;

  @override
  int get hashCode => Object.hash(name, locality);

  @override
  String toString() => label;
}

/// Every Cebu Province barangay (PSGC, `ph_address_cebu.dart`).
abstract final class PhAddressDirectory {
  static const _cebu = 'Cebu';

  /// Offered after a barangay's own streets.
  static const _localityStreets = <String, List<String>>{
    'Lapu-Lapu City': [
      'M.L. Quezon National Highway',
      'Airport Road',
      'Mactan Circumferential Road',
      'Punta Engaño Road',
    ],
    'Mandaue City': [
      'M.C. Briones Street',
      'A.C. Cortes Avenue',
      'A. Soriano Jr. Avenue',
      'U.N. Avenue',
      'Hernan Cortes Street',
      'Ouano Avenue',
      'Plaridel Street',
    ],
    'Cebu City': [
      'Osmeña Boulevard',
      'Gorordo Avenue',
      'Salinas Drive',
      'Gov. M. Cuenco Avenue',
      'Juan Luna Avenue',
      'Archbishop Reyes Avenue',
      'N. Bacalso Avenue',
      'V. Rama Avenue',
      'M.J. Cuenco Avenue',
      'General Maxilom Avenue',
      'Colon Street',
    ],
  };

  static final List<PhLocality> localities = [
    for (final entry in _cebuBarangays.entries)
      PhLocality(
        entry.key,
        _cebu,
        entry.value,
        streets: _localityStreets[entry.key] ?? const [],
      ),
  ];

  /// Keyed `City|Barangay`.
  static const _barangayStreets = <String, List<String>>{
    'Mandaue City|Looc': ['A.C. Cortes Avenue'],
    'Mandaue City|Subangdaku': [
      'A. Soriano Jr. Avenue',
      'Hernan Cortes Street',
    ],
    'Lapu-Lapu City|Pusok': ['M.L. Quezon National Highway', 'Airport Road'],
    'Lapu-Lapu City|Punta Engaño': ['Punta Engaño Road'],
    'Cebu City|Lahug': ['Salinas Drive', 'Gorordo Avenue'],
    'Cebu City|Capitol Site': ['Osmeña Boulevard', 'Escario Street'],
    'Cebu City|Mabolo': ['Juan Luna Avenue', 'Pope John Paul II Avenue'],
    'Cebu City|Banilad': ['Banilad Road', 'Gov. M. Cuenco Avenue'],
    'Cebu City|Talamban': ['Gov. M. Cuenco Avenue'],
    'Cebu City|Guadalupe': ['V. Rama Avenue'],
  };

  static final List<PhBarangay> barangays = [
    for (final locality in localities)
      for (final name in locality.barangayNames) PhBarangay(name, locality),
  ];

  /// Precomputed: 1,200+ barangays are scanned per keystroke.
  static final List<_BarangayKey> _barangayKeys = () {
    // `City|Listed name` → folded other spellings.
    final aliases = <String, List<String>>{};
    for (final MapEntry(:key, :value) in _cebuBarangayAliases.entries) {
      final [city, spelling] = key.split('|');
      (aliases['$city|$value'] ??= []).add(_fold(spelling));
    }
    return [
      for (final barangay in barangays)
        _BarangayKey(
          barangay,
          _fold(barangay.name),
          _fold(barangay.locality.name),
          aliases['${barangay.locality.name}|${barangay.name}'] ?? const [],
        ),
    ];
  }();

  static PhLocality? localityNamed(String name) {
    final key = _fold(name);
    for (final locality in localities) {
      if (_fold(locality.name) == key) return locality;
    }
    return null;
  }

  /// Also matches other spellings ("Camputhaw", former names).
  static PhBarangay? barangayNamed(String name, PhLocality locality) {
    final key = _fold(name);
    for (final entry in _barangayKeys) {
      if (entry.barangay.locality == locality &&
          (entry.name == key || entry.aliases.contains(key))) {
        return entry.barangay;
      }
    }
    return null;
  }

  /// Like [localityNamed] but also accepts "Mandaue", "City of Mandaue" and
  /// "Lapu-Lapu" for "Lapu-Lapu City".
  static PhLocality? localityLoosely(String text) {
    final key = _fold(text)
        .replaceFirst(RegExp(r'^city of '), '')
        .replaceFirst(RegExp(r' city$'), '');
    for (final locality in localities) {
      if (_fold(locality.name).replaceFirst(RegExp(r' city$'), '') == key) {
        return locality;
      }
    }
    return null;
  }

  /// Ignores a "Brgy."/"Barangay" prefix and "(Pob.)" suffix; without
  /// [locality], answers only for unique names.
  static PhBarangay? barangayLoosely(String text, PhLocality? locality) {
    final raw = text
        .replaceFirst(RegExp(r'\s*\(?pob\.?\)?\s*$', caseSensitive: false), '')
        .trim();
    final bare = raw.replaceFirst(
      RegExp(r'^(brgy\.?|bgy\.?|barangay)\s+', caseSensitive: false),
      '',
    );
    // "Barangay II" is itself a barangay name in a few towns, so try the text
    // as written before dropping the prefix.
    for (final name in {raw, bare}) {
      final match = _barangayLooselyNamed(name, locality);
      if (match != null) return match;
    }
    return null;
  }

  static PhBarangay? _barangayLooselyNamed(String name, PhLocality? locality) {
    if (locality != null) return barangayNamed(name, locality);
    final key = _fold(name);
    final matches = _barangayKeys
        .where((e) => e.name == key || e.aliases.contains(key))
        .map((e) => e.barangay)
        .toList();
    return matches.length == 1 ? matches.single : null;
  }

  /// Prefix matches rank first, then contains, then alias or city-name matches.
  static List<PhBarangay> searchBarangays(
    String query, {
    PhLocality? locality,
  }) {
    final pool = locality == null
        ? _barangayKeys
        : _barangayKeys.where((e) => e.barangay.locality == locality);
    final q = _fold(query);
    if (q.isEmpty) return [for (final e in pool) e.barangay];
    final starts = <PhBarangay>[];
    final contains = <PhBarangay>[];
    for (final e in pool) {
      if (e.name.startsWith(q)) {
        starts.add(e.barangay);
      } else if (e.name.contains(q) ||
          e.aliases.any((a) => a.contains(q)) ||
          e.locality.contains(q)) {
        contains.add(e.barangay);
      }
    }
    return [...starts, ...contains];
  }

  static List<PhLocality> searchLocalities(String query) =>
      _rank(localities, query, (l) => l.name);

  static List<String> searchStreets(String query, PhBarangay? barangay) {
    final pool = barangay?.streetSuggestions ?? const <String>[];
    return _rank(pool, query, (s) => s);
  }

  static List<T> _rank<T>(
    Iterable<T> pool,
    String query,
    String Function(T) nameOf,
  ) {
    final q = _fold(query);
    if (q.isEmpty) return pool.toList();
    final starts = <T>[];
    final contains = <T>[];
    for (final item in pool) {
      final name = _fold(nameOf(item));
      if (name.startsWith(q)) {
        starts.add(item);
      } else if (name.contains(q)) {
        contains.add(item);
      }
    }
    return [...starts, ...contains];
  }

  /// Case-, accent- and punctuation-insensitive key, so "punta engano" finds
  /// "Punta Engaño" and "cawoy" finds "Caw-oy".
  static String _fold(String value) => value
      .toLowerCase()
      .replaceAll('ñ', 'n')
      .replaceAll(RegExp(r'[^a-z0-9 ]'), '')
      .replaceAll(RegExp(r'\s+'), ' ')
      .trim();
}

class _BarangayKey {
  const _BarangayKey(this.barangay, this.name, this.locality, this.aliases);

  final PhBarangay barangay;
  final String name;
  final String locality;
  final List<String> aliases;
}
