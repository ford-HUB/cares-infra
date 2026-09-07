import { Trash2, UserPlus } from 'lucide-react'
import { useState } from 'react'
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
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { TooltipProvider } from '@/components/ui/tooltip'
import {
  BODY_MAX_LENGTH,
  HEADLINE_MAX_LENGTH,
  MAX_SIGNATORIES,
  REQUIRED_CERTIFICATE_TOKENS,
} from '../../constants/certificate-design'
import { CERTIFICATE_FRAME_PRESETS } from '../../constants/certificate-frames'
import {
  TEMPLATE_CATEGORY_LABELS,
  TEMPLATE_CATEGORY_ORDER,
  TEMPLATE_ORIENTATION_LABELS,
  TEMPLATE_STATUS_LABELS,
  TEMPLATE_STATUS_ORDER,
} from '../../constants/certificate-templates'
import { useCertificateTemplateForm } from '../../hooks/use-certificate-template-form'
import type {
  CertificateElementId,
  CertificateFontId,
  CertificateTemplate,
} from '../../types/certificate-template'
import { CertificateLayoutEditor } from './certificate-layout-editor'
import { CertificateAccentPicker } from './ui/certificate-accent-picker'
import { CertificateCanvas } from './ui/certificate-canvas'
import { CertificateImagesField } from './ui/certificate-images-field'
import { CertificateSealField } from './ui/certificate-seal-field'
import { CertificateTokenChips } from './ui/certificate-token-chips'
import { FramePickerDialog } from './ui/frame-picker-dialog'
import { SignatoryAvatar } from './ui/signatory-avatar'
import { SignatoryPickerDialog } from './ui/signatory-picker-dialog'

interface CertificateTemplateCustomizerProps {
  template: CertificateTemplate
  open: boolean
  onOpenChange: (open: boolean) => void
}

const fieldLabel = 'text-[11px] tracking-wider text-gray-500 uppercase'
const errorText = 'text-[11px] text-red-600'
const sectionTitle = 'text-[13px] font-semibold text-gray-900'
const sectionPanel =
  'space-y-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm'

/**
 * Where a director actually changes a certificate: wording, colour, frame, seal and
 * signatories, with the preview redrawing on every keystroke through the same
 * `CertificateCanvas` the gallery uses — so nothing is a surprise once deployed.
 */
