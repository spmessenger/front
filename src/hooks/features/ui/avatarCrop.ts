import React from "react";
import type { AvatarUploadPayload } from "@/lib/types";
import {
  AVATAR_CROP_MIN_SIZE,
  AVATAR_CROP_STAGE_SIZE,
  clampCropRect,
  getRenderedImageGeometry,
  readImageAsDataUrl,
  renderCroppedAvatar,
} from "@/lib/avatar/crop";

type CropMode = "move" | "resize";

type CropInteraction = {
  mode: CropMode;
  startClientX: number;
  startClientY: number;
  startX: number;
  startY: number;
  startSize: number;
};

export function useAvatarCrop() {
  const [avatarPreview, setAvatarPreview] = React.useState<string>();
  const [avatarPayload, setAvatarPayload] = React.useState<
    AvatarUploadPayload | undefined
  >();
  const [cropModalOpen, setCropModalOpen] = React.useState(false);
  const [cropSource, setCropSource] = React.useState<string>();
  const [cropImageWidth, setCropImageWidth] = React.useState(0);
  const [cropImageHeight, setCropImageHeight] = React.useState(0);
  const [cropX, setCropX] = React.useState(0);
  const [cropY, setCropY] = React.useState(0);
  const [cropSize, setCropSize] = React.useState(180);
  const [cropApplying, setCropApplying] = React.useState(false);
  const cropInteractionRef = React.useRef<CropInteraction | null>(null);

  const geometry = React.useMemo(() => {
    if (!cropImageWidth || !cropImageHeight) {
      return {
        cropRenderWidth: 0,
        cropRenderHeight: 0,
        cropImageLeft: 0,
        cropImageTop: 0,
      };
    }
    const { renderWidth, renderHeight, imageLeft, imageTop } =
      getRenderedImageGeometry(cropImageWidth, cropImageHeight);
    return {
      cropRenderWidth: renderWidth,
      cropRenderHeight: renderHeight,
      cropImageLeft: imageLeft,
      cropImageTop: imageTop,
    };
  }, [cropImageHeight, cropImageWidth]);

  const resetCropState = React.useCallback(() => {
    setCropModalOpen(false);
    setCropSource(undefined);
    setCropImageWidth(0);
    setCropImageHeight(0);
    setCropX(0);
    setCropY(0);
    setCropSize(180);
    setCropApplying(false);
  }, []);

  const clearAvatar = React.useCallback(() => {
    setAvatarPreview(undefined);
    setAvatarPayload(undefined);
    resetCropState();
  }, [resetCropState]);

  const clearAvatarPayload = React.useCallback(() => {
    setAvatarPayload(undefined);
  }, []);

  const openCropFromFile = React.useCallback(async (file: File) => {
    const { dataUrl, width, height } = await readImageAsDataUrl(file);
    const { renderWidth, renderHeight, imageLeft, imageTop } =
      getRenderedImageGeometry(width, height);
    const initialSize = Math.max(
      AVATAR_CROP_MIN_SIZE,
      Math.min(renderWidth, renderHeight) * 0.7,
    );

    setCropSource(dataUrl);
    setCropImageWidth(width);
    setCropImageHeight(height);
    setCropSize(initialSize);
    setCropX(imageLeft + (renderWidth - initialSize) / 2);
    setCropY(imageTop + (renderHeight - initialSize) / 2);
    setCropModalOpen(true);
  }, []);

  React.useEffect(() => {
    if (!cropModalOpen) {
      return;
    }

    const onPointerMove = (event: PointerEvent) => {
      const interaction = cropInteractionRef.current;
      if (!interaction) {
        return;
      }

      if (interaction.mode === "move") {
        const nextRect = clampCropRect({
          x: interaction.startX + (event.clientX - interaction.startClientX),
          y: interaction.startY + (event.clientY - interaction.startClientY),
          size: cropSize,
          imageLeft: geometry.cropImageLeft,
          imageTop: geometry.cropImageTop,
          imageWidth: geometry.cropRenderWidth,
          imageHeight: geometry.cropRenderHeight,
        });
        setCropX(nextRect.x);
        setCropY(nextRect.y);
        return;
      }

      const delta = Math.max(
        event.clientX - interaction.startClientX,
        event.clientY - interaction.startClientY,
      );
      const nextRect = clampCropRect({
        x: interaction.startX,
        y: interaction.startY,
        size: interaction.startSize + delta,
        imageLeft: geometry.cropImageLeft,
        imageTop: geometry.cropImageTop,
        imageWidth: geometry.cropRenderWidth,
        imageHeight: geometry.cropRenderHeight,
      });
      setCropX(nextRect.x);
      setCropY(nextRect.y);
      setCropSize(nextRect.size);
    };

    const onPointerUp = () => {
      cropInteractionRef.current = null;
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [cropModalOpen, cropSize, geometry]);

  const startCropMove = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      cropInteractionRef.current = {
        mode: "move",
        startClientX: event.clientX,
        startClientY: event.clientY,
        startX: cropX,
        startY: cropY,
        startSize: cropSize,
      };
    },
    [cropSize, cropX, cropY],
  );

  const startCropResize = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      cropInteractionRef.current = {
        mode: "resize",
        startClientX: event.clientX,
        startClientY: event.clientY,
        startX: cropX,
        startY: cropY,
        startSize: cropSize,
      };
    },
    [cropSize, cropX, cropY],
  );

  const applyAvatarCrop = React.useCallback(async () => {
    if (!cropSource || !cropImageWidth || !cropImageHeight) {
      return;
    }

    setCropApplying(true);
    try {
      const croppedAvatar = await renderCroppedAvatar({
        src: cropSource,
        width: cropImageWidth,
        height: cropImageHeight,
        cropX,
        cropY,
        cropSize,
        imageLeft: geometry.cropImageLeft,
        imageTop: geometry.cropImageTop,
        imageWidth: geometry.cropRenderWidth,
        imageHeight: geometry.cropRenderHeight,
      });

      setAvatarPreview(croppedAvatar);
      setAvatarPayload({
        data_url: cropSource,
        stage_size: AVATAR_CROP_STAGE_SIZE,
        crop_x: cropX,
        crop_y: cropY,
        crop_size: cropSize,
      });
      resetCropState();
    } catch {
      setCropApplying(false);
      throw new Error("Failed to apply avatar crop.");
    }
  }, [
    cropImageHeight,
    cropImageWidth,
    cropSize,
    cropSource,
    cropX,
    cropY,
    geometry.cropImageLeft,
    geometry.cropImageTop,
    geometry.cropRenderHeight,
    geometry.cropRenderWidth,
    resetCropState,
  ]);

  return {
    avatarPreview,
    setAvatarPreview,
    avatarPayload,
    clearAvatarPayload,
    clearAvatar,
    openCropFromFile,
    cropModalOpen,
    cropApplying,
    cropSource,
    cropRenderWidth: geometry.cropRenderWidth,
    cropRenderHeight: geometry.cropRenderHeight,
    cropX,
    cropY,
    cropSize,
    startCropMove,
    startCropResize,
    applyAvatarCrop,
    resetCropState,
  };
}
