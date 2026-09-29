import { Loader2, MapPin } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useAddressAutocomplete } from '../../../hooks/use-address-autocomplete'
import type { AddressSuggestion } from '../../../types/geocoding'

interface AddressAutocompleteProps {
  value: string
  error?: boolean
  placeholder?: string
  id?: string
  onChange: (text: string) => void
  onSelect: (suggestion: AddressSuggestion) => void
}

export function AddressAutocomplete({
  value,
  error,
  placeholder,
  id,
  onChange,
  onSelect,
}: AddressAutocompleteProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(-1)
  const { suggestions, loading } = useAddressAutocomplete(value, open)

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  // Keep the highlight in range as the suggestion list changes.
  const activeIndex = highlighted < suggestions.length ? highlighted : -1

  const choose = (suggestion: AddressSuggestion) => {
    onSelect(suggestion)
    setOpen(false)
    setHighlighted(-1)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || suggestions.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlighted((i) => (i + 1) % suggestions.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlighted((i) => (i <= 0 ? suggestions.length - 1 : i - 1))
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault()
      choose(suggestions[activeIndex])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const showDropdown = open && (loading || suggestions.length > 0)

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <MapPin
          size={16}
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-gray-400"
        />
        <input
          id={id}
          type="text"
          autoComplete="off"
          value={value}
          placeholder={placeholder}
          className={`w-full rounded-lg border p-2 pr-9 pl-9 focus:ring-2 focus:ring-[var(--cares-primary)] focus:outline-none ${
            error ? 'border-red-500' : 'border-gray-300'
          }`}
          onChange={(e) => {
            onChange(e.target.value)
            setOpen(true)
            setHighlighted(-1)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
        {loading && (
          <Loader2
            size={16}
            className="absolute top-1/2 right-3 -translate-y-1/2 animate-spin text-gray-400"
          />
        )}
      </div>

      {showDropdown && (
        <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          {loading && suggestions.length === 0 && (
            <li className="px-3 py-2 text-sm text-gray-500">Searching…</li>
          )}
          {suggestions.map((s, index) => (
            <li key={s.id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(s)}
                onMouseEnter={() => setHighlighted(index)}
                className={`flex w-full items-start gap-2 px-3 py-2 text-left text-sm ${
                  index === activeIndex ? 'bg-green-50 text-green-700' : 'text-gray-700'
                } hover:bg-green-50`}
              >
                <MapPin size={16} className="mt-0.5 shrink-0 text-gray-400" />
                <span>{s.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
