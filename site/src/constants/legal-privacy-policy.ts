import type { LegalDocument } from '../types/legal'
import { LANDING_CONTACT } from './landing-bulletin'

/** Effective date shared by both legal documents; bump it whenever either changes. */
export const LEGAL_EFFECTIVE_DATE = '24 November 2026'

/** Public privacy policy, written to the Data Privacy Act of 2012 (RA 10173), its IRR
 *  and National Privacy Commission guidance. Static content — nothing here is fetched.
 *  Keep in step with the per-role notices in the mobile app's cares_terms_dialog.dart. */
export const PRIVACY_POLICY: LegalDocument = {
  title: 'Privacy Policy',
  summary:
    'How UCLM CARES collects, uses, shares and protects personal data on this website, the staff portal and the CARES mobile app — and the rights you have over it.',
  effectiveDate: LEGAL_EFFECTIVE_DATE,
  sections: [
    {
      id: 'who-we-are',
      title: 'Who we are',
      blocks: [
        'UCLM CARES (Community Awareness, Relations and Extension Services) is the community extension office of the University of Cebu — Lapu-Lapu and Mandaue ("UCLM", "CARES", "we", "us"). The University is the personal information controller for the data described in this policy.',
        'This policy covers cares-online.com, the CARES staff portal, and the CARES mobile app used by volunteers, donors and beneficiaries (together, the "Services"). The role-specific notices you agree to when you register in the app form part of this policy.',
      ],
    },
    {
      id: 'information-we-collect',
      title: 'Information we collect',
      blocks: [
        'We collect only what each programme needs. Depending on how you use the Services, this may include:',
        {
          items: [
            { term: 'Account and contact details', text: 'name, email address, mobile number, address, birth date, sex, department or affiliation, and your password (stored only as a one-way hash).' },
            { term: 'Identity documents', text: 'the school, staff or government ID you upload, and the details read from it to fill in your registration.' },
            { term: 'Face captures', text: 'photos taken during volunteer sign-up, converted into a face template used to confirm your identity at attendance check-in.' },
            { term: 'Attendance and location', text: 'the time and device location when you check in to or out of an activity. Location is read only at those moments, never in the background.' },
            { term: 'Donations', text: 'amounts, items, dates and payment references. Card and bank details are entered on our payment provider’s page and are never seen or stored by CARES.' },
            { term: 'Assistance requests', text: 'household information, the situation you need help with, residency documents and the assistance released to you.' },
            { term: 'Activity and communications', text: 'evaluation answers, certificates issued, support tickets, chat messages and announcements you receive.' },
            { term: 'Technical data', text: 'IP address, device and browser type, sign-in times and security logs, collected to keep accounts safe and the Services running.' },
          ],
        },
        'Government IDs, biometric data such as face templates, and information about health, education or household circumstances are treated as sensitive personal information and processed with additional safeguards.',
      ],
    },
    {
      id: 'how-we-collect',
      title: 'How we collect it',
      blocks: [
        {
          items: [
            'Directly from you, when you register, fill in your profile, upload documents, donate, check in or contact us.',
            'From sign-in providers such as Google or Facebook, limited to the basic profile details you approve on their consent screen.',
            'From CARES staff and coordinators, who record attendance, review requests and issue certificates.',
            'Automatically, through your device and browser when you use the Services.',
          ],
        },
      ],
    },
    {
      id: 'how-we-use',
      title: 'How we use your information',
      blocks: [
        {
          items: [
            'To create and verify your account, including email verification and ID review.',
            'To run community programmes: schedule activities, confirm attendance, rank volunteer participation and issue certificates.',
            'To assess and deliver assistance to beneficiaries, and to keep the records an audit requires.',
            'To process donations and issue receipts and acknowledgements.',
            'To send operational messages such as verification codes, schedule changes, request updates and receipts.',
            'To secure the Services: detect fraud or misuse, enforce access policies and investigate incidents.',
            'To prepare reports for the University and its partners, using aggregated figures that do not identify you.',
          ],
        },
        'We do not sell personal data, and we do not use it for advertising or for automated decisions that produce legal effects on you without a CARES staff member reviewing them.',
      ],
    },
    {
      id: 'legal-basis',
      title: 'Legal basis for processing',
      blocks: [
        'Under the Data Privacy Act of 2012, we process personal data on these grounds:',
        {
          items: [
            { term: 'Consent', text: 'which you give when you register and which you may withdraw for optional uses at any time.' },
            { term: 'Contract', text: 'to provide the Services you signed up for.' },
            { term: 'Legal obligation', text: 'to keep financial, tax and audit records required by Philippine law.' },
            { term: 'Legitimate interests', text: 'of the University in running its extension programmes securely, balanced against your rights.' },
          ],
        },
        'Sensitive personal information is processed only with your consent or where the law expressly allows it.',
      ],
    },
    {
      id: 'sharing',
      title: 'Who we share it with',
      blocks: [
        'Inside CARES, access is limited by role: staff see what their task requires, coordinators see the volunteers in their activities, and volunteers on the ground see only what they need to deliver assistance.',
        'We also use service providers who process data on our behalf under written agreements and only on our instructions:',
        {
          items: [
            'Cloud hosting, database and file-storage providers that run the Services.',
            'Email delivery providers that send verification codes and notices.',
            'A payment gateway that processes online donations.',
            'Mapping providers that display activity locations.',
          ],
        },
        'We may disclose data to University auditors, government regulators or courts when the law requires it, or to protect someone’s life, health or safety. Public reports show totals only — never an individual donor, volunteer or beneficiary unless you have asked in writing to be named.',
      ],
    },
    {
      id: 'international-transfers',
      title: 'International transfers',
      blocks: [
        'Some of our service providers store or process data on servers outside the Philippines. When this happens we require them to protect it to a standard comparable to the Data Privacy Act, and we remain accountable for that data.',
      ],
    },
    {
      id: 'retention',
      title: 'How long we keep it',
      blocks: [
        'We keep personal data only as long as the purpose for collecting it continues, then delete or anonymise it. In particular:',
        {
          items: [
            'Account and profile data are kept while your account is active and deleted after you close it, except for records below.',
            'Face templates are deleted when you close your account or ask us to remove them.',
            'Donation, attendance, certificate and assistance records are kept for the period required by University policy and Philippine tax and audit rules.',
            'Security and access logs are kept for a limited period to investigate incidents.',
          ],
        },
      ],
    },
    {
      id: 'security',
      title: 'How we protect it',
      blocks: [
        'We use organisational, physical and technical safeguards appropriate to the sensitivity of the data, including encryption in transit, hashed passwords, role-based access, session controls, portal access policies and audit logging. No system is perfectly secure; if a breach is likely to put you at risk, we will notify you and the National Privacy Commission as the law requires.',
      ],
    },
    {
      id: 'your-rights',
      title: 'Your rights',
      blocks: [
        'As a data subject under the Data Privacy Act, you have the right to:',
        {
          items: [
            { term: 'Be informed', text: 'about whether and how your personal data is processed.' },
            { term: 'Access', text: 'the personal data we hold about you.' },
            { term: 'Object', text: 'to processing, including withdrawing consent for optional uses.' },
            { term: 'Erasure or blocking', text: 'of data that is incomplete, outdated, unlawfully obtained or no longer needed.' },
            { term: 'Rectification', text: 'of inaccurate or incomplete data.' },
            { term: 'Data portability', text: 'to receive a copy of your data in a commonly used electronic format.' },
            { term: 'Damages', text: 'for harm caused by inaccurate, incomplete or unlawfully processed data.' },
            { term: 'File a complaint', text: 'with the National Privacy Commission (privacy.gov.ph).' },
          ],
        },
        'To exercise these rights, contact our Data Protection Officer using the details below. We may ask you to confirm your identity first, and we will respond within the period the law sets. Some records, such as those an audit still needs, may have to be kept even after a request.',
      ],
    },
    {
      id: 'cookies',
      title: 'Cookies and browser storage',
      blocks: [
        'The public website does not use advertising or tracking cookies. The staff portal stores a sign-in token in your browser session so you stay signed in, plus small preferences such as layout choices. These are strictly necessary for the portal to work and are cleared when you sign out or close the session.',
      ],
    },
    {
      id: 'children',
      title: 'Minors',
      blocks: [
        'Some programmes involve students below 18. Where a minor registers or takes part, we rely on the consent of a parent or guardian, and the University’s child-protection policies apply to all activities.',
      ],
    },
    {
      id: 'changes',
      title: 'Changes to this policy',
      blocks: [
        'We may update this policy as the Services or the law change. The effective date at the top shows the current version. If a change materially affects how your data is used, we will tell you in the app or by email, and ask you to agree again where consent is required.',
      ],
    },
    {
      id: 'contact',
      title: 'Contact us',
      blocks: [
        'For questions about this policy or to exercise your rights, write to the Data Protection Officer, UCLM CARES:',
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
