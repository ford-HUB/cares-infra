import { X } from 'lucide-react'
import { useState } from 'react'
import { IP_ALLOWLIST_MAX, isIpAddress } from '../../../constants/security-policy'

interface IpAllowlistFieldProps {
  addresses: string[]
  onChange: (addresses: string[]) => void
}

/**
 * An empty list means "no allowlist", not "allow nobody" — the copy says so, because
 * the alternative reading is how an administrator locks themselves out.
 */
export function IpAllowlistField({ addresses, onChange }: IpAllowlistFieldProps) {
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)

  const addAddress = () => {
    const value = draft.trim()
    if (!value) return

    if (!isIpAddress(value)) {
      setError('Enter a valid IPv4 or IPv6 address')
      return
    }
    if (addresses.includes(value)) {
      setError('That address is already on the list')
      return
    }
    if (addresses.length >= IP_ALLOWLIST_MAX) {
      setError(`The allowlist holds at most ${IP_ALLOWLIST_MAX} addresses`)
      return
    }

    onChange([...addresses, value])
    setDraft('')
    setError(null)
  }

  return (
    <div>
      <label htmlFor="ip-allowlist" className="mb-0.5 block text-xs font-medium text-gray-700">
        Allowed IP addresses
      </label>

      <div className="flex gap-2">
        <input
          id="ip-allowlist"
          value={draft}
          placeholder="203.0.113.10"
          onChange={(event) => {
            setDraft(event.target.value)
            setError(null)
          }}
          // Enter would otherwise submit the whole policy form.
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return
            event.preventDefault()
            addAddress()
          }}
          className="w-56 rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-[var(--cares-primary)] focus:outline-none"
        />
        <button
          type="button"
          onClick={addAddress}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Add
        </button>
      </div>

      {error ? (
        <p className="mt-0.5 text-xs text-red-600">{error}</p>
      ) : (
        <p className="mt-0.5 text-xs text-gray-500">
          Leave the list empty to allow the portal from any network.
        </p>
      )}

      {addresses.length > 0 && (
        <ul className="mt-2.5 flex flex-wrap gap-1.5">
          {addresses.map((address) => (
            <li
              key={address}
              className="flex items-center gap-1.5 rounded-full bg-gray-100 py-1 pr-1.5 pl-3 text-xs text-gray-700"
            >
              <span className="font-mono">{address}</span>
              <button
                type="button"
                aria-label={`Remove ${address}`}
                onClick={() => onChange(addresses.filter((entry) => entry !== address))}
                className="rounded-full p-0.5 text-gray-500 hover:bg-gray-200 hover:text-gray-700"
              >
                <X className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
