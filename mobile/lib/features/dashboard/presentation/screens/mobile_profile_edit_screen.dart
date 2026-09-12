import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';
import 'package:permission_handler/permission_handler.dart';

import 'package:mobile/core/services/api_client.dart';
import 'package:mobile/core/session/role_account_store.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/core/utils/media_permissions.dart';
import 'package:mobile/core/utils/phone_number_format.dart';
import 'package:mobile/features/auth/presentation/widgets/register_form_field.dart';
import 'package:mobile/features/auth/presentation/widgets/registration_form_card.dart';
import 'package:mobile/features/dashboard/data/mobile_profile_models.dart';
import 'package:mobile/features/dashboard/data/profile_service.dart';
import 'package:mobile/features/dashboard/presentation/screens/school_record_reverify_screen.dart';
import 'package:mobile/features/dashboard/presentation/widgets/profile_edit_widgets.dart';

/// Edit screen for every mobile role, opened from the avatar on the Profile
/// tab. Shows the whole record from `GET /profile/me/mobile` — the editable
/// columns as fields, the rest (role, school, verification) read-only — and
/// saves with `PUT /profile/me/mobile`, attaching a new photo when one was
/// picked. Email and password are deliberately absent: they change through
/// the account flows, not here.
class MobileProfileEditScreen extends StatefulWidget {
  const MobileProfileEditScreen({super.key, required this.roleType});

  /// `VOLUNTEER`, `DONOR` or `BENEFICIARY` — which role account to edit.
  final String roleType;

  /// Resolves to the saved profile, or null when the person backed out.
  static Future<MobileProfile?> open(BuildContext context, String roleType) {
    return Navigator.of(context).push<MobileProfile>(
      MaterialPageRoute<MobileProfile>(
        builder: (_) => MobileProfileEditScreen(roleType: roleType),
      ),
    );
  }

  @override
  State<MobileProfileEditScreen> createState() =>
      _MobileProfileEditScreenState();
}

class _MobileProfileEditScreenState extends State<MobileProfileEditScreen> {
  static const _genders = ['MALE', 'FEMALE', 'OTHER'];

  final ProfileService _profileService = ProfileService();
  final ImagePicker _picker = ImagePicker();

  final _firstName = TextEditingController();
  final _middleName = TextEditingController();
  final _lastName = TextEditingController();
  final _phone = TextEditingController();
  final _age = TextEditingController();
  final _address = TextEditingController();

  String _gender = 'OTHER';

  /// Beneficiaries only — null when they haven't told us yet.
  int? _householdSize;

  /// The record being edited; null until the first load finishes.
  MobileProfile? _profile;

  /// Picked but not yet uploaded.
  XFile? _pendingAvatar;

  bool _loading = true;
  bool _saving = false;
  bool _picking = false;

  /// A residency document is being read by the server.
  bool _uploadingResidency = false;
  String? _loadError;

  /// Server rejection of the phone number (already on another account).
  String? _phoneConflict;

  @override
  void initState() {
    super.initState();
    // Fields re-validate as the person types so the Save button can gate on
    // them without Form validators.
    for (final c in _editableControllers) {
      c.addListener(_onFieldChanged);
    }
    _load();
  }

  @override
  void dispose() {
    for (final c in [
      _firstName,
      _middleName,
      _lastName,
      _phone,
      _age,
      _address,
    ]) {
      c.dispose();
    }
    super.dispose();
  }

  /// Every typed field — what the dirty check watches. The school record is
  /// not here: it is locked and only changes through ID re-verification.
  List<TextEditingController> get _editableControllers => [
    _firstName,
    _middleName,
    _lastName,
    _phone,
    _age,
    _address,
  ];

