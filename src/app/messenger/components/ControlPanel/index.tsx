import React, { Fragment } from "react";
import Image from "next/image";
import {
  Avatar,
  Button,
  Card,
  Drawer,
  Flex,
  Input,
  Menu,
  Modal as AntdModal,
  Progress,
  Upload,
  message,
} from "antd";
import type { GetProp, InputRef, UploadProps } from "antd";
import Text from "antd/lib/typography/Text";
import {
  LoadingOutlined,
  MoreOutlined,
  PlusOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { useModalSetter } from "@/hooks/features/ui/modal";
import { useFetchContacts } from "@/hooks/api/messenger";
import ChatsList from "../ChatsList";
import MessengerApi from "@/lib/api/messenger";
import { AvatarUploadPayload, ChatType, ContactType } from "@/lib/types";
import {
  useChatsSetter,
  useSelectedChatSetter,
} from "@/hooks/features/messenger/chats";

enum MenuItemKey {
  Profile,
  CreateGroup,
  Settings,
}

const MIN_GROUP_NAME_LENGTH = 1;
type UploadFile = Parameters<GetProp<UploadProps, "beforeUpload">>[0];
const AVATAR_CROP_SIZE = 280;
const AVATAR_CROP_STAGE_SIZE = 360;
const AVATAR_CROP_MIN_SIZE = 96;

async function readImageAsDataUrl(file: File): Promise<{
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

async function renderCroppedAvatar(params: {
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

function clampCropRect(params: {
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

function castContactsToChats(contacts: ContactType[]): ChatType[] {
  return contacts.map((contact) => ({
    id: contact.id,
    title: contact.username,
    type: "dialog",
    avatar_url: contact.avatar_url,
  }));
}

function SelectedContact({ contact }: { contact: ContactType }) {
  return (
    <Flex
      align="center"
      gap={4}
      style={{ background: "gray", borderRadius: 16, paddingRight: 6 }}
    >
      <Avatar size={28} src={contact.avatar_url} />
      <Text>{contact.username}</Text>
    </Flex>
  );
}

function CreateGroupModal({ onClose }: { onClose: () => void }) {
  const setModal = useModalSetter();
  const setChats = useChatsSetter();
  const setSelectedChat = useSelectedChatSetter();
  const contacts = useFetchContacts();
  const [state, setState] = React.useState<number>(0);
  const [title, setTitle] = React.useState("");
  const [selectedContacts, setSelectedContacts] = React.useState<number[]>([]);
  const [submitting, setSubmitting] = React.useState(false);
  const [showTitleError, setShowTitleError] = React.useState(false);
  const [avatarPreview, setAvatarPreview] = React.useState<string>();
  const [avatarPayload, setAvatarPayload] = React.useState<AvatarUploadPayload>();
  const [avatarUploadPercent, setAvatarUploadPercent] = React.useState(0);
  const [avatarUploading, setAvatarUploading] = React.useState(false);
  const [cropModalOpen, setCropModalOpen] = React.useState(false);
  const [cropSource, setCropSource] = React.useState<string>();
  const [cropImageWidth, setCropImageWidth] = React.useState(0);
  const [cropImageHeight, setCropImageHeight] = React.useState(0);
  const [cropX, setCropX] = React.useState(0);
  const [cropY, setCropY] = React.useState(0);
  const [cropSize, setCropSize] = React.useState(180);
  const [cropApplying, setCropApplying] = React.useState(false);
  const inputRef = React.useRef<InputRef>(null);
  const cropInteractionRef = React.useRef<{
    mode: "move" | "resize";
    startClientX: number;
    startClientY: number;
    startX: number;
    startY: number;
    startSize: number;
  } | null>(null);

  const normalizedTitle = title.trim();
  const hasInvalidTitle = normalizedTitle.length < MIN_GROUP_NAME_LENGTH;
  const cropDisplayScale =
    cropImageWidth && cropImageHeight
      ? Math.min(
          AVATAR_CROP_STAGE_SIZE / cropImageWidth,
          AVATAR_CROP_STAGE_SIZE / cropImageHeight,
        )
      : 1;
  const cropRenderWidth = cropImageWidth * cropDisplayScale;
  const cropRenderHeight = cropImageHeight * cropDisplayScale;
  const cropImageLeft = (AVATAR_CROP_STAGE_SIZE - cropRenderWidth) / 2;
  const cropImageTop = (AVATAR_CROP_STAGE_SIZE - cropRenderHeight) / 2;

  const onContactClick = React.useCallback((contact: ChatType) => {
    setSelectedContacts((prev) =>
      prev.includes(contact.id)
        ? prev.filter((id) => id !== contact.id)
        : [...prev, contact.id],
    );
  }, []);

  const clearState = React.useCallback(() => {
    setTitle("");
    setSelectedContacts([]);
    setShowTitleError(false);
    setAvatarPreview(undefined);
    setAvatarPayload(undefined);
    setAvatarUploadPercent(0);
    setAvatarUploading(false);
    setCropModalOpen(false);
    setCropSource(undefined);
    setCropImageWidth(0);
    setCropImageHeight(0);
    setCropX(0);
    setCropY(0);
    setCropSize(180);
    setCropApplying(false);
    setState(0);
  }, []);

  const goToMembersStep = React.useCallback(() => {
    if (hasInvalidTitle) {
      setShowTitleError(true);
      return;
    }

    setState(1);
  }, [hasInvalidTitle]);

  const goBackToTitleStep = React.useCallback(() => {
    setState(0);
  }, []);

  const closeModal = React.useCallback(() => {
    setModal({ clear: true });
    clearState();
    onClose();
  }, [clearState, onClose, setModal]);

  const submitGroup = React.useCallback(async () => {
    if (hasInvalidTitle) {
      setShowTitleError(true);
      return;
    }

    if (selectedContacts.length === 0) {
      message.error("Select at least one member.");
      return;
    }

    setSubmitting(true);

    try {
      const { data } = await MessengerApi.createGroup({
        title: normalizedTitle,
        participants: selectedContacts,
        avatar: avatarPayload,
      });

      const { data: chats } = await MessengerApi.getChats();
      setChats(chats);
      setSelectedChat(data.chat.id);
      closeModal();
      message.success("Group created.");
    } catch {
      message.error("Failed to create group.");
    } finally {
      setSubmitting(false);
    }
  }, [
    closeModal,
    hasInvalidTitle,
    normalizedTitle,
    avatarPayload,
    selectedContacts,
    setChats,
    setSelectedChat,
  ]);

  const beforeAvatarUpload = React.useCallback((file: UploadFile) => {
    if (!file.type.startsWith("image/")) {
      message.error("Only image files are allowed.");
      return Upload.LIST_IGNORE;
    }

    return true;
  }, []);

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

  const uploadAvatar = React.useCallback<NonNullable<UploadProps["customRequest"]>>(
    async ({ file, onError, onProgress, onSuccess }) => {
      setAvatarUploading(true);
      setAvatarUploadPercent(0);
      try {
        const nativeFile = file as File;
        const total = nativeFile.size || 1;
        const imageInfo = await new Promise<{
          dataUrl: string;
          width: number;
          height: number;
        }>((resolve, reject) => {
          const reader = new FileReader();

          reader.onprogress = (event) => {
            if (!event.lengthComputable) {
              return;
            }

            const percent = Math.round((event.loaded / event.total) * 100);
            setAvatarUploadPercent(percent);
            onProgress?.({ percent });
          };

          reader.onload = async () => {
            try {
              if (typeof reader.result !== "string") {
                reject(new Error("Failed to read image."));
                return;
              }

              const dimensions = await readImageAsDataUrl(nativeFile);
              resolve({
                dataUrl: reader.result,
                width: dimensions.width,
                height: dimensions.height,
              });
            } catch (error) {
              reject(error);
            }
          };

          reader.onerror = () => reject(new Error("Failed to read image."));
          reader.readAsDataURL(nativeFile);
        });

        setCropSource(imageInfo.dataUrl);
        setCropImageWidth(imageInfo.width);
        setCropImageHeight(imageInfo.height);
        const displayScale = Math.min(
          AVATAR_CROP_STAGE_SIZE / imageInfo.width,
          AVATAR_CROP_STAGE_SIZE / imageInfo.height,
        );
        const renderWidth = imageInfo.width * displayScale;
        const renderHeight = imageInfo.height * displayScale;
        const imageLeft = (AVATAR_CROP_STAGE_SIZE - renderWidth) / 2;
        const imageTop = (AVATAR_CROP_STAGE_SIZE - renderHeight) / 2;
        const initialSize = Math.max(
          AVATAR_CROP_MIN_SIZE,
          Math.min(renderWidth, renderHeight) * 0.7,
        );
        setCropSize(initialSize);
        setCropX(imageLeft + (renderWidth - initialSize) / 2);
        setCropY(imageTop + (renderHeight - initialSize) / 2);
        setCropModalOpen(true);
        setAvatarUploadPercent(100);
        setAvatarUploading(false);
        onProgress?.({ percent: 100, total, loaded: total });
        onSuccess?.(imageInfo.dataUrl);
      } catch (error) {
        const uploadError =
          error instanceof Error ? error : new Error("Failed to upload avatar.");
        setAvatarUploading(false);
        setAvatarUploadPercent(0);
        onError?.(uploadError);
        message.error(uploadError.message);
      }
    },
    [],
  );

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
          imageLeft: cropImageLeft,
          imageTop: cropImageTop,
          imageWidth: cropRenderWidth,
          imageHeight: cropRenderHeight,
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
        imageLeft: cropImageLeft,
        imageTop: cropImageTop,
        imageWidth: cropRenderWidth,
        imageHeight: cropRenderHeight,
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
  }, [cropImageLeft, cropImageTop, cropModalOpen, cropRenderHeight, cropRenderWidth, cropSize]);

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
        imageLeft: cropImageLeft,
        imageTop: cropImageTop,
        imageWidth: cropRenderWidth,
        imageHeight: cropRenderHeight,
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
    } catch (error) {
      setCropApplying(false);
      message.error(
        error instanceof Error ? error.message : "Failed to apply avatar crop.",
      );
    }
  }, [
    cropImageHeight,
    cropImageLeft,
    cropImageTop,
    cropImageWidth,
    cropRenderHeight,
    cropRenderWidth,
    cropSize,
    cropSource,
    cropX,
    cropY,
    resetCropState,
  ]);

  React.useEffect(() => {
    if (state === 0) {
      setModal({
        open: true,
        title: "",
        okText: "Next",
        cancelText: "Cancel",
        onOk: goToMembersStep,
        onCancel: closeModal,
        content: (
          <Flex gap={10} align="center" justify="center">
            <Upload
              name="avatar"
              accept="image/*"
              listType="picture-circle"
              className="avatar-uploader"
              showUploadList={false}
              maxCount={1}
              beforeUpload={beforeAvatarUpload}
              customRequest={uploadAvatar}
            >
              <button
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: "50%",
                  border: "1px dashed #d9d9d9",
                  background: "#fafafa",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  padding: 0,
                  cursor: "pointer",
                }}
                type="button"
              >
                {avatarPreview ? (
                  <Image
                    src={avatarPreview}
                    alt="Group avatar preview"
                    width={96}
                    height={96}
                    style={{ objectFit: "cover", width: "100%", height: "100%" }}
                  />
                ) : avatarUploading ? (
                  <Progress
                    type="circle"
                    percent={avatarUploadPercent}
                    size={64}
                    format={(percent) => `${percent ?? 0}%`}
                  />
                ) : (
                  <Flex vertical align="center" gap={6}>
                    {submitting ? <LoadingOutlined /> : <PlusOutlined />}
                    <Text type="secondary">Upload</Text>
                  </Flex>
                )}
              </button>
            </Upload>
            <Flex vertical style={{ width: 260 }}>
              <Input
                ref={inputRef}
                value={title}
                size="middle"
                placeholder="Group name"
                status={showTitleError && hasInvalidTitle ? "error" : undefined}
                onChange={(event) => {
                  setTitle(event.target.value);
                  setShowTitleError(false);
                }}
                minLength={MIN_GROUP_NAME_LENGTH}
              />
            </Flex>
          </Flex>
        ),
      });

      return;
    }

    if (state === 1) {
      setModal({
        open: true,
        cancelText: "Back",
        okText: "Create",
        title: "Add members",
        onCancel: goBackToTitleStep,
        onOk: () => void submitGroup(),
        content: (
          <Card
            style={{ boxShadow: "none" }}
            variant="borderless"
            title={
              <Flex>
                <Flex className="selected-contacts" gap={8}>
                  {contacts
                    .filter((contact) => selectedContacts.includes(contact.id))
                    .map((contact) => (
                      <SelectedContact key={contact.id} contact={contact} />
                    ))}
                </Flex>
                <Input
                  placeholder="Search"
                  prefix={<SearchOutlined />}
                  variant="borderless"
                />
              </Flex>
            }
          >
            <ChatsList
              onClick={onContactClick}
              chats={castContactsToChats(contacts)}
            />
          </Card>
        ),
      });
    }
  }, [
    closeModal,
    contacts,
    goBackToTitleStep,
    goToMembersStep,
    hasInvalidTitle,
    avatarPreview,
    avatarUploadPercent,
    avatarUploading,
    onContactClick,
    selectedContacts,
    setModal,
    showTitleError,
    state,
    submitting,
    submitGroup,
    title,
    beforeAvatarUpload,
    uploadAvatar,
  ]);

  React.useEffect(() => {
    if (state !== 0) {
      return;
    }

    const timeout = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [state]);

  return (
    <Fragment>
      <AntdModal
        title="Adjust avatar"
        open={cropModalOpen}
        onCancel={resetCropState}
        onOk={() => void applyAvatarCrop()}
        okText="Apply"
        cancelText="Cancel"
        confirmLoading={cropApplying}
        maskClosable={!cropApplying}
        closable={!cropApplying}
      >
        <Flex vertical gap={20}>
          <Flex justify="center">
            <div
              style={{
                width: AVATAR_CROP_STAGE_SIZE,
                height: AVATAR_CROP_STAGE_SIZE,
                overflow: "hidden",
                position: "relative",
                background: "#1f1f1f",
                borderRadius: 12,
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
                onPointerDown={startCropMove}
                style={{
                  position: "absolute",
                  left: cropX,
                  top: cropY,
                  width: cropSize,
                  height: cropSize,
                  borderRadius: "50%",
                  cursor: "grab",
                  boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.48)",
                  border: "2px solid rgba(255, 255, 255, 0.9)",
                  backdropFilter: "brightness(1.05)",
                }}
              >
                <div
                  onPointerDown={startCropResize}
                  style={{
                    position: "absolute",
                    right: 10,
                    bottom: 10,
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    background: "#ffffff",
                    border: "2px solid #1677ff",
                    cursor: "nwse-resize",
                  }}
                />
              </div>
            </div>
          </Flex>
          <Text type="secondary">
            Drag the circle to reposition the crop. Drag the white handle to resize it.
          </Text>
        </Flex>
      </AntdModal>
    </Fragment>
  );
}

function ModalManipulator({
  menuKey,
  onClose,
}: {
  menuKey: number;
  onClose: () => void;
}) {
  switch (menuKey) {
    case MenuItemKey.CreateGroup:
      return <CreateGroupModal onClose={onClose} />;
    default:
      return <Fragment />;
  }
}

export default function ControlPanel() {
  const [menuKey, setMenuKey] = React.useState<number>(-1);
  const [open, setOpen] = React.useState(false);

  const items = [
    { key: MenuItemKey.Profile, label: "Profile" },
    { key: MenuItemKey.CreateGroup, label: "Create group" },
    { key: MenuItemKey.Settings, label: "Settings" },
  ];

  const onClick = ({ key }: { key: string }) => {
    setOpen(false);
    setMenuKey(-1);
    setTimeout(() => {
      setMenuKey(Number(key));
    }, 0);
  };

  const closeManipulator = React.useCallback(() => {
    setMenuKey(-1);
  }, []);

  return (
    <Fragment>
      <ModalManipulator menuKey={menuKey} onClose={closeManipulator} />
      <Drawer
        open={open}
        placement="left"
        title={
          <Flex align="center">
            <Avatar
              size="large"
              src="https://api.dicebear.com/7.x/miniavs/svg?seed=1"
            />
            <Text strong>Username</Text>
          </Flex>
        }
        onClose={() => setOpen(false)}
      >
        <Menu
          selectable={false}
          items={items}
          mode="vertical"
          onClick={onClick}
        />
      </Drawer>
      <Flex align="center" justify="center" style={{ height: "100%" }}>
        <Button icon={<MoreOutlined />} onClick={() => setOpen(true)} />
      </Flex>
    </Fragment>
  );
}
