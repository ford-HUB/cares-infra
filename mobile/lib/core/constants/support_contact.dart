/// Same inbox as the server's `DEFAULT_SUPPORT_EMAIL`.
abstract final class SupportContact {
  static const String email = 'careeesadmin@gmail.com';

  static const String emailSubject = 'CARES App Support Request';

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

  /// Percent-encoded by hand: `Uri.queryParameters` encodes spaces as `+`,
  /// which mail apps show literally.
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
