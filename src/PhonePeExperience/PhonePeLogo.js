import * as THREE from 'three'
import { types } from '@theatre/core'

import planeFragShader from './shaders/plane.frag'
import planeVertShader from './shaders/plane.vert'
import { randomPointsInside } from './helpers/meshToPoints'
import { bindTransform } from './theatre/bindTransform'

const TOTAL_POINTS = 7000
// How fast the smoothed pointer catches up to the real one (higher = snappier, lower = smoother)
const POINTER_SMOOTHING = 30

const PALETTE = [
  '#61249f', '#793fb3', '#c192f1', '#e565e1',
  '#f48f9a', '#ffd26a', '#6bc8c9',
].map((c) => new THREE.Color(c))

// URLs of the GLB files. The PhonePe file must contain a mesh named `Mid_polly`, the disk file one named `Disk`.
/**
 * @typedef {object} ModelUrls
 * @property {string} phonePe
 * @property {string} disk
 */

/** @typedef {[string, string, string, string]} TextureUrls */

/**
 * @typedef {object} FrameState
 * @property {number} delta Seconds since the last frame
 * @property {number} elapsed Seconds since start
 * @property {THREE.Camera} camera
 * @property {import('./helpers/pointer').Pointer} pointer
 */

/**
 * Builds the particle logo: instanced geometry, shader material, Theatre controls and pointer physics.
 *
 * @param {object} params
 * @param {THREE.BufferGeometry} params.phonePeGeometry Geometry of the `Mid_polly` mesh
 * @param {THREE.BufferGeometry} params.diskGeometry Geometry of the `Disk` mesh
 * @param {THREE.Texture[]} params.textures The 4 particle shape textures
 * @param {import('@theatre/core').ISheet} params.sheet
 */
