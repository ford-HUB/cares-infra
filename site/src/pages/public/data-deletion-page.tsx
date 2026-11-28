import { LegalDocumentView } from '../../components/public/legal/legal-document-view'
import { DATA_DELETION } from '../../constants/legal-data-deletion'
import { PRIVACY_POLICY_PATH } from '../../constants/routes'

export default function DataDeletionPage() {
  return (
    <LegalDocumentView
      document={DATA_DELETION}
      related={{ label: 'Read our Privacy Policy', to: PRIVACY_POLICY_PATH }}
    />
  )
}
