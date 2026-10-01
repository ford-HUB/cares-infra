import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/features/auth/domain/ph_address.dart';

void main() {
  PhBarangay barangay(String name, String city) =>
      PhAddressDirectory.barangayNamed(
        name,
        PhAddressDirectory.localityNamed(city)!,
      )!;

  group('PhAddressDirectory', () {
    test('suggests barangays by prefix, accent- and case-insensitively', () {
      final names = PhAddressDirectory.searchBarangays(
        'punta eng',
      ).map((b) => b.label);
      expect(names, contains('Punta Engaño, Lapu-Lapu City'));
    });

    test('same barangay name in two cities shows both', () {
      final cities = PhAddressDirectory.searchBarangays(
        'looc',
      ).map((b) => b.locality.name);
      expect(cities, containsAll(['Mandaue City', 'Lapu-Lapu City']));
    });

    test('filters barangays to the chosen city', () {
      final mandaue = PhAddressDirectory.localityNamed('Mandaue City');
      final results = PhAddressDirectory.searchBarangays(
        'basak',
        locality: mandaue,
      );
      expect(results.every((b) => b.locality == mandaue), isTrue);
    });

    test('street suggestions start with the barangay roads', () {
      final looc = barangay('Looc', 'Mandaue City');
      expect(looc.streetSuggestions.first, 'A.C. Cortes Avenue');
    });
  });

  group('PhAddress', () {
    test('picking a barangay fills its city', () {
      final address = PhAddress.empty.withBarangay(
        barangay('Pusok', 'Lapu-Lapu City'),
      );
      expect(address.locality?.name, 'Lapu-Lapu City');
    });

    test('changing city drops a barangay from another city', () {
      final address = PhAddress.empty
          .withBarangay(barangay('Pusok', 'Lapu-Lapu City'))
          .withLocality(PhAddressDirectory.localityNamed('Cebu City'));
      expect(address.barangay, isNull);
      expect(address.isComplete, isFalse);
    });

    test('incomplete or number-only street is rejected', () {
      final base = PhAddress.empty.withBarangay(
        barangay('Looc', 'Mandaue City'),
      );
      expect(base.isComplete, isFalse);
      expect(base.copyWith(street: '123').isComplete, isFalse);
      expect(base.formatted, isEmpty);
    });

    test('formats and parses back the same address', () {
      final address = PhAddress.empty
          .withBarangay(barangay('Looc', 'Mandaue City'))
          .copyWith(street: 'Unit 3, 12 A.C. Cortes Avenue');
      expect(
        address.formatted,
        'Unit 3, 12 A.C. Cortes Avenue, Looc, Mandaue City, Cebu',
      );
      final parsed = PhAddress.parse(address.formatted);
      expect(parsed.street, 'Unit 3, 12 A.C. Cortes Avenue');
      expect(parsed.barangay, address.barangay);
      expect(parsed.isComplete, isTrue);
    });

    test('resolves split profile columns before the flat string', () {
      final address = PhAddress.resolve(
        street: '12 Airport Road',
        barangay: 'pusok',
        city: 'Lapu-Lapu City',
        full: 'something older',
      );
      expect(address.formatted, '12 Airport Road, Pusok, Lapu-Lapu City, Cebu');
    });

    test('resolves the flat string registration stores', () {
      final address = PhAddress.resolve(
        full: '12 A.C. Cortes Avenue, Looc, Mandaue City, Cebu',
      );
      expect(address.barangay?.label, 'Looc, Mandaue City');
    });

    test('older free-text address resolves to empty', () {
      expect(
        PhAddress.resolve(full: 'Near the church, Mandaue'),
        same(PhAddress.empty),
      );
    });

    test('lenient split handles OCR-style text', () {
      final address = PhAddress.lenient(
        'Purok 2, Sitio Mangga, Brgy. Pusok, Lapu-Lapu, Cebu 6015',
      );
      expect(address.barangay?.name, 'Pusok');
      expect(address.locality?.name, 'Lapu-Lapu City');
      expect(address.street, 'Purok 2, Sitio Mangga');
    });

    test('lenient split keeps unmatched text as the street', () {
      final address = PhAddress.lenient('Near the old church');
      expect(address.barangay, isNull);
      expect(address.locality, isNull);
      expect(address.street, 'Near the old church');
    });

    test('lenient split finds the city without a known barangay', () {
      final address = PhAddress.lenient(
        '12 Somewhere St, Unknown, Mandaue City',
      );
      expect(address.locality?.name, 'Mandaue City');
      expect(address.barangay, isNull);
      expect(address.street, '12 Somewhere St, Unknown');
    });

    test('unknown barangay does not parse', () {
      expect(
        PhAddress.parse('12 Main St, Nowhere, Mandaue City, Cebu').isComplete,
        isFalse,
      );
    });
  });
}
