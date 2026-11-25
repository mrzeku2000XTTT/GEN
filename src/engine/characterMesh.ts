import * as THREE from 'three';
import { NpcAppearance, NpcGesture } from '../sim/types';

export interface HumanoidRig {
  root: THREE.Group;
  bodyGroup: THREE.Group;
  headGroup: THREE.Group;
  mouthMesh: THREE.Mesh;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  accentMeshes: THREE.Mesh[];
  stridePhase: number;
  lastX: number;
  lastZ: number;
}

// Shared reusable geometries to keep draw calls & memory lean
let sharedGeos: {
  pelvis: THREE.BoxGeometry;
  torso: THREE.BoxGeometry;
  collar: THREE.CylinderGeometry;
  neck: THREE.CylinderGeometry;
  head: THREE.SphereGeometry;
  hair: THREE.SphereGeometry;
  eye: THREE.SphereGeometry;
  mouth: THREE.BoxGeometry;
  upperArm: THREE.CylinderGeometry;
  forearm: THREE.CylinderGeometry;
  hand: THREE.SphereGeometry;
  thigh: THREE.CylinderGeometry;
  calf: THREE.CylinderGeometry;
  shoe: THREE.BoxGeometry;
  apron: THREE.BoxGeometry;
  satchel: THREE.BoxGeometry;
  badge: THREE.BoxGeometry;
  shadowDisc: THREE.CircleGeometry;
} | null = null;

function getSharedHumanGeometries() {
  if (sharedGeos) return sharedGeos;
  sharedGeos = {
    pelvis: new THREE.BoxGeometry(0.34, 0.16, 0.22),
    torso: new THREE.BoxGeometry(0.42, 0.52, 0.24),
    collar: new THREE.CylinderGeometry(0.11, 0.14, 0.06, 12),
    neck: new THREE.CylinderGeometry(0.055, 0.065, 0.1, 10),
    head: new THREE.SphereGeometry(0.135, 16, 14),
    hair: new THREE.SphereGeometry(0.144, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.58),
    eye: new THREE.SphereGeometry(0.017, 8, 8),
    mouth: new THREE.BoxGeometry(0.055, 0.012, 0.01),
    upperArm: new THREE.CylinderGeometry(0.055, 0.048, 0.28, 10),
    forearm: new THREE.CylinderGeometry(0.046, 0.038, 0.26, 10),
    hand: new THREE.SphereGeometry(0.042, 10, 8),
    thigh: new THREE.CylinderGeometry(0.075, 0.062, 0.42, 10),
    calf: new THREE.CylinderGeometry(0.06, 0.046, 0.4, 10),
    shoe: new THREE.BoxGeometry(0.11, 0.07, 0.24),
    apron: new THREE.BoxGeometry(0.36, 0.48, 0.03),
    satchel: new THREE.BoxGeometry(0.1, 0.22, 0.26),
    badge: new THREE.BoxGeometry(0.07, 0.09, 0.015),
    shadowDisc: new THREE.CircleGeometry(0.44, 20),
  };
  return sharedGeos;
}

