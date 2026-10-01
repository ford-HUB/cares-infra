import 'package:flutter/material.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/auth/domain/ph_address.dart';
import 'package:mobile/features/auth/presentation/widgets/register_form_field.dart';

/// Barangay → City/Municipality → Street, each with search-as-you-type
/// suggestions from [PhAddressDirectory].
///
/// Barangay and city only count once picked from the list, and picking a
/// barangay fills in its city, so the pair can never disagree. The street is
/// free text, suggested from the chosen barangay's known roads.
class AddressAutocompleteFields extends StatefulWidget {
  const AddressAutocompleteFields({
    super.key,
    required this.value,
    required this.onChanged,
  });

  final PhAddress value;
  final ValueChanged<PhAddress> onChanged;

  @override
  State<AddressAutocompleteFields> createState() =>
      _AddressAutocompleteFieldsState();
}

class _AddressAutocompleteFieldsState extends State<AddressAutocompleteFields> {
  late final TextEditingController _barangay;
  late final TextEditingController _city;
  late final TextEditingController _street;
  final _barangayFocus = FocusNode();
  final _cityFocus = FocusNode();
  final _streetFocus = FocusNode();

  // Errors wait until the person has left a field once.
  bool _barangayTouched = false;
  bool _cityTouched = false;
  bool _streetTouched = false;

  PhAddress get _value => widget.value;

  @override
  void initState() {
    super.initState();
    _barangay = TextEditingController(text: _value.barangay?.name ?? '');
    _city = TextEditingController(text: _value.locality?.name ?? '');
    _street = TextEditingController(text: _value.street);
    _barangayFocus.addListener(
      () => _onBlur(_barangayFocus, () => _barangayTouched = true),
    );
    _cityFocus.addListener(
      () => _onBlur(_cityFocus, () => _cityTouched = true),
    );
    _streetFocus.addListener(
      () => _onBlur(_streetFocus, () => _streetTouched = true),
    );
  }

  void _onBlur(FocusNode node, VoidCallback markTouched) {
    if (!node.hasFocus && mounted) setState(markTouched);
  }

  @override
  void dispose() {
    _barangay.dispose();
    _city.dispose();
    _street.dispose();
    _barangayFocus.dispose();
    _cityFocus.dispose();
    _streetFocus.dispose();
    super.dispose();
  }

  // ---------------------------------------------------------------------------
  // Barangay
  // ---------------------------------------------------------------------------

  void _onBarangayTyped(String text) {
    // Any edit after a pick un-picks it until a suggestion is chosen again.
    if (_value.barangay != null && text != _value.barangay!.name) {
      widget.onChanged(_value.withBarangay(null));
    }
    setState(() {});
  }

  void _onBarangaySelected(PhBarangay barangay) {
    _city.text = barangay.locality.name;
    widget.onChanged(_value.withBarangay(barangay));
    setState(() => _cityTouched = true);
    _streetFocus.requestFocus();
  }

  String? get _barangayError {
    if (_value.barangay != null) return null;
    if (!_barangayTouched) return null;
    return _barangay.text.trim().isEmpty
        ? 'Barangay is required.'
        : 'Pick your barangay from the suggestions.';
  }

  // ---------------------------------------------------------------------------
  // City / Municipality
  // ---------------------------------------------------------------------------

  void _onCityTyped(String text) {
    if (_value.locality != null && text != _value.locality!.name) {
      _clearBarangayIfOrphaned(_value.withLocality(null));
    }
    setState(() {});
  }

  void _onCitySelected(PhLocality locality) {
    _clearBarangayIfOrphaned(_value.withLocality(locality));
    setState(() {});
    if (_value.barangay == null || _value.barangay!.locality != locality) {
      _barangayFocus.requestFocus();
    }
  }

  void _clearBarangayIfOrphaned(PhAddress next) {
    if (next.barangay == null && _value.barangay != null) _barangay.clear();
    widget.onChanged(next);
  }

