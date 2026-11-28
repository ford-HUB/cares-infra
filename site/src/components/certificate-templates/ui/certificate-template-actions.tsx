import {
  Archive,
  Copy,
  Download,
  MoreHorizontal,
  PenLine,
  Send,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { PORTAL_PERMISSION } from '../../../constants/portal-permissions'
import { usePermission, useSuspension } from '../../../store/auth-store'
import { LockedDropdownItem } from '../../portal/ui/locked-action'
import type { CertificateTemplate } from '../../../types/certificate-template'

interface CertificateTemplateActionsProps {
  template: CertificateTemplate
  onAction: (action: string, template: CertificateTemplate) => void
}

/** Template-changing entries need "Manage templates"; others get only the sample download. */
export function CertificateTemplateActions({
  template,
  onAction,
}: CertificateTemplateActionsProps) {
  const canManage = usePermission(PORTAL_PERMISSION.CERTIFICATES_TEMPLATE_MANAGE)
  // Suspended entries stay visible, locked and red, with the reason on hover.
  const manageSuspension = useSuspension(PORTAL_PERMISSION.CERTIFICATES_TEMPLATE_MANAGE)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`More actions for ${template.name}`}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {manageSuspension && (
          <>
            <LockedDropdownItem
              suspension={manageSuspension}
              icon={PenLine}
              label="Customize design"
            />
            <LockedDropdownItem
              suspension={manageSuspension}
              icon={Copy}
              label="Duplicate"
            />
          </>
        )}
        {canManage && (
          <>
            <DropdownMenuItem onSelect={() => onAction('customize', template)}>
              <PenLine className="h-3.5 w-3.5" />
              Customize design
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onAction('duplicate', template)}>
              <Copy className="h-3.5 w-3.5" />
              Duplicate
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuItem onSelect={() => onAction('download', template)}>
          <Download className="h-3.5 w-3.5" />
          Download sample
        </DropdownMenuItem>
        {manageSuspension && (
          <>
            <DropdownMenuSeparator />
            <LockedDropdownItem
              suspension={manageSuspension}
              icon={template.status === 'archived' ? Send : Archive}
              label={template.status === 'archived' ? 'Restore to drafts' : 'Archive'}
            />
            {template.issued === 0 && template.deployedEvents === 0 && (
              <LockedDropdownItem
                suspension={manageSuspension}
                icon={Trash2}
                label="Delete"
              />
            )}
          </>
        )}
        {canManage && (
          <>
            <DropdownMenuSeparator />
            {template.status === 'archived' ? (
              <DropdownMenuItem onSelect={() => onAction('restore', template)}>
                <Send className="h-3.5 w-3.5" />
                Restore to drafts
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onSelect={() => onAction('archive', template)}>
                <Archive className="h-3.5 w-3.5" />
                Archive
              </DropdownMenuItem>
            )}
          </>
        )}
        {/* Printed-from templates are archived, never deleted, so issued certificates keep their design. */}
        {canManage && template.issued === 0 && template.deployedEvents === 0 && (
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => onAction('delete', template)}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
