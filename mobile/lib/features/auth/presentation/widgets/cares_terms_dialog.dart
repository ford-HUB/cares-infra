import 'package:flutter/material.dart';
import 'package:mobile/core/theme/app_theme.dart';

/// Which sign-up the notice is being shown for — the copy differs per role.
enum CaresTermsAudience {
  donor('Donor'),
  volunteer('Volunteer'),
  beneficiary('Beneficiary');

  const CaresTermsAudience(this.label);

  final String label;

  List<_TermsSection> get _sections => switch (this) {
    CaresTermsAudience.donor => _donorTermsSections,
    CaresTermsAudience.volunteer => _volunteerTermsSections,
    CaresTermsAudience.beneficiary => _beneficiaryTermsSections,
  };
}

/// Terms + privacy notice a signee has to read before the sign-up checkbox ticks.
///
/// The copy below is placeholder/mock content for the design pass — it is held in this
/// file, not fetched from the server.
const List<_TermsSection> _donorTermsSections = [
  _TermsSection(
    title: '1. About this notice',
    body:
        'CARES is the community assistance programme of the University of Cebu — '
        'Lapu-Lapu and Mandaue. This notice explains what we collect when you sign up '
        'as a donor, why we keep it, and what you can ask us to do with it. By creating '
        'a donor account you confirm that you have read and understood it.',
  ),
  _TermsSection(
    title: '2. What we collect',
    body:
        'Your name, email address, mobile number and address are collected so we can '
        'issue receipts and acknowledgements for what you give. If you sign up through '
        'Google or Facebook, we only receive the basic profile details you approve on '
        'that provider\'s consent screen. We never ask for card numbers or bank '
        'credentials inside this app.',
  ),
  _TermsSection(
    title: '3. How your donation is used',
    body:
        'Donations fund relief packs, scholarship assistance, medical outreach and the '
        'volunteer operations that deliver them. Where you tag a donation to a specific '
        'drive, it is applied to that drive first; anything left after the drive closes '
        'moves to the general assistance fund so it does not sit idle.',
  ),
  _TermsSection(
    title: '4. Receipts and records',
    body:
        'Every recorded donation produces an acknowledgement in your donor dashboard. '
        'Financial records are retained for the period required by Philippine tax and '
        'audit rules, even if you later close your account, because we cannot delete a '
        'record that an audit still needs.',
  ),
  _TermsSection(
    title: '5. Who can see your details',
    body:
        'Your details are visible to CARES staff who handle donations and to the '
        'auditors who review them. We do not sell donor lists and we do not share your '
        'contact details with other organisations. Public reports and drive pages show '
        'aggregated totals only, never an individual donor, unless you have asked us in '
        'writing to be named.',
  ),
  _TermsSection(
    title: '6. Communications',
    body:
        'We send transactional messages — receipts, verification codes and updates on '
        'drives you supported. Newsletters and campaign invitations are optional and can '
        'be switched off from your profile at any time without affecting your account.',
  ),
  _TermsSection(
    title: '7. Keeping your account safe',
    body:
        'You are responsible for the password on this account and for the device you '
        'stay signed in on. Tell us straight away if you think someone else has access, '
        'and we will suspend the account while we sort it out.',
  ),
  _TermsSection(
    title: '8. Your choices',
    body:
        'You may ask to see the personal data we hold about you, correct anything that '
        'is wrong, withdraw consent for optional messages, or ask us to close your '
        'account. Requests go to the CARES office and are answered within the timeframe '
        'set by the Data Privacy Act of 2012.',
  ),
  _TermsSection(
    title: '9. Changes to this notice',
    body:
        'If we change how donor data is handled, the updated notice appears here and you '
        'will be asked to agree again the next time it matters. Continuing to use the '
        'donor account after that point means you accept the current version.',
  ),
];

