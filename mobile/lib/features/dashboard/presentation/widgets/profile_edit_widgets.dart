import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/auth/presentation/widgets/registration_form_card.dart';
import 'package:mobile/features/dashboard/beneficiary/domain/beneficiary_profile.dart';
import 'package:mobile/features/dashboard/data/mobile_profile_models.dart';

/// Green band with the iOS-style back control; the heading below carries the
/// screen title, so nothing sits beside the chevron.
class ProfileEditHeader extends StatelessWidget {
  const ProfileEditHeader({
    super.key,
    required this.onBack,
    this.title = 'Edit profile',
    this.subtitle =
        'Update your details and photo. Email and password are managed '
        'under Account Security.',
  });

  final VoidCallback? onBack;
  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    final topInset = MediaQuery.paddingOf(context).top;

    return Container(
      width: double.infinity,
      padding: EdgeInsets.fromLTRB(20, topInset + 6, 20, 22),
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            AppColors.primaryDark,
            AppColors.primary,
            AppColors.secondary,
          ],
        ),
        borderRadius: BorderRadius.vertical(bottom: Radius.circular(28)),
        boxShadow: [
          BoxShadow(
            color: Color(0x2E1F5F28),
            blurRadius: 22,
            offset: Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Semantics(
            button: true,
            label: 'Back',
            child: InkWell(
              onTap: onBack,
              borderRadius: BorderRadius.circular(20),
              child: const Padding(
                // Only vertical + trailing padding: the chevron itself stays
                // on the 20pt content margin like a UINavigationBar back button.
                padding: EdgeInsets.fromLTRB(0, 8, 12, 8),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      Icons.arrow_back_ios_new_rounded,
                      size: 17,
                      color: Colors.white,
                    ),
                    SizedBox(width: 5),
                    Text(
                      'Back',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: Colors.white,
                        letterSpacing: -0.2,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(height: 6),
          Text(
            title,
            style: const TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.w800,
              color: Colors.white,
              height: 1.2,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            subtitle,
            style: TextStyle(
              fontSize: 12.5,
              height: 1.35,
              color: Colors.white.withValues(alpha: 0.85),
            ),
          ),
        ],
      ),
    );
  }
}

/// Large avatar with a camera badge. Shows, in order of preference: the photo
/// just picked, the photo on file (private stream + bearer header), or the
/// initial on the role colour.
class ProfileAvatarPicker extends StatelessWidget {
  const ProfileAvatarPicker({
    super.key,
    required this.initial,
    required this.pending,
    required this.networkUrl,
    required this.networkHeaders,
    required this.busy,
    required this.onTap,
  });

  final String initial;
  final XFile? pending;
  final String? networkUrl;
  final Map<String, String> networkHeaders;
  final bool busy;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final fallback = Text(
      initial,
      style: const TextStyle(
        color: Colors.white,
        fontSize: 40,
        fontWeight: FontWeight.w800,
      ),
    );

    Widget picture;
    if (pending != null) {
      picture = Image.file(File(pending!.path), fit: BoxFit.cover);
    } else if (networkUrl != null) {
      picture = Image.network(
        networkUrl!,
        headers: networkHeaders,
        fit: BoxFit.cover,
        errorBuilder: (_, _, _) => Center(child: fallback),
      );
    } else {
      picture = Center(child: fallback);
    }

