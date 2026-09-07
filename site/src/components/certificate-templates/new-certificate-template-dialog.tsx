import { Controller } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  TEMPLATE_CATEGORY_LABELS,
  TEMPLATE_CATEGORY_ORDER,
  TEMPLATE_ORIENTATION_LABELS,
} from '../../constants/certificate-templates'
import { useNewCertificateTemplateForm } from '../../hooks/use-new-certificate-template-form'
import type { CertificateTemplate } from '../../types/certificate-template'

interface NewCertificateTemplateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (template: CertificateTemplate) => void
}

const fieldLabel = 'text-[11px] tracking-wider text-gray-500 uppercase'
const errorText = 'text-[11px] text-red-600'

/**
 * Files a new template. It asks for the four things the library lists it by and nothing
 * else — the sheet itself starts on the plain defaults and opens straight into the
 * customizer, so a director designs it there rather than twice in two places.
 */
export function NewCertificateTemplateDialog({
  open,
  onOpenChange,
  onCreated,
}: NewCertificateTemplateDialogProps) {
  const { form, submit, saving } = useNewCertificateTemplateForm(open, onCreated)
  const { register, control, formState } = form
  const errors = formState.errors

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[15px]">New certificate template</DialogTitle>
          <DialogDescription className="text-[12px]">
            It starts as a draft on the plain sheet; the customizer opens next.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-3" noValidate>
          <div className="space-y-1">
            <Label htmlFor="new-template-name" className={fieldLabel}>
              Template name
            </Label>
            <Input id="new-template-name" autoFocus {...register('name')} />
            {errors.name && <p className={errorText}>{errors.name.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="new-template-description" className={fieldLabel}>
              Internal description
            </Label>
            <Textarea
              id="new-template-description"
              rows={2}
              {...register('description')}
            />
            {errors.description && (
              <p className={errorText}>{errors.description.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label className={fieldLabel}>Category</Label>
            <Controller
              control={control}
              name="category"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPLATE_CATEGORY_ORDER.map((category) => (
                      <SelectItem key={category} value={category}>
                        {TEMPLATE_CATEGORY_LABELS[category]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-1.5">
            <Label className={fieldLabel}>Orientation</Label>
            <Controller
              control={control}
              name="orientation"
              render={({ field }) => (
                <ToggleGroup
                  type="single"
                  variant="outline"
                  size="sm"
                  value={field.value}
                  onValueChange={(value) => value && field.onChange(value)}
                >
                  <ToggleGroupItem value="landscape">
                    {TEMPLATE_ORIENTATION_LABELS.landscape}
                  </ToggleGroupItem>
                  <ToggleGroupItem value="portrait">
                    {TEMPLATE_ORIENTATION_LABELS.portrait}
                  </ToggleGroupItem>
                </ToggleGroup>
              )}
            />
          </div>

          <DialogFooter className="pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? 'Creating…' : 'Create template'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
