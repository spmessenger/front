import React from "react";
import { Modal as AntdModal, Flex } from "antd";
import Text from "antd/lib/typography/Text";
import { AVATAR_CROP_STAGE_SIZE } from "@/lib/avatar/crop";

interface AvatarCropModalProps {
  open: boolean;
  confirmLoading: boolean;
  cropSource?: string;
  cropRenderWidth: number;
  cropRenderHeight: number;
  cropX: number;
  cropY: number;
  cropSize: number;
  onCancel: () => void;
  onApply: () => void;
  onStartMove: (event: React.PointerEvent<HTMLDivElement>) => void;
  onStartResize: (event: React.PointerEvent<HTMLDivElement>) => void;
}

export default function AvatarCropModal({
  open,
  confirmLoading,
  cropSource,
  cropRenderWidth,
  cropRenderHeight,
  cropX,
  cropY,
  cropSize,
  onCancel,
  onApply,
  onStartMove,
  onStartResize,
}: AvatarCropModalProps) {
  return (
    <AntdModal
      title="Adjust avatar"
      open={open}
      onCancel={onCancel}
      onOk={onApply}
      okText="Apply"
      cancelText="Cancel"
      confirmLoading={confirmLoading}
      maskClosable={!confirmLoading}
      closable={!confirmLoading}
    >
      <Flex vertical gap={20}>
        <Flex justify="center">
          <div
            style={{
              width: AVATAR_CROP_STAGE_SIZE,
              height: AVATAR_CROP_STAGE_SIZE,
              overflow: "hidden",
              position: "relative",
              background: "#b396cb",
              borderRadius: 12,
              border: "2px solid var(--line)",
            }}
          >
            {cropSource ? (
              <div
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  width: cropRenderWidth,
                  height: cropRenderHeight,
                  transform: "translate(-50%, -50%)",
                  backgroundImage: `url(${cropSource})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              />
            ) : null}
            <div
              onPointerDown={onStartMove}
              style={{
                position: "absolute",
                left: cropX,
                top: cropY,
                width: cropSize,
                height: cropSize,
                borderRadius: "50%",
                cursor: "grab",
                boxShadow: "0 0 0 9999px rgba(63, 40, 49, 0.42)",
                border: "2px solid rgba(249, 233, 211, 0.95)",
                backdropFilter: "brightness(1.05)",
              }}
            >
              <div
                onPointerDown={onStartResize}
                style={{
                  position: "absolute",
                  right: 10,
                  bottom: 10,
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  background: "#f9e9d3",
                  border: "2px solid var(--line)",
                  cursor: "nwse-resize",
                }}
              />
            </div>
          </div>
        </Flex>
        <Text type="secondary">
          Drag the circle to reposition the crop. Drag the white handle to
          resize it.
        </Text>
      </Flex>
    </AntdModal>
  );
}