    return Center(
      child: Column(
        children: [
          Semantics(
            button: true,
            label: 'Change profile photo',
            child: InkWell(
              onTap: onTap,
              customBorder: const CircleBorder(),
              child: SizedBox(
                width: 124,
                height: 124,
                child: Stack(
                  clipBehavior: Clip.none,
                  children: [
                    Container(
                      width: 124,
                      height: 124,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: AppColors.primaryDark,
                        border: Border.all(color: Colors.white, width: 4),
                        boxShadow: const [
                          BoxShadow(
                            color: Color(0x2E1F5F28),
                            blurRadius: 18,
                            offset: Offset(0, 8),
                          ),
                        ],
                      ),
                      clipBehavior: Clip.antiAlias,
                      child: busy
                          ? const Center(
                              child: CircularProgressIndicator(
                                color: Colors.white,
                                strokeWidth: 2.4,
                              ),
                            )
                          : picture,
                    ),
                    Positioned(
                      right: 0,
                      bottom: 0,
                      child: Container(
                        width: 38,
                        height: 38,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: AppColors.primary,
                          border: Border.all(color: Colors.white, width: 3),
                        ),
                        child: const Icon(
                          Icons.photo_camera_rounded,
                          size: 18,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(height: 12),
          TextButton.icon(
            onPressed: onTap,
            icon: const Icon(Icons.edit_outlined, size: 16),
            label: Text(pending == null ? 'Change photo' : 'Photo selected'),
            style: TextButton.styleFrom(
              foregroundColor: AppColors.primaryDark,
              textStyle: const TextStyle(
                fontSize: 13.5,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Volunteer school record. Every field is disabled: the values come off the
/// ID via OCR and are only ever changed by re-running that check, so a tap on
/// any of them explains that instead of opening a keyboard.
class ProfileSchoolRecordCard extends StatelessWidget {
  const ProfileSchoolRecordCard({
    super.key,
    required this.school,
    required this.onTapLocked,
  });

  final VolunteerSchoolInfo? school;
  final VoidCallback onTapLocked;

  @override
  Widget build(BuildContext context) {
    final fields = <(String, String)>[
      ('Department', school?.department ?? ''),
      ('Program', school?.major ?? ''),
      ('Year level', school?.yearLevel ?? ''),
      ('Student ID', school?.idNumber ?? ''),
    ];

    return RegistrationFormCard(
      icon: Icons.school_outlined,
      title: 'School record',
      subtitle: 'Read from your UCLM ID — tap a field to see how to update it.',
      children: [
        for (var i = 0; i < fields.length; i++) ...[
          if (i > 0) const SizedBox(height: 14),
          _LockedField(
            label: fields[i].$1,
            value: fields[i].$2,
            onTap: onTapLocked,
          ),
        ],
      ],
    );
  }
}

/// Beneficiary household size — the same chip picker the profile setup uses,
/// inside a form card so it sits with the other sections. Tapping the chosen
/// chip again clears it; the value saves with the rest of the form.
class ProfileHouseholdSizeCard extends StatelessWidget {
  const ProfileHouseholdSizeCard({
    super.key,
    required this.selectedSize,
    required this.onChanged,
  });

  final int? selectedSize;
  final ValueChanged<int?>? onChanged;

  @override
  Widget build(BuildContext context) {
    final sizes = BeneficiaryProfileOptions.householdSizes;

    return RegistrationFormCard(
      icon: Icons.groups_outlined,
      title: 'Household',
      subtitle: 'How many people the assistance has to cover.',
      children: [
        Text(
          'Household size',
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: AppColors.secondary.withValues(alpha: 0.95),
          ),
        ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: sizes.map((size) {
            final isSelected = selectedSize == size;
            final label = size == sizes.last
                ? '$size+ members'
                : '$size member${size == 1 ? '' : 's'}';
            return FilterChip(
              label: Text(label),
              selected: isSelected,
              onSelected: onChanged == null
                  ? null
                  : (_) => onChanged!(isSelected ? null : size),
              selectedColor: AppColors.primary.withValues(alpha: 0.14),
              checkmarkColor: AppColors.primaryDark,
              labelStyle: TextStyle(
                fontSize: 12,
                fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                color: isSelected
                    ? AppColors.primaryDark
                    : AppColors.secondary.withValues(alpha: 0.95),
              ),
              side: BorderSide(
                color: isSelected ? AppColors.primary : AppColors.fieldBorder,
              ),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(20),
              ),
            );
          }).toList(),
        ),
      ],
    );
  }
}

/// Beneficiary address. The field is locked: the address is only ever set by
/// OCR from an uploaded proof of residency, so a tap explains that and starts
/// the upload instead of opening a keyboard. Files already on record are
/// listed underneath, newest first.
class ProfileResidencyAddressCard extends StatelessWidget {
  const ProfileResidencyAddressCard({
    super.key,
    required this.address,
    required this.documents,
    required this.uploading,
    required this.onTapLocked,
    required this.onOpenDocument,
  });

  final String address;
  final List<ResidencyDocument> documents;

  /// True while a document is being read; the list shows a pending row.
  final bool uploading;
  final VoidCallback onTapLocked;
  final ValueChanged<ResidencyDocument> onOpenDocument;

  @override
  Widget build(BuildContext context) {
    return RegistrationFormCard(
      icon: Icons.home_outlined,
      title: 'Address',
      subtitle: 'Read from your proof of residency — tap to update it.',
      children: [
        _LockedField(
          label: 'Current address',
          value: address,
          onTap: onTapLocked,
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: Text(
                'Residency documents',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: AppColors.secondary.withValues(alpha: 0.95),
                ),
              ),
            ),
            TextButton.icon(
              onPressed: uploading ? null : onTapLocked,
              style: TextButton.styleFrom(
                padding: const EdgeInsets.symmetric(horizontal: 8),
                visualDensity: VisualDensity.compact,
              ),
              icon: const Icon(Icons.upload_file_outlined, size: 18),
              label: const Text('Upload'),
            ),
          ],
        ),
        const SizedBox(height: 4),
        if (uploading) const _ResidencyPendingRow(),
        if (documents.isEmpty && !uploading)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
            decoration: BoxDecoration(
              color: AppColors.fieldFill.withValues(alpha: 0.65),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.fieldBorder),
            ),
            child: const Text(
              'No documents yet. Upload a barangay certificate or residency '
              'clearance to change your address.',
              style: TextStyle(
                fontSize: 13,
                height: 1.4,
                color: AppColors.textMuted,
              ),
            ),
          ),
        for (var i = 0; i < documents.length; i++) ...[
          if (i > 0 || uploading) const SizedBox(height: 8),
          _ResidencyDocumentTile(
            document: documents[i],
            onTap: () => onOpenDocument(documents[i]),
          ),
        ],
      ],
    );
  }
}

class _ResidencyPendingRow extends StatelessWidget {
  const _ResidencyPendingRow();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: AppColors.primary.withValues(alpha: 0.06),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.primary.withValues(alpha: 0.3)),
      ),
      child: const Row(
        children: [
          SizedBox(
            width: 18,
            height: 18,
            child: CircularProgressIndicator(
              strokeWidth: 2.2,
              color: AppColors.primary,
            ),
          ),
          SizedBox(width: 12),
          Expanded(
            child: Text(
              'Reading your document…',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: AppColors.primaryDark,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ResidencyDocumentTile extends StatelessWidget {
  const _ResidencyDocumentTile({required this.document, required this.onTap});

  final ResidencyDocument document;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.fieldBorder),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(
                document.isPdf
                    ? Icons.picture_as_pdf_outlined
                    : Icons.image_outlined,
                color: AppColors.primaryDark,
                size: 22,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    document.fileName,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '${document.uploadedLabel} · ${document.sizeLabel}',
                    style: const TextStyle(
                      fontSize: 12,
                      color: AppColors.textMuted,
                    ),
                  ),
                  if (document.extractedAddress.trim().isNotEmpty) ...[
                    const SizedBox(height: 6),
                    Text(
                      document.extractedAddress,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 12,
                        height: 1.35,
                        color: AppColors.secondary.withValues(alpha: 0.95),
                      ),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(width: 8),
            Icon(
              Icons.chevron_right_rounded,
              color: AppColors.secondary.withValues(alpha: 0.55),
            ),
          ],
        ),
      ),
    );
  }
}

/// Why the address can't be typed in, and how to change it. Resolves true
/// when the person chooses to upload a document.
Future<bool> showAddressLockedDialog(BuildContext context) async {
  final proceed = await showDialog<bool>(
    context: context,
    builder: (ctx) => AlertDialog(
      backgroundColor: Colors.white,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
      titlePadding: const EdgeInsets.fromLTRB(24, 22, 24, 0),
      title: const Row(
        children: [
          Icon(Icons.lock_outline_rounded, color: AppColors.primaryDark),
          SizedBox(width: 10),
          Expanded(
            child: Text(
              'Proof of residency needed',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w800,
                color: AppColors.primaryDark,
              ),
            ),
          ),
        ],
      ),
      content: const Text(
        "Your address can't be typed in. To change it, upload a barangay "
        'certificate or residency clearance — a photo or a PDF. Our OCR '
        'service will read the address off the document and set it for you. '
        'The file is kept with your profile.',
        style: TextStyle(
          fontSize: 14,
          height: 1.45,
          color: AppColors.textSecondary,
        ),
      ),
      actionsPadding: const EdgeInsets.fromLTRB(16, 0, 16, 14),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(ctx).pop(false),
          child: const Text('Not now'),
        ),
        ElevatedButton.icon(
          onPressed: () => Navigator.of(ctx).pop(true),
          icon: const Icon(Icons.upload_file_outlined, size: 18),
          label: const Text('Upload document'),
        ),
      ],
    ),
  );
  return proceed ?? false;
}

/// Where the residency document comes from.
enum ResidencyDocumentSource { camera, gallery, file }

Future<ResidencyDocumentSource?> showResidencyDocumentSourceSheet(
  BuildContext context,
) {
  return showModalBottomSheet<ResidencyDocumentSource>(
    context: context,
    backgroundColor: Colors.white,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(22)),
    ),
    builder: (ctx) => SafeArea(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const SizedBox(height: 8),
          Container(
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: AppColors.accentLight,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(height: 8),
          ListTile(
            leading: const Icon(
              Icons.photo_camera_outlined,
              color: AppColors.primaryDark,
            ),
            title: const Text('Take a photo'),
            subtitle: const Text('Lay the document flat, all edges in frame'),
            onTap: () => Navigator.of(ctx).pop(ResidencyDocumentSource.camera),
          ),
          ListTile(
            leading: const Icon(
              Icons.photo_library_outlined,
              color: AppColors.primaryDark,
            ),
            title: const Text('Choose from gallery'),
            onTap: () => Navigator.of(ctx).pop(ResidencyDocumentSource.gallery),
          ),
          ListTile(
            leading: const Icon(
              Icons.picture_as_pdf_outlined,
              color: AppColors.primaryDark,
            ),
            title: const Text('Choose a file'),
            subtitle: const Text('PDF, JPG, PNG or WebP'),
            onTap: () => Navigator.of(ctx).pop(ResidencyDocumentSource.file),
          ),
          const SizedBox(height: 8),
        ],
      ),
    ),
  );
}