  String? get _cityError {
    if (_value.locality != null) return null;
    if (!_cityTouched) return null;
    return _city.text.trim().isEmpty
        ? 'City/Municipality is required.'
        : 'Pick your city or municipality from the suggestions.';
  }

  // ---------------------------------------------------------------------------
  // Street
  // ---------------------------------------------------------------------------

  void _onStreetTyped(String text) {
    _typedStreet = text;
    _updateStreet(text);
  }

  void _updateStreet(String text) {
    widget.onChanged(_value.copyWith(street: text.trim()));
    setState(() {});
  }

  void _onStreetSelected(String street) {
    // Keep a house / lot number already typed in front of the street name.
    final houseNo = RegExp(r'^\s*(\S*\d\S*)\s+').firstMatch(_typedStreet);
    final text = houseNo == null ? street : '${houseNo.group(1)} $street';
    _street.value = TextEditingValue(
      text: text,
      selection: TextSelection.collapsed(offset: text.length),
    );
    _updateStreet(text);
  }

  // What the person last typed — a picked suggestion replaces the field text.
  String _typedStreet = '';

  String? get _streetError =>
      _streetTouched ? PhAddress.streetError(_street.text) : null;

  // ---------------------------------------------------------------------------
  // Build
  // ---------------------------------------------------------------------------

  @override
  Widget build(BuildContext context) {
    final formatted = _value.formatted;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _AutocompleteField<PhBarangay>(
          label: 'Barangay',
          hint: 'Start typing, e.g. Looc',
          controller: _barangay,
          focusNode: _barangayFocus,
          errorText: _barangayError,
          pickedTitle: _value.barangay?.name,
          optionsBuilder: (query) => PhAddressDirectory.searchBarangays(
            query,
            locality: _value.locality,
          ),
          titleOf: (b) => b.name,
          subtitleOf: (b) => '${b.locality.name}, ${b.locality.province}',
          onTyped: _onBarangayTyped,
          onSelected: _onBarangaySelected,
          emptyMessage: _value.locality == null
              ? 'No matching barangay in our service area.'
              : 'No matching barangay in ${_value.locality!.name}.',
        ),
        const SizedBox(height: 14),
        _AutocompleteField<PhLocality>(
          label: 'City/Municipality',
          hint: 'Filled in when you pick a barangay',
          controller: _city,
          focusNode: _cityFocus,
          errorText: _cityError,
          pickedTitle: _value.locality?.name,
          optionsBuilder: PhAddressDirectory.searchLocalities,
          titleOf: (l) => l.name,
          subtitleOf: (l) => l.province,
          onTyped: _onCityTyped,
          onSelected: _onCitySelected,
          emptyMessage: 'No matching city or municipality in our service area.',
        ),
        const SizedBox(height: 14),
        _AutocompleteField<String>(
          label: 'Street',
          hint: 'House no., street / sitio',
          controller: _street,
          focusNode: _streetFocus,
          errorText: _streetError,
          optionsBuilder: (query) {
            // Suggest on the street-name part, not the house number.
            final name = query.replaceFirst(RegExp(r'^\s*\S*\d\S*\s*'), '');
            return PhAddressDirectory.searchStreets(name, _value.barangay);
          },
          titleOf: (s) => s,
          subtitleOf: (_) => _value.barangay?.label ?? '',
          onTyped: _onStreetTyped,
          onSelected: _onStreetSelected,
        ),
        if (formatted.isNotEmpty) ...[
          const SizedBox(height: 12),
          _AddressPreview(address: formatted),
        ],
      ],
    );
  }
}

/// [RegisterFormField] with a suggestions dropdown under it.
class _AutocompleteField<T extends Object> extends StatelessWidget {
  const _AutocompleteField({
    required this.label,
    required this.hint,
    required this.controller,
    required this.focusNode,
    required this.errorText,
    this.pickedTitle,
    required this.optionsBuilder,
    required this.titleOf,
    required this.subtitleOf,
    required this.onTyped,
    required this.onSelected,
    this.emptyMessage,
  });

