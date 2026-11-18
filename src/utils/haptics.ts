/**
 * Triggers a brief, light haptic vibration on devices that support the Vibration API.
 * Must be called synchronously inside a user gesture handler (e.g. button click).
 */
export function triggerLightHaptic(durationMs: number = 15): void {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(durationMs);
    }
  } catch {
    // Silently ignore if blocked or unsupported
  }
}
