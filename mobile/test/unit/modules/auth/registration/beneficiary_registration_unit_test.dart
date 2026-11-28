// UNIT TESTING — Process Registration, beneficiary side (REG-BEN-###);
// `dart run tool/unit_case_report.dart <this file>` prints the table. OTP is
// covered in email_verification/, the student ID path in
// student_beneficiary_and_unclear_id_unit_test.dart; shared fixtures are in
// registration_test_support.dart.

import 'package:flutter_test/flutter_test.dart' hide test;
import 'package:mobile/core/services/api_client.dart';
import 'package:mobile/core/utils/phone_number_format.dart';
import 'package:mobile/features/auth/data/models/registration_api_models.dart';
import 'package:mobile/features/auth/domain/beneficiary_profile.dart';
import 'package:mobile/features/auth/domain/ph_address.dart';
import 'package:mobile/features/auth/domain/register_ocr_sample.dart';
import 'package:mobile/features/auth/domain/registration_role_type.dart';

import '../../../../config/test_case.dart';
import 'registration_test_support.dart';

final _cases = TestCases(module: 'Process Registration', prefix: 'REG-BEN');

const _beneficiaryEmail = 'ana.reyes@example.com';

RegisterOcrSample _beneficiaryDetails() =>
    RegisterOcrSample.empty(volunteerType: 'STUDENT').copyWith(
      firstname: 'Ana',
      lastname: 'Reyes',
      gender: 'female',
      age: 54,
      currentAddress: 'Pajo, Lapu-Lapu City, Cebu',
      phoneNumber: '0918 765 4321',
    );

PhAddress _homeAddress({String street = '123 Rizal St.'}) {
  final city = PhAddressDirectory.localityNamed('Lapu-Lapu City')!;
  return PhAddress(
    street: street,
    barangay: PhAddressDirectory.barangayNamed('Pajo', city),
    locality: city,
  );
}

const _organization = BeneficiaryProfile(
  kind: BeneficiaryKind.organization,
  organizationName: 'Pajo Senior Citizens Association',
  organizationType: "People's Organization",
  organizationRole: 'Treasurer',
  organizationAddress: 'Pajo, Lapu-Lapu City, Cebu',
);

Future<Map<String, dynamic>> _register(RequestRecorder rec) =>
    rec.service().registerFromSession(
      registrationId: testRegistrationId,
      ocrData: _beneficiaryDetails(),
      roleType: RegistrationRoleType.beneficiary.apiValue,
      email: _beneficiaryEmail,
      password: testPassword,
    );

