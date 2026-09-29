/**
 * Two-tone chime for incoming chat messages. Synthesised with the Web Audio API
 * rather than shipped as an audio file — no asset to load, no autoplay-blocked
 * <audio> element to keep in the DOM.
 */
const CHIME_NOTES_HZ = [880, 1174.7]
const CHIME_NOTE_SECONDS = 0.12
const CHIME_PEAK_GAIN = 0.09

let audioContext: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null

  if (!audioContext) {
    const Ctor = window.AudioContext
    if (!Ctor) return null
    audioContext = new Ctor()
  }

  return audioContext
}

export function playNotificationSound(): void {
  const context = getAudioContext()
  if (!context) return

  // Browsers suspend the context until the user has interacted with the page.
  if (context.state === 'suspended') {
    void context.resume()
  }

  CHIME_NOTES_HZ.forEach((frequency, index) => {
    const startAt = context.currentTime + index * CHIME_NOTE_SECONDS
    const endAt = startAt + CHIME_NOTE_SECONDS

    const oscillator = context.createOscillator()
    const gain = context.createGain()

    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(frequency, startAt)

    gain.gain.setValueAtTime(0.0001, startAt)
    gain.gain.exponentialRampToValueAtTime(CHIME_PEAK_GAIN, startAt + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, endAt)

    oscillator.connect(gain).connect(context.destination)
    oscillator.start(startAt)
    oscillator.stop(endAt)
  })
}
