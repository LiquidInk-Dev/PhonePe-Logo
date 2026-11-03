import { Canvas, useFrame } from "@react-three/fiber"
import PhonePeLogo, { type ModelUrls } from "./PhonePeLogo"
import { initStudio, mainSheet } from "../Theatre/init"
import { PerspectiveCamera, SheetProvider } from "@theatre/r3f"
import * as THREE from 'three'
import type { RefObject } from "react"
import { AdaptiveDpr } from "@react-three/drei"

initStudio()

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

type ExperienceProps = {
  progressRef: RefObject<number>
  models: ModelUrls
}

const Shell = ({ progressRef, models }: ExperienceProps) => {
  useFrame(() => {
    mainSheet.sequence.position = THREE.MathUtils.mapLinear(progressRef.current, 0, 1, 0, 10)
  })

  return (
    <SheetProvider sheet={mainSheet}>
      {/* Dont change the camera setting */}
      <PerspectiveCamera theatreKey="Camera" makeDefault position={[0, 1, 0]} lookAt={[0, 0, 0]} fov={BASE_FOV} />
      <ContainFov />
      <PhonePeLogo models={models} />
    </SheetProvider>
  )
}


const Experience = ({ progressRef, models }: ExperienceProps) => {
  return (
    <Canvas
      style={{
        height: '100%',
        width: '100%',

        // Vertical swipes scroll the page (browser keeps them),
        // horizontal swipes go fully to the canvas (the page can't scroll sideways anyway)
        touchAction: 'pan-y',
      }}
    >
      <AdaptiveDpr pixelated />
      <Shell progressRef={progressRef} models={models} />
    </Canvas>
  )
}

export default Experience
