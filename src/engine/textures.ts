import * as THREE from 'three';

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

export function createAsphaltTextures(maxAnisotropy: number): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const [c, ctx] = makeCanvas(512, 512);
  ctx.fillStyle = '#333840';
  ctx.fillRect(0, 0, 512, 512);

  // Subtle aggregate grain
  for (let i = 0; i < 6500; i++) {
    const x = (i * 73) % 512;
    const y = (i * 197 + Math.floor(i / 7)) % 512;
    const v = 42 + ((i * 29) % 28);
    ctx.fillStyle = `rgb(${v},${v + 2},${v + 5})`;
    ctx.fillRect(x, y, 2, 2);
  }

  // Subtle weathered tire tracks
  ctx.fillStyle = 'rgba(20, 24, 30, 0.22)';
  ctx.fillRect(96, 0, 72, 512);
  ctx.fillRect(344, 0, 72, 512);

  // Center dashed lane markings
  ctx.fillStyle = '#d4c38a';
  for (let y = 16; y < 512; y += 96) {
    ctx.fillRect(251, y, 10, 48);
  }

  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.anisotropy = maxAnisotropy;

  const [bc, bctx] = makeCanvas(256, 256);
  bctx.fillStyle = '#808080';
  bctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 4000; i++) {
    const x = (i * 53) % 256;
    const y = (i * 139) % 256;
    const v = 100 + ((i * 41) % 55);
    bctx.fillStyle = `rgb(${v},${v},${v})`;
    bctx.fillRect(x, y, 2, 2);
  }
  const bumpMap = new THREE.CanvasTexture(bc);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.anisotropy = maxAnisotropy;

  return { map, bumpMap };
}

export function createSidewalkTextures(maxAnisotropy: number): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const [c, ctx] = makeCanvas(512, 512);
  ctx.fillStyle = '#b9b4a8';
  ctx.fillRect(0, 0, 512, 512);

  // Paving stone grid
  const step = 128;
  for (let y = 0; y < 512; y += step) {
    for (let x = 0; x < 512; x += step) {
      const tint = ((x * 7 + y * 13) % 14) - 7;
      ctx.fillStyle = `rgb(${184 + tint}, ${179 + tint}, ${167 + tint})`;
      ctx.fillRect(x + 2, y + 2, step - 4, step - 4);
    }
  }

  // Subtle surface speckles
  for (let i = 0; i < 3000; i++) {
    const x = (i * 67) % 512;
    const y = (i * 181) % 512;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.06)' : 'rgba(60,55,48,0.08)';
    ctx.fillRect(x, y, 2, 2);
  }

  ctx.strokeStyle = 'rgba(72, 68, 60, 0.45)';
  ctx.lineWidth = 3;
  for (let i = 0; i <= 512; i += step) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 512);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(512, i);
    ctx.stroke();
  }

  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.anisotropy = maxAnisotropy;

  const [bc, bctx] = makeCanvas(256, 256);
  bctx.fillStyle = '#909090';
  bctx.fillRect(0, 0, 256, 256);
  bctx.strokeStyle = '#383838';
  bctx.lineWidth = 3;
  for (let i = 0; i <= 256; i += 64) {
    bctx.beginPath();
    bctx.moveTo(i, 0);
    bctx.lineTo(i, 256);
    bctx.stroke();
    bctx.beginPath();
    bctx.moveTo(0, i);
    bctx.lineTo(256, i);
    bctx.stroke();
  }
  const bumpMap = new THREE.CanvasTexture(bc);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.anisotropy = maxAnisotropy;

  return { map, bumpMap };
}

