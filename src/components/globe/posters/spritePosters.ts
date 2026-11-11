// M2 spike: the same posters as three.js sprites (camera-facing textured quads) instead of DOM
// markers. Enabled from the debug panel (`?debug`, renderer "sprites"); see
// docs/decisions/0001-poster-rendering.md for the comparison.

import {
  CanvasTexture,
  Group,
  Raycaster,
  Sphere,
  SpriteMaterial,
  Sprite,
  SRGBColorSpace,
  Vector2,
  Vector3,
  type Camera,
} from "three";
import type { Movie } from "@/data/movies";
import { POSTER_HEIGHT, POSTER_WIDTH } from "@/lib/movies/poster";
import { baseMovieId } from "@/lib/movies/posters";
import { generatedPosterUrl } from "./htmlPosters";

/**
 * SVG -> canvas at 2x -> texture. Always the generated art: it is a data URL, so the canvas is never
 * tainted, and the spike doesn't depend on TMDB's CDN sending CORS headers.
 */
const posterTexture = (movie: Movie) => {
  const canvas = document.createElement("canvas");
  canvas.width = POSTER_WIDTH * 2;
  canvas.height = POSTER_HEIGHT * 2;
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  const image = new Image();
  image.onload = () => {
    canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
    texture.needsUpdate = true;
  };
  image.src = generatedPosterUrl(movie);
  return texture;
};

export type SpritePosters = {
  group: Group;
  /** Sets every poster's width in world units (globe radius is 100). */
  resize: (worldWidth: number) => void;
  /** The poster under a point in normalised device coordinates, ignoring ones behind the globe. */
  hit: (ndc: { x: number; y: number }, camera: Camera, globeRadius: number) => string | null;
  dispose: () => void;
};

export const createSpritePosters = (
  movies: Movie[],
  toWorld: (lat: number, lng: number) => { x: number; y: number; z: number },
): SpritePosters => {
  const materials = new Map<string, SpriteMaterial>();
  const group = new Group();

  for (const movie of movies) {
    const baseId = baseMovieId(movie.id);
    let material = materials.get(baseId);
    if (!material) {
      material = new SpriteMaterial({ map: posterTexture(movie), transparent: true });
      materials.set(baseId, material);
    }
    const sprite = new Sprite(material);
    sprite.center.set(0.5, 0); // anchor the bottom edge on the pin
    const { x, y, z } = toWorld(movie.lat, movie.lng);
    sprite.position.set(x, y, z);
    sprite.userData.movieId = movie.id;
    group.add(sprite);
  }

  const raycaster = new Raycaster();
  const globeHit = new Vector3();

  return {
    group,
    resize: (width) => {
      for (const sprite of group.children) sprite.scale.set(width, width * 1.5, 1);
    },
    hit: (ndc, camera, globeRadius) => {
      raycaster.setFromCamera(new Vector2(ndc.x, ndc.y), camera);
      const hits = raycaster.intersectObjects(group.children, false);
      if (hits.length === 0) return null;
      const globe = raycaster.ray.intersectSphere(new Sphere(new Vector3(), globeRadius), globeHit);
      const globeDistance = globe ? raycaster.ray.origin.distanceTo(globe) : Infinity;
      const front = hits.find((h) => h.distance < globeDistance);
      return front ? (front.object.userData.movieId as string) : null;
    },
    dispose: () => {
      for (const material of materials.values()) {
        material.map?.dispose();
        material.dispose();
      }
    },
  };
};
