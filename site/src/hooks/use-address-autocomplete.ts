import { useEffect, useState } from 'react'
import {
  ADDRESS_AUTOCOMPLETE_DEBOUNCE_MS,
  ADDRESS_AUTOCOMPLETE_MIN_CHARS,
} from '../constants/mapbox'
import { autocompleteAddress } from '../services/geocoding-service'
import type { AddressSuggestion } from '../types/geocoding'

interface UseAddressAutocompleteResult {
  suggestions: AddressSuggestion[]
  loading: boolean
}

/** Paused while `enabled` is false so picking a result doesn't reopen the list. */
export function useAddressAutocomplete(
  query: string,
  enabled: boolean,
): UseAddressAutocompleteResult {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!enabled || query.trim().length < ADDRESS_AUTOCOMPLETE_MIN_CHARS) {
      setSuggestions([])
      setLoading(false)
      return
    }

    const controller = new AbortController()
    setLoading(true)
    const timer = setTimeout(async () => {
      const results = await autocompleteAddress(query, controller.signal)
      if (!controller.signal.aborted) {
        setSuggestions(results)
        setLoading(false)
      }
    }, ADDRESS_AUTOCOMPLETE_DEBOUNCE_MS)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query, enabled])

  return { suggestions, loading }
}
