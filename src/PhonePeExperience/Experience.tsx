"use client"

import { Canvas, useFrame } from "@react-three/fiber"
import PhonePeLogo, { type ModelUrls, type TextureUrls } from "./PhonePeLogo"
import { initStudio, mainSheet } from "./theatre/init"
import { PerspectiveCamera, SheetProvider } from "@theatre/r3f"
import * as THREE from 'three'
import { useEffect, type CSSProperties, type RefObject } from "react"

const BASE_FOV = 42
const DESIGN_ASPECT = 1

const ContainFov = () => {
  useFrame(({ camera, size }) => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return

    const aspect = size.width / size.height
    let fov = BASE_FOV

    if (aspect < DESIGN_ASPECT) {
      const halfTan = Math.tan(THREE.MathUtils.degToRad(BASE_FOV / 2))
      fov = THREE.MathUtils.radToDeg(2 * Math.atan(halfTan * (DESIGN_ASPECT / aspect)))
    }

    if (camera.fov !== fov) {
      camera.fov = fov
      camera.updateProjectionMatrix()
    }
  })
  return null
}

export type ExperienceProps = {
  progressRef: RefObject<number>
  models: ModelUrls
  textures: TextureUrls
  studio?: boolean
  className?: string
  style?: CSSProperties
}

type ShellProps = Pick<ExperienceProps, 'progressRef' | 'models' | 'textures'>

const SEQUENCE_LENGTH = 10

const Shell = ({ progressRef, models, textures }: ShellProps) => {
  useFrame(() => {
    mainSheet.sequence.position = THREE.MathUtils.mapLinear(progressRef.current ?? 0, 0, 1, 0, SEQUENCE_LENGTH)
  })

  return (
    <SheetProvider sheet={mainSheet}>
      {/* Dont change the camera setting */}
      <PerspectiveCamera theatreKey="Camera" makeDefault position={[0, 1, 0]} lookAt={[0, 0, 0]} fov={BASE_FOV} />
      <ContainFov />
      <PhonePeLogo models={models} textures={textures} />
    </SheetProvider>
  )
}


const Experience = ({ progressRef, models, textures, studio = false, className, style }: ExperienceProps) => {
  useEffect(() => {
    if (studio) initStudio()
  }, [studio])

  return (
    <Canvas
      className={className}
      style={{
        height: '100%',
        width: '100%',

        // Vertical swipes scroll the page (browser keeps them),
        // horizontal swipes go fully to the canvas (the page can't scroll sideways anyway)
        touchAction: 'pan-y',
        ...style,
      }}
    >
      <Shell progressRef={progressRef} models={models} textures={textures} />
    </Canvas>
  )
}

export default Experience
