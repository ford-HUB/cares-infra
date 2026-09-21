import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/constants/goods_types.dart';
import '../../../core/services/api_client.dart';
import '../../../core/theme/app_theme.dart';
import '../data/donation_format.dart';
import '../data/donation_payment_service.dart';
import '../data/donation_service.dart';
import '../data/models/donation_campaign_models.dart';
import '../data/models/donation_models.dart';
import '../data/models/donation_payment_models.dart';
import '../presentation/providers/donor_providers.dart';
import '../widgets/donation_checkout_widgets.dart';
import '../widgets/donation_flow_widgets.dart';
import 'donation_receipt_screen.dart';

enum _Stage {
  chooseType,
  enterAmount,
  choosePayment,
  review,
  paymentCheckout,
  paymentFailed,
  paymentSuccess,
  moneyStatus,
  goodsSelectItem,
  goodsPickup,
  goodsReview,
  goodsStatus,
}

/// Multi-step donation flow. Money payments go through the server's Xendit
/// integration: the app opens a checkout (`POST /donations/payments`), hands
/// the donor to GCash / the hosted page or shows a QR Ph code, then polls
/// the payment until the gateway's webhook settles it. The server opens the
/// ledger row ONLY once the payment is reported paid.
///
/// Every donation is verification-based: paying or pledging only *pledges*
/// it. A Director then moves it along on the portal's Donation Tracking —
/// verifying, then confirmed — and only a confirmed donation shows
/// "Donation Successful" and counts on the donor board. Goods are pledged
/// through `POST /donations/goods` and can be edited or cancelled until the
/// pickup process starts.
///
/// Passing [existingDonation] opens the flow straight to the status view for
/// a donation that already exists (from the Activity tab); [campaign] may
/// then be left out.
class DonationFlowScreen extends ConsumerStatefulWidget {
  const DonationFlowScreen({super.key, this.campaign, this.existingDonation})
    : assert(
        campaign != null || existingDonation != null,
        'A campaign to give to, or a donation to show',
      );

  final DonationCampaign? campaign;
  final Donation? existingDonation;

  static void open(BuildContext context, {required DonationCampaign campaign}) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => DonationFlowScreen(campaign: campaign),
      ),
    );
  }

  /// Opens the status / details view for an existing donation (money or goods).
  static void openStatus(BuildContext context, {required Donation donation}) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => DonationFlowScreen(existingDonation: donation),
      ),
    );
  }

  @override
  ConsumerState<DonationFlowScreen> createState() => _DonationFlowScreenState();
}

class _DonationFlowScreenState extends ConsumerState<DonationFlowScreen> {
  static const _presets = [100, 250, 500, 1000];

  /// How long to wait for the webhook to open the ledger row after the
  /// gateway reports the checkout paid.
  static const _ledgerPollInterval = Duration(seconds: 2);
  static const _ledgerPollAttempts = 15;

  _Stage _stage = _Stage.chooseType;

  DonationKind? _type;
  int? _presetAmount = 500;
  final _customAmountController = TextEditingController();
  DonationPaymentMethod? _method;

  /// Payment reference from the gateway once the payment is reported paid.
  /// Stored on the donation so the Director can verify it.
  String? _paymentReference;

  // Live checkout state.
  final _paymentService = DonationPaymentService();
  final _donationService = DonationService();

  /// One key per checkout attempt. Sent on every create call so a retry after
  /// a timeout returns the checkout the server already opened. Reset whenever
  /// the amount or method changes, and after a terminal outcome.
  String? _idempotencyKey;
  DonationPayment? _payment;
  bool _creatingPayment = false;
  bool _checkingPayment = false;
  String? _paymentError;
  Timer? _pollTimer;

  // Goods flow state.
  GoodsType? _selectedGood;

  /// True when the donor picked "Other" and is typing their own item.
  bool _otherGoodSelected = false;
  final _otherGoodController = TextEditingController();
  int _quantity = 1;
  final _pickupAddressController = TextEditingController();
  final _pickupContactController = TextEditingController();
  DateTime? _pickupDate;
  TimeOfDay? _pickupTime;

  /// True while re-editing an already-pledged donation.
  bool _editing = false;

  /// True while a pledge, edit, cancel or refresh is on the wire.
  bool _saving = false;

  Donation? _completed;

