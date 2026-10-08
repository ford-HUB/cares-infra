import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/features/auth/domain/id_extraction_review.dart';
import 'package:mobile/features/auth/domain/register_ocr_sample.dart';
import 'package:mobile/features/auth/domain/volunteer_type.dart';

void main() {
  const deviceFront =
      'STUDENT\n'
      'MARIA L SANTOS\n'
      '2021-08452\n'
      'FEMALE\n';
  const deviceBack =
      'ADDRESS: Looc, Mandaue City, Cebu\n'
      'TEL NO. 09171234567\n';

  RegisterOcrSample complete() => RegisterOcrSample.sample.copyWith(
    idNumber: '202108452',
    lastname: 'SANTOS',
  );

  test('a complete extraction that agrees with the device scan has no flags',
      () {
    final review = IdExtractionReview.of(
      complete(),
      deviceFrontText: deviceFront,
      deviceBackText: deviceBack,
      volunteerType: VolunteerType.student,
    );
    expect(review.flags, isEmpty);
  });

  test('fills blanks from the device scan and asks to confirm them', () {
    final review = IdExtractionReview.of(
      complete().copyWith(idNumber: '', phoneNumber: ''),
      deviceFrontText: deviceFront,
      deviceBackText: deviceBack,
      volunteerType: VolunteerType.student,
    );
    expect(review.data.idNumber, '202108452');
    expect(review.data.phoneNumber, '09171234567');
    expect(
      review.flags,
      containsAll(const [
        IdFieldFlag('ID number', IdFieldFlagReason.filledFromDevice),
        IdFieldFlag('Phone number', IdFieldFlagReason.filledFromDevice),
      ]),
    );
  });

  test('flags an ID number the two scans read differently', () {
    final review = IdExtractionReview.of(
      complete().copyWith(idNumber: '202108457'),
      deviceFrontText: deviceFront,
      deviceBackText: deviceBack,
      volunteerType: VolunteerType.student,
    );
    expect(review.data.idNumber, '202108457');
    expect(
      review.flags,
      contains(const IdFieldFlag('ID number', IdFieldFlagReason.mismatch)),
    );
  });

  test('flags required fields that neither scan found', () {
    final review = IdExtractionReview.of(
      RegisterOcrSample.empty(volunteerType: 'STUDENT'),
      volunteerType: VolunteerType.student,
    );
    final missing = review.flags
        .where((f) => f.reason == IdFieldFlagReason.missing)
        .map((f) => f.label);
    expect(
      missing,
      containsAll([
        'First name',
        'Last name',
        'ID number',
        'Age',
        'Address',
        'Phone number',
        'Department',
        'Course',
      ]),
    );
  });
}