  void _onFieldChanged() {
    if (_phoneConflict != null) _phoneConflict = null;
    setState(() {});
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _loadError = null;
    });

    // The Profile tab usually synced already; only hit the server when the
    // store has nothing for this role.
    final cached = RoleAccountStore.instance
        .byType(widget.roleType)
        ?.serverProfile;
    if (cached != null) {
      _apply(cached);
      setState(() => _loading = false);
      return;
    }

    try {
      final profile = await _profileService.syncRoleAccount(
        roleType: widget.roleType,
      );
      if (!mounted) return;
      if (profile == null) {
        setState(() {
          _loading = false;
          _loadError = 'Sign in to edit your profile.';
        });
        return;
      }
      _apply(profile);
      setState(() => _loading = false);
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _loadError = e.message;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _loadError = 'Could not load your profile.';
      });
    }
  }

  void _apply(MobileProfile profile) {
    final draft = MobileProfileUpdate.fromProfile(profile);
    _profile = profile;
    _firstName.text = draft.firstName;
    _middleName.text = draft.middleName;
    _lastName.text = draft.lastName;
    _phone.text = normalizePhilippinePhone(draft.phoneNumber);
    _age.text = draft.age > 0 ? '${draft.age}' : '';
    _address.text = draft.address ?? '';
    _gender = _genders.contains(draft.gender) ? draft.gender : 'OTHER';
    _householdSize = draft.householdSize;
  }

  /// Sections are keyed to the role account being edited, not just the
  /// server's `role_type`, so a beneficiary never sees the volunteer school
  /// card even if the cached record is stale.
  bool get _isVolunteer =>
      widget.roleType == RoleAccountStore.volunteer &&
      _profile?.roleType == RoleAccountStore.volunteer;

  bool get _isBeneficiary => widget.roleType == RoleAccountStore.beneficiary;

  // ---------------------------------------------------------------------------
  // Validation

  String? get _ageError {
    final raw = _age.text.trim();
    if (raw.isEmpty) return _isDirty ? 'Required' : null;
    final value = int.tryParse(raw);
    if (value == null || value < 1 || value > 150) {
      return 'Enter an age between 1 and 150';
    }
    return null;
  }

  String? get _phoneError =>
      _phoneConflict ?? philippinePhoneError(_phone.text);

  /// The form as it would be sent, for the dirty check and for saving. The
  /// beneficiary form never sends the address: it is locked and changes only
  /// through a residency document.
  MobileProfileUpdate _draft() => MobileProfileUpdate(
    firstName: _firstName.text,
    middleName: _middleName.text,
    lastName: _lastName.text,
    phoneNumber: normalizePhilippinePhone(_phone.text),
    gender: _gender,
    age: int.tryParse(_age.text.trim()) ?? 0,
    address: _isBeneficiary ? null : _address.text,
    householdSize: _isBeneficiary ? _householdSize : null,
  );

  /// True once anything editable differs from the record on file — a typed
  /// field, the gender, or a newly picked photo.
  bool get _isDirty {
    final profile = _profile;
    if (profile == null) return false;
    if (_pendingAvatar != null) return true;
    final onFile = MobileProfileUpdate.fromProfile(profile).toFields();
    // Older accounts stored the local `09…` form; compare like with like.
    onFile['phone_number'] = normalizePhilippinePhone(onFile['phone_number']!);
    final now = _draft().toFields();
    // The locked address isn't part of the form, so it can't make it dirty.
    if (_isBeneficiary) onFile.remove('current_address');
    return onFile.entries.any((e) => now[e.key] != e.value);
  }

  bool get _canSave {
    if (_profile == null || _saving || _uploadingResidency || !_isDirty) {
      return false;
    }
    return _firstName.text.trim().isNotEmpty &&
        _lastName.text.trim().isNotEmpty &&
        isValidPhilippinePhone(_phone.text) &&
        _phoneConflict == null &&
        _age.text.trim().isNotEmpty &&
        _ageError == null &&
        (_isBeneficiary || _address.text.trim().isNotEmpty);
  }

  /// "Required" only once the person has started editing, so a freshly
  /// opened form doesn't shout at fields the server left empty.
  String? _requiredError(TextEditingController c) =>
      _isDirty && c.text.trim().isEmpty ? 'Required' : null;

  // ---------------------------------------------------------------------------
  // Avatar

  Future<void> _chooseAvatar() async {
    final source = await showModalBottomSheet<ImageSource>(
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
              onTap: () => Navigator.of(ctx).pop(ImageSource.camera),
            ),
            ListTile(
              leading: const Icon(
                Icons.photo_library_outlined,
                color: AppColors.primaryDark,
              ),
              title: const Text('Choose from gallery'),
              onTap: () => Navigator.of(ctx).pop(ImageSource.gallery),
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
    if (source == null || !mounted) return;
    await _pickAvatar(source);
  }

  Future<void> _pickAvatar(ImageSource source) async {
    final permission = source == ImageSource.camera
        ? await MediaPermissions.ensureCamera()
        : await MediaPermissions.ensureGallery();

    if (!permission.isGranted) {
      if (!mounted) return;
      _showMessage(
        permission.message ?? 'Permission denied.',
        action: permission.openSettings
            ? SnackBarAction(label: 'Settings', onPressed: openAppSettings)
            : null,
      );
      return;
    }

    setState(() => _picking = true);
    try {
      final file = await _picker.pickImage(
        source: source,
        imageQuality: 85,
        maxWidth: 1200,
        preferredCameraDevice: CameraDevice.front,
      );
      if (!mounted || file == null) return;
      setState(() => _pendingAvatar = file);
    } catch (_) {
      if (mounted) {
        _showMessage(
          'Could not open ${source == ImageSource.camera ? 'camera' : 'gallery'}. '
          'Try again or enable permissions in Settings.',
        );
      }
    } finally {
      if (mounted) setState(() => _picking = false);
    }
  }

  // ---------------------------------------------------------------------------
  // School record (volunteers) — locked; changed only by re-verifying the ID

  Future<void> _onSchoolRecordTapped() async {
    if (_saving) return;
    final proceed = await showSchoolRecordLockedDialog(context);
    if (!proceed || !mounted) return;

    final refreshed = await SchoolRecordReverifyScreen.open(context);
    if (!mounted || refreshed == null) return;
    // Only the school section changed server-side; keep whatever the person
    // has typed in the other fields.
    setState(() => _profile = refreshed);
  }

  // ---------------------------------------------------------------------------
  // Address (beneficiaries) — locked; changed only by a proof of residency

  Future<void> _onAddressTapped() async {
    if (_saving || _uploadingResidency) return;
    final proceed = await showAddressLockedDialog(context);
    if (!proceed || !mounted) return;

    final source = await showResidencyDocumentSourceSheet(context);
    if (source == null || !mounted) return;

    final picked = switch (source) {
      ResidencyDocumentSource.camera => await _pickResidencyImage(
        ImageSource.camera,
      ),
      ResidencyDocumentSource.gallery => await _pickResidencyImage(
        ImageSource.gallery,
      ),
      ResidencyDocumentSource.file => await _pickResidencyFile(),
    };
    if (picked == null || !mounted) return;

    await _uploadResidency(picked);
  }

  Future<_PickedDocument?> _pickResidencyImage(ImageSource source) async {
    final permission = source == ImageSource.camera
        ? await MediaPermissions.ensureCamera()
        : await MediaPermissions.ensureGallery();

    if (!permission.isGranted) {
      if (!mounted) return null;
      _showMessage(
        permission.message ?? 'Permission denied.',
        action: permission.openSettings
            ? SnackBarAction(label: 'Settings', onPressed: openAppSettings)
            : null,
      );
      return null;
    }

    try {
      // Full resolution: OCR needs every letter on the certificate legible.
      final file = await _picker.pickImage(
        source: source,
        imageQuality: 95,
        preferredCameraDevice: CameraDevice.rear,
      );
      if (file == null) return null;
      return _PickedDocument(
        path: file.path,
        name: file.name,
        mimeType: file.mimeType,
      );
    } catch (_) {
      if (mounted) {
        _showMessage(
          'Could not open ${source == ImageSource.camera ? 'camera' : 'gallery'}. '
          'Try again or enable permissions in Settings.',
        );
      }
      return null;
    }
  }

  Future<_PickedDocument?> _pickResidencyFile() async {
    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: const ['pdf', 'jpg', 'jpeg', 'png', 'webp'],
        withData: false,
      );
      final file = result?.files.single;
      final path = file?.path;
      if (file == null || path == null) return null;
      return _PickedDocument(path: path, name: file.name, mimeType: null);
    } catch (_) {
      if (mounted) _showMessage('Could not open the file picker.');
      return null;
    }
  }

  Future<void> _uploadResidency(_PickedDocument doc) async {
    setState(() => _uploadingResidency = true);
    try {
      final refreshed = await _profileService.uploadResidencyDocument(
        path: doc.path,
        fileName: doc.name,
        mimeType: doc.mimeType,
        roleType: widget.roleType,
      );
      if (!mounted) return;
      setState(() {
        // Only the address (and the document list) changed server-side; keep
        // whatever the person has typed in the other fields.
        _profile = refreshed;
        _address.text = refreshed.address.display;
        _uploadingResidency = false;
      });
      _showMessage('Address updated to "${refreshed.address.display}".');
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _uploadingResidency = false);
      _showMessage(_describe(e));
    } catch (_) {
      if (!mounted) return;
      setState(() => _uploadingResidency = false);
      _showMessage('Could not read your document. Please try again.');
    }
  }

  void _openResidencyDocument(ResidencyDocument document) {
    showResidencyDocumentPreview(
      context,
      document: document,
      url: _profileService.residencyDocumentUrl(document.id),
      headers: _profileService.avatarHeaders,
    );
  }

  // ---------------------------------------------------------------------------
  // Save

  Future<void> _save() async {
    if (!_canSave) return;
    FocusManager.instance.primaryFocus?.unfocus();
    setState(() => _saving = true);

    final update = _draft();

    try {
      final saved = await _profileService.updateMyProfile(
        update,
        avatar: _pendingAvatar,
        roleType: widget.roleType,
      );
      if (!mounted) return;
      _showMessage('Profile updated.');
      Navigator.of(context).pop(saved);
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _saving = false;
        if (e.statusCode == 409) _phoneConflict = e.message;
      });
      _showMessage(_describe(e));
    } catch (_) {
      if (!mounted) return;
      setState(() => _saving = false);
      _showMessage('Could not save your profile. Please try again.');
    }
  }

  /// First field-level issue from a validation reply, otherwise the message.
  String _describe(ApiException e) {
    final errors = e.errors;
    if (errors is List && errors.isNotEmpty) {
      final first = errors.first;
      if (first is Map && first['message'] is String) {
        return first['message'] as String;
      }
    }
    return e.message;
  }

  void _showMessage(String text, {SnackBarAction? action}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(text),
        behavior: SnackBarBehavior.floating,
        action: action,
        duration: const Duration(seconds: 4),
      ),
    );
  }

  void _dismissKeyboard() => FocusManager.instance.primaryFocus?.unfocus();

  // ---------------------------------------------------------------------------
  // Build

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.paddingOf(context).bottom;

    return Scaffold(
      backgroundColor: Colors.white,
      body: Column(
        children: [
          ProfileEditHeader(
            onBack: _saving ? null : () => Navigator.of(context).pop(),
          ),
          Expanded(child: _buildBody()),
        ],
      ),
      bottomNavigationBar: _profile == null
          ? null
          : Container(
              padding: EdgeInsets.fromLTRB(20, 12, 20, 12 + bottomInset),
              decoration: const BoxDecoration(
                color: Colors.white,
                border: Border(top: BorderSide(color: Color(0xFFE6EFE3))),
              ),
              child: SizedBox(
                height: 52,
                child: ElevatedButton(
                  onPressed: _canSave ? _save : null,
                  child: _saving
                      ? const SizedBox(
                          width: 22,
                          height: 22,
                          child: CircularProgressIndicator(
                            strokeWidth: 2.4,
                            color: Colors.white,
                          ),
                        )
                      : const Text('Save changes'),
                ),
              ),
            ),
    );
  }

  Widget _buildBody() {
    if (_loading) {
      return const Center(
        child: CircularProgressIndicator(color: AppColors.primary),
      );
    }

    if (_profile == null) {
      return ProfileLoadErrorView(
        message: _loadError ?? 'Could not load your profile.',
        onRetry: _load,
      );
    }

    final profile = _profile!;
    final account = RoleAccountStore.instance.byType(widget.roleType);

    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 28),
      keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
      children: [
        ProfileAvatarPicker(
          initial: profile.firstName.isNotEmpty
              ? profile.firstName[0].toUpperCase()
              : '?',
          pending: _pendingAvatar,
          networkUrl: account?.avatarUrl,
          networkHeaders: _profileService.avatarHeaders,
          busy: _picking,
          onTap: _saving ? null : _chooseAvatar,
        ),
        const SizedBox(height: 24),

        RegistrationFormCard(
          icon: Icons.badge_outlined,
          title: 'Your name',
          subtitle: 'As it appears on certificates and records.',
          children: [
            RegisterFormField(
              label: 'First name',
              controller: _firstName,
              textInputAction: TextInputAction.next,
              inputFormatters: [LengthLimitingTextInputFormatter(80)],
              errorText: _requiredError(_firstName),
            ),
            const SizedBox(height: 14),
            RegisterFormField(
              label: 'Middle name (optional)',
              hint: 'Middle name',
              controller: _middleName,
              textInputAction: TextInputAction.next,
              inputFormatters: [LengthLimitingTextInputFormatter(80)],
            ),
            const SizedBox(height: 14),
            RegisterFormField(
              label: 'Last name',
              controller: _lastName,
              textInputAction: TextInputAction.next,
              inputFormatters: [LengthLimitingTextInputFormatter(80)],
              errorText: _requiredError(_lastName),
            ),
          ],
        ),
        if (_isVolunteer) ...[
          const SizedBox(height: 16),
          ProfileSchoolRecordCard(
            school: profile.volunteer?.school,
            onTapLocked: _onSchoolRecordTapped,
          ),
        ],

        const SizedBox(height: 16),

        RegistrationFormCard(
          icon: Icons.call_outlined,
          title: 'Contact & details',
          subtitle: 'How coordinators reach you.',
          children: [
            RegisterFormField(
              label: 'Mobile number',
              hint: '09XXXXXXXXX',
              controller: _phone,
              keyboardType: TextInputType.phone,
              textInputAction: TextInputAction.next,
              inputFormatters: const [PhilippinePhoneFormatter()],
              errorText: _phoneError,
            ),
            const SizedBox(height: 14),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: _dropdown(
                    label: 'Gender',
                    value: _gender,
                    items: _genders,
                    itemLabel: _genderLabel,
                    onChanged: (v) => setState(() => _gender = v ?? 'OTHER'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: RegisterFormField(
                    label: 'Age',
                    controller: _age,
                    keyboardType: TextInputType.number,
                    textInputAction: TextInputAction.next,
                    inputFormatters: [
                      FilteringTextInputFormatter.digitsOnly,
                      LengthLimitingTextInputFormatter(3),
                    ],
                    errorText: _ageError,
                  ),
                ),
              ],
            ),
          ],
        ),
        const SizedBox(height: 16),

        if (_isBeneficiary)
          ProfileResidencyAddressCard(
            address: profile.address.display,
            documents: profile.residencyDocuments,
            uploading: _uploadingResidency,
            onTapLocked: _onAddressTapped,
            onOpenDocument: _openResidencyDocument,
          )
        else
          RegistrationFormCard(
            icon: Icons.home_outlined,
            title: 'Address',
            subtitle: 'Where you currently live.',
            children: [
              RegisterFormField(
                label: 'Current address',
                hint: 'House no., street, barangay, city',
                controller: _address,
                maxLines: 2,
                textInputAction: TextInputAction.done,
                onSubmitted: (_) => _dismissKeyboard(),
                inputFormatters: [LengthLimitingTextInputFormatter(300)],
                errorText: _requiredError(_address),
              ),
            ],
          ),
        if (_isBeneficiary) ...[
          const SizedBox(height: 16),
          ProfileHouseholdSizeCard(
            selectedSize: _householdSize,
            onChanged: _saving
                ? null
                : (value) {
                    _dismissKeyboard();
                    setState(() => _householdSize = value);
                  },
          ),
        ],
      ],
    );
  }

  Widget _dropdown({
    required String label,
    required String value,
    required List<String> items,
    required ValueChanged<String?> onChanged,
    required String Function(String value) itemLabel,
  }) {
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
        DropdownButtonFormField<String>(
          isExpanded: true,
          initialValue: value,
          items: items
              .map(
                (e) => DropdownMenuItem(
                  value: e,
                  child: Text(itemLabel(e), overflow: TextOverflow.ellipsis),
                ),
              )
              .toList(),
          onTap: _dismissKeyboard,
          onChanged: (v) {
            _dismissKeyboard();
            onChanged(v);
          },
          decoration: const InputDecoration(
            filled: true,
            fillColor: AppColors.fieldFill,
          ),
        ),
      ],
    );
  }

  static String _genderLabel(String value) => switch (value) {
    'MALE' => 'Male',
    'FEMALE' => 'Female',
    _ => 'Prefer not to say',
  };
}

/// A residency file picked from the camera, gallery or file system, before
/// upload. [mimeType] is only known for image_picker results.
class _PickedDocument {
  const _PickedDocument({
    required this.path,
    required this.name,
    required this.mimeType,
  });

  final String path;
  final String name;
  final String? mimeType;
}
