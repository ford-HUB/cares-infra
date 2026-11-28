import { LegalDocumentView } from '../../components/public/legal/legal-document-view'
import { PRIVACY_POLICY } from '../../constants/legal-privacy-policy'
import { TERMS_OF_SERVICE_PATH } from '../../constants/routes'

export default function PrivacyPolicyPage() {
  return (
    <LegalDocumentView
      document={PRIVACY_POLICY}
      related={{ label: 'Read our Terms of Service', to: TERMS_OF_SERVICE_PATH }}
    />
  )
}
