import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../core/theme/app_theme.dart';
import '../data/donation_store.dart';
import '../data/mock_donations.dart';
import '../widgets/donation_flow_widgets.dart';
import 'donation_receipt_screen.dart';

enum _Stage {
  chooseType,
  enterAmount,
  choosePayment,
  review,
  paymentProcessing,
  paymentSuccess,
  moneyDone,
  goodsSelectItem,
  goodsPickup,
  goodsReview,
  goodsStatus,
}

/// Multi-step donation flow. Static / front-end only: the payment step is
/// simulated with a delay and a donation record is created ONLY when the flow
/// reaches its final step.
///
/// Passing [existingDonation] opens the flow straight to the goods status /
/// details view for a donation that already exists (from My Donations).
class DonationFlowScreen extends StatefulWidget {
  const DonationFlowScreen({
    super.key,
    required this.campaign,
    required this.donorEmail,
    this.existingDonation,
  });

  final CaresDonation campaign;
  final String donorEmail;
  final UserDonation? existingDonation;

  static void open(
    BuildContext context, {
    required CaresDonation campaign,
    required String donorEmail,
  }) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) =>
            DonationFlowScreen(campaign: campaign, donorEmail: donorEmail),
      ),
    );
  }

  /// Opens the goods donation status / details view for an existing donation.
  static void openStatus(
    BuildContext context, {
    required CaresDonation campaign,
    required String donorEmail,
    required UserDonation donation,
  }) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => DonationFlowScreen(
          campaign: campaign,
          donorEmail: donorEmail,
          existingDonation: donation,
        ),
      ),
    );
  }

  @override
  State<DonationFlowScreen> createState() => _DonationFlowScreenState();
}

class _DonationFlowScreenState extends State<DonationFlowScreen> {
  static const _presets = [100, 250, 500, 1000];

  _Stage _stage = _Stage.chooseType;

  DonationType? _type;
  int? _presetAmount = 500;
  final _customAmountController = TextEditingController();
  DonationPaymentMethod? _method;

  // Goods flow state.
  NeededGood? _selectedGood;
  final _qtyController = TextEditingController();
  final _pickupAddressController = TextEditingController();
  final _pickupContactController = TextEditingController();
  DateTime? _pickupDate;
  TimeOfDay? _pickupTime;

  /// True while re-editing an already-pledged donation.
  bool _editing = false;

  UserDonation? _completed;

  @override
  void initState() {
    super.initState();
    final existing = widget.existingDonation;
    if (existing != null) {
      _completed = existing;
      _type = DonationType.goods;
      _stage = _Stage.goodsStatus;
    }
  }

  @override
  void dispose() {
    _customAmountController.dispose();
    _qtyController.dispose();
    _pickupAddressController.dispose();
    _pickupContactController.dispose();
    super.dispose();
  }

  int? get _qty {
    final n = int.tryParse(_qtyController.text.trim());
    return (n != null && n > 0) ? n : null;
  }

  int? get _pickupTimeMinutes =>
      _pickupTime == null ? null : _pickupTime!.hour * 60 + _pickupTime!.minute;

  String? get _pickupDateLabel =>
      _pickupDate == null ? null : DonationStore.formatDateOnly(_pickupDate!);

  String? get _pickupTimeLabel => _pickupTime == null
      ? null
      : DonationStore.formatMinutes(_pickupTimeMinutes!);

  bool get _pickupComplete =>
      _pickupAddressController.text.trim().isNotEmpty &&
      _pickupContactController.text.trim().isNotEmpty &&
      _pickupDate != null &&
      _pickupTime != null;

  int? get _effectiveAmount {
    final custom = int.tryParse(_customAmountController.text.trim());
    if (custom != null && custom > 0) return custom;
    return _presetAmount;
  }

  // ------------------------------------------------------------- navigation
  bool get _isTerminal =>
      _stage == _Stage.moneyDone || _stage == _Stage.goodsStatus;

  void _handleBack() {
    switch (_stage) {
      case _Stage.chooseType:
        Navigator.of(context).pop();
      case _Stage.paymentProcessing:
        break; // don't interrupt a simulated payment
      case _Stage.moneyDone:
      case _Stage.goodsStatus:
        Navigator.of(context).pop();
      case _Stage.enterAmount:
        setState(() => _stage = _Stage.chooseType);
      case _Stage.choosePayment:
        setState(() => _stage = _Stage.enterAmount);
      case _Stage.review:
        setState(() => _stage = _Stage.choosePayment);
      case _Stage.paymentSuccess:
        setState(() => _stage = _Stage.review);
      case _Stage.goodsSelectItem:
        setState(() {
          if (_editing) {
            _editing = false;
            _stage = _Stage.goodsStatus;
          } else {
            _stage = _Stage.chooseType;
          }
        });
      case _Stage.goodsPickup:
        setState(() => _stage = _Stage.goodsSelectItem);
      case _Stage.goodsReview:
        setState(() => _stage = _Stage.goodsPickup);
    }
  }

