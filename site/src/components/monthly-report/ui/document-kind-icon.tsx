import { FileImage, FileSpreadsheet, FileText, FileType } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DOCUMENT_KIND_STYLES } from '../../../constants/monthly-report'
import type { ReportDocumentKind } from '../../../types/monthly-report'

const KIND_ICONS = {
  docx: FileType,
  pdf: FileText,
  xlsx: FileSpreadsheet,
  image: FileImage,
} as const

interface DocumentKindIconProps {
  kind: ReportDocumentKind
  className?: string
}

export function DocumentKindIcon({ kind, className }: DocumentKindIconProps) {
  const Icon = KIND_ICONS[kind]

  return (
    <span
      className={cn(
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
        DOCUMENT_KIND_STYLES[kind],
        className,
      )}
    >
      <Icon className="h-4 w-4" />
    </span>
  )
}
