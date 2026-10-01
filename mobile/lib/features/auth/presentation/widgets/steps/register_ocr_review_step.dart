import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:mobile/core/utils/phone_number_format.dart';
import 'package:mobile/features/auth/presentation/utils/conflict_focus.dart';
import 'package:flutter/services.dart';
import 'package:mobile/core/constants/uclm_departments.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/auth/domain/ph_address.dart';
import 'package:mobile/features/auth/domain/register_ocr_sample.dart';
import 'package:mobile/features/auth/domain/registration_role_type.dart';
import 'package:mobile/features/auth/domain/volunteer_field_rules.dart';
import 'package:mobile/features/auth/domain/volunteer_type.dart';
import 'package:mobile/features/auth/presentation/widgets/address_autocomplete_fields.dart';
import 'package:mobile/features/auth/presentation/widgets/register_form_field.dart';
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
    this.onRetry,
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
  final VoidCallback? onRetry;
  final ValueChanged<RegisterOcrSample> onChanged;

  /// Server-side conflicts on these inputs — shown inline and focused.
  final String? phoneError;
  final String? idNumberError;

  @override
  State<RegisterOcrReviewStep> createState() => _RegisterOcrReviewStepState();
}

class _RegisterOcrReviewStepState extends State<RegisterOcrReviewStep> {
  static const _genders = ['MALE', 'FEMALE', 'OTHER'];
  static const _yearLevels = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
  static const _shsGradeLevels = ['Grade 11', 'Grade 12'];
  static final _twoDigitInputFormatters = [
    FilteringTextInputFormatter.digitsOnly,
    LengthLimitingTextInputFormatter(2),
  ];
  static final _fourDigitInputFormatters = [
    FilteringTextInputFormatter.digitsOnly,
    LengthLimitingTextInputFormatter(4),
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

  bool get _isBeneficiary =>
      widget.roleType == RegistrationRoleType.beneficiary;
  bool get _isStudent => widget.volunteerType == VolunteerType.student;
  bool get _isAlumni => widget.volunteerType == VolunteerType.alumni;
  bool get _usesCourseField => _isStudent || _isAlumni;
  bool get _isSeniorHigh => _selectedDepartment == 'Senior High Department';

  List<String> get _yearLevelOptions =>
      _isSeniorHigh ? _shsGradeLevels : _yearLevels;

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
      });
    }
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
    _setControllerText(_idNumber, enriched.idNumber);
    _setControllerText(_yearLevel, enriched.yearLevelName);
    _setControllerText(
      _gradYear,
      enriched.graduationYear > 0 ? '${enriched.graduationYear}' : '',
    );
    _volunteerTypeLabel.text = widget.volunteerType?.label ?? '';

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
        idNumber: fieldOrParsed(_idNumber.text, base.idNumber),
        departmentName: _isBeneficiary
            ? ''
            : (_selectedDepartment ?? base.departmentName),
        majorName: _isBeneficiary ? '' : (_selectedCourse ?? base.majorName),
        yearLevelName: _isBeneficiary
            ? ''
            : (_isStudent
                  ? fieldOrParsed(
                      _selectedYearLevel ?? _yearLevel.text,
                      base.yearLevelName,
                    )
                  : ''),
        // Only the year is collected; month/day are filled in at submit.
        graduationYear: _isBeneficiary ? 0 : gradYear,
        volunteerType: widget.volunteerType?.apiValue ?? base.volunteerType,
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
              style: TextStyle(
                fontSize: 13,
                color: AppColors.secondary.withValues(alpha: 0.85),
              ),
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
                style: TextStyle(
                  fontSize: 13,
                  color: AppColors.secondary.withValues(alpha: 0.85),
                ),
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
            color: AppColors.accentLight.withValues(alpha: 0.35),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppColors.borderLight),
          ),
          child: const Row(
            children: [
              Icon(
                Icons.verified_outlined,
                size: 20,
                color: AppColors.primaryDark,
              ),
              SizedBox(width: 10),
              Expanded(
                child: Text(
                  'Correct anything the ID scan misread. Volunteer type is '
                  'locked; pick your department and course from the lists.',
                  style: TextStyle(
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
        const SizedBox(height: 16),
        RegistrationFormCard(
          icon: Icons.person_outline_rounded,
          title: 'Personal information',
          subtitle: 'Read off the front of your ID.',
          children: [
            RegisterFormField(
              label: 'First name',
              controller: _firstname,
              textInputAction: TextInputAction.next,
              onChanged: (_) => _notifyParent(),
            ),
            const SizedBox(height: 14),
            RegisterFormField(
              label: 'Middle name',
              hint: 'Optional',
              controller: _middleName,
              textInputAction: TextInputAction.next,
              onChanged: (_) => _notifyParent(),
            ),
            const SizedBox(height: 14),
            RegisterFormField(
              label: 'Last name',
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
              hint: 'Select gender',
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
              label: 'Phone number',
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
          title: 'Home address',
          subtitle:
              'Filled in from your ID where we could read it. Check it, and '
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
        RegistrationFormCard(
          icon: Icons.school_outlined,
          title: 'School information',
          subtitle: 'Ties your account to your UC record.',
          children: [
            RegisterFormField(
              label: 'ID number',
              controller: _idNumber,
              focusNode: _idNumberFocus,
              errorText: widget.idNumberError,
              onChanged: (_) => _notifyParent(),
            ),
            const SizedBox(height: 14),
            RegisterFormField(
              label: 'Type of volunteer',
              controller: _volunteerTypeLabel,
              readOnly: true,
            ),
            const SizedBox(height: 14),
            _dropdown(
              label: 'Department',
              value: _selectedDepartment,
              items: UclmDepartments.names,
              hint: 'Select your department',
              isExpanded: true,
              onChanged: _onDepartmentChanged,
            ),
            if (_usesCourseField) ...[
              const SizedBox(height: 14),
              _dropdown(
                label: _isSeniorHigh ? 'Strand' : 'Course',
                value: _selectedCourse,
                items: _courseOptions,
                hint: _selectedDepartment == null
                    ? 'Select a department first'
                    : 'Select your ${_isSeniorHigh ? 'strand' : 'course'}',
                isExpanded: true,
                enabled:
                    _selectedDepartment != null && _courseOptions.isNotEmpty,
                onChanged: _onCourseChanged,
              ),
            ],
            if (_isStudent) ...[
              const SizedBox(height: 14),
              _dropdown(
                label: _isSeniorHigh ? 'Grade level' : 'Year level',
                value: _selectedYearLevel,
                hint:
                    'Select your ${_isSeniorHigh ? 'grade level' : 'year level'}',
                items: _yearLevelOptions,
                onChanged: _onYearLevelChanged,
              ),
            ],
            if (_isAlumni) ...[
              const SizedBox(height: 14),
              RegisterFormField(
                label: 'Graduated year',
                controller: _gradYear,
                focusNode: _gradYearFocus,
                errorText: _gradYearError,
                keyboardType: TextInputType.number,
                inputFormatters: _fourDigitInputFormatters,
                onChanged: _onGradYearChanged,
              ),
            ],
            if (_isStudent) ...[
              const SizedBox(height: 14),
              RegisterFormField(
                label: 'Expected graduation year',
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
            color: AppColors.secondary.withValues(alpha: 0.95),
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
