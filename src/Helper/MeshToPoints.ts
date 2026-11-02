import * as THREE from 'three'

export function randomPointsInside(_geometry: THREE.BufferGeometry, count: number, ordered: boolean = false, spacing: number = 0.2) {
  console.log("Calling the function")
  const geometry = (_geometry as THREE.BufferGeometry)

  geometry.computeBoundingBox();
  const box = geometry.boundingBox

  //Double Side so the ray also register hits on back faces (existing mesh)
  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })
  )

  const raycaster = new THREE.Raycaster()

  //A slightly odd direction avoids hitting edges/vertices Exactlya
  const dir = new THREE.Vector3(1, 0.7, 0.21).normalize()
  const p = new THREE.Vector3()
  const points = []

  const isInside = (pt: THREE.Vector3) => {
    raycaster.set(pt, dir)
    return raycaster.intersectObject(mesh, false).length % 2 === 1
  }

  if (ordered) {
    const candidates: THREE.Vector3[] = []

    // Single flat layer in XZ through the middle of the shape — no stacking in y
    const y = (box.min.y + box.max.y) / 2

    for (let x = box.min.x + spacing / 2; x <= box.max.x; x += spacing) {
      for (let z = box.min.z + spacing / 2; z <= box.max.z; z += spacing) {
        p.set(x, y, z)
        if (isInside(p)) candidates.push(p.clone())
      }
    }

    // Pick evenly across the whole grid instead of the first `count` (bottom layers)
    if (candidates.length > count) {
      const stride = candidates.length / count
      for (let i = 0; i < count; i++) points.push(candidates[Math.floor(i * stride)])
    } else {
      points.push(...candidates)
    }
    const remaining = count - points.length

    if (remaining > 0) {
      const { min, max } = box

      const corners = Array.from({ length: 8 }, (_, i) =>
        new THREE.Vector3(
          i & 1 ? max.x : min.x,
          i & 2 ? max.y : min.y,
          i & 4 ? max.z : min.z
        )
      )

      // An edge connects two corners that differ on exactly one axis
      const edges: [THREE.Vector3, THREE.Vector3][] = []
      corners.forEach((corner, i) => {
        for (const bit of [1, 2, 4]) {
          if (!(i & bit)) edges.push([corner, corners[i | bit]])
        }
      })

      const total = edges.reduce((sum, [a, b]) => sum + a.distanceTo(b), 0)
      const step = total / remaining

      let d = step / 2
      for (const [a, b] of edges) {
        const len = a.distanceTo(b)
        while (d < len && points.length < count) {
          points.push(a.clone().lerp(b, d / len))
          d += step
        }
        d -= len
      }
    }
  } else {
    let tries = 0;
    const maxTries = count * 200

    while (points.length < count && tries < maxTries) {
      tries++
      p.set(
        THREE.MathUtils.lerp(box.min.x, box.max.x, Math.random()),
        THREE.MathUtils.lerp(box.min.y, box.max.y, Math.random()),
        THREE.MathUtils.lerp(box.min.z, box.max.z, Math.random())
      )

      if (isInside(p)) points.push(p.clone())
    }
  }

  mesh.updateMatrixWorld()
  points.forEach(pt => pt.applyMatrix4(mesh.matrixWorld))

  return points
}
