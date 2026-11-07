import * as THREE from "three";

/** Camera offset that keeps the court clear of the two card columns. */
export function courtCameraOffset(width: number, height: number, fov: number) {
  const cardHeight = Math.min(250, Math.max(40, (height - 142) / 2), width * 0.22 / 0.8);
  const safeWidth = Math.max(40, width - 2 * (cardHeight * 0.8 + 36));
  const safeHeight = Math.max(40, height - 220);
  const tangent = Math.tan(THREE.MathUtils.degToRad(fov / 2));
  const direction = new THREE.Vector3(0, 15, 19).normalize();
  const up = new THREE.Vector3(0, direction.z, -direction.y);
  let distance = 24;
  for (const x of [-11, 11]) for (const y of [0, 3]) for (const z of [-5.5, 5.5]) {
    const corner = new THREE.Vector3(x, y, z);
    distance = Math.max(distance, corner.dot(direction) + Math.max(
      Math.abs(x) / (tangent * (width / height) * safeWidth / width),
      Math.abs(corner.dot(up)) / (tangent * safeHeight / height),
    ));
  }
  return direction.multiplyScalar(distance);
}
