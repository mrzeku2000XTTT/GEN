import * as THREE from 'three';
import { BUILDINGS } from '../sim/worldLayout';
import {
  createAsphaltTextures,
  createBuildingFacadeTextures,
  createGrassTexture,
  createSidewalkTextures,
  createSignTexture,
} from './textures';

export interface TrafficVehicle {
  mesh: THREE.Group;
  laneRadius: number;
  angle: number;
  speed: number;
  direction: 1 | -1;
}

export interface CityEnvironmentHandles {
  cityGroup: THREE.Group;
  emissiveWindowMaterials: THREE.MeshStandardMaterial[];
  lampBulbMaterials: THREE.MeshStandardMaterial[];
  lampLights: THREE.PointLight[];
  fountainWater: THREE.Mesh;
  clockHands: { hourHand: THREE.Mesh; minuteHand: THREE.Mesh };
  vehicles: TrafficVehicle[];
  environmentMeshes: THREE.Object3D[];
}

export function buildAlderCreekCity(
  scene: THREE.Scene,
  maxAnisotropy: number,
  isSoftwareGl: boolean
): CityEnvironmentHandles {
  const cityGroup = new THREE.Group();
  scene.add(cityGroup);

  const emissiveWindowMaterials: THREE.MeshStandardMaterial[] = [];
  const lampBulbMaterials: THREE.MeshStandardMaterial[] = [];
  const lampLights: THREE.PointLight[] = [];
  const environmentMeshes: THREE.Object3D[] = [];

  // 1. Extended natural ground plane (no boxed void!)
  const grassTex = createGrassTexture(maxAnisotropy);
  const groundMat = new THREE.MeshStandardMaterial({
    map: grassTex,
    color: 0xffffff,
    roughness: 0.92,
    metalness: 0.0,
  });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(380, 380), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0;
  ground.receiveShadow = true;
  cityGroup.add(ground);

  // 2. Asphalt avenue network (y = 0.025 to prevent coplanar Z-fighting)
  const asphalt = createAsphaltTextures(maxAnisotropy);
  const roadMatNS = new THREE.MeshStandardMaterial({
    map: asphalt.map.clone(),
    bumpMap: asphalt.bumpMap.clone(),
    bumpScale: 0.03,
    color: 0xffffff,
    roughness: 0.84,
    metalness: 0.05,
  });
  roadMatNS.map!.repeat.set(1, 14);
  roadMatNS.map!.needsUpdate = true;

  const roadMatEW = new THREE.MeshStandardMaterial({
    map: asphalt.map.clone(),
    bumpMap: asphalt.bumpMap.clone(),
    bumpScale: 0.03,
    color: 0xffffff,
    roughness: 0.84,
    metalness: 0.05,
  });
  roadMatEW.map!.rotation = Math.PI / 2;
  roadMatEW.map!.repeat.set(1, 14);
  roadMatEW.map!.needsUpdate = true;

  // Perimeter ring avenue & main cross-streets
  const addRoad = (x: number, z: number, w: number, d: number, isEW = false) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.05, d), isEW ? roadMatEW : roadMatNS);
    m.position.set(x, 0.025, z);
    m.receiveShadow = true;
    cityGroup.add(m);
  };

  // Perimeter boulevard loop around the district (at ±45m)
  addRoad(-45, 0, 8.5, 98, false);
  addRoad(45, 0, 8.5, 98, false);
  addRoad(0, -45, 98, 8.5, true);
  addRoad(0, 45, 98, 8.5, true);
  // Inner neighborhood streets framing Central Park
  addRoad(-12, 0, 5.2, 82, false);
  addRoad(12, 0, 5.2, 82, false);
  addRoad(0, 22, 84, 5.2, true);
  addRoad(0, -24, 84, 5.2, true);

  // 3. Raised stone sidewalks & Central Park Plaza walkways (y = 0.06)
  const sidewalk = createSidewalkTextures(maxAnisotropy);
  const sidewalkMat = new THREE.MeshStandardMaterial({
    map: sidewalk.map,
    bumpMap: sidewalk.bumpMap,
    bumpScale: 0.02,
    color: 0xffffff,
    roughness: 0.86,
    metalness: 0.02,
  });
  sidewalk.map.repeat.set(6, 6);

  const plazaSlab = new THREE.Mesh(new THREE.BoxGeometry(19, 0.08, 42), sidewalkMat);
  plazaSlab.position.set(0, 0.04, -1);
  plazaSlab.receiveShadow = true;
  cityGroup.add(plazaSlab);

  // Central Park Lawn Islands (y = 0.095)
  const parkLawnMat = new THREE.MeshStandardMaterial({
    map: grassTex,
    color: 0xdff0d8,
    roughness: 0.9,
  });
  const addLawnBed = (x: number, z: number, w: number, d: number) => {
    const curb = new THREE.Mesh(
      new THREE.BoxGeometry(w + 0.4, 0.16, d + 0.4),
      new THREE.MeshStandardMaterial({ color: 0x9b9589, roughness: 0.85 })
    );
    curb.position.set(x, 0.08, z);
    curb.receiveShadow = true;
    cityGroup.add(curb);

    const lawn = new THREE.Mesh(new THREE.BoxGeometry(w, 0.12, d), parkLawnMat);
    lawn.position.set(x, 0.11, z);
    lawn.receiveShadow = true;
    cityGroup.add(lawn);
  };
  addLawnBed(-5.8, 6.2, 5.0, 9.5);
  addLawnBed(5.8, 6.2, 5.0, 9.5);
  addLawnBed(-5.8, -8.5, 5.0, 8.0);
  addLawnBed(5.8, -8.5, 5.0, 8.0);

  // Sidewalk aprons around buildings
  for (const b of BUILDINGS) {
    const pad = new THREE.Mesh(
      new THREE.BoxGeometry(b.width + 4.4, 0.09, b.depth + 4.4),
      sidewalkMat
    );
    pad.position.set(b.x, 0.045, b.z);
    pad.receiveShadow = true;
    cityGroup.add(pad);
  }

  // 4. Central Park Tiered Stone Fountain (composite 6-part structure at 0, -2.5)
  const fountainGroup = new THREE.Group();
  fountainGroup.position.set(0, 0.08, -2.5);
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0xb7b1a5, roughness: 0.78, metalness: 0.04 });
  const darkStoneMat = new THREE.MeshStandardMaterial({ color: 0x706c64, roughness: 0.82 });

  const basinOuter = new THREE.Mesh(new THREE.CylinderGeometry(2.7, 2.9, 0.65, 16), stoneMat);
  basinOuter.position.y = 0.325;
  basinOuter.castShadow = true;
  basinOuter.receiveShadow = true;
  fountainGroup.add(basinOuter);

  const basinRim = new THREE.Mesh(new THREE.TorusGeometry(2.7, 0.14, 10, 24), darkStoneMat);
  basinRim.rotation.x = Math.PI / 2;
  basinRim.position.y = 0.66;
  fountainGroup.add(basinRim);

  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x3b869e,
    roughness: 0.14,
    metalness: 0.35,
    transparent: true,
    opacity: 0.88,
  });
  const fountainWater = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.5, 0.08, 20), waterMat);
  fountainWater.position.y = 0.56;
  fountainGroup.add(fountainWater);

  const centerPedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.65, 1.5, 12), stoneMat);
  centerPedestal.position.y = 0.85;
  centerPedestal.castShadow = true;
  fountainGroup.add(centerPedestal);

  const upperBowl = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 0.42, 0.36, 16), stoneMat);
  upperBowl.position.y = 1.65;
  upperBowl.castShadow = true;
  fountainGroup.add(upperBowl);

  const spireFinial = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.75, 10), darkStoneMat);
  spireFinial.position.y = 2.15;
  fountainGroup.add(spireFinial);

  cityGroup.add(fountainGroup);
  environmentMeshes.push(basinOuter);

  // 5. Tall Architectural Landmark: Alder Creek Clock Spire (0, -15) framed in initial spawn camera!
  const spireGroup = new THREE.Group();
  spireGroup.position.set(0, 0.08, -15);
  const bronzeMat = new THREE.MeshStandardMaterial({ color: 0x8c7046, roughness: 0.32, metalness: 0.75 });
  const clockFaceMat = new THREE.MeshStandardMaterial({
    color: 0xf6f0df,
    emissive: 0xffe0a3,
    emissiveIntensity: 0.35,
    roughness: 0.4,
  });
  emissiveWindowMaterials.push(clockFaceMat);

  const plinth = new THREE.Mesh(new THREE.BoxGeometry(4.0, 2.2, 4.0), darkStoneMat);
  plinth.position.y = 1.1;
  plinth.castShadow = true;
  plinth.receiveShadow = true;
  spireGroup.add(plinth);

  const towerShaft = new THREE.Mesh(new THREE.BoxGeometry(2.8, 9.2, 2.8), stoneMat);
  towerShaft.position.y = 6.8;
  towerShaft.castShadow = true;
  towerShaft.receiveShadow = true;
  spireGroup.add(towerShaft);

  const belfry = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.6, 3.2), bronzeMat);
  belfry.position.y = 12.6;
  belfry.castShadow = true;
  spireGroup.add(belfry);

  // Four glowing clock faces
  const faceGeo = new THREE.CircleGeometry(1.02, 20);
  const faceOffsets: Array<[number, number, number, number]> = [
    [0, 12.6, 1.62, 0],
    [0, 12.6, -1.62, Math.PI],
    [1.62, 12.6, 0, Math.PI / 2],
    [-1.62, 12.6, 0, -Math.PI / 2],
  ];
  for (const [fx, fy, fz, ry] of faceOffsets) {
    const face = new THREE.Mesh(faceGeo, clockFaceMat);
    face.position.set(fx, fy, fz);
    face.rotation.y = ry;
    spireGroup.add(face);
  }

  // Animated south-facing clock hands
  const handMat = new THREE.MeshStandardMaterial({ color: 0x1b1e24, roughness: 0.4 });
  const hourHand = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.52, 0.04), handMat);
  hourHand.position.set(0, 12.6, 1.66);
  const minuteHand = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.78, 0.04), handMat);
  minuteHand.position.set(0, 12.6, 1.68);
  spireGroup.add(hourHand, minuteHand);

  const spireRoof = new THREE.Mesh(new THREE.ConeGeometry(2.3, 4.4, 4), bronzeMat);
  spireRoof.rotation.y = Math.PI / 4;
  spireRoof.position.y = 16.0;
  spireRoof.castShadow = true;
  spireGroup.add(spireRoof);

  const beaconOrb = new THREE.Mesh(
    new THREE.SphereGeometry(0.32, 12, 10),
    new THREE.MeshStandardMaterial({
      color: 0xffd78c,
      emissive: 0xffbe5c,
      emissiveIntensity: 0.9,
      roughness: 0.2,
    })
  );
  beaconOrb.position.y = 18.4;
  spireGroup.add(beaconOrb);

  cityGroup.add(spireGroup);
  environmentMeshes.push(plinth, towerShaft);

  // 6. Build all 8 neighborhood architectural buildings (composite 5–9 parts each)
  for (const b of BUILDINGS) {
    const bGroup = new THREE.Group();
    bGroup.position.set(b.x, 0.09, b.z);
    const totalH = b.floors * 3.6;

    const facade = createBuildingFacadeTextures(b.wallColor, b.trimColor, b.floors, maxAnisotropy);
    const facadeMat = new THREE.MeshStandardMaterial({
      map: facade.map,
      emissive: new THREE.Color(0xffdfa8),
      emissiveMap: facade.emissiveMap,
      emissiveIntensity: 0.08,
      color: 0xffffff,
      roughness: 0.78,
      metalness: 0.08,
    });
    emissiveWindowMaterials.push(facadeMat);

    const trimMat = new THREE.MeshStandardMaterial({
      color: b.trimColor,
      roughness: 0.55,
      metalness: 0.2,
    });
    const roofMat = new THREE.MeshStandardMaterial({
      color: b.roofColor,
      roughness: 0.85,
      metalness: 0.05,
    });
    const accentMat = new THREE.MeshStandardMaterial({
      color: b.accentColor,
      roughness: 0.42,
      metalness: 0.25,
    });

    // Foundation plinth
    const basePlinth = new THREE.Mesh(
      new THREE.BoxGeometry(b.width + 0.4, 0.55, b.depth + 0.4),
      trimMat
    );
    basePlinth.position.y = 0.275;
    basePlinth.receiveShadow = true;
    bGroup.add(basePlinth);

    // Main building body
    const mainBody = new THREE.Mesh(new THREE.BoxGeometry(b.width, totalH, b.depth), facadeMat);
    mainBody.position.y = 0.55 + totalH / 2;
    mainBody.castShadow = true;
    mainBody.receiveShadow = true;
    bGroup.add(mainBody);
    environmentMeshes.push(mainBody);

    // Roof parapet + rooftop HVAC mechanical unit
    const parapet = new THREE.Mesh(
      new THREE.BoxGeometry(b.width + 0.45, 0.5, b.depth + 0.45),
      roofMat
    );
    parapet.position.y = 0.55 + totalH + 0.25;
    parapet.castShadow = true;
    bGroup.add(parapet);

    const hvac = new THREE.Mesh(
      new THREE.BoxGeometry(Math.min(3.5, b.width * 0.25), 1.1, Math.min(2.8, b.depth * 0.25)),
      trimMat
    );
    hvac.position.set(b.width * 0.18, 0.55 + totalH + 0.85, -b.depth * 0.16);
    bGroup.add(hvac);

    // Framed entrance doorway facing entrance coordinates + storefront awning + readable sign plaque
    const localEntX = b.entrance.x - b.x;
    const localEntZ = b.entrance.z - b.z;
    const isEastWestFace = Math.abs(localEntX) > Math.abs(localEntZ);
    const doorSignDirX = isEastWestFace ? Math.sign(localEntX) : 0;
    const doorSignDirZ = isEastWestFace ? 0 : Math.sign(localEntZ);

    const doorX = doorSignDirX * (b.width / 2 + 0.08);
    const doorZ = doorSignDirZ * (b.depth / 2 + 0.08);
    const doorRotY = isEastWestFace
      ? doorSignDirX > 0
        ? Math.PI / 2
        : -Math.PI / 2
      : doorSignDirZ > 0
      ? 0
      : Math.PI;

    const entryGroup = new THREE.Group();
    entryGroup.position.set(doorX, 0, doorZ);
    entryGroup.rotation.y = doorRotY;

    // Door jamb frame + warm lit glass door
    const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(2.7, 3.1, 0.24), trimMat);
    doorFrame.position.y = 1.6;
    entryGroup.add(doorFrame);

    const doorGlass = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 2.75, 0.28),
      new THREE.MeshStandardMaterial({
        color: 0x2a3b47,
        emissive: 0xffd088,
        emissiveIntensity: 0.45,
        roughness: 0.18,
        metalness: 0.2,
      })
    );
    doorGlass.position.y = 1.5;
    entryGroup.add(doorGlass);

    // Cantilevered canopy awning
    const awning = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.22, 1.5), accentMat);
    awning.position.set(0, 3.35, 0.72);
    awning.rotation.x = 0.14;
    awning.castShadow = true;
    entryGroup.add(awning);

    // Readable architectural sign board
    const signTex = createSignTexture(
      b.name,
      b.category.replace('_', ' '),
      b.accentColor,
      maxAnisotropy
    );
    const signBoard = new THREE.Mesh(
      new THREE.BoxGeometry(4.4, 1.05, 0.16),
      new THREE.MeshStandardMaterial({
        map: signTex,
        color: 0xffffff,
        roughness: 0.4,
        metalness: 0.15,
      })
    );
    signBoard.position.set(0, 4.15, 0.16);
    entryGroup.add(signBoard);

    bGroup.add(entryGroup);

    // Coffee Shop outdoor bistro seating vignette
    if (b.id === 'hearth_coffee') {
      const tableMat = new THREE.MeshStandardMaterial({ color: 0x3b2c23, roughness: 0.55 });
      const metalMat = new THREE.MeshStandardMaterial({ color: 0x25282e, roughness: 0.35, metalness: 0.7 });
      for (let t = 0; t < 2; t++) {
        const tz = t === 0 ? -3.0 : 3.0;
        const tbl = new THREE.Group();
        tbl.position.set(-b.width / 2 - 2.1, 0, tz);
        const top = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.08, 12), tableMat);
        top.position.y = 0.78;
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.78, 8), metalMat);
        post.position.y = 0.39;
        tbl.add(top, post);
        bGroup.add(tbl);
      }
    }

    cityGroup.add(bGroup);
  }

  // 7. Park Benches & Streetlamps (composite multi-part props)
  const benchWoodMat = new THREE.MeshStandardMaterial({ color: 0x6e4a31, roughness: 0.76 });
  const ironMat = new THREE.MeshStandardMaterial({ color: 0x252a30, roughness: 0.4, metalness: 0.75 });

  const benchCoords: Array<[number, number, number]> = [
    [-3.6, 4.5, Math.PI / 2],
    [3.6, 4.5, -Math.PI / 2],
    [-3.6, -8.0, Math.PI / 2],
    [3.6, -8.0, -Math.PI / 2],
  ];
  for (const [bx, bz, bry] of benchCoords) {
    const bench = new THREE.Group();
    bench.position.set(bx, 0.08, bz);
    bench.rotation.y = bry;
    const seat = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.1, 0.55), benchWoodMat);
    seat.position.y = 0.48;
    const back = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.42, 0.08), benchWoodMat);
    back.position.set(0, 0.76, -0.24);
    back.rotation.x = -0.15;
    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.48, 0.5), ironMat);
    legL.position.set(-0.85, 0.24, 0);
    const legR = legL.clone();
    legR.position.x = 0.85;
    bench.add(seat, back, legL, legR);
    cityGroup.add(bench);
  }

  const lampCoords: Array<[number, number]> = [
    [-9.2, 12],
    [9.2, 12],
    [-9.2, -2],
    [9.2, -2],
    [-9.2, -16],
    [9.2, -16],
    [-16, 20],
    [16, 20],
  ];

  const lampBulbMat = new THREE.MeshStandardMaterial({
    color: 0xfff3d4,
    emissive: 0xffc875,
    emissiveIntensity: 0.2,
    roughness: 0.2,
  });
  lampBulbMaterials.push(lampBulbMat);

  lampCoords.forEach(([lx, lz], idx) => {
    const lamp = new THREE.Group();
    lamp.position.set(lx, 0.06, lz);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 0.55, 8), ironMat);
    base.position.y = 0.275;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.09, 4.4, 8), ironMat);
    pole.position.y = 2.45;
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.25, 8), ironMat);
    cap.position.y = 4.95;
    const globe = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), lampBulbMat);
    globe.position.y = 4.68;
    lamp.add(base, pole, cap, globe);
    cityGroup.add(lamp);

    // Budget: at most 4 unshadowed PointLights for warm night plaza glow
    if (!isSoftwareGl && idx < 4) {
      const pl = new THREE.PointLight(0xffcb80, 0, 18, 1.8);
      pl.position.set(lx, 4.6, lz);
      cityGroup.add(pl);
      lampLights.push(pl);
    }
  });

  // 8. Instanced Trees (Park & Perimeter Natural Tree Groves — no floating void edge!)
  const treePositions: Array<[number, number, number]> = [
    // Park trees
    [-6.2, 9.2, 1.05],
    [6.2, 9.2, 0.98],
    [-6.0, 2.5, 1.12],
    [6.0, 2.5, 1.02],
    [-6.2, -10.5, 1.08],
    [6.2, -10.5, 0.96],
    [-11.5, 29, 1.1],
    [11.5, 29, 1.0],
    // Perimeter grove ring
  ];
  for (let i = 0; i < 44; i++) {
    const angle = (i / 44) * Math.PI * 2;
    const radius = 56 + (i % 4) * 5.5;
    treePositions.push([
      Math.cos(angle) * radius,
      Math.sin(angle) * radius,
      0.92 + ((i * 19) % 30) / 100,
    ]);
  }

  const trunkGeo = new THREE.CylinderGeometry(0.18, 0.28, 2.6, 8);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4636, roughness: 0.9 });
  const canopyLowGeo = new THREE.DodecahedronGeometry(1.65, 1);
  const canopyTopGeo = new THREE.DodecahedronGeometry(1.15, 1);
  const canopyMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 });

  const trunkInst = new THREE.InstancedMesh(trunkGeo, trunkMat, treePositions.length);
  const canopyLowInst = new THREE.InstancedMesh(canopyLowGeo, canopyMat, treePositions.length);
  const canopyTopInst = new THREE.InstancedMesh(canopyTopGeo, canopyMat, treePositions.length);

  const dummy = new THREE.Object3D();
  const tintColor = new THREE.Color();
  const leafPalette = [0x3d6b43, 0x4b7a4a, 0x355e3c, 0x587f49, 0x456b4a];

  treePositions.forEach(([tx, tz, sc], idx) => {
    dummy.position.set(tx, 1.3 * sc, tz);
    dummy.scale.set(sc, sc, sc);
    dummy.rotation.y = idx * 1.1;
    dummy.updateMatrix();
    trunkInst.setMatrixAt(idx, dummy.matrix);

    dummy.position.set(tx, 3.25 * sc, tz);
    dummy.scale.set(sc * 1.05, sc * 0.95, sc * 1.05);
    dummy.updateMatrix();
    canopyLowInst.setMatrixAt(idx, dummy.matrix);

    dummy.position.set(tx + 0.15 * sc, 4.4 * sc, tz - 0.1 * sc);
    dummy.scale.set(sc * 0.9, sc * 0.88, sc * 0.9);
    dummy.updateMatrix();
    canopyTopInst.setMatrixAt(idx, dummy.matrix);

    tintColor.setHex(leafPalette[idx % leafPalette.length]);
    canopyLowInst.setColorAt(idx, tintColor);
    canopyTopInst.setColorAt(idx, tintColor.clone().multiplyScalar(1.08));
  });

  trunkInst.instanceMatrix.needsUpdate = true;
  canopyLowInst.instanceMatrix.needsUpdate = true;
  canopyTopInst.instanceMatrix.needsUpdate = true;
  if (canopyLowInst.instanceColor) canopyLowInst.instanceColor.needsUpdate = true;
  if (canopyTopInst.instanceColor) canopyTopInst.instanceColor.needsUpdate = true;
  trunkInst.computeBoundingSphere();
  canopyLowInst.computeBoundingSphere();
  canopyTopInst.computeBoundingSphere();
  canopyLowInst.castShadow = true;
  cityGroup.add(trunkInst, canopyLowInst, canopyTopInst);

  // 9. Distant City Skyline Silhouettes (beyond perimeter hills so horizon feels inhabited)
  const skylineMat = new THREE.MeshStandardMaterial({
    color: 0x4e5b6b,
    roughness: 0.85,
    metalness: 0.1,
  });
  const skylineGeo = new THREE.BoxGeometry(1, 1, 1);
  const skylineCount = 26;
  const skylineInst = new THREE.InstancedMesh(skylineGeo, skylineMat, skylineCount);
  for (let i = 0; i < skylineCount; i++) {
    const a = (i / skylineCount) * Math.PI * 2 + 0.12;
    const r = 92 + (i % 3) * 16;
    const h = 14 + ((i * 11) % 28);
    const w = 9 + (i % 6) * 2;
    dummy.position.set(Math.cos(a) * r, h / 2, Math.sin(a) * r);
    dummy.scale.set(w, h, w);
    dummy.rotation.y = a;
    dummy.updateMatrix();
    skylineInst.setMatrixAt(i, dummy.matrix);
  }
  skylineInst.instanceMatrix.needsUpdate = true;
  skylineInst.computeBoundingSphere();
  cityGroup.add(skylineInst);

  // 10. Ambient Moving Electric Vehicles along the Perimeter Avenue Loop (composite 7-part cars)
  const vehicles: TrafficVehicle[] = [];
  const carColors = [0x3d556b, 0x8f4338, 0xd4d0c5, 0x3b6355];
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x1e2b36, roughness: 0.15, metalness: 0.45 });
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x1a1c20, roughness: 0.85 });
  const headMat = new THREE.MeshStandardMaterial({ color: 0xfff6d6, emissive: 0xffe49e, emissiveIntensity: 0.8 });
  const tailMat = new THREE.MeshStandardMaterial({ color: 0xd93838, emissive: 0xd92626, emissiveIntensity: 0.7 });

  for (let i = 0; i < 4; i++) {
    const car = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({
      color: carColors[i],
      roughness: 0.28,
      metalness: 0.45,
    });

    const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.62, 4.1), bodyMat);
    chassis.position.y = 0.56;
    chassis.castShadow = true;
    car.add(chassis);

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.56, 2.05), glassMat);
    cabin.position.set(0, 1.12, -0.15);
    car.add(cabin);

    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.08, 1.8), bodyMat);
    roof.position.set(0, 1.42, -0.15);
    car.add(roof);

    const wheelGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.24, 12);
    const wheelOffsets: Array<[number, number]> = [
      [-0.95, 1.25],
      [0.95, 1.25],
      [-0.95, -1.25],
      [0.95, -1.25],
    ];
    for (const [wx, wz] of wheelOffsets) {
      const w = new THREE.Mesh(wheelGeo, tireMat);
      w.rotation.z = Math.PI / 2;
      w.position.set(wx, 0.34, wz);
      car.add(w);
    }

    const hlL = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.14, 0.08), headMat);
    hlL.position.set(-0.62, 0.62, 2.06);
    const hlR = hlL.clone();
    hlR.position.x = 0.62;
    const tlL = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.14, 0.08), tailMat);
    tlL.position.set(-0.62, 0.62, -2.06);
    const tlR = tlL.clone();
    tlR.position.x = 0.62;
    car.add(hlL, hlR, tlL, tlR);

    cityGroup.add(car);
    vehicles.push({
      mesh: car,
      laneRadius: 45,
      angle: i * (Math.PI / 2),
      speed: 6.5 + i * 0.6,
      direction: i % 2 === 0 ? 1 : -1,
    });
  }

  return {
    cityGroup,
    emissiveWindowMaterials,
    lampBulbMaterials,
    lampLights,
    fountainWater,
    clockHands: { hourHand, minuteHand },
    vehicles,
    environmentMeshes,
  };
}

