import 'dart:async';

import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';

import '../../../core/theme/app_theme.dart';
import '../data/donation_format.dart';
import '../data/models/donation_models.dart';
import '../data/models/donation_payment_models.dart';
import 'donation_flow_widgets.dart';

/// Views for the live checkout stages of the money flow: the hand-off to
/// GCash / the hosted page, the in-app QR Ph code, and a failed attempt.

/// Shown while the server is opening the checkout with the gateway.
class CheckoutPreparingView extends StatelessWidget {
  const CheckoutPreparingView({super.key, required this.method});

  final DonationPaymentMethod method;

  @override
  Widget build(BuildContext context) {
    return _CheckoutBody(
      badge: PaymentMethodBadge(method, size: 64),
      title: 'Preparing your ${method.label} payment…',
      message:
          'Setting up a secure checkout with the payment gateway. '
          'This only takes a moment.',
      children: const [
        SizedBox(height: 8),
        SizedBox(
          width: 28,
          height: 28,
          child: CircularProgressIndicator(strokeWidth: 2.5),
        ),
      ],
    );
  }
}

/// GCash / card / bank: the payment happens outside the app. The donor can
/// re-open the page, and the screen keeps polling until the gateway reports.
class CheckoutExternalView extends StatelessWidget {
  const CheckoutExternalView({
    super.key,
    required this.payment,
    required this.onOpenCheckout,
    required this.onCheckNow,
    required this.checking,
  });

  final DonationPayment payment;
  final VoidCallback onOpenCheckout;
  final VoidCallback onCheckNow;
  final bool checking;

  @override
  Widget build(BuildContext context) {
    final method = payment.method;
    final (String title, String message, String openLabel) = switch (method) {
      DonationPaymentMethod.gcash => (
        'Finish paying in GCash',
        'GCash opened in your browser. Log in, review the amount and tap '
            'Pay. Once GCash confirms it, come back here — this screen '
            'updates by itself.',
        'Open GCash',
      ),
      DonationPaymentMethod.card => (
        'Enter your card details',
        'A secure Xendit page opened in your browser for your card and '
            '3-D Secure verification. Your card number never touches the '
            'CARES app or servers.',
        'Open secure card page',
      ),
      _ => (
        'Pay from your bank',
        'A secure Xendit page opened in your browser. Pick your bank '
            '(BPI, UnionBank, RCBC or Chinabank), sign in and approve the '
            'transfer.',
        'Open bank checkout',
      ),
    };

    return _CheckoutBody(
      badge: PaymentMethodBadge(method, size: 64),
      title: title,
      message: message,
      children: [
        _AmountLine(amount: payment.amount),
        const SizedBox(height: 14),
        FilledButton.icon(
          onPressed: onOpenCheckout,
          icon: const Icon(Icons.open_in_new_rounded, size: 18),
          label: Text(openLabel),
        ),
        const SizedBox(height: 10),
        OutlinedButton(
          onPressed: checking ? null : onCheckNow,
          style: OutlinedButton.styleFrom(
            minimumSize: const Size.fromHeight(48),
            foregroundColor: AppColors.textPrimary,
            side: const BorderSide(color: AppColors.borderCard),
          ),
          child: Text(checking ? 'Checking…' : "I've paid — check status"),
        ),
        const SizedBox(height: 18),
        const _WaitingLine(),
        const SizedBox(height: 14),
        _ReferenceLine(reference: payment.gatewayReference),
        if (payment.expiresAt case final expires?) ...[
          const SizedBox(height: 4),
          ExpiryCountdown(expiresAt: expires),
        ],
      ],
    );
  }
}

/// QR Ph: the code is rendered here and paid from any participating app.
class CheckoutQrView extends StatelessWidget {
  const CheckoutQrView({
    super.key,
    required this.payment,
    required this.onCheckNow,
    required this.checking,
  });

  final DonationPayment payment;
  final VoidCallback onCheckNow;
  final bool checking;

