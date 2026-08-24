interface PolicyToggleFieldProps {
  id: string
  label: string
  hint?: string
  /** Spread from `register(name)`. */
  registration: Record<string, unknown>
}

export function PolicyToggleField({ id, label, hint, registration }: PolicyToggleFieldProps) {
  return (
    <div className="flex items-start gap-2.5">
      <input
        id={id}
        type="checkbox"
        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[var(--cares-primary)] focus:ring-[var(--cares-primary)]"
        {...registration}
      />
      <div>
        <label htmlFor={id} className="block text-sm font-medium text-gray-700">
          {label}
        </label>
        {hint && <p className="text-xs text-gray-500">{hint}</p>}
      </div>
    </div>
  )
}