void main() {
  setUpRegistrationTests();

  _cases.unit('Register (Beneficiary Type)', () {
    _cases.test(
      'User registers as a beneficiary',
      expected: 'The role is sent to the server as BENEFICIARY',
      () {
        expect(RegistrationRoleType.beneficiary.apiValue, 'BENEFICIARY');
      },
    );

    _cases.test(
      'User leaves the first name field empty',
      expected: 'The first name is rejected because it is required',
      () {
        final details = RegisterOcrSample.sample.copyWith(firstname: '');

        expect(details.firstname.trim().isEmpty, isTrue);
      },
    );

    _cases.test(
      'User enters a first name',
      expected: 'The entered first name is accepted',
      () {
        final details = RegisterOcrSample.sample.copyWith(firstname: 'Maria');

        expect(details.firstname.trim().isNotEmpty, isTrue);
      },
    );

    _cases.test(
      'User leaves the last name field empty',
      expected: 'The last name is rejected because it is required',
      () {
        final details = RegisterOcrSample.sample.copyWith(lastname: '');

        expect(details.lastname.trim().isEmpty, isTrue);
      },
    );

    _cases.test(
      'User enters a last name',
      expected: 'The entered last name is accepted',
      () {
        final details = RegisterOcrSample.sample.copyWith(lastname: 'Santos');

        expect(details.lastname.trim().isNotEmpty, isTrue);
      },
    );

    _cases.test(
      'Beneficiary leaves the gender field empty',
      expected: 'The gender is rejected because it is required',
      () {
        final details = _beneficiaryDetails().copyWith(gender: '');

        expect(details.gender.trim().isEmpty, isTrue);
      },
    );

    _cases.test(
      'Beneficiary leaves the age field empty or imaginary or invalid age',
      expected: 'The age is rejected because it is required',
      () {
        final details = _beneficiaryDetails().copyWith(age: 0);

        expect(details.age, 0);
      },
    );

    _cases.test(
      'Beneficiary leaves the phone number field empty',
      expected: 'The phone number is rejected because it is required',
      () {
        final details = _beneficiaryDetails().copyWith(phoneNumber: '');

        expect(details.phoneNumber.trim().isEmpty, isTrue);
      },
    );

    _cases.test(
      'User does not choose Individual or Organization',
      expected:
          'The account will not be registered; the details step cannot '
          'continue',
      () {
        const profile = BeneficiaryProfile();

        expect(profile.kind, isNull);
        expect(profile.isIndividual, isFalse);
        expect(profile.isOrganization, isFalse);
        expect(profile.isComplete, isFalse);
      },
    );

    _cases.test(
      'Individual does not choose Regular or Student',
      expected:
          'The account will not be registered until Regular or Student is '
          'picked; either one completes the step',
      () {
        const individual = BeneficiaryProfile(kind: BeneficiaryKind.individual);

        expect(individual.isComplete, isFalse);
        for (final category in BeneficiaryCategory.values) {
          expect(
            individual.copyWith(category: category).isComplete,
            isTrue,
            reason: category.name,
          );
        }
        // An individual needs none of the organization fields.
        expect(individual.organizationDetailsComplete, isFalse);
      },
    );

    _cases.test(
      'User picks Student as an individual, Regular, or Student as an '
      'organization',
      expected:
          'Only an individual Student takes the ID + face scan path; the '
          'others type their details in',
      () {
        expect(
          const BeneficiaryProfile(
            kind: BeneficiaryKind.individual,
            category: BeneficiaryCategory.student,
          ).isStudent,
          isTrue,
        );
        expect(
          const BeneficiaryProfile(
            kind: BeneficiaryKind.individual,
            category: BeneficiaryCategory.regular,
          ).isStudent,
          isFalse,
        );
        expect(
          const BeneficiaryProfile(
            kind: BeneficiaryKind.organization,
            category: BeneficiaryCategory.student,
          ).isStudent,
          isFalse,
        );
      },
    );

    _cases.test(
      'User switches between Organization and Individual',
      expected:
          'The answers of the other kind are cleared; the home address is '
          'kept',
      () {
        final address = _homeAddress();
        final organization = _organization.copyWith(address: address);

        final individual = organization.asIndividual();
        expect(individual.kind, BeneficiaryKind.individual);
        expect(individual.organizationName, '');
        expect(individual.organizationType, isNull);
        expect(individual.organizationRole, '');
        expect(individual.organizationAddress, '');
        expect(individual.address, same(address));

        final student = individual.copyWith(
          category: BeneficiaryCategory.student,
        );
        final back = student.asOrganization();
        expect(back.kind, BeneficiaryKind.organization);
        expect(back.category, isNull);
        expect(back.address, same(address));
      },
    );
  });

  _cases.unit('Register (Session)', () {
    _cases.test(
      'Beneficiary starts registration without an ID card',
      expected:
          'POST /auth/start-session is sent with roleType BENEFICIARY and a '
          'session is returned',
      () async {
        final rec = RequestRecorder();

        final result = await rec.service().startSession(
          roleType: RegistrationRoleType.beneficiary.apiValue,
        );

        expect(rec.last.method, 'POST');
        expect(rec.last.url.toString(), '$testOrigin$startSessionPath');
        expect(
          rec.last.headers['Content-Type'],
          startsWith('application/json'),
        );
        expect(rec.body, {'roleType': 'BENEFICIARY'});
        expect(result.registrationId, testRegistrationId);
        expect(result.step, 'session_started');
      },
    );

    _cases.test(
      'The server starts the session but leaves out the step',
      expected: 'The step defaults to session_started',
      () async {
        final rec = RequestRecorder(
          (_) async => okResponse({'registrationId': testRegistrationId}),
        );

        final result = await rec.service().startSession(
          roleType: 'BENEFICIARY',
        );

        expect(result.step, 'session_started');
      },
    );

    _cases.test(
      'Registration is temporarily unavailable on the server',
      expected:
          'The account will not be registered; the server message is shown '
          '(503)',
      () async {
        final rec = RequestRecorder(
          (_) async =>
              failResponse(503, 'Registration is temporarily unavailable'),
        );

        await expectLater(
          rec.service().startSession(roleType: 'BENEFICIARY'),
          throwsApiException(
            'Registration is temporarily unavailable',
            status: 503,
          ),
        );
      },
    );
  });

  _cases.unit('Register (Supporting Document)', () {
    _cases.test(
      'User attaches a barangay certificate (PDF)',
      expected:
          'The session id and the document are sent to POST '
          '/auth/registration-document as multipart; its name and size come '
          'back',
      () async {
        final rec = RequestRecorder();

        final result = await rec.service().uploadRegistrationDocument(
          registrationId: testRegistrationId,
          path: tempFile('barangay-certificate.pdf', '%PDF-1.7'),
          name: 'barangay-certificate.pdf',
        );

        expect(rec.last.url.path, registrationDocumentPath);
        final parts = partsOf(rec.last);
        expect(parts['registrationId']!.content, testRegistrationId);
        expect(parts['document']!.filename, 'barangay-certificate.pdf');
        expect(parts['document']!.contentType, 'application/pdf');
        expect(parts['document']!.content, '%PDF-1.7');

        expect(result.registrationId, testRegistrationId);
        expect(result.name, 'barangay-certificate.pdf');
        expect(result.sizeBytes, 48213);
      },
    );

    _cases.test(
      'User attaches an image, Word, Excel, text, zip or extension-less file',
      expected:
          'Known types are labelled so the portal can preview them; anything '
          'else is sent as application/octet-stream',
      () async {
        final cases = {
          'proof.JPEG': 'image/jpeg',
          'proof.png': 'image/png',
          'letter.docx':
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'income.xlsx':
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'notes.txt': 'text/plain',
          'archive.zip': 'application/octet-stream',
          'no-extension': 'application/octet-stream',
        };

        for (final entry in cases.entries) {
          final rec = RequestRecorder();
          await rec.service().uploadRegistrationDocument(
            registrationId: testRegistrationId,
            path: tempFile(entry.key),
            name: entry.key,
          );
          expect(
            partsOf(rec.last)['document']!.contentType,
            entry.value,
            reason: entry.key,
          );
        }
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
            path: tempFile('proof.pdf'),
            name: 'proof.pdf',
          ),
          throwsApiException(
            'Registration session expired. Please restart registration.',
          ),
        );
      },
    );
  });

  _cases.unit('Register (Organization Details)', () {
    _cases.test(
      'Organization does not input its name, type, role or address',
      expected:
          'The account will not be registered until all four are filled in',
      () {
        expect(_organization.isComplete, isTrue);
        expect(_organization.organizationDetailsComplete, isTrue);

        final missing = {
          'name': _organization.copyWith(organizationName: ''),
          'type': const BeneficiaryProfile(
            kind: BeneficiaryKind.organization,
            organizationName: 'Pajo Senior Citizens Association',
            organizationRole: 'Treasurer',
            organizationAddress: 'Pajo, Lapu-Lapu City, Cebu',
          ),
          'empty type': _organization.copyWith(organizationType: ''),
          'role': _organization.copyWith(organizationRole: ''),
          'address': _organization.copyWith(organizationAddress: ''),
        };
        for (final entry in missing.entries) {
          expect(entry.value.isComplete, isFalse, reason: entry.key);
        }
      },
    );

    _cases.test(
      'Organization fills its fields with spaces only',
      expected:
          'The account will not be registered; blank text does not '
          'count as filled in',
      () {
        final blank = _organization.copyWith(
          organizationName: '   ',
          organizationRole: '\t',
          organizationAddress: ' \n ',
        );

        expect(blank.organizationDetailsComplete, isFalse);
        expect(blank.isComplete, isFalse);
      },
    );
  });

  _cases.unit('Register (Personal Details)', () {
    _cases.test(
      'User does not input a proper street, or picks a barangay outside the '
      'chosen city',
      expected:
          'The account will not be registered; the street error is shown and '
          'the address stays incomplete',
      () {
        expect(_homeAddress().isComplete, isTrue);
        expect(
          _homeAddress().formatted,
          '123 Rizal St., Pajo, Lapu-Lapu City, Cebu',
        );

        expect(PhAddress.empty.isComplete, isFalse);
        expect(PhAddress.empty.formatted, '');

        expect(PhAddress.streetError(''), 'Enter your house no. and street.');
        expect(PhAddress.streetError('12'), 'Street is too short.');
        expect(
          PhAddress.streetError('123'),
          'Include the street name, not just a number.',
        );
        expect(PhAddress.streetError('123 Rizal St.'), isNull);
        expect(_homeAddress(street: '123').isComplete, isFalse);

        final mandaue = PhAddressDirectory.localityNamed('Mandaue City')!;
        final mismatched = PhAddress(
          street: '123 Rizal St.',
          barangay: _homeAddress().barangay,
          locality: mandaue,
        );
        expect(mismatched.isComplete, isFalse);
      },
    );

    _cases.test(
      'User enters an incomplete or over-long phone number',
      expected:
          'The account will not be registered; the form shows "Enter an '
          '11-digit PH mobile number (09XXXXXXXXX)"',
      () {
        expect(isValidPhilippinePhone('0918 765 4321'), isTrue);
        expect(isValidPhilippinePhone('639187654321'), isTrue);
        expect(isValidPhilippinePhone('0918765432'), isFalse);
        expect(isValidPhilippinePhone('+6391876543210'), isFalse);
        expect(
          philippinePhoneError('0918-765'),
          'Enter an 11-digit PH mobile number (09XXXXXXXXX)',
        );
        expect(philippinePhoneError('09187654321'), isNull);
      },
    );
  });

  _cases.unit('Register (Account Creation)', () {
    _cases.test(
      'Regular beneficiary submits their details',
      expected:
          'POST /auth/register-from-session receives role BENEFICIARY with '
          'placeholder school info and the account is registered',
      () async {
        final rec = RequestRecorder();

        final result = await _register(rec);

        expect(rec.last.method, 'POST');
        expect(rec.last.url.path, registerFromSessionPath);
        expect(rec.body['registrationId'], testRegistrationId);
        expect(rec.body['role_type'], 'BENEFICIARY');
        expect(rec.body['firstname'], 'Ana');
        expect(rec.body['lastname'], 'Reyes');
        expect(rec.body['gender'], 'FEMALE');
        expect(rec.body['age'], 54);
        expect(rec.body['phone_number'], '+639187654321');
        expect(rec.body['account'], {
          'email': _beneficiaryEmail,
          'password': testPassword,
        });
        expect(
          (rec.body['school_info'] as Map)['id_number'],
          'BEN-$testRegistrationId',
        );
        expect(rec.body.containsKey('partner_barangay'), isFalse);
        expect(result['user_id'], 'usr_123');
      },
    );

    _cases.test(
      'User registers with a phone number that is already registered',
      expected:
          'The account will not be registered; the conflict points back to '
          'the phone number field (409)',
      () async {
        final rec = RequestRecorder(
          (_) async =>
              failResponse(409, 'This phone number is already registered', [
                {
                  'path': 'phone_number',
                  'message': 'This phone number is already registered',
                },
              ]),
        );

        try {
          await _register(rec);
          fail('expected ApiException');
        } on ApiException catch (e) {
          final conflict = RegistrationConflict.fromException(e);
          expect(conflict?.field, RegistrationConflictField.phoneNumber);
          expect(conflict?.message, 'This phone number is already registered');
        }
      },
    );

    _cases.test(
      'Regular beneficiary has no school ID',
      expected:
          'Placeholder school info is sent, keyed BEN-<session>, with N/A '
          'department, major and year level',
      () {
        final body = registerPayload(
          _beneficiaryDetails(),
          roleType: 'BENEFICIARY',
        );

        expect(body['role_type'], 'BENEFICIARY');
        expect(body['phone_number'], '+639187654321');
        expect(body['school_info'], {
          'id_number': 'BEN-$testRegistrationId',
          'graduation_year': 2000,
          'graduation_month': 1,
          'graduation_day': 1,
          'department': {'name': 'N/A'},
          'major': {'name': 'N/A'},
          'year_level': {'name': 'N/A'},
        });
      },
    );

    _cases.test(
      'Student beneficiary registers with their UC ID',
      expected:
          'The school record read off the ID is sent (real ID number and '
          'department, no BEN- placeholder)',
      () {
        final student = RegisterOcrSample.sample.copyWith(
          volunteerType: 'STUDENT',
        );

        final body = registerPayload(
          student,
          roleType: 'BENEFICIARY',
          studentBeneficiary: true,
        );
        final school = body['school_info'] as Map<String, dynamic>;

        expect(body['role_type'], 'BENEFICIARY');
        expect(school['id_number'], student.registrationIdNumber);
        expect(school['id_number'], isNot(startsWith('BEN-')));
        expect(school['department'], {'name': student.departmentName});
        expect(school['department'], isNot({'name': 'N/A'}));
      },
    );
  });

  _cases.unit('Register (Full Process)', () {
    _cases.test(
      'User completes session, supporting document, email code and account '
      'creation',
      expected:
          'The account is registered on one session with no ID upload, face '
          'scan or ID number',
      () async {
        final rec = RequestRecorder();
        final service = rec.service();

        final session = await service.startSession(
          roleType: RegistrationRoleType.beneficiary.apiValue,
        );
        await service.uploadRegistrationDocument(
          registrationId: session.registrationId,
          path: tempFile('barangay-certificate.pdf', '%PDF-1.7'),
          name: 'barangay-certificate.pdf',
        );

        final details = _beneficiaryDetails();

        // The flow never sends an ID number for a beneficiary.
        await service.sendVerificationCode(
          email: _beneficiaryEmail,
          phoneNumber: details.phoneNumber,
        );
        await service.verifyOtp(email: _beneficiaryEmail, otp: '654321');
        await service.registerFromSession(
          registrationId: session.registrationId,
          ocrData: details,
          roleType: RegistrationRoleType.beneficiary.apiValue,
          email: _beneficiaryEmail,
          password: testPassword,
        );

        expect(rec.paths, [
          startSessionPath,
          registrationDocumentPath,
          sendVerificationPath,
          verifyOtpPath,
          registerFromSessionPath,
        ]);
        expect(rec.paths, isNot(contains(uploadIdPath)));
        expect(rec.paths, isNot(contains(verifyFacePath)));
        expect(rec.paths, isNot(contains(extractIdPath)));

        expect(
          partsOf(rec.to(registrationDocumentPath))['registrationId']!.content,
          testRegistrationId,
        );
        expect(
          rec.jsonOf(rec.to(sendVerificationPath)).containsKey('id_number'),
          isFalse,
        );

        final register = rec.jsonOf(rec.to(registerFromSessionPath));
        expect(register['role_type'], 'BENEFICIARY');
        expect(
          (register['school_info'] as Map)['id_number'],
          'BEN-$testRegistrationId',
        );
      },
    );

    _cases.test(
      'User attaches a supporting document larger than 10 MB',
      expected:
          'The account will not be registered; the process stops at the '
          'document with "The document is larger than 10 MB" (413)',
      () async {
        final rec = RequestRecorder((request) async {
          if (request.url.path == registrationDocumentPath) {
            return failResponse(413, 'The document is larger than 10 MB');
          }
          return defaultReply(request);
        });
        final service = rec.service();

        final session = await service.startSession(roleType: 'BENEFICIARY');

        await expectLater(
          service.uploadRegistrationDocument(
            registrationId: session.registrationId,
            path: tempFile('scan.pdf'),
            name: 'scan.pdf',
          ),
          throwsApiException('The document is larger than 10 MB', status: 413),
        );
        expect(rec.paths, [startSessionPath, registrationDocumentPath]);
      },
    );
  });
}
