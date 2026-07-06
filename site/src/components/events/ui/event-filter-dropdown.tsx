import { ChevronDown } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

interface FilterDropdownProps<T extends string> {
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
  align?: 'left' | 'right'
}

export function FilterDropdown<T extends string>({
  value,
  options,
  onChange,
  align = 'left',
}: FilterDropdownProps<T>) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const label = options.find((o) => o.value === value)?.label ?? value

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
      >
        {label}
        <ChevronDown size={16} className={open ? 'rotate-180 transition-transform' : 'transition-transform'} />
      </button>
      {open && (
        <div
          className={`absolute z-20 mt-2 max-h-60 w-48 overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value)
                setOpen(false)
              }}
              className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${
                opt.value === value
                  ? 'bg-green-50 font-medium text-[var(--cares-primary)]'
                  : 'text-gray-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
