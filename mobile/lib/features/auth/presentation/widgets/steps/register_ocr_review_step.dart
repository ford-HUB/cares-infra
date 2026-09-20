import 'package:flutter/material.dart';
import 'package:mobile/core/utils/phone_number_format.dart';
import 'package:mobile/features/auth/presentation/utils/conflict_focus.dart';
import 'package:flutter/services.dart';
import 'package:mobile/core/constants/uclm_departments.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/auth/domain/register_ocr_sample.dart';
import 'package:mobile/features/auth/domain/registration_role_type.dart';
import 'package:mobile/features/auth/domain/volunteer_type.dart';
import 'package:mobile/features/auth/presentation/widgets/register_form_field.dart';
import 'package:mobile/features/auth/presentation/widgets/registration_form_card.dart';
import 'package:mobile/features/auth/services/location_service.dart';

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
  static final _graduationYears = List<String>.generate(
    DateTime.now().year - 1950 + 1,
    (index) => '${DateTime.now().year - index}',
  );
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
  late final FocusNode _phoneFocus;
  late final FocusNode _idNumberFocus;

  late String _gender;
  String? _selectedDepartment;
  String? _selectedCourse;
  String? _selectedYearLevel;
  String? _selectedCity;
  String? _selectedBarangay;
  String? _ageError;
  String? get graduationDateError {
    final monthText = _gradMonth.text.trim();
    final dayText = _gradDay.text.trim();
    final yearText = _gradYear.text.trim();

    // Don't show an error while the fields are still empty.
    if (monthText.isEmpty && dayText.isEmpty && yearText.isEmpty) {
      return null;
    }

    final month = int.tryParse(monthText);
    final day = int.tryParse(dayText);
    final year = int.tryParse(yearText);

    // Require all three parts.
    if (month == null || day == null || year == null) {
      return 'Please enter a valid graduation date.';
    }

    // Year must be 2026 or later.
    if (year < 2026) {
      return 'Graduation year must be 2026 or later.';
    }

    // Month must be 1-12.
    if (month < 1 || month > 12) {
      return 'Please enter a valid graduation date.';
    }

    // Check the actual number of days in the month.
    final daysInMonth = DateTime(year, month + 1, 0).day;

    if (day < 1 || day > daysInMonth) {
      return 'Please enter a valid graduation date.';
    }

    return null;
  }

  List<Location> _locations = [];
  List<String> _barangays = [];
  bool _loadingLocations = true;
  bool _loadingBarangays = false;

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
    _loadLocations();

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

  Future<void> _loadLocations() async {
    try {
      final locations = await LocationService.getCebuCitiesMunicipalities();

      if (!mounted) return;

      setState(() {
        _locations = locations;
        _loadingLocations = false;
      });
    } catch (e) {
      if (!mounted) return;

      setState(() {
        _locations = [];
        _loadingLocations = false;
      });

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Unable to load cities/municipalities: $e')),
      );
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
    _setControllerText(_address, enriched.currentAddress);
    _setControllerText(_phone, normalizePhilippinePhone(enriched.phoneNumber));
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
    _phoneFocus.dispose();
    _idNumberFocus.dispose();
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

  void _updateAddress() {
    if (_selectedCity != null && _selectedBarangay != null) {
      _address.text = '$_selectedBarangay, $_selectedCity';
    } else {
      _address.text = '';
    }
  }

  Future<void> _onCityChanged(String? cityName) async {
    final selectedLocation = _locations.firstWhere(
      (location) => location.name == cityName,
      orElse: () => const Location(code: '', name: '', type: ''),
    );

    setState(() {
      _selectedCity = cityName;
      _selectedBarangay = null;
      _barangays = [];
      _loadingBarangays = cityName != null;
    });

    _updateAddress();
    _notifyParent();

    if (cityName == null || selectedLocation.code.isEmpty) {
      setState(() {
        _loadingBarangays = false;
      });
      return;
    }

    try {
      final barangays = await LocationService.getBarangays(
        selectedLocation.code,
      );

      if (!mounted) return;

      setState(() {
        _barangays = barangays;
        _loadingBarangays = false;
      });
    } catch (e) {
      if (!mounted) return;

      setState(() {
        _barangays = [];
        _loadingBarangays = false;
      });

      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Unable to load barangays: $e')));
    }
  }

  String? get ageError {
    final value = _age.text.trim();

    if (value.isEmpty) {
      return 'Please enter your age.';
    }

    final age = int.tryParse(value);

    if (age == null || age < 12 || age > 80) {
      return 'Please enter a valid age to continue.';
    }

    return null;
  }

  void _notifyParent() {
    if (!mounted || widget.isExtracting || widget.extractFailed) return;

    final base = _effectiveData;
    final ageText = _age.text.trim();
    final age = int.tryParse(ageText);
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
        age: age != null && age >= 1 && age <= 100 ? age : 0,
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
            Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                RegisterFormField(
                  label: 'Age',
                  controller: _age,
                  keyboardType: TextInputType.number,
                  inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                  onChanged: (_) {
                    setState(() {});
                    _notifyParent();
                  },
                ),

                if (_age.text.trim().isNotEmpty &&
                    (int.tryParse(_age.text.trim()) == null ||
                        int.parse(_age.text.trim()) < 12 ||
                        int.parse(_age.text.trim()) > 80))
                  Container(
                    margin: const EdgeInsets.only(top: 8),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.red.withValues(alpha: 0.08),
                      border: Border.all(color: Colors.red),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Text(
                      'Please enter a correct age between 12 and 80 to continue.',
                      style: TextStyle(color: Colors.red, fontSize: 13),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 14),
            _dropdown(
              label: 'City / Municipality',
              value: _selectedCity,
              items: _locations.map((location) => location.name).toList(),
              hint: _loadingLocations
                  ? 'Loading Cities/Municipalities...'
                  : 'Select City / Municipality',
              enabled: !_loadingLocations && _locations.isNotEmpty,
              onChanged: _onCityChanged,
            ),

            const SizedBox(height: 14),
            _dropdown(
              label: 'Barangay',
              value: _selectedBarangay,
              items: _barangays,
              hint: _loadingBarangays
                  ? 'Loading barangays...'
                  : 'Select Barangay',
              enabled:
                  _selectedCity != null &&
                  !_loadingBarangays &&
                  _barangays.isNotEmpty,
              onChanged: (value) {
                setState(() {
                  _selectedBarangay = value;
                });
                _updateAddress();
                _notifyParent();
              },
            ),
            const SizedBox(height: 14),
            RegisterFormField(
              label: 'Address',
              controller: _address,
              maxLines: 2,
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
              _dropdown(
                label: 'Graduated year',
                value:
                    _gradYear.text.isNotEmpty &&
                        _graduationYears.contains(_gradYear.text)
                    ? _gradYear.text
                    : null,
                items: _graduationYears,
                hint: 'Select your graduation year',
                onChanged: (value) {
                  _gradYear.text = value ?? '';
                  _notifyParent();
                },
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
                      onChanged: (_) {
                        setState(() {});
                        _onGradMonthChanged(_gradMonth.text);
                      },
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
                      onChanged: (_) {
                        setState(() {});
                        _onGradDayChanged(_gradDay.text);
                      },
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
                      errorText: graduationDateError,
                      onChanged: (_) {
                        setState(() {});
                        _onGradYearChanged(_gradYear.text);
                      },
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
