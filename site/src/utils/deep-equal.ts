/** `Object.is` on leaves keeps `Infinity` (catch-all tier) and `NaN` comparable, unlike JSON. */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
    return false
  }

  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false
    return a.every((item, index) => deepEqual(item, b[index]))
  }

  const left = a as Record<string, unknown>
  const right = b as Record<string, unknown>
  const keys = Object.keys(left)

  if (keys.length !== Object.keys(right).length) return false
  return keys.every((key) => key in right && deepEqual(left[key], right[key]))
}
