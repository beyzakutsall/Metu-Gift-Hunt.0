import * as THREE from 'three'

const COUNT = 140
const SECONDS = 2.2
const COLORS = ['#c5432f', '#f6c453', '#8fc7a6', '#cfc0ee', '#a9d5e5', '#f9d3c9']

export function createConfetti() {
  const mesh = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(0.07, 0.11),
    new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }),
    COUNT,
  )
  mesh.visible = false
  mesh.frustumCulled = false

  const velocities = Array.from({ length: COUNT }, (_, index) => {
    mesh.setColorAt(index, new THREE.Color(COLORS[index % COLORS.length]))
    const angle = Math.random() * Math.PI * 2
    const speed = 0.5 + Math.random() * 1.4
    return new THREE.Vector3(Math.cos(angle) * speed, 1.5 + Math.random() * 2.2, Math.sin(angle) * speed)
  })
  const piece = new THREE.Object3D()

  return {
    mesh,
    /** `time` is seconds since the burst. */
    update(time: number) {
      mesh.visible = time >= 0 && time < SECONDS
      if (!mesh.visible) return
      velocities.forEach((velocity, index) => {
        piece.position.copy(velocity).multiplyScalar(time)
        piece.position.y -= 2.4 * time * time
        piece.rotation.set(time * velocity.x * 5 + index, time * velocity.z * 4, time * 3)
        piece.scale.setScalar(Math.min(1, (SECONDS - time) * 2))
        piece.updateMatrix()
        mesh.setMatrixAt(index, piece.matrix)
      })
      mesh.instanceMatrix.needsUpdate = true
    },
  }
}
