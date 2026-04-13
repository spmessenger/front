export const AVATAR_CROP_SIZE = 280;
export const AVATAR_CROP_STAGE_SIZE = 360;
export const AVATAR_CROP_MIN_SIZE = 96;

export async function readImageAsDataUrl(file: File): Promise<{
  dataUrl: string;
  width: number;
  height: number;
}> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Failed to read image."));
        return;
      }

      resolve(reader.result);
    };

    reader.onerror = () => {
      reject(new Error("Failed to read image."));
    };

    reader.readAsDataURL(file);
  });

  const dimensions = await new Promise<{ width: number; height: number }>(
    (resolve, reject) => {
      const image = new window.Image();

      image.onload = () => {
        resolve({
          width: image.naturalWidth,
          height: image.naturalHeight,
        });
      };

      image.onerror = () => {
        reject(new Error("Failed to load image."));
      };

      image.src = dataUrl;
    },
  );

  return { dataUrl, ...dimensions };
}

export function clampCropRect(params: {
  x: number;
  y: number;
  size: number;
  imageLeft: number;
  imageTop: number;
  imageWidth: number;
  imageHeight: number;
}) {
  const { x, y, size, imageLeft, imageTop, imageWidth, imageHeight } = params;
  const maxSize = Math.max(
    AVATAR_CROP_MIN_SIZE,
    Math.min(imageWidth, imageHeight),
  );
  const nextSize = Math.min(Math.max(size, AVATAR_CROP_MIN_SIZE), maxSize);
  const nextX = Math.min(
    Math.max(x, imageLeft),
    imageLeft + imageWidth - nextSize,
  );
  const nextY = Math.min(
    Math.max(y, imageTop),
    imageTop + imageHeight - nextSize,
  );

  return { x: nextX, y: nextY, size: nextSize };
}

export function getRenderedImageGeometry(width: number, height: number) {
  const displayScale = Math.min(
    AVATAR_CROP_STAGE_SIZE / width,
    AVATAR_CROP_STAGE_SIZE / height,
  );
  const renderWidth = width * displayScale;
  const renderHeight = height * displayScale;
  const imageLeft = (AVATAR_CROP_STAGE_SIZE - renderWidth) / 2;
  const imageTop = (AVATAR_CROP_STAGE_SIZE - renderHeight) / 2;
  return { renderWidth, renderHeight, imageLeft, imageTop };
}

export async function renderCroppedAvatar(params: {
  src: string;
  width: number;
  height: number;
  cropX: number;
  cropY: number;
  cropSize: number;
  imageLeft: number;
  imageTop: number;
  imageWidth: number;
  imageHeight: number;
}): Promise<string> {
  const {
    src,
    width,
    cropX,
    cropY,
    cropSize,
    imageLeft,
    imageTop,
    imageWidth,
  } = params;
  const canvas = document.createElement("canvas");
  canvas.width = AVATAR_CROP_SIZE;
  canvas.height = AVATAR_CROP_SIZE;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Failed to initialize crop canvas.");
  }

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const nextImage = new window.Image();
    nextImage.onload = () => resolve(nextImage);
    nextImage.onerror = () => reject(new Error("Failed to load image."));
    nextImage.src = src;
  });

  context.clearRect(0, 0, AVATAR_CROP_SIZE, AVATAR_CROP_SIZE);
  context.save();
  context.beginPath();
  context.arc(
    AVATAR_CROP_SIZE / 2,
    AVATAR_CROP_SIZE / 2,
    AVATAR_CROP_SIZE / 2,
    0,
    Math.PI * 2,
  );
  context.clip();

  const displayScale = imageWidth / width;
  const sourceX = (cropX - imageLeft) / displayScale;
  const sourceY = (cropY - imageTop) / displayScale;
  const sourceSize = cropSize / displayScale;

  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceSize,
    sourceSize,
    0,
    0,
    AVATAR_CROP_SIZE,
    AVATAR_CROP_SIZE,
  );
  context.restore();

  return canvas.toDataURL("image/png");
}