  @override
  void initState() {
    super.initState();
    final existing = widget.existingDonation;
    if (existing != null) {
      _completed = existing;
      _type = existing.kind;
      _stage = existing.isMoney ? _Stage.moneyStatus : _Stage.goodsStatus;
      // The Director may have moved it since the list was fetched.
      Future.microtask(_refreshDonation);
      return;
    }
    // The event may accept only one kind of donation — go straight to it.
    if (_onlyGoods) {
      _type = DonationKind.goods;
      _stage = _Stage.goodsSelectItem;
    } else if (_onlyMoney) {
      _type = DonationKind.money;
      _stage = _Stage.enterAmount;
    }
  }

  /// Donation types the director enabled on the event behind this campaign.
  bool get _acceptsMoney => widget.campaign?.acceptsMonetary ?? false;
  bool get _acceptsGoods => widget.campaign?.acceptsGoods ?? false;
  bool get _onlyMoney => _acceptsMoney && !_acceptsGoods;
  bool get _onlyGoods => _acceptsGoods && !_acceptsMoney;

  /// The campaign title for the summary rows — from the campaign when giving,
  /// from the ledger row when only looking at an existing donation.
  String get _campaignTitle =>
      widget.campaign?.title ?? _completed?.eventTitle ?? '';

  /// With a single accepted type there is no "how would you like to help?"
  /// step, so every later step moves up by one.
  int get _skippedSteps => (_onlyMoney || _onlyGoods) ? 1 : 0;

  /// Re-reads the donation so the status view shows the Director's latest move.
  Future<void> _refreshDonation() async {
    final current = _completed;
    if (current == null) return;
    try {
      final latest = await _donationService.fetchDonation(current.id);
      if (!mounted) return;
      setState(() => _completed = latest);
    } on ApiException {
      // Keep what we have; the Activity tab refetches on its own.
    } catch (_) {
      // Same — a stale status is better than a broken screen.
    }
  }

