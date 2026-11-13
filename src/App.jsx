import React, { useEffect, useRef } from "react"
import Experience from "./PhonePeExperience"
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

/** @type {import('./PhonePeExperience').ModelUrls} */
const MODELS = {
  phonePe: '/assets/models/MidPolyPhonepe.glb',
  disk: '/assets/models/MidPolyDisk.glb',
}

/** @type {import('./PhonePeExperience').TextureUrls} */
const TEXTURES = [
  '/assets/shapes/1.webp',
  '/assets/shapes/2.webp',
  '/assets/shapes/3.webp',
  '/assets/shapes/4.webp',
]

// Open the page with ?studio to edit the animation (development builds only)
const STUDIO = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('studio')

const App = () => {
  const containerRef = useRef(/** @type {HTMLDivElement | null} */ (null))
  const progressRef = useRef(0)

  useEffect(() => {
    // gsap.context collects everything created inside, so revert() cleans it all up
    const ctx = gsap.context(() => {
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
    }, containerRef)

    return () => ctx.revert()
  }, [])


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
        <Experience
          progressRef={progressRef}
          models={MODELS}
          textures={TEXTURES}
          studio={STUDIO}
          onReady={() => console.log('PhonePeExperience ready')}
        />
      </div>
    </div>
  )
}

export default App
