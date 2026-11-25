import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  GamePhase,
  HudSnapshot,
  ORIGINS,
  OriginId,
  WorldState,
} from '../sim/types';
import {
  cancelAutonomousObjective,
  formatSimTime,
  getNearbyInteraction,
  stepWorldSimulation,
} from '../sim/behaviorEngine';
import { getLocationNameAt, resolvePlayerCollision } from '../sim/worldLayout';
import { createContactShadowTexture } from './textures';
import {
  HumanoidRig,
  animateHumanoidRig,
  createHumanoidMesh,
  updatePlayerOriginAccent,
} from './characterMesh';
import {
  CityEnvironmentHandles,
  buildAlderCreekCity,
  updateTrafficVehicles,
} from './cityBuilder';
import {
  BIRTH_SEQUENCE_DURATION,
  BirthSceneStep,
  BirthStageObjects,
  createBirthStage,
  updateBirthStageVisuals,
} from './birthSequence';
import { ProceduralAudioEngine } from './audio';

// Module-level reusable scratch vectors (zero per-frame GC)
const _camDesired = new THREE.Vector3();
const _camTarget = new THREE.Vector3();
const _rayOrigin = new THREE.Vector3();
const _rayDir = new THREE.Vector3();
const _skyColor = new THREE.Color();
const _fogColor = new THREE.Color();
const _sunColor = new THREE.Color();
const _hemiSky = new THREE.Color();
const _hemiGround = new THREE.Color();

export interface GameEngineCallbacks {
  onHudUpdate: (snapshot: HudSnapshot) => void;
  onBirthStep: (step: BirthSceneStep, progress: number) => void;
  onBirthComplete: () => void;
  onInteract: (target: { type: 'npc' | 'building'; id: string }) => void;
  onToggleSystems: () => void;
  onTogglePause: () => void;
  onCameraModeChanged: (mode: 'third' | 'first') => void;
}

export class GameEngine {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private isSoftwareGl: boolean;
  private sunLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private city: CityEnvironmentHandles;
  private birthStage: BirthStageObjects;
  private playerRig: HumanoidRig;
  private npcRigs = new Map<string, HumanoidRig>();
  private contactShadowTex: THREE.CanvasTexture;
  private raycaster = new THREE.Raycaster();
  private audio = new ProceduralAudioEngine();

  private world: WorldState;
  private phase: GamePhase = 'title';
  private callbacks: GameEngineCallbacks;

  private frameId = 0;
  private disposed = false;
  private lastTickMs = performance.now();
  private elapsedTime = 0;
  private birthElapsed = 0;
  private hudEmitAccum = 0;
  private fpsSamples = 0;
  private fpsAccum = 0;
  private currentFps = 60;

  // Player physics & movement
  private keysPressed = new Set<string>();
  private playerVy = 0;
  private isGrounded = true;
  private coyoteTimer = 0;
  private jumpBufferTimer = 0;
  private squashScaleY = 1;
  private footstepAccum = 0;
  private speakingNpcId: string | null = null;
  private modalOpen = false;
  private isDraggingLook = false;
  private lastPointerX = 0;
  private lastPointerY = 0;

  // Smooth damped camera state
  private smoothCamPos = new THREE.Vector3(0, 12, 30);
  private smoothCamLook = new THREE.Vector3(0, 2, -6);

  private resizeObserver: ResizeObserver;

  constructor(container: HTMLElement, initialWorld: WorldState, callbacks: GameEngineCallbacks) {
    this.container = container;
    this.world = initialWorld;
    this.callbacks = callbacks;

    // 1. Software WebGL detection (exact pattern from threejs skill)
    this.isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // 2. Renderer configuration
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const width = Math.max(1, container.clientWidth || window.innerWidth);
    const height = Math.max(1, container.clientHeight || window.innerHeight);
    this.renderer.setSize(width, height);
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.setAttribute('data-testid', 'genesis-3d-canvas');
    container.appendChild(this.renderer.domElement);

    // 3. Scene, Camera, RoomEnvironment PBR map & Fog
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x98bdd9);
    this.scene.fog = new THREE.FogExp2(0x98bdd9, 0.0085);

