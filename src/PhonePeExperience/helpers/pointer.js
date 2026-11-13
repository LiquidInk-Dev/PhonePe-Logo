import * as THREE from 'three'

/**
 * @typedef {object} Pointer
 * @property {THREE.Vector2} position Pointer in NDC (-1..1), ready for raycaster.setFromCamera
 * @property {() => boolean} isActive True while a mouse is over the canvas or a finger is interacting
 * @property {() => void} dispose Removes all listeners
 */

/**
 * Tracks the pointer over a canvas for both mouse and touch,
 * without blocking native page scrolling.
 *
 * - Mouse / pen → pointer events (never conflict with scrolling)
 * - Finger      → passive touch events. If the browser decides the gesture is a
 *                 scroll (it fires `pointercancel`), the effect switches off for
 *                 the rest of that gesture, so it never lags along with the scroll.
 *
 * Plain values, no React state: reading them every frame causes no re-renders.
 *
 * @param {HTMLElement} element
 * @returns {Pointer}
 */
export function createPointer(element) {
  const position = new THREE.Vector2(-2, -2) // start off-screen
  let active = false

  // Screen pixels → NDC (-1..1), the coordinates the raycaster expects
  /**
   * @param {number} x
   * @param {number} y
   */
  const setFromClient = (x, y) => {
    const r = element.getBoundingClientRect()
    position.set(
      ((x - r.left) / r.width) * 2 - 1,
      -((y - r.top) / r.height) * 2 + 1,
    )
  }

  // --- Mouse / pen ---
  /** @param {PointerEvent} e */
  const onPointerMove = (e) => {
    if (e.pointerType === 'touch') return // fingers are handled by touch events
    setFromClient(e.clientX, e.clientY)
    active = true
  }
  /** @param {PointerEvent} e */
  const onPointerLeave = (e) => {
    if (e.pointerType !== 'touch') active = false
  }

  // --- Finger ---
  // The browser picks one owner per gesture from the first movement:
  //   sideways first → our code owns it (full fps, every event)
  //   up/down first  → the browser scrolls, and tells us by firing `pointercancel`
  // We don't guess the direction ourselves; we listen for the browser's decision.
  let browserOwnsGesture = false

  /** @param {PointerEvent} e */
  const onPointerCancel = (e) => {
    if (e.pointerType !== 'touch') return
    browserOwnsGesture = true
    active = false
  }

  /** @param {TouchEvent} e */
  const onTouch = (e) => {
    // First finger down = a new gesture; the browser hasn't decided yet
    if (e.type === 'touchstart' && e.touches.length === 1) browserOwnsGesture = false

    // Page is scrolling: stay off for the rest of this gesture (the effect fades out)
    if (browserOwnsGesture) return

    const t = e.touches[0]
    if (!t) return
    setFromClient(t.clientX, t.clientY)
    active = true
  }
  /** @param {TouchEvent} e */
  const onTouchEnd = (e) => {
    if (e.touches.length === 0) active = false
  }

  // passive: we promise not to preventDefault, so the browser scrolls immediately
  const passive = { passive: true }
  element.addEventListener('pointermove', onPointerMove)
  element.addEventListener('pointerleave', onPointerLeave)
  element.addEventListener('pointercancel', onPointerCancel)
  element.addEventListener('touchstart', onTouch, passive)
  element.addEventListener('touchmove', onTouch, passive)
  element.addEventListener('touchend', onTouchEnd, passive)
  element.addEventListener('touchcancel', onTouchEnd, passive)

  return {
    position,
    isActive: () => active,
    dispose() {
      element.removeEventListener('pointermove', onPointerMove)
      element.removeEventListener('pointerleave', onPointerLeave)
      element.removeEventListener('pointercancel', onPointerCancel)
      element.removeEventListener('touchstart', onTouch)
      element.removeEventListener('touchmove', onTouch)
      element.removeEventListener('touchend', onTouchEnd)
      element.removeEventListener('touchcancel', onTouchEnd)
    },
  }
}
