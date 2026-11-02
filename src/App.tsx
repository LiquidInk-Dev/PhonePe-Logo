import { useRef } from "react"
import Experience from "./Components/Experience"
import { useGSAP } from "@gsap/react"
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(useGSAP, ScrollTrigger)

const App = () => {
  const containerRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef(0)

  useGSAP(() => {
    ScrollTrigger.create({
      trigger: containerRef.current,
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
      <Experience progressRef={progressRef} />
    </div>
  )
}

export default App