export function createPhonePeLogo({ phonePeGeometry, diskGeometry, textures, sheet }) {
  // ---------------------------------------------------------------------------
  // Geometry: one plane, instanced TOTAL_POINTS times
  // ---------------------------------------------------------------------------
  const phonePeScatterdPoints = randomPointsInside(phonePeGeometry, TOTAL_POINTS)
  const diskScatterdPoints = randomPointsInside(diskGeometry, TOTAL_POINTS)
  const diskAlignedPoints = randomPointsInside(diskGeometry, TOTAL_POINTS, true, 0.003)

  const plane = new THREE.PlaneGeometry(0.005, 0.005)
  const geometry = new THREE.InstancedBufferGeometry()
  geometry.index = plane.index
  geometry.attributes.position = plane.attributes.position
  geometry.attributes.uv = plane.attributes.uv
  geometry.attributes.normal = plane.attributes.normal

  plane.dispose()
  geometry.instanceCount = TOTAL_POINTS

  const phonePeScatterdPointsOffsets = new Float32Array(TOTAL_POINTS * 3)
  const diskScatterdPointsOffsets = new Float32Array(TOTAL_POINTS * 3)
  const diskAlignedPointsOffsets = new Float32Array(TOTAL_POINTS * 3)

  const displacement = new Float32Array(TOTAL_POINTS * 3)

  const colors = new Float32Array(TOTAL_POINTS * 3)
  const baseColors = new Float32Array(TOTAL_POINTS * 3)
  const texIndex = new Float32Array(TOTAL_POINTS)
  const randoms = new Float32Array(TOTAL_POINTS)

  for (let i = 0; i < TOTAL_POINTS; i++) {
    const i3 = i * 3
    phonePeScatterdPointsOffsets[i3 + 0] = phonePeScatterdPoints[i].x
    phonePeScatterdPointsOffsets[i3 + 1] = phonePeScatterdPoints[i].y
    phonePeScatterdPointsOffsets[i3 + 2] = phonePeScatterdPoints[i].z

    diskScatterdPointsOffsets[i3 + 0] = diskScatterdPoints[i].x
    diskScatterdPointsOffsets[i3 + 1] = diskScatterdPoints[i].y
    diskScatterdPointsOffsets[i3 + 2] = diskScatterdPoints[i].z

    diskAlignedPointsOffsets[i3 + 0] = diskAlignedPoints[i].x
    diskAlignedPointsOffsets[i3 + 1] = diskAlignedPoints[i].y
    diskAlignedPointsOffsets[i3 + 2] = diskAlignedPoints[i].z

    PALETTE[Math.floor(Math.random() * PALETTE.length)].toArray(colors, i * 3)
    PALETTE[Math.floor(Math.random() * 3)].toArray(baseColors, i * 3)
    texIndex[i] = Math.floor(Math.random() * textures.length)
    randoms[i] = Math.random()
  }

  geometry.setAttribute('aPhonePeScatteredOffset', new THREE.InstancedBufferAttribute(phonePeScatterdPointsOffsets, 3))
  geometry.setAttribute('aDiskScatteredOffset', new THREE.InstancedBufferAttribute(diskScatterdPointsOffsets, 3))
  geometry.setAttribute('aDiskAlignedOffset', new THREE.InstancedBufferAttribute(diskAlignedPointsOffsets, 3))
  geometry.setAttribute('aColor', new THREE.InstancedBufferAttribute(colors, 3))
  geometry.setAttribute('aBaseColor', new THREE.InstancedBufferAttribute(baseColors, 3))
  geometry.setAttribute('aTexIndex', new THREE.InstancedBufferAttribute(texIndex, 1))
  geometry.setAttribute('aRandom', new THREE.InstancedBufferAttribute(randoms, 1))

  const dispAttr = new THREE.InstancedBufferAttribute(displacement, 3)
  dispAttr.setUsage(THREE.DynamicDrawUsage)
  geometry.setAttribute('aDisplacement', dispAttr)

  const velocities = new Float32Array(TOTAL_POINTS * 3)

  // ---------------------------------------------------------------------------
  // Material
  // ---------------------------------------------------------------------------
  textures.forEach((t) => { t.colorSpace = THREE.SRGBColorSpace })

  const material = new THREE.ShaderMaterial({
    vertexShader: planeVertShader,
    fragmentShader: planeFragShader,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0.0 },
      uTex0: { value: textures[0] },
      uTex1: { value: textures[1] },
      uTex2: { value: textures[2] },
      uTex3: { value: textures[3] },
      uAlignedToRand: { value: 0.0 },
      uRandToPhonePe: { value: 0.0 },
      uBaseScale: { value: 1.0 },
      uDistInMin: { value: 0.0 },
      uDistInMax: { value: 30.0 },
      uDistOutMin: { value: 0.2 },
      uDistOutMax: { value: 1.0 },
      uColorTranstion: { value: 0.0 },
      uPulseAmount: { value: 0.25 }
    }
  })

  // ---------------------------------------------------------------------------
  // Scene objects
  // ---------------------------------------------------------------------------
  const group = new THREE.Group()

  const mesh = new THREE.Mesh(geometry, material)
  mesh.frustumCulled = false
  group.add(mesh)

  // Invisible plane the pointer is raycast against
  const raycastPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(0.4, 0.4),
    new THREE.MeshNormalMaterial({
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.0
    })
  )
  group.add(raycastPlane)

  // ---------------------------------------------------------------------------
  // Theatre: transforms (same keys and props @theatre/r3f used, so the saved animation still applies)
  // ---------------------------------------------------------------------------
  const unbindGroup = bindTransform(sheet, 'Pattern / Transformations', group)
  const unbindPlane = bindTransform(sheet, 'RayCast Plane / Transformations', raycastPlane, {
    position: [0, -0.01, 0],
    rotation: [-Math.PI / 2, 0, 0],
  })

  // ---------------------------------------------------------------------------
  // Theatre: transition + mouse controls
  // ---------------------------------------------------------------------------
  const controls = {
    alignedToRand: 0.0,
    randToPhonePe: 0.0,
    base_scale: 0.0,
    distInMin: 0.0,
    distInMax: 30.0,
    distOutMin: 0.2,
    distOutMax: 1.0,
    colorTransition: 0.0,
    pulseAmount: 0.25,
    mouseRadius: 0.01,
    mouseStrength: 0.4,
    mouseStiffness: 40,
    mouseDamping: 7,
    mouseDrag: 5,
    mouseFadeSpeed: 4
  }

  const CONTROLS_KEY = 'Pattern / Transitions Controls'
  const controlsObject = sheet.object(CONTROLS_KEY, {
    aligned_to_random: types.number(0, { range: [0, 1], nudgeMultiplier: 0.01 }),
    random_to_phonePe: types.number(0, { range: [0, 1], nudgeMultiplier: 0.01 }),
    base_scale: types.number(0, { range: [0, 2], nudgeMultiplier: 0.01 }),
    color_transition: types.number(0, { range: [0, 1], nudgeMultiplier: 0.01 }),
    pulse_amount: types.number(0.25, { range: [0, 0.5], nudgeMultiplier: 0.01 }),
    distance_factor: types.compound({
      in_min: types.number(0, { range: [0, 2], nudgeMultiplier: 0.001 }),
      in_max: types.number(30, { range: [0, 2], nudgeMultiplier: 0.001 }),
      out_min: types.number(0.2, { range: [0, 2], nudgeMultiplier: 0.001 }),
      out_max: types.number(1, { range: [0, 2], nudgeMultiplier: 0.001 }),
    }),
    mouse_factor: types.compound({
      radius: types.number(0.01, { range: [0, 0.2], nudgeMultiplier: 0.001 }),
      strength: types.number(0.4, { range: [0, 2], nudgeMultiplier: 0.01 }),
      stiffness: types.number(40, { range: [0, 200], nudgeMultiplier: 1 }),
      damping: types.number(7, { range: [0, 30], nudgeMultiplier: 0.1 }),
      drag: types.number(5, { range: [0, 30], nudgeMultiplier: 0.1 }),
      fade_speed: types.number(4, { range: [0.5, 30], nudgeMultiplier: 0.1 }),
    })
  }, { reconfigure: true })

  const unsubscribeControls = controlsObject.onValuesChange((value) => {
    controls.alignedToRand = value.aligned_to_random
    controls.randToPhonePe = value.random_to_phonePe
    controls.base_scale = value.base_scale
    controls.colorTransition = value.color_transition
    controls.pulseAmount = value.pulse_amount
    controls.distInMin = value.distance_factor.in_min
    controls.distInMax = value.distance_factor.in_max
    controls.distOutMin = value.distance_factor.out_min
    controls.distOutMax = value.distance_factor.out_max
    controls.mouseRadius = value.mouse_factor.radius
    controls.mouseStrength = value.mouse_factor.strength
    controls.mouseStiffness = value.mouse_factor.stiffness
    controls.mouseDamping = value.mouse_factor.damping
    controls.mouseDrag = value.mouse_factor.drag
    controls.mouseFadeSpeed = value.mouse_factor.fade_speed
  })

  // ---------------------------------------------------------------------------
  // Per-frame state
  // ---------------------------------------------------------------------------
  const raycaster = new THREE.Raycaster()
  const pointerTarget = new THREE.Vector3() // where the pointer actually is
  const mouseLocal = new THREE.Vector3()    // smoothed position the particles react to
  const prevMouse = new THREE.Vector3()
  const mouseVel = new THREE.Vector3()
  const rawMouseVel = new THREE.Vector3()
  let wasHitting = false
  let mouseActive = 0

  /** Uniforms + pointer tracking */
  /** @param {FrameState} state */
  const updatePointer = ({ delta, elapsed, camera, pointer }) => {
    const uniforms = material.uniforms
    uniforms.uTime.value = elapsed

    uniforms.uAlignedToRand.value = controls.alignedToRand
    uniforms.uRandToPhonePe.value = controls.randToPhonePe
    uniforms.uBaseScale.value = controls.base_scale
    uniforms.uColorTranstion.value = controls.colorTransition
    uniforms.uPulseAmount.value = controls.pulseAmount
    uniforms.uDistInMin.value = controls.distInMin
    uniforms.uDistInMax.value = controls.distInMax
    uniforms.uDistOutMin.value = controls.distOutMin
    uniforms.uDistOutMax.value = controls.distOutMax

    // Raycasting
    raycaster.setFromCamera(pointer.position, camera)
    const hit = raycaster.intersectObject(raycastPlane)
    const mouseHitting = hit.length > 0 && pointer.isActive()
    if (mouseHitting) {
      mesh.worldToLocal(pointerTarget.copy(hit[0].point))

      if (!wasHitting) {
        // Pointer just arrived (finger down / cursor entered): snap there,
        // so the jump doesn't read as a huge velocity
        mouseLocal.copy(pointerTarget)
        prevMouse.copy(mouseLocal)
      } else {
        // Ease toward the pointer. Touch events arrive unevenly (often 60Hz on
        // 120Hz screens, batched during scroll), so the raw position moves in steps
        mouseLocal.lerp(pointerTarget, 1 - Math.exp(-POINTER_SMOOTHING * delta))
      }
    }

    // Mouse velocity = distance moved / time, smoothed over a few frames to remove jitter
    if (delta > 0) {
      rawMouseVel.subVectors(mouseLocal, prevMouse).divideScalar(delta)
      mouseVel.lerp(rawMouseVel, 1 - Math.exp(-20 * delta))
    }
    prevMouse.copy(mouseLocal)
    wasHitting = mouseHitting

    // Fade the effect in while over the plane, out when the pointer leaves it
    mouseActive = THREE.MathUtils.damp(
      mouseActive, mouseHitting ? 1 : 0, controls.mouseFadeSpeed, delta
    )
  }

  /** Spring physics pushing particles away from the pointer */
  /** @param {number} delta */
  const updatePhysics = (delta) => {
    const disp = dispAttr.array

    const aligned = geometry.getAttribute('aDiskAlignedOffset').array
    const scattered = geometry.getAttribute('aDiskScatteredOffset').array
    const phonePe = geometry.getAttribute('aPhonePeScatteredOffset').array

    const u = controls
    // Clamp so a lag spike can't make the spring overshoot and explode
    const dt = Math.min(delta, 1 / 30)
    const friction = Math.exp(-u.mouseDamping * dt)
    const a = u.alignedToRand, b = u.randToPhonePe
    const mx = mouseLocal.x, mz = mouseLocal.z
    const vx = mouseVel.x, vz = mouseVel.z
    const active = mouseActive
    const radius = u.mouseRadius
    const radiusSq = radius * radius

    for (let i = 0; i < TOTAL_POINTS; i++) {
      const ix = i * 3, iz = i * 3 + 2

      // Home position: same mix the vertex shader does
      const firstX = aligned[ix] + (scattered[ix] - aligned[ix]) * a
      const firstZ = aligned[iz] + (scattered[iz] - aligned[iz]) * a
      const homeX = firstX + (phonePe[ix] - firstX) * b
      const homeZ = firstZ + (phonePe[iz] - firstZ) * b

      const dx = homeX + disp[ix] - mx
      const dz = homeZ + disp[iz] - mz
      const distSq = dx * dx + dz * dz

      let fx = 0, fz = 0

      if (active > 0.001 && distSq < radiusSq && distSq > 1e-12) {
        const dist = Math.sqrt(distSq)
        const falloff = (1 - THREE.MathUtils.smoothstep(dist, 0, radius)) * active
        // Push away from the cursor
        fx += (dx / dist) * falloff * u.mouseStrength
        fz += (dz / dist) * falloff * u.mouseStrength
        // Flick along the direction the mouse is moving
        fx += vx * falloff * u.mouseDrag
        fz += vz * falloff * u.mouseDrag
      }

      // Spring pulling it back home
      fx -= u.mouseStiffness * disp[ix]
      fz -= u.mouseStiffness * disp[iz]

      // Semi-implicit Euler: velocity first, then position with the new velocity
      velocities[ix] = (velocities[ix] + fx * dt) * friction
      velocities[iz] = (velocities[iz] + fz * dt) * friction
      disp[ix] += velocities[ix] * dt
      disp[iz] += velocities[iz] * dt
    }
    dispAttr.needsUpdate = true
  }

  return {
    object: group,

    /** @param {FrameState} state */
    update(state) {
      updatePointer(state)
      updatePhysics(state.delta)
    },

    dispose() {
      unsubscribeControls()
      sheet.detachObject(CONTROLS_KEY)
      unbindGroup()
      unbindPlane()
      geometry.dispose()
      material.dispose()
      raycastPlane.geometry.dispose()
      raycastPlane.material.dispose()
      textures.forEach((t) => t.dispose())
    },
  }
}
