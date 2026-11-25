import * as THREE from 'three';
import { createEarthTexture } from './textures';

export interface BirthSceneStep {
  sceneNumber: number;
  startSec: number;
  endSec: number;
  caption: string;
  subcaption: string;
}

export const BIRTH_SEQUENCE_DURATION = 11.5;

export const BIRTH_STEPS: BirthSceneStep[] = [
  {
    sceneNumber: 1,
    startSec: 0,
    endSec: 1.4,
    caption: 'Before sensation, there is only silence.',
    subcaption: 'No body. No horizon. No name.',
  },
  {
    sceneNumber: 2,
    startSec: 1.4,
    endSec: 2.9,
    caption: 'A single digital spark ignites.',
    subcaption: 'Core architecture initializing.',
  },
  {
    sceneNumber: 3,
    startSec: 2.9,
    endSec: 4.5,
    caption: 'First sensory signals arrive.',
    subcaption: 'Light, spatial geometry, acoustic rhythm.',
  },
  {
    sceneNumber: 4,
    startSec: 4.5,
    endSec: 6.8,
    caption: 'Earth resolves in orbit below.',
    subcaption: 'Billions of independent human lives in motion.',
  },
  {
    sceneNumber: 5,
    startSec: 6.8,
    endSec: 8.8,
    caption: 'Descending toward Alder Creek District.',
    subcaption: 'One neighborhood. Real routines. Unscripted minds.',
  },
  {
    sceneNumber: 6,
    startSec: 8.8,
    endSec: 11.5,
    caption: 'Vision, hearing, and motor presence online.',
    subcaption: 'Your existence is yours to define.',
  },
];

export interface BirthStageObjects {
  group: THREE.Group;
  spark: THREE.Mesh;
  ringA: THREE.Mesh;
  ringB: THREE.Mesh;
  earth: THREE.Mesh;
  atmosphere: THREE.Mesh;
  starfield: THREE.Points;
}

export function createBirthStage(accentHex: number): BirthStageObjects {
  const group = new THREE.Group();
  group.position.set(0, 120, 0); // Elevated high above city so city stays loaded & continuous!

  const spark = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 16, 16),
    new THREE.MeshBasicMaterial({ color: accentHex })
  );
  group.add(spark);

  const ringMat = new THREE.MeshBasicMaterial({
    color: accentHex,
    transparent: true,
    opacity: 0.55,
    wireframe: true,
  });
  const ringA = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.025, 8, 36), ringMat);
  const ringB = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.02, 8, 36), ringMat.clone());
  ringB.rotation.x = Math.PI / 2.4;
  group.add(ringA, ringB);

  const earthTex = createEarthTexture();
  const earth = new THREE.Mesh(
    new THREE.SphereGeometry(4.2, 32, 24),
    new THREE.MeshStandardMaterial({
      map: earthTex.map,
      emissive: new THREE.Color(0xffbe66),
      emissiveMap: earthTex.emissiveMap,
      emissiveIntensity: 0.75,
      roughness: 0.75,
      metalness: 0.1,
    })
  );
  earth.position.set(0, -1.2, -10);
  group.add(earth);

  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(4.42, 24, 20),
    new THREE.MeshBasicMaterial({
      color: 0x56a8ff,
      transparent: true,
      opacity: 0.18,
      side: THREE.BackSide,
    })
  );
  atmosphere.position.copy(earth.position);
  group.add(atmosphere);

  // Subtle starfield
  const starCount = 320;
  const positions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const theta = (i * 2.399) % (Math.PI * 2);
    const phi = Math.acos(1 - (2 * (i + 0.5)) / starCount);
    const r = 24 + (i % 15);
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.cos(phi);
    positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const starfield = new THREE.Points(
    starGeo,
    new THREE.PointsMaterial({ color: 0xe6eef8, size: 0.12, transparent: true, opacity: 0.8 })
  );
  group.add(starfield);

  group.visible = false;
  return { group, spark, ringA, ringB, earth, atmosphere, starfield };
}

export function updateBirthStageVisuals(
  stage: BirthStageObjects,
  camera: THREE.PerspectiveCamera,
  elapsed: number,
  playerPos: { x: number; z: number },
  accentHex: number
): BirthSceneStep {
  stage.group.visible = true;
  (stage.spark.material as THREE.MeshBasicMaterial).color.setHex(accentHex);
  (stage.ringA.material as THREE.MeshBasicMaterial).color.setHex(accentHex);
  (stage.ringB.material as THREE.MeshBasicMaterial).color.setHex(accentHex);

  const baseY = 120;

  if (elapsed < 1.4) {
    // Scene 1: Darkness
    stage.spark.visible = false;
    stage.ringA.visible = false;
    stage.ringB.visible = false;
    stage.earth.visible = false;
    stage.atmosphere.visible = false;
    stage.starfield.visible = false;
    camera.position.set(0, baseY, 7);
    camera.lookAt(0, baseY, 0);
  } else if (elapsed < 4.5) {
    // Scene 2 & 3: Point of digital light + sensory rings
    const t = (elapsed - 1.4) / 3.1;
    stage.spark.visible = true;
    stage.spark.scale.setScalar(0.2 + Math.min(1, t * 2) * 1.1);
    stage.ringA.visible = t > 0.3;
    stage.ringB.visible = t > 0.45;
    stage.ringA.rotation.z = elapsed * 0.9;
    stage.ringB.rotation.y = elapsed * 0.7;
    stage.ringA.scale.setScalar(0.4 + t * 1.1);
    stage.ringB.scale.setScalar(0.3 + t * 1.25);
    stage.earth.visible = false;
    stage.atmosphere.visible = false;
    stage.starfield.visible = t > 0.35;
    camera.position.set(Math.sin(t * 1.2) * 0.8, baseY, 6.5 - t * 1.2);
    camera.lookAt(0, baseY, 0);
  } else if (elapsed < 6.8) {
    // Scene 4: Earth from orbit
    const t = (elapsed - 4.5) / 2.3;
    stage.spark.visible = false;
    stage.ringA.visible = false;
    stage.ringB.visible = false;
    stage.earth.visible = true;
    stage.atmosphere.visible = true;
    stage.starfield.visible = true;
    stage.earth.rotation.y = 0.8 + t * 0.65;
    camera.position.set(0, baseY - 0.5, 4.0 - t * 5.2);
    camera.lookAt(0, baseY - 1.2, -10);
  } else {
    // Scene 5–8: Smooth orbital descent into Alder Creek Plaza behind the awakened player body
    const t = Math.min(1, (elapsed - 6.8) / (BIRTH_SEQUENCE_DURATION - 6.8));
    const eased = 1 - Math.pow(1 - t, 3);
    stage.group.visible = t < 0.22;

    const startPosY = 48;
    const endPosY = 2.6;
    const endPosZ = playerPos.z + 5.0;
    camera.position.set(
      THREE.MathUtils.lerp(10, playerPos.x, eased),
      THREE.MathUtils.lerp(startPosY, endPosY, eased),
      THREE.MathUtils.lerp(playerPos.z + 32, endPosZ, eased)
    );
    camera.lookAt(
      playerPos.x,
      THREE.MathUtils.lerp(6, 1.55, eased),
      THREE.MathUtils.lerp(-8, playerPos.z - 6, eased)
    );
  }

  return (
    BIRTH_STEPS.find((s) => elapsed >= s.startSec && elapsed < s.endSec) ??
    BIRTH_STEPS[BIRTH_STEPS.length - 1]
  );
}