  void _showMessage(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(content: Text(message), behavior: SnackBarBehavior.floating),
      );
  }

  /// The Activity tab, the home deck's raised figures and the board all
  /// change when a donation is made or moved.
  void _invalidateDonorData() {
    ref.invalidate(myDonationsProvider);
    ref.invalidate(donationCampaignsProvider);
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    _customAmountController.dispose();
    _otherGoodController.dispose();
    _pickupAddressController.dispose();
    _pickupContactController.dispose();
    super.dispose();
  }

  /// The item the donor is pledging — either a listed need or the custom
  /// "Other" item they typed. Null until a valid choice is made.
  String? get _goodsItem {
    if (_otherGoodSelected) {
      final custom = _otherGoodController.text.trim();
      return custom.isEmpty ? null : custom;
    }
    return _selectedGood?.label;
  }

  /// The goods-type id sent to the server; `other` for a custom item.
  String? get _goodsTypeId =>
      _otherGoodSelected ? GoodsTypes.other.id : _selectedGood?.id;

  /// Free text for the custom item, or an optional note on a listed one.
  String? get _goodsDetail {
    final custom = _otherGoodController.text.trim();
    return custom.isEmpty ? null : custom;
  }

  /// `Food — 3 sacks of rice` for the review rows.
  String? get _goodsSummary {
    final type = _otherGoodSelected ? null : _selectedGood?.label;
    final detail = _goodsDetail;
    if (type == null) return detail;
    return detail == null ? type : '$type — $detail';
  }

  int? get _pickupTimeMinutes =>
      _pickupTime == null ? null : _pickupTime!.hour * 60 + _pickupTime!.minute;

  String? get _pickupDateLabel =>
      _pickupDate == null ? null : DonationFormat.dateOnly(_pickupDate!);

  String? get _pickupTimeLabel =>
      _pickupTime == null ? null : DonationFormat.minutes(_pickupTimeMinutes!);

  GoodsPledgeInput get _goodsInput => GoodsPledgeInput(
    goodsType: _goodsTypeId!,
    goodsItem: _goodsDetail,
    quantity: _quantity,
    pickupAddress: _pickupAddressController.text.trim(),
    pickupContact: _pickupContactController.text.trim(),
    pickupDate: _pickupDate!,
    pickupTimeMinutes: _pickupTimeMinutes!,
  );

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
      _stage == _Stage.moneyStatus || _stage == _Stage.goodsStatus;

  void _handleBack() {
    switch (_stage) {
      case _Stage.chooseType:
        Navigator.of(context).pop();
      case _Stage.paymentCheckout:
        if (_creatingPayment) break; // the server is mid-call
        _stopPolling();
        setState(() => _stage = _Stage.review);
      case _Stage.paymentFailed:
        setState(() => _stage = _Stage.choosePayment);
      case _Stage.moneyStatus:
      case _Stage.goodsStatus:
        Navigator.of(context).pop();
      case _Stage.enterAmount:
        if (_onlyMoney) {
          Navigator.of(context).pop();
        } else {
          setState(() => _stage = _Stage.chooseType);
        }
      case _Stage.choosePayment:
        setState(() => _stage = _Stage.enterAmount);
      case _Stage.review:
        setState(() => _stage = _Stage.choosePayment);
      case _Stage.paymentSuccess:
        setState(() => _stage = _Stage.review);
      case _Stage.goodsSelectItem:
        if (_saving) break;
        setState(() {
          if (_editing) {
            _editing = false;
            _stage = _Stage.goodsStatus;
          } else if (_onlyGoods) {
            Navigator.of(context).pop();
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

  // ---------------------------------------------------------- live checkout

  /// Anything that changes what would be charged invalidates the attempt key.
  void _resetCheckout() {
    _stopPolling();
    _idempotencyKey = null;
    _payment = null;
    _paymentError = null;
  }

  void _stopPolling() {
    _pollTimer?.cancel();
    _pollTimer = null;
  }

  Future<void> _startPayment() async {
    final amount = _effectiveAmount;
    final method = _method;
    if (amount == null || amount <= 0 || method == null) return;
    _idempotencyKey ??= DonationPaymentService.newIdempotencyKey();

    setState(() {
      _stage = _Stage.paymentCheckout;
      _creatingPayment = true;
      _paymentError = null;
    });

    final campaign = widget.campaign!;
    try {
      final payment = await _paymentService.createPayment(
        idempotencyKey: _idempotencyKey!,
        campaignId: campaign.id,
        campaignTitle: campaign.title,
        amount: amount,
        method: method,
        eventId: campaign.eventId,
      );
      if (!mounted) return;
      setState(() {
        _payment = payment;
        _creatingPayment = false;
      });
      if (payment.status.isTerminal) {
        _onPaymentSettled(payment);
        return;
      }
      if (method.opensExternally) await _openCheckout(payment);
      _startPolling();
    } on ApiException catch (e) {
      _failCheckout(e.message);
    } catch (_) {
      _failCheckout(
        'We could not reach the payment gateway. Please try again.',
      );
    }
  }

  void _failCheckout(String message) {
    if (!mounted) return;
    _stopPolling();
    setState(() {
      _creatingPayment = false;
      _checkingPayment = false;
      _paymentError = message;
      _stage = _Stage.paymentFailed;
    });
    // A failed attempt is terminal on the server; the next try needs its own key.
    _idempotencyKey = null;
  }

  /// GCash and the hosted card / bank pages open outside the app.
  Future<void> _openCheckout(DonationPayment payment) async {
    final url = payment.checkoutUrl;
    if (url == null) return;
    final opened = await launchUrl(
      Uri.parse(url),
      mode: LaunchMode.externalApplication,
    );
    if (!opened && mounted) {
      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(
          const SnackBar(content: Text('Could not open the payment page.')),
        );
    }
  }

  /// Polls the server every few seconds while the checkout is open. The
  /// webhook flips the status on the server; the app only ever reads it.
  void _startPolling() {
    _stopPolling();
    _pollTimer = Timer.periodic(
      const Duration(seconds: 4),
      (_) => _checkPayment(),
    );
  }

  Future<void> _checkPayment() async {
    final current = _payment;
    if (current == null || _checkingPayment) return;
    setState(() => _checkingPayment = true);
    try {
      final latest = await _paymentService.fetchPayment(current.id);
      if (!mounted) return;
      setState(() {
        _payment = latest;
        _checkingPayment = false;
      });
      if (latest.status.isTerminal) {
        _onPaymentSettled(latest);
      } else if (latest.expiresAt case final expires?
          when expires.isBefore(DateTime.now())) {
        _onPaymentSettled(latest, expiredLocally: true);
      }
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _checkingPayment = false);
      // Session-ending errors are surfaced by the client; a transient one
      // just waits for the next tick.
      if (e.statusCode == 404) _failCheckout(e.message);
    } catch (_) {
      if (mounted) setState(() => _checkingPayment = false);
    }
  }

  void _onPaymentSettled(
    DonationPayment payment, {
    bool expiredLocally = false,
  }) {
    _stopPolling();
    switch (payment.status) {
      case DonationPaymentStatus.paid:
        setState(() {
          _paymentReference = payment.receiptReference;
          _stage = _Stage.paymentSuccess;
        });
        _idempotencyKey = null;
      case DonationPaymentStatus.failed:
        _failCheckout(
          payment.failureReason ??
              'The payment was declined or cancelled. No money was taken.',
        );
      case DonationPaymentStatus.expired:
        _failCheckout(
          payment.failureReason ??
              'The checkout expired before it was paid. No money was taken.',
        );
      case DonationPaymentStatus.pending:
        if (expiredLocally) {
          _failCheckout('The checkout expired before it was paid.');
        }
    }
  }

  bool get _paymentExpired =>
      _payment?.status == DonationPaymentStatus.expired ||
      (_paymentError?.toLowerCase().contains('expired') ?? false);

  /// Payment went through, so the server has opened the ledger row — but only
  /// as *pledged*. The row is created by the gateway's callback, which can
  /// land a moment after the status poll saw PAID, so wait for it briefly.
  Future<void> _pledgeMoney() async {
    if (_completed != null) {
      setState(() => _stage = _Stage.moneyStatus);
      return;
    }
    final payment = _payment;
    if (payment == null) return;
    setState(() => _saving = true);
    try {
      var donationId = payment.donationId;
      for (
        var attempt = 0;
        donationId == null && attempt < _ledgerPollAttempts;
        attempt++
      ) {
        await Future<void>.delayed(_ledgerPollInterval);
        if (!mounted) return;
        donationId = (await _paymentService.fetchPayment(
          payment.id,
        )).donationId;
      }
      if (donationId == null) {
        _showMessage(
          'Your payment went through. The donation will appear in your '
          'activity shortly.',
        );
        _invalidateDonorData();
        if (mounted) Navigator.of(context).pop();
        return;
      }
      final donation = await _donationService.fetchDonation(donationId);
      if (!mounted) return;
      _invalidateDonorData();
      setState(() {
        _completed = donation;
        _stage = _Stage.moneyStatus;
      });
    } on ApiException catch (e) {
      _showMessage(e.message);
    } catch (_) {
      _showMessage('Could not load your donation. Check the Activity tab.');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _pledgeGoods() async {
    if (_completed != null || _saving) return;
    setState(() => _saving = true);
    try {
      final donation = await _donationService.pledgeGoods(
        eventId: widget.campaign!.eventId,
        input: _goodsInput,
      );
      if (!mounted) return;
      _invalidateDonorData();
      setState(() {
        _completed = donation;
        _stage = _Stage.goodsStatus;
      });
    } on ApiException catch (e) {
      _showMessage(e.message);
    } catch (_) {
      _showMessage('Could not pledge the donation. Please try again.');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  void _startEdit() {
    final d = _completed;
    if (d == null || !d.canModify) return;
    final goods = widget.campaign?.neededGoods ?? const <GoodsType>[];
    final listed = goods.where((g) => g.id == d.goodsType).toList();
    if (listed.isEmpty || d.goodsType == GoodsTypes.other.id) {
      _selectedGood = null;
      _otherGoodSelected = true;
    } else {
      _selectedGood = listed.first;
      _otherGoodSelected = false;
    }
    _otherGoodController.text = d.goodsItem ?? '';
    _quantity = d.goodsQuantity ?? 1;
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

  Future<void> _saveEdit() async {
    final d = _completed;
    if (d == null || _saving) return;
    setState(() => _saving = true);
    try {
      final updated = await _donationService.updateGoods(d.id, _goodsInput);
      if (!mounted) return;
      _invalidateDonorData();
      setState(() {
        _completed = updated;
        _editing = false;
        _stage = _Stage.goodsStatus;
      });
      _showMessage(
        'Donation Updated — your donation details have been successfully '
        'updated.',
      );
    } on ApiException catch (e) {
      _showMessage(e.message);
    } catch (_) {
      _showMessage('Could not save the changes. Please try again.');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
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
                  _CancelSummaryLine('Item', d.goodsLabel),
                  _CancelSummaryLine('Campaign', d.eventTitle),
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
    setState(() => _saving = true);
    try {
      final cancelled = await _donationService.cancel(d.id);
      if (!mounted) return;
      _invalidateDonorData();
      setState(() => _completed = cancelled);
    } on ApiException catch (e) {
      _showMessage(e.message);
    } catch (_) {
      _showMessage('Could not cancel the donation. Please try again.');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
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
          leading:
              (_stage == _Stage.paymentCheckout && _creatingPayment) ||
                  (_saving && !_isTerminal)
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
    _Stage.paymentCheckout => _method?.label ?? 'Payment',
    _Stage.paymentFailed || _Stage.paymentSuccess => 'Payment',
    _Stage.moneyStatus => 'Donation Details',
    _Stage.goodsSelectItem => _editing ? 'Edit Donation' : 'Select Goods',
    _Stage.goodsPickup => _editing ? 'Edit Pickup Details' : 'Pickup Details',
    _Stage.goodsStatus => 'Donation Details',
  };

  Widget _buildStage() => switch (_stage) {
    _Stage.chooseType => _chooseTypeStage(),
    _Stage.enterAmount => _enterAmountStage(),
    _Stage.choosePayment => _choosePaymentStage(),
    _Stage.review => _reviewStage(),
    _Stage.paymentCheckout => _paymentCheckoutStage(),
    _Stage.paymentFailed => _paymentFailedStage(),
    _Stage.paymentSuccess => _paymentSuccessStage(),
    _Stage.moneyStatus => _moneyStatusStage(),
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
                      DonationStepProgress(
                        current: step - _skippedSteps,
                        total: stepCount - _skippedSteps,
                      ),
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
        if (_acceptsMoney) ...[
          DonationOptionTile(
            title: 'Money',
            subtitle: 'Give a peso amount through a payment method',
            icon: Icons.payments_outlined,
            selected: _type == DonationKind.money,
            onTap: () => setState(() => _type = DonationKind.money),
          ),
          const SizedBox(height: 12),
        ],
        if (_acceptsGoods)
          DonationOptionTile(
            title: 'Goods',
            subtitle: 'Pledge physical items like food, clothing, or supplies',
            icon: Icons.inventory_2_outlined,
            selected: _type == DonationKind.goods,
            onTap: () => setState(() => _type = DonationKind.goods),
          ),
      ],
      footer: FilledButton(
        onPressed: _type == null
            ? null
            : () => setState(
                () => _stage = _type == DonationKind.money
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
                label: DonationFormat.pesoFull(preset),
                selected: !usingCustom && _presetAmount == preset,
                onTap: () => setState(() {
                  if (_presetAmount != preset || usingCustom) _resetCheckout();
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
          onChanged: (_) => setState(_resetCheckout),
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
                amount == null ? '—' : DonationFormat.pesoFull(amount),
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
              'Select how you would like to pay. Payments are processed '
              'securely by Xendit.',
        ),
        const SizedBox(height: 16),
        for (final method in DonationPaymentMethod.values) ...[
          DonationOptionTile(
            title: method.label,
            subtitle: method.description,
            leading: PaymentMethodBadge(method),
            selected: _method == method,
            onTap: () => setState(() {
              if (_method != method) _resetCheckout();
              _method = method;
            }),
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
            DonationSummaryRow('Campaign', _campaignTitle),
            const DonationSummaryRow('Donation Type', 'Money'),
            DonationSummaryRow(
              'Amount',
              DonationFormat.pesoFull(amount),
              emphasize: true,
            ),
            DonationSummaryRow('Payment Method', _method?.label ?? '—'),
          ],
        ),
        const SizedBox(height: 12),
        const Text(
          'Your donation is only recorded once the payment gateway confirms '
          'the payment.',
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
              onPressed: _startPayment,
              child: const Text('Proceed to Payment'),
            ),
          ),
        ],
      ),
    );
  }

  // ------------------------------------------------- Step 5: live checkout
  Widget _paymentCheckoutStage() {
    final method = _method;
    final payment = _payment;
    if (_creatingPayment || payment == null || method == null) {
      return CheckoutPreparingView(
        method: method ?? DonationPaymentMethod.gcash,
      );
    }
    if (method == DonationPaymentMethod.qrph) {
      return CheckoutQrView(
        payment: payment,
        onCheckNow: _checkPayment,
        checking: _checkingPayment,
      );
    }
    return CheckoutExternalView(
      payment: payment,
      onOpenCheckout: () => _openCheckout(payment),
      onCheckNow: _checkPayment,
      checking: _checkingPayment,
    );
  }

  Widget _paymentFailedStage() {
    return Column(
      children: [
        Expanded(
          child: CheckoutFailedView(
            method: _method,
            reason: _paymentError ?? 'The payment did not go through.',
            expired: _paymentExpired,
          ),
        ),
        _FooterBar(
          child: Column(
            children: [
              FilledButton(
                onPressed: () => setState(() {
                  _resetCheckout();
                  _stage = _Stage.choosePayment;
                }),
                child: const Text('Try again'),
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
            title: 'Payment Completed',
            message:
                '${DonationFormat.pesoFull(_effectiveAmount ?? 0)} was '
                'paid via ${_method?.label ?? ''}.\n\nYour donation will be '
                'pledged and reviewed by a CARES Director before it is '
                'confirmed.',
            extra: _paymentReference == null
                ? null
                : _PaymentReferenceCard(
                    label: switch (_method) {
                      DonationPaymentMethod.gcash => 'GCash Reference No.',
                      DonationPaymentMethod.qrph => 'QR Ph Reference No.',
                      _ => 'Payment Reference No.',
                    },
                    reference: _paymentReference!,
                  ),
          ),
        ),
        _FooterBar(
          child: FilledButton(
            onPressed: _saving ? null : _pledgeMoney,
            child: _saving
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2.2,
                      color: Colors.white,
                    ),
                  )
                : const Text('Continue'),
          ),
        ),
      ],
    );
  }

  // ------------------------------- Money Steps 6–8: verification tracking
  Widget _moneyStatusStage() {
    final donation = _completed;
    if (donation == null) return const SizedBox.shrink();
    final status = donation.status;
    final isConfirmed = status == DonationStatus.confirmed;
    final isDeclined = status == DonationStatus.declined;

    final (String heading, String message) = switch (status) {
      DonationStatus.verifying => (
        'Verifying',
        'Your donation is being verified.\n\nThe Director has checked your '
            'payment and is now confirming the donation. The donation is not '
            'confirmed yet.',
      ),
      DonationStatus.confirmed => (
        'Donation Successful!',
        'Your donation has been verified and confirmed by CARES. Thank you '
            'for your generosity!',
      ),
      DonationStatus.declined => (
        'Donation Declined',
        'CARES could not verify this payment. Reach out to the CARES office '
            'with your payment reference if this is unexpected.',
      ),
      _ => (
        'Donation Pledged',
        'Your payment was received and your donation has been pledged.\n\n'
            'A CARES Director will review the payment details and reference '
            'number. The donation is not confirmed yet.',
      ),
    };
    final accent = isDeclined ? AppColors.error : AppColors.primary;

    return Column(
      children: [
        Expanded(
          child: RefreshIndicator(
            onRefresh: _refreshDonation,
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
              child: Center(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 560),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      _StatusCard(
                        icon: isConfirmed
                            ? Icons.celebration_rounded
                            : isDeclined
                            ? Icons.cancel_outlined
                            : status == DonationStatus.verifying
                            ? Icons.fact_check_outlined
                            : Icons.hourglass_top_rounded,
                        accent: accent,
                        heading: heading,
                        message: message,
                        donation: donation,
                      ),
                      const SizedBox(height: 16),
                      DonationSummaryCard(
                        rows: [
                          DonationSummaryRow('Campaign', donation.eventTitle),
                          const DonationSummaryRow('Donation Type', 'Money'),
                          DonationSummaryRow(
                            'Amount',
                            DonationFormat.pesoFull(donation.amount),
                            emphasize: true,
                          ),
                          if (donation.paymentMethod != null)
                            DonationSummaryRow(
                              'Payment Method',
                              donation.paymentMethod!.label,
                            ),
                          DonationSummaryRow(
                            donation.paymentReferenceLabel,
                            donation.paymentReference ?? '—',
                          ),
                          DonationSummaryRow(
                            'Donation Date',
                            DonationFormat.dateTime(donation.createdAt),
                          ),
                          DonationSummaryRow('Donation ID', donation.reference),
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
        ),
        _FooterBar(child: _moneyStatusFooter(status)),
      ],
    );
  }

  Widget _moneyStatusFooter(DonationStatus status) {
    final donation = _completed;
    switch (status) {
      case DonationStatus.confirmed:
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
              child: const Text('Back'),
            ),
          ],
        );
      case DonationStatus.verifying:
        return _statusFooter(
          'Your donation is being verified by the CARES Director. You will be '
          'notified once it is confirmed.',
        );
      case DonationStatus.declined:
        return _statusFooter(
          'This donation is closed. It stays in your activity for your records.',
        );
      default:
        return _statusFooter(
          'A CARES Director will verify your payment. You will see the '
          'status change to Verifying once it has been reviewed.',
        );
    }
  }

  // ==================================================== Goods flow

  // ------------------------------------------- Goods Step 2: select item
  Widget _goodsSelectItemStage() {
    final goods = widget.campaign?.neededGoods ?? const <GoodsType>[];
    final good = _selectedGood;
    return _stepScaffold(
      step: 2,
      content: [
        const DonationStepHeader(
          title: 'What would you like to donate?',
          subtitle: 'These are the goods this event asks for.',
        ),
        const SizedBox(height: 16),
        for (final item in goods) ...[
          DonationOptionTile(
            title: item.label,
            icon: item.icon,
            selected: !_otherGoodSelected && good?.id == item.id,
            onTap: () => setState(() {
              _selectedGood = item;
              _otherGoodSelected = false;
            }),
          ),
          const SizedBox(height: 12),
        ],
        DonationOptionTile(
          title: 'Other',
          subtitle: 'Donate something not listed here',
          icon: Icons.add_circle_outline,
          selected: _otherGoodSelected,
          onTap: () => setState(() {
            _otherGoodSelected = true;
            _selectedGood = null;
          }),
        ),
        if (_otherGoodSelected || good != null) ...[
          const SizedBox(height: 12),
          _FieldLabel(_otherGoodSelected ? 'Item' : 'Details (optional)'),
          const SizedBox(height: 6),
          TextField(
            controller: _otherGoodController,
            textCapitalization: TextCapitalization.sentences,
            inputFormatters: [LengthLimitingTextInputFormatter(120)],
            onChanged: (_) => setState(() {}),
            decoration: InputDecoration(
              hintText: _otherGoodSelected
                  ? 'What would you like to donate?'
                  : 'e.g. 5kg bags of rice',
            ),
          ),
          const SizedBox(height: 14),
          _FieldLabel('Quantity'),
          const SizedBox(height: 6),
          _QuantityStepper(
            value: _quantity,
            onChanged: (value) => setState(() => _quantity = value),
          ),
        ],
      ],
      footer: FilledButton(
        onPressed: _goodsItem != null
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
          'CARES uses these details to schedule the pickup and will update '
          'your donation once the goods are collected.',
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
    final item = _goodsSummary;
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
            DonationSummaryRow('Campaign', _campaignTitle),
            const DonationSummaryRow('Donation Type', 'Goods'),
            DonationSummaryRow('Item', item ?? '—', emphasize: true),
            DonationSummaryRow('Quantity', '$_quantity'),
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
              onPressed: _saving ? null : (_editing ? _saveEdit : _pledgeGoods),
              child: _saving
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2.2,
                        color: Colors.white,
                      ),
                    )
                  : Text(_editing ? 'Save Changes' : 'Pledge Donation'),
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
    final status = donation.status;
    final isConfirmed = status == DonationStatus.confirmed;
    final isClosed = donation.isCancelled || donation.isDeclined;

    final (String heading, String message) = switch (status) {
      DonationStatus.awaitingPickup => (
        'Waiting for Pickup',
        'A CARES volunteer will collect your donation on your selected date '
            'and time. This donation is locked because the pickup process has '
            'already started.',
      ),
      DonationStatus.verifying => (
        'Verifying',
        'Your donation is being verified.\n\nCARES is checking the received '
            'goods and donation details. The donation is not confirmed yet.',
      ),
      DonationStatus.confirmed => (
        'Donation Confirmed!',
        'Your donation has been received and verified by CARES. Thank you for '
            'your generosity!',
      ),
      DonationStatus.cancelled => (
        'Donation Cancelled',
        'Your donation has been cancelled successfully. It stays in your '
            'donation history for your records.',
      ),
      DonationStatus.declined => (
        'Donation Declined',
        'CARES could not receive or verify these goods. Reach out to the '
            'CARES office if this is unexpected.',
      ),
      DonationStatus.pledged => (
        'Donation Pledged',
        'Your donation has been pledged successfully.\n\nCARES will arrange '
            'the pickup based on your selected schedule. The donation is not '
            'confirmed yet.',
      ),
    };
    final accent = isClosed ? AppColors.error : AppColors.primary;

    return Column(
      children: [
        Expanded(
          child: RefreshIndicator(
            onRefresh: _refreshDonation,
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
              child: Center(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 560),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      _StatusCard(
                        icon: isClosed
                            ? Icons.cancel_outlined
                            : isConfirmed
                            ? Icons.verified_rounded
                            : Icons.local_shipping_outlined,
                        accent: accent,
                        heading: heading,
                        message: message,
                        donation: donation,
                      ),
                      const SizedBox(height: 16),
                      DonationSummaryCard(
                        rows: [
                          DonationSummaryRow('Campaign', donation.eventTitle),
                          const DonationSummaryRow('Donation Type', 'Goods'),
                          DonationSummaryRow('Item', donation.goodsLabel),
                          DonationSummaryRow(
                            'Quantity',
                            '${donation.goodsQuantity ?? 1}',
                          ),
                          DonationSummaryRow(
                            'Credited Value',
                            DonationFormat.pesoFull(donation.amount),
                          ),
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
                            DonationFormat.dateTime(donation.createdAt),
                          ),
                          DonationSummaryRow('Donation ID', donation.reference),
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
        ),
        _FooterBar(child: _goodsStatusFooter(status)),
      ],
    );
  }

  Widget _goodsStatusFooter(DonationStatus status) {
    final donation = _completed;

    switch (status) {
      case DonationStatus.pledged:
        return Column(
          children: [
            FilledButton.icon(
              onPressed: _saving ? null : _startEdit,
              icon: const Icon(Icons.edit_outlined, size: 18),
              label: const Text('Edit Donation'),
            ),
            const SizedBox(height: 10),
            OutlinedButton.icon(
              onPressed: _saving ? null : _confirmCancel,
              icon: const Icon(Icons.cancel_outlined, size: 18),
              label: const Text('Cancel Donation'),
              style: OutlinedButton.styleFrom(
                minimumSize: const Size.fromHeight(52),
                foregroundColor: AppColors.error,
                side: BorderSide(color: AppColors.error.withValues(alpha: 0.5)),
              ),
            ),
          ],
        );

      case DonationStatus.awaitingPickup:
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
            _statusFooter(
              'CARES will update this donation once the goods are picked up.',
            ),
          ],
        );

      case DonationStatus.verifying:
        return _statusFooter(
          'Your donation is being verified by the CARES team. You will be '
          'notified once it is confirmed.',
        );

      case DonationStatus.confirmed:
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
              child: const Text('Back'),
            ),
          ],
        );

      case DonationStatus.cancelled:
      case DonationStatus.declined:
        return FilledButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Back to My Donations'),
        );
    }
  }

  Widget _statusFooter(String message) {
    return Column(
      children: [
        Text(
          message,
          textAlign: TextAlign.center,
          style: const TextStyle(
            fontSize: 12,
            height: 1.4,
            color: AppColors.textSecondary,
          ),
        ),
        const SizedBox(height: 12),
        FilledButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Back'),
        ),
      ],
    );
  }
}

/// The heading, status pill and tracker at the top of a status view.
class _StatusCard extends StatelessWidget {
  const _StatusCard({
    required this.icon,
    required this.accent,
    required this.heading,
    required this.message,
    required this.donation,
  });

  final IconData icon;
  final Color accent;
  final String heading;
  final String message;
  final Donation donation;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppColors.cardRadius),
        border: Border.all(color: AppColors.borderCard),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: accent, size: 24),
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
            label: donation.status.upperLabel,
            done: donation.isComplete,
            cancelled: donation.isCancelled || donation.isDeclined,
          ),
          const SizedBox(height: 18),
          DonationStatusTracker(kind: donation.kind, status: donation.status),
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
    );
  }
}

