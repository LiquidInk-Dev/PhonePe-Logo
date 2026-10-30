import { getProject } from '@theatre/core'
import sheet from './PhonePe.theatre-project-state.json'

// theatre/initStudio.ts


export async function initStudio() {
  if (!import.meta.env.DEV) return
  try {
    const [studioMod, extMod] = await Promise.all([
      import('@theatre/studio'),
      import('@theatre/r3f/dist/extension'),
    ])
    const studio = (studioMod as any).default ?? studioMod
    const extension = (extMod as any).default ?? extMod

    studio.default.extend(extension)
    studio.default.initialize()
  } catch (err) {
    console.error('Theatre Studio failed to load', err)
  }
}


export const project = getProject('PhonePe', { state: sheet })
export const mainSheet = project.sheet('PhonePeSheet')