export function createHumanoidMesh(
  appearance: NpcAppearance,
  contactShadowTex: THREE.Texture,
  isPlayer = false,
  playerAccentHex?: number
): HumanoidRig {
  const g = getSharedHumanGeometries();
  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const skinMat = new THREE.MeshStandardMaterial({
    color: appearance.skinHex,
    roughness: 0.65,
    metalness: 0.02,
  });
  const hairMat = new THREE.MeshStandardMaterial({
    color: appearance.hairHex,
    roughness: 0.85,
    metalness: 0.05,
  });
  const jacketMat = new THREE.MeshStandardMaterial({
    color: appearance.jacketHex,
    roughness: 0.78,
    metalness: 0.08,
  });
  const pantsMat = new THREE.MeshStandardMaterial({
    color: appearance.pantsHex,
    roughness: 0.82,
    metalness: 0.04,
  });
  const shoeMat = new THREE.MeshStandardMaterial({
    color: 0x1e2024,
    roughness: 0.45,
    metalness: 0.15,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: playerAccentHex ?? appearance.accentHex,
    roughness: isPlayer ? 0.28 : 0.55,
    metalness: isPlayer ? 0.55 : 0.15,
    emissive: isPlayer && playerAccentHex ? new THREE.Color(playerAccentHex) : new THREE.Color(0x000000),
    emissiveIntensity: isPlayer ? 0.35 : 0,
  });
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x16181c, roughness: 0.2 });
  const mouthMat = new THREE.MeshStandardMaterial({ color: 0x7c463d, roughness: 0.6 });

  const accentMeshes: THREE.Mesh[] = [];

  // Ground contact shadow disc (bottom-center pivot y = 0.015)
  const shadowMat = new THREE.MeshBasicMaterial({
    map: contactShadowTex,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
  });
  const shadow = new THREE.Mesh(g.shadowDisc, shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.015;
  root.add(shadow);

  // Legs (hip pivot at y = 0.86)
  const buildLeg = (side: -1 | 1) => {
    const hip = new THREE.Group();
    hip.position.set(side * 0.1, 0.86, 0);

    const thigh = new THREE.Mesh(g.thigh, pantsMat);
    thigh.position.y = -0.21;
    thigh.castShadow = true;
    hip.add(thigh);

    const calf = new THREE.Mesh(g.calf, pantsMat);
    calf.position.y = -0.61;
    calf.castShadow = true;
    hip.add(calf);

    const shoe = new THREE.Mesh(g.shoe, shoeMat);
    shoe.position.set(0, -0.825, 0.05);
    shoe.castShadow = true;
    hip.add(shoe);

    return hip;
  };

  const leftLeg = buildLeg(-1);
  const rightLeg = buildLeg(1);
  bodyGroup.add(leftLeg, rightLeg);

  // Pelvis & Torso
  const pelvis = new THREE.Mesh(g.pelvis, pantsMat);
  pelvis.position.y = 0.9;
  pelvis.castShadow = true;
  bodyGroup.add(pelvis);

  const torso = new THREE.Mesh(g.torso, jacketMat);
  torso.position.y = 1.22;
  torso.castShadow = true;
  torso.receiveShadow = true;
  bodyGroup.add(torso);

  // Collar accent trim
  const collar = new THREE.Mesh(g.collar, accentMat);
  collar.position.y = 1.49;
  bodyGroup.add(collar);
  accentMeshes.push(collar);

  // Accessories for distinct human silhouettes
  if (appearance.accessory === 'apron') {
    const apron = new THREE.Mesh(g.apron, accentMat);
    apron.position.set(0, 1.04, 0.13);
    bodyGroup.add(apron);
  } else if (appearance.accessory === 'satchel') {
    const satchel = new THREE.Mesh(g.satchel, accentMat);
    satchel.position.set(0.24, 0.96, 0.02);
    bodyGroup.add(satchel);
  } else if (appearance.accessory === 'badge') {
    const badge = new THREE.Mesh(g.badge, accentMat);
    badge.position.set(-0.11, 1.32, 0.128);
    bodyGroup.add(badge);
  } else if (appearance.accessory === 'coat') {
    const coatSkirt = new THREE.Mesh(new THREE.BoxGeometry(0.43, 0.34, 0.25), jacketMat);
    coatSkirt.position.set(0, 0.78, 0);
    bodyGroup.add(coatSkirt);
  }

  // Arms (shoulder pivot at y = 1.42)
  const buildArm = (side: -1 | 1) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.27, 1.42, 0);

    const upper = new THREE.Mesh(g.upperArm, jacketMat);
    upper.position.y = -0.14;
    upper.castShadow = true;
    shoulder.add(upper);

    const lower = new THREE.Mesh(g.forearm, isPlayer ? accentMat : jacketMat);
    lower.position.y = -0.4;
    lower.castShadow = true;
    shoulder.add(lower);
    if (isPlayer) accentMeshes.push(lower);

    const hand = new THREE.Mesh(g.hand, skinMat);
    hand.position.y = -0.55;
    shoulder.add(hand);

    return shoulder;
  };

  const leftArm = buildArm(-1);
  const rightArm = buildArm(1);
  bodyGroup.add(leftArm, rightArm);

  // Head & facial expression group
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.52, 0);
  bodyGroup.add(headGroup);

  const neck = new THREE.Mesh(g.neck, skinMat);
  neck.position.y = 0.04;
  headGroup.add(neck);

  const head = new THREE.Mesh(g.head, skinMat);
  head.position.y = 0.19;
  head.castShadow = true;
  headGroup.add(head);

  const hair = new THREE.Mesh(g.hair, hairMat);
  hair.position.set(0, 0.205, -0.01);
  hair.rotation.x = -0.15;
  headGroup.add(hair);

  const leftEye = new THREE.Mesh(g.eye, eyeMat);
  leftEye.position.set(-0.045, 0.2, 0.12);
  const rightEye = new THREE.Mesh(g.eye, eyeMat);
  rightEye.position.set(0.045, 0.2, 0.12);
  headGroup.add(leftEye, rightEye);

  const mouthMesh = new THREE.Mesh(g.mouth, mouthMat);
  mouthMesh.position.set(0, 0.135, 0.122);
  headGroup.add(mouthMesh);

  bodyGroup.scale.setScalar(appearance.heightScale);

  return {
    root,
    bodyGroup,
    headGroup,
    mouthMesh,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    accentMeshes,
    stridePhase: 0,
    lastX: 0,
    lastZ: 0,
  };
}

