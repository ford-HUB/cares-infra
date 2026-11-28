import type { LegalDocument } from '../types/legal'
import { LANDING_CONTACT } from './landing-bulletin'

/** Keep the kept-records list in sync with the Privacy Policy "How long we keep it" section. */
export const DATA_DELETION: LegalDocument = {
  title: 'Data Deletion',
  summary:
    'How to ask UCLM CARES to delete your account and personal data from this website, the staff portal and the CARES mobile app, what we remove, and what the law requires us to keep.',
  effectiveDate: '28 November 2026',
  sections: [
    {
      id: 'overview',
      title: 'Your right to deletion',
      blocks: [
        'Under the Data Privacy Act of 2012 you may ask us to delete or block personal data that is no longer needed, was collected unlawfully, or that you no longer consent to us processing. This page explains how to make that request for any account on the Services, including accounts created with Google or Facebook sign-in.',
        'Deleting your account is permanent. Once it is done you will no longer be able to sign in, join activities, view past certificates in the app or track assistance requests, and the account cannot be restored.',
      ],
    },
    {
      id: 'request-in-app',
      title: 'Request deletion in the app',
      blocks: [
        'If you can still sign in to the CARES mobile app:',
        {
          items: [
            'Open the Profile tab and tap Help & Support.',
            'Tap Contact Support and choose the Account ticket type.',
            'Write “Delete my account” and, if you only want part of your data removed, say which part.',
            'Submit the ticket. You will see our replies in the same ticket thread.',
          ],
        },
        'Because the request comes from your signed-in account, we can usually confirm it is you without asking for anything else.',
      ],
    },
    {
      id: 'request-by-email',
      title: 'Request deletion by email',
      blocks: [
        `If you cannot sign in, no longer have the app, or used the website or staff portal only, email our Data Protection Officer at ${LANDING_CONTACT.email} with the subject “Data deletion request” and include:`,
        {
          items: [
            'Your full name.',
            'The email address or mobile number registered to your account.',
            'Your role — volunteer, donor, beneficiary or staff — and, for Google or Facebook sign-in, which one you used.',
            'Whether you want your whole account deleted or only specific data.',
          ],
        },
        'Please send the email from the address registered to your account. If you cannot, we will ask you to confirm your identity in another way before acting on the request, so that no one can delete an account that is not theirs.',
      ],
    },
    {
      id: 'social-sign-in',
      title: 'Google and Facebook sign-in',
      blocks: [
        'If you signed in with Google or Facebook, you can also remove CARES from the connected apps in your Google Account or Facebook settings. That stops CARES from receiving your basic profile from that provider, but it does not delete the data already held in your CARES account — send a request using one of the options above as well.',
        'When we delete an account, we also remove the link between it and your Google or Facebook identity.',
      ],
    },
    {
      id: 'what-we-delete',
      title: 'What we delete',
      blocks: [
        'When we complete a deletion request, we permanently remove:',
        {
          items: [
            { term: 'Account and profile', text: 'your name, contact details, address, birth date, affiliation, profile photo and password hash.' },
            { term: 'Identity documents', text: 'the ID and residency images you uploaded and the details read from them.' },
            { term: 'Face data', text: 'your face captures and the face template used for attendance check-in.' },
            { term: 'Messages and notices', text: 'your chat messages, notifications and device push tokens.' },
            { term: 'Sign-in links', text: 'active sessions, verification codes and any Google or Facebook connection.' },
          ],
        },
        'Copies in our encrypted backups are overwritten as those backups expire on their normal rotation, and are not restored to live systems in the meantime.',
      ],
    },
    {
      id: 'what-we-keep',
      title: 'What we may have to keep',
      blocks: [
        'Some records must be kept even after an account is deleted, because University policy or Philippine tax and audit rules require them, or because they are needed to establish or defend a legal claim:',
        {
          items: [
            { term: 'Donations', text: 'amounts, dates, payment references and receipts.' },
            { term: 'Assistance', text: 'what was requested and released, kept for audit of programme funds.' },
            { term: 'Programme records', text: 'attendance and certificates issued, kept for University extension reporting.' },
            { term: 'Security logs', text: 'sign-in and access logs, kept for a limited period to investigate incidents.' },
          ],
        },
        'We keep only the minimum needed for each purpose, restrict who can see it, remove it from any public board or ranking, and delete or anonymise it once the retention period ends.',
      ],
    },
    {
      id: 'partial-deletion',
      title: 'Deleting only some data',
      blocks: [
        'You do not have to close your account to remove specific data. For example, you can ask us to delete your face template (you will then check in to activities another way, as your coordinator arranges), remove an uploaded document, or withdraw consent for an optional use. Tell us exactly what you want removed in your request.',
      ],
    },
    {
      id: 'timeline',
      title: 'What happens next',
      blocks: [
        {
          items: [
            'We acknowledge your request and confirm your identity if needed.',
            'We tell you if any records must be kept, and why, before we proceed.',
            'We complete the deletion within 30 days of confirming your identity and let you know when it is done.',
          ],
        },
        'If we cannot act on all or part of a request, we will explain why. You may also file a complaint with the National Privacy Commission (privacy.gov.ph).',
      ],
    },
    {
      id: 'contact',
      title: 'Contact us',
      blocks: [
        'For deletion requests or questions about this page, contact the Data Protection Officer, UCLM CARES:',
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
