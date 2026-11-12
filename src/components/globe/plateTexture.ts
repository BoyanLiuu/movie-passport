import { CanvasTexture, SRGBColorSpace } from "three";

/**
 * The globe's surface: a mezzotint plate rocked to black, with a fine burr of grain so the sphere
 * reads as velvet rather than flat black. Generated once, in the browser.
 */
export const createPlateTexture = (width = 2048, height = 1024) => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const image = ctx.createImageData(width, height);
    const data = image.data;
    for (let i = 0; i < data.length; i += 4) {
      // Warm near-blacks, with an occasional brighter burr catching the light.
      // Kept very dark: the globe's lights lift it, and close up it must still read as velvet.
      const burr = Math.random() < 0.015 ? 14 : 0;
      const tone = 5 + Math.random() * 6 + burr;
      data[i] = tone + 2;
      data[i + 1] = tone + 1;
      data[i + 2] = tone;
      data[i + 3] = 255;
    }
    ctx.putImageData(image, 0, 0);
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
};
