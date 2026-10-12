/**
 * Sounds are synthesised with Web Audio: no audio files to license, download or precache.
 * Browsers only allow audio after a user gesture, so `primeWheelSound` runs inside the Spin click.
 */
let context: AudioContext | null = null
let lastTickAt = 0

const SOUND_PREF_KEY = 'chuyen-nho.spin-wheel.sound.v1'
// Fast spins cross several slices per frame; a click every few ms is a buzz, not a tick.
const MIN_TICK_GAP_S = 0.035
const WIN_NOTES = [523.25, 659.25, 783.99, 1046.5]

function audio(): AudioContext | null {
  if (context) return context
  const Ctor = typeof window === 'undefined' ? undefined
    : window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  try {
    context = new Ctor()
  } catch {
    context = null
  }
  return context
}

export function primeWheelSound(): void {
  const ctx = audio()
  if (ctx?.state === 'suspended') void ctx.resume().catch(() => {})
}

function tone(ctx: AudioContext, start: number, frequency: number, duration: number, peak: number, type: OscillatorType) {
  const oscillator = ctx.createOscillator()
  const gain = ctx.createGain()
  oscillator.type = type
  oscillator.frequency.value = frequency
  // Soft attack and release: cutting off at full amplitude is heard as a pop.
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(peak, start + 0.005)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  oscillator.connect(gain)
  gain.connect(ctx.destination)
  oscillator.start(start)
  oscillator.stop(start + duration + 0.02)
}

export function playTick(): void {
  const ctx = audio()
  if (!ctx || ctx.state !== 'running') return
  const now = ctx.currentTime
  if (now - lastTickAt < MIN_TICK_GAP_S) return
  lastTickAt = now
  try {
    tone(ctx, now, 1400, 0.04, 0.12, 'triangle')
  } catch {
    /* Audio graph refused (device lost); the spin still works silently. */
  }
}

export function playWin(): void {
  const ctx = audio()
  if (!ctx) return
  if (ctx.state === 'suspended') void ctx.resume().catch(() => {})
  try {
    WIN_NOTES.forEach((frequency, index) => tone(ctx, ctx.currentTime + index * 0.09, frequency, index === WIN_NOTES.length - 1 ? 0.45 : 0.16, 0.18, 'sine'))
  } catch {
    /* See playTick. */
  }
}

export function readSoundPreference(): boolean {
  try {
    return localStorage.getItem(SOUND_PREF_KEY) !== '0'
  } catch {
    return true
  }
}

export function writeSoundPreference(on: boolean): void {
  try {
    localStorage.setItem(SOUND_PREF_KEY, on ? '1' : '0')
  } catch {
    /* Preference just won't survive a reload. */
  }
}