  final String label;
  final String hint;
  final TextEditingController controller;
  final FocusNode focusNode;
  final String? errorText;

  /// Name of the confirmed pick; null while nothing valid is picked.
  final String? pickedTitle;

  bool get isPicked => pickedTitle != null;
  final List<T> Function(String query) optionsBuilder;
  final String Function(T) titleOf;
  final String Function(T) subtitleOf;
  final ValueChanged<String> onTyped;
  final ValueChanged<T> onSelected;

  /// Shown when a typed query matches nothing; null hides the dropdown.
  final String? emptyMessage;

  @override
  Widget build(BuildContext context) {
    return RawAutocomplete<T>(
      textEditingController: controller,
      focusNode: focusNode,
      displayStringForOption: titleOf,
      optionsBuilder: (value) {
        // Nothing to suggest while the field still shows the confirmed pick.
        if (value.text == pickedTitle) return const [];
        final options = optionsBuilder(value.text);
        return options.take(30);
      },
      onSelected: onSelected,
      fieldViewBuilder: (context, controller, focusNode, onSubmitted) {
        return RegisterFormField(
          label: label,
          hint: hint,
          controller: controller,
          focusNode: focusNode,
          errorText: errorText ?? _noMatchError(),
          textInputAction: TextInputAction.next,
          onChanged: onTyped,
          onSubmitted: (_) => onSubmitted(),
          suffixIcon: isPicked
              ? const Icon(
                  Icons.check_circle,
                  color: AppColors.primary,
                  size: 20,
                )
              : Icon(
                  Icons.search_rounded,
                  size: 20,
                  color: AppColors.secondary.withValues(alpha: 0.7),
                ),
        );
      },
      optionsViewBuilder: (context, onSelect, options) {
        return Align(
          alignment: Alignment.topLeft,
          child: Material(
            elevation: 6,
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(12),
            clipBehavior: Clip.antiAlias,
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxHeight: 240),
              child: ListView.separated(
                padding: const EdgeInsets.symmetric(vertical: 4),
                shrinkWrap: true,
                itemCount: options.length,
                separatorBuilder: (_, _) =>
                    const Divider(height: 1, color: AppColors.borderLight),
                itemBuilder: (context, index) {
                  final option = options.elementAt(index);
                  final subtitle = subtitleOf(option);
                  final highlighted =
                      AutocompleteHighlightedOption.of(context) == index;
                  return ListTile(
                    dense: true,
                    tileColor: highlighted
                        ? AppColors.accentLight.withValues(alpha: 0.35)
                        : null,
                    leading: const Icon(
                      Icons.place_outlined,
                      size: 20,
                      color: AppColors.primary,
                    ),
                    title: Text(
                      titleOf(option),
                      style: const TextStyle(
                        fontWeight: FontWeight.w600,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    subtitle: subtitle.isEmpty
                        ? null
                        : Text(
                            subtitle,
                            style: const TextStyle(
                              fontSize: 12,
                              color: AppColors.textSecondary,
                            ),
                          ),
                    onTap: () => onSelect(option),
                  );
                },
              ),
            ),
          ),
        );
      },
    );
  }

  /// While typing, say so right away when nothing in the list can match.
  String? _noMatchError() {
    final message = emptyMessage;
    if (message == null || isPicked || !focusNode.hasFocus) return null;
    final query = controller.text.trim();
    if (query.length < 2) return null;
    return optionsBuilder(query).isEmpty ? message : null;
  }
}

class _AddressPreview extends StatelessWidget {
  const _AddressPreview({required this.address});

  final String address;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.background,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.borderLight),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.home_outlined, size: 18, color: AppColors.primary),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Shown on your profile as',
                  style: TextStyle(fontSize: 11, color: AppColors.textMuted),
                ),
                const SizedBox(height: 2),
                Text(
                  address,
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