const List<_TermsSection> _volunteerTermsSections = [
  _TermsSection(
    title: '1. About this notice',
    body:
        'CARES is the community assistance programme of the University of Cebu — '
        'Lapu-Lapu and Mandaue. This notice explains what we collect when you sign up '
        'as a volunteer, why we keep it, and what you can ask us to do with it. By '
        'creating a volunteer account you confirm that you have read and understood it.',
  ),
  _TermsSection(
    title: '2. What we collect',
    body:
        'Your name, contact details, department or affiliation, the school or government '
        'ID you upload, and the face captures taken during sign-up. The ID and face '
        'captures exist to confirm that the person joining an activity is the person who '
        'registered — they are not used for anything else.',
  ),
  _TermsSection(
    title: '3. ID checks and face capture',
    body:
        'Your uploaded ID is read automatically to fill in your details, and you get to '
        'correct anything the reader gets wrong before it is saved. Your face captures '
        'are stored as a template used to match you at attendance check-in. You may ask '
        'for the template to be deleted, but attendance will then have to be recorded '
        'manually by a coordinator.',
  ),
  _TermsSection(
    title: '4. Attendance and location',
    body:
        'When you check in to an activity, the app records the time and your device '
        'location so we can confirm you were at the site. Location is read only at '
        'check-in and check-out — never in the background — and is kept with that '
        'activity record, not as a movement history.',
  ),
  _TermsSection(
    title: '5. Conduct while volunteering',
    body:
        'You agree to follow the instructions of the CARES coordinator on site, to treat '
        'beneficiaries and fellow volunteers with respect, and to keep confidential '
        'anything you learn about a beneficiary during an activity. Serious or repeated '
        'breaches can end your participation in the programme.',
  ),
  _TermsSection(
    title: '6. Who can see your details',
    body:
        'Your profile, hours and attendance are visible to CARES staff and to the '
        'coordinators of activities you join. Service records may be shown to your '
        'department when you request a certificate. We do not sell volunteer data or '
        'share it with other organisations.',
  ),
  _TermsSection(
    title: '7. Communications',
    body:
        'We send operational messages — activity confirmations, schedule changes, '
        'verification codes and certificate notices. Invitations to optional drives can '
        'be switched off from your profile without affecting your account.',
  ),
  _TermsSection(
    title: '8. Keeping your account safe',
    body:
        'You are responsible for the password on this account and for the device you '
        'stay signed in on. Never let someone else check in using your account — that is '
        'treated as falsifying a service record. Tell us straight away if you think '
        'someone else has access.',
  ),
  _TermsSection(
    title: '9. Your choices',
    body:
        'You may ask to see the personal data we hold about you, correct anything that '
        'is wrong, withdraw consent for optional messages, or ask us to close your '
        'account. Attendance and certificate records already issued are kept for the '
        'period required by university and audit rules.',
  ),
  _TermsSection(
    title: '10. Changes to this notice',
    body:
        'If we change how volunteer data is handled, the updated notice appears here and '
        'you will be asked to agree again the next time it matters. Continuing to use '
        'the volunteer account after that point means you accept the current version.',
  ),
];

const List<_TermsSection> _beneficiaryTermsSections = [
  _TermsSection(
    title: '1. About this notice',
    body:
        'CARES is the community assistance programme of the University of Cebu — '
        'Lapu-Lapu and Mandaue. This notice explains what we collect when you register '
        'to receive assistance, why we keep it, and what you can ask us to do with it. '
        'By creating an account you confirm that you have read and understood it.',
  ),
  _TermsSection(
    title: '2. What we collect',
    body:
        'Your name, contact details, address, household information and the situation '
        'you are asking for help with. We collect only what is needed to assess and '
        'deliver assistance — you are never asked for bank credentials inside this app.',
  ),
  _TermsSection(
    title: '3. Honest information',
    body:
        'You confirm that the details you give are true and complete to the best of your '
        'knowledge. Assistance is limited and is allocated on need, so information that '
        'is knowingly false can lead to a request being declined and the account being '
        'closed.',
  ),
  _TermsSection(
    title: '4. How requests are assessed',
    body:
        'CARES staff review each request against the programme\'s criteria and the '
        'assistance available at the time. Registering does not by itself guarantee '
        'assistance, and we may ask for supporting documents or arrange a visit before a '
        'decision is made.',
  ),
  _TermsSection(
    title: '5. Who can see your details',
    body:
        'Your details are visible to CARES staff handling your request and to the '
        'auditors who review the programme. Volunteers helping on the ground see only '
        'what they need to deliver assistance. Public reports show totals only — never '
        'your name or your situation.',
  ),
  _TermsSection(
    title: '6. Records we keep',
    body:
        'Requests, approvals and the assistance released to you are recorded so the '
        'programme can be audited. These records are retained for the period required by '
        'university and government rules, even if you later close your account.',
  ),
  _TermsSection(
    title: '7. Communications',
    body:
        'We send messages about your request — status updates, schedules for releases '
        'and verification codes. These are part of the service and cannot be switched '
        'off while a request is open.',
  ),
  _TermsSection(
    title: '8. Keeping your account safe',
    body:
        'You are responsible for the password on this account and for the device you '
        'stay signed in on. Tell us straight away if you think someone else has access, '
        'and we will suspend the account while we sort it out.',
  ),
  _TermsSection(
    title: '9. Your choices',
    body:
        'You may ask to see the personal data we hold about you, correct anything that '
        'is wrong, or ask us to close your account. Requests go to the CARES office and '
        'are answered within the timeframe set by the Data Privacy Act of 2012.',
  ),
  _TermsSection(
    title: '10. Changes to this notice',
    body:
        'If we change how beneficiary data is handled, the updated notice appears here '
        'and you will be asked to agree again the next time it matters. Continuing to '
        'use the account after that point means you accept the current version.',
  ),
];

