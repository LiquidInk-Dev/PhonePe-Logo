import * as THREE from 'three'
import { useGLTF, useTexture } from '@react-three/drei'
import type { GLTF } from 'three-stdlib'
import { useEffect, useMemo, useRef } from 'react'

import planeFragShader from '../Shaders/Plane/frag.glsl?raw'
import planeVertShader from '../Shaders/Plane/vert.glsl?raw'
import { randomPointsInside } from '../Helper/MeshToPoints'
import { useFrame, useThree } from '@react-three/fiber'
import { mainSheet } from '../Theatre/init'
import { types } from '@theatre/core'

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

const TOTAL_POINTS = 5000

const PALETTE = [
  '#ff5e5b', '#ffb400', '#00cc99', '#3a86ff',
  '#8338ec', '#ff006e', '#fb5607',
].map((c) => new THREE.Color(c))

const PhonePeLogo = () => {
  const { size, gl } = useThree()
  const { nodes } = useGLTF('assets/reference/MidPolyPhonepe.glb') as unknown as GLTFResult
  const { nodes: diskNodes } = useGLTF('assets/reference/MidPolyDisk.glb') as unknown as DiskGLTFResult
  const textures = useTexture([
    'assets/shapes/1.png',
    'assets/shapes/2.png',
    'assets/shapes/3.png',
  ])

  const meshRef = useRef<THREE.Mesh | null>(null)

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

    const colors = new Float32Array(TOTAL_POINTS * 3)
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
      texIndex[i] = Math.floor(Math.random() * textures.length)
      randoms[i] = Math.random()

    }

    geo.setAttribute('aPhonePeScatteredOffset', new THREE.InstancedBufferAttribute(phonePeScatterdPointsOffsets, 3))
    geo.setAttribute('aDiskScatteredOffset', new THREE.InstancedBufferAttribute(diskScatterdPointsOffsets, 3))
    geo.setAttribute('aDiskAlignedOffset', new THREE.InstancedBufferAttribute(diskAlignedPointsOffsets, 3))
    geo.setAttribute('aColor', new THREE.InstancedBufferAttribute(colors, 3))
    geo.setAttribute('aTexIndex', new THREE.InstancedBufferAttribute(texIndex, 1))
    geo.setAttribute('aRandom', new THREE.InstancedBufferAttribute(randoms, 1))

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
        uResolution: { value: new THREE.Vector2(size.width * gl.getPixelRatio(), size.height * gl.getPixelRatio()) }
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
    distOutMax: 1.0
  })

  useEffect(() => {
    const object = mainSheet.object('Pattern / Transitions Controls', {
      aligned_to_random: types.number(0, { range: [0, 1], nudgeMultiplier: 0.01 }),
      random_to_phonePe: types.number(0, { range: [0, 1], nudgeMultiplier: 0.01 }),
      base_scale: types.number(0, { range: [0, 2], nudgeMultiplier: 0.01 }),
      distance_factor: types.compound({
        in_min: types.number(0, { range: [0, 2], nudgeMultiplier: 0.001 }),
        in_max: types.number(30, { range: [0, 2], nudgeMultiplier: 0.001 }),
        out_min: types.number(0.2, { range: [0, 2], nudgeMultiplier: 0.001 }),
        out_max: types.number(1, { range: [0, 2], nudgeMultiplier: 0.001 }),
      }),
    }, { reconfigure: true })

    const unsubscribe = object.onValuesChange((value) => {
      uniformRef.current.alignedToRand = value.aligned_to_random
      uniformRef.current.randToPhonePe = value.random_to_phonePe
      uniformRef.current.base_scale = value.base_scale
      uniformRef.current.distInMin = value.distance_factor.in_min
      uniformRef.current.distInMax = value.distance_factor.in_max
      uniformRef.current.distOutMin = value.distance_factor.out_min
      uniformRef.current.distOutMax = value.distance_factor.out_max
    })

    return () => unsubscribe()
  })

  useEffect(() => () => geometry.dispose(), [geometry])
  useEffect(() => () => material.dispose(), [material])

  useFrame((state) => {
    if (meshRef.current) {
      const mat = meshRef.current.material as THREE.ShaderMaterial
      mat.uniforms.uTime.value = state.clock.elapsedTime
      mat.uniforms.uResolution.value.set(size.width * gl.getPixelRatio(), size.height * gl.getPixelRatio())


      mat.uniforms.uAlignedToRand.value = uniformRef.current.alignedToRand
      mat.uniforms.uRandToPhonePe.value = uniformRef.current.randToPhonePe
      mat.uniforms.uBaseScale.value = uniformRef.current.base_scale
      mat.uniforms.uDistInMin.value = uniformRef.current.distInMin
      mat.uniforms.uDistInMax.value = uniformRef.current.distInMax
      mat.uniforms.uDistOutMin.value = uniformRef.current.distOutMin
      mat.uniforms.uDistOutMax.value = uniformRef.current.distOutMax
    }
  })


  return (
    <>
      <mesh ref={meshRef} geometry={geometry} material={material} frustumCulled={false} />
      {/* <mesh */}
      {/*   castShadow */}
      {/*   receiveShadow */}
      {/*   geometry={diskNodes.Disk.geometry} */}
      {/*   // geometry={nodes.Mid_polly.geometry} */}
      {/*   material={new THREE.MeshNormalMaterial()} */}
      {/* /> */}
    </>
  )
}

export default PhonePeLogo
