import 'package:flutter/material.dart';

/// Review state of an uploaded verification document.
enum VerificationDocumentStatus { verified, pending, rejected, missing }

extension VerificationDocumentStatusX on VerificationDocumentStatus {
  String get label => switch (this) {
    VerificationDocumentStatus.verified => 'Verified',
    VerificationDocumentStatus.pending => 'Under Review',
    VerificationDocumentStatus.rejected => 'Rejected',
    VerificationDocumentStatus.missing => 'Not uploaded',
  };

  IconData get icon => switch (this) {
    VerificationDocumentStatus.verified => Icons.verified_rounded,
    VerificationDocumentStatus.pending => Icons.hourglass_top_rounded,
    VerificationDocumentStatus.rejected => Icons.error_outline_rounded,
    VerificationDocumentStatus.missing => Icons.upload_file_rounded,
  };
}

/// Whether the beneficiary may join events yet, derived from their documents.
enum BeneficiaryVerificationState { verified, underReview, rejected, none }

/// One identification / verification document on the beneficiary account.
class VerificationDocument {
  const VerificationDocument({
    required this.id,
    required this.label,
    required this.description,
    required this.status,
    this.fileName,
    this.rejectionReason,
    this.submittedOn,
  });

  final String id;
  final String label;
  final String description;
  final VerificationDocumentStatus status;
  final String? fileName;

  /// Reviewer's reason when [status] is rejected.
  final String? rejectionReason;
  final DateTime? submittedOn;

  VerificationDocument copyWith({
    VerificationDocumentStatus? status,
    String? fileName,
    String? rejectionReason,
    DateTime? submittedOn,
    bool clearRejectionReason = false,
  }) {
    return VerificationDocument(
      id: id,
      label: label,
      description: description,
      status: status ?? this.status,
      fileName: fileName ?? this.fileName,
      rejectionReason: clearRejectionReason
          ? null
          : rejectionReason ?? this.rejectionReason,
      submittedOn: submittedOn ?? this.submittedOn,
    );
  }
}

/// Personal and verification information shown on the beneficiary's
/// Edit Profile form — deliberately separate from assistance details.
class BeneficiaryPersonalProfile {
  const BeneficiaryPersonalProfile({
    required this.firstName,
    required this.lastName,
    required this.email,
    required this.contactNumber,
    required this.address,
    required this.dateOfBirth,
    required this.documents,
    this.photoLabel,
  });

  final String firstName;
  final String lastName;
  final String email;
  final String contactNumber;
  final String address;
  final String dateOfBirth;
  final List<VerificationDocument> documents;

  /// Mock stand-in for an uploaded photo (no file storage in the prototype).
  final String? photoLabel;

  String get fullName {
    final parts = [
      firstName.trim(),
      lastName.trim(),
    ].where((part) => part.isNotEmpty);
    return parts.join(' ');
  }

  String get initial {
    final name = fullName.trim();
    return name.isEmpty ? '?' : name[0].toUpperCase();
  }

  int get verifiedDocumentCount => documents
      .where((doc) => doc.status == VerificationDocumentStatus.verified)
      .length;

  VerificationDocument? _firstWith(VerificationDocumentStatus status) {
    for (final doc in documents) {
      if (doc.status == status) return doc;
    }
    return null;
  }

  VerificationDocument? get verifiedDocument =>
      _firstWith(VerificationDocumentStatus.verified);

  VerificationDocument? get documentUnderReview =>
      _firstWith(VerificationDocumentStatus.pending);

  VerificationDocument? get rejectedDocument =>
      _firstWith(VerificationDocumentStatus.rejected);

  /// A verified document unlocks joining events; a submitted one keeps the
  /// beneficiary waiting; a rejection asks for a new upload.
  BeneficiaryVerificationState get verificationState {
    if (verifiedDocument != null) return BeneficiaryVerificationState.verified;
    if (documentUnderReview != null) {
      return BeneficiaryVerificationState.underReview;
    }
    if (rejectedDocument != null) return BeneficiaryVerificationState.rejected;
    return BeneficiaryVerificationState.none;
  }

  bool get canJoinEvents =>
      verificationState == BeneficiaryVerificationState.verified;

  BeneficiaryPersonalProfile copyWith({
    String? firstName,
    String? lastName,
    String? email,
    String? contactNumber,
    String? address,
    String? dateOfBirth,
    List<VerificationDocument>? documents,
    String? photoLabel,
  }) {
    return BeneficiaryPersonalProfile(
      firstName: firstName ?? this.firstName,
      lastName: lastName ?? this.lastName,
      email: email ?? this.email,
      contactNumber: contactNumber ?? this.contactNumber,
      address: address ?? this.address,
      dateOfBirth: dateOfBirth ?? this.dateOfBirth,
      documents: documents ?? this.documents,
      photoLabel: photoLabel ?? this.photoLabel,
    );
  }
}

/// Documents CARES accepts to verify a beneficiary's identity or residency.
/// A new account starts with none on file, so joining events is blocked until
/// at least one is uploaded and verified.
List<VerificationDocument> defaultVerificationDocuments() {
  return const [
    VerificationDocument(
      id: 'valid-id',
      label: 'Valid government-issued ID',
      description: 'PhilSys, UMID, passport, and similar valid IDs.',
      status: VerificationDocumentStatus.missing,
    ),
    VerificationDocument(
      id: 'proof-of-residency',
      label: 'Proof of residency',
      description: 'Utility bill or lease showing your current address.',
      status: VerificationDocumentStatus.missing,
    ),
    VerificationDocument(
      id: 'barangay-certificate',
      label: 'Barangay certificate',
      description: 'Barangay clearance, indigency, or similar certification.',
      status: VerificationDocumentStatus.missing,
    ),
    VerificationDocument(
      id: 'supporting-document',
      label: 'Other valid document',
      description: 'Any other document that verifies identity or residency.',
      status: VerificationDocumentStatus.missing,
    ),
  ];
}
