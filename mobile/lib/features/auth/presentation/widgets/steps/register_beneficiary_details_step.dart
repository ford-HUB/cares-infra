import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:mobile/core/utils/phone_number_format.dart';
import 'package:mobile/features/auth/presentation/utils/conflict_focus.dart';
import 'package:flutter/services.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/auth/domain/beneficiary_profile.dart';
import 'package:mobile/features/auth/domain/ph_address.dart';
import 'package:mobile/features/auth/domain/register_ocr_sample.dart';
import 'package:mobile/features/auth/presentation/widgets/address_autocomplete_fields.dart';
import 'package:mobile/features/auth/presentation/widgets/register_form_field.dart';
import 'package:mobile/features/auth/presentation/widgets/registration_form_card.dart';

/// Largest supporting document the server accepts — kept in step with
/// `REGISTRATION_DOCUMENT_MAX_BYTES`.
const int kRegistrationDocumentMaxBytes = 10 * 1024 * 1024;

/// Beneficiary details form — the donor sign-up pattern: hero panel, then one
/// card per idea. Beneficiaries type everything in, so there is no OCR review
/// and no ID or face capture behind this step. A supporting document (any file
/// type) is attached here for the director who approves the account.
class RegisterBeneficiaryDetailsStep extends StatefulWidget {
  const RegisterBeneficiaryDetailsStep({
    super.key,
    required this.data,
    required this.profile,
    required this.onChanged,
    required this.onProfileChanged,
    required this.document,
    required this.onDocumentChanged,
    this.phoneError,
  });

  final RegisterOcrSample data;
  final BeneficiaryProfile profile;
  final ValueChanged<RegisterOcrSample> onChanged;
  final ValueChanged<BeneficiaryProfile> onProfileChanged;

  /// The picked supporting document; null until one is chosen.
  final PlatformFile? document;
  final ValueChanged<PlatformFile?> onDocumentChanged;

  /// Server-side conflict on the phone number — shown inline and focused.
  final String? phoneError;

  @override
  State<RegisterBeneficiaryDetailsStep> createState() =>
      _RegisterBeneficiaryDetailsStepState();
}

