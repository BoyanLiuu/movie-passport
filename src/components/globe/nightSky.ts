// The night around the plate, printed in the same mezzotint as the globe: the Milky Way is a soft
// grained haze with dark dust rifts on a far sphere, and the stars are burnished points of silver
// and warm white, thicker along the band. No blue and no glow: the sky stays quieter than the land
// and the posters. It sits still while the camera orbits, so turning the globe turns the sky.

import {
  BackSide,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  DataTexture,
  Group,
  LinearFilter,
  LinearMipmapLinearFilter,
  Mesh,
  MeshBasicMaterial,
  Points,
  PointsMaterial,
  RGBAFormat,
  SphereGeometry,
  SRGBColorSpace,
  type Texture,
} from "three";

/** Far enough that the camera (at most 5 globe radii out) never nears it. */
const SKY_RADIUS = 2600;
/**
 * Where the band runs, as a latitude on the sky (v, 0 at the zenith). The opening view looks down
 * from 20° north, so the sky straight behind the globe sits 20° south: the band wanders around that
 * latitude, so it passes behind the globe on a shallow diagonal however the globe is turned.
 */
const BAND_LATITUDE = (90 + 20) / 180;

/** Burnished tones only: silver-bright, silver, a warm white and pewter. */
const STAR_TONES = [
  [241, 237, 232],
  [219, 214, 209],
  [228, 214, 194],
  [167, 163, 154],
] as const;

/** Deterministic pseudo-random numbers (mulberry32), so the sky is the same on every visit. */
const seeded = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/** Roughly normal, mean 0 and spread 1 (sum of uniforms). */
const gaussian = (random: () => number) => random() + random() + random() - 1.5;

/** The band's centre line and half-width in texture space (v), as a gentle wander around u. */
const band = (u: number) => ({
  centre:
    BAND_LATITUDE +
    0.06 * Math.sin(Math.PI * 4 * u + 0.8) +
    0.015 * Math.sin(Math.PI * 10 * u + 2.1),
  width: 0.05 + 0.02 * Math.sin(Math.PI * 6 * u + 1.3),
  // Brightest towards the galactic centre (u ≈ 0.3), fading round the far side.
  light: 0.4 + 0.6 * Math.exp(-(Math.min(Math.abs(u - 0.3), 1 - Math.abs(u - 0.3)) ** 2) / 0.012),
});

/** Smooth value noise on a grid that wraps around u, so the band has no seam. */
const valueNoise = (random: () => number, cols: number, rows: number) => {
  const grid = Float32Array.from({ length: cols * rows }, () => random());
  return (u: number, v: number) => {
    const fx = u * cols;
    const fy = v * (rows - 1);
    const x0 = Math.floor(fx);
    const y0 = Math.min(Math.floor(fy), rows - 2);
    const sx = (fx - x0) ** 2 * (3 - 2 * (fx - x0));
    const sy = (fy - y0) ** 2 * (3 - 2 * (fy - y0));
    const xa = ((x0 % cols) + cols) % cols;
    const xb = (xa + 1) % cols;
    const a = grid[y0 * cols + xa];
    const b = grid[y0 * cols + xb];
    const c = grid[(y0 + 1) * cols + xa];
    const d = grid[(y0 + 1) * cols + xb];
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  };
};

/** Several octaves of noise, 0–1, finer detail at lower weight. */
const fractalNoise = (random: () => number, baseCols: number, octaves: number) => {
  const layers = Array.from({ length: octaves }, (_, i) =>
    valueNoise(random, baseCols * 2 ** i, (baseCols / 2) * 2 ** i + 1),
  );
  const total = layers.reduce((sum, _, i) => sum + 0.55 ** i, 0);
  return (u: number, v: number) =>
    layers.reduce((sum, noise, i) => sum + noise(u, v) * 0.55 ** i, 0) / total;
};

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Strongest the haze gets: a breath of light, never a glow. */
const HAZE_ALPHA = 0.3;

/**
 * The Milky Way as an equirectangular texture: a mottled haze along the band with dark dust rifts
 * through its core. Computed straight into pixels (canvas gradients are dithered, and the far
 * sphere magnifies every texel into a visible grid). Soft shapes only; the fine grain comes from
 * the dust layer of points, sharp at any size.
 */
