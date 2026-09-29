interface PolicyNumberFieldProps {
  id: string
  label: string
  hint?: string
  min: number
  max: number
  error?: string
  disabled?: boolean
  /** Spread from `register(name, { valueAsNumber: true })`. */
  registration: Record<string, unknown>
}

export function PolicyNumberField({
  id,
  label,
  hint,
  min,
  max,
  error,
  disabled,
  registration,
}: PolicyNumberFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-0.5 block text-xs font-medium text-gray-700">
        {label}
      </label>
      <input
        id={id}
        type="number"
        min={min}
        max={max}
        disabled={disabled}
        className="w-40 rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-[var(--cares-primary)] focus:outline-none disabled:bg-gray-100 disabled:text-gray-400"
        {...registration}
      />
      {hint && !error && <p className="mt-0.5 text-xs text-gray-500">{hint}</p>}
      {error && <p className="mt-0.5 text-xs text-red-600">{error}</p>}
    </div>
  )
}
