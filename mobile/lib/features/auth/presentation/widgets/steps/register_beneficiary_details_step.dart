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
import 'package:mobile/features/auth/presentation/widgets/registration_document_card.dart';
import 'package:mobile/features/auth/presentation/widgets/registration_form_card.dart';

/// Regular beneficiaries type everything in and attach a supporting document
/// for the approving director. Picking Student hands off to the ID upload, face
/// scan and review steps.
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

  /// The flat `current_address` is the formatted form, or empty while
  /// incomplete so the step can't continue.
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
      widget.onProfileChanged(_profile.asOrganization());
    }
    FocusManager.instance.primaryFocus?.unfocus();
    setState(() {});
  }

  void _selectCategory(BeneficiaryCategory category) {
    widget.onProfileChanged(_profile.copyWith(category: category));
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
    // A student's details come from their ID on the next steps.
    if (_profile.isStudent) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _kindCard(),
          const SizedBox(height: 16),
          _personalCard(),
          const SizedBox(height: 8),
        ],
      );
    }

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

  Widget _documentCard() => RegistrationDocumentCard(
    title: 'Supporting Document',
    description:
        'Attach a file that supports your registration — a barangay '
        'certificate, valid ID, or similar.',
    document: widget.document,
    onChanged: widget.onDocumentChanged,
  );

  Widget _nameCard() {
    return RegistrationFormCard(
      icon: Icons.badge_outlined,
      title: 'Personal Information',
      subtitle: 'Use the name that appears on your valid ID.',
      children: [
        RegisterFormField(
          label: 'First Name',
          controller: _firstname,
          textInputAction: TextInputAction.next,
          onChanged: _onFieldChanged,
        ),
        const SizedBox(height: 14),
        RegisterFormField(
          label: 'Middle Name',
          hint: 'Optional',
          controller: _middleName,
          textInputAction: TextInputAction.next,
          onChanged: _onFieldChanged,
        ),
        const SizedBox(height: 14),
        RegisterFormField(
          label: 'Last Name',
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
      title: 'Who Are You Registering As?',
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
      title: 'Organization Details',
      subtitle: 'Tell us about the group you are registering for.',
      children: [
        RegisterFormField(
          label: 'Organization Name',
          hint: 'e.g. Barangay Malinis Women’s Association',
          controller: _organizationName,
          textInputAction: TextInputAction.next,
          onChanged: _onOrganizationFieldChanged,
        ),
        const SizedBox(height: 14),
        _dropdown(
          label: 'Organization Type',
          hint: 'Select Organization Type',
          value: _profile.organizationType,
          items: BeneficiaryProfile.organizationTypes,
          onChanged: (value) {
            widget.onProfileChanged(_profile.copyWith(organizationType: value));
            setState(() {});
          },
        ),
        const SizedBox(height: 14),
        RegisterFormField(
          label: 'Your Role in the Organization',
          hint: 'e.g. President, Secretary, Member',
          controller: _organizationRole,
          textInputAction: TextInputAction.next,
          onChanged: _onOrganizationFieldChanged,
        ),
        const SizedBox(height: 14),
        RegisterFormField(
          label: 'Organization Address',
          hint: 'Where the Organization Operates',
          controller: _organizationAddress,
          maxLines: 2,
          onChanged: _onOrganizationFieldChanged,
        ),
      ],
    );
  }

  List<Widget> _categoryChoice() {
    return [
      Text(
        'Beneficiary Type',
        style: TextStyle(
          fontSize: 13,
          fontWeight: FontWeight.w600,
          color: AppColors.textSecondary,
        ),
      ),
      const SizedBox(height: 8),
      RegistrationChoiceTile(
        key: const ValueKey('beneficiary-category-regular'),
        icon: Icons.person_outline_rounded,
        title: 'Regular',
        description:
            'Fill in your details and attach a supporting document. '
            'A CARES director approves your account.',
        isSelected: _profile.category == BeneficiaryCategory.regular,
        onTap: () => _selectCategory(BeneficiaryCategory.regular),
      ),
      const SizedBox(height: 12),
      RegistrationChoiceTile(
        key: const ValueKey('beneficiary-category-student'),
        icon: Icons.school_outlined,
        title: 'Student',
        description:
            'A UC student: upload your school ID and scan your '
            'face, like a student volunteer. No approval wait.',
        isSelected: _profile.category == BeneficiaryCategory.student,
        onTap: () => _selectCategory(BeneficiaryCategory.student),
      ),
      if (_profile.category == null) ...[
        const SizedBox(height: 10),
        const Text(
          'Select one to continue.',
          style: TextStyle(fontSize: 12, color: AppColors.textMuted),
        ),
      ],
    ];
  }

  Widget _studentNote() {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.accentLight.withValues(alpha: 0.35),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.borderLight),
      ),
      child: const Text(
        'Next, upload your UC school ID and scan your face. Your name, '
        'department and course are read off the ID for you to check. As a '
        'student beneficiary you also see your department\'s School events, '
        'and your Volunteer side is unlocked too.',
        style: TextStyle(
          fontSize: 12.5,
          height: 1.4,
          fontWeight: FontWeight.w600,
          color: AppColors.primaryDark,
        ),
      ),
    );
  }

  Widget _personalCard() {
    if (_profile.isStudent) {
      return RegistrationFormCard(
        icon: Icons.person_outline_rounded,
        title: 'Personal Information',
        subtitle: 'Tell us whether you are a regular beneficiary or a student.',
        children: [
          ..._categoryChoice(),
          const SizedBox(height: 14),
          _studentNote(),
        ],
      );
    }

    return RegistrationFormCard(
      icon: Icons.person_outline_rounded,
      title: 'Personal Information',
      subtitle: 'How the CARES team reaches and identifies you.',
      children: [
        if (_profile.isIndividual) ...[
          ..._categoryChoice(),
          const SizedBox(height: 16),
        ],
        _dropdown(
          label: 'Gender',
          hint: 'Select Gender',
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
          label: 'Phone Number',
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
      title: 'Home Address',
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
            color: AppColors.textSecondary,
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
