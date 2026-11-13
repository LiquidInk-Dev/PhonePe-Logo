import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { types } from '@theatre/core'

import { createPhonePeLogo } from './PhonePeLogo'
import { createPointer } from './helpers/pointer'
import { mainSheet } from './theatre/init'

// Camera field of view on landscape and square screens. Don't change the camera setup:
// the logo is framed for it.
const BASE_FOV = 42
// Below this aspect ratio (portrait) the FOV widens so the logo always fits the width
const DESIGN_ASPECT = 1
// Theatre timeline length in seconds. Must match the sequence in the studio.
const SEQUENCE_LENGTH = 10
// Never render above 2x: sharper isn't visible, but it's up to 2.25x more pixels on 3x phones
const MAX_PIXEL_RATIO = 2

/**
 * @typedef {object} ExperienceOptions
 * @property {import('./PhonePeLogo').ModelUrls} models
 * @property {import('./PhonePeLogo').TextureUrls} textures
 * @property {{ current: number | null | undefined }} progressRef Read every frame, 0..1
 * @property {() => void} [onReady] Called once, after assets load and the first frame renders
 */

/**
 * Framework-agnostic core: creates the renderer inside `container`, loads the assets,
 * and runs the render loop until `dispose()` is called.
 *
 * Touches the DOM and WebGL, so only call it in the browser (inside useEffect).
 *
 * @param {HTMLElement} container
 * @param {ExperienceOptions} options
 * @returns {{ dispose: () => void }}
 */
