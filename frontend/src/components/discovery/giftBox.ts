import * as THREE from 'three'

/** The wrapped gift, drawn in code so there is nothing to download before it shows. */
export function createGiftBox() {
  const paper = new THREE.MeshStandardMaterial({ color: '#c5432f', roughness: 0.55 })
  const ribbon = new THREE.MeshStandardMaterial({ color: '#f6c453', roughness: 0.3, metalness: 0.15 })

  function box(parent: THREE.Object3D, size: [number, number, number], y: number, material: THREE.Material) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material)
    mesh.position.y = y
    parent.add(mesh)
  }

  const group = new THREE.Group()
  box(group, [1, 0.78, 1], -0.17, paper)
  box(group, [0.2, 0.8, 1.02], -0.17, ribbon)
  box(group, [1.02, 0.8, 0.2], -0.17, ribbon)

  const lid = new THREE.Group()
  lid.position.y = 0.33
  box(lid, [1.14, 0.24, 1.14], 0, paper)
  box(lid, [0.22, 0.26, 1.16], 0, ribbon)
  box(lid, [1.16, 0.26, 0.22], 0, ribbon)
  for (const side of [-1, 1]) {
    const loop = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.06, 12, 28), ribbon)
    loop.position.set(side * 0.18, 0.24, 0)
    loop.rotation.z = side * 0.35
    loop.scale.y = 0.65
    lid.add(loop)
  }
  group.add(lid)

  return { group, lid }
}
