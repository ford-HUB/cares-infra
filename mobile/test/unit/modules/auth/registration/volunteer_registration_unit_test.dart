// UNIT TESTING — Process Registration, volunteer side (REG-VOL-###);
// `dart run tool/unit_case_report.dart <this file>` prints the table. Details
// and account checks run through VolunteerDetailsRules and
// RegistrationAccountRules, the same rules that gate Continue. OTP is covered
// in email_verification/; shared fixtures are in
// registration_test_support.dart.

import 'package:flutter_test/flutter_test.dart' hide test;
import 'package:mobile/core/constants/partner_barangays.dart';
import 'package:mobile/core/models/password_policy.dart';
import 'package:mobile/core/services/api_client.dart';
import 'package:mobile/core/utils/phone_number_format.dart';
import 'package:mobile/features/auth/data/models/registration_api_models.dart';
import 'package:mobile/features/auth/domain/ph_address.dart';
import 'package:mobile/features/auth/domain/register_ocr_sample.dart';
import 'package:mobile/features/auth/domain/registration_account_rules.dart';
import 'package:mobile/features/auth/domain/registration_role_type.dart';
import 'package:mobile/features/auth/domain/volunteer_details_rules.dart';
import 'package:mobile/features/auth/domain/volunteer_field_rules.dart';
import 'package:mobile/features/auth/domain/volunteer_type.dart';
import 'package:mobile/features/auth/presentation/widgets/registration_document_card.dart';

import '../../../../config/test_case.dart';
import 'registration_test_support.dart';

final _cases = TestCases(module: 'Process Registration', prefix: 'REG-VOL');

final _thisYear = DateTime.now().year;

const _nameCharsError =
    'Use letters, spaces, hyphens, apostrophes or periods only';

const _streetCharsError = "Use letters, numbers and . , # ' - / ( ) & only.";

RegisterOcrSample _reviewedVolunteer() =>
    RegisterOcrSampleApi.fromApiJson(ocrData());

RegisterOcrSample _student() => RegisterOcrSample.sample.copyWith(
  graduationYear: _thisYear + 1,
  currentAddress: '123 A.C. Cortes Avenue, Looc, Mandaue City, Cebu',
);

/// Non-teaching: no course, year level or graduation year.
RegisterOcrSample _staff() =>
    RegisterOcrSample.empty(volunteerType: 'STAFF').copyWith(
      firstname: 'Ramon',
      lastname: 'Dela Cruz',
      gender: 'male',
      age: 41,
      currentAddress: '45 Plaridel Street, Centro, Mandaue City, Cebu',
      phoneNumber: '+639181112222',
      idNumber: '1998-0331',
      departmentName: 'Non-Teaching Personnel',
    );

RegisterOcrSample _alumni() =>
    RegisterOcrSample.empty(volunteerType: 'ALUMNI').copyWith(
      firstname: 'Liza',
      lastname: 'Ouano',
      gender: 'female',
      age: 29,
      currentAddress: '8 Ouano Avenue, Subangdaku, Mandaue City, Cebu',
      phoneNumber: '+639193334444',
      idNumber: 'a-2019-0042 ',
      departmentName: 'College of Computer Studies',
      majorName: 'BSCS - Bachelor of Science in Computer Science',
      graduationYear: 2019,
    );

RegisterOcrSample _partner() =>
    RegisterOcrSample.empty(volunteerType: 'PARTNER_BARANGAY').copyWith(
      firstname: 'Leo',
      lastname: 'Cabahug',
      gender: 'male',
      age: 34,
      currentAddress: '12 A.C. Cortes Avenue, Looc, Mandaue City, Cebu',
      phoneNumber: '0917 123 4567',
      partnerBarangay: 'Barangay Looc',
    );

Map<VolunteerType, RegisterOcrSample> _everyType() => {
  VolunteerType.student: _student(),
  VolunteerType.staff: _staff(),
  VolunteerType.alumni: _alumni(),
  VolunteerType.partnerBarangay: _partner(),
};

/// The flow's Continue gate.
bool _detailsComplete(
  RegisterOcrSample data,
  VolunteerType type, {
  bool hasDocument = true,
}) => VolunteerDetailsRules.isComplete(
  data,
  signUpType: type,
  hasDocument: hasDocument,
);

bool _accountComplete({
  String email = testEmail,
  String password = testPassword,
  String? confirmPassword,
  bool acceptedTerms = true,
  PasswordPolicy policy = PasswordPolicy.fallback,
}) => RegistrationAccountRules.isComplete(
  email: email,
  password: password,
  confirmPassword: confirmPassword ?? password,
  acceptedTerms: acceptedTerms,
  policy: policy,
);

List<String> _unmet(
  String password, [
  PasswordPolicy policy = PasswordPolicy.fallback,
]) => policy.unmetRules(password).map((rule) => rule.label).toList();

PhAddress _homeAddress({
  String street = '123 A.C. Cortes Avenue',
  String barangay = 'Looc',
  String city = 'Mandaue City',
}) {
  final locality = PhAddressDirectory.localityNamed(city)!;
  return PhAddress(
    street: street,
    barangay: PhAddressDirectory.barangayNamed(barangay, locality),
    locality: locality,
  );
}

Future<Map<String, dynamic>> _register(
  RequestRecorder rec, {
  String registrationId = testRegistrationId,
}) => rec.service().registerFromSession(
  registrationId: registrationId,
  ocrData: _reviewedVolunteer(),
  roleType: RegistrationRoleType.volunteer.apiValue,
  email: testEmail,
  password: testPassword,
);

/// The registration conflict a 409 on [path] points back to.
Future<RegistrationConflict?> _conflictOn(String path, String message) async {
  final rec = RequestRecorder(
    (_) async => failResponse(409, message, [
      {'path': path, 'message': message},
    ]),
  );
  try {
    await _register(rec);
  } on ApiException catch (e) {
    return RegistrationConflict.fromException(e);
  }
  fail('expected ApiException');
}

