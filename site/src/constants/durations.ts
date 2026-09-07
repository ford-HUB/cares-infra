/** Simulated network latency when `VITE_USE_MOCK_API` is enabled. */
export const MOCK_API_DELAY_MS = {
  default: 300,
  forgotPassword: 600,
} as const

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
