import { useRef } from "react"
import Experience from "./PhonePeExperience"
import { useGSAP } from "@gsap/react"
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(useGSAP, ScrollTrigger)

/** @type {import('./PhonePeExperience').ModelUrls} */
const MODELS = {
  phonePe: 'assets/models/MidPolyPhonepe.glb',
  disk: 'assets/models/MidPolyDisk.glb',
}

/** @type {import('./PhonePeExperience').TextureUrls} */
const TEXTURES = [
  'assets/shapes/1.webp',
  'assets/shapes/2.webp',
  'assets/shapes/3.webp',
  'assets/shapes/4.webp',
]

const App = () => {
  const containerRef = useRef(/** @type {HTMLDivElement | null} */ (null))
  const progressRef = useRef(0)

  useGSAP(() => {
    ScrollTrigger.create({
      trigger: containerRef.current,
      scroller: document.getElementById('root'),
      start: 'top top',
      end: 'bottom bottom',
      scrub: true,
      onUpdate: (self) => {
        progressRef.current = self.progress
      }
    })
  }, { scope: containerRef })


  return (
    <div ref={containerRef} style={{
      outline: '1px solid red',
      height: '300vh'
    }}>
      <div style={{
        height: '50vh',
        width: '100%',
        outline: '1px solid red',
        position: 'sticky',
        top: 0,
      }}>
        <Experience progressRef={progressRef} models={MODELS} textures={TEXTURES} />
      </div>
    </div>
  )
}

export default App
