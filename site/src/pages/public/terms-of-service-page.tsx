import { LegalDocumentView } from '../../components/public/legal/legal-document-view'
import { TERMS_OF_SERVICE } from '../../constants/legal-terms-of-service'
import { PRIVACY_POLICY_PATH } from '../../constants/routes'

export default function TermsOfServicePage() {
  return (
    <LegalDocumentView
      document={TERMS_OF_SERVICE}
      related={{ label: 'Read our Privacy Policy', to: PRIVACY_POLICY_PATH }}
    />
  )
}
