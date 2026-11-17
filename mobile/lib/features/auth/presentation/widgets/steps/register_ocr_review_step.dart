import 'dart:async';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:mobile/core/utils/phone_number_format.dart';
import 'package:mobile/features/auth/presentation/utils/conflict_focus.dart';
import 'package:flutter/services.dart';
import 'package:mobile/core/constants/partner_barangays.dart';
import 'package:mobile/core/constants/uclm_departments.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/auth/domain/id_extraction_review.dart';
import 'package:mobile/features/auth/domain/ph_address.dart';
import 'package:mobile/features/auth/domain/register_ocr_sample.dart';
import 'package:mobile/features/auth/domain/registration_role_type.dart';
import 'package:mobile/features/auth/domain/volunteer_field_rules.dart';
import 'package:mobile/features/auth/domain/volunteer_type.dart';
import 'package:mobile/features/auth/presentation/widgets/address_autocomplete_fields.dart';
import 'package:mobile/features/auth/presentation/widgets/id_extraction_flags_card.dart';
import 'package:mobile/features/auth/presentation/widgets/register_form_field.dart';
import 'package:mobile/features/auth/presentation/widgets/registration_document_card.dart';
import 'package:mobile/features/auth/presentation/widgets/registration_form_card.dart';

class RegisterOcrReviewStep extends StatefulWidget {
  const RegisterOcrReviewStep({
    super.key,
    required this.data,
    required this.roleType,
    this.volunteerType,
    required this.isExtracting,
    required this.extractFailed,
    required this.onChanged,
    this.phoneError,
    this.idNumberError,
    this.extractErrorMessage,
    this.extractionFlags = const [],
    this.onRetry,
    this.manualEntry = false,
    this.manualRegistration = false,
    this.unclearIdPhoto = false,
    this.studentBeneficiary = false,
    this.certificate,
    this.onCertificateChanged,
  }) : assert(
         roleType != RegistrationRoleType.volunteer || volunteerType != null,
         'volunteerType is required for volunteer registration',
       );

  final RegisterOcrSample data;
  final RegistrationRoleType roleType;
  final VolunteerType? volunteerType;
  final bool isExtracting;
  final bool extractFailed;
  final String? extractErrorMessage;

  /// Extracted fields that are missing or doubtful (see [IdExtractionReview]).
  final List<IdFieldFlag> extractionFlags;
  final VoidCallback? onRetry;
  final ValueChanged<RegisterOcrSample> onChanged;

  /// The details are typed in rather than read off the ID — an alumni or
  /// partner-barangay ID is not scanned — so the copy asks for them instead of
  /// asking to correct a scan.
  final bool manualEntry;

  /// A volunteer manual registration: the app could not recognize the ID, so
  /// the details are typed in and a director checks them against it.
  final bool manualRegistration;

  /// The registrant continued with an ID photo the check said is not clear,
  /// so whatever was read off it may be wrong: every field — the ID number
  /// included — stays open, and a notice asks them to correct it.
  final bool unclearIdPhoto;

  /// A beneficiary who signed up as a student: their UC school ID was read
  /// like a student volunteer's, so the school information is collected.
  final bool studentBeneficiary;

  /// The document a director reviews with the sign-up: an alumnus's Certificate
  /// of Graduation, or a partner-barangay volunteer's supporting document. The
  /// card is shown only when [onCertificateChanged] is set.
  final PlatformFile? certificate;
  final ValueChanged<PlatformFile?>? onCertificateChanged;

  /// Server-side conflicts on these inputs — shown inline and focused.
  final String? phoneError;
  final String? idNumberError;

  @override
  State<RegisterOcrReviewStep> createState() => _RegisterOcrReviewStepState();
}

class _RegisterOcrReviewStepState extends State<RegisterOcrReviewStep> {
  static const _genders = ['MALE', 'FEMALE', 'OTHER'];
  static const _yearLevels = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
  static final _twoDigitInputFormatters = [
    FilteringTextInputFormatter.digitsOnly,
    LengthLimitingTextInputFormatter(2),
  ];
  static final _fourDigitInputFormatters = [
    FilteringTextInputFormatter.digitsOnly,
    LengthLimitingTextInputFormatter(4),
  ];

