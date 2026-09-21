/// Peso and date formatting shared by every donor screen.
abstract final class DonationFormat {
  static const _months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];

  /// `₱1.3k` / `₱12k` / `₱850` — for stat tiles and rank rows.
  static String peso(int amount) {
    if (amount >= 1000) {
      final thousands = amount / 1000;
      final formatted = thousands >= 10
          ? thousands.toStringAsFixed(0)
          : thousands.toStringAsFixed(1);
      return '₱${formatted}k';
    }
    return '₱$amount';
  }

  /// `₱12,500` — for receipts and summaries.
  static String pesoFull(int amount) {
    final formatted = amount.toString().replaceAllMapped(
      RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
      (match) => '${match[1]},',
    );
    return '₱$formatted';
  }

  /// `Oct 12, 2026`.
  static String dateOnly(DateTime date) =>
      '${_months[date.month - 1]} ${date.day}, ${date.year}';

  /// `Oct 12, 2026 · 9:30 AM`.
  static String dateTime(DateTime date) =>
      '${dateOnly(date)} · ${minutes(date.hour * 60 + date.minute)}';

  /// Minutes since midnight → `9:30 AM`.
  static String minutes(int minutesSinceMidnight) {
    final hour = minutesSinceMidnight ~/ 60;
    final minute = minutesSinceMidnight % 60;
    final hour12 = hour % 12 == 0 ? 12 : hour % 12;
    final period = hour < 12 ? 'AM' : 'PM';
    return '$hour12:${minute.toString().padLeft(2, '0')} $period';
  }

  /// `2026-10-12` — the wire form of a pickup date.
  static String isoDate(DateTime date) =>
      '${date.year.toString().padLeft(4, '0')}-'
      '${date.month.toString().padLeft(2, '0')}-'
      '${date.day.toString().padLeft(2, '0')}';
}
