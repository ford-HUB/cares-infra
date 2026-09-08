import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:mobile/core/constants/uclm_departments.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/auth/domain/register_ocr_sample.dart';
import 'package:mobile/features/auth/domain/registration_role_type.dart';
import 'package:mobile/features/auth/domain/volunteer_type.dart';
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
  late final TextEditingController _address;
  late final TextEditingController _phone;
  late final TextEditingController _idNumber;
  late final TextEditingController _yearLevel;
  late final TextEditingController _gradYear;
  late final TextEditingController _gradMonth;
  late final TextEditingController _gradDay;
  late final TextEditingController _volunteerTypeLabel;

  late final FocusNode _gradMonthFocus;
  late final FocusNode _gradDayFocus;
  late final FocusNode _gradYearFocus;

  late String _gender;
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
    _address = TextEditingController();
    _phone = TextEditingController();
    _idNumber = TextEditingController();
    _yearLevel = TextEditingController();
    _gradYear = TextEditingController();
    _gradMonth = TextEditingController();
    _gradDay = TextEditingController();
    _volunteerTypeLabel = TextEditingController(
      text: widget.volunteerType?.label ?? '',
    );
    _gradMonthFocus = FocusNode();
    _gradDayFocus = FocusNode();
    _gradYearFocus = FocusNode();
    _gender = '';

    if (!widget.isExtracting && !widget.extractFailed) {
      _applyData(widget.data);
    }
  }

  @override
  void didUpdateWidget(RegisterOcrReviewStep oldWidget) {
    super.didUpdateWidget(oldWidget);

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
    _setControllerText(_address, enriched.currentAddress);
    _setControllerText(_phone, enriched.phoneNumber);
    _setControllerText(_idNumber, enriched.idNumber);
    _setControllerText(_yearLevel, enriched.yearLevelName);
    _setControllerText(
      _gradYear,
      enriched.graduationYear > 0 ? '${enriched.graduationYear}' : '',
    );
    _setControllerText(
      _gradMonth,
      enriched.graduationMonth > 0 ? '${enriched.graduationMonth}' : '',
    );
    _setControllerText(
      _gradDay,
      enriched.graduationDay > 0 ? '${enriched.graduationDay}' : '',
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
    _address.dispose();
    _phone.dispose();
    _idNumber.dispose();
    _yearLevel.dispose();
    _gradYear.dispose();
    _gradMonth.dispose();
    _gradDay.dispose();
    _volunteerTypeLabel.dispose();
    _gradMonthFocus.dispose();
    _gradDayFocus.dispose();
    _gradYearFocus.dispose();
    super.dispose();
  }

  void _focusNextField(FocusNode next) {
    FocusScope.of(context).requestFocus(next);
  }

  void _onGradMonthChanged(String value) {
    _notifyParent();
    if (value.length >= 2) {
      _focusNextField(_gradDayFocus);
    }
  }

  void _onGradDayChanged(String value) {
    _notifyParent();
    if (value.length >= 2) {
      _focusNextField(_gradYearFocus);
    }
  }

  void _onGradYearChanged(String value) {
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
    final gradMonth = int.tryParse(_gradMonth.text.trim()) ?? 0;
    final gradDay = int.tryParse(_gradDay.text.trim()) ?? 0;

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
        age: age > 0 ? age : base.age,
        currentAddress: fieldOrParsed(_address.text, base.currentAddress),
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
        graduationYear: _isBeneficiary
            ? 0
            : (gradYear > 0 ? gradYear : base.graduationYear),
        graduationMonth: _isBeneficiary
            ? 0
            : (gradMonth > 0 ? gradMonth : base.graduationMonth),
        graduationDay: _isBeneficiary
            ? 0
            : (gradDay > 0 ? gradDay : base.graduationDay),
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
              keyboardType: TextInputType.number,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              onChanged: (_) => _notifyParent(),
            ),
            const SizedBox(height: 14),
            RegisterFormField(
              label: 'Address',
              controller: _address,
              maxLines: 2,
              onChanged: (_) => _notifyParent(),
            ),
            const SizedBox(height: 14),
            RegisterFormField(
              label: 'Phone number',
              controller: _phone,
              keyboardType: TextInputType.phone,
              onChanged: (_) => _notifyParent(),
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
                keyboardType: TextInputType.number,
                inputFormatters: _fourDigitInputFormatters,
                onChanged: _onGradYearChanged,
              ),
            ],
            if (_isStudent) ...[
              const SizedBox(height: 14),
              Text(
                'Graduation date',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: AppColors.secondary.withValues(alpha: 0.95),
                ),
              ),
              const SizedBox(height: 6),
              Row(
                children: [
                  Expanded(
                    child: RegisterFormField(
                      label: 'Month',
                      controller: _gradMonth,
                      focusNode: _gradMonthFocus,
                      keyboardType: TextInputType.number,
                      textInputAction: TextInputAction.next,
                      inputFormatters: _twoDigitInputFormatters,
                      onChanged: _onGradMonthChanged,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: RegisterFormField(
                      label: 'Day',
                      controller: _gradDay,
                      focusNode: _gradDayFocus,
                      keyboardType: TextInputType.number,
                      textInputAction: TextInputAction.next,
                      inputFormatters: _twoDigitInputFormatters,
                      onChanged: _onGradDayChanged,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    flex: 2,
                    child: RegisterFormField(
                      label: 'Year',
                      controller: _gradYear,
                      focusNode: _gradYearFocus,
                      keyboardType: TextInputType.number,
                      textInputAction: TextInputAction.done,
                      inputFormatters: _fourDigitInputFormatters,
                      onChanged: _onGradYearChanged,
                    ),
                  ),
                ],
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