export function updatePlayerOriginAccent(rig: HumanoidRig, trimHex: number): void {
  for (const mesh of rig.accentMeshes) {
    const mat = mesh.material as THREE.MeshStandardMaterial;
    mat.color.setHex(trimHex);
    mat.emissive.setHex(trimHex);
  }
}

export function animateHumanoidRig(
  rig: HumanoidRig,
  dt: number,
  elapsed: number,
  distanceMoved: number,
  gesture: NpcGesture = 'idle',
  isSpeaking = false,
  squashScaleY = 1
): void {
  const isMoving = distanceMoved > 0.002;
  if (isMoving) {
    rig.stridePhase += distanceMoved * 2.85;
  }

  const walkSwing = isMoving ? Math.sin(rig.stridePhase) * 0.58 : 0;
  const damp = 1 - Math.exp(-12 * dt);

  // Legs
  rig.leftLeg.rotation.x = THREE.MathUtils.lerp(rig.leftLeg.rotation.x, walkSwing, damp);
  rig.rightLeg.rotation.x = THREE.MathUtils.lerp(rig.rightLeg.rotation.x, -walkSwing, damp);

  // Arms (stride vs contextual gesture)
  let targetLeftArmX = -walkSwing * 0.72;
  let targetRightArmX = walkSwing * 0.72;
  let targetRightArmZ = 0.06;
  let targetHeadX = Math.sin(elapsed * 1.4) * 0.03;

  if (!isMoving) {
    if (gesture === 'wave') {
      targetRightArmX = -2.25;
      targetRightArmZ = 0.45 + Math.sin(elapsed * 7.5) * 0.25;
    } else if (gesture === 'explain') {
      targetLeftArmX = -0.65 + Math.sin(elapsed * 4.0) * 0.15;
      targetRightArmX = -0.75 + Math.cos(elapsed * 4.2) * 0.18;
    } else if (gesture === 'nod') {
      targetHeadX = Math.sin(elapsed * 6.5) * 0.18;
    } else if (gesture === 'laugh') {
      targetHeadX = -0.12 + Math.sin(elapsed * 9) * 0.08;
    } else if (gesture === 'shrug') {
      targetLeftArmX = -0.4;
      targetRightArmX = -0.4;
      targetRightArmZ = 0.28;
    }
  }

  rig.leftArm.rotation.x = THREE.MathUtils.lerp(rig.leftArm.rotation.x, targetLeftArmX, damp);
  rig.rightArm.rotation.x = THREE.MathUtils.lerp(rig.rightArm.rotation.x, targetRightArmX, damp);
  rig.rightArm.rotation.z = THREE.MathUtils.lerp(rig.rightArm.rotation.z, targetRightArmZ, damp);
  rig.headGroup.rotation.x = THREE.MathUtils.lerp(rig.headGroup.rotation.x, targetHeadX, damp);

  // Subtle gait bob + breathing
  const gaitBob = isMoving ? Math.abs(Math.sin(rig.stridePhase)) * 0.045 : Math.sin(elapsed * 2.1) * 0.01;
  rig.bodyGroup.position.y = THREE.MathUtils.lerp(rig.bodyGroup.position.y, gaitBob, damp);

  // Squash & stretch on jump/landing
  const invXZ = 1 / Math.sqrt(Math.max(0.65, squashScaleY));
  const baseScale = rig.bodyGroup.userData.baseScale ?? rig.bodyGroup.scale.y;
  if (!rig.bodyGroup.userData.baseScale) {
    rig.bodyGroup.userData.baseScale = baseScale;
  }
  rig.bodyGroup.scale.set(baseScale * invXZ, baseScale * squashScaleY, baseScale * invXZ);

  // Lip-sync mouth animation during active dialogue
  const targetMouthScaleY = isSpeaking ? 1.0 + Math.abs(Math.sin(elapsed * 18)) * 2.2 : 1.0;
  rig.mouthMesh.scale.y = THREE.MathUtils.lerp(rig.mouthMesh.scale.y, targetMouthScaleY, 0.35);
}