export function createExperience(container, { models, textures: textureUrls, progressRef, onReady }) {
  let disposed = false

  // ---------------------------------------------------------------------------
  // Renderer (same settings @react-three/fiber's <Canvas> used)
  // ---------------------------------------------------------------------------
  /** @type {THREE.WebGLRenderer} */
  let renderer
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
  } catch (err) {
    // No WebGL (old device, disabled GPU, jsdom in tests): render nothing instead of crashing the page
    console.warn('PhonePeExperience: WebGL is not available', err)
    return { dispose() {} }
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping

  const canvas = renderer.domElement
  canvas.style.display = 'block'
  canvas.style.width = '100%'
  canvas.style.height = '100%'
  container.appendChild(canvas)

  const scene = new THREE.Scene()

  // ---------------------------------------------------------------------------
  // Camera (Theatre key "Camera": position / near / far / zoom are editable in the studio.
  // FOV is computed below and the camera always looks at the origin, so those aren't editable.)
  // ---------------------------------------------------------------------------
  const camera = new THREE.PerspectiveCamera(BASE_FOV, 1, 0.01, 2000)
  camera.position.set(0, 1, 0)

  const CAMERA_KEY = 'Camera'
  const cameraObject = mainSheet.object(CAMERA_KEY, {
    position: {
      x: types.number(0, { nudgeMultiplier: 0.01 }),
      y: types.number(1, { nudgeMultiplier: 0.01 }),
      z: types.number(0, { nudgeMultiplier: 0.01 }),
    },
    near: types.number(0.01, { nudgeMultiplier: 0.1 }),
    far: types.number(2000, { nudgeMultiplier: 0.1 }),
    zoom: types.number(1, { nudgeMultiplier: 0.01 }),
  }, { reconfigure: true })

  /** @param {any} v */
  const applyCamera = (v) => {
    camera.position.set(v.position.x, v.position.y, v.position.z)
    camera.near = v.near
    camera.far = v.far
    camera.zoom = v.zoom
    camera.updateProjectionMatrix()
  }
  applyCamera(cameraObject.value)
  const unsubscribeCamera = cameraObject.onValuesChange(applyCamera)

  // Widen the FOV on portrait screens so the square design always fits the width
  const containFov = () => {
    let fov = BASE_FOV
    if (camera.aspect < DESIGN_ASPECT) {
      const halfTan = Math.tan(THREE.MathUtils.degToRad(BASE_FOV / 2))
      fov = THREE.MathUtils.radToDeg(2 * Math.atan(halfTan * (DESIGN_ASPECT / camera.aspect)))
    }
    if (camera.fov !== fov) {
      camera.fov = fov
      camera.updateProjectionMatrix()
    }
  }

  // ---------------------------------------------------------------------------
  // Sizing
  // ---------------------------------------------------------------------------
  const resize = () => {
    const width = container.clientWidth
    const height = container.clientHeight
    if (width === 0 || height === 0) return
    renderer.setSize(width, height, false)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
  }
  resize()
  const resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(container)

  // ---------------------------------------------------------------------------
  // Input
  // ---------------------------------------------------------------------------
  const pointer = createPointer(canvas)

  // ---------------------------------------------------------------------------
  // Render loop. Pauses while the canvas is off-screen.
  // ---------------------------------------------------------------------------
  const timer = new THREE.Timer()
  timer.connect(document) // no huge delta after switching tabs

  /** @type {ReturnType<typeof createPhonePeLogo> | null} */
  let logo = null
  let frameId = 0
  let running = false
  let readyFired = false

  /** @param {number} timestamp */
  const frame = (timestamp) => {
    frameId = requestAnimationFrame(frame)
    timer.update(timestamp)
    const delta = timer.getDelta()

    const progress = progressRef.current == null ? 0 : progressRef.current
    mainSheet.sequence.position = THREE.MathUtils.mapLinear(progress, 0, 1, 0, SEQUENCE_LENGTH)

    containFov()
    camera.lookAt(0, 0, 0)

    if (logo) logo.update({ delta, elapsed: timer.getElapsed(), camera, pointer })

    renderer.render(scene, camera)

    if (logo && !readyFired) {
      readyFired = true
      if (onReady) onReady()
    }
  }

  const start = () => {
    if (running || disposed) return
    running = true
    timer.reset() // resume without a time jump
    frameId = requestAnimationFrame(frame)
  }
  const stop = () => {
    running = false
    cancelAnimationFrame(frameId)
  }

  const visibilityObserver = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) start()
    else stop()
  })
  visibilityObserver.observe(container)

  // ---------------------------------------------------------------------------
  // Assets
  // ---------------------------------------------------------------------------
  // The .glb models must be uncompressed (no Draco/Meshopt): no decoder is set up
  const gltfLoader = new GLTFLoader()
  const textureLoader = new THREE.TextureLoader()

  /**
   * @param {THREE.Object3D} root
   * @param {string} name
   * @param {string} url
   */
  const findMesh = (root, name, url) => {
    const mesh = root.getObjectByName(name)
    if (!mesh || !(/** @type {THREE.Mesh} */ (mesh).isMesh)) {
      throw new Error(`PhonePeExperience: "${url}" must contain a mesh named "${name}"`)
    }
    return /** @type {THREE.Mesh} */ (mesh)
  }

  /** @param {THREE.Object3D} root */
  const disposeGltf = (root) => {
    root.traverse((o) => {
      const mesh = /** @type {THREE.Mesh} */ (o)
      if (mesh.geometry) mesh.geometry.dispose()
      const materials = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : []
      materials.forEach((m) => m.dispose())
    })
  }

  Promise.all([
    gltfLoader.loadAsync(models.phonePe),
    gltfLoader.loadAsync(models.disk),
    Promise.all(textureUrls.map((url) => textureLoader.loadAsync(url))),
  ])
    .then(([phonePeGltf, diskGltf, textures]) => {
      if (disposed) {
        disposeGltf(phonePeGltf.scene)
        disposeGltf(diskGltf.scene)
        textures.forEach((t) => t.dispose())
        return
      }

      logo = createPhonePeLogo({
        phonePeGeometry: findMesh(phonePeGltf.scene, 'Mid_polly', models.phonePe).geometry,
        diskGeometry: findMesh(diskGltf.scene, 'Disk', models.disk).geometry,
        textures,
        sheet: mainSheet,
      })
      scene.add(logo.object)

      // The models were only needed to sample points
      disposeGltf(phonePeGltf.scene)
      disposeGltf(diskGltf.scene)
    })
    .catch((err) => {
      console.error('PhonePeExperience: failed to load assets', err)
    })

  // ---------------------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------------------
  return {
    dispose() {
      disposed = true
      stop()
      visibilityObserver.disconnect()
      resizeObserver.disconnect()
      pointer.dispose()
      timer.dispose()
      unsubscribeCamera()
      mainSheet.detachObject(CAMERA_KEY)
      if (logo) {
        scene.remove(logo.object)
        logo.dispose()
        logo = null
      }
      renderer.dispose()
      renderer.forceContextLoss()
      canvas.remove()
    },
  }
}