export function updateTrafficVehicles(vehicles: TrafficVehicle[], dt: number): void {
  // Drive smoothly around the rectangular perimeter boulevard (±45m)
  const perimeter = 4 * 90;
  for (const v of vehicles) {
    v.angle = (v.angle + (v.speed * dt * v.direction) / 45 + Math.PI * 2) % (Math.PI * 2);
    const t = (v.angle / (Math.PI * 2)) * perimeter;
    const laneOffset = v.direction === 1 ? 1.8 : -1.8;
    const R = 45 + laneOffset;

    if (t < 90) {
      v.mesh.position.set(-R + (t / 90) * (2 * R), 0.04, -R);
      v.mesh.rotation.y = v.direction === 1 ? Math.PI / 2 : -Math.PI / 2;
    } else if (t < 180) {
      v.mesh.position.set(R, 0.04, -R + ((t - 90) / 90) * (2 * R));
      v.mesh.rotation.y = v.direction === 1 ? 0 : Math.PI;
    } else if (t < 270) {
      v.mesh.position.set(R - ((t - 180) / 90) * (2 * R), 0.04, R);
      v.mesh.rotation.y = v.direction === 1 ? -Math.PI / 2 : Math.PI / 2;
    } else {
      v.mesh.position.set(-R, 0.04, R - ((t - 270) / 90) * (2 * R));
      v.mesh.rotation.y = v.direction === 1 ? Math.PI : 0;
    }
  }
}
