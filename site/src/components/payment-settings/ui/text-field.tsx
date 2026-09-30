import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface TextFieldProps {
  id: string
  label: string
  hint?: string
  error?: string
  placeholder?: string
  disabled?: boolean
  type?: 'text' | 'number' | 'tel'
  min?: number
  max?: number
  /** Spread from `register(name)`. */
  registration: Record<string, unknown>
}

/** The module's one field: a labelled input with its hint or its error underneath. */
export function TextField({
  id,
  label,
  hint,
  error,
  placeholder,
  disabled,
  type = 'text',
  min,
  max,
  registration,
}: TextFieldProps) {
  return (
    <div className="min-w-0">
      <Label
        htmlFor={id}
        className="mb-1 text-[11px] tracking-wider text-gray-500 uppercase"
      >
        {label}
      </Label>
      <Input
        id={id}
        type={type}
        min={min}
        max={max}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        aria-invalid={Boolean(error)}
        className={type === 'number' ? 'tabular-nums' : undefined}
        {...registration}
      />
      {hint && !error && <p className="mt-1 text-[11px] text-gray-400">{hint}</p>}
      {error && <p className="mt-1 text-[11px] text-red-600">{error}</p>}
    </div>
  )
}
