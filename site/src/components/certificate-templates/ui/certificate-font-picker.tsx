import { Type } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  CERTIFICATE_FONT_GROUP_ORDER,
  CERTIFICATE_FONT_ORDER,
  CERTIFICATE_FONT_PRESETS,
} from '../../../constants/certificate-fonts'
import { CERTIFICATE_ELEMENT_LABELS } from '../../../constants/certificate-layout'
import type {
  CertificateElementId,
  CertificateFontId,
} from '../../../types/certificate-template'

interface CertificateFontPickerProps {
  /** The block the font applies to, or `null` for the whole sheet. */
  target: CertificateElementId | null
  value: CertificateFontId
  onChange: (font: CertificateFontId) => void
}

/**
 * Picks the typeface, for the selected block when there is one and for the whole
 * sheet otherwise — so a blackletter award name can sit over a serif body the way a
 * DepEd certificate does. Each option previews in its own face, because a font name
 * tells a director nothing on its own.
 */
export function CertificateFontPicker({
  target,
  value,
  onChange,
}: CertificateFontPickerProps) {
  const scope = target ? CERTIFICATE_ELEMENT_LABELS[target] : 'Whole sheet'
  const preset = CERTIFICATE_FONT_PRESETS[value]
  const defaultLabel = target ? 'Same as the sheet' : 'Frame default'

  return (
    <Select value={value} onValueChange={(next) => onChange(next as CertificateFontId)}>
      <SelectTrigger
        size="sm"
        // The trigger names what it changes, since that follows the selection.
        className="w-[15rem]"
        aria-label={`Font for ${scope.toLowerCase()}`}
      >
        <Type className="h-3.5 w-3.5 shrink-0 text-gray-500" />
        {/* Radix positions the open list against this node, so the trigger must hold a
            SelectValue — its own children keep the summary to one line. */}
        <SelectValue>
          <span className="flex min-w-0 items-center gap-1 text-[13px]">
            <span className="shrink-0 text-gray-500">{scope} font:</span>
            <span
              className="truncate text-gray-900"
              style={preset.stack ? { fontFamily: preset.stack } : undefined}
            >
              {value === 'default' ? defaultLabel : preset.label}
            </span>
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent position="popper" align="end" className="max-h-[22rem] w-[17rem]">
        {CERTIFICATE_FONT_GROUP_ORDER.map((group) => {
          const ids = CERTIFICATE_FONT_ORDER.filter(
            (id) => CERTIFICATE_FONT_PRESETS[id].group === group,
          )
          if (ids.length === 0) return null

          return (
            <SelectGroup key={group}>
              <SelectLabel className="text-[10px] tracking-wider text-gray-400 uppercase">
                {group === 'Default' ? scope : group}
              </SelectLabel>
              {ids.map((id) => {
                const option = CERTIFICATE_FONT_PRESETS[id]
                const label = id === 'default' ? defaultLabel : option.label

                return (
                  <SelectItem key={id} value={id} textValue={label}>
                    <span className="flex min-w-0 flex-col">
                      <span
                        className="truncate text-[13px] text-gray-900"
                        style={option.stack ? { fontFamily: option.stack } : undefined}
                      >
                        {label}
                      </span>
                      <span className="truncate text-[11px] text-gray-500">
                        {option.note}
                      </span>
                    </span>
                  </SelectItem>
                )
              })}
            </SelectGroup>
          )
        })}
      </SelectContent>
    </Select>
  )
}