void main() {
  setUpRegistrationTests();

  _cases.unit('Register (Volunteer Type)', () {
    _cases.test(
      'User registers as a volunteer',
      expected: 'The role is sent to the server as VOLUNTEER',
      () {
        expect(RegistrationRoleType.volunteer.apiValue, 'VOLUNTEER');
      },
    );

    _cases.test(
      'User picks one of the volunteer types, or the server sends an unknown '
      'or empty type',
      expected:
          'Every known type round-trips through its API value; an unknown or '
          'empty type is not accepted',
      () {
        for (final type in VolunteerType.values) {
          expect(VolunteerTypeX.fromApiValue(type.apiValue), type);
        }
        expect(VolunteerTypeX.fromApiValue(' alumni '), VolunteerType.alumni);
        expect(VolunteerTypeX.fromApiValue('TEACHER'), isNull);
        expect(VolunteerTypeX.fromApiValue(null), isNull);
        expect(VolunteerTypeX.fromApiValue(''), isNull);
      },
    );

    _cases.test(
      'User picks student, staff, alumni or partner barangay',
      expected:
          'Student and staff are face matched and read off the ID; alumni and '
          'partner barangay are reviewed by a director',
      () {
        expect(VolunteerType.student.isDirectorReviewed, isFalse);
        expect(VolunteerType.staff.isDirectorReviewed, isFalse);
        expect(VolunteerType.alumni.isDirectorReviewed, isTrue);
        expect(VolunteerType.partnerBarangay.isDirectorReviewed, isTrue);

        expect(VolunteerType.student.label, 'Student');
        expect(VolunteerType.staff.label, 'Staff');
        expect(VolunteerType.alumni.label, 'Alumni');
        expect(VolunteerType.partnerBarangay.label, 'Partner Barangay');
      },
    );
  });

  _cases.unit('Register (Student Volunteer)', () {
    _cases.test(
      'Student fills in every section of the details step',
      expected:
          'The details step can continue; no supporting document is needed',
      () {
        expect(_detailsComplete(_student(), VolunteerType.student), isTrue);
        expect(
          _detailsComplete(
            _student(),
            VolunteerType.student,
            hasDocument: false,
          ),
          isTrue,
        );
      },
    );

    _cases.test(
      'Student leaves the ID number, department, course, year level or '
      'graduation year blank',
      expected:
          'The account will not be registered; the details step cannot '
          'continue',
      () {
        final missing = {
          'ID number': _student().copyWith(idNumber: '  '),
          'department': _student().copyWith(departmentName: ''),
          'course': _student().copyWith(majorName: ''),
          'year level': _student().copyWith(yearLevelName: ' '),
          'graduation year': _student().copyWith(graduationYear: 0),
        };
        for (final entry in missing.entries) {
          expect(
            VolunteerDetailsRules.schoolInfoValid(
              entry.value,
              VolunteerType.student,
            ),
            isFalse,
            reason: entry.key,
          );
          expect(
            _detailsComplete(entry.value, VolunteerType.student),
            isFalse,
            reason: entry.key,
          );
        }
      },
    );

    _cases.test(
      'Student leaves the ID number, department, course, year level or '
      'graduation year blank',
      expected:
          'The account will not be registered; the details step cannot '
          'continue',
      () {
        final missing = {
          'ID number': _student().copyWith(idNumber: '  '),
          'department': _student().copyWith(departmentName: ''),
          'course': _student().copyWith(majorName: ''),
          'year level': _student().copyWith(yearLevelName: ' '),
          'graduation year': _student().copyWith(graduationYear: 0),
        };
        for (final entry in missing.entries) {
          expect(
            VolunteerDetailsRules.schoolInfoValid(
              entry.value,
              VolunteerType.student,
            ),
            isFalse,
            reason: entry.key,
          );
          expect(
            _detailsComplete(entry.value, VolunteerType.student),
            isFalse,
            reason: entry.key,
          );
        }
      },
    );

    _cases.test(
      'Staff leaves the ID number, department blank',
      expected:
          'The account will not be registered; the details step cannot '
          'continue',
      () {
        final missing = {
          'ID number': _staff().copyWith(idNumber: '  '),
          'department': _staff().copyWith(departmentName: ''),
        };
        for (final entry in missing.entries) {
          expect(
            VolunteerDetailsRules.schoolInfoValid(
              entry.value,
              VolunteerType.staff,
            ),
            isFalse,
            reason: entry.key,
          );
          expect(
            _detailsComplete(entry.value, VolunteerType.staff),
            isFalse,
            reason: entry.key,
          );
        }
      },
    );

    _cases.test(
      'Alumni leaves the ID number, department, course, year level or '
      'graduation year blank',
      expected:
          'The account will not be registered; the details step cannot '
          'continue',
      () {
        final missing = {
          'ID number': _alumni().copyWith(idNumber: '  '),
          'department': _alumni().copyWith(departmentName: ''),
          'course': _alumni().copyWith(majorName: ''),
          'year level': _alumni().copyWith(yearLevelName: ' '),
          'graduation year': _alumni().copyWith(graduationYear: 0),
        };
        for (final entry in missing.entries) {
          expect(
            VolunteerDetailsRules.schoolInfoValid(
              entry.value,
              VolunteerType.alumni,
            ),
            isFalse,
            reason: entry.key,
          );
          expect(
            _detailsComplete(entry.value, VolunteerType.alumni),
            isFalse,
            reason: entry.key,
          );
        }
      },
    );

    _cases.test(
      'Student does not input a graduation year, or enters one outside this '
      'year to six years out',
      expected:
          'The account will not be registered; the form shows "Graduation '
          'year is required", "Enter a 4-digit year" or the allowed range',
      () {
        final range = 'Enter a year from $_thisYear to ${_thisYear + 6}';

        expect(
          VolunteerFieldRules.graduationYearError('', VolunteerType.student),
          'Graduation year is required',
        );
        expect(
          VolunteerFieldRules.graduationYearError('27', VolunteerType.student),
          'Enter a 4-digit year',
        );
        expect(
          VolunteerFieldRules.graduationYearError(
            '${_thisYear - 1}',
            VolunteerType.student,
          ),
          range,
        );
        expect(
          VolunteerFieldRules.graduationYearError(
            '${_thisYear + 7}',
            VolunteerType.student,
          ),
          range,
        );
        expect(
          VolunteerFieldRules.graduationYearError(
            '$_thisYear',
            VolunteerType.student,
          ),
          isNull,
        );
        expect(
          VolunteerFieldRules.graduationYearError(
            '${_thisYear + 6}',
            VolunteerType.student,
          ),
          isNull,
        );
        expect(
          VolunteerFieldRules.isValidGraduationYear(0, VolunteerType.student),
          isFalse,
        );
      },
    );

    _cases.test(
      'Student enters a full graduation date and a major',
      expected: 'The real month, day and major are sent as entered',
      () {
        final school =
            registerPayload(RegisterOcrSample.sample)['school_info']
                as Map<String, dynamic>;

        expect(school['graduation_year'], 2026);
        expect(school['graduation_month'], 3);
        expect(school['graduation_day'], 15);
        expect(school['major'], {
          'name': 'BEED - Bachelor of Elementary Education',
        });
      },
    );

    _cases.test(
      'A student volunteer has a partner barangay left over in the form',
      expected: 'No partner barangay is sent for any other volunteer type',
      () {
        final body = registerPayload(
          RegisterOcrSample.sample.copyWith(partnerBarangay: 'Barangay Looc'),
        );

        expect(body.containsKey('partner_barangay'), isFalse);
      },
    );

    _cases.test(
      'Student registers with an ID number that is already registered',
      expected:
          'The account will not be registered; the conflict points back to '
          'the ID number field (409)',
      () async {
        final conflict = await _conflictOn(
          'id_number',
          'This ID number is already registered',
        );

        expect(conflict?.field, RegistrationConflictField.idNumber);
        expect(conflict?.message, 'This ID number is already registered');
      },
    );
  });

  _cases.unit('Register (Staff Volunteer)', () {
    _cases.test(
      'Non-teaching staff fills in their details with no course, year level '
      'or graduation year',
      expected:
          'The details step can continue; no supporting document is needed',
      () {
        expect(_detailsComplete(_staff(), VolunteerType.staff), isTrue);
        expect(
          _detailsComplete(_staff(), VolunteerType.staff, hasDocument: false),
          isTrue,
        );
      },
    );

    _cases.test(
      'Teaching staff picks a college department with no course or year',
      expected: 'The details step can continue',
      () {
        final faculty = _staff().copyWith(
          departmentName: 'College of Computer Studies',
        );

        expect(_detailsComplete(faculty, VolunteerType.staff), isTrue);
      },
    );

    _cases.test(
      'Staff leaves the ID number or department blank',
      expected:
          'The account will not be registered; the details step cannot '
          'continue',
      () {
        expect(
          _detailsComplete(
            _staff().copyWith(idNumber: ''),
            VolunteerType.staff,
          ),
          isFalse,
        );
        expect(
          _detailsComplete(
            _staff().copyWith(departmentName: ' '),
            VolunteerType.staff,
          ),
          isFalse,
        );
      },
    );

    _cases.test(
      'Staff enters any 4-digit year, or a short one',
      expected:
          'Any 4-digit year is accepted; a short year shows "Enter a 4-digit '
          'year"',
      () {
        expect(
          VolunteerFieldRules.graduationYearError('1800', VolunteerType.staff),
          isNull,
        );
        expect(
          VolunteerFieldRules.graduationYearError('99', VolunteerType.staff),
          'Enter a 4-digit year',
        );
      },
    );

    _cases.test(
      'User registers as staff with no graduation year or year level',
      expected:
          'The account is still sent with valid placeholder school values '
          '(year 2000, month/day 1, year level N/A)',
      () {
        final staff = RegisterOcrSample.sample.copyWith(
          graduationYear: 0,
          graduationMonth: 13,
          graduationDay: 40,
          yearLevelName: '',
          volunteerType: 'STAFF',
        );

        final school =
            registerPayload(staff)['school_info'] as Map<String, dynamic>;

        expect(school['graduation_year'], 2000);
        expect(school['graduation_month'], 1);
        expect(school['graduation_day'], 1);
        expect(school['year_level'], {'name': 'N/A'});
      },
    );
  });

  _cases.unit('Register (Alumni Volunteer)', () {
    _cases.test(
      'Alumni fills in their course and graduated year and attaches their '
      'certificate',
      expected: 'The details step can continue',
      () {
        expect(_detailsComplete(_alumni(), VolunteerType.alumni), isTrue);
      },
    );

    _cases.test(
      'Alumni leaves the alumni ID number, department, course or graduated '
      'year blank',
      expected:
          'The account will not be registered; the details step cannot '
          'continue',
      () {
        final missing = {
          'ID number': _alumni().copyWith(idNumber: ''),
          'department': _alumni().copyWith(departmentName: ''),
          'course': _alumni().copyWith(majorName: ' '),
          'graduated year': _alumni().copyWith(graduationYear: 0),
          'future year': _alumni().copyWith(graduationYear: _thisYear + 1),
        };
        for (final entry in missing.entries) {
          expect(
            _detailsComplete(entry.value, VolunteerType.alumni),
            isFalse,
            reason: entry.key,
          );
        }
      },
    );

    _cases.test(
      'Partner barangay leaves the Partner Barangay blank',
      expected:
          'The account will not be registered; the details step cannot '
          'continue',
      () {
        final missing = {
          'Partner Barangay': _partner().copyWith(departmentName: ''),
        };
        for (final entry in missing.entries) {
          expect(
            _detailsComplete(entry.value, VolunteerType.partnerBarangay),
            isFalse,
            reason: entry.key,
          );
        }
      },
    );

    _cases.test(
      'Alumni enters a graduation year before 1950 or after this year',
      expected:
          'The account will not be registered; the form shows "Enter a year '
          'from 1950 to <this year>"',
      () {
        expect(
          VolunteerFieldRules.graduationYearError('1949', VolunteerType.alumni),
          'Enter a year from 1950 to $_thisYear',
        );
        expect(
          VolunteerFieldRules.graduationYearError(
            '${_thisYear + 1}',
            VolunteerType.alumni,
          ),
          'Enter a year from 1950 to $_thisYear',
        );
        expect(
          VolunteerFieldRules.graduationYearError('1950', VolunteerType.alumni),
          isNull,
        );
        expect(
          VolunteerFieldRules.graduationYearError(
            '$_thisYear',
            VolunteerType.alumni,
          ),
          isNull,
        );
      },
    );

    _cases.test(
      'Alumni types their alumni ID number in lower case with spaces',
      expected:
          'The alumni ID number is sent trimmed and in upper case, dashes kept',
      () {
        final body = registerPayload(_alumni());
        final school = body['school_info'] as Map<String, dynamic>;

        expect(_alumni().registrationIdNumber, 'A-2019-0042');
        expect(school['id_number'], 'A-2019-0042');
        expect(school['graduation_year'], 2019);
        expect(school['major'], {
          'name': 'BSCS - Bachelor of Science in Computer Science',
        });
      },
    );
  });

  _cases.unit('Register (Partner Barangay Volunteer)', () {
    _cases.test(
      'Partner-barangay volunteer picks their barangay and attaches a '
      'supporting document, with no school record',
      expected:
          'The details step can continue without an ID number, department '
          'or course',
      () {
        expect(
          VolunteerDetailsRules.schoolInfoValid(
            _partner(),
            VolunteerType.partnerBarangay,
          ),
          isTrue,
        );
        expect(
          _detailsComplete(_partner(), VolunteerType.partnerBarangay),
          isTrue,
        );
      },
    );

    _cases.test(
      'Partner-barangay volunteer does not pick a barangay, or one CARES has '
      'not partnered with',
      expected:
          'The account will not be registered; only Looc, Opao, Umapad and '
          'Paknaan are accepted',
      () {
        expect(PartnerBarangays.names, [
          'Barangay Looc',
          'Barangay Opao',
          'Barangay Umapad',
          'Barangay Paknaan',
        ]);
        for (final name in PartnerBarangays.names) {
          expect(
            _detailsComplete(
              _partner().copyWith(partnerBarangay: name),
              VolunteerType.partnerBarangay,
            ),
            isTrue,
            reason: name,
          );
        }
        for (final name in ['', 'Barangay Basak', 'looc', 'Barangay Looc ']) {
          expect(
            _detailsComplete(
              _partner().copyWith(partnerBarangay: name),
              VolunteerType.partnerBarangay,
            ),
            isFalse,
            reason: '"$name"',
          );
        }
      },
    );

    _cases.test(
      'Partner-barangay volunteer does not pick a gender',
      expected:
          'The account will not be registered; the details step cannot '
          'continue',
      () {
        final noGender = _partner().copyWith(gender: ' ');

        expect(
          VolunteerDetailsRules.personalInfoValid(
            noGender,
            VolunteerType.partnerBarangay,
          ),
          isFalse,
        );
        expect(
          _detailsComplete(noGender, VolunteerType.partnerBarangay),
          isFalse,
        );
      },
    );

    _cases.test(
      'User registers as a partner-barangay volunteer and stray text is in '
      'the ID number',
      expected:
          'The barangay is sent and the ID number is not; the school record is '
          'keyed BRGY-<session>',
      () {
        final volunteer = _partner().copyWith(idNumber: '12345');

        final body = registerPayload(volunteer);

        expect(volunteer.registrationIdNumber, isEmpty);
        expect(body['role_type'], 'VOLUNTEER');
        expect(body['partner_barangay'], 'Barangay Looc');
        expect(body['school_info'], {
          'id_number': 'BRGY-$testRegistrationId',
          'graduation_year': 2000,
          'graduation_month': 1,
          'graduation_day': 1,
          'department': {'name': 'N/A'},
          'major': {'name': 'N/A'},
          'year_level': {'name': 'N/A'},
        });
      },
    );
  });

  _cases.unit('Register (ID Upload)', () {
    _cases.test(
      'User captures the front and back of their ID',
      expected:
          'Both sides and the role are sent to POST /auth/upload-id as '
          'multipart form data and a session is returned',
      () async {
        final rec = RequestRecorder();

        final result = await rec.service().uploadId(
          front: tempImage(
            'front.jpg',
            mimeType: 'image/jpeg',
            content: 'FRONT',
          ),
          back: tempImage('back.jpg', mimeType: 'image/jpeg', content: 'BACK'),
          roleType: 'VOLUNTEER',
        );

        expect(rec.last.method, 'POST');
        expect(rec.last.url.toString(), '$testOrigin$uploadIdPath');

        final parts = partsOf(rec.last);
        expect(parts.keys, containsAll(['roleType', 'front', 'back']));
        expect(parts['roleType']!.content, 'VOLUNTEER');
        expect(parts['front']!.filename, 'front.jpg');
        expect(parts['front']!.contentType, 'image/jpeg');
        expect(parts['front']!.content, 'FRONT');
        expect(parts['back']!.filename, 'back.jpg');
        expect(parts['back']!.content, 'BACK');

        expect(result.registrationId, testRegistrationId);
      },
    );

    _cases.test(
      'The upload has no role selected',
      expected: 'The roleType field is left out of the upload',
      () async {
        final rec = RequestRecorder();

        await rec.service().uploadId(
          front: tempImage('f.jpg'),
          back: tempImage('b.jpg'),
          roleType: '',
        );

        expect(partsOf(rec.last).containsKey('roleType'), isFalse);
      },
    );

    _cases.test(
      'The camera reports an image mime type for the capture',
      expected: 'That mime type is used for each side',
      () async {
        final rec = RequestRecorder();

        await rec.service().uploadId(
          front: tempImage('capture.bin', mimeType: 'image/webp'),
          back: tempImage('capture2.bin', mimeType: 'image/png'),
        );

        final parts = partsOf(rec.last);
        expect(parts['front']!.contentType, 'image/webp');
        expect(parts['back']!.contentType, 'image/png');
      },
    );

    _cases.test(
      'The capture has a non-image or unknown mime type',
      expected: 'The type falls back to the file extension, then to JPEG',
      () async {
        final rec = RequestRecorder();

        await rec.service().uploadId(
          front: tempImage('front.PNG', mimeType: 'application/octet-stream'),
          back: tempImage('back.heic'),
        );

        final parts = partsOf(rec.last);
        expect(parts['front']!.contentType, 'image/png');
        expect(parts['back']!.contentType, 'image/jpeg');
      },
    );

    _cases.test(
      'User uploads an ID the server cannot read',
      expected:
          'The account will not be registered; the server message "We could '
          'not read your ID. Retake the photo." is shown (422)',
      () async {
        final rec = RequestRecorder(
          (_) async =>
              failResponse(422, 'We could not read your ID. Retake the photo.'),
        );

        await expectLater(
          rec.service().uploadId(
            front: tempImage('front.jpg'),
            back: tempImage('back.jpg'),
          ),
          throwsApiException(
            'We could not read your ID. Retake the photo.',
            status: 422,
          ),
        );
      },
    );

    _cases.test(
      'Staff volunteer chooses manual registration',
      expected:
          'Only both ID sides and volunteerType STAFF are sent to POST '
          '/auth/upload-manual-id',
      () async {
        final rec = RequestRecorder();

        final result = await rec.service().uploadManualId(
          front: tempImage(
            'front.jpg',
            mimeType: 'image/jpeg',
            content: 'FRONT',
          ),
          back: tempImage('back.jpg', mimeType: 'image/jpeg', content: 'BACK'),
          volunteerType: VolunteerType.staff.apiValue,
        );

        expect(rec.last.method, 'POST');
        expect(rec.last.url.toString(), '$testOrigin$uploadManualIdPath');

        final parts = partsOf(rec.last);
        expect(parts.keys, unorderedEquals(['volunteerType', 'front', 'back']));
        expect(parts['volunteerType']!.content, 'STAFF');
        expect(parts['front']!.content, 'FRONT');
        expect(parts['back']!.content, 'BACK');
        expect(result.registrationId, testRegistrationId);
      },
    );

    _cases.test(
      'Alumni volunteer chooses manual registration',
      expected: 'The manual upload names volunteerType ALUMNI',
      () async {
        final rec = RequestRecorder();

        await rec.service().uploadManualId(
          front: tempImage('f.jpg'),
          back: tempImage('b.jpg'),
          volunteerType: VolunteerType.alumni.apiValue,
        );

        expect(partsOf(rec.last)['volunteerType']!.content, 'ALUMNI');
      },
    );
  });

  _cases.unit('Register (Face Verification)', () {
    _cases.test(
      'User takes a selfie for the face scan',
      expected:
          'The session id and the selfie are sent to POST /auth/verify-face '
          'as multipart',
      () async {
        final rec = RequestRecorder();

        await rec.service().verifyFace(
          registrationId: testRegistrationId,
          selfie: tempImage(
            'selfie.jpg',
            mimeType: 'image/jpeg',
            content: 'FACE',
          ),
        );

        expect(rec.last.url.path, verifyFacePath);
        final parts = partsOf(rec.last);
        expect(parts['registrationId']!.content, testRegistrationId);
        expect(parts['selfie']!.filename, 'selfie.jpg');
        expect(parts['selfie']!.contentType, 'image/jpeg');
        expect(parts['selfie']!.content, 'FACE');
      },
    );

    _cases.test(
      "User's face matches the ID photo",
      expected: 'The match is returned with its similarity and threshold',
      () async {
        final rec = RequestRecorder();

        final result = await rec.service().verifyFace(
          registrationId: testRegistrationId,
          selfie: tempImage('selfie.jpg'),
        );

        expect(result.registrationId, testRegistrationId);
        expect(result.match, isTrue);
        expect(result.similarity, closeTo(0.71, 1e-9));
        expect(result.threshold, closeTo(0.45, 1e-9));
        expect(result.step, 'face_verified');
        expect(result.message, 'Face matches the ID photo');
      },
    );

    _cases.test(
      "User's face does not match the ID photo",
      expected:
          'The non-match is returned (not thrown) so the user can retry; the '
          'account is not registered yet',
      () async {
        final rec = RequestRecorder(
          (_) async => okResponse({
            'registrationId': testRegistrationId,
            'match': false,
            'similarity': 0.21,
            'step': 'id_uploaded',
          }),
        );

        final result = await rec.service().verifyFace(
          registrationId: testRegistrationId,
          selfie: tempImage('selfie.jpg'),
        );

        expect(result.match, isFalse);
        expect(result.step, 'id_uploaded');
        expect(result.threshold, closeTo(0.4, 1e-9));
        expect(result.message, '');
      },
    );
  });

  _cases.unit('Register (ID Extraction)', () {
    _cases.test(
      'The server reads the text off the uploaded ID',
      expected:
          'The session id is sent to POST /auth/extract-id and the name, age, '
          'school and type fields are filled in',
      () async {
        final rec = RequestRecorder();

        final result = await rec.service().extractId(
          registrationId: testRegistrationId,
        );

        expect(rec.last.method, 'POST');
        expect(rec.last.url.path, extractIdPath);
        expect(rec.body, {'registrationId': testRegistrationId});

        expect(result.registrationId, testRegistrationId);
        expect(result.step, 'ocr_completed');
        final ocr = result.ocrData;
        expect(ocr.firstname, 'Maria');
        expect(ocr.lastname, 'Santos');
        expect(ocr.middleName, 'L.');
        expect(ocr.fullName, 'Maria L. Santos');
        expect(ocr.age, 20);
        expect(ocr.departmentName, 'College of Teacher Education');
        expect(ocr.yearLevelName, '3rd Year');
        expect(ocr.graduationYear, 2027);
        expect(ocr.volunteerType, 'STUDENT');
      },
    );

    _cases.test(
      'The ID number is read with a dash (2421-7447)',
      expected: 'Only the digits are kept (24217447)',
      () async {
        final rec = RequestRecorder();

        final result = await rec.service().extractId(
          registrationId: testRegistrationId,
        );

        expect(result.ocrData.idNumber, '24217447');
      },
    );

    _cases.test(
      'The server could not read any field off the ID',
      expected:
          'Missing fields come back empty (not null) so the user can type '
          'them in',
      () async {
        final rec = RequestRecorder(
          (_) async => okResponse({
            'registrationId': testRegistrationId,
            'step': 'ocr_completed',
            'ocrData': <String, dynamic>{},
          }),
        );

        final ocr = (await rec.service().extractId(
          registrationId: testRegistrationId,
        )).ocrData;

        expect(ocr.firstname, '');
        expect(ocr.idNumber, '');
        expect(ocr.age, 0);
        expect(ocr.graduationYear, 0);
        expect(ocr.volunteerType, 'STUDENT');
      },
    );

    _cases.test(
      'The ID text extraction service is down',
      expected:
          'The account will not be registered; the server message is shown '
          '(502)',
      () async {
        final rec = RequestRecorder(
          (_) async =>
              failResponse(502, 'ID text extraction is unavailable right now'),
        );

        await expectLater(
          rec.service().extractId(registrationId: testRegistrationId),
          throwsApiException(
            'ID text extraction is unavailable right now',
            status: 502,
          ),
        );
      },
    );
  });

  _cases.unit('Register (Personal Information)', () {
    _cases.test(
      'User does not input a first or last name, or types only spaces',
      expected:
          'The account will not be registered; no volunteer type can continue',
      () {
        for (final entry in _everyType().entries) {
          final type = entry.key;
          final details = entry.value;
          final missing = {
            'first name': details.copyWith(firstname: ''),
            'last name': details.copyWith(lastname: ''),
            'blank first name': details.copyWith(firstname: '   '),
            'blank last name': details.copyWith(lastname: '\t'),
          };
          for (final field in missing.entries) {
            expect(
              VolunteerDetailsRules.namesValid(field.value),
              isFalse,
              reason: '${type.name}: ${field.key}',
            );
            expect(
              _detailsComplete(field.value, type),
              isFalse,
              reason: '${type.name}: ${field.key}',
            );
          }
        }
      },
    );

    _cases.test(
      'User leaves the optional middle name blank',
      expected:
          'Every volunteer type can still continue; the middle name is sent '
          'empty and left out of the full name',
      () {
        for (final entry in _everyType().entries) {
          final noMiddle = entry.value.copyWith(middleName: '');
          expect(
            _detailsComplete(noMiddle, entry.key),
            isTrue,
            reason: entry.key.name,
          );
        }

        final student = _student().copyWith(middleName: '');
        expect(registerPayload(student)['middle_name'], '');
        expect(student.fullName, 'Maria Santos');
      },
    );

    _cases.test(
      'User enters their gender in any spelling (male, M, Female, f, other, '
      'blank)',
      expected: 'The gender is sent as MALE, FEMALE or OTHER',
      () {
        final cases = {
          'male': 'MALE',
          ' M ': 'MALE',
          'Female': 'FEMALE',
          'f': 'FEMALE',
          'Non-binary': 'OTHER',
          '': 'OTHER',
        };
        for (final entry in cases.entries) {
          expect(
            registerPayload(
              RegisterOcrSample.sample.copyWith(gender: entry.key),
            )['gender'],
            entry.value,
            reason: '"${entry.key}"',
          );
        }
      },
    );

    _cases.test(
      'User does not input their age, or enters one outside 15 to 80',
      expected:
          'The account will not be registered; the form shows "Age is '
          'required" or "Enter an age between 15 and 80"',
      () {
        expect(VolunteerFieldRules.ageError(''), 'Age is required');
        expect(
          VolunteerFieldRules.ageError('14'),
          'Enter an age between 15 and 80',
        );
        expect(
          VolunteerFieldRules.ageError('81'),
          'Enter an age between 15 and 80',
        );
        expect(
          VolunteerFieldRules.ageError('twenty'),
          'Enter an age between 15 and 80',
        );
        expect(VolunteerFieldRules.ageError(' 15 '), isNull);
        expect(VolunteerFieldRules.ageError('80'), isNull);
      },
    );

    _cases.test(
      'The age read off the ID is missing (0) or out of range',
      expected:
          'Continue stays disabled for every volunteer type, agreeing with the '
          'inline age error; 15 and 80 are accepted',
      () {
        expect(VolunteerFieldRules.isValidAge(0), isFalse);
        expect(VolunteerFieldRules.isValidAge(14), isFalse);
        expect(VolunteerFieldRules.isValidAge(15), isTrue);
        expect(VolunteerFieldRules.isValidAge(80), isTrue);
        expect(VolunteerFieldRules.isValidAge(81), isFalse);

        for (final entry in _everyType().entries) {
          for (final age in [0, 14, 81]) {
            expect(
              _detailsComplete(entry.value.copyWith(age: age), entry.key),
              isFalse,
              reason: '${entry.key.name}: $age',
            );
          }
        }
      },
    );

    _cases.test(
      'User enters a first or last name with numbers or symbols (Maria2, '
      'M@ria, Santos!, 123, -Maria)',
      expected:
          'The account will not be registered; the form shows "Use letters, '
          'spaces, hyphens, apostrophes or periods only" and no volunteer type '
          'can continue',
      () {
        const invalid = ['Maria2', 'M@ria', 'Santos!', '123', '-Maria', '_Leo'];
        for (final name in invalid) {
          expect(
            VolunteerFieldRules.nameError(name, label: 'First name'),
            _nameCharsError,
            reason: name,
          );
        }

        for (final entry in _everyType().entries) {
          for (final name in invalid) {
            final badFirst = entry.value.copyWith(firstname: name);
            final badLast = entry.value.copyWith(lastname: name);
            for (final details in [badFirst, badLast]) {
              expect(
                VolunteerDetailsRules.namesValid(details),
                isFalse,
                reason: '${entry.key.name}: $name',
              );
              expect(
                _detailsComplete(details, entry.key),
                isFalse,
                reason: '${entry.key.name}: $name',
              );
            }
          }
        }
      },
    );

    _cases.test(
      'User types script, SQL or template text into a name field',
      expected:
          'The account will not be registered; the text is refused as an '
          'invalid name for every volunteer type',
      () {
        const injected = [
          '<script>alert(1)</script>',
          "Robert'); DROP TABLE users;--",
          "' OR '1'='1",
          '{{7*7}}',
          r'${name}',
          'Maria\nSantos',
        ];
        for (final name in injected) {
          expect(
            VolunteerFieldRules.nameError(name, label: 'Last name'),
            _nameCharsError,
            reason: name,
          );
          for (final entry in _everyType().entries) {
            expect(
              _detailsComplete(entry.value.copyWith(lastname: name), entry.key),
              isFalse,
              reason: '${entry.key.name}: $name',
            );
          }
        }
      },
    );

    _cases.test(
      'User enters a first or last name longer than 80 characters',
      expected:
          'The account will not be registered; the form shows "First name '
          'must be 80 characters or fewer"; exactly 80 is accepted',
      () {
        final tooLong = 'A' * 81;

        expect(
          VolunteerFieldRules.nameError(tooLong, label: 'First name'),
          'First name must be 80 characters or fewer',
        );
        expect(
          VolunteerFieldRules.nameError(tooLong, label: 'Last name'),
          'Last name must be 80 characters or fewer',
        );
        expect(
          VolunteerFieldRules.nameError('A' * 80, label: 'First name'),
          isNull,
        );
        expect(
          _detailsComplete(
            _student().copyWith(firstname: tooLong),
            VolunteerType.student,
          ),
          isFalse,
        );
      },
    );

    _cases.test(
      'User enters an invalid middle name, or leaves it blank',
      expected:
          'An invalid middle name blocks the details step; a blank one is not '
          'an error because the field is optional',
      () {
        expect(
          VolunteerFieldRules.nameError(
            '',
            label: 'Middle name',
            isRequired: false,
          ),
          isNull,
        );
        expect(
          VolunteerFieldRules.nameError(
            'L2',
            label: 'Middle name',
            isRequired: false,
          ),
          _nameCharsError,
        );

        for (final entry in _everyType().entries) {
          expect(
            _detailsComplete(entry.value.copyWith(middleName: 'L2'), entry.key),
            isFalse,
            reason: entry.key.name,
          );
        }
      },
    );

    _cases.test(
      'User enters a real name with ñ, accents, spaces, hyphens, apostrophes '
      'or periods',
      expected: 'The name is accepted and the details step can continue',
      () {
        const valid = [
          'Niño',
          'José',
          'Dela Cruz',
          "O'Neil",
          'D’Souza',
          'Santos-Reyes',
          'Ma. Luisa',
          'L.',
        ];
        for (final name in valid) {
          expect(
            VolunteerFieldRules.nameError(name, label: 'First name'),
            isNull,
            reason: name,
          );
        }
        expect(
          _detailsComplete(
            _student().copyWith(
              firstname: 'Ma. Niña',
              middleName: "D'Souza",
              lastname: 'Dela Cruz-Ybañez',
            ),
            VolunteerType.student,
          ),
          isTrue,
        );
      },
    );

    _cases.test(
      'User enters an age that is not a whole number (-20, 20.5, 2O, 20 '
      'years)',
      expected:
          'The account will not be registered; the form shows "Enter an age '
          'between 15 and 80"',
      () {
        for (final age in ['-20', '20.5', '2O', '20 years', '#20']) {
          expect(
            VolunteerFieldRules.ageError(age),
            'Enter an age between 15 and 80',
            reason: age,
          );
        }
      },
    );
  });

  _cases.unit('Register (Contact Information)', () {
    _cases.test(
      'User enters an incomplete or non-mobile phone number',
      expected:
          'The account will not be registered; the form shows "Enter an '
          '11-digit PH mobile number (09XXXXXXXXX)"',
      () {
        expect(isValidPhilippinePhone('09171234567'), isTrue);
        expect(isValidPhilippinePhone('+63 917 123 4567'), isTrue);
        expect(isValidPhilippinePhone('0917123456'), isFalse);
        expect(isValidPhilippinePhone('08171234567'), isFalse);
        expect(isValidPhilippinePhone('+6391712345678'), isFalse);
        expect(
          philippinePhoneError('0917'),
          'Enter an 11-digit PH mobile number (09XXXXXXXXX)',
        );
        // An empty field is reported as required elsewhere, not as malformed.
        expect(philippinePhoneError(''), isNull);
      },
    );

    _cases.test(
      'User leaves the phone number blank or invalid',
      expected:
          'The account will not be registered; no volunteer type can continue',
      () {
        for (final entry in _everyType().entries) {
          for (final phone in ['', '0917', '08171234567', 'call me']) {
            final details = entry.value.copyWith(phoneNumber: phone);
            expect(
              VolunteerDetailsRules.contactInfoValid(details),
              isFalse,
              reason: '${entry.key.name}: "$phone"',
            );
            expect(
              _detailsComplete(details, entry.key),
              isFalse,
              reason: '${entry.key.name}: "$phone"',
            );
          }
        }
      },
    );

    _cases.test(
      'User types the phone number in the local form with spaces or dashes',
      expected: 'It is sent in the one stored shape, +639XXXXXXXXX',
      () {
        for (final phone in [
          '0917 123 4567',
          '0917-123-4567',
          '639171234567',
        ]) {
          expect(
            registerPayload(
              _student().copyWith(phoneNumber: phone),
            )['phone_number'],
            '+639171234567',
            reason: phone,
          );
        }
      },
    );

    _cases.test(
      'User registers with a phone number that is already registered',
      expected:
          'The account will not be registered; the conflict points back to '
          'the phone number field (409)',
      () async {
        final conflict = await _conflictOn(
          'phone_number',
          'This phone number is already registered',
        );

        expect(conflict?.field, RegistrationConflictField.phoneNumber);
        expect(conflict?.message, 'This phone number is already registered');
      },
    );
  });

  _cases.unit('Register (Home Address)', () {
    _cases.test(
      'User does not input a proper house no. and street',
      expected:
          'The account will not be registered; the form shows the street '
          'error and the address stays incomplete',
      () {
        expect(PhAddress.streetError(''), 'Enter your house no. and street.');
        expect(PhAddress.streetError('  '), 'Enter your house no. and street.');
        expect(PhAddress.streetError('12'), 'Street is too short.');
        expect(
          PhAddress.streetError('123'),
          'Include the street name, not just a number.',
        );
        expect(PhAddress.streetError('123 A.C. Cortes Avenue'), isNull);

        expect(_homeAddress(street: '123').isComplete, isFalse);
        expect(_homeAddress(street: '123').formatted, '');
      },
    );

    _cases.test(
      'User types a street and picks a barangay and city from the list',
      expected:
          'The address is complete and sent as "Street, Barangay, City, '
          'Province"',
      () {
        final address = _homeAddress();

        expect(address.isComplete, isTrue);
        expect(
          address.formatted,
          '123 A.C. Cortes Avenue, Looc, Mandaue City, Cebu',
        );
        expect(
          registerPayload(
            _student().copyWith(currentAddress: address.formatted),
          )['current_address'],
          '123 A.C. Cortes Avenue, Looc, Mandaue City, Cebu',
        );
      },
    );

    _cases.test(
      'User picks a barangay that is not in the chosen city',
      expected:
          'The address stays incomplete; picking a barangay fills in its own '
          'city and changing the city drops the barangay',
      () {
        final looc = _homeAddress().barangay!;
        final cebuCity = PhAddressDirectory.localityNamed('Cebu City')!;
        final mismatched = PhAddress(
          street: '123 A.C. Cortes Avenue',
          barangay: looc,
          locality: cebuCity,
        );
        expect(mismatched.isComplete, isFalse);

        final picked = const PhAddress(
          street: '123 A.C. Cortes Avenue',
        ).withBarangay(looc);
        expect(picked.locality?.name, 'Mandaue City');
        expect(picked.isComplete, isTrue);

        final moved = picked.withLocality(cebuCity);
        expect(moved.barangay, isNull);
        expect(moved.isComplete, isFalse);
      },
    );

    _cases.test(
      'The address read off the ID has a barangay and city but no street',
      expected:
          'The barangay and city are pre-filled but the address stays '
          'incomplete until the street is typed in',
      () {
        final read = PhAddress.lenient('Brgy. Looc, Mandaue');

        expect(read.barangay?.name, 'Looc');
        expect(read.locality?.name, 'Mandaue City');
        expect(read.street, '');
        expect(read.isComplete, isFalse);
        expect(
          read.copyWith(street: '12 A.C. Cortes Avenue').isComplete,
          isTrue,
        );
      },
    );

    _cases.test(
      'User leaves the home address incomplete',
      expected:
          'The account will not be registered; no volunteer type can continue',
      () {
        for (final entry in _everyType().entries) {
          for (final address in ['', '   ', PhAddress.empty.formatted]) {
            final details = entry.value.copyWith(currentAddress: address);
            expect(
              VolunteerDetailsRules.homeAddressValid(details),
              isFalse,
              reason: '${entry.key.name}: "$address"',
            );
            expect(
              _detailsComplete(details, entry.key),
              isFalse,
              reason: '${entry.key.name}: "$address"',
            );
          }
        }
      },
    );

    _cases.test(
      'User types symbols that do not belong in an address into the street '
      '(@, !, *, ;, <, {)',
      expected:
          "The account will not be registered; the form shows \"Use letters, "
          "numbers and . , # ' - / ( ) & only.\" and the address stays "
          'incomplete',
      () {
        const invalid = [
          'Rizal St. @ Looc',
          '12 Rizal St!',
          '12 *Rizal* St.',
          '12 Rizal St; Looc',
          '12 Rizal St. <near church>',
          '12 {Rizal} St.',
        ];
        for (final street in invalid) {
          expect(
            PhAddress.streetError(street),
            _streetCharsError,
            reason: street,
          );
          final address = _homeAddress(street: street);
          expect(address.isComplete, isFalse, reason: street);
          expect(address.formatted, '', reason: street);
        }
      },
    );

    _cases.test(
      'User types script or SQL text into the street',
      expected:
          'The account will not be registered; the text is refused as an '
          'invalid street, so no address is sent for any volunteer type',
      () {
        const injected = [
          '<script>alert(1)</script>',
          "1 Main St'; DROP TABLE users;--",
          "12 Rizal St' OR '1'='1",
          r'12 ${street} Ave',
        ];
        for (final street in injected) {
          expect(
            PhAddress.streetError(street),
            _streetCharsError,
            reason: street,
          );

          // The form only writes a complete address, so nothing reaches the
          // details: every volunteer type stays on the step.
          final sent = _homeAddress(street: street).formatted;
          for (final entry in _everyType().entries) {
            expect(
              _detailsComplete(
                entry.value.copyWith(currentAddress: sent),
                entry.key,
              ),
              isFalse,
              reason: '${entry.key.name}: $street',
            );
          }
        }
      },
    );

    _cases.test(
      'User types only punctuation or a house number as the street (###, '
      '..., 12-34)',
      expected:
          'The account will not be registered; the form asks for the street '
          'name, not just a number',
      () {
        for (final street in ['###', '...', '12-34', '#123/45']) {
          expect(
            PhAddress.streetError(street),
            'Include the street name, not just a number.',
            reason: street,
          );
          expect(
            _homeAddress(street: street).isComplete,
            isFalse,
            reason: street,
          );
        }
      },
    );

    _cases.test(
      'User enters a street longer than 120 characters',
      expected:
          'The account will not be registered; the form shows "Street is too '
          'long."; exactly 120 is accepted',
      () {
        final tooLong = '12 ${'Rizal ' * 20}St.';
        expect(tooLong.length, greaterThan(PhAddress.maxStreetLength));
        expect(PhAddress.streetError(tooLong), 'Street is too long.');
        expect(_homeAddress(street: tooLong).isComplete, isFalse);

        final longest = '12 ${'R' * (PhAddress.maxStreetLength - 3)}';
        expect(longest.length, PhAddress.maxStreetLength);
        expect(PhAddress.streetError(longest), isNull);
      },
    );

    _cases.test(
      'User types a barangay or city that is not in the list, or a barangay '
      'from another city',
      expected:
          'Nothing is picked, so the address stays incomplete and is not sent',
      () {
        final mandaue = PhAddressDirectory.localityNamed('Mandaue City')!;

        expect(PhAddressDirectory.localityNamed('Atlantis City'), isNull);
        expect(PhAddressDirectory.localityLoosely('Gotham'), isNull);
        expect(
          PhAddressDirectory.barangayNamed('Fake Barangay', mandaue),
          isNull,
        );
        // Pajo is a Lapu-Lapu City barangay.
        expect(PhAddressDirectory.barangayNamed('Pajo', mandaue), isNull);

        final unpicked = PhAddress(
          street: '123 A.C. Cortes Avenue',
          barangay: PhAddressDirectory.barangayNamed('Fake Barangay', mandaue),
          locality: mandaue,
        );
        expect(unpicked.isComplete, isFalse);
        expect(unpicked.formatted, '');

        // A saved address naming an unknown barangay does not resolve.
        expect(
          PhAddress.parse('123 Rizal St., Fake, Mandaue City, Cebu').isComplete,
          isFalse,
        );
        expect(
          PhAddress.parse(
            '123 Rizal St., Looc, Atlantis City, Cebu',
          ).isComplete,
          isFalse,
        );
      },
    );

    _cases.test(
      'User types script or SQL text into the barangay or city search',
      expected:
          'No barangay or city matches it, so nothing can be picked and the '
          'address stays incomplete',
      () {
        final mandaue = PhAddressDirectory.localityNamed('Mandaue City')!;

        expect(
          PhAddressDirectory.barangayLoosely(
            "Looc'; DROP TABLE barangays;--",
            mandaue,
          ),
          isNull,
        );
        expect(
          PhAddressDirectory.localityLoosely('<script>Mandaue</script>'),
          isNull,
        );
        expect(
          PhAddressDirectory.searchBarangays("'; DROP TABLE users;--"),
          isEmpty,
        );
        expect(
          PhAddressDirectory.searchLocalities('<script>alert(1)</script>'),
          isEmpty,
        );

        final read = PhAddress.lenient(
          "12 Rizal St., Looc'; DROP TABLE barangays;--, Gotham",
        );
        expect(read.barangay, isNull);
        expect(read.locality, isNull);
        expect(read.isComplete, isFalse);
      },
    );

    _cases.test(
      'User types a street with the punctuation addresses use (#, /, &, '
      'commas, brackets)',
      expected:
          'The street is accepted and the address is sent and read back '
          'unchanged',
      () {
        const valid = [
          'Blk 5 Lot 3, Phase 2 (Ext.)',
          '#12 Rizal St. & 3rd Ave',
          "Unit 4/F, Ma'am Building",
          'Purok Santo Niño, Zone 1-A',
        ];
        for (final street in valid) {
          expect(PhAddress.streetError(street), isNull, reason: street);

          final address = _homeAddress(street: street);
          expect(address.isComplete, isTrue, reason: street);
          final readBack = PhAddress.parse(address.formatted);
          expect(readBack.street, street, reason: street);
          expect(readBack.barangay, address.barangay, reason: street);
        }
      },
    );
  });

  _cases.unit('Register (Supporting Document)', () {
    _cases.test(
      'User signs up as student, staff, alumni or partner barangay',
      expected:
          'Alumni (Certificate of Graduation) and partner barangay (supporting '
          'document) must attach one; student and staff do not',
      () {
        expect(
          VolunteerDetailsRules.requiresDocument(VolunteerType.student),
          isFalse,
        );
        expect(
          VolunteerDetailsRules.requiresDocument(VolunteerType.staff),
          isFalse,
        );
        expect(
          VolunteerDetailsRules.requiresDocument(VolunteerType.alumni),
          isTrue,
        );
        expect(
          VolunteerDetailsRules.requiresDocument(VolunteerType.partnerBarangay),
          isTrue,
        );
      },
    );

    _cases.test(
      'Alumni does not attach their Certificate of Graduation',
      expected:
          'The account will not be registered; the details step cannot '
          'continue until it is attached',
      () {
        expect(
          _detailsComplete(_alumni(), VolunteerType.alumni, hasDocument: false),
          isFalse,
        );
        expect(_detailsComplete(_alumni(), VolunteerType.alumni), isTrue);
      },
    );

    _cases.test(
      'Partner-barangay volunteer does not attach a supporting document',
      expected:
          'The account will not be registered; the details step cannot '
          'continue until it is attached',
      () {
        expect(
          _detailsComplete(
            _partner(),
            VolunteerType.partnerBarangay,
            hasDocument: false,
          ),
          isFalse,
        );
        expect(
          _detailsComplete(_partner(), VolunteerType.partnerBarangay),
          isTrue,
        );
      },
    );

    _cases.test(
      'User attaches a Certificate of Graduation (PDF)',
      expected:
          'The session id and the document are sent to POST '
          '/auth/registration-document as multipart; its name and size come '
          'back',
      () async {
        final rec = RequestRecorder();

        final result = await rec.service().uploadRegistrationDocument(
          registrationId: testRegistrationId,
          path: tempFile('certificate-of-graduation.pdf', '%PDF-1.7'),
          name: 'certificate-of-graduation.pdf',
        );

        expect(rec.last.method, 'POST');
        expect(rec.last.url.path, registrationDocumentPath);
        final parts = partsOf(rec.last);
        expect(parts['registrationId']!.content, testRegistrationId);
        expect(parts['document']!.filename, 'certificate-of-graduation.pdf');
        expect(parts['document']!.contentType, 'application/pdf');
        expect(parts['document']!.content, '%PDF-1.7');

        expect(result.registrationId, testRegistrationId);
        expect(result.sizeBytes, 48213);
      },
    );

    _cases.test(
      'User attaches a photo of a barangay certification',
      expected: 'The photo is sent with its image type',
      () async {
        final rec = RequestRecorder();

        await rec.service().uploadRegistrationDocument(
          registrationId: testRegistrationId,
          path: tempFile('barangay-certification.JPG'),
          name: 'barangay-certification.JPG',
        );

        expect(partsOf(rec.last)['document']!.contentType, 'image/jpeg');
      },
    );

    _cases.test(
      'User picks a document larger than the server accepts',
      expected: 'The limit is 10 MB, the same as the server',
      () {
        expect(kRegistrationDocumentMaxBytes, 10 * 1024 * 1024);
      },
    );

    _cases.test(
      'User attaches a document after the session expired',
      expected:
          'The account will not be registered; "Registration session '
          'expired. Please restart registration." is shown',
      () async {
        final rec = RequestRecorder(
          (_) async => failResponse(
            404,
            'Registration session expired. Please restart registration.',
          ),
        );

        await expectLater(
          rec.service().uploadRegistrationDocument(
            registrationId: 'reg_gone',
            path: tempFile('certificate.pdf'),
            name: 'certificate.pdf',
          ),
          throwsApiException(
            'Registration session expired. Please restart registration.',
            status: 404,
          ),
        );
      },
    );
  });

  _cases.unit('Register (Account Information)', () {
    _cases.test(
      'User fills in a valid email and password, confirms it and accepts the '
      'terms',
      expected: 'The Create Account step can continue',
      () {
        expect(_accountComplete(), isTrue);
      },
    );

    _cases.test(
      'User does not input an email, or one without "@" or a dot',
      expected:
          'The account will not be registered; the Create Account step '
          'cannot continue',
      () {
        for (final email in ['', 'maria.santos', 'maria@uclm', 'maria']) {
          expect(
            RegistrationAccountRules.emailValid(email),
            isFalse,
            reason: '"$email"',
          );
          expect(_accountComplete(email: email), isFalse, reason: '"$email"');
        }
        expect(RegistrationAccountRules.emailValid(testEmail), isTrue);
      },
    );

    _cases.test(
      'User enters a password that misses the default password rules',
      expected:
          'The account will not be registered; the unmet rules are shown '
          '(8+ characters, upper & lower case, a number)',
      () {
        expect(_unmet(''), ['8+ characters', 'Upper & lower case', 'A number']);
        expect(_unmet('Sec#1'), ['8+ characters']);
        expect(_unmet('secret#123'), ['Upper & lower case']);
        expect(_unmet('Secret#abc'), ['A number']);
        expect(_unmet(testPassword), isEmpty);

        for (final password in ['Sec#1', 'secret#123', 'Secret#abc']) {
          expect(
            _accountComplete(password: password),
            isFalse,
            reason: password,
          );
        }
      },
    );

    _cases.test(
      'The administrator requires 12 characters and a symbol',
      expected:
          'A password that met the default rules is refused until it is long '
          'enough and has a symbol',
      () {
        const strict = PasswordPolicy(
          minLength: 12,
          requireUppercase: true,
          requireLowercase: true,
          requireNumber: true,
          requireSymbol: true,
        );

        expect(_unmet(testPassword, strict), ['12+ characters']);
        expect(_unmet('Secret123456', strict), ['A symbol']);
        expect(_unmet('Secret#12345', strict), isEmpty);
        expect(_accountComplete(policy: strict), isFalse);
        expect(
          _accountComplete(password: 'Secret#12345', policy: strict),
          isTrue,
        );
      },
    );

    _cases.test(
      'User leaves Confirm Password blank or types a different password',
      expected:
          'The account will not be registered; the Create Account step '
          'cannot continue',
      () {
        expect(
          RegistrationAccountRules.passwordsMatch(testPassword, ''),
          isFalse,
        );
        expect(
          RegistrationAccountRules.passwordsMatch(testPassword, 'Secret#124'),
          isFalse,
        );
        expect(
          RegistrationAccountRules.passwordsMatch(testPassword, testPassword),
          isTrue,
        );
        expect(_accountComplete(confirmPassword: ''), isFalse);
        expect(_accountComplete(confirmPassword: 'secret#123'), isFalse);
      },
    );

    _cases.test(
      'User does not accept the CARES terms',
      expected:
          'The account will not be registered; the Create Account step '
          'cannot continue',
      () {
        expect(_accountComplete(acceptedTerms: false), isFalse);
      },
    );

    _cases.test(
      'User types a password with spaces and symbols',
      expected: 'The password is sent exactly as typed (not trimmed)',
      () {
        final body = registerPayload(
          RegisterOcrSample.sample,
          password: ' spaced #Pass1 ',
        );

        expect(body['account'], {
          'email': testEmail,
          'password': ' spaced #Pass1 ',
        });
      },
    );

    _cases.test(
      'User registers with an email that is already registered',
      expected:
          'The account will not be registered; the conflict points back to '
          'the email field (409)',
      () async {
        final conflict = await _conflictOn(
          'email',
          'This email is already registered',
        );

        expect(conflict?.field, RegistrationConflictField.email);
        expect(conflict?.message, 'This email is already registered');
      },
    );
  });

  _cases.unit('Register (Account Creation)', () {
    _cases.test(
      'User submits the reviewed volunteer details',
      expected:
          'POST /auth/register-from-session receives the exact payload the '
          'server CreateUserSchema expects',
      () async {
        final rec = RequestRecorder();

        await _register(rec);

        expect(rec.last.method, 'POST');
        expect(rec.last.url.path, registerFromSessionPath);
        expect(rec.body, {
          'registrationId': testRegistrationId,
          'firstname': 'Maria',
          'lastname': 'Santos',
          'middle_name': 'L.',
          'role_type': 'VOLUNTEER',
          'gender': 'FEMALE',
          'age': 20,
          'current_address': 'Looc, Mandaue City, Cebu',
          'phone_number': '+639171234567',
          'account': {'email': testEmail, 'password': testPassword},
          'school_info': {
            'id_number': '24217447',
            'graduation_year': 2027,
            // Only the year is collected, so month/day fall back to 1.
            'graduation_month': 1,
            'graduation_day': 1,
            'department': {'name': 'College of Teacher Education'},
            // No major read off the card — the department stands in for it.
            'major': {'name': 'College of Teacher Education'},
            'year_level': {'name': '3rd Year'},
          },
        });
      },
    );

    _cases.test(
      'The server creates the account',
      expected:
          'The account is registered and its user and account ids are '
          'returned',
      () async {
        final rec = RequestRecorder();

        final result = await _register(rec);

        expect(result['user_id'], 'usr_123');
        expect(result['account_id'], 'acc_456');
      },
    );

    _cases.test(
      'The server accepts the account but sends no data back',
      expected: 'An empty result is returned instead of an error',
      () async {
        final rec = RequestRecorder(
          (_) async => jsonResponse(200, {'ok': true, 'message': 'Registered'}),
        );

        expect(await _register(rec), isEmpty);
      },
    );

    _cases.test(
      'User submits after the registration session expired',
      expected:
          'The account will not be registered; "Registration session '
          'expired. Please restart registration." is shown (410)',
      () async {
        final rec = RequestRecorder(
          (_) async => failResponse(
            410,
            'Registration session expired. Please restart registration.',
          ),
        );

        await expectLater(
          _register(rec, registrationId: 'reg_gone'),
          throwsApiException(
            'Registration session expired. Please restart registration.',
            status: 410,
          ),
        );
      },
    );
  });

  _cases.unit('Register (Full Process)', () {
    _cases.test(
      'User completes ID upload, face scan, ID review, email code and '
      'account creation',
      expected:
          'The account is registered with the reviewed details; every step '
          'rides on one session in order',
      () async {
        final rec = RequestRecorder();
        final service = rec.service();

        final upload = await service.uploadId(
          front: tempImage('front.jpg', mimeType: 'image/jpeg'),
          back: tempImage('back.jpg', mimeType: 'image/jpeg'),
          roleType: RegistrationRoleType.volunteer.apiValue,
        );
        final face = await service.verifyFace(
          registrationId: upload.registrationId,
          selfie: tempImage('selfie.jpg', mimeType: 'image/jpeg'),
        );
        expect(face.match, isTrue);

        final extracted = await service.extractId(
          registrationId: upload.registrationId,
        );
        // The user fixes a misread field on the review step.
        final reviewed = extracted.ocrData.copyWith(
          currentAddress: 'Basak, Mandaue City, Cebu',
        );

        final sent = await service.sendVerificationCode(
          email: testEmail,
          phoneNumber: reviewed.phoneNumber,
          idNumber: reviewed.idNumber,
        );
        expect(sent.sent, isTrue);

        await service.verifyOtp(email: testEmail, otp: '123456');
        final account = await service.registerFromSession(
          registrationId: upload.registrationId,
          ocrData: reviewed,
          roleType: RegistrationRoleType.volunteer.apiValue,
          email: testEmail,
          password: testPassword,
        );

        expect(rec.paths, [
          uploadIdPath,
          verifyFacePath,
          extractIdPath,
          sendVerificationPath,
          verifyOtpPath,
          registerFromSessionPath,
        ]);

        expect(
          partsOf(rec.to(verifyFacePath))['registrationId']!.content,
          testRegistrationId,
        );
        expect(
          rec.jsonOf(rec.to(extractIdPath))['registrationId'],
          testRegistrationId,
        );

        // Clashes are checked before any code is mailed.
        expect(rec.jsonOf(rec.to(sendVerificationPath)), {
          'email': testEmail,
          'phone_number': '+639171234567',
          'id_number': '24217447',
          'purpose': 'registration',
        });

        final register = rec.jsonOf(rec.to(registerFromSessionPath));
        expect(register['registrationId'], testRegistrationId);
        expect(register['role_type'], 'VOLUNTEER');
        // The reviewed value is what gets saved, not the raw OCR read.
        expect(register['current_address'], 'Basak, Mandaue City, Cebu');
        expect(account['user_id'], 'usr_123');
      },
    );

    _cases.test(
      'No face is detected during the face scan',
      expected:
          'The account will not be registered; the process stops after the '
          'face scan with "No face detected. Try again in better light."',
      () async {
        final rec = RequestRecorder((request) async {
          if (request.url.path == verifyFacePath) {
            return failResponse(
              422,
              'No face detected. Try again in better light.',
            );
          }
          return defaultReply(request);
        });
        final service = rec.service();

        final upload = await service.uploadId(
          front: tempImage('front.jpg'),
          back: tempImage('back.jpg'),
          roleType: 'VOLUNTEER',
        );

        await expectLater(
          service.verifyFace(
            registrationId: upload.registrationId,
            selfie: tempImage('selfie.jpg'),
          ),
          throwsApiException('No face detected. Try again in better light.'),
        );
        expect(rec.paths, [uploadIdPath, verifyFacePath]);
      },
    );
  });
}
