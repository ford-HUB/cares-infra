import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/features/auth/domain/register_ocr_raw_parser.dart';

// Mirrors microservices/ocr-service/scripts/test_student_id.py so the
// on-device fallback reads the student ID the same way the OCR service does.
void main() {
  const uclmBack =
      'IN CASE OF EMERGENCY, PLEASE NOTIFY\n'
      'NAME : MARY CRIS B. PESQUERA\n'
      'ADDRESS : DECA HOMES 4, BANKAL, LLC\n'
      'TEL. NO. : 09435291030\n'
      "STUDENT'S BIRTHDATE : 10/28/2004\n"
      'SCH. YR. 1ST SEM. 2ND SEM. SUMMER\n'
      '2023-2024\n'
      '2024-2025\n'
      '2026-2027\n'
      'NON-TRANSFERABLE\n';

  String idOf(String front, [String back = '']) =>
      RegisterOcrRawParser.parse(front, back).idNumber;

  final cases = <(String, String, String, String)>[
    (
      'number above label',
      'UNIVERSITY OF CEBU\n24247447\nID NO ____\nNAME\nBEA B. PESQUERA',
      '',
      '24247447',
    ),
    (
      'number merged on label',
      'ID NO 24247447 ________\nNAME BEA B. PESQUERA',
      '',
      '24247447',
    ),
    ('number below label', 'ID NO: ______\n24247447\nNAME', '', '24247447'),
    ('OCR letter noise', '2424744B\nlD NO ____', '', '24247448'),
    ('O read for zero', '23O62216\nID NO', '', '23062216'),
    ('hyphenated', 'ID NO. 24-247447', '', '24247447'),
    (
      'no label (real capture)',
      "_ ~ 23262216 '\n' NAME |\n, CRIS DYFORD C. BONGHANOY",
      '',
      '23262216',
    ),
    ('front wins over back', '24247447\nID NO', uclmBack, '24247447'),
    ('back only: no school year/phone/date', '', uclmBack, ''),
    ('unreadable front + back', 'st 7 . f » |\na. | "WS', uclmBack, ''),
    ('phone on front ignored', 'TEL 09435291030\n24247447', '', '24247447'),
    ('back ID-like number ignored', '', 'ID NO 24247447\n$uclmBack', ''),
    ('school year on front ignored', 'SY 2024-2025\n24247447', '', '24247447'),
    ('9 digits rejected', 'ID NO 242474471', '', ''),
    ('7 digits rejected', 'ID NO 2424744', '', ''),
  ];

  group('student ID extraction', () {
    for (final (name, front, back, expected) in cases) {
      test(name, () => expect(idOf(front, back), expected));
    }
  });

  // The cardholder's name is only on the front; the back holds the emergency
  // contact and the president's signature line.
  (String, String, String) nameOf(String front, [String back = '']) {
    final parsed = RegisterOcrRawParser.parse(front, back);
    return (parsed.firstname, parsed.middleName, parsed.lastname);
  }

  const presidentBack = '$uclmBack\nATTY AUG STOW GO\nPRESIDENT';

  final nameCases = <(String, String, String, (String, String, String))>[
    (
      'name under label',
      'UNIVERSITY OF CEBU\n24250698\nID NO\nNAME\nJAY S. ICOY\nSIGNATURE',
      presidentBack,
      ('JAY', 'S.', 'ICOY'),
    ),
    (
      'initial glued to surname',
      '24250698\nNAME _ .\n- JAY S.ICOY',
      '',
      ('JAY', 'S.', 'ICOY'),
    ),
    (
      'initial glued to both names',
      'NAME , ; :\n_ JAYS.ICOY _ .',
      '',
      ('JAY', 'S.', 'ICOY'),
    ),
    (
      'junk after label and name',
      'NAME i .\n- JAYS.ICOY  .;\nSIG NATURE .',
      '',
      ('JAY', 'S.', 'ICOY'),
    ),
    (
      'unlabelled name line',
      '24250698\n| JAYS.ICOY .\nSIG NATURE .',
      '',
      ('JAY', 'S.', 'ICOY'),
    ),
    (
      'course strip is not a name',
      '24250698\nID NO\nINFORMATION TECHNOLOGY',
      '',
      ('', '', ''),
    ),
    (
      'back is never read',
      '24250698\nID NO',
      presidentBack,
      ('', '', ''),
    ),
  ];

  group('cardholder name extraction', () {
    for (final (name, front, back, expected) in nameCases) {
      test(name, () => expect(nameOf(front, back), expected));
    }
  });
}