  /// Alumni ID numbers are at most 8 characters.
  static const _alumniIdMaxLength = 8;
  static final _alumniIdInputFormatters = [
    LengthLimitingTextInputFormatter(_alumniIdMaxLength),
  ];

  /// In a manual registration a student ID is typed as 8 digits and a staff ID
  /// as 6 — both are digits only when sent.
  static final _manualStudentIdInputFormatters = [
    FilteringTextInputFormatter.digitsOnly,
    LengthLimitingTextInputFormatter(8),
  ];
  static final _manualStaffIdInputFormatters = [
    FilteringTextInputFormatter.digitsOnly,
    LengthLimitingTextInputFormatter(6),
  ];

  late final TextEditingController _firstname;
  late final TextEditingController _lastname;
  late final TextEditingController _middleName;
  late final TextEditingController _age;
  late final TextEditingController _phone;
  late final TextEditingController _idNumber;
  late final TextEditingController _yearLevel;
  late final TextEditingController _gradYear;
  late final TextEditingController _volunteerTypeLabel;

  late final FocusNode _gradYearFocus;
  late final FocusNode _phoneFocus;
  late final FocusNode _idNumberFocus;

  late String _gender;

  /// Errors on a blank field wait until the user has typed in it; a value
  /// that is filled in (typed or scanned) is checked straight away.
  bool _ageTouched = false;
  bool _gradYearTouched = false;

  /// Barangay + city picked from the directory and a typed street, pre-filled
  /// from whatever the ID scan read ([PhAddress.lenient]). Sent as
  /// [PhAddress.formatted] — empty while incomplete, which keeps Continue off.
  PhAddress _address = PhAddress.empty;

  /// Bumped whenever [_applyData] replaces [_address], so the address fields
  /// rebuild with the new pre-fill instead of keeping what they started with.
  int _addressRevision = 0;
  String? _selectedDepartment;
  String? _selectedCourse;
  String? _selectedYearLevel;
  String? _selectedPartnerBarangay;

  /// Set once the scan reads an ID number; the field is then locked so the
  /// number can only change by rescanning the ID.
  bool _idNumberVerified = false;

  /// The "kindly correct the extracted information" pop-up is shown once.
  bool _unclearNoticeShown = false;

  bool get _isBeneficiary =>
      widget.roleType == RegistrationRoleType.beneficiary;
  bool get _isStudent => widget.volunteerType == VolunteerType.student;
  bool get _isAlumni => widget.volunteerType == VolunteerType.alumni;

  /// Partner-barangay volunteers have no school record or ID number; they pick
  /// the partner barangay they volunteer with instead.
  bool get _isPartnerBarangay =>
      widget.volunteerType == VolunteerType.partnerBarangay;

  /// Neither beneficiaries nor partner-barangay volunteers fill in school info
  /// — except a student beneficiary, whose school ID was read.
  bool get _skipsSchoolInfo =>
      (_isBeneficiary && !widget.studentBeneficiary) || _isPartnerBarangay;

  /// Details read off a photo the check flagged — not typed in from scratch.
  bool get _correctsUnclearScan => widget.unclearIdPhoto && !widget.manualEntry;
  bool get _usesCourseField => _isStudent || _isAlumni;

  List<TextInputFormatter>? get _idNumberInputFormatters {
    if (_isAlumni) return _alumniIdInputFormatters;
    if (!widget.manualEntry) return null;
    return switch (widget.volunteerType) {
      VolunteerType.student => _manualStudentIdInputFormatters,
      VolunteerType.staff => _manualStaffIdInputFormatters,
      _ => null,
    };
  }
  bool get _isNonTeaching => UclmDepartments.isNonTeaching(_selectedDepartment);
  List<String>? get _gradeLevels =>
      UclmDepartments.gradeLevelsFor(_selectedDepartment);
  bool get _usesGradeLevels => _gradeLevels != null;

  List<String> get _yearLevelOptions => _gradeLevels ?? _yearLevels;

  List<String> get _courseOptions => _selectedDepartment == null
      ? const []
      : UclmDepartments.coursesFor(_selectedDepartment!);