class _RegisterBeneficiaryDetailsStepState
    extends State<RegisterBeneficiaryDetailsStep> {
  static const _genders = ['MALE', 'FEMALE', 'OTHER'];

  late final TextEditingController _firstname;
  late final TextEditingController _middleName;
  late final TextEditingController _lastname;
  late final TextEditingController _age;
  late final TextEditingController _phone;
  late final TextEditingController _organizationName;
  late final TextEditingController _organizationRole;
  late final TextEditingController _organizationAddress;
  late final FocusNode _phoneFocus;

  late String _gender;

  BeneficiaryProfile get _profile => widget.profile;

  @override
  void initState() {
    super.initState();
    final data = widget.data;
    _firstname = TextEditingController(text: data.firstname);
    _middleName = TextEditingController(text: data.middleName);
    _lastname = TextEditingController(text: data.lastname);
    _age = TextEditingController(text: data.age > 0 ? '${data.age}' : '');
    _phone = TextEditingController(
      text: normalizePhilippinePhone(data.phoneNumber),
    );
    _phoneFocus = FocusNode();
    _organizationName = TextEditingController(text: _profile.organizationName);
    _organizationRole = TextEditingController(text: _profile.organizationRole);
    _organizationAddress = TextEditingController(
      text: _profile.organizationAddress,
    );
    _gender = data.gender;
    if (widget.phoneError != null) {
      focusConflictField(this, _phoneFocus);
    }
  }

  @override
  void didUpdateWidget(RegisterBeneficiaryDetailsStep oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.phoneError != null && oldWidget.phoneError == null) {
      focusConflictField(this, _phoneFocus);
    }
  }

  @override
  void dispose() {
    _phoneFocus.dispose();
    _firstname.dispose();
    _middleName.dispose();
    _lastname.dispose();
    _age.dispose();
    _phone.dispose();
    _organizationName.dispose();
    _organizationRole.dispose();
    _organizationAddress.dispose();
    super.dispose();
  }

  void _notifyParent() {
    widget.onChanged(
      widget.data.copyWith(
        firstname: _firstname.text.trim(),
        middleName: _middleName.text.trim(),
        lastname: _lastname.text.trim(),
        gender: _gender,
        age: int.tryParse(_age.text.trim()) ?? 0,
        phoneNumber: _phone.text.trim(),
        // Beneficiaries register without an ID or school information.
        idNumber: '',
        departmentName: '',
        majorName: '',
        yearLevelName: '',
        graduationYear: 0,
        graduationMonth: 0,
        graduationDay: 0,
        volunteerType: '',
      ),
    );
  }

  /// The structured address lives on the profile; the flat `current_address`
  /// sent to the server is its formatted form, or empty while incomplete so
  /// the step can't continue.
  void _onAddressChanged(PhAddress address) {
    widget.onProfileChanged(_profile.copyWith(address: address));
    widget.onChanged(widget.data.copyWith(currentAddress: address.formatted));
  }

  void _onFieldChanged(String _) {
    setState(() {});
    _notifyParent();
  }

  void _selectKind(BeneficiaryKind kind) {
    if (kind == BeneficiaryKind.individual) {
      _organizationName.clear();
      _organizationRole.clear();
      _organizationAddress.clear();
      widget.onProfileChanged(_profile.asIndividual());
    } else {
      widget.onProfileChanged(_profile.copyWith(kind: kind));
    }
    FocusManager.instance.primaryFocus?.unfocus();
    setState(() {});
  }

  void _onOrganizationFieldChanged(String _) {
    widget.onProfileChanged(
      _profile.copyWith(
        organizationName: _organizationName.text.trim(),
        organizationRole: _organizationRole.text.trim(),
        organizationAddress: _organizationAddress.text.trim(),
      ),
    );
    setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _nameCard(),
        const SizedBox(height: 16),
        _kindCard(),
        if (_profile.isOrganization) ...[
          const SizedBox(height: 16),
          _organizationCard(),
        ],
        const SizedBox(height: 16),
        _personalCard(),
        const SizedBox(height: 16),
        _addressCard(),
        const SizedBox(height: 16),
        _documentCard(),
        const SizedBox(height: 8),
      ],
    );
  }

  String? _documentError;

  Future<void> _pickDocument() async {
    FocusManager.instance.primaryFocus?.unfocus();
    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.any,
        withData: false,
      );
      final file = result?.files.single;
      if (file == null || file.path == null || !mounted) return;

      if (file.size > kRegistrationDocumentMaxBytes) {
        setState(
          () => _documentError =
              'That file is over ${kRegistrationDocumentMaxBytes ~/ (1024 * 1024)} MB. '
              'Pick a smaller one.',
        );
        return;
      }
      setState(() => _documentError = null);
      widget.onDocumentChanged(file);
    } catch (_) {
      if (!mounted) return;
      setState(() => _documentError = 'Could not open that file. Try another.');
    }
  }

  Widget _documentCard() {
    final document = widget.document;
    return RegistrationFormCard(
      icon: Icons.attach_file_rounded,
      title: 'Supporting document',
      subtitle:
          'Attach a file that supports your registration — a barangay '
          'certificate, valid ID, or similar. Any file type, up to '
          '${kRegistrationDocumentMaxBytes ~/ (1024 * 1024)} MB.',
      children: [
        if (document == null)
          OutlinedButton.icon(
            onPressed: () => _pickDocument(),
            icon: const Icon(Icons.upload_file_rounded),
            label: const Text('Choose a file'),
          )
        else
          Container(
            padding: const EdgeInsets.fromLTRB(12, 10, 4, 10),
            decoration: BoxDecoration(
              color: AppColors.background,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.borderLight),
            ),
            child: Row(
              children: [
                const Icon(
                  Icons.insert_drive_file_outlined,
                  color: AppColors.primary,
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        document.name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 13.5,
                          fontWeight: FontWeight.w600,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        _formatSize(document.size),
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppColors.textMuted,
                        ),
                      ),
                    ],
                  ),
                ),
                TextButton(
                  onPressed: () => _pickDocument(),
                  child: const Text('Replace'),
                ),
                IconButton(
                  tooltip: 'Remove file',
                  onPressed: () => widget.onDocumentChanged(null),
                  icon: const Icon(Icons.close_rounded, size: 20),
                  color: AppColors.textSecondary,
                ),
              ],
            ),
          ),
        if (_documentError != null) ...[
          const SizedBox(height: 8),
          Text(
            _documentError!,
            style: const TextStyle(fontSize: 12, color: AppColors.error),
          ),
        ] else if (document == null) ...[
          const SizedBox(height: 8),
          const Text(
            'Required — a director reviews it before your account opens.',
            style: TextStyle(fontSize: 12, color: AppColors.textMuted),
          ),
        ],
      ],
    );
  }

  static String _formatSize(int bytes) {
    if (bytes >= 1024 * 1024) {
      return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
    }
    if (bytes >= 1024) return '${(bytes / 1024).toStringAsFixed(0)} KB';
    return '$bytes B';
  }

  Widget _nameCard() {
    return RegistrationFormCard(
      icon: Icons.badge_outlined,
      title: 'Your name',
      subtitle: 'Use the name that appears on your valid ID.',
      children: [
        RegisterFormField(
          label: 'First name',
          controller: _firstname,
          textInputAction: TextInputAction.next,
          onChanged: _onFieldChanged,
        ),
        const SizedBox(height: 14),
        RegisterFormField(
          label: 'Middle name',
          hint: 'Optional',
          controller: _middleName,
          textInputAction: TextInputAction.next,
          onChanged: _onFieldChanged,
        ),
        const SizedBox(height: 14),
        RegisterFormField(
          label: 'Last name',
          controller: _lastname,
          textInputAction: TextInputAction.next,
          onChanged: _onFieldChanged,
        ),
      ],
    );
  }

  Widget _kindCard() {
    return RegistrationFormCard(
      icon: Icons.people_outline_rounded,
      title: 'Who are you registering as?',
      subtitle: 'Pick one — an organization adds a few extra details.',
      children: [
        RegistrationChoiceTile(
          icon: Icons.person_outline_rounded,
          title: 'Individual',
          description: 'You are applying for assistance for yourself.',
          isSelected: _profile.kind == BeneficiaryKind.individual,
          onTap: () => _selectKind(BeneficiaryKind.individual),
        ),
        const SizedBox(height: 12),
        RegistrationChoiceTile(
          icon: Icons.business_outlined,
          title: 'Organization',
          description: 'You represent a group, association, or institution.',
          isSelected: _profile.kind == BeneficiaryKind.organization,
          onTap: () => _selectKind(BeneficiaryKind.organization),
        ),
        if (_profile.kind == null) ...[
          const SizedBox(height: 10),
          const Text(
            'Select one to continue.',
            style: TextStyle(fontSize: 12, color: AppColors.textMuted),
          ),
        ],
      ],
    );
  }

  Widget _organizationCard() {
    return RegistrationFormCard(
      icon: Icons.apartment_outlined,
      title: 'Organization details',
      subtitle: 'Tell us about the group you are registering for.',
      children: [
        RegisterFormField(
          label: 'Organization name',
          hint: 'e.g. Barangay Malinis Women’s Association',
          controller: _organizationName,
          textInputAction: TextInputAction.next,
          onChanged: _onOrganizationFieldChanged,
        ),
        const SizedBox(height: 14),
        _dropdown(
          label: 'Organization type',
          hint: 'Select organization type',
          value: _profile.organizationType,
          items: BeneficiaryProfile.organizationTypes,
          onChanged: (value) {
            widget.onProfileChanged(_profile.copyWith(organizationType: value));
            setState(() {});
          },
        ),
        const SizedBox(height: 14),
        RegisterFormField(
          label: 'Your role in the organization',
          hint: 'e.g. President, Secretary, Member',
          controller: _organizationRole,
          textInputAction: TextInputAction.next,
          onChanged: _onOrganizationFieldChanged,
        ),
        const SizedBox(height: 14),
        RegisterFormField(
          label: 'Organization address',
          hint: 'Where the organization operates',
          controller: _organizationAddress,
          maxLines: 2,
          onChanged: _onOrganizationFieldChanged,
        ),
      ],
    );
  }

  Widget _personalCard() {
    return RegistrationFormCard(
      icon: Icons.person_outline_rounded,
      title: 'Personal information',
      subtitle: 'How the CARES team reaches and identifies you.',
      children: [
        _dropdown(
          label: 'Gender',
          hint: 'Select gender',
          value: _genders.contains(_gender) ? _gender : null,
          items: _genders,
          onChanged: (value) {
            setState(() => _gender = value ?? '');
            _notifyParent();
          },
        ),
        const SizedBox(height: 14),
        RegisterFormField(
          label: 'Age',
          controller: _age,
          keyboardType: TextInputType.number,
          textInputAction: TextInputAction.next,
          inputFormatters: [
            FilteringTextInputFormatter.digitsOnly,
            LengthLimitingTextInputFormatter(3),
          ],
          onChanged: _onFieldChanged,
        ),
        const SizedBox(height: 14),
        RegisterFormField(
          label: 'Phone number',
          hint: '+639XXXXXXXXX',
          controller: _phone,
          focusNode: _phoneFocus,
          errorText: widget.phoneError ?? philippinePhoneError(_phone.text),
          keyboardType: TextInputType.phone,
          textInputAction: TextInputAction.done,
          inputFormatters: const [PhilippinePhoneFormatter()],
          onChanged: _onFieldChanged,
        ),
      ],
    );
  }

  Widget _addressCard() {
    return RegistrationFormCard(
      icon: Icons.home_outlined,
      title: 'Home address',
      subtitle:
          'Start typing your barangay and pick it from the list — '
          'we fill in the city for you.',
      children: [
        AddressAutocompleteFields(
          value: _profile.address,
          onChanged: _onAddressChanged,
        ),
      ],
    );
  }

  Widget _dropdown({
    required String label,
    required String hint,
    required String? value,
    required List<String> items,
    required ValueChanged<String?> onChanged,
  }) {
    final selected = value != null && items.contains(value) ? value : null;

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
          key: ValueKey('$label-$selected'),
          isExpanded: true,
          initialValue: selected,
          items: items
              .map(
                (item) => DropdownMenuItem(
                  value: item,
                  child: Text(item, overflow: TextOverflow.ellipsis),
                ),
              )
              .toList(),
          onTap: () => FocusManager.instance.primaryFocus?.unfocus(),
          onChanged: (value) {
            FocusManager.instance.primaryFocus?.unfocus();
            onChanged(value);
          },
          decoration: InputDecoration(
            hintText: hint,
            filled: true,
            fillColor: AppColors.fieldFill,
          ),
        ),
      ],
    );
  }
}
