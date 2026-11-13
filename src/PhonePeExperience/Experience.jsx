import React, { useEffect, useRef } from 'react'
import { createExperience } from './createExperience'
import { initStudio } from './theatre/init'

/**
 * @typedef {object} ExperienceProps
 * @property {{ current: number | null | undefined }} progressRef 0..1, read every frame (no re-renders)
 * @property {import('./PhonePeLogo').ModelUrls} models
 * @property {import('./PhonePeLogo').TextureUrls} textures
 * @property {boolean} [studio] Loads the Theatre.js editor. Development builds only.
 * @property {() => void} [onReady] Called once, after the assets load and the first frame renders
 * @property {string} [className]
 * @property {React.CSSProperties} [style]
 */

/**
 * The animated 3D particle PhonePe logo. Works with React 16.8+.
 *
 * Safe to server-render (Gatsby): it renders an empty <div> on the server, and all
 * WebGL work happens in useEffect, which only runs in the browser.
 *
 * @param {ExperienceProps} props
 */
const Experience = ({ progressRef, models, textures, studio = false, onReady, className, style }) => {
  const containerRef = useRef(/** @type {HTMLDivElement | null} */ (null))

  // Always call the latest onReady without restarting the scene when it changes
  const onReadyRef = useRef(onReady)
  useEffect(() => {
    onReadyRef.current = onReady
  })

  useEffect(() => {
    if (studio) initStudio()
  }, [studio])

  // Primitive keys, so new-but-equal objects/arrays on every render don't rebuild the scene
  const phonePeUrl = models.phonePe
  const diskUrl = models.disk
  const texturesKey = textures.join('\n')

  useEffect(() => {
    const container = containerRef.current
    if (!container) return undefined

    const experience = createExperience(container, {
      models: { phonePe: phonePeUrl, disk: diskUrl },
      textures: /** @type {import('./PhonePeLogo').TextureUrls} */ (texturesKey.split('\n')),
      progressRef,
      onReady: () => {
        if (onReadyRef.current) onReadyRef.current()
      },
    })

    return () => experience.dispose()
  }, [phonePeUrl, diskUrl, texturesKey, progressRef])

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: 'relative',
        overflow: 'hidden',
        height: '100%',
        width: '100%',

        // Vertical swipes scroll the page (browser keeps them),
        // horizontal swipes go fully to the canvas (the page can't scroll sideways anyway)
        touchAction: 'pan-y',
        ...style,
      }}
    />
  )
}

export default Experience