  void _startPaymentSimulation() {
    setState(() => _stage = _Stage.paymentProcessing);
    Future<void>.delayed(const Duration(milliseconds: 2400), () {
      if (!mounted || _stage != _Stage.paymentProcessing) return;
      setState(() => _stage = _Stage.paymentSuccess);
    });
  }

  void _finishMoneyDonation() {
    _completed ??= DonationStore.instance.recordMoneyDonation(
      campaignId: widget.campaign.id,
      campaignTitle: widget.campaign.title,
      donorEmail: widget.donorEmail,
      amount: _effectiveAmount ?? 0,
      paymentMethod: _method!,
    );
    setState(() => _stage = _Stage.moneyDone);
  }

  void _pledgeGoods() {
    _completed ??= DonationStore.instance.recordGoodsPledge(
      campaignId: widget.campaign.id,
      campaignTitle: widget.campaign.title,
      donorEmail: widget.donorEmail,
      goodsItem: _selectedGood!.name,
      goodsQuantity: _qty ?? 0,
      goodsUnit: _selectedGood!.unit,
      pickupAddress: _pickupAddressController.text.trim(),
      pickupContact: _pickupContactController.text.trim(),
      pickupDate: _pickupDate!,
      pickupTimeMinutes: _pickupTimeMinutes!,
    );
    setState(() => _stage = _Stage.goodsStatus);
  }

  void _advanceGoodsStatus() {
    final donation = _completed;
    if (donation == null) return;
    DonationStore.instance.advanceGoodsStatus(donation.donationId);
    setState(() {});
  }

  void _startEdit() {
    final d = _completed;
    if (d == null || !d.canModify) return;
    final goods = neededGoodsForCampaign(widget.campaign.id);
    _selectedGood = goods.firstWhere(
      (g) => g.name == d.goodsItem,
      orElse: () => goods.first,
    );
    _qtyController.text = '${d.goodsQuantity}';
    _pickupAddressController.text = d.pickupAddress ?? '';
    _pickupContactController.text = d.pickupContact ?? '';
    _pickupDate = d.pickupDate;
    final mins = d.pickupTimeMinutes;
    _pickupTime = mins == null
        ? null
        : TimeOfDay(hour: mins ~/ 60, minute: mins % 60);
    setState(() {
      _editing = true;
      _stage = _Stage.goodsSelectItem;
    });
  }