const milkyWayTexture = (random: () => number, width = 1024, height = 512) => {
  const haze = fractalNoise(random, 12, 5);
  const rifts = fractalNoise(random, 20, 4);
  const columns = Array.from({ length: width }, (_, x) => band((x + 0.5) / width));
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    // DataTextures aren't flipped: row 0 is the bottom of the sphere.
    const v = 1 - (y + 0.5) / height;
    if (Math.abs(v - BAND_LATITUDE) > 0.3) continue;
    for (let x = 0; x < width; x++) {
      const u = (x + 0.5) / width;
      const { centre, width: w, light } = columns[x];
      const d = (v - centre) / w;
      const core = Math.exp(-0.5 * d * d);
      const glow = 0.3 * Math.exp((-d * d) / 9);
      const mottle = 0.3 + 0.7 * haze(u, v);
      const rift =
        smoothstep(0.52, 0.68, rifts(u, v)) * Math.exp(-(((v - centre) / w - 0.2) ** 2) / 0.3);
      const alpha = (core * mottle + glow) * light * (1 - 0.85 * rift);
      const i = (y * width + x) * 4;
      data.set([219, 214, 209, Math.round(Math.min(1, alpha) * HAZE_ALPHA * 255)], i);
    }
  }
  const texture = new DataTexture(data, width, height, RGBAFormat);
  texture.colorSpace = SRGBColorSpace;
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
};

/** A soft round point, so stars read as burnished dots rather than square pixels. */
const starSprite = () => {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 32;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.45, "rgba(255,255,255,0.75)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 32, 32);
  }
  return new CanvasTexture(canvas);
};

/** A point on a sphere of `radius` at texture coordinates (u, v), matching SphereGeometry's UVs. */
const onSphere = (u: number, v: number, radius: number) => {
  const phi = u * Math.PI * 2;
  const theta = v * Math.PI;
  return [
    -radius * Math.cos(phi) * Math.sin(theta),
    radius * Math.cos(theta),
    radius * Math.sin(phi) * Math.sin(theta),
  ];
};

/** Anywhere on the sky (uniform over the sphere). */
const anywhere = (random: () => number) => [random(), Math.acos(random() * 2 - 1) / Math.PI];

/** Along the band, following its wander, densest towards the galactic centre. */
const alongBand = (random: () => number, spread: number) => {
  for (;;) {
    const u = random();
    const { centre, width, light } = band(u);
    if (random() <= light) return [u, centre + gaussian(random) * width * spread];
  }
};

type StarLayer = { count: number; banded: number; spread?: number; size: number; opacity: number };

/** One layer of stars: `banded` of them crowd the Milky Way, the rest are anywhere. */
const starLayer = (
  random: () => number,
  sprite: Texture,
  { count, banded, spread = 1.4, size, opacity }: StarLayer,
) => {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const [u, v] = i < count * banded ? alongBand(random, spread) : anywhere(random);
    positions.set(onSphere(u, v, 1500 + random() * 900), i * 3);
    const [r, g, b] = STAR_TONES[Math.floor(random() * STAR_TONES.length)];
    const dim = 0.55 + random() * 0.45;
    colors.set([(r / 255) * dim, (g / 255) * dim, (b / 255) * dim], i * 3);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.setAttribute("color", new BufferAttribute(colors, 3));
  const material = new PointsMaterial({
    size,
    map: sprite,
    sizeAttenuation: false,
    vertexColors: true,
    transparent: true,
    opacity,
    depthWrite: false,
  });
  return { points: new Points(geometry, material), geometry, material };
};

export const createNightSky = () => {
  const random = seeded(0x5ca1ab1e);
  const group = new Group();

  const haze = milkyWayTexture(random);
  const skyGeometry = new SphereGeometry(SKY_RADIUS, 64, 32);
  const skyMaterial = new MeshBasicMaterial({
    map: haze,
    transparent: true,
    depthWrite: false,
    side: BackSide,
  });
  const sky = new Mesh(skyGeometry, skyMaterial);
  sky.renderOrder = -1;
  group.add(sky);

  const sprite = starSprite();
  const layers = [
    // Dust: the band's grain, thousands of faint points inside the haze.
    starLayer(random, sprite, { count: 7000, banded: 1, spread: 0.9, size: 1.4, opacity: 0.6 }),
    starLayer(random, sprite, { count: 2400, banded: 0.45, size: 1.6, opacity: 0.5 }),
    starLayer(random, sprite, { count: 520, banded: 0.4, size: 2.4, opacity: 0.7 }),
    starLayer(random, sprite, { count: 120, banded: 0.3, size: 3.4, opacity: 0.9 }),
  ];
  for (const layer of layers) group.add(layer.points);

  const dispose = () => {
    haze.dispose();
    skyGeometry.dispose();
    skyMaterial.dispose();
    sprite.dispose();
    for (const layer of layers) {
      layer.geometry.dispose();
      layer.material.dispose();
    }
  };
  return { group, dispose };
};
