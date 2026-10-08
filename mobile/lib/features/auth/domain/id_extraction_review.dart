import 'package:mobile/features/auth/domain/register_ocr_raw_parser.dart';
import 'package:mobile/features/auth/domain/register_ocr_sample.dart';
import 'package:mobile/features/auth/domain/volunteer_type.dart';

enum IdFieldFlagReason {
  /// Neither the server nor the on-device scan found it.
  missing,

  /// The server missed it; the on-device scan's reading was filled in.
  filledFromDevice,

  /// The server and the on-device scan read different values.
  mismatch,
}

class IdFieldFlag {
  const IdFieldFlag(this.label, this.reason);

  final String label;
  final IdFieldFlagReason reason;

  String get message => switch (reason) {
    IdFieldFlagReason.missing => '$label — not found on your ID, enter it',
    IdFieldFlagReason.filledFromDevice =>
      '$label — filled from a second scan, confirm it',
    IdFieldFlagReason.mismatch =>
      '$label — the two scans disagree, check it against your ID',
  };

  @override
  bool operator ==(Object other) =>
      other is IdFieldFlag && other.label == label && other.reason == reason;

  @override
  int get hashCode => Object.hash(label, reason);
}

/// Cross-checks the server's ID extraction against the text read on-device
/// during pre-validation, so blanks get filled and doubtful values are
/// pointed out on the review form instead of being submitted silently.
class IdExtractionReview {
  const IdExtractionReview({required this.data, required this.flags});

  final RegisterOcrSample data;
  final List<IdFieldFlag> flags;

  static IdExtractionReview of(
    RegisterOcrSample server, {
    String deviceFrontText = '',
    String deviceBackText = '',
    VolunteerType? volunteerType,
  }) {
    final hasDevice =
        deviceFrontText.trim().isNotEmpty || deviceBackText.trim().isNotEmpty;
    final device = hasDevice
        ? RegisterOcrRawParser.parse(deviceFrontText, deviceBackText)
        : null;
    final flags = <IdFieldFlag>[];
    var data = server;

    // First name and gender are only filled, never cross-checked: engines
    // split given / middle names differently, so a mismatch there is noise.
    String text(
      String label,
      String serverValue,
      String deviceValue, {
      bool crossCheck = false,
      String Function(String)? normalize,
    }) {
      final norm = normalize ?? (String v) => v.trim().toUpperCase();
      final s = serverValue.trim();
      final d = deviceValue.trim();
      if (s.isEmpty && d.isEmpty) {
        flags.add(IdFieldFlag(label, IdFieldFlagReason.missing));
        return s;
      }
      if (s.isEmpty) {
        flags.add(IdFieldFlag(label, IdFieldFlagReason.filledFromDevice));
        return d;
      }
      if (crossCheck && d.isNotEmpty && norm(s) != norm(d)) {
        flags.add(IdFieldFlag(label, IdFieldFlagReason.mismatch));
      }
      return s;
    }

    data = data.copyWith(
      firstname: text('First name', data.firstname, device?.firstname ?? ''),
      lastname: text(
        'Last name',
        data.lastname,
        device?.lastname ?? '',
        crossCheck: true,
      ),
      idNumber: text(
        'ID number',
        data.idNumber,
        device?.idNumber ?? '',
        crossCheck: true,
        normalize: RegisterOcrRawParser.normalizeIdNumber,
      ),
      gender: text('Gender', data.gender, device?.gender ?? ''),
    );

    // Values only filled from the device scan; a mismatch here is too noisy
    // (addresses wrap, phones get reformatted) to be worth flagging.
    if (data.age <= 0) {
      final deviceAge = device?.age ?? 0;
      if (deviceAge > 0) {
        data = data.copyWith(age: deviceAge);
        flags.add(
          const IdFieldFlag('Age', IdFieldFlagReason.filledFromDevice),
        );
      } else {
        flags.add(const IdFieldFlag('Age', IdFieldFlagReason.missing));
      }
    }
    if (data.phoneNumber.trim().isEmpty) {
      final devicePhone = device?.phoneNumber ?? '';
      if (devicePhone.isNotEmpty) {
        data = data.copyWith(phoneNumber: devicePhone);
        flags.add(
          const IdFieldFlag('Phone number', IdFieldFlagReason.filledFromDevice),
        );
      } else {
        flags.add(const IdFieldFlag('Phone number', IdFieldFlagReason.missing));
      }
    }
    final deviceAddress = device?.currentAddress ?? '';
    final address = RegisterOcrRawParser.preferAddress(
      data.currentAddress,
      deviceAddress,
    );
    if (address.isEmpty) {
      flags.add(const IdFieldFlag('Address', IdFieldFlagReason.missing));
    } else if (data.currentAddress.trim().isEmpty) {
      flags.add(
        const IdFieldFlag('Address', IdFieldFlagReason.filledFromDevice),
      );
    }
    data = data.copyWith(currentAddress: address);

    if (data.departmentName.trim().isEmpty) {
      flags.add(const IdFieldFlag('Department', IdFieldFlagReason.missing));
    }
    final needsCourse =
        volunteerType == VolunteerType.student ||
        volunteerType == VolunteerType.alumni;
    if (needsCourse && data.majorName.trim().isEmpty) {
      flags.add(const IdFieldFlag('Course', IdFieldFlagReason.missing));
    }

    return IdExtractionReview(data: data, flags: flags);
  }
}
