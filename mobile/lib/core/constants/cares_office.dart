import 'package:latlong2/latlong.dart';

/// Goods pledges are delivered here in person; CARES no longer collects goods.
abstract final class CaresOffice {
  static const String name = 'CARES Office';
  static const String campus = 'University of Cebu – Lapu-Lapu and Mandaue';
  static const String address = 'A.C. Cortes Avenue, Looc, Mandaue City, Cebu';

  static const String fullAddress = '$campus, $address';

  /// UCLM campus centre (OSM way 749746212).
  static const LatLng location = LatLng(10.32642, 123.95430);
}