/// Full-screen look at a stored residency file. Images render from the
/// private stream; PDFs have no in-app renderer, so the sheet shows what is
/// known about the file and the address that was read off it.
Future<void> showResidencyDocumentPreview(
  BuildContext context, {
  required ResidencyDocument document,
  required String url,
  required Map<String, String> headers,
}) {
  if (document.isImage) {
    return showDialog<void>(
      context: context,
      barrierColor: Colors.black87,
      builder: (ctx) => GestureDetector(
        onTap: () => Navigator.of(ctx).pop(),
        child: Scaffold(
          backgroundColor: Colors.transparent,
          body: SafeArea(
            child: Stack(
              children: [
                Center(
                  child: InteractiveViewer(
                    child: Image.network(
                      url,
                      headers: headers,
                      fit: BoxFit.contain,
                      loadingBuilder: (_, child, progress) => progress == null
                          ? child
                          : const CircularProgressIndicator(
                              color: Colors.white,
                            ),
                      errorBuilder: (_, _, _) => const Text(
                        'Could not load the image.',
                        style: TextStyle(color: Colors.white),
                      ),
                    ),
                  ),
                ),
                Positioned(
                  top: 8,
                  right: 8,
                  child: IconButton(
                    onPressed: () => Navigator.of(ctx).pop(),
                    icon: const Icon(Icons.close, color: Colors.white),
                  ),
                ),
                Positioned(
                  left: 20,
                  right: 20,
                  bottom: 20,
                  child: Text(
                    document.fileName,
                    textAlign: TextAlign.center,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(color: Colors.white70),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  return showModalBottomSheet<void>(
    context: context,
    backgroundColor: Colors.white,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(22)),
    ),
    builder: (ctx) => SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(
                  Icons.picture_as_pdf_outlined,
                  color: AppColors.primaryDark,
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    document.fileName,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                      color: AppColors.primaryDark,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              'Uploaded ${document.uploadedLabel} · ${document.sizeLabel}',
              style: const TextStyle(fontSize: 13, color: AppColors.textMuted),
            ),
            const SizedBox(height: 16),
            Text(
              'Address read from this document',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: AppColors.secondary.withValues(alpha: 0.95),
              ),
            ),
            const SizedBox(height: 6),
            Text(
              document.extractedAddress.trim().isEmpty
                  ? 'Not on file'
                  : document.extractedAddress,
              style: const TextStyle(
                fontSize: 15,
                height: 1.4,
                color: AppColors.textPrimary,
              ),
            ),
          ],
        ),
      ),
    ),
  );
}

/// Looks like a read-only [RegisterFormField] but is not editable at all; the
/// whole thing is one tap target.
class _LockedField extends StatelessWidget {
  const _LockedField({
    required this.label,
    required this.value,
    required this.onTap,
  });

  final String label;
  final String value;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final empty = value.trim().isEmpty;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: AppColors.secondary.withValues(alpha: 0.95),
          ),
        ),
        const SizedBox(height: 6),
        Semantics(
          button: true,
          label: '$label, locked',
          child: InkWell(
            onTap: onTap,
            borderRadius: BorderRadius.circular(12),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
              decoration: BoxDecoration(
                color: AppColors.fieldFill.withValues(alpha: 0.65),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.fieldBorder),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      empty ? 'Not on file' : value,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w500,
                        color: empty
                            ? AppColors.textMuted
                            : AppColors.textPrimary.withValues(alpha: 0.7),
                      ),
                    ),
                  ),
                  Icon(
                    Icons.lock_outline,
                    size: 18,
                    color: AppColors.secondary.withValues(alpha: 0.55),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}