/// − 3 + for how many units are being given.
class _QuantityStepper extends StatelessWidget {
  const _QuantityStepper({required this.value, required this.onChanged});

  final int value;
  final ValueChanged<int> onChanged;

  static const _max = 10000;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
      decoration: BoxDecoration(
        color: AppColors.fieldFill,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.fieldBorder),
      ),
      child: Row(
        children: [
          IconButton(
            onPressed: value > 1 ? () => onChanged(value - 1) : null,
            icon: const Icon(Icons.remove_rounded),
            color: AppColors.primary,
          ),
          Expanded(
            child: Text(
              '$value',
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.w800,
                color: AppColors.textPrimary,
              ),
            ),
          ),
          IconButton(
            onPressed: value < _max ? () => onChanged(value + 1) : null,
            icon: const Icon(Icons.add_rounded),
            color: AppColors.primary,
          ),
        ],
      ),
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
    this.extra,
  });

  final Widget icon;
  final String title;
  final String message;

  /// Optional content shown under the message (e.g. a payment reference).
  final Widget? extra;

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
            if (extra != null) ...[const SizedBox(height: 20), extra!],
          ],
        ),
      ),
    );
  }
}

/// Shows the reference number issued by the payment channel so the donor can
/// keep it — the Director uses it to verify the payment.
class _PaymentReferenceCard extends StatelessWidget {
  const _PaymentReferenceCard({required this.label, required this.reference});

  final String label;
  final String reference;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: AppColors.primary.withValues(alpha: 0.06),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.primary.withValues(alpha: 0.25)),
      ),
      child: Column(
        children: [
          Text(
            label,
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: AppColors.textSecondary,
            ),
          ),
          const SizedBox(height: 6),
          SelectableText(
            reference,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w800,
              letterSpacing: 1.5,
              color: AppColors.primary,
            ),
          ),
          const SizedBox(height: 6),
          const Text(
            'Keep this for your records. CARES will match it during '
            'verification.',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 11.5, color: AppColors.textMuted),
          ),
        ],
      ),
    );
  }
}
