/// Structured Philippine address captured on the beneficiary details form.
///
/// Barangay and city/municipality must come from [PhAddressDirectory] so a
/// typo can't slip through; the street is free text (no list can cover every
/// street) but is suggested from the chosen barangay where known.
///
/// The server stores a single `current_address` string, so [formatted] is the
/// one canonical shape sent at registration and shown back on the profile:
/// `Street, Barangay, City/Municipality, Province`.
class PhAddress {
  const PhAddress({this.street = '', this.barangay, this.locality});

  final String street;
  final PhBarangay? barangay;
  final PhLocality? locality;

  static const empty = PhAddress();

  /// Why the street is not acceptable yet, or null when it is.
  static String? streetError(String street) {
    final value = street.trim();
    if (value.isEmpty) return 'Enter your house no. and street.';
    if (value.length < 3) return 'Street is too short.';
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

  /// Picking a barangay always fixes the city/municipality it belongs to.
  PhAddress withBarangay(PhBarangay? value) => PhAddress(
    street: street,
    barangay: value,
    locality: value?.locality ?? locality,
  );

  /// A city that doesn't own the current barangay drops the barangay.
  PhAddress withLocality(PhLocality? value) => PhAddress(
    street: street,
    barangay: barangay?.locality == value ? barangay : null,
    locality: value,
  );

  /// Structured address from a profile record: the split columns when the
  /// server has them, otherwise the flat `current_address` string. [empty]
  /// when neither resolves against the directory (e.g. an older free-text
  /// address).
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

  /// Best-effort split of any address text for display — e.g. one read off a
  /// residency document. Picks out a known city and barangay wherever they
  /// appear ("Brgy. Looc, Mandaue" works); whatever is left is the street.
  /// The result may be incomplete, and nothing is dropped: text that matches
  /// nothing ends up in [street].
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
    for (var i = parts.length - 1; i >= 0 && locality == null; i--) {
      locality = PhAddressDirectory.localityLoosely(parts[i]);
      if (locality != null) localityIndex = i;
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

  /// Rebuilds a structured address from a [formatted] string, or [empty] when
  /// it doesn't resolve against the directory.
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

  /// Major roads anywhere in the locality — offered after barangay streets.
  final List<String> streets;

  @override
  String toString() => name;
}

class PhBarangay {
  const PhBarangay(this.name, this.locality);

  final String name;
  final PhLocality locality;

  String get label => '$name, ${locality.name}';

  /// Streets known to run through this barangay, then the locality's roads.
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

/// Local lookup of the barangays CARES serves (Metro Cebu around UCLM).
/// Extend [localities] to cover more areas — suggestions and validation both
/// read from here.
abstract final class PhAddressDirectory {
  static const _cebu = 'Cebu';

  static const localities = <PhLocality>[
    PhLocality(
      'Lapu-Lapu City',
      _cebu,
      [
        'Agus',
        'Babag',
        'Bankal',
        'Baring',
        'Basak',
        'Buaya',
        'Calawisan',
        'Canjulao',
        'Caubian',
        'Caw-oy',
        'Cawhagan',
        'Gun-ob',
        'Ibo',
        'Looc',
        'Mactan',
        'Maribago',
        'Marigondon',
        'Pajac',
        'Pajo',
        'Pangan-an',
        'Poblacion',
        'Punta Engaño',
        'Pusok',
        'Sabang',
        'San Vicente',
        'Santa Rosa',
        'Subabasbas',
        'Talima',
        'Tingo',
        'Tungasan',
      ],
      streets: [
        'M.L. Quezon National Highway',
        'Airport Road',
        'Mactan Circumferential Road',
        'Punta Engaño Road',
      ],
    ),
    PhLocality(
      'Mandaue City',
      _cebu,
      [
        'Alang-alang',
        'Bakilid',
        'Banilad',
        'Basak',
        'Cabancalan',
        'Cambaro',
        'Canduman',
        'Casili',
        'Casuntingan',
        'Centro',
        'Cubacub',
        'Guizo',
        'Ibabao-Estancia',
        'Jagobiao',
        'Labogon',
        'Looc',
        'Maguikay',
        'Mantuyong',
        'Opao',
        'Pagsabungan',
        'Pakna-an',
        'Subangdaku',
        'Tabok',
        'Tawason',
        'Tingub',
        'Tipolo',
        'Umapad',
      ],
      streets: [
        'M.C. Briones Street',
        'A.C. Cortes Avenue',
        'A. Soriano Jr. Avenue',
        'U.N. Avenue',
        'Hernan Cortes Street',
        'Ouano Avenue',
        'Plaridel Street',
      ],
    ),
    PhLocality(
      'Cebu City',
      _cebu,
      [
        'Adlaon',
        'Agsungot',
        'Apas',
        'Babag',
        'Bacayan',
        'Banilad',
        'Basak Pardo',
        'Basak San Nicolas',
        'Binaliw',
        'Bonbon',
        'Budlaan',
        'Buhisan',
        'Bulacao',
        'Buot-Taup',
        'Busay',
        'Calamba',
        'Cambinocot',
        'Capitol Site',
        'Carreta',
        'Cogon Pardo',
        'Cogon Ramos',
        'Day-as',
        'Duljo Fatima',
        'Ermita',
        'Guadalupe',
        'Guba',
        'Hipodromo',
        'Inayawan',
        'Kalubihan',
        'Kalunasan',
        'Kamagayan',
        'Kamputhaw',
        'Kasambagan',
        'Kinasang-an Pardo',
        'Labangon',
        'Lahug',
        'Lorega San Miguel',
        'Lusaran',
        'Luz',
        'Mabini',
        'Mabolo',
        'Malubog',
        'Mambaling',
        'Pahina Central',
        'Pahina San Nicolas',
        'Pamutan',
        'Pari-an',
        'Paril',
        'Pasil',
        'Pit-os',
        'Poblacion Pardo',
        'Pulangbato',
        'Pung-ol Sibugay',
        'Punta Princesa',
        'Quiot Pardo',
        'Sambag I',
        'Sambag II',
        'San Antonio',
        'San Jose',
        'San Nicolas Proper',
        'San Roque',
        'Santa Cruz',
        'Santo Niño',
        'Sapangdaku',
        'Sawang Calero',
        'Sinsin',
        'Sirao',
        'Suba',
        'Sudlon I',
        'Sudlon II',
        'T. Padilla',
        'Tabunan',
        'Tagba-o',
        'Talamban',
        'Taptap',
        'Tejero',
        'Tinago',
        'Tisa',
        'To-ong',
        'Zapatera',
      ],
      streets: [
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
    ),
    PhLocality('Cordova', _cebu, [
      'Alegria',
      'Bangbang',
      'Buagsong',
      'Catarman',
      'Cogon',
      'Dapitan',
      'Day-as',
      'Gabi',
      'Gilutongan',
      'Ibabao',
      'Pilipog',
      'Poblacion',
      'San Miguel',
    ]),
    PhLocality('Talisay City', _cebu, [
      'Biasong',
      'Bulacao',
      'Cadulawan',
      'Camp IV',
      'Cansojong',
      'Dumlog',
      'Jaclupan',
      'Lagtang',
      'Lawaan I',
      'Lawaan II',
      'Lawaan III',
      'Linao',
      'Maghaway',
      'Manipis',
      'Mohon',
      'Poblacion',
      'Pooc',
      'San Isidro',
      'San Roque',
      'Tabunok',
      'Tangke',
      'Tapul',
    ]),
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

  static PhLocality? localityNamed(String name) {
    final key = _fold(name);
    for (final locality in localities) {
      if (_fold(locality.name) == key) return locality;
    }
    return null;
  }

  static PhBarangay? barangayNamed(String name, PhLocality locality) {
    final key = _fold(name);
    for (final barangay in barangays) {
      if (barangay.locality == locality && _fold(barangay.name) == key) {
        return barangay;
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

  /// Like [barangayNamed] but ignores a "Brgy." / "Barangay" prefix. Without
  /// a [locality] it only answers when the name is unique across the list.
  static PhBarangay? barangayLoosely(String text, PhLocality? locality) {
    final name = text.replaceFirst(
      RegExp(r'^(brgy\.?|bgy\.?|barangay)\s+', caseSensitive: false),
      '',
    );
    if (locality != null) return barangayNamed(name, locality);
    final key = _fold(name);
    final matches = barangays.where((b) => _fold(b.name) == key).toList();
    return matches.length == 1 ? matches.single : null;
  }

  /// Barangays matching [query], optionally within one [locality]. Names that
  /// start with the query rank before ones that merely contain it.
  static List<PhBarangay> searchBarangays(
    String query, {
    PhLocality? locality,
  }) {
    final pool = locality == null
        ? barangays
        : barangays.where((b) => b.locality == locality);
    return _rank(pool, query, (b) => b.name, alsoMatch: (b) => b.locality.name);
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
    String Function(T) nameOf, {
    String Function(T)? alsoMatch,
  }) {
    final q = _fold(query);
    if (q.isEmpty) return pool.toList();
    final starts = <T>[];
    final contains = <T>[];
    for (final item in pool) {
      final name = _fold(nameOf(item));
      if (name.startsWith(q)) {
        starts.add(item);
      } else if (name.contains(q) ||
          (alsoMatch != null && _fold(alsoMatch(item)).contains(q))) {
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
