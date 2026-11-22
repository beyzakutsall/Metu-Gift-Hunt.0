import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { createConfetti } from './confetti'
import { createGiftBox } from './giftBox'

const SHAKE = 0.55 // seconds
const POP = 0.75
const clamp = (value: number) => Math.min(1, Math.max(0, value))
const overshoot = (t: number) => 1 + 2.7 * (t - 1) ** 3 + 1.7 * (t - 1) ** 2

export type GiftScene = ReturnType<typeof createGiftScene>

interface Options {
  wrapped: boolean
  reducedMotion: boolean
  onOpened: () => void
  onLost: () => void
}

function release(root: THREE.Object3D) {
  root.traverse((object) => {
    const mesh = object as THREE.Mesh
    if (!mesh.isMesh) return
    mesh.geometry.dispose()
    for (const material of [mesh.material].flat()) {
      for (const value of Object.values(material)) if (value instanceof THREE.Texture) value.dispose()
      material.dispose()
    }
  })
}

/**
 * The three.js side of the discovery screen. It knows nothing about React.
 * Every model file is centred and fits a sphere of radius 1, so one camera suits them all.
 * Throws when WebGL is unavailable.
 */
export function createGiftScene(host: HTMLElement, { wrapped, reducedMotion, onOpened, onLost }: Options) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.toneMapping = THREE.NeutralToneMapping
  const canvas = renderer.domElement
  canvas.setAttribute('aria-hidden', 'true')
  canvas.className = 'absolute inset-0 size-full'
  host.append(canvas)

  // The same lighting as the pre-rendered booklet previews.
  const scene = new THREE.Scene()
  const room = new RoomEnvironment()
  const generator = new THREE.PMREMGenerator(renderer)
  const environment = generator.fromScene(room, 0.04)
  generator.dispose()
  release(room)
  scene.environment = environment.texture
  const sun = new THREE.DirectionalLight('#ffffff', 1.4)
  sun.position.set(2, 4, 3)
  scene.add(sun)

  const camera = new THREE.PerspectiveCamera(34, 1, 0.05, 30)
  const controls = new OrbitControls(camera, canvas)
  Object.assign(controls, { enableDamping: !reducedMotion, enablePan: false, minDistance: 1.6, maxDistance: 7 })
  controls.enabled = !wrapped
  controls.autoRotate = !wrapped && !reducedMotion
  controls.autoRotateSpeed = 2.4
  controls.addEventListener('start', () => (controls.autoRotate = false))

  let home = 3.5
  function reset() {
    camera.position.set(Math.sin(0.5) * Math.cos(0.3), Math.sin(0.3), Math.cos(0.5) * Math.cos(0.3)).multiplyScalar(home)
    controls.target.set(0, 0, 0)
    controls.update()
  }

  let sized = false
  function resize() {
    const { clientWidth: width, clientHeight: height } = host
    if (!width || !height) return
    renderer.setSize(width, height, false)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    const halfAngle = Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * Math.min(1, camera.aspect))
    home = Math.min(6.5, 0.94 / Math.sin(halfAngle))
    if (!sized) reset()
    sized = true
  }
  const observer = new ResizeObserver(resize)
  observer.observe(host)
  resize()

  const gift = wrapped ? createGiftBox() : null
  const confetti = gift && !reducedMotion ? createConfetti() : null
  if (gift) scene.add(gift.group)
  if (confetti) scene.add(confetti.mesh)

  const holder = new THREE.Group()
  holder.visible = !wrapped
  scene.add(holder)

  const clock = new THREE.Clock()
  let mixer: THREE.AnimationMixer | null = null
  let time = 0
  let openedAt: number | null = null
  let announced = false
  let disposed = false

  function animateOpening() {
    if (!gift) return
    if (openedAt === null) {
      if (reducedMotion) return
      gift.group.position.y = Math.sin(time * 2.6) * 0.05
      gift.group.rotation.y = Math.sin(time * 0.9) * 0.25
      return
    }
    const since = reducedMotion ? SHAKE + POP : time - openedAt
    const shake = clamp(since / SHAKE)
    const pop = clamp((since - SHAKE) / POP)

    gift.group.rotation.z = pop ? 0 : Math.sin(since * 38) * 0.09 * shake
    gift.lid.position.y = 0.33 + pop * 2.2
    gift.lid.rotation.set(pop * 1.8, pop, pop * 1.2)
    gift.group.scale.setScalar(Math.max(0.001, 1 - pop))
    gift.group.visible = pop < 1

    holder.visible = pop > 0
    holder.scale.setScalar(Math.max(0.001, overshoot(pop)))
    holder.rotation.y = (1 - pop) ** 2 * -Math.PI * 2
    confetti?.update(since - SHAKE)

    if (pop === 1 && !announced) {
      announced = true
      controls.enabled = true
      controls.autoRotate = !reducedMotion
      onOpened()
    }
  }

  renderer.setAnimationLoop(() => {
    const delta = Math.min(clock.getDelta(), 0.1)
    time += delta
    animateOpening()
    mixer?.update(delta)
    controls.update(delta)
    renderer.render(scene, camera)
  })

  const lost = (event: Event) => {
    event.preventDefault()
    if (!disposed) onLost()
  }
  canvas.addEventListener('webglcontextlost', lost)

  return {
    async load(url: string) {
      const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(url)
      if (disposed) return release(gltf.scene)
      // Compiled first, so the box doesn't freeze halfway through opening.
      await renderer.compileAsync(gltf.scene, camera, scene)
      if (disposed) return release(gltf.scene)
      holder.add(gltf.scene)
      const clip = gltf.animations[0]
      if (clip && !reducedMotion) {
        mixer = new THREE.AnimationMixer(gltf.scene)
        mixer.clipAction(clip).play()
      }
    },

    open() {
      openedAt ??= time
    },

    /** Radians around the model, and up or down. */
    turn(across: number, up: number) {
      if (!controls.enabled) return
      controls.autoRotate = false
      const spot = new THREE.Spherical().setFromVector3(camera.position)
      spot.theta += across
      spot.phi -= up
      spot.makeSafe()
      camera.position.setFromSpherical(spot)
    },

    zoom(factor: number) {
      camera.position.setLength(THREE.MathUtils.clamp(camera.position.length() * factor, controls.minDistance, controls.maxDistance))
    },

    reset,

    dispose() {
      disposed = true
      renderer.setAnimationLoop(null)
      canvas.removeEventListener('webglcontextlost', lost)
      observer.disconnect()
      controls.dispose()
      release(scene)
      environment.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
      canvas.remove()
    },
  }
}