    this.camera = new THREE.PerspectiveCamera(
      initialWorld.settings.fov,
      width / height,
      0.1,
      260
    );

    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 4. Warm Key Light + Cool Hemisphere Fill
    this.hemiLight = new THREE.HemisphereLight(0xbcd9f5, 0x565047, 0.72);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfff0d4, 1.45);
    this.sunLight.position.set(36, 54, 28);
    this.sunLight.castShadow = !this.isSoftwareGl;
    this.sunLight.shadow.mapSize.set(1024, 1024);
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 150;
    const d = 48;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.02;
    this.scene.add(this.sunLight);

    // 5. Build Alder Creek District
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.city = buildAlderCreekCity(this.scene, maxAniso, this.isSoftwareGl);
    this.contactShadowTex = createContactShadowTexture();

    // 6. Birth sequence elevated stage
    this.birthStage = createBirthStage(ORIGINS[initialWorld.player.origin].trimHex);
    this.scene.add(this.birthStage.group);

    // 7. Player Avatar & 20 NPC articulated human rigs
    const originDef = ORIGINS[initialWorld.player.origin];
    this.playerRig = createHumanoidMesh(
      {
        skinHex: 0xdfb99c,
        hairHex: 0x1c1e24,
        jacketHex: 0x22262e,
        pantsHex: 0x1b1d22,
        accentHex: originDef.trimHex,
        heightScale: 1.0,
        accessory: 'none',
      },
      this.contactShadowTex,
      true,
      originDef.trimHex
    );
    this.playerRig.root.position.set(initialWorld.player.x, 0, initialWorld.player.z);
    this.playerRig.root.rotation.y = initialWorld.player.yaw + Math.PI;
    this.scene.add(this.playerRig.root);

    this.rebuildNpcMeshes();

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    // 8. Listeners & ResizeObserver
    this.bindEvents();
    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(this.container);

    // Start main simulation & render loop
    this.lastTickMs = performance.now();
    this.scheduleNextFrame();
  }

  private rebuildNpcMeshes(): void {
    for (const rig of this.npcRigs.values()) {
      this.scene.remove(rig.root);
    }
    this.npcRigs.clear();

    for (const npc of this.world.npcs) {
      const rig = createHumanoidMesh(npc.appearance, this.contactShadowTex, false);
      rig.root.position.set(npc.x, 0, npc.z);
      rig.root.rotation.y = npc.yaw;
      rig.lastX = npc.x;
      rig.lastZ = npc.z;
      this.scene.add(rig.root);
      this.npcRigs.set(npc.id, rig);
    }
  }

  public setWorldState(newWorld: WorldState): void {
    this.world = newWorld;
    updatePlayerOriginAccent(this.playerRig, ORIGINS[newWorld.player.origin].trimHex);
    this.camera.fov = newWorld.settings.fov;
    this.camera.updateProjectionMatrix();
    this.audio.setMuted(newWorld.settings.muted);
    this.playerRig.root.position.set(newWorld.player.x, newWorld.player.y, newWorld.player.z);
    this.playerRig.root.rotation.y = newWorld.player.yaw + Math.PI;
    this.rebuildNpcMeshes();
    this.emitHudSnapshot();
  }

  public getWorldState(): WorldState {
    return this.world;
  }

  public setOriginPreview(origin: OriginId): void {
    this.world.player.origin = origin;
    updatePlayerOriginAccent(this.playerRig, ORIGINS[origin].trimHex);
  }

  public setPhase(nextPhase: GamePhase): void {
    this.phase = nextPhase;
    this.keysPressed.clear();
    this.isDraggingLook = false;

    if (nextPhase === 'birth') {
      this.birthElapsed = 0;
      this.audio.unlock();
      this.audio.playAwakeningPulse();
    } else if (nextPhase === 'playing') {
      this.birthStage.group.visible = false;
      this.audio.unlock();
      // Snap smooth camera cleanly behind player facing landmark
      const yaw = this.world.player.yaw;
      this.smoothCamPos.set(
        this.world.player.x + Math.sin(yaw) * 4.8,
        this.world.player.y + 2.5,
        this.world.player.z + Math.cos(yaw) * 4.8
      );
      this.smoothCamLook.set(
        this.world.player.x - Math.sin(yaw) * 6,
        this.world.player.y + 1.5,
        this.world.player.z - Math.cos(yaw) * 6
      );
    } else {
      this.birthStage.group.visible = false;
      if (document.pointerLockElement === this.renderer.domElement) {
        document.exitPointerLock?.();
      }
    }
    this.emitHudSnapshot();
  }

  public setModalOpen(open: boolean): void {
    this.modalOpen = open;
    if (open) {
      this.keysPressed.clear();
      this.isDraggingLook = false;
      if (document.pointerLockElement === this.renderer.domElement) {
        document.exitPointerLock?.();
      }
    }
  }

  public setSpeakingNpc(npcId: string | null): void {
    this.speakingNpcId = npcId;
  }

  public toggleCameraMode(): void {
    const next = this.world.settings.cameraMode === 'third' ? 'first' : 'third';
    this.world.settings.cameraMode = next;
    this.callbacks.onCameraModeChanged(next);
    this.audio.playChime(next === 'first' ? 620 : 480);
    this.emitHudSnapshot();
  }

  public applySettings(): void {
    this.camera.fov = this.world.settings.fov;
    this.camera.updateProjectionMatrix();
    this.audio.setMuted(this.world.settings.muted);
    this.emitHudSnapshot();
  }

  public playUiChime(freq = 540): void {
    this.audio.unlock();
    this.audio.playChime(freq);
  }

  public speakNpc(text: string): void {
    this.audio.speakNpcLine(text, this.world.settings.voiceOutput);
  }

  public triggerInteract(): void {
    if (this.phase !== 'playing' || this.modalOpen) return;
    const nearby = getNearbyInteraction(this.world);
    if (nearby) {
      this.audio.playChime(580);
      this.callbacks.onInteract({ type: nearby.type, id: nearby.id });
    }
  }

  private bindEvents(): void {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleWindowBlur);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    this.renderer.domElement.addEventListener('mousedown', this.handleMouseDown);
    window.addEventListener('mouseup', this.handleMouseUp);
    window.addEventListener('mousemove', this.handleMouseMove);
    this.renderer.domElement.addEventListener('webglcontextlost', this.handleContextLost);
  }

  private handleContextLost = (e: Event) => {
    e.preventDefault();
  };

  private handleWindowBlur = () => {
    this.keysPressed.clear();
    this.isDraggingLook = false;
  };

  private handleVisibilityChange = () => {
    if (document.hidden) {
      this.keysPressed.clear();
      this.isDraggingLook = false;
    }
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement | null;
    const isTyping =
      target &&
      (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

    if (isTyping) return;

    if (this.phase === 'birth' && e.code === 'Escape') {
      this.callbacks.onBirthComplete();
      return;
    }

    if (this.phase === 'playing') {
      if (e.code === 'Tab') {
        e.preventDefault();
        this.callbacks.onToggleSystems();
        return;
      }
      if (e.code === 'Escape' || (e.code === 'KeyP' && !this.modalOpen)) {
        e.preventDefault();
        if (!this.modalOpen) {
          this.callbacks.onTogglePause();
        }
        return;
      }
      if (this.modalOpen) return;

      if (e.code === 'KeyV' && !e.repeat) {
        this.toggleCameraMode();
        return;
      }
      if (e.code === 'KeyE' && !e.repeat) {
        this.triggerInteract();
        return;
      }
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        this.jumpBufferTimer = 0.14;
      }
      if (
        e.code === 'KeyW' ||
        e.code === 'KeyA' ||
        e.code === 'KeyS' ||
        e.code === 'KeyD' ||
        e.code === 'ArrowUp' ||
        e.code === 'ArrowDown' ||
        e.code === 'ArrowLeft' ||
        e.code === 'ArrowRight'
      ) {
        if (this.world.player.autonomousFlow.active) {
          cancelAutonomousObjective(this.world, 'Cancelled by manual movement input.');
        }
      }
      this.keysPressed.add(e.code);
    } else if (this.phase === 'paused' && (e.code === 'Escape' || e.code === 'KeyP')) {
      e.preventDefault();
      this.callbacks.onTogglePause();
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    this.keysPressed.delete(e.code);
    if (e.code === 'Space' && this.playerVy > 1.8) {
      this.playerVy *= 0.48;
    }
  };

  private handleMouseDown = (e: MouseEvent) => {
    if (this.phase !== 'playing' || this.modalOpen) return;
    this.audio.unlock();
    if (e.button === 0) {
      this.isDraggingLook = true;
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;
    }
  };

  private handleMouseUp = () => {
    this.isDraggingLook = false;
  };

  private handleMouseMove = (e: MouseEvent) => {
    if (this.phase !== 'playing' || this.modalOpen) return;
    const sens = 0.0028 * this.world.settings.mouseSensitivity;

    if (document.pointerLockElement === this.renderer.domElement) {
      this.world.player.yaw -= e.movementX * sens;
      this.world.player.pitch = THREE.MathUtils.clamp(
        this.world.player.pitch - e.movementY * sens,
        -0.65,
        0.55
      );
    } else if (this.isDraggingLook) {
      const dx = e.clientX - this.lastPointerX;
      const dy = e.clientY - this.lastPointerY;
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;
      this.world.player.yaw -= dx * sens * 1.4;
      this.world.player.pitch = THREE.MathUtils.clamp(
        this.world.player.pitch - dy * sens * 1.2,
        -0.65,
        0.55
      );
    }
  };

  private handleResize(): void {
    if (this.disposed) return;
    const w = Math.max(1, this.container.clientWidth || window.innerWidth);
    const h = Math.max(1, this.container.clientHeight || window.innerHeight);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  private updateAtmosphereAndLighting(): void {
    const inSpaceBirth = this.phase === 'birth' && this.birthElapsed < 6.8;
    this.city.cityGroup.visible = !inSpaceBirth;
    for (const rig of this.npcRigs.values()) {
      rig.root.visible = !inSpaceBirth;
    }

    if (inSpaceBirth) {
      this.playerRig.root.visible = false;
      // Deep space darkness for Scenes 1–4 of the Birth Sequence
      this.scene.background = _skyColor.setHex(0x04060b);
      (this.scene.fog as THREE.FogExp2).color.copy(_skyColor);
      (this.scene.fog as THREE.FogExp2).density = 0.0005;
      this.sunLight.intensity = 1.1;
      this.hemiLight.intensity = 0.35;
      return;
    }
    this.playerRig.root.visible =
      this.phase === 'title' ||
      this.phase === 'birth' ||
      this.world.settings.cameraMode === 'third';

    const hour = this.world.minuteOfDay / 60;
    const sunAngle = ((hour - 6) / 24) * Math.PI * 2;
    const sunElevation = Math.sin(sunAngle); // -1 midnight .. +1 noon
    const daylight = THREE.MathUtils.smoothstep(sunElevation, -0.18, 0.28);
    const twilight = 1 - Math.min(1, Math.abs(sunElevation) * 3.8);

    // Sun position
    this.sunLight.position.set(
      Math.cos(sunAngle) * 62,
      Math.max(8, sunElevation * 68 + 10),
      26
    );

    // Warm/cool color-temperature contrast across day/dusk/night
    if (daylight > 0.5) {
      _skyColor.setHex(0x8bb6da).lerp(new THREE.Color(0xc5d8e6), 0.25);
      _sunColor.setHex(0xfff1d6);
      _hemiSky.setHex(0xb8d9f8);
      _hemiGround.setHex(0x5b5548);
    } else if (twilight > 0.25) {
      _skyColor.setHex(0x1f2b42).lerp(new THREE.Color(0xc97b52), twilight * 0.55);
      _sunColor.setHex(0xffa76b);
      _hemiSky.setHex(0x7c8cb5);
      _hemiGround.setHex(0x3a322d);
    } else {
      _skyColor.setHex(0x0f1726);
      _sunColor.setHex(0x8fb0e0);
      _hemiSky.setHex(0x283b5c);
      _hemiGround.setHex(0x1b1e26);
    }

    if (this.world.weather === 'overcast' || this.world.weather === 'light_rain') {
      _skyColor.lerp(new THREE.Color(0x6d7c8a), 0.45);
    } else if (this.world.weather === 'golden_mist') {
      _skyColor.lerp(new THREE.Color(0xd9b88c), 0.25);
    }

    this.scene.background = _skyColor;
    _fogColor.copy(_skyColor);
    const fog = this.scene.fog as THREE.FogExp2;
    fog.color.copy(_fogColor);
    fog.density =
      this.world.weather === 'golden_mist' || this.world.weather === 'light_rain'
        ? 0.0115
        : 0.0072;

    this.sunLight.color.copy(_sunColor);
    this.sunLight.intensity = THREE.MathUtils.lerp(0.32, 1.55, daylight);
    this.hemiLight.color.copy(_hemiSky);
    this.hemiLight.groundColor.copy(_hemiGround);
    this.hemiLight.intensity = THREE.MathUtils.lerp(0.38, 0.78, daylight);

    // Night illumination for building interior windows & streetlamps
    const nightFactor = 1 - daylight;
    for (const mat of this.city.emissiveWindowMaterials) {
      mat.emissiveIntensity = 0.08 + nightFactor * 0.95;
    }
    for (const mat of this.city.lampBulbMaterials) {
      mat.emissiveIntensity = 0.15 + nightFactor * 1.4;
    }
    for (const pl of this.city.lampLights) {
      pl.intensity = nightFactor * 6.5;
    }

    // Update Alder Creek Clock Spire physical hands
    const hourAngle = -((hour % 12) / 12) * Math.PI * 2;
    const minAngle = -((this.world.minuteOfDay % 60) / 60) * Math.PI * 2;
    this.city.clockHands.hourHand.rotation.z = hourAngle;
    this.city.clockHands.minuteHand.rotation.z = minAngle;
  }

  private stepPlayerMovement(dt: number): void {
    const p = this.world.player;
    const originDef = ORIGINS[p.origin];

    // Turn left/right with Q/E? No, E is interact; ArrowLeft/Right can strafe or rotate
    const forwardInput =
      (this.keysPressed.has('KeyW') || this.keysPressed.has('ArrowUp') ? 1 : 0) -
      (this.keysPressed.has('KeyS') || this.keysPressed.has('ArrowDown') ? 1 : 0);
    const strafeInput =
      (this.keysPressed.has('KeyD') || this.keysPressed.has('ArrowRight') ? 1 : 0) -
      (this.keysPressed.has('KeyA') || this.keysPressed.has('ArrowLeft') ? 1 : 0);

    const isSprint =
      (this.keysPressed.has('ShiftLeft') || this.keysPressed.has('ShiftRight')) &&
      p.energy > 8;

    let movedDist = 0;

    if (!this.modalOpen && (forwardInput !== 0 || strafeInput !== 0)) {
      const len = Math.hypot(forwardInput, strafeInput);
      const nf = forwardInput / len;
      const ns = strafeInput / len;

      const sinY = Math.sin(p.yaw);
      const cosY = Math.cos(p.yaw);
      const dirX = -sinY * nf + cosY * ns;
      const dirZ = -cosY * nf - sinY * ns;

      const baseSpeed = isSprint ? 7.6 : 4.4;
      const speed = baseSpeed * originDef.moveSpeedMultiplier;

      const nextX = p.x + dirX * speed * dt;
      const nextZ = p.z + dirZ * speed * dt;
      const resolved = resolvePlayerCollision(p.x, p.z, nextX, nextZ, 0.42);

      movedDist = Math.hypot(resolved.x - p.x, resolved.z - p.z);
      p.x = resolved.x;
      p.z = resolved.z;

      // Orient player avatar smoothly toward travel direction in third-person
      if (this.world.settings.cameraMode === 'third' && movedDist > 0.001) {
        const travelYaw = Math.atan2(dirX, dirZ);
        let diff = travelYaw - this.playerRig.root.rotation.y;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        this.playerRig.root.rotation.y += diff * (1 - Math.exp(-12 * dt));
      }

      // Gentle sprint energy cost & footstep audio
      if (isSprint) {
        p.energy = Math.max(5, p.energy - dt * 1.15 * originDef.energyDrainMultiplier);
      }
      this.footstepAccum += movedDist;
      if (this.isGrounded && this.footstepAccum >= (isSprint ? 1.85 : 1.45)) {
        this.footstepAccum = 0;
        this.audio.playFootstep(isSprint);
      }
    } else if (this.world.player.autonomousFlow.active) {
      movedDist = Math.hypot(p.x - this.playerRig.lastX, p.z - this.playerRig.lastZ);
      if (movedDist > 0.001) {
        const dx = p.x - this.playerRig.lastX;
        const dz = p.z - this.playerRig.lastZ;
        this.playerRig.root.rotation.y = Math.atan2(dx, dz);
      }
    }

    // Coyote time & buffered jump physics
    if (this.isGrounded) {
      this.coyoteTimer = 0.11;
    } else {
      this.coyoteTimer = Math.max(0, this.coyoteTimer - dt);
    }
    if (this.jumpBufferTimer > 0) {
      this.jumpBufferTimer = Math.max(0, this.jumpBufferTimer - dt);
      if (this.coyoteTimer > 0) {
        this.playerVy = 6.2;
        this.isGrounded = false;
        this.coyoteTimer = 0;
        this.jumpBufferTimer = 0;
        this.squashScaleY = 1.16;
        this.audio.playFootstep(true);
      }
    }

    if (!this.isGrounded || p.y > 0) {
      this.playerVy -= 18.5 * dt;
      p.y += this.playerVy * dt;
      if (p.y <= 0) {
        p.y = 0;
        this.playerVy = 0;
        this.isGrounded = true;
        this.squashScaleY = 0.84;
        this.audio.playFootstep(false);
      }
    }

    this.squashScaleY = THREE.MathUtils.damp(this.squashScaleY, 1.0, 12, dt);

    // Sync player 3D rig
    this.playerRig.root.position.set(p.x, p.y, p.z);
    this.playerRig.root.visible = this.world.settings.cameraMode === 'third';
    if (this.world.settings.cameraMode === 'first') {
      this.playerRig.root.rotation.y = p.yaw + Math.PI;
    }
    animateHumanoidRig(
      this.playerRig,
      dt,
      this.elapsedTime,
      movedDist,
      'idle',
      false,
      this.squashScaleY
    );
    this.playerRig.lastX = p.x;
    this.playerRig.lastZ = p.z;
  }

  private updateCamera(dt: number): void {
    const p = this.world.player;

    if (this.phase === 'title') {
      // Live World Camera Tour sweeping smoothly over Alder Creek Plaza & Clock Spire
      const t = this.elapsedTime * 0.14;
      const radius = 25;
      this.camera.position.set(Math.sin(t) * radius, 10.5 + Math.sin(t * 1.5) * 1.6, Math.cos(t) * radius + 4);
      this.camera.lookAt(0, 4.2, -7);
      return;
    }

    if (this.phase === 'birth') {
      this.birthElapsed += dt;
      const step = updateBirthStageVisuals(
        this.birthStage,
        this.camera,
        this.birthElapsed,
        { x: p.x, z: p.z },
        ORIGINS[p.origin].trimHex
      );
      const progress = Math.min(1, this.birthElapsed / BIRTH_SEQUENCE_DURATION);
      this.callbacks.onBirthStep(step, progress);
      if (this.birthElapsed >= BIRTH_SEQUENCE_DURATION) {
        this.callbacks.onBirthComplete();
      }
      return;
    }

    // Playing camera (First-Person or Third-Person with smooth damping & wall pull-in)
    const sinY = Math.sin(p.yaw);
    const cosY = Math.cos(p.yaw);

    if (this.world.settings.cameraMode === 'first') {
      _camDesired.set(p.x, p.y + 1.68, p.z);
      _camTarget.set(
        p.x - sinY * 10,
        p.y + 1.68 + Math.sin(p.pitch) * 10,
        p.z - cosY * 10
      );
      const alpha = 1 - Math.exp(-22 * dt);
      this.smoothCamPos.lerp(_camDesired, alpha);
      this.smoothCamLook.lerp(_camTarget, alpha);
    } else {
      const dist = 5.1;
      const pitchOffset = Math.sin(-p.pitch) * 2.2;
      _rayOrigin.set(p.x, p.y + 1.55, p.z);
      _camDesired.set(
        p.x + sinY * dist,
        Math.max(0.85, p.y + 2.45 + pitchOffset),
        p.z + cosY * dist
      );

      // Raycast from player shoulder to desired camera to prevent clipping through buildings
      _rayDir.subVectors(_camDesired, _rayOrigin);
      const desiredLen = _rayDir.length();
      if (desiredLen > 0.1) {
        _rayDir.divideScalar(desiredLen);
        this.raycaster.set(_rayOrigin, _rayDir);
        this.raycaster.far = desiredLen;
        const hits = this.raycaster.intersectObjects(this.city.environmentMeshes, false);
        if (hits.length > 0 && hits[0].distance < desiredLen) {
          const pullDist = Math.max(1.2, hits[0].distance - 0.35);
          _camDesired.copy(_rayOrigin).addScaledVector(_rayDir, pullDist);
        }
      }

      _camTarget.set(p.x - sinY * 2.5, p.y + 1.45 - Math.sin(p.pitch) * 1.4, p.z - cosY * 2.5);
      const alpha = 1 - Math.exp(-10 * dt);
      this.smoothCamPos.lerp(_camDesired, alpha);
      this.smoothCamLook.lerp(_camTarget, alpha);
    }

    this.camera.position.copy(this.smoothCamPos);
    this.camera.lookAt(this.smoothCamLook);
  }

  private syncNpcVisuals(dt: number): void {
    for (const npc of this.world.npcs) {
      const rig = this.npcRigs.get(npc.id);
      if (!rig) continue;

      const distMoved = Math.hypot(npc.x - rig.lastX, npc.z - rig.lastZ);
      rig.root.position.set(npc.x, 0, npc.z);

      let diff = npc.yaw - rig.root.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      rig.root.rotation.y += diff * (1 - Math.exp(-8 * dt));

      animateHumanoidRig(
        rig,
        dt,
        this.elapsedTime,
        distMoved,
        npc.gesture,
        this.speakingNpcId === npc.id,
        1.0
      );
      rig.lastX = npc.x;
      rig.lastZ = npc.z;
    }
  }

  private emitHudSnapshot(): void {
    const p = this.world.player;
    const nearby = this.phase === 'playing' ? getNearbyInteraction(this.world) : null;
    const flow = p.autonomousFlow;

    this.callbacks.onHudUpdate({
      day: this.world.day,
      timeFormatted: formatSimTime(this.world.minuteOfDay),
      locationName: getLocationNameAt(p.x, p.z),
      weather: this.world.weather,
      balance: Math.round(p.balance),
      energy: Math.round(p.energy),
      origin: p.origin,
      currentObjective: p.currentObjective,
      cameraMode: this.world.settings.cameraMode,
      playerX: p.x,
      playerZ: p.z,
      playerYaw: p.yaw,
      nearbyPrompt: nearby,
      autonomousFlow: {
        active: flow.active,
        stage: flow.stage,
        objectiveLabel: flow.objectiveLabel,
        latestLog: flow.log[flow.log.length - 1] ?? '',
      },
      minimapNpcs: this.world.npcs.map((n) => ({
        id: n.id,
        x: n.x,
        z: n.z,
        familiar: n.relationship.interactionsCount > 0,
      })),
      fps: this.currentFps,
    });
  }

  private tick = () => {
    if (this.disposed) return;

    const now = performance.now();
    const rawDt = Math.max(0.001, (now - this.lastTickMs) / 1000);
    this.lastTickMs = now;
    const dt = Math.min(rawDt, 0.05);

    this.fpsAccum += rawDt;
    this.fpsSamples += 1;
    if (this.fpsAccum >= 0.75) {
      this.currentFps = Math.round(this.fpsSamples / this.fpsAccum);
      this.fpsAccum = 0;
      this.fpsSamples = 0;
    }

    if (this.phase !== 'paused') {
      this.elapsedTime += dt;

      // Ambient city motion always runs smoothly during title, birth, and playing
      updateTrafficVehicles(this.city.vehicles, dt);
      this.city.fountainWater.position.y = 0.56 + Math.sin(this.elapsedTime * 2.8) * 0.025;

      if (this.phase === 'playing') {
        const simResult = stepWorldSimulation(this.world, dt);
        this.stepPlayerMovement(dt);
        if (simResult.autonomousReachedNpcId && !this.modalOpen) {
          this.callbacks.onInteract({ type: 'npc', id: simResult.autonomousReachedNpcId });
        }
      } else if (this.phase === 'title') {
        stepWorldSimulation(this.world, dt * 0.45);
      }

      this.syncNpcVisuals(dt);
      this.updateAtmosphereAndLighting();
      this.updateCamera(dt);
    }

    this.renderer.render(this.scene, this.camera);

    // Throttled HUD updates (~5Hz)
    this.hudEmitAccum += dt;
    if (this.hudEmitAccum >= 0.18) {
      this.hudEmitAccum = 0;
      this.emitHudSnapshot();
    }

    this.scheduleNextFrame();
  };

  private scheduleNextFrame(): void {
    if (this.disposed) return;
    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
    gl.flush();
    const poll = () => {
      if (this.disposed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    window.clearTimeout(this.frameId);
    this.resizeObserver.disconnect();
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleWindowBlur);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    this.renderer.domElement.removeEventListener('mousedown', this.handleMouseDown);
    window.removeEventListener('mouseup', this.handleMouseUp);
    window.removeEventListener('mousemove', this.handleMouseMove);
    this.renderer.domElement.removeEventListener('webglcontextlost', this.handleContextLost);
    this.audio.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}