  @override
  void initState() {
    super.initState();
    _firstname = TextEditingController();
    _lastname = TextEditingController();
    _middleName = TextEditingController();
    _age = TextEditingController();
    _phone = TextEditingController();
    _idNumber = TextEditingController();
    _yearLevel = TextEditingController();
    _gradYear = TextEditingController();
    _volunteerTypeLabel = TextEditingController(
      text: widget.volunteerType?.label ?? '',
    );
    _gradYearFocus = FocusNode();
    _phoneFocus = FocusNode();
    _idNumberFocus = FocusNode();
    _gender = '';

    if (!widget.isExtracting && !widget.extractFailed) {
      _applyData(widget.data);
    }
    _focusConflict();
  }

  /// Lands the cursor on whichever input the server rejected.
  void _focusConflict() {
    if (widget.phoneError != null) {
      focusConflictField(this, _phoneFocus);
    } else if (widget.idNumberError != null) {
      focusConflictField(this, _idNumberFocus);
    }
  }

  @override
  void didUpdateWidget(RegisterOcrReviewStep oldWidget) {
    super.didUpdateWidget(oldWidget);

    if ((widget.phoneError != null && oldWidget.phoneError == null) ||
        (widget.idNumberError != null && oldWidget.idNumberError == null)) {
      _focusConflict();
    }

    final extractionCompleted =
        oldWidget.isExtracting && !widget.isExtracting && !widget.extractFailed;

    if (extractionCompleted) {
      setState(() => _applyData(widget.data));
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted || widget.isExtracting || widget.extractFailed) return;
        _notifyParent();
        if (_correctsUnclearScan && !_unclearNoticeShown) {
          _unclearNoticeShown = true;
          unawaited(_showUnclearNotice());
        }
      });
    }
  }

  /// Asks the registrant to check what was read off their unclear ID photo.
  Future<void> _showUnclearNotice() {
    return showDialog<void>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        icon: const Icon(
          Icons.blur_on_rounded,
          color: AppColors.accentOrange,
          size: 34,
        ),
        title: const Text(
          'Your ID photo is blurry',
          textAlign: TextAlign.center,
          style: TextStyle(fontWeight: FontWeight.w800),
        ),
        content: const Text(
          'Because the picture of your ID isn\'t clear, some details may have '
          'been read wrong. Kindly check every field against your ID and '
          'correct the extracted information — all fields are open for '
          'editing.',
        ),
        actions: [
          FilledButton(
            key: const ValueKey('unclear-id-notice-ok'),
            onPressed: () => Navigator.of(dialogContext).pop(),
            style: FilledButton.styleFrom(backgroundColor: AppColors.primary),
            child: const Text('Review My Details'),
          ),
        ],
      ),
    );
  }

  RegisterOcrSample get _effectiveData => widget.data.enrichFromRawText();

  void _setControllerText(TextEditingController controller, String value) {
    if (controller.text == value) return;
    controller.value = TextEditingValue(
      text: value,
      selection: TextSelection.collapsed(offset: value.length),
    );
  }

  void _applyData(RegisterOcrSample data) {
    final enriched = data.enrichFromRawText();

    _setControllerText(_firstname, enriched.firstname);
    _setControllerText(_lastname, enriched.lastname);
    _setControllerText(_middleName, enriched.middleName);
    _setControllerText(_age, enriched.age > 0 ? '${enriched.age}' : '');
    _address = PhAddress.lenient(enriched.currentAddress);
    _addressRevision++;
    _setControllerText(_phone, normalizePhilippinePhone(enriched.phoneNumber));
    final idNumber = enriched.idNumber;
    _setControllerText(
      _idNumber,
      _isAlumni && idNumber.length > _alumniIdMaxLength
          ? idNumber.substring(0, _alumniIdMaxLength)
          : idNumber,
    );
    // Only lock a number both scans agree on. A flagged one (the scans
    // disagree, or only the on-device scan read it) may be misread digits, so
    // the user must be able to correct it against the card.
    _idNumberVerified =
        !widget.unclearIdPhoto &&
        enriched.idNumber.trim().isNotEmpty &&
        !widget.extractionFlags.any((flag) => flag.label == 'ID number');
    _setControllerText(_yearLevel, enriched.yearLevelName);
    _setControllerText(
      _gradYear,
      enriched.graduationYear > 0 ? '${enriched.graduationYear}' : '',
    );
    _volunteerTypeLabel.text = widget.volunteerType?.label ?? '';
    _selectedPartnerBarangay =
        PartnerBarangays.names.contains(enriched.partnerBarangay)
        ? enriched.partnerBarangay
        : null;

    if (enriched.gender.isNotEmpty && _genders.contains(enriched.gender)) {
      _gender = enriched.gender;
    }

    _selectedDepartment = UclmDepartments.matchDepartment(
      enriched.departmentName,
    );
    if (_selectedDepartment != null) {
      _selectedCourse = UclmDepartments.matchCourse(
        _selectedDepartment!,
        enriched.majorName,
      );
    } else {
      _selectedCourse = null;
    }

    final yearOptions = _yearLevelOptions;
    _selectedYearLevel = yearOptions.contains(enriched.yearLevelName)
        ? enriched.yearLevelName
        : null;
  }

  void _dismissKeyboard() {
    FocusManager.instance.primaryFocus?.unfocus();
  }

  @override
  void dispose() {
    _firstname.dispose();
    _lastname.dispose();
    _middleName.dispose();
    _age.dispose();
    _phone.dispose();
    _idNumber.dispose();
    _yearLevel.dispose();
    _gradYear.dispose();
    _volunteerTypeLabel.dispose();
    _gradYearFocus.dispose();
    _phoneFocus.dispose();
    _idNumberFocus.dispose();
    super.dispose();
  }

  String? get _ageError {
    if (_age.text.trim().isEmpty && !_ageTouched) return null;
    return VolunteerFieldRules.ageError(_age.text);
  }

  String? get _gradYearError {
    final type = widget.volunteerType;
    if (type == null) return null;
    if (_gradYear.text.trim().isEmpty && !_gradYearTouched) return null;
    return VolunteerFieldRules.graduationYearError(_gradYear.text, type);
  }

  void _onAgeChanged(String _) {
    setState(() => _ageTouched = true);
    _notifyParent();
  }

  void _onGradYearChanged(String value) {
    setState(() => _gradYearTouched = true);
    _notifyParent();
    if (value.length >= 4) {
      _gradYearFocus.unfocus();
    }
  }

  void _onDepartmentChanged(String? value) {
    setState(() {
      _selectedDepartment = value;
      _selectedCourse = null;
      if (_isStudent) {
        _selectedYearLevel = null;
        _yearLevel.text = '';
      }
    });
    _notifyParent();
  }

  void _onCourseChanged(String? value) {
    setState(() => _selectedCourse = value);
    _notifyParent();
  }

  void _onYearLevelChanged(String? value) {
    setState(() {
      _selectedYearLevel = value;
      _yearLevel.text = value ?? '';
    });
    _notifyParent();
  }

  void _notifyParent() {
    if (!mounted || widget.isExtracting || widget.extractFailed) return;

    final base = _effectiveData;
    final age = int.tryParse(_age.text.trim()) ?? 0;
    final gradYear = int.tryParse(_gradYear.text.trim()) ?? 0;

    String fieldOrParsed(String controllerValue, String parsedValue) {
      final trimmed = controllerValue.trim();
      return trimmed.isNotEmpty ? trimmed : parsedValue;
    }

    widget.onChanged(
      base.copyWith(
        firstname: fieldOrParsed(_firstname.text, base.firstname),
        lastname: fieldOrParsed(_lastname.text, base.lastname),
        middleName: fieldOrParsed(_middleName.text, base.middleName),
        gender: _gender.trim().isNotEmpty ? _gender : base.gender,
        // What is typed wins, so a cleared or invalid age keeps Continue off.
        age: age,
        // Never falls back to the raw scan: only a picked barangay + city count.
        currentAddress: _address.formatted,
        phoneNumber: fieldOrParsed(_phone.text, base.phoneNumber),
        idNumber: _isPartnerBarangay
            ? ''
            : fieldOrParsed(_idNumber.text, base.idNumber),
        departmentName: _skipsSchoolInfo
            ? ''
            : (_selectedDepartment ?? base.departmentName),
        majorName: _skipsSchoolInfo ? '' : (_selectedCourse ?? base.majorName),
        yearLevelName: _skipsSchoolInfo || _isNonTeaching
            ? ''
            : (_isStudent
                  ? fieldOrParsed(
                      _selectedYearLevel ?? _yearLevel.text,
                      base.yearLevelName,
                    )
                  : ''),
        // Only the year is collected; month/day are filled in at submit.
        graduationYear: _skipsSchoolInfo || _isNonTeaching ? 0 : gradYear,
        volunteerType: widget.volunteerType?.apiValue ?? base.volunteerType,
        partnerBarangay: _isPartnerBarangay
            ? (_selectedPartnerBarangay ?? '')
            : '',
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (widget.isExtracting) {
      return SizedBox(
        width: double.infinity,
        height: MediaQuery.sizeOf(context).height * 0.5,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const CircularProgressIndicator(color: AppColors.primary),
            const SizedBox(height: 24),
            Text(
              'Extracting ID data…',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w700,
                color: AppColors.primary,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Reading your ID card. This may take up to a minute.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 13, color: AppColors.textSecondary),
            ),
          ],
        ),
      );
    }

    if (widget.extractFailed) {
      return SizedBox(
        width: double.infinity,
        height: MediaQuery.sizeOf(context).height * 0.5,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 48, color: AppColors.primary),
            const SizedBox(height: 24),
            Text(
              'Could not read ID card',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w700,
                color: AppColors.primary,
              ),
            ),
            const SizedBox(height: 8),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Text(
                widget.extractErrorMessage ??
                    'ID extraction failed. Please try again.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 13, color: AppColors.textSecondary),
              ),
            ),
            const SizedBox(height: 24),
            if (widget.onRetry != null)
              OutlinedButton.icon(
                onPressed: widget.onRetry,
                icon: const Icon(Icons.refresh_rounded),
                label: const Text('Retry'),
              ),
          ],
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          decoration: BoxDecoration(
            color: _correctsUnclearScan
                ? AppColors.warning.withValues(alpha: 0.08)
                : AppColors.accentLight.withValues(alpha: 0.35),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: _correctsUnclearScan
                  ? AppColors.warning.withValues(alpha: 0.45)
                  : AppColors.borderLight,
            ),
          ),
          child: Row(
            children: [
              Icon(
                _correctsUnclearScan
                    ? Icons.report_gmailerrorred_rounded
                    : Icons.verified_outlined,
                size: 20,
                color: _correctsUnclearScan
                    ? AppColors.accentOrange
                    : AppColors.primaryDark,
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  _correctsUnclearScan
                      ? 'Your ID photo was blurry, so these details may be '
                            'misread. Check each one against your ID and correct '
                            'anything that is wrong.'
                      : _isPartnerBarangay
                      ? 'Enter your details exactly as they appear on your ID, '
                            'and pick your partner barangay — a director checks '
                            'them before your account opens.'
                      : widget.manualRegistration
                      ? 'Manual registration: enter your details exactly as they '
                            'appear on your ${_isAlumni ? 'alumni ID' : 'ID'} — a '
                            'director checks them against it before your account '
                            'opens.'
                      : widget.manualEntry
                      ? 'Enter your details exactly as they appear on your alumni '
                            'ID — a director checks them against it before your '
                            'account opens.'
                      : widget.studentBeneficiary
                      ? 'Correct anything the ID scan misread, and pick your '
                            'department and course from the lists.'
                      : 'Correct anything the ID scan misread. Volunteer type is '
                            'locked; pick your department and course from the lists.',
                  style: const TextStyle(
                    fontSize: 12.5,
                    height: 1.35,
                    fontWeight: FontWeight.w600,
                    color: AppColors.primaryDark,
                  ),
                ),
              ),
            ],
          ),
        ),
        if (widget.extractionFlags.isNotEmpty) ...[
          const SizedBox(height: 12),
          IdExtractionFlagsCard(flags: widget.extractionFlags),
        ],
        const SizedBox(height: 16),
        RegistrationFormCard(
          icon: Icons.person_outline_rounded,
          title: 'Personal Information',
          subtitle: _isPartnerBarangay
              ? 'As shown on your ID.'
              : widget.manualEntry
              ? (_isAlumni
                    ? 'As shown on your alumni ID.'
                    : 'As shown on your ID.')
              : 'Read off the front of your ID.',
          children: [
            RegisterFormField(
              label: 'First Name',
              controller: _firstname,
              textInputAction: TextInputAction.next,
              onChanged: (_) => _notifyParent(),
            ),
            const SizedBox(height: 14),
            RegisterFormField(
              label: 'Middle Name',
              hint: 'Optional',
              controller: _middleName,
              textInputAction: TextInputAction.next,
              onChanged: (_) => _notifyParent(),
            ),
            const SizedBox(height: 14),
            RegisterFormField(
              label: 'Last Name',
              controller: _lastname,
              textInputAction: TextInputAction.next,
              onChanged: (_) => _notifyParent(),
            ),
            const SizedBox(height: 14),
            _dropdown(
              label: 'Gender',
              value: _gender.isNotEmpty && _genders.contains(_gender)
                  ? _gender
                  : null,
              items: _genders,
              hint: 'Select Gender',
              onChanged: (v) {
                setState(() => _gender = v!);
                _notifyParent();
              },
            ),
            const SizedBox(height: 14),
            RegisterFormField(
              label: 'Age',
              controller: _age,
              errorText: _ageError,
              keyboardType: TextInputType.number,
              inputFormatters: _twoDigitInputFormatters,
              onChanged: _onAgeChanged,
            ),
            const SizedBox(height: 14),
            RegisterFormField(
              label: 'Phone Number',
              hint: '+639XXXXXXXXX',
              controller: _phone,
              focusNode: _phoneFocus,
              errorText: widget.phoneError ?? philippinePhoneError(_phone.text),
              keyboardType: TextInputType.phone,
              inputFormatters: const [PhilippinePhoneFormatter()],
              onChanged: (_) => _notifyParent(),
            ),
          ],
        ),
        const SizedBox(height: 16),
        RegistrationFormCard(
          icon: Icons.home_outlined,
          title: 'Home Address',
          subtitle: widget.manualEntry
              ? 'Type your street, and pick your barangay from the list — we '
                    'fill in the city.'
              : 'Filled in from your ID where we could read it. Check it, and '
                    'pick your barangay from the list — we fill in the city.',
          children: [
            AddressAutocompleteFields(
              key: ValueKey(_addressRevision),
              value: _address,
              onChanged: (address) {
                setState(() => _address = address);
                _notifyParent();
              },
            ),
          ],
        ),
        const SizedBox(height: 16),
        if (_isPartnerBarangay)
          RegistrationFormCard(
            icon: Icons.handshake_outlined,
            title: 'Partner Barangay',
            subtitle: 'The partner barangay you volunteer with.',
            children: [
              RegisterFormField(
                label: 'Type of Volunteer',
                controller: _volunteerTypeLabel,
                readOnly: true,
              ),
              const SizedBox(height: 14),
              _dropdown(
                label: 'Partnered Barangay',
                value: _selectedPartnerBarangay,
                items: PartnerBarangays.names,
                hint: 'Select Your Partner Barangay',
                isExpanded: true,
                onChanged: (value) {
                  setState(() => _selectedPartnerBarangay = value);
                  _notifyParent();
                },
              ),
            ],
          )
        else
          RegistrationFormCard(
            icon: Icons.school_outlined,
            title: 'School information',
            subtitle: 'Ties your account to your UC record.',
            children: [
              RegisterFormField(
                label: widget.manualEntry && _isAlumni
                    ? 'Alumni ID Number'
                    : 'ID Number',
                controller: _idNumber,
                focusNode: _idNumberFocus,
                inputFormatters: _idNumberInputFormatters,
                errorText: widget.idNumberError,
                readOnly: _idNumberVerified,
                onChanged: (_) => _notifyParent(),
              ),
              const SizedBox(height: 14),
              RegisterFormField(
                label: widget.studentBeneficiary
                    ? 'Type of Beneficiary'
                    : 'Type of Volunteer',
                controller: _volunteerTypeLabel,
                readOnly: true,
              ),
              const SizedBox(height: 14),
              _dropdown(
                label: 'Department',
                value: _selectedDepartment,
                items: UclmDepartments.names,
                hint: 'Select Your Department',
                isExpanded: true,
                onChanged: _onDepartmentChanged,
              ),
              if (_usesCourseField) ...[
                const SizedBox(height: 14),
                _dropdown(
                  label: _usesGradeLevels ? 'Program' : 'Course',
                  value: _selectedCourse,
                  items: _courseOptions,
                  hint: _selectedDepartment == null
                      ? 'Select a Department First'
                      : 'Select Your ${_usesGradeLevels ? 'Program' : 'Course'}',
                  isExpanded: true,
                  enabled:
                      _selectedDepartment != null && _courseOptions.isNotEmpty,
                  onChanged: _onCourseChanged,
                ),
              ],
              if (_isStudent && !_isNonTeaching) ...[
                const SizedBox(height: 14),
                _dropdown(
                  label: _usesGradeLevels ? 'Grade Level' : 'Year Level',
                  value: _selectedYearLevel,
                  hint:
                      'Select Your ${_usesGradeLevels ? 'Grade Level' : 'Year Level'}',
                  items: _yearLevelOptions,
                  onChanged: _onYearLevelChanged,
                ),
              ],
              if (_isAlumni && !_isNonTeaching) ...[
                const SizedBox(height: 14),
                RegisterFormField(
                  label: 'Graduated Year',
                  controller: _gradYear,
                  focusNode: _gradYearFocus,
                  errorText: _gradYearError,
                  keyboardType: TextInputType.number,
                  inputFormatters: _fourDigitInputFormatters,
                  onChanged: _onGradYearChanged,
                ),
              ],
              if (_isStudent && !_isNonTeaching) ...[
                const SizedBox(height: 14),
                RegisterFormField(
                  label: 'Expected Graduation Year',
                  hint: 'YYYY',
                  controller: _gradYear,
                  focusNode: _gradYearFocus,
                  errorText: _gradYearError,
                  keyboardType: TextInputType.number,
                  textInputAction: TextInputAction.done,
                  inputFormatters: _fourDigitInputFormatters,
                  onChanged: _onGradYearChanged,
                ),
              ],
            ],
          ),
        // Alumni close the form with their Certificate of Graduation, and
        // partner-barangay volunteers with a supporting document — the proof,
        // next to the uploaded ID, that the director reviews.
        if (widget.onCertificateChanged != null) ...[
          const SizedBox(height: 16),
          RegistrationDocumentCard(
            title: _isPartnerBarangay
                ? 'Supporting Document'
                : 'Certificate of Graduation',
            description: _isPartnerBarangay
                ? 'Attach a document that shows you volunteer with your partner '
                      'barangay — e.g. a barangay certification, endorsement or '
                      'clearance. A scan, photo, or PDF of it.'
                : 'Attach your Certificate of Graduation from UC — a scan, '
                      'photo, or PDF of it.',
            document: widget.certificate,
            onChanged: widget.onCertificateChanged!,
          ),
        ],
        const SizedBox(height: 8),
      ],
    );
  }

  Widget _dropdown({
    required String label,
    required String? value,
    required List<String> items,
    required ValueChanged<String?> onChanged,
    String? hint,
    bool enabled = true,
    bool isExpanded = false,
    String Function(String value)? itemLabel,
  }) {
    final display = itemLabel ?? (String v) => v;
    final selectedValue = value != null && items.contains(value) ? value : null;

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
          key: ValueKey('$label-$selectedValue-${items.length}'),
          isExpanded: isExpanded,
          initialValue: selectedValue,
          items: items
              .map(
                (e) => DropdownMenuItem(
                  value: e,
                  child: Text(display(e), overflow: TextOverflow.ellipsis),
                ),
              )
              .toList(),
          onTap: enabled ? _dismissKeyboard : null,
          onChanged: enabled
              ? (value) {
                  _dismissKeyboard();
                  onChanged(value);
                }
              : null,
          decoration: InputDecoration(
            hintText: hint ?? label,
            filled: true,
            fillColor: enabled
                ? AppColors.fieldFill
                : AppColors.fieldFill.withValues(alpha: 0.6),
          ),
        ),
      ],
    );
  }
}