export function createGrassTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(512, 512);
  ctx.fillStyle = '#4e7348';
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 9000; i++) {
    const x = (i * 89 + Math.floor(i / 13) * 19) % 512;
    const y = (i * 151 + Math.floor(i / 17) * 23) % 512;
    const g = 98 + ((i * 37) % 34);
    const r = 64 + ((i * 19) % 24);
    const b = 56 + ((i * 13) % 20);
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(x, y, 2, 4);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(16, 16);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createBuildingFacadeTextures(
  wallHex: number,
  trimHex: number,
  floors: number,
  maxAnisotropy: number
): { map: THREE.CanvasTexture; emissiveMap: THREE.CanvasTexture } {
  const w = 512;
  const h = Math.max(256, floors * 128);
  const [c, ctx] = makeCanvas(w, h);
  const [ec, ectx] = makeCanvas(w, h);

  const wallColor = new THREE.Color(wallHex);
  const trimColor = new THREE.Color(trimHex);
  const wallCss = `#${wallColor.getHexString()}`;
  const trimCss = `#${trimColor.getHexString()}`;

  ctx.fillStyle = wallCss;
  ctx.fillRect(0, 0, w, h);

  ectx.fillStyle = '#000000';
  ectx.fillRect(0, 0, w, h);

  // Subtle horizontal masonry/cladding courses
  ctx.fillStyle = 'rgba(0, 0, 0, 0.06)';
  for (let y = 0; y < h; y += 16) {
    ctx.fillRect(0, y, w, 2);
  }

  const cols = 4;
  const colW = w / cols;
  const floorH = h / floors;

  for (let f = 0; f < floors; f++) {
    const yTop = f * floorH;
    // Floor cornice ledge
    ctx.fillStyle = trimCss;
    ctx.fillRect(0, yTop, w, 6);

    for (let col = 0; col < cols; col++) {
      const wx = col * colW + 22;
      const wy = yTop + 22;
      const ww = colW - 44;
      const wh = floorH - 38;

      // Window frame
      ctx.fillStyle = trimCss;
      ctx.fillRect(wx - 4, wy - 4, ww + 8, wh + 8);

      // Glazing gradient
      const grad = ctx.createLinearGradient(wx, wy, wx, wy + wh);
      grad.addColorStop(0, '#364d63');
      grad.addColorStop(0.5, '#5b7c96');
      grad.addColorStop(1, '#2a3947');
      ctx.fillStyle = grad;
      ctx.fillRect(wx, wy, ww, wh);

      // Mullion crossbars
      ctx.fillStyle = trimCss;
      ctx.fillRect(wx + ww / 2 - 2, wy, 4, wh);
      ctx.fillRect(wx, wy + wh * 0.55, ww, 3);

      // Interior warm night illumination (deterministic lit pattern)
      const lit = (f * 7 + col * 3) % 3 !== 0 || f === floors - 1;
      if (lit) {
        ectx.fillStyle = (f + col) % 2 === 0 ? '#ffd796' : '#ffe6ba';
        ectx.fillRect(wx + 2, wy + 2, ww - 4, wh - 4);
        ectx.fillStyle = '#181410';
        ectx.fillRect(wx + ww / 2 - 2, wy, 4, wh);
        ectx.fillRect(wx, wy + wh * 0.55, ww, 3);
      }
    }
  }

  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = maxAnisotropy;

  const emissiveMap = new THREE.CanvasTexture(ec);
  emissiveMap.colorSpace = THREE.SRGBColorSpace;
  emissiveMap.anisotropy = maxAnisotropy;

  return { map, emissiveMap };
}

export function createSignTexture(
  title: string,
  subtitle: string,
  accentHex: number,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(512, 128);
  const accent = `#${new THREE.Color(accentHex).getHexString()}`;

  ctx.fillStyle = '#161a21';
  ctx.fillRect(0, 0, 512, 128);

  ctx.strokeStyle = accent;
  ctx.lineWidth = 6;
  ctx.strokeRect(6, 6, 500, 116);

  ctx.fillStyle = '#f3f5f8';
  ctx.font = '700 34px Outfit, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, 256, 48);

  ctx.fillStyle = accent;
  ctx.font = '500 20px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillText(subtitle.toUpperCase(), 256, 90);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createContactShadowTexture(): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(128, 128);
  const grad = ctx.createRadialGradient(64, 64, 6, 64, 64, 62);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.58)');
  grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.25)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createEarthTexture(): {
  map: THREE.CanvasTexture;
  emissiveMap: THREE.CanvasTexture;
} {
  const [c, ctx] = makeCanvas(1024, 512);
  const [ec, ectx] = makeCanvas(1024, 512);

  // Deep ocean gradient
  const oceanGrad = ctx.createLinearGradient(0, 0, 0, 512);
  oceanGrad.addColorStop(0, '#10243d');
  oceanGrad.addColorStop(0.5, '#133252');
  oceanGrad.addColorStop(1, '#0e2038');
  ctx.fillStyle = oceanGrad;
  ctx.fillRect(0, 0, 1024, 512);

  ectx.fillStyle = '#000000';
  ectx.fillRect(0, 0, 1024, 512);

  // Stylized organic continental masses
  const continents = [
    { x: 220, y: 180, rx: 110, ry: 78, rot: -0.2 },
    { x: 310, y: 310, rx: 64, ry: 92, rot: 0.15 },
    { x: 540, y: 175, rx: 125, ry: 68, rot: 0.1 },
    { x: 560, y: 290, rx: 72, ry: 85, rot: -0.05 },
    { x: 760, y: 190, rx: 145, ry: 82, rot: -0.1 },
    { x: 825, y: 345, rx: 68, ry: 46, rot: 0.2 },
  ];

  for (const cont of continents) {
    ctx.save();
    ctx.translate(cont.x, cont.y);
    ctx.rotate(cont.rot);
    ctx.fillStyle = '#2d5244';
    ctx.beginPath();
    ctx.ellipse(0, 0, cont.rx, cont.ry, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#3b664f';
    ctx.beginPath();
    ctx.ellipse(cont.rx * 0.12, -cont.ry * 0.08, cont.rx * 0.68, cont.ry * 0.62, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // City light clusters on the continents
    for (let i = 0; i < 36; i++) {
      const ang = (i * 2.399) % (Math.PI * 2);
      const rad = Math.sqrt((i + 1) / 36) * 0.72;
      const lx = cont.x + Math.cos(ang) * cont.rx * rad;
      const ly = cont.y + Math.sin(ang) * cont.ry * rad;
      ectx.fillStyle = i % 4 === 0 ? '#ffd58a' : '#ffaa44';
      ectx.fillRect(lx, ly, 3, 3);
    }
  }

  // Subtle cloud wisps
  ctx.fillStyle = 'rgba(235, 245, 255, 0.24)';
  for (let i = 0; i < 28; i++) {
    const cx = (i * 173) % 1024;
    const cy = 50 + ((i * 83) % 412);
    ctx.beginPath();
    ctx.ellipse(cx, cy, 65 + (i % 40), 12 + (i % 10), 0.1, 0, Math.PI * 2);
    ctx.fill();
  }

  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  const emissiveMap = new THREE.CanvasTexture(ec);
  emissiveMap.colorSpace = THREE.SRGBColorSpace;

  return { map, emissiveMap };
}
