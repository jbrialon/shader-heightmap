/**
 * This loadImage function returns a Promise that is resolved when the image finishes loading
 * if you use it with await, it returns the loaded image object
 * @param {string} path image file path
 * @returns a Promise that resolves with the value assigned as the loaded image
 */
export const loadImage = (path) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous"; // to avoid CORS if used with Canvas
    img.src = path;
    img.onload = () => {
      resolve(img);
    };
    img.onerror = (e) => {
      reject(e);
    };
  });
};
