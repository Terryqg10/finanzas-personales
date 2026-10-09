/**
 * Utilidades puras del doble toque en la barra inferior.
 * Spec: specs/scroll-al-inicio-barra-inferior.md.
 */

/** Máximo entre dos toques para contarlos como un doble toque. */
export const DOUBLE_TAP_THRESHOLD_MS = 300;

/**
 * `true` si este toque llega pocos milisegundos después del anterior.
 * `previous` es la marca de tiempo del toque anterior, o `null` si no hubo.
 */
export function isDoubleTap(previous: number | null, now: number): boolean {
  return previous !== null && now - previous >= 0 && now - previous < DOUBLE_TAP_THRESHOLD_MS;
}

/** Con "reducir movimiento" activado en el sistema, el scroll es instantáneo. */
export function getScrollBehavior(prefersReducedMotion: boolean): 'auto' | 'smooth' {
  return prefersReducedMotion ? 'auto' : 'smooth';
}
