import { Canvas, useFrame } from "@react-three/fiber"
import PhonePeLogo from "./PhonePeLogo"
import { initStudio, mainSheet } from "../Theatre/init"
import { PerspectiveCamera, SheetProvider } from "@theatre/r3f"
import * as THREE from 'three'
import type { RefObject } from "react"

initStudio()

const Shell = ({ progressRef }: { progressRef: RefObject<number> }) => {
  useFrame(() => {
    mainSheet.sequence.position = THREE.MathUtils.mapLinear(progressRef.current, 0, 1, 0, 10)
  })

  return (
    <SheetProvider sheet={mainSheet}>
      <PerspectiveCamera theatreKey="Camera" makeDefault position={[0, 3, 0]} lookAt={[0, 0, 0]} fov={50} />
      <PhonePeLogo />
    </SheetProvider>
  )
}


const Experience = ({ progressRef }: { progressRef: RefObject<number> }) => {
  return (
    <Canvas
      gl={{
        preserveDrawingBuffer: true
      }}
      style={{
        position: 'fixed',
        zIndex: '999',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%,-50%)',
        height: '50%',
        width: '50%',
        outline: '1px solid red'
      }}
    >
      <Shell progressRef={progressRef} />
    </Canvas>
  )
}

export default Experience