  @override
  Widget build(BuildContext context) {
    final qr = payment.qrString;
    return _CheckoutBody(
      badge: const PaymentMethodBadge(DonationPaymentMethod.qrph, size: 56),
      title: 'Scan to pay',
      message:
          'Open GCash, Maya or your bank app, choose Scan QR and point '
          'it at this code. The amount is already filled in.',
      children: [
        if (qr != null)
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: AppColors.borderCard),
            ),
            child: QrImageView(
              data: qr,
              version: QrVersions.auto,
              size: 232,
              gapless: true,
              eyeStyle: const QrEyeStyle(
                eyeShape: QrEyeShape.square,
                color: Color(0xFF0A2A5E),
              ),
              dataModuleStyle: const QrDataModuleStyle(
                dataModuleShape: QrDataModuleShape.square,
                color: Color(0xFF0A2A5E),
              ),
            ),
          ),
        const SizedBox(height: 14),
        _AmountLine(amount: payment.amount),
        const SizedBox(height: 16),
        const _WaitingLine(),
        const SizedBox(height: 10),
        TextButton(
          onPressed: checking ? null : onCheckNow,
          child: Text(checking ? 'Checking…' : "I've paid — check status"),
        ),
        _ReferenceLine(reference: payment.gatewayReference),
        if (payment.expiresAt case final expires?) ...[
          const SizedBox(height: 4),
          ExpiryCountdown(expiresAt: expires),
        ],
      ],
    );
  }
}

/// The gateway reported a failure or the checkout expired.
class CheckoutFailedView extends StatelessWidget {
  const CheckoutFailedView({
    super.key,
    required this.method,
    required this.reason,
    required this.expired,
  });

  final DonationPaymentMethod? method;
  final String reason;
  final bool expired;

  @override
  Widget build(BuildContext context) {
    return _CheckoutBody(
      badge: Container(
        width: 72,
        height: 72,
        decoration: BoxDecoration(
          color: AppColors.error.withValues(alpha: 0.1),
          shape: BoxShape.circle,
        ),
        child: Icon(
          expired ? Icons.timer_off_outlined : Icons.error_outline_rounded,
          size: 36,
          color: AppColors.error,
        ),
      ),
      title: expired ? 'Checkout expired' : 'Payment not completed',
      message: reason,
      children: const [],
    );
  }
}

/// "Expires in 12:34" that ticks down and reads "Expired" at zero.
class ExpiryCountdown extends StatefulWidget {
  const ExpiryCountdown({super.key, required this.expiresAt});

  final DateTime expiresAt;

  @override
  State<ExpiryCountdown> createState() => _ExpiryCountdownState();
}

class _ExpiryCountdownState extends State<ExpiryCountdown> {
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final left = widget.expiresAt.difference(DateTime.now());
    final String text;
    if (left.isNegative) {
      text = 'Expired';
    } else {
      final m = left.inMinutes.toString().padLeft(2, '0');
      final s = (left.inSeconds % 60).toString().padLeft(2, '0');
      text = 'Expires in $m:$s';
    }
    return Text(
      text,
      style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
    );
  }
}

// ------------------------------------------------------------- pieces

class _CheckoutBody extends StatelessWidget {
  const _CheckoutBody({
    required this.badge,
    required this.title,
    required this.message,
    required this.children,
  });

  final Widget badge;
  final String title;
  final String message;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(24, 28, 24, 24),
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 480),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Center(child: badge),
              const SizedBox(height: 20),
              Text(
                title,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w800,
                  color: AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: 10),
              Text(
                message,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 13.5,
                  height: 1.5,
                  color: AppColors.textSecondary,
                ),
              ),
              const SizedBox(height: 20),
              ...children,
            ],
          ),
        ),
      ),
    );
  }
}

class _AmountLine extends StatelessWidget {
  const _AmountLine({required this.amount});

  final int amount;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.borderCard),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          const Text(
            'Amount to pay',
            style: TextStyle(fontSize: 13, color: AppColors.textSecondary),
          ),
          Text(
            DonationFormat.pesoFull(amount),
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w800,
              color: AppColors.textPrimary,
            ),
          ),
        ],
      ),
    );
  }
}

class _WaitingLine extends StatelessWidget {
  const _WaitingLine();

  @override
  Widget build(BuildContext context) {
    return const Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        SizedBox(
          width: 14,
          height: 14,
          child: CircularProgressIndicator(strokeWidth: 2),
        ),
        SizedBox(width: 10),
        Text(
          'Waiting for the gateway to confirm…',
          style: TextStyle(fontSize: 12.5, color: AppColors.textSecondary),
        ),
      ],
    );
  }
}

class _ReferenceLine extends StatelessWidget {
  const _ReferenceLine({required this.reference});

  final String reference;

  @override
  Widget build(BuildContext context) {
    return Text(
      'Reference: $reference',
      textAlign: TextAlign.center,
      style: const TextStyle(
        fontSize: 12,
        color: AppColors.textMuted,
        fontFeatures: [FontFeature.tabularFigures()],
      ),
    );
  }
}
