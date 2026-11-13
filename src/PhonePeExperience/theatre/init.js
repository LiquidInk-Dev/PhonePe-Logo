import { getProject } from '@theatre/core'
import sheet from './PhonePe.theatre-project-state.json'

/** @type {Promise<void> | null} */
let studioPromise = null

/**
 * Loads the Theatre.js editor on top of the page. Development builds only:
 * in production builds `process.env.NODE_ENV` is replaced with "production",
 * so the bundler drops the `import('@theatre/studio')` below entirely.
 * @returns {Promise<void> | null}
 */
export function initStudio() {
  if (studioPromise) return studioPromise

  if (process.env.NODE_ENV === 'development') {
    studioPromise = import('@theatre/studio')
      .then((mod) => {
        // Bundlers wrap this CommonJS module differently (Vite vs webpack),
        // so unwrap `.default` until we reach the object with `initialize`
        /** @type {any} */
        let studio = mod
        while (studio && !studio.initialize && studio.default) studio = studio.default
        studio.initialize()
      })
      .catch((err) => {
        console.error('Theatre Studio failed to load', err)
      })
  }

  return studioPromise
}

// Safe to run during server-side rendering (Gatsby build): @theatre/core needs no window or DOM
export const project = getProject('PhonePe', { state: sheet })
export const mainSheet = project.sheet('PhonePeSheet')
