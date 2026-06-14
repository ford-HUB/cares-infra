import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/features/auth/domain/register_ocr_raw_parser.dart';
import 'package:mobile/features/auth/domain/register_ocr_sample.dart';

void main() {
  const rawFront = """st 7 . f » |
' NAME |
. CRIS DYFORD C. BONGHANOY
_ ~ 23262216 '""";

  const rawBack = r"""IN CASE OF EMERGENCY PLEASE NOTIFY
, [ib a HOME 4 RAMA .
et vor k | 4UI2BI2004 - =""";

  test('parses name and address from noisy OCR text', () {
    final parsed = RegisterOcrRawParser.parse(rawFront, rawBack);

    expect(parsed.firstname, 'CRIS');
    expect(parsed.lastname, 'BONGHANOY');
    expect(parsed.middleName, 'DYFORD C.');
    expect(parsed.currentAddress, 'HOME 4 RAMA');
    expect(parsed.idNumber, '23262216');
  });

  test('parses name when NAME label uses curly quotes', () {
    const rawFront = """
\u2018 NAME |
. CRIS DYFORD C. BONGHANOY""";

    final parsed = RegisterOcrRawParser.parse(rawFront, '');
    expect(parsed.firstname, 'CRIS');
    expect(parsed.lastname, 'BONGHANOY');
  });

  test('parses full DECA HOMES address with commas', () {
    const rawBack = 'a ADDRESS. DECA HOMES 4, BANKAL, LLC\n'
        'TEL NO. 09435291030';

    final parsed = RegisterOcrRawParser.parse('', rawBack);
    expect(parsed.currentAddress, 'DECA HOMES 4, BANKAL, LLC');
  });

  test('prefers longer parsed address over partial server value', () {
    const rawBack = 'ADDRESS.\nDECA HOMES 4, BANKAL, LLC';
    final sample = RegisterOcrSample(
      firstname: '',
      lastname: '',
      middleName: '',
      gender: '',
      age: 0,
      currentAddress: 'HOMES 4',
      phoneNumber: '',
      idNumber: '',
      departmentName: '',
      majorName: '',
      yearLevelName: '',
      graduationYear: 0,
      graduationMonth: 0,
      graduationDay: 0,
      volunteerType: 'STUDENT',
      rawTextFront: '',
      rawTextBack: rawBack,
    );

    final enriched = sample.enrichFromRawText();
    expect(enriched.currentAddress, 'DECA HOMES 4, BANKAL, LLC');
  });

  test('enrichFromRawText backfills empty structured fields', () {
    final sample = RegisterOcrSample(
      firstname: '',
      lastname: '',
      middleName: '',
      gender: '',
      age: 0,
      currentAddress: 'HOME 4 RAMA',
      phoneNumber: '',
      idNumber: '',
      departmentName: '',
      majorName: '',
      yearLevelName: '',
      graduationYear: 0,
      graduationMonth: 0,
      graduationDay: 0,
      volunteerType: 'STUDENT',
      rawTextFront: rawFront,
      rawTextBack: rawBack,
    );

    final enriched = sample.enrichFromRawText();

    expect(enriched.firstname, 'CRIS');
    expect(enriched.lastname, 'BONGHANOY');
    expect(enriched.idNumber, '23262216');
    expect(enriched.currentAddress, 'HOME 4 RAMA');
  });
}
