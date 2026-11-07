import { expect, it } from "vitest";
import * as THREE from "three";
import { courtCameraOffset } from "./court-layout";

it.each([[1640, 1016], [1440, 812], [1024, 680], [390, 756], [844, 302]])(
  "keeps the court and balls between the cards at %i × %i",
  (width, height) => {
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 250);
    camera.position.copy(courtCameraOffset(width, height, camera.fov));
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();
    const cardHeight = Math.min(250, Math.max(40, (height - 142) / 2), width * 0.22 / 0.8);
    const inset = cardHeight * 0.8 + 36;
    for (const x of [-11, 11]) for (const y of [0, 3]) for (const z of [-5.5, 5.5]) {
      const projected = new THREE.Vector3(x, y, z).project(camera);
      const screenX = (projected.x + 1) * width / 2;
      const screenY = (1 - projected.y) * height / 2;
      expect(screenX).toBeGreaterThanOrEqual(inset - 0.001);
      expect(screenX).toBeLessThanOrEqual(width - inset + 0.001);
      expect(screenY).toBeGreaterThanOrEqual(110 - 0.001);
      expect(screenY).toBeLessThanOrEqual(height - 110 + 0.001);
      expect(projected.z).toBeLessThan(1);
    }
  },
);
