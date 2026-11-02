import * as THREE from 'three'
import { useGLTF, useTexture } from '@react-three/drei'
import type { GLTF } from 'three-stdlib'
import { useEffect, useMemo, useRef } from 'react'

import planeFragShader from '../Shaders/Plane/frag.glsl?raw'
import planeVertShader from '../Shaders/Plane/vert.glsl?raw'
import { randomPointsInside } from '../Helper/MeshToPoints'
import { useFrame } from '@react-three/fiber'
import { mainSheet } from '../Theatre/init'
import { types } from '@theatre/core'
import { editable as e } from '@theatre/r3f'

type DiskGLTFResult = GLTF & {
  nodes: {
    Disk: THREE.Mesh
  }
  materials: {}
}

type GLTFResult = GLTF & {
  nodes: {
    Mid_polly: THREE.Mesh
  }
  materials: {}
}

const TOTAL_POINTS = 8000

const PALETTE = [
  '#61249f', '#793fb3', '#c192f1', '#e565e1',
  '#f48f9a', '#ffd26a', '#6bc8c9',
].map((c) => new THREE.Color(c))

const PhonePeLogo = () => {
  const { nodes } = useGLTF('assets/reference/MidPolyPhonepe.glb') as unknown as GLTFResult
  const { nodes: diskNodes } = useGLTF('assets/reference/MidPolyDisk.glb') as unknown as DiskGLTFResult
  const textures = useTexture([
    'assets/shapes/1.png',
    'assets/shapes/2.png',
    'assets/shapes/3.png',
  ])

  const meshRef = useRef<THREE.Mesh | null>(null)
  const sphereRef = useRef<THREE.Mesh | null>(null)
  const raycastPlaneRef = useRef<THREE.Mesh | null>(null)

  const mouseLocal = useRef(new THREE.Vector3())
  const prevMouse = useRef(new THREE.Vector3())
  const mouseVel = useRef(new THREE.Vector3())
  const rawMouseVel = useRef(new THREE.Vector3())
  const wasHitting = useRef(false)
  const mouseActive = useRef(0)


  const velocities = useMemo(() => new Float32Array(TOTAL_POINTS * 3), [])

  const [phonePeScatterdPoints, diskScatterdPoints, diskAlignedPoints] = useMemo(() => {
    // const points = randomPointsInside(nodes.Mid_polly.geometry, 1000, true, 0.2)
    const phonePeScatterdPoints = randomPointsInside(nodes.Mid_polly.geometry, TOTAL_POINTS)
    const diskScatterdPoints = randomPointsInside(diskNodes.Disk.geometry, TOTAL_POINTS)
    const diskAlignedPoints = randomPointsInside(diskNodes.Disk.geometry, TOTAL_POINTS, true, 0.003)

    return [phonePeScatterdPoints, diskScatterdPoints, diskAlignedPoints]

    // return points
  }, [nodes, diskNodes])

  const geometry = useMemo(() => {
    const plane = new THREE.PlaneGeometry(0.005, 0.005)
    const geo = new THREE.InstancedBufferGeometry()
    geo.index = plane.index
    geo.attributes.position = plane.attributes.position
    geo.attributes.uv = plane.attributes.uv
    geo.attributes.normal = plane.attributes.normal

    plane.dispose()
    geo.instanceCount = TOTAL_POINTS

    const phonePeScatterdPointsOffsets = new Float32Array(TOTAL_POINTS * 3)
    const diskScatterdPointsOffsets = new Float32Array(TOTAL_POINTS * 3)
    const diskAlignedPointsOffsets = new Float32Array(TOTAL_POINTS * 3)

    const displacement = new Float32Array(TOTAL_POINTS * 3)

    const colors = new Float32Array(TOTAL_POINTS * 3)
    const baseColors = new Float32Array(TOTAL_POINTS * 3)
    const texIndex = new Float32Array(TOTAL_POINTS)
    const randoms = new Float32Array(TOTAL_POINTS)

    for (let i = 0; i < TOTAL_POINTS; i++) {
      const i3 = i * 3;
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
      PALETTE[Math.floor(Math.random() * 2)].toArray(baseColors, i * 3)
      texIndex[i] = Math.floor(Math.random() * textures.length)
      randoms[i] = Math.random()

    }

    geo.setAttribute('aPhonePeScatteredOffset', new THREE.InstancedBufferAttribute(phonePeScatterdPointsOffsets, 3))
    geo.setAttribute('aDiskScatteredOffset', new THREE.InstancedBufferAttribute(diskScatterdPointsOffsets, 3))
    geo.setAttribute('aDiskAlignedOffset', new THREE.InstancedBufferAttribute(diskAlignedPointsOffsets, 3))
    geo.setAttribute('aColor', new THREE.InstancedBufferAttribute(colors, 3))
    geo.setAttribute('aBaseColor', new THREE.InstancedBufferAttribute(baseColors, 3))
    geo.setAttribute('aTexIndex', new THREE.InstancedBufferAttribute(texIndex, 1))
    geo.setAttribute('aRandom', new THREE.InstancedBufferAttribute(randoms, 1))

    const dispAttr = new THREE.InstancedBufferAttribute(displacement, 3)
    dispAttr.setUsage(THREE.DynamicDrawUsage)
    geo.setAttribute('aDisplacement', dispAttr)


    return geo
  }, [])


  const material = useMemo(() => {
    textures.forEach(t => t.colorSpace = THREE.SRGBColorSpace)

    return new THREE.ShaderMaterial({
      vertexShader: planeVertShader,
      fragmentShader: planeFragShader,
      side: THREE.DoubleSide,
      uniforms: {
        uTime: { value: 0.0 },
        uTex0: { value: textures[0] },
        uTex1: { value: textures[1] },
        uTex2: { value: textures[2] },
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
  }, [textures])

  const uniformRef = useRef({
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
  })

  const mouseHitting = useRef(false)

  useEffect(() => {
    const object = mainSheet.object('Pattern / Transitions Controls', {
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

    const unsubscribe = object.onValuesChange((value) => {
      uniformRef.current.alignedToRand = value.aligned_to_random
      uniformRef.current.randToPhonePe = value.random_to_phonePe
      uniformRef.current.base_scale = value.base_scale
      uniformRef.current.colorTransition = value.color_transition
      uniformRef.current.pulseAmount = value.pulse_amount
      uniformRef.current.distInMin = value.distance_factor.in_min
      uniformRef.current.distInMax = value.distance_factor.in_max
      uniformRef.current.distOutMin = value.distance_factor.out_min
      uniformRef.current.distOutMax = value.distance_factor.out_max
      uniformRef.current.mouseRadius = value.mouse_factor.radius
      uniformRef.current.mouseStrength = value.mouse_factor.strength
      uniformRef.current.mouseStiffness = value.mouse_factor.stiffness
      uniformRef.current.mouseDamping = value.mouse_factor.damping
      uniformRef.current.mouseDrag = value.mouse_factor.drag
      uniformRef.current.mouseFadeSpeed = value.mouse_factor.fade_speed
    })

    return () => unsubscribe()
  })

  useEffect(() => () => geometry.dispose(), [geometry])
  useEffect(() => () => material.dispose(), [material])

  useFrame((state, delta) => {
    if (meshRef.current) {
      const mat = meshRef.current.material as THREE.ShaderMaterial
      mat.uniforms.uTime.value = state.clock.elapsedTime


      mat.uniforms.uAlignedToRand.value = uniformRef.current.alignedToRand
      mat.uniforms.uRandToPhonePe.value = uniformRef.current.randToPhonePe
      mat.uniforms.uBaseScale.value = uniformRef.current.base_scale
      mat.uniforms.uColorTranstion.value = uniformRef.current.colorTransition
      mat.uniforms.uPulseAmount.value = uniformRef.current.pulseAmount
      mat.uniforms.uDistInMin.value = uniformRef.current.distInMin
      mat.uniforms.uDistInMax.value = uniformRef.current.distInMax
      mat.uniforms.uDistOutMin.value = uniformRef.current.distOutMin
      mat.uniforms.uDistOutMax.value = uniformRef.current.distOutMax

      //raycasting
      const raycaster = state.raycaster
      raycaster.setFromCamera(state.pointer, state.camera)
      const hit = raycastPlaneRef.current ? raycaster.intersectObject(raycastPlaneRef.current) : []
      mouseHitting.current = hit.length > 0
      if (mouseHitting.current) {
        const point = hit[0].point
        meshRef.current.worldToLocal(mouseLocal.current.copy(point))
        sphereRef.current?.position.copy(point)
      }

      // Cursor just entered the plane: start from here so the jump doesn't read as a huge velocity
      if (mouseHitting.current && !wasHitting.current) {
        prevMouse.current.copy(mouseLocal.current)
      }

      // Mouse velocity = distance moved / time, smoothed over a few frames to remove jitter
      if (delta > 0) {
        rawMouseVel.current.subVectors(mouseLocal.current, prevMouse.current).divideScalar(delta)
        mouseVel.current.lerp(rawMouseVel.current, 1 - Math.exp(-20 * delta))
      }
      prevMouse.current.copy(mouseLocal.current)
      wasHitting.current = mouseHitting.current

      // Fade the effect in while over the plane, out when the pointer leaves it
      mouseActive.current = THREE.MathUtils.damp(
        mouseActive.current, mouseHitting.current ? 1 : 0, uniformRef.current.mouseFadeSpeed, delta
      )
    }
  })

  useFrame((_, delta) => {
    const dispAttr = geometry.getAttribute('aDisplacement') as THREE.InstancedBufferAttribute
    const disp = dispAttr.array as Float32Array

    const aligned = geometry.getAttribute('aDiskAlignedOffset').array as Float32Array
    const scattered = geometry.getAttribute('aDiskScatteredOffset').array as Float32Array
    const phonePe = geometry.getAttribute('aPhonePeScatteredOffset').array as Float32Array

    const u = uniformRef.current
    // Clamp so a lag spike can't make the spring overshoot and explode
    const dt = Math.min(delta, 1 / 30)
    const friction = Math.exp(-u.mouseDamping * dt)
    const a = u.alignedToRand, b = u.randToPhonePe
    const mx = mouseLocal.current.x, mz = mouseLocal.current.z
    const vx = mouseVel.current.x, vz = mouseVel.current.z
    const active = mouseActive.current
    const radius = u.mouseRadius

    for (let i = 0; i < TOTAL_POINTS; i++) {
      const ix = i * 3, iz = i * 3 + 2

      // Home position: same mix the vertex shader does
      const firstX = aligned[ix] + (scattered[ix] - aligned[ix]) * a
      const firstZ = aligned[iz] + (scattered[iz] - aligned[iz]) * a
      const homeX = firstX + (phonePe[ix] - firstX) * b
      const homeZ = firstZ + (phonePe[iz] - firstZ) * b

      // Distance from the particle's current (displaced) position to the mouse
      const dx = homeX + disp[ix] - mx
      const dz = homeZ + disp[iz] - mz
      const dist = Math.hypot(dx, dz)

      let fx = 0, fz = 0

      if (active > 0.001 && dist < radius && dist > 1e-6) {
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
  })


  return (
    <>
      <e.group theatreKey='Pattern / Transformations'>
        <mesh ref={meshRef} geometry={geometry} material={material} frustumCulled={false} />
        <e.mesh
          ref={raycastPlaneRef}
          theatreKey='RayCast Plane / Transformations'
          geometry={new THREE.PlaneGeometry(0.4, 0.4)}
          material={new THREE.MeshNormalMaterial({
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.0

          })}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, -0.01, 0]}
        />
        <mesh ref={sphereRef}>
          <sphereGeometry args={[0.001]} />
          <meshNormalMaterial />
        </mesh>
      </e.group>
    </>
  )
}

export default PhonePeLogo
