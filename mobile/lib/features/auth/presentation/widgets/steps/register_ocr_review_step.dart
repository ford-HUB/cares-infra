import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/auth/domain/register_ocr_sample.dart';
import 'package:mobile/features/auth/presentation/widgets/register_form_field.dart';

class RegisterOcrReviewStep extends StatefulWidget {
  const RegisterOcrReviewStep({
    super.key,
    required this.data,
    required this.isExtracting,
    required this.onChanged,
  });

  final RegisterOcrSample data;
  final bool isExtracting;
  final ValueChanged<RegisterOcrSample> onChanged;

  @override
  State<RegisterOcrReviewStep> createState() => _RegisterOcrReviewStepState();
}

class _RegisterOcrReviewStepState extends State<RegisterOcrReviewStep> {
  static const _genders = ['MALE', 'FEMALE', 'OTHER'];
  static const _roles = ['VOLUNTEER', 'DONOR', 'BENEFICIARY', 'ADMIN'];

  late final TextEditingController _firstname;
  late final TextEditingController _lastname;
  late final TextEditingController _middleName;
  late final TextEditingController _age;
  late final TextEditingController _address;
  late final TextEditingController _phone;
  late final TextEditingController _idNumber;
  late final TextEditingController _department;
  late final TextEditingController _major;
  late final TextEditingController _yearLevel;
  late final TextEditingController _gradYear;
  late final TextEditingController _gradMonth;
  late final TextEditingController _gradDay;

  late String _gender;
  late String _roleType;

  @override
  void initState() {
    super.initState();
    final data = widget.data;
    _firstname = TextEditingController(text: data.firstname);
    _lastname = TextEditingController(text: data.lastname);
    _middleName = TextEditingController(text: data.middleName);
    _age = TextEditingController(text: '${data.age}');
    _address = TextEditingController(text: data.currentAddress);
    _phone = TextEditingController(text: data.phoneNumber);
    _idNumber = TextEditingController(text: data.idNumber);
    _department = TextEditingController(text: data.departmentName);
    _major = TextEditingController(text: data.majorName);
    _yearLevel = TextEditingController(text: data.yearLevelName);
    _gradYear = TextEditingController(text: '${data.graduationYear}');
    _gradMonth = TextEditingController(text: '${data.graduationMonth}');
    _gradDay = TextEditingController(text: '${data.graduationDay}');
    _gender = data.gender;
    _roleType = data.roleType;
    WidgetsBinding.instance.addPostFrameCallback((_) => _notifyParent());
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
    _department.dispose();
    _major.dispose();
    _yearLevel.dispose();
    _gradYear.dispose();
    _gradMonth.dispose();
    _gradDay.dispose();
    super.dispose();
  }

