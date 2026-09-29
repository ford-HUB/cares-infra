/// Volunteer event shown in dashboard carousels and program listings.
class VolunteerEvent {
  const VolunteerEvent({
    required this.id,
    required this.title,
    required this.category,
    required this.date,
    required this.location,
    required this.imageUrl,
    this.description,
    this.spotsLeft,
    this.hours,
  });

  final String id;
  final String title;
  final String category;
  final String date;
  final String location;
  final String imageUrl;
  final String? description;
  final int? spotsLeft;
  final int? hours;
}
