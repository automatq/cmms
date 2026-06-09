'use client'

/**
 * Fire a celebratory confetti burst. Lazy-imports canvas-confetti so it stays
 * out of the main bundle, and respects the user's reduced-motion preference.
 */
export async function celebrate() {
  if (typeof window === 'undefined') return
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
  try {
    const confetti = (await import('canvas-confetti')).default
    confetti({
      particleCount: 110,
      spread: 72,
      startVelocity: 38,
      ticks: 200,
      origin: { y: 0.62 },
      scalar: 0.9,
      disableForReducedMotion: true,
    })
  } catch {
    // confetti is purely decorative — never let it break a flow.
  }
}
