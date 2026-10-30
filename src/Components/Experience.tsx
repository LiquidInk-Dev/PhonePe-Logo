import { Canvas } from "@react-three/fiber"
import PhonePeLogo from "./PhonePeLogo"
import { initStudio, mainSheet } from "../Theatre/init"
import { PerspectiveCamera, SheetProvider } from "@theatre/r3f"

initStudio()

const Experience = () => {
  console.log("Helo experience")
  return (
    <Canvas
      gl={{
        preserveDrawingBuffer: true
      }}
    >
      <SheetProvider sheet={mainSheet}>
        <PerspectiveCamera theatreKey="Camera" makeDefault position={[0, 3, 0]} lookAt={[0, 0, 0]} fov={50} />
        <PhonePeLogo />
      </SheetProvider>
    </Canvas>
  )
}

export default Experience
