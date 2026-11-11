import { BufferAttribute, BufferGeometry, Color, Points, PointsMaterial } from "three";

const STAR_COUNT = 1800;

/** A shell of faint stars around the globe. They sit still while the camera orbits, giving depth. */
export const createStarfield = () => {
  const positions = new Float32Array(STAR_COUNT * 3);
  const colors = new Float32Array(STAR_COUNT * 3);
  const color = new Color();
  for (let i = 0; i < STAR_COUNT; i++) {
    // Uniform direction on a sphere, at a random distance well outside the globe (radius 100).
    const y = Math.random() * 2 - 1;
    const angle = Math.random() * Math.PI * 2;
    const ring = Math.sqrt(1 - y * y);
    const radius = 1400 + Math.random() * 1600;
    positions.set(
      [radius * ring * Math.cos(angle), radius * y, radius * ring * Math.sin(angle)],
      i * 3,
    );
    color.setHSL(0.58 + Math.random() * 0.08, 0.35, 0.55 + Math.random() * 0.4);
    colors.set([color.r, color.g, color.b], i * 3);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.setAttribute("color", new BufferAttribute(colors, 3));
  const material = new PointsMaterial({
    size: 1.5,
    sizeAttenuation: false,
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
    depthWrite: false,
  });
  const stars = new Points(geometry, material);
  const dispose = () => {
    geometry.dispose();
    material.dispose();
  };
  return { stars, dispose };
};