/// Opens the notice and resolves to `true` once it has been read to the end.
Future<bool> showCaresTermsDialog(
  BuildContext context,
  CaresTermsAudience audience,
) async {
  final accepted = await showDialog<bool>(
    context: context,
    barrierDismissible: true,
    builder: (_) => _CaresTermsDialog(audience: audience),
  );
  return accepted ?? false;
}

class _TermsSection {
  const _TermsSection({required this.title, required this.body});

  final String title;
  final String body;
}

class _CaresTermsDialog extends StatefulWidget {
  const _CaresTermsDialog({required this.audience});

  final CaresTermsAudience audience;

  @override
  State<_CaresTermsDialog> createState() => _CaresTermsDialogState();
}

class _CaresTermsDialogState extends State<_CaresTermsDialog> {
  final _scrollController = ScrollController();

  /// Flips once the reader has scrolled to the bottom — that is what ticks the checkbox.
  bool _reachedEnd = false;

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
    // Nothing to scroll on a tall screen still counts as read.
    WidgetsBinding.instance.addPostFrameCallback((_) => _onScroll());
  }

  @override
  void dispose() {
    _scrollController.removeListener(_onScroll);
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_reachedEnd || !_scrollController.hasClients) return;
    final position = _scrollController.position;
    if (position.pixels >= position.maxScrollExtent - 12) {
      setState(() => _reachedEnd = true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final media = MediaQuery.of(context);

    return Dialog(
      insetPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 40),
      backgroundColor: AppColors.surface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppColors.cardRadius),
      ),
      child: ConstrainedBox(
        constraints: BoxConstraints(maxHeight: media.size.height * 0.82),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            _header(),
            Flexible(child: _body()),
            _footer(),
          ],
        ),
      ),
    );
  }

  Widget _header() {
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 18, 12, 16),
      decoration: BoxDecoration(
        border: Border(bottom: BorderSide(color: AppColors.borderLight)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${widget.audience.label} terms & privacy notice',
                  style: const TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Scroll to the end to agree.',
                  style: TextStyle(
                    fontSize: 12.5,
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),
          IconButton(
            icon: const Icon(Icons.close_rounded, size: 20),
            color: AppColors.textSecondary,
            onPressed: () => Navigator.of(context).pop(_reachedEnd),
          ),
        ],
      ),
    );
  }

  Widget _body() {
    return Stack(
      children: [
        Scrollbar(
          controller: _scrollController,
          child: SingleChildScrollView(
            controller: _scrollController,
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Last updated 10 September 2026',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textMuted,
                  ),
                ),
                const SizedBox(height: 16),
                for (final section in widget.audience._sections) ...[
                  Text(
                    section.title,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    section.body,
                    style: TextStyle(
                      fontSize: 13,
                      height: 1.55,
                      color: AppColors.textSecondary,
                    ),
                  ),
                  const SizedBox(height: 18),
                ],
              ],
            ),
          ),
        ),
        if (!_reachedEnd)
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            height: 32,
            child: IgnorePointer(
              child: DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      AppColors.surface.withValues(alpha: 0),
                      AppColors.surface,
                    ],
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }

  Widget _footer() {
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 14, 20, 18),
      decoration: BoxDecoration(
        border: Border(top: BorderSide(color: AppColors.borderLight)),
      ),
      child: SizedBox(
        width: double.infinity,
        height: 48,
        child: ElevatedButton(
          onPressed: _reachedEnd ? () => Navigator.of(context).pop(true) : null,
          child: Text(
            _reachedEnd ? 'Done' : 'Scroll to the end to agree',
            style: const TextStyle(fontSize: 14.5, fontWeight: FontWeight.w700),
          ),
        ),
      ),
    );
  }
}
