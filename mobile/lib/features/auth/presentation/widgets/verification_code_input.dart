import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:mobile/core/theme/app_theme.dart';

class VerificationCodeInput extends StatefulWidget {
  const VerificationCodeInput({
    super.key,
    required this.code,
    required this.onChanged,
    this.enabled = true,
  });

  final String code;
  final ValueChanged<String> onChanged;
  final bool enabled;

  @override
  State<VerificationCodeInput> createState() => _VerificationCodeInputState();
}

class _VerificationCodeInputState extends State<VerificationCodeInput> {
  static const _length = 6;
  static const _boxHeight = 56.0;
  static const _boxSpacing = 6.0;

  late final TextEditingController _controller;
  late final FocusNode _focusNode;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(text: widget.code);
    _focusNode = FocusNode()..addListener(_onFocusChanged);
  }

  void _onFocusChanged() {
    if (mounted) setState(() {});
  }

  @override
  void didUpdateWidget(covariant VerificationCodeInput oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.code != _controller.text) {
      _controller.value = TextEditingValue(
        text: widget.code,
        selection: TextSelection.collapsed(offset: widget.code.length),
      );
    }
  }

  @override
  void dispose() {
    _focusNode
      ..removeListener(_onFocusChanged)
      ..dispose();
    _controller.dispose();
    super.dispose();
  }

  Widget _buildBox(String digit, bool active, bool filled) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 150),
      height: _boxHeight,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: AppColors.fieldFill,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: active
              ? AppColors.secondary
              : filled
              ? AppColors.primary
              : AppColors.fieldBorder,
          width: active ? 2 : 1,
        ),
      ),
      child: Text(
        digit,
        style: const TextStyle(
          fontSize: 22,
          fontWeight: FontWeight.w700,
          color: AppColors.primaryDark,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final digits = List<String>.generate(
      _length,
      (index) => index < widget.code.length ? widget.code[index] : '',
    );

    return SizedBox(
      height: _boxHeight,
      child: Stack(
        children: [
          IgnorePointer(
            child: Row(
              children: List.generate(_length, (index) {
                final filled = digits[index].isNotEmpty;
                final active =
                    widget.code.length == index && _focusNode.hasFocus;

                return Expanded(
                  child: Padding(
                    padding: EdgeInsets.only(
                      left: index == 0 ? 0 : _boxSpacing / 2,
                      right: index == _length - 1 ? 0 : _boxSpacing / 2,
                    ),
                    child: _buildBox(digits[index], active, filled),
                  ),
                );
              }),
            ),
          ),
          Positioned.fill(
            child: TextField(
              controller: _controller,
              focusNode: _focusNode,
              enabled: widget.enabled,
              autofocus: true,
              keyboardType: TextInputType.number,
              textInputAction: TextInputAction.done,
              maxLength: _length,
              showCursor: false,
              enableInteractiveSelection: false,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              style: const TextStyle(color: Colors.transparent, fontSize: 1),
              decoration: const InputDecoration(
                filled: true,
                fillColor: Colors.transparent,
                counterText: '',
                border: InputBorder.none,
                enabledBorder: InputBorder.none,
                focusedBorder: InputBorder.none,
                disabledBorder: InputBorder.none,
                contentPadding: EdgeInsets.zero,
                isCollapsed: true,
              ),
              onChanged: widget.onChanged,
            ),
          ),
        ],
      ),
    );
  }
}
