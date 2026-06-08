import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/features/auth/data/auth_registration_service.dart';

final authRegistrationServiceProvider = Provider<AuthRegistrationService>(
  (ref) => AuthRegistrationService(),
);
