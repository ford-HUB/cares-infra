/**
 * Control characters other than tab and line breaks. Free-text fields sent as
 * multipart form data have every line break encoded as CRLF, so `\r` and `\n`
 * stay allowed.
 */
export const CONTROL_CHARACTER_PATTERN =
  // eslint-disable-next-line no-control-regex -- matching control characters is the point
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;
