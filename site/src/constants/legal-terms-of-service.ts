import type { LegalDocument } from '../types/legal'
import { LANDING_CONTACT } from './landing-bulletin'
import { LEGAL_EFFECTIVE_DATE } from './legal-privacy-policy'

/** Public terms of service for the website, staff portal and CARES mobile app.
 *  Static content — nothing here is fetched. Keep in step with the per-role notices in
 *  the mobile app's cares_terms_dialog.dart. */
export const TERMS_OF_SERVICE: LegalDocument = {
  title: 'Terms of Service',
  summary:
    'The rules for using cares-online.com, the CARES staff portal and the CARES mobile app — what you can expect from us and what we expect from you.',
  effectiveDate: LEGAL_EFFECTIVE_DATE,
  sections: [
    {
      id: 'acceptance',
      title: 'Acceptance of these terms',
      blocks: [
        'These Terms of Service ("Terms") are an agreement between you and the University of Cebu — Lapu-Lapu and Mandaue, through its Community Awareness, Relations and Extension Services office ("UCLM CARES", "we", "us"). They apply to cares-online.com, the CARES staff portal and the CARES mobile app (together, the "Services").',
        'By creating an account or using the Services you agree to these Terms and to our Privacy Policy. If you do not agree, do not use the Services.',
      ],
    },
    {
      id: 'eligibility',
      title: 'Who may use the Services',
      blocks: [
        {
          items: [
            { term: 'Staff and directors', text: 'use the portal with accounts issued or approved by CARES, and only for their assigned duties.' },
            { term: 'Volunteers', text: 'are UCLM students, employees and partners who register in the mobile app and pass identity review.' },
            { term: 'Donors', text: 'are individuals or organisations who give to CARES programmes.' },
            { term: 'Beneficiaries', text: 'are community members and students who apply for assistance.' },
          ],
        },
        'Anyone under 18 may use the Services only with the consent of a parent or guardian. We may decline or revoke a registration that does not meet a programme’s requirements.',
      ],
    },
    {
      id: 'accounts',
      title: 'Your account',
      blocks: [
        {
          items: [
            'Give accurate, current and complete information, and keep it up to date.',
            'Keep your password private and stay in control of the devices you are signed in on. You are responsible for activity under your account.',
            'Do not share your account or let anyone else check in, donate or request assistance in your name.',
            'Tell us straight away if you think someone else has access; we may suspend the account while we investigate.',
          ],
        },
      ],
    },
    {
      id: 'acceptable-use',
      title: 'Acceptable use',
      blocks: [
        'You agree not to:',
        {
          items: [
            'Submit false, forged or someone else’s identity documents, face captures or information.',
            'Falsify attendance — for example, by spoofing your location or checking in for another person.',
            'Access data, accounts or portal areas you are not authorised to use, or try to bypass access controls.',
            'Upload malware, probe for vulnerabilities, overload the Services or scrape them by automated means.',
            'Harass, threaten or discriminate against beneficiaries, volunteers, donors or staff, including in chat and support tickets.',
            'Share confidential information about beneficiaries outside what an activity requires.',
            'Use the Services for any unlawful, commercial or political purpose unrelated to CARES programmes.',
          ],
        },
      ],
    },
    {
      id: 'volunteering',
      title: 'Volunteering and attendance',
      blocks: [
        'Volunteers follow the instructions of the CARES coordinator on site and the University’s code of conduct. Attendance recorded through the app — including location and face verification — is the basis for service hours, rankings and certificates. A coordinator may correct or reject a record that appears inaccurate.',
      ],
    },
    {
      id: 'donations',
      title: 'Donations and payments',
      blocks: [
        {
          items: [
            'Online donations are processed by our third-party payment gateway under its own terms. CARES never receives your card or bank credentials.',
            'A donation is confirmed only once the payment provider or CARES staff verifies it; receipts are issued for confirmed donations.',
            'Donations tagged to a drive are applied to that drive first; any balance after the drive closes goes to the general assistance fund.',
            'Donations are voluntary and generally non-refundable. If you were charged in error, contact us within 30 days and we will review it with the payment provider.',
          ],
        },
      ],
    },
    {
      id: 'assistance',
      title: 'Assistance requests',
      blocks: [
        'Assistance is limited and allocated on need. Registering or submitting a request does not guarantee assistance. CARES may ask for supporting documents or a visit before deciding, and may decline requests or close accounts where information is knowingly false.',
      ],
    },
    {
      id: 'content',
      title: 'Content you submit',
      blocks: [
        'You keep ownership of what you submit, such as photos, documents, evaluation answers and messages. You grant UCLM CARES a non-exclusive, royalty-free licence to use it to run the Services and its programmes, and to include it in aggregated, non-identifying reports. You confirm you have the right to submit it.',
      ],
    },
    {
      id: 'intellectual-property',
      title: 'Our intellectual property',
      blocks: [
        'The Services, the CARES and UCLM names and logos, the CARES Bulletin and other site content belong to the University or its licensors. You may view and share public pages for personal, non-commercial purposes; any other use needs our written permission. Certificates issued to you may be shared as proof of your service but must not be altered.',
      ],
    },
    {
      id: 'third-party',
      title: 'Third-party services',
      blocks: [
        'The Services rely on third parties such as sign-in providers, payment gateways, email and mapping services. Their own terms and privacy policies apply to what you do with them, and we are not responsible for their content or availability.',
      ],
    },
    {
      id: 'availability',
      title: 'Availability and changes to the Services',
      blocks: [
        'We aim to keep the Services available but may suspend them for maintenance, security or reasons outside our control. We may add, change or remove features at any time. The portal may also restrict access by time or network under the University’s security policies.',
      ],
    },
    {
      id: 'suspension',
      title: 'Suspension and termination',
      blocks: [
        'You may close your account at any time by contacting us. We may suspend or end your access if you breach these Terms, misuse the Services, or no longer meet a programme’s requirements. Records the law or an audit requires are kept after an account closes, as described in the Privacy Policy.',
      ],
    },
    {
      id: 'disclaimers',
      title: 'Disclaimers',
      blocks: [
        'The Services are provided "as is" and "as available". To the extent the law allows, we make no warranties that they will be uninterrupted, error-free, or fit for a particular purpose. Activity schedules, locations and programme details may change.',
      ],
    },
    {
      id: 'liability',
      title: 'Limitation of liability',
      blocks: [
        'To the extent the law allows, UCLM CARES and the University are not liable for indirect, incidental or consequential loss arising from your use of the Services. Nothing in these Terms limits liability that cannot be limited under Philippine law, including for fraud, gross negligence or your rights under the Data Privacy Act.',
      ],
    },
    {
      id: 'indemnity',
      title: 'Indemnity',
      blocks: [
        'You agree to compensate UCLM CARES and the University for claims, losses and costs arising from your breach of these Terms or your misuse of the Services.',
      ],
    },
    {
      id: 'governing-law',
      title: 'Governing law and disputes',
      blocks: [
        'These Terms are governed by the laws of the Republic of the Philippines. We encourage you to contact us first so we can try to resolve any concern informally. Disputes that cannot be resolved this way are subject to the exclusive jurisdiction of the proper courts of Mandaue City, Cebu.',
      ],
    },
    {
      id: 'changes',
      title: 'Changes to these terms',
      blocks: [
        'We may update these Terms from time to time. The effective date at the top shows the current version, and material changes will be announced in the app or by email. Continuing to use the Services after a change takes effect means you accept the updated Terms.',
      ],
    },
    {
      id: 'contact',
      title: 'Contact us',
      blocks: [
        'Questions about these Terms can be sent to UCLM CARES:',
        {
          items: [
            { term: 'Email', text: LANDING_CONTACT.email },
            { term: 'Phone', text: LANDING_CONTACT.phone },
            { term: 'Address', text: LANDING_CONTACT.address },
          ],
        },
      ],
    },
  ],
}
