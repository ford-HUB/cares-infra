import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { CertificateTemplate } from '../../../types/certificate-template'

interface CertificateTemplateDeleteDialogProps {
  template: CertificateTemplate | null
  deleting: boolean
  onCancel: () => void
  onConfirm: () => void
}

/** Only offered when nothing was printed from the template; otherwise it's archived. */
export function CertificateTemplateDeleteDialog({
  template,
  deleting,
  onCancel,
  onConfirm,
}: CertificateTemplateDeleteDialogProps) {
  return (
    <Dialog open={Boolean(template)} onOpenChange={(next) => !next && onCancel()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-[15px]">Delete this template?</DialogTitle>
          <DialogDescription className="text-[12px]">
            {template?.name} ({template?.reference}) and its imported artwork are
            removed for good. Nothing has been issued from it.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={deleting}
            onClick={onConfirm}
          >
            {deleting ? 'Deleting…' : 'Delete template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