  void _saveEdit() {
    final d = _completed;
    if (d == null) return;
    DonationStore.instance.updateGoodsDonation(
      donationId: d.donationId,
      goodsItem: _selectedGood!.name,
      goodsQuantity: _qty ?? 0,
      goodsUnit: _selectedGood!.unit,
      pickupAddress: _pickupAddressController.text.trim(),
      pickupContact: _pickupContactController.text.trim(),
      pickupDate: _pickupDate!,
      pickupTimeMinutes: _pickupTimeMinutes!,
    );
    setState(() {
      _editing = false;
      _stage = _Stage.goodsStatus;
    });
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        const SnackBar(
          content: Text(
            'Donation Updated — your donation details have been successfully '
            'updated.',
          ),
        ),
      );
  }

  Future<void> _confirmCancel() async {
    final d = _completed;
    if (d == null || !d.canModify) return;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text('Cancel Donation?'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Are you sure you want to cancel this donation?',
              style: TextStyle(fontSize: 14, color: AppColors.textSecondary),
            ),
            const SizedBox(height: 14),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.background,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.borderCard),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _CancelSummaryLine('Item', d.goodsItem ?? '—'),
                  _CancelSummaryLine('Quantity', d.quantityLabel),
                  _CancelSummaryLine('Campaign', d.campaignTitle),
                  _CancelSummaryLine('Pickup date', d.pickupDateLabel ?? '—'),
                ],
              ),
            ),
          ],
        ),
        actionsPadding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Keep Donation'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            style: FilledButton.styleFrom(backgroundColor: AppColors.error),
            child: const Text('Yes, Cancel Donation'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;
    DonationStore.instance.cancelGoodsDonation(d.donationId);
    setState(() {});
  }

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _pickupDate ?? now.add(const Duration(days: 1)),
      firstDate: now,
      lastDate: now.add(const Duration(days: 60)),
    );
    if (picked != null) setState(() => _pickupDate = picked);
  }

  Future<void> _pickTime() async {
    final picked = await showTimePicker(
      context: context,
      initialTime: _pickupTime ?? const TimeOfDay(hour: 9, minute: 0),
    );
    if (picked != null) setState(() => _pickupTime = picked);
  }

  // ------------------------------------------------------------------- build
  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _handleBack();
      },
      child: Scaffold(
        backgroundColor: AppColors.background,
        appBar: AppBar(
          backgroundColor: AppColors.background,
          foregroundColor: AppColors.textPrimary,
          elevation: 0,
          automaticallyImplyLeading: false,
          leading: _stage == _Stage.paymentProcessing
              ? null
              : IconButton(
                  icon: Icon(
                    _stage == _Stage.chooseType || _isTerminal
                        ? Icons.close_rounded
                        : Icons.arrow_back_rounded,
                  ),
                  onPressed: _handleBack,
                ),
          title: Text(_appBarTitle),
        ),
        body: SafeArea(
          child: AnimatedSwitcher(
            duration: const Duration(milliseconds: 220),
            child: KeyedSubtree(key: ValueKey(_stage), child: _buildStage()),
          ),
        ),
      ),
    );
  }

  String get _appBarTitle => switch (_stage) {
    _Stage.chooseType => 'Donate',
    _Stage.enterAmount => 'Donation Amount',
    _Stage.choosePayment => 'Payment Method',
    _Stage.review => 'Review Donation',
    _Stage.goodsReview => _editing ? 'Review Changes' : 'Review Donation',
    _Stage.paymentProcessing || _Stage.paymentSuccess => 'Payment',
    _Stage.moneyDone => 'Donation Complete',
    _Stage.goodsSelectItem => _editing ? 'Edit Donation' : 'Select Goods',
    _Stage.goodsPickup => _editing ? 'Edit Pickup Details' : 'Pickup Details',
    _Stage.goodsStatus => 'Donation Details',
  };

  Widget _buildStage() => switch (_stage) {
    _Stage.chooseType => _chooseTypeStage(),
    _Stage.enterAmount => _enterAmountStage(),
    _Stage.choosePayment => _choosePaymentStage(),
    _Stage.review => _reviewStage(),
    _Stage.paymentProcessing => _paymentProcessingStage(),
    _Stage.paymentSuccess => _paymentSuccessStage(),
    _Stage.moneyDone => _completionStage(isMoney: true),
    _Stage.goodsSelectItem => _goodsSelectItemStage(),
    _Stage.goodsPickup => _goodsPickupStage(),
    _Stage.goodsReview => _goodsReviewStage(),
    _Stage.goodsStatus => _goodsStatusStage(),
  };

  /// Standard step layout: scrolling content over a pinned footer.
  Widget _stepScaffold({
    int? step,
    int stepCount = 4,
    required List<Widget> content,
    required Widget footer,
  }) {
    return Column(
      children: [
        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
            child: Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 560),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    if (step != null) ...[
                      DonationStepProgress(current: step, total: stepCount),
                      const SizedBox(height: 20),
                    ],
                    ...content,
                  ],
                ),
              ),
            ),
          ),
        ),
        _FooterBar(child: footer),
      ],
    );
  }

  // --------------------------------------------------------- Step 1: type
  Widget _chooseTypeStage() {
    return _stepScaffold(
      step: 1,
      content: [
        const DonationStepHeader(
          title: 'How would you like to help?',
          subtitle: 'Choose how you want to support this campaign.',
        ),
        const SizedBox(height: 16),
        DonationOptionTile(
          title: 'Money',
          subtitle: 'Give a peso amount through a payment method',
          icon: Icons.payments_outlined,
          selected: _type == DonationType.money,
          onTap: () => setState(() => _type = DonationType.money),
        ),
        const SizedBox(height: 12),
        DonationOptionTile(
          title: 'Goods',
          subtitle: 'Pledge physical items like food, clothing, or supplies',
          icon: Icons.inventory_2_outlined,
          selected: _type == DonationType.goods,
          onTap: () => setState(() => _type = DonationType.goods),
        ),
      ],
      footer: FilledButton(
        onPressed: _type == null
            ? null
            : () => setState(
                () => _stage = _type == DonationType.money
                    ? _Stage.enterAmount
                    : _Stage.goodsSelectItem,
              ),
        child: const Text('Continue'),
      ),
    );
  }

  // ------------------------------------------------------- Step 2: amount
  Widget _enterAmountStage() {
    final amount = _effectiveAmount;
    final usingCustom =
        int.tryParse(_customAmountController.text.trim()) != null;

    return _stepScaffold(
      step: 2,
      content: [
        const DonationStepHeader(
          title: 'How much would you like to donate?',
          subtitle: 'Pick a preset or enter a custom amount.',
        ),
        const SizedBox(height: 16),
        GridView.count(
          crossAxisCount: 2,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          mainAxisSpacing: 12,
          crossAxisSpacing: 12,
          childAspectRatio: 2.4,
          children: [
            for (final preset in _presets)
              DonationPresetChip(
                label: DonationStore.formatPesoFull(preset),
                selected: !usingCustom && _presetAmount == preset,
                onTap: () => setState(() {
                  _presetAmount = preset;
                  _customAmountController.clear();
                }),
              ),
          ],
        ),
        const SizedBox(height: 16),
        Text(
          'Custom amount',
          style: const TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w700,
            color: AppColors.textPrimary,
          ),
        ),
        const SizedBox(height: 6),
        TextField(
          controller: _customAmountController,
          keyboardType: TextInputType.number,
          inputFormatters: [
            FilteringTextInputFormatter.digitsOnly,
            LengthLimitingTextInputFormatter(7),
          ],
          onChanged: (_) => setState(() {}),
          decoration: const InputDecoration(
            prefixText: '₱ ',
            hintText: 'Enter amount',
          ),
        ),
        const SizedBox(height: 16),
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: AppColors.primary.withValues(alpha: 0.06),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: AppColors.primary.withValues(alpha: 0.18),
            ),
          ),
          child: Row(
            children: [
              const Text(
                'Donation total',
                style: TextStyle(fontSize: 13, color: AppColors.textSecondary),
              ),
              const Spacer(),
              Text(
                amount == null ? '—' : DonationStore.formatPesoFull(amount),
                style: const TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w800,
                  color: AppColors.primary,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 10),
        const Text(
          'You will not be charged yet — you can review everything before '
          'paying.',
          style: TextStyle(
            fontSize: 12,
            color: AppColors.textMuted,
            height: 1.4,
          ),
        ),
      ],
      footer: FilledButton(
        onPressed: (amount == null || amount <= 0)
            ? null
            : () => setState(() => _stage = _Stage.choosePayment),
        child: const Text('Continue'),
      ),
    );
  }

  // ------------------------------------------------- Step 3: payment method
  Widget _choosePaymentStage() {
    return _stepScaffold(
      step: 3,
      content: [
        const DonationStepHeader(
          title: 'Choose Payment Method',
          subtitle:
              'Select how you would like to pay. No account is charged '
              'in this preview.',
        ),
        const SizedBox(height: 16),
        for (final method in DonationPaymentMethod.values) ...[
          DonationOptionTile(
            title: method.label,
            icon: paymentMethodIcon(method),
            selected: _method == method,
            onTap: () => setState(() => _method = method),
          ),
          const SizedBox(height: 12),
        ],
      ],
      footer: FilledButton(
        onPressed: _method == null
            ? null
            : () => setState(() => _stage = _Stage.review),
        child: const Text('Continue'),
      ),
    );
  }

  // ---------------------------------------------------- Step 4: review
  Widget _reviewStage() {
    final amount = _effectiveAmount ?? 0;
    return _stepScaffold(
      step: 4,
      content: [
        const DonationStepHeader(
          title: 'Review Your Donation',
          subtitle: 'Check the details before you continue to payment.',
        ),
        const SizedBox(height: 16),
        DonationSummaryCard(
          rows: [
            DonationSummaryRow('Campaign', widget.campaign.title),
            const DonationSummaryRow('Donation Type', 'Money'),
            DonationSummaryRow(
              'Amount',
              DonationStore.formatPesoFull(amount),
              emphasize: true,
            ),
            DonationSummaryRow('Payment Method', _method?.label ?? '—'),
          ],
        ),
        const SizedBox(height: 12),
        const Text(
          'Tapping "Proceed to Payment" starts a simulated payment. Your '
          'donation is only recorded once it succeeds.',
          style: TextStyle(
            fontSize: 12,
            color: AppColors.textMuted,
            height: 1.4,
          ),
        ),
      ],
      footer: Row(
        children: [
          Expanded(
            child: OutlinedButton(
              onPressed: () => setState(() => _stage = _Stage.choosePayment),
              style: OutlinedButton.styleFrom(
                minimumSize: const Size.fromHeight(52),
                foregroundColor: AppColors.textPrimary,
                side: const BorderSide(color: AppColors.borderCard),
              ),
              child: const Text('Back'),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            flex: 3,
            child: FilledButton(
              onPressed: _startPaymentSimulation,
              child: const Text('Proceed to Payment'),
            ),
          ),
        ],
      ),
    );
  }

  // ----------------------------------------------- Step 5: simulated payment
  Widget _paymentProcessingStage() {
    return _CenteredStatus(
      icon: const SizedBox(
        width: 56,
        height: 56,
        child: CircularProgressIndicator(strokeWidth: 3),
      ),
      title: 'Processing Payment...',
      message:
          'Securely completing your ${_method?.label ?? ''} payment of '
          '${DonationStore.formatPesoFull(_effectiveAmount ?? 0)}. '
          'Please don\'t close this screen.',
    );
  }

  Widget _paymentSuccessStage() {
    return Column(
      children: [
        Expanded(
          child: _CenteredStatus(
            icon: Container(
              width: 76,
              height: 76,
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.12),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.check_rounded,
                size: 40,
                color: AppColors.primary,
              ),
            ),
            title: 'Payment Successful',
            message:
                '${DonationStore.formatPesoFull(_effectiveAmount ?? 0)} was '
                'paid via ${_method?.label ?? ''}.',
          ),
        ),
        _FooterBar(
          child: FilledButton(
            onPressed: _finishMoneyDonation,
            child: const Text('Continue'),
          ),
        ),
      ],
    );
  }

  // ------------------------------------------------ Money Step 6: completion
  Widget _completionStage({required bool isMoney}) {
    final donation = _completed;
    return Column(
      children: [
        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 20),
            child: Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 560),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Center(
                      child: Container(
                        width: 84,
                        height: 84,
                        decoration: BoxDecoration(
                          color: AppColors.primary.withValues(alpha: 0.12),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.celebration_rounded,
                          size: 42,
                          color: AppColors.primary,
                        ),
                      ),
                    ),
                    const SizedBox(height: 18),
                    const Text(
                      'Donation Successful!',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w800,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'You donated '
                      '${DonationStore.formatPesoFull(donation?.amount ?? 0)} '
                      'to ${widget.campaign.title}.',
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 14,
                        color: AppColors.textSecondary,
                        height: 1.45,
                      ),
                    ),
                    const SizedBox(height: 20),
                    if (donation != null)
                      DonationSummaryCard(
                        rows: [
                          DonationSummaryRow(
                            'Campaign',
                            donation.campaignTitle,
                          ),
                          DonationSummaryRow(
                            'Donation type',
                            donation.type.label,
                          ),
                          DonationSummaryRow(
                            'Amount',
                            DonationStore.formatPesoFull(donation.amount),
                            emphasize: true,
                          ),
                          if (donation.paymentMethod != null)
                            DonationSummaryRow(
                              'Payment method',
                              donation.paymentMethod!.label,
                            ),
                          DonationSummaryRow(
                            'Date',
                            DonationStore.formatDate(donation.donatedAt),
                          ),
                          DonationSummaryRow(
                            'Donation ID',
                            donation.donationId,
                          ),
                        ],
                      ),
                  ],
                ),
              ),
            ),
          ),
        ),
        _FooterBar(
          child: Column(
            children: [
              FilledButton(
                onPressed: donation == null
                    ? null
                    : () => Navigator.of(context).pushReplacement(
                        MaterialPageRoute<void>(
                          builder: (_) =>
                              DonationReceiptScreen(donation: donation),
                        ),
                      ),
                child: const Text('View Donation'),
              ),
              const SizedBox(height: 10),
              TextButton(
                onPressed: () => Navigator.of(context).pop(),
                child: const Text('Back to campaign'),
              ),
            ],
          ),
        ),
      ],
    );
  }

  // ==================================================== Goods flow

  // ------------------------------------------- Goods Step 2: select item
  Widget _goodsSelectItemStage() {
    final goods = neededGoodsForCampaign(widget.campaign.id);
    final good = _selectedGood;
    return _stepScaffold(
      step: 2,
      content: [
        const DonationStepHeader(
          title: 'What would you like to donate?',
          subtitle: 'These are the items this campaign currently needs.',
        ),
        const SizedBox(height: 16),
        for (final item in goods) ...[
          DonationOptionTile(
            title: item.name,
            subtitle: item.needLabel,
            icon: Icons.inventory_2_outlined,
            selected: good?.name == item.name,
            onTap: () => setState(() {
              _selectedGood = item;
              _qtyController.clear();
            }),
          ),
          const SizedBox(height: 12),
        ],
        if (good != null) ...[
          const SizedBox(height: 6),
          Text(
            'Quantity',
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 6),
          TextField(
            controller: _qtyController,
            keyboardType: TextInputType.number,
            inputFormatters: [
              FilteringTextInputFormatter.digitsOnly,
              LengthLimitingTextInputFormatter(5),
            ],
            onChanged: (_) => setState(() {}),
            decoration: InputDecoration(
              hintText: 'Number of ${good.unit}',
              suffixText: good.unit,
            ),
          ),
        ],
      ],
      footer: FilledButton(
        onPressed: (good != null && _qty != null)
            ? () => setState(() => _stage = _Stage.goodsPickup)
            : null,
        child: const Text('Continue'),
      ),
    );
  }

  // ------------------------------------------- Goods Step 3: pickup details
  Widget _goodsPickupStage() {
    return _stepScaffold(
      step: 3,
      content: [
        const DonationStepHeader(
          title: 'How will you provide your donation?',
          subtitle: 'CARES will collect the items from you.',
        ),
        const SizedBox(height: 16),
        DonationOptionTile(
          title: 'Request Pickup',
          subtitle: 'A CARES volunteer will collect the items at your address',
          icon: Icons.local_shipping_outlined,
          selected: true,
          onTap: () {},
        ),
        const SizedBox(height: 18),
        _FieldLabel('Pickup address'),
        const SizedBox(height: 6),
        TextField(
          controller: _pickupAddressController,
          minLines: 2,
          maxLines: 3,
          textCapitalization: TextCapitalization.words,
          onChanged: (_) => setState(() {}),
          decoration: const InputDecoration(
            hintText: 'House/unit no., street, barangay, city',
          ),
        ),
        const SizedBox(height: 14),
        _FieldLabel('Contact number'),
        const SizedBox(height: 6),
        TextField(
          controller: _pickupContactController,
          keyboardType: TextInputType.phone,
          inputFormatters: [
            FilteringTextInputFormatter.allow(RegExp(r'[0-9+ ]')),
            LengthLimitingTextInputFormatter(11),
          ],
          onChanged: (_) => setState(() {}),
          decoration: const InputDecoration(hintText: '09XX XXX XXXX'),
        ),
        const SizedBox(height: 14),
        _FieldLabel('Preferred pickup date'),
        const SizedBox(height: 6),
        _PickerField(
          icon: Icons.calendar_today_outlined,
          value: _pickupDateLabel,
          placeholder: 'Select a date',
          onTap: _pickDate,
        ),
        const SizedBox(height: 14),
        _FieldLabel('Preferred pickup time'),
        const SizedBox(height: 6),
        _PickerField(
          icon: Icons.schedule_rounded,
          value: _pickupTimeLabel,
          placeholder: 'Select a time',
          onTap: _pickTime,
        ),
        const SizedBox(height: 12),
        const Text(
          'Pickup details stay in this prototype only.',
          style: TextStyle(
            fontSize: 12,
            color: AppColors.textMuted,
            height: 1.4,
          ),
        ),
      ],
      footer: FilledButton(
        onPressed: _pickupComplete
            ? () => setState(() => _stage = _Stage.goodsReview)
            : null,
        child: const Text('Continue'),
      ),
    );
  }

  // ------------------------------------------- Goods Step 4: review
  Widget _goodsReviewStage() {
    final good = _selectedGood;
    return _stepScaffold(
      step: 4,
      content: [
        DonationStepHeader(
          title: _editing ? 'Review Changes' : 'Review Your Donation',
          subtitle: _editing
              ? 'Confirm your updated donation details.'
              : 'You are pledging these goods — CARES has not received or '
                    'verified them yet.',
        ),
        const SizedBox(height: 16),
        DonationSummaryCard(
          rows: [
            DonationSummaryRow('Campaign', widget.campaign.title),
            const DonationSummaryRow('Donation Type', 'Goods'),
            DonationSummaryRow('Item', good?.name ?? '—'),
            DonationSummaryRow(
              'Quantity',
              good == null ? '—' : '${_qty ?? 0} ${good.unit}',
              emphasize: true,
            ),
            const DonationSummaryRow('Fulfillment', 'Pickup'),
            DonationSummaryRow(
              'Pickup Address',
              _pickupAddressController.text.trim(),
            ),
            DonationSummaryRow(
              'Pickup Contact',
              _pickupContactController.text.trim(),
            ),
            DonationSummaryRow('Pickup Date', _pickupDateLabel ?? '—'),
            DonationSummaryRow('Pickup Time', _pickupTimeLabel ?? '—'),
          ],
        ),
      ],
      footer: Row(
        children: [
          Expanded(
            child: OutlinedButton(
              onPressed: () => setState(() => _stage = _Stage.goodsPickup),
              style: OutlinedButton.styleFrom(
                minimumSize: const Size.fromHeight(52),
                foregroundColor: AppColors.textPrimary,
                side: const BorderSide(color: AppColors.borderCard),
              ),
              child: const Text('Back'),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            flex: 3,
            child: FilledButton(
              onPressed: _editing ? _saveEdit : _pledgeGoods,
              child: Text(_editing ? 'Save Changes' : 'Pledge Donation'),
            ),
          ),
        ],
      ),
    );
  }

  // ------------------------------- Goods Steps 5–8: status tracking
  Widget _goodsStatusStage() {
    final donation = _completed;
    if (donation == null) return const SizedBox.shrink();
    final status = donation.goodsStatus;
    final isConfirmed = status == GoodsDonationStatus.confirmed;
    final isCancelled = status == GoodsDonationStatus.cancelled;

    final (String heading, String message) = switch (status) {
      GoodsDonationStatus.pledged => (
        'Donation Pledged',
        'Your donation has been pledged successfully.\n\nCARES will arrange '
            'the pickup based on your selected schedule. The donation is not '
            'confirmed yet.',
      ),
      GoodsDonationStatus.waitingForPickup => (
        'Waiting for Pickup',
        'A CARES volunteer will collect your donation on your selected date '
            'and time. This donation is locked because the pickup process has '
            'already started.',
      ),
      GoodsDonationStatus.verifying => (
        'Verifying',
        'Your donation is being verified.\n\nCARES is checking the received '
            'goods and donation details. The donation is not confirmed yet.',
      ),
      GoodsDonationStatus.confirmed => (
        'Donation Confirmed!',
        'Your donation has been received and verified by CARES. Thank you for '
            'your generosity!',
      ),
      GoodsDonationStatus.cancelled => (
        'Donation Cancelled',
        'Your donation has been cancelled successfully. It stays in your '
            'donation history for your records.',
      ),
    };
    final accent = isCancelled ? AppColors.error : AppColors.primary;

    return Column(
      children: [
        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
            child: Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 560),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(18),
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(
                          AppColors.cardRadius,
                        ),
                        border: Border.all(color: AppColors.borderCard),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Icon(
                                isCancelled
                                    ? Icons.cancel_outlined
                                    : isConfirmed
                                    ? Icons.verified_rounded
                                    : Icons.local_shipping_outlined,
                                color: accent,
                                size: 24,
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Text(
                                  heading,
                                  style: const TextStyle(
                                    fontSize: 18,
                                    fontWeight: FontWeight.w800,
                                    color: AppColors.textPrimary,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 14),
                          DonationStatusPill(
                            label: status.upperLabel,
                            done: isConfirmed,
                            cancelled: isCancelled,
                          ),
                          const SizedBox(height: 18),
                          GoodsStatusTracker(status: status),
                          const SizedBox(height: 6),
                          Text(
                            message,
                            style: const TextStyle(
                              fontSize: 13,
                              color: AppColors.textSecondary,
                              height: 1.5,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                    DonationSummaryCard(
                      rows: [
                        DonationSummaryRow('Campaign', donation.campaignTitle),
                        const DonationSummaryRow('Donation Type', 'Goods'),
                        DonationSummaryRow('Item', donation.goodsItem ?? '—'),
                        DonationSummaryRow('Quantity', donation.quantityLabel),
                        DonationSummaryRow(
                          'Pickup Date',
                          donation.pickupDateLabel ?? '—',
                        ),
                        DonationSummaryRow(
                          'Pickup Time',
                          donation.pickupTimeLabel ?? '—',
                        ),
                        DonationSummaryRow(
                          'Pickup Address',
                          donation.pickupAddress ?? '—',
                        ),
                        DonationSummaryRow(
                          'Donation Date',
                          DonationStore.formatDate(donation.donatedAt),
                        ),
                        DonationSummaryRow('Donation ID', donation.donationId),
                        DonationSummaryRow(
                          'Status',
                          status.upperLabel,
                          emphasize: true,
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
        _FooterBar(child: _goodsStatusFooter(status)),
      ],
    );
  }

  Widget _goodsStatusFooter(GoodsDonationStatus status) {
    final donation = _completed;

    switch (status) {
      case GoodsDonationStatus.pledged:
        return Column(
          children: [
            FilledButton.icon(
              onPressed: _startEdit,
              icon: const Icon(Icons.edit_outlined, size: 18),
              label: const Text('Edit Donation'),
            ),
            const SizedBox(height: 10),
            OutlinedButton.icon(
              onPressed: _confirmCancel,
              icon: const Icon(Icons.cancel_outlined, size: 18),
              label: const Text('Cancel Donation'),
              style: OutlinedButton.styleFrom(
                minimumSize: const Size.fromHeight(52),
                foregroundColor: AppColors.error,
                side: BorderSide(color: AppColors.error.withValues(alpha: 0.5)),
              ),
            ),
            const SizedBox(height: 12),
            TextButton(
              onPressed: _advanceGoodsStatus,
              child: const Text('Simulate: schedule pickup'),
            ),
          ],
        );

      case GoodsDonationStatus.waitingForPickup:
        return Column(
          children: [
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.inputFill.withValues(alpha: 0.5),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.borderCard),
              ),
              child: const Row(
                children: [
                  Icon(
                    Icons.lock_outline_rounded,
                    size: 16,
                    color: AppColors.textMuted,
                  ),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Locked — the pickup process has started, so this '
                      'donation can no longer be edited or cancelled.',
                      style: TextStyle(
                        fontSize: 12,
                        color: AppColors.textSecondary,
                        height: 1.35,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            _simulateButton('Simulate Pickup', Icons.local_shipping_outlined),
          ],
        );

      case GoodsDonationStatus.verifying:
        return _simulateButton(
          'Simulate Verification',
          Icons.fact_check_outlined,
        );

      case GoodsDonationStatus.confirmed:
        return Column(
          children: [
            FilledButton(
              onPressed: donation == null
                  ? null
                  : () => Navigator.of(context).pushReplacement(
                      MaterialPageRoute<void>(
                        builder: (_) =>
                            DonationReceiptScreen(donation: donation),
                      ),
                    ),
              child: const Text('View Donation'),
            ),
            const SizedBox(height: 10),
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Back to campaign'),
            ),
          ],
        );

      case GoodsDonationStatus.cancelled:
        return Column(
          children: [
            FilledButton(
              onPressed: () => Navigator.of(context).popUntil((r) => r.isFirst),
              child: const Text('Back to My Donations'),
            ),
            const SizedBox(height: 10),
            OutlinedButton(
              onPressed: () => Navigator.of(context).pop(),
              style: OutlinedButton.styleFrom(
                minimumSize: const Size.fromHeight(52),
                foregroundColor: AppColors.textPrimary,
                side: const BorderSide(color: AppColors.borderCard),
              ),
              child: const Text('View Campaign'),
            ),
          ],
        );
    }
  }

  Widget _simulateButton(String label, IconData icon) {
    return Column(
      children: [
        FilledButton.icon(
          onPressed: _advanceGoodsStatus,
          icon: Icon(icon, size: 18),
          label: Text(label),
        ),
        const SizedBox(height: 6),
        const Text(
          'Demo control — advances the status for the prototype flow.',
          textAlign: TextAlign.center,
          style: TextStyle(fontSize: 11, color: AppColors.textMuted),
        ),
      ],
    );
  }
}

class _CancelSummaryLine extends StatelessWidget {
  const _CancelSummaryLine(this.label, this.value);

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 84,
            child: Text(
              label,
              style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(
                fontSize: 12.5,
                fontWeight: FontWeight.w600,
                color: AppColors.textPrimary,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _FieldLabel extends StatelessWidget {
  const _FieldLabel(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: const TextStyle(
        fontSize: 13,
        fontWeight: FontWeight.w700,
        color: AppColors.textPrimary,
      ),
    );
  }
}

class _PickerField extends StatelessWidget {
  const _PickerField({
    required this.icon,
    required this.value,
    required this.placeholder,
    required this.onTap,
  });

  final IconData icon;
  final String? value;
  final String placeholder;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final hasValue = value != null && value!.isNotEmpty;
    return Material(
      color: AppColors.fieldFill,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Ink(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 15),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.fieldBorder),
          ),
          child: Row(
            children: [
              Icon(icon, size: 18, color: AppColors.secondary),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  hasValue ? value! : placeholder,
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w500,
                    color: hasValue ? AppColors.textPrimary : AppColors.light,
                  ),
                ),
              ),
              const Icon(
                Icons.expand_more_rounded,
                size: 20,
                color: AppColors.textMuted,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------

class _FooterBar extends StatelessWidget {
  const _FooterBar({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 16),
      decoration: const BoxDecoration(
        color: AppColors.background,
        border: Border(top: BorderSide(color: AppColors.borderCard)),
      ),
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 560),
          child: child,
        ),
      ),
    );
  }
}

class _CenteredStatus extends StatelessWidget {
  const _CenteredStatus({
    required this.icon,
    required this.title,
    required this.message,
  });

  final Widget icon;
  final String title;
  final String message;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            icon,
            const SizedBox(height: 22),
            Text(
              title,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w800,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              message,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 13.5,
                color: AppColors.textSecondary,
                height: 1.45,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