/// Why the school record can't be edited by hand, and the way to change it.
/// Resolves true when the person chooses to re-verify.
Future<bool> showSchoolRecordLockedDialog(BuildContext context) async {
  final proceed = await showDialog<bool>(
    context: context,
    builder: (ctx) => AlertDialog(
      backgroundColor: Colors.white,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
      titlePadding: const EdgeInsets.fromLTRB(24, 22, 24, 0),
      title: const Row(
        children: [
          Icon(Icons.lock_outline_rounded, color: AppColors.primaryDark),
          SizedBox(width: 10),
          Expanded(
            child: Text(
              'Set from your ID',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w800,
                color: AppColors.primaryDark,
              ),
            ),
          ),
        ],
      ),
      content: const Text(
        "Your department can't be typed in. To update it, upload your UCLM "
        'ID again and verify your face. Our OCR service will read the ID '
        'details and set your department, program, year level and student '
        'ID automatically.',
        style: TextStyle(
          fontSize: 14,
          height: 1.45,
          color: AppColors.textSecondary,
        ),
      ),
      actionsPadding: const EdgeInsets.fromLTRB(16, 0, 16, 14),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(ctx).pop(false),
          child: const Text('Not now'),
        ),
        ElevatedButton.icon(
          onPressed: () => Navigator.of(ctx).pop(true),
          icon: const Icon(Icons.badge_outlined, size: 18),
          label: const Text('Re-verify ID'),
        ),
      ],
    ),
  );
  return proceed ?? false;
}

class ProfileLoadErrorView extends StatelessWidget {
  const ProfileLoadErrorView({
    super.key,
    required this.message,
    required this.onRetry,
  });

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.cloud_off_rounded,
              size: 40,
              color: AppColors.textMuted,
            ),
            const SizedBox(height: 12),
            Text(
              message,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 14,
                color: AppColors.textSecondary,
                height: 1.4,
              ),
            ),
            const SizedBox(height: 16),
            OutlinedButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh_rounded, size: 18),
              label: const Text('Try again'),
            ),
          ],
        ),
      ),
    );
  }
}
