import { createRequire } from 'node:module'

// OpenCV compiled to WebAssembly: no native build, so it runs the same on Windows, Linux and Render.
// Loaded once, on first use, so the API starts fast and tests that never match don't pay for it.
export type CV = any

// The module is a "thenable" whose then() hands back itself, so awaiting it (or returning it from an
// async function) never settles. It travels inside a box instead.
let loading: Promise<{ cv: CV }> | undefined

/** Destructure it: `const { cv } = await openCv()`. */
export function openCv(): Promise<{ cv: CV }> {
  loading ??= new Promise((resolve) => {
    const cv = createRequire(import.meta.url)('@techstark/opencv-js')
    if (cv.Mat) resolve({ cv })
    else cv.onRuntimeInitialized = () => resolve({ cv })
  })
  return loading
}
