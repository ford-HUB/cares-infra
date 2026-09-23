import 'package:latlong2/latlong.dart';

/// The designated CARES Office where donors hand in goods donations. CARES no
/// longer collects goods, so every goods pledge is delivered here in person.
abstract final class CaresOffice {
  static const String name = 'CARES Office';
  static const String campus = 'University of Cebu – Lapu-Lapu and Mandaue';
  static const String address = 'A.C. Cortes Avenue, Looc, Mandaue City, Cebu';

  /// `University of Cebu – Lapu-Lapu and Mandaue, A.C. Cortes Avenue, Looc,
  /// Mandaue City, Cebu`.
  static const String fullAddress = '$campus, $address';

  /// Centre of the UCLM campus grounds (OpenStreetMap way 749746212).
  static const LatLng location = LatLng(10.32642, 123.95430);
}
