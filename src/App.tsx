import { useRef } from "react"
import Experience from "./Components/Experience"
import type { ModelUrls } from "./Components/PhonePeLogo"
import { useGSAP } from "@gsap/react"
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(useGSAP, ScrollTrigger)

const MODELS: ModelUrls = {
  phonePe: 'assets/models/MidPolyPhonepe.glb',
  disk: 'assets/models/MidPolyDisk.glb',
}

const App = () => {
  const containerRef = useRef<HTMLDivElement>(null)
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
        <Experience progressRef={progressRef} models={MODELS} />
      </div>
    </div>
  )
}

export default App
