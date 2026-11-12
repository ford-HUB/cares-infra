/// The CARES support inbox — the same Gmail address the server uses as its
/// support / access-request inbox (`DEFAULT_SUPPORT_EMAIL` in the users module).
abstract final class SupportContact {
  static const String email = 'careeesadmin@gmail.com';

  static const String emailSubject = 'CARES App Support Request';

  /// The pre-filled body: a fixed layout the support team can scan, with blanks
  /// for the user to fill in. [appVersion] and [platform] are filled by the app.
  static String emailBody({String? appVersion, String? platform}) => [
    'Hello CARES Support,',
    '',
    'Concern: ',
    '',
    'Details:',
    '',
    '',
    '— Account details —',
    'Full name: ',
    'Registered email: ',
    'Account type (Volunteer / Donor / Beneficiary): ',
    '',
    '— Device details —',
    'App version: ${appVersion ?? ''}',
    'Platform: ${platform ?? ''}',
    '',
    'Thank you.',
  ].join('\n');

  /// A `mailto:` link with the recipient, subject and body already set.
  ///
  /// The query is percent-encoded by hand: `Uri.queryParameters` encodes spaces
  /// as `+`, which most mail apps show literally instead of as spaces.
  static Uri mailtoUri({String? appVersion, String? platform}) {
    final params = {
      'subject': emailSubject,
      'body': emailBody(appVersion: appVersion, platform: platform),
    };
    return Uri(
      scheme: 'mailto',
      path: email,
      query: params.entries
          .map(
            (entry) =>
                '${Uri.encodeComponent(entry.key)}=${Uri.encodeComponent(entry.value)}',
          )
          .join('&'),
    );
  }
}
