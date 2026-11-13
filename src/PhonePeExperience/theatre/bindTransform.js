import { types } from '@theatre/core'

/**
 * @typedef {object} TransformDefaults
 * @property {[number, number, number]} [position]
 * @property {[number, number, number]} [rotation] Radians
 * @property {[number, number, number]} [scale]
 */

/**
 * @param {[number, number, number]} v
 * @param {number} nudgeMultiplier
 */
const vector = ([x, y, z], nudgeMultiplier = 0.01) => ({
  x: types.number(x, { nudgeMultiplier }),
  y: types.number(y, { nudgeMultiplier }),
  z: types.number(z, { nudgeMultiplier }),
})

/**
 * Props every object gets: the same shape @theatre/r3f's `editable` used
 * (`position.x`, `rotation.y`, …), so keyframes saved with r3f still apply.
 * @param {TransformDefaults} defaults
 */
export const transformProps = (defaults = {}) => ({
  position: vector(defaults.position || [0, 0, 0]),
  rotation: vector(defaults.rotation || [0, 0, 0]),
  scale: vector(defaults.scale || [1, 1, 1]),
})

/**
 * Creates (or reattaches) a Theatre object and copies its position / rotation / scale
 * onto a three.js object whenever the values change.
 *
 * @param {import('@theatre/core').ISheet} sheet
 * @param {string} key Name shown in Theatre Studio. Must match the saved state.
 * @param {import('three').Object3D} object
 * @param {TransformDefaults} [defaults] Values used when the saved state has no override
 * @returns {() => void} Unbinds and detaches the Theatre object
 */
export function bindTransform(sheet, key, object, defaults) {
  const sheetObject = sheet.object(key, transformProps(defaults), { reconfigure: true })

  /** @param {any} v */
  const apply = (v) => {
    object.position.set(v.position.x, v.position.y, v.position.z)
    object.rotation.set(v.rotation.x, v.rotation.y, v.rotation.z)
    object.scale.set(v.scale.x, v.scale.y, v.scale.z)
  }

  apply(sheetObject.value)
  const unsubscribe = sheetObject.onValuesChange(apply)

  return () => {
    unsubscribe()
    sheet.detachObject(key)
  }
}