  void _notifyParent() {
    final age = int.tryParse(_age.text.trim()) ?? 0;
    final gradYear = int.tryParse(_gradYear.text.trim()) ?? 0;
    final gradMonth = int.tryParse(_gradMonth.text.trim()) ?? 0;
    final gradDay = int.tryParse(_gradDay.text.trim()) ?? 0;

    widget.onChanged(
      widget.data.copyWith(
        firstname: _firstname.text.trim(),
        lastname: _lastname.text.trim(),
        middleName: _middleName.text.trim(),
        gender: _gender,
        age: age,
        currentAddress: _address.text.trim(),
        phoneNumber: _phone.text.trim(),
        idNumber: _idNumber.text.trim(),
        departmentName: _department.text.trim(),
        majorName: _major.text.trim(),
        yearLevelName: _yearLevel.text.trim(),
        graduationYear: gradYear,
        graduationMonth: gradMonth,
        graduationDay: gradDay,
        roleType: _roleType,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (widget.isExtracting) {
      return Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const SizedBox(height: 48),
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
            'OCR service not connected — sample data will be editable next',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 13,
              color: AppColors.secondary.withValues(alpha: 0.85),
            ),
          ),
        ],
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          'Review extracted data',
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.w800,
                color: AppColors.primaryDark,
              ),
        ),
        const SizedBox(height: 8),
        Text(
          'Correct any mistakes from the ID scan before continuing.',
          style: TextStyle(
            fontSize: 14,
            height: 1.45,
            color: AppColors.secondary.withValues(alpha: 0.9),
          ),
        ),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          decoration: BoxDecoration(
            color: AppColors.accent.withValues(alpha: 0.2),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: AppColors.accent.withValues(alpha: 0.5)),
          ),
          child: const Row(
            children: [
              Icon(Icons.edit_outlined, size: 20, color: AppColors.primaryDark),
              SizedBox(width: 8),
              Expanded(
                child: Text(
                  'All fields are editable — sample OCR preview',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: AppColors.primaryDark,
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),
        _sectionTitle('Personal information', Icons.person_outline),
        const SizedBox(height: 12),
        RegisterFormField(
          label: 'First name',
          controller: _firstname,
          onChanged: (_) => _notifyParent(),
        ),
        const SizedBox(height: 12),
        RegisterFormField(
          label: 'Middle name',
          controller: _middleName,
          onChanged: (_) => _notifyParent(),
        ),
        const SizedBox(height: 12),
        RegisterFormField(
          label: 'Last name',
          controller: _lastname,
          onChanged: (_) => _notifyParent(),
        ),
        const SizedBox(height: 12),
        _dropdown(
          label: 'Gender',
          value: _gender,
          items: _genders,
          onChanged: (v) {
            setState(() => _gender = v!);
            _notifyParent();
          },
        ),
        const SizedBox(height: 12),
        RegisterFormField(
          label: 'Age',
          controller: _age,
          keyboardType: TextInputType.number,
          inputFormatters: [FilteringTextInputFormatter.digitsOnly],
          onChanged: (_) => _notifyParent(),
        ),
        const SizedBox(height: 12),
        RegisterFormField(
          label: 'Address',
          controller: _address,
          maxLines: 2,
          onChanged: (_) => _notifyParent(),
        ),
        const SizedBox(height: 12),
        RegisterFormField(
          label: 'Phone number',
          controller: _phone,
          keyboardType: TextInputType.phone,
          onChanged: (_) => _notifyParent(),
        ),
        const SizedBox(height: 20),
        _sectionTitle('School information', Icons.school_outlined),
        const SizedBox(height: 12),
        RegisterFormField(
          label: 'ID number',
          controller: _idNumber,
          onChanged: (_) => _notifyParent(),
        ),
        const SizedBox(height: 12),
        RegisterFormField(
          label: 'Department',
          controller: _department,
          onChanged: (_) => _notifyParent(),
        ),
        const SizedBox(height: 12),
        RegisterFormField(
          label: 'Major',
          controller: _major,
          onChanged: (_) => _notifyParent(),
        ),
        const SizedBox(height: 12),
        RegisterFormField(
          label: 'Year level',
          controller: _yearLevel,
          onChanged: (_) => _notifyParent(),
        ),
        const SizedBox(height: 12),
        const Text(
          'Graduation date',
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: AppColors.primaryDark,
          ),
        ),
        const SizedBox(height: 6),
        Row(
          children: [
            Expanded(
              child: RegisterFormField(
                label: 'Month',
                controller: _gradMonth,
                keyboardType: TextInputType.number,
                onChanged: (_) => _notifyParent(),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: RegisterFormField(
                label: 'Day',
                controller: _gradDay,
                keyboardType: TextInputType.number,
                onChanged: (_) => _notifyParent(),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              flex: 2,
              child: RegisterFormField(
                label: 'Year',
                controller: _gradYear,
                keyboardType: TextInputType.number,
                onChanged: (_) => _notifyParent(),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        _dropdown(
          label: 'Role',
          value: _roleType,
          items: _roles,
          onChanged: (v) {
            setState(() => _roleType = v!);
            _notifyParent();
          },
        ),
        const SizedBox(height: 8),
      ],
    );
  }

  Widget _sectionTitle(String title, IconData icon) {
    return Row(
      children: [
        Icon(icon, size: 20, color: AppColors.primary),
        const SizedBox(width: 8),
        Text(
          title,
          style: const TextStyle(
            fontWeight: FontWeight.w700,
            fontSize: 16,
            color: AppColors.primaryDark,
          ),
        ),
      ],
    );
  }

  Widget _dropdown({
    required String label,
    required String value,
    required List<String> items,
    required ValueChanged<String?> onChanged,
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
          initialValue: value,
          items: items
              .map((e) => DropdownMenuItem(value: e, child: Text(e)))
              .toList(),
          onChanged: onChanged,
          decoration: InputDecoration(
            hintText: label,
            filled: true,
            fillColor: AppColors.fieldFill,
          ),
        ),
      ],
    );
  }
}