export function CertificateTemplateCustomizer({
  template,
  open,
  onOpenChange,
}: CertificateTemplateCustomizerProps) {
  const { form, signatories, addSignatory, submit, saving } =
    useCertificateTemplateForm(template, () => onOpenChange(false))

  const [pickerOpen, setPickerOpen] = useState(false)
  const [frameOpen, setFrameOpen] = useState(false)

  const { register, control, formState, watch, setValue, getValues } = form
  const errors = formState.errors

  const preview = watch()

  const previewDesign = {
    accent: preview.accent,
    frame: preview.frame,
    frameSvgUrl: preview.frameSvgUrl,
    frameSvgName: preview.frameSvgName,
    layout: preview.layout,
    font: preview.font,
    elementFonts: preview.elementFonts,
    elementSizes: preview.elementSizes,
    elementWidths: preview.elementWidths,
    elementHeights: preview.elementHeights,
    elementAligns: preview.elementAligns,
    images: preview.images ?? [],
    headline: preview.headline,
    body: preview.body,
    showSeal: preview.showSeal,
    sealLabel: preview.sealLabel,
    sealStyle: preview.sealStyle,
    sealAccent: preview.sealAccent,
    sealSvgUrl: preview.sealSvgUrl,
    sealSvgName: preview.sealSvgName,
    signatories: preview.signatories ?? [],
  }

  const framePreset = CERTIFICATE_FRAME_PRESETS[preview.frame]

  /** No block selected means the sheet font; a block sets its own override. */
  const setFont = (target: CertificateElementId | null, font: CertificateFontId) => {
    const options = { shouldDirty: true, shouldValidate: true }

    if (!target) {
      setValue('font', font, options)
      return
    }

    setValue(
      'elementFonts',
      { ...(getValues('elementFonts') ?? {}), [target]: font },
      options,
    )
  }

  /** Text size and block width are always per block — there is no sheet-wide value. */
  const setElementNumber =
    (field: 'elementSizes' | 'elementWidths' | 'elementHeights') =>
    (target: CertificateElementId, value: number) =>
      setValue(
        field,
        { ...(getValues(field) ?? {}), [target]: value },
        { shouldDirty: true, shouldValidate: true },
      )

  const insertToken = (token: string) => {
    const body = getValues('body')
    const spacer = body.length === 0 || body.endsWith(' ') ? '' : ' '
    setValue('body', `${body}${spacer}${token}`, {
      shouldDirty: true,
      shouldValidate: true,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[94vh] w-[96vw] max-w-[96vw] flex-col gap-0 p-0 sm:max-w-[96vw]">
        <DialogHeader className="shrink-0 border-b border-gray-100 px-5 py-3">
          <DialogTitle className="text-[15px]">Customize template</DialogTitle>
          <DialogDescription className="text-[12px]">
            {template.reference} · changes apply to certificates issued from here on.
          </DialogDescription>
        </DialogHeader>

        <TooltipProvider>
          <form
            onSubmit={submit}
            className="flex min-h-0 flex-1 flex-col lg:flex-row"
            noValidate
          >
            {/* The controls are one scrolling rail of a fixed width; every pixel the
                dialog gains beyond it goes to the certificate itself. */}
            <div className="min-h-0 shrink-0 overflow-y-auto border-b border-gray-100 px-5 py-4 lg:w-[26rem] lg:border-r lg:border-b-0 xl:w-[30rem]">
              <div className="space-y-4">
                <section className={sectionPanel}>
                  <h3 className={sectionTitle}>Details</h3>

                  <div className="space-y-1">
                    <Label htmlFor="template-name" className={fieldLabel}>
                      Template name
                    </Label>
                    <Input id="template-name" {...register('name')} />
                    {errors.name && <p className={errorText}>{errors.name.message}</p>}
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="template-description" className={fieldLabel}>
                      Internal description
                    </Label>
                    <Textarea
                      id="template-description"
                      rows={2}
                      {...register('description')}
                    />
                    {errors.description && (
                      <p className={errorText}>{errors.description.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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

                    <div className="space-y-1">
                      <Label className={fieldLabel}>Status</Label>
                      <Controller
                        control={control}
                        name="status"
                        render={({ field }) => (
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {TEMPLATE_STATUS_ORDER.map((status) => (
                                <SelectItem key={status} value={status}>
                                  {TEMPLATE_STATUS_LABELS[status]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                  </div>
                </section>

                <section className={sectionPanel}>
                  <h3 className={sectionTitle}>Layout</h3>

                  {/* Each control gets its own row: the frame tile, the orientation
                      pair and the accent swatches all need their full width, and the
                      selection rings need room to sit outside the control. */}
                  <div className="space-y-1.5">
                    <Label className={fieldLabel}>Frame</Label>
                    <button
                      type="button"
                      onClick={() => setFrameOpen(true)}
                      className="flex w-full items-center gap-3 rounded-lg border border-gray-200 p-2 text-left transition-colors hover:border-gray-300 focus-visible:ring-2 focus-visible:ring-[var(--cares-primary)] focus-visible:outline-none"
                    >
                      {/* A frame marker, not a preview — the editor beside it is the
                          real one, so this only has to say which frame is in use. */}
                      <span className="shrink-0 overflow-hidden rounded border border-gray-100">
                        <CertificateCanvas
                          variant="thumb"
                          design={previewDesign}
                          orientation={preview.orientation}
                          title={preview.name || template.name}
                        />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium text-gray-900">
                          {preview.frameSvgUrl
                            ? preview.frameSvgName
                            : framePreset.label}
                        </span>
                        <span className="block text-[11px] leading-snug text-gray-500">
                          {preview.frameSvgUrl
                            ? 'Imported SVG sheet'
                            : framePreset.description}
                        </span>
                      </span>
                      <span className="shrink-0 text-[12px] font-medium text-[var(--cares-primary)]">
                        Change
                      </span>
                    </button>
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

                  <div className="space-y-1.5">
                    <Label className={fieldLabel}>Accent</Label>
                    <div className="px-1 py-1">
                      <Controller
                        control={control}
                        name="accent"
                        render={({ field }) => (
                          <CertificateAccentPicker
                            value={field.value}
                            onChange={field.onChange}
                          />
                        )}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className={fieldLabel}>Images (optional)</Label>
                    <Controller
                      control={control}
                      name="images"
                      render={({ field }) => (
                        <CertificateImagesField
                          images={field.value}
                          onChange={field.onChange}
                        />
                      )}
                    />
                  </div>
                </section>

                <section className={sectionPanel}>
                  <h3 className={sectionTitle}>Wording</h3>

                  <div className="space-y-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <Label htmlFor="template-headline" className={fieldLabel}>
                        Headline
                      </Label>
                      <span className="text-[11px] text-gray-400 tabular-nums">
                        {preview.headline?.length ?? 0}/{HEADLINE_MAX_LENGTH}
                      </span>
                    </div>
                    <Input
                      id="template-headline"
                      maxLength={HEADLINE_MAX_LENGTH}
                      {...register('headline')}
                    />
                    {errors.headline && (
                      <p className={errorText}>{errors.headline.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <Label htmlFor="template-body" className={fieldLabel}>
                        Award text
                      </Label>
                      <span className="text-[11px] text-gray-400 tabular-nums">
                        {preview.body?.length ?? 0}/{BODY_MAX_LENGTH}
                      </span>
                    </div>
                    <Textarea
                      id="template-body"
                      rows={4}
                      maxLength={BODY_MAX_LENGTH}
                      {...register('body')}
                    />
                    {errors.body && <p className={errorText}>{errors.body.message}</p>}
                    <CertificateTokenChips onInsert={insertToken} />
                    <p className="text-[11px] text-gray-500">
                      Must include{' '}
                      {REQUIRED_CERTIFICATE_TOKENS.map((entry) => entry.token).join(
                        ', ',
                      )}
                      . The rest are optional.
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-gray-900">Seal</p>
                      <p className="text-[11px] text-gray-500">
                        Printed under the award text.
                      </p>
                    </div>
                    <Controller
                      control={control}
                      name="showSeal"
                      render={({ field }) => (
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          aria-label="Show seal"
                        />
                      )}
                    />
                  </div>

                  {preview.showSeal && (
                    <>
                      <div className="space-y-1">
                        <Label htmlFor="template-seal-label" className={fieldLabel}>
                          Seal label
                        </Label>
                        <Input
                          id="template-seal-label"
                          maxLength={24}
                          {...register('sealLabel')}
                        />
                        {errors.sealLabel && (
                          <p className={errorText}>{errors.sealLabel.message}</p>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <Label className={fieldLabel}>Seal design</Label>
                        <CertificateSealField
                          design={previewDesign}
                          onSelect={(style) => {
                            setValue('sealStyle', style, {
                              shouldDirty: true,
                              shouldValidate: true,
                            })
                            // Picking a built-in seal is how an upload is dropped.
                            setValue('sealSvgUrl', undefined, { shouldDirty: true })
                            setValue('sealSvgName', undefined, { shouldDirty: true })
                          }}
                          onAccentChange={(accent) =>
                            setValue('sealAccent', accent, {
                              shouldDirty: true,
                              shouldValidate: true,
                            })
                          }
                          onUpload={(dataUrl, fileName) => {
                            setValue('sealSvgUrl', dataUrl, {
                              shouldDirty: true,
                              shouldValidate: true,
                            })
                            setValue('sealSvgName', fileName, { shouldDirty: true })
                          }}
                          onRemoveUpload={() => {
                            setValue('sealSvgUrl', undefined, { shouldDirty: true })
                            setValue('sealSvgName', undefined, { shouldDirty: true })
                          }}
                        />
                      </div>
                    </>
                  )}
                </section>

                <section className={sectionPanel}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className={sectionTitle}>Signatories</h3>
                      <p className="text-[11px] text-gray-500">
                        {signatories.fields.length} of {MAX_SIGNATORIES} · picked from
                        coordinator accounts
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setPickerOpen(true)}
                      disabled={signatories.fields.length >= MAX_SIGNATORIES}
                      title={
                        signatories.fields.length >= MAX_SIGNATORIES
                          ? `A certificate takes at most ${MAX_SIGNATORIES} signatories`
                          : undefined
                      }
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      Add
                    </Button>
                  </div>

                  <ul className="space-y-2">
                    {signatories.fields.map((field, index) => (
                      <li
                        key={field.id}
                        className="flex items-center gap-3 rounded-lg border border-gray-200 p-2"
                      >
                        <SignatoryAvatar
                          name={field.name}
                          avatarUrl={field.avatarUrl}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-medium text-gray-900">
                            {field.name}
                          </p>
                          <p className="truncate text-[12px] text-gray-500">
                            {field.title}
                          </p>
                          <p className="truncate text-[11px] text-gray-400">
                            {field.department}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Remove ${field.name}`}
                          disabled={signatories.fields.length <= 1}
                          title={
                            signatories.fields.length <= 1
                              ? 'A certificate needs at least one signatory'
                              : undefined
                          }
                          onClick={() => signatories.remove(index)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                  {errors.signatories?.message && (
                    <p className={errorText}>{errors.signatories.message}</p>
                  )}
                </section>
              </div>
            </div>

            <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-gray-50 px-6 py-5">
              <CertificateLayoutEditor
                design={previewDesign}
                orientation={preview.orientation}
                title={preview.name || template.name}
                onLayoutChange={(layout) =>
                  setValue('layout', layout, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
                onImagesChange={(images) =>
                  setValue('images', images, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
                onFontChange={(target, font) => setFont(target, font)}
                onSizeChange={setElementNumber('elementSizes')}
                onWidthChange={setElementNumber('elementWidths')}
                onHeightChange={setElementNumber('elementHeights')}
                onAlignChange={(target, align) =>
                  setValue(
                    'elementAligns',
                    { ...(getValues('elementAligns') ?? {}), [target]: align },
                    { shouldDirty: true, shouldValidate: true },
                  )
                }
              />
            </div>
          </form>
        </TooltipProvider>

        {/* The primitive pulls itself out of a padded dialog with negative margins;
            this one has none, so they are reset or the buttons hang off the edge. */}
        <DialogFooter className="mx-0 mb-0 shrink-0 items-center gap-2 rounded-b-xl border-t border-gray-100 px-5 py-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={submit}
            disabled={saving || !formState.isDirty}
          >
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </DialogFooter>
        <FramePickerDialog
          open={frameOpen}
          value={preview.frame}
          design={previewDesign}
          orientation={preview.orientation}
          title={preview.name || template.name}
          onOpenChange={setFrameOpen}
          onSelect={(frame) => {
            setValue('frame', frame, { shouldDirty: true, shouldValidate: true })
            setValue('frameSvgUrl', undefined, { shouldDirty: true })
            setValue('frameSvgName', undefined, { shouldDirty: true })
          }}
          onUpload={(dataUrl, fileName) => {
            setValue('frameSvgUrl', dataUrl, {
              shouldDirty: true,
              shouldValidate: true,
            })
            setValue('frameSvgName', fileName, { shouldDirty: true })
          }}
          onRemoveUpload={() => {
            setValue('frameSvgUrl', undefined, { shouldDirty: true })
            setValue('frameSvgName', undefined, { shouldDirty: true })
          }}
        />

        <SignatoryPickerDialog
          open={pickerOpen}
          takenIds={signatories.fields.map((one) => one.coordinatorId)}
          onOpenChange={setPickerOpen}
          onSelect={addSignatory}
        />
      </DialogContent>
    </Dialog>
  )
}
