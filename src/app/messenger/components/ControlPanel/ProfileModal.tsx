import React from "react";
import Image from "next/image";
import { Avatar, Flex, Input, Upload, message } from "antd";
import type { GetProp, UploadProps } from "antd";
import Text from "antd/lib/typography/Text";
import { InfoCircleOutlined, UserOutlined } from "@ant-design/icons";
import { useModalSetter } from "@/hooks/features/ui/modal";
import { useAvatarCrop } from "@/hooks/features/ui/avatarCrop";
import AvatarCropModal from "@/components/AvatarCropModal";
import AuthApi, { AUTH_USERNAME_STORAGE_KEY } from "@/lib/api/auth";

type UploadFile = Parameters<GetProp<UploadProps, "beforeUpload">>[0];

type ProfileUpdated = {
  username: string;
  avatar_url?: string;
};

type ProfileModalProps = {
  onClose: () => void;
  username: string;
  avatarUrl?: string;
  onUpdated: (profile: ProfileUpdated) => void;
};

export default function ProfileModal({
  onClose,
  username,
  avatarUrl,
  onUpdated,
}: ProfileModalProps) {
  const setModal = useModalSetter();
  const [draftUsername, setDraftUsername] = React.useState(username);
  const [submitting, setSubmitting] = React.useState(false);
  const [showUsernameError, setShowUsernameError] = React.useState(false);
  const avatarCrop = useAvatarCrop();

  React.useEffect(() => {
    setDraftUsername(username);
  }, [username]);

  React.useEffect(() => {
    avatarCrop.setAvatarPreview(avatarUrl);
    avatarCrop.clearAvatarPayload();
  }, [avatarCrop, avatarUrl]);

  const uploadProfileAvatar = React.useCallback(async (file: UploadFile) => {
    if (!file.type.startsWith("image/")) {
      message.error("Only image files are allowed.");
      return Upload.LIST_IGNORE;
    }

    try {
      await avatarCrop.openCropFromFile(file as File);
      return false;
    } catch {
      message.error("Failed to read image.");
      return Upload.LIST_IGNORE;
    }
  }, [avatarCrop]);

  React.useEffect(() => {
    const closeModal = () => {
      setModal({ clear: true });
      onClose();
    };

    const submitProfile = async () => {
      const normalizedUsername = draftUsername.trim();

      if (!normalizedUsername) {
        setShowUsernameError(true);
        return;
      }

      setSubmitting(true);

      try {
        const { data } = await AuthApi.updateProfile({
          username: normalizedUsername,
          avatar: avatarCrop.avatarPayload,
        });
        window.localStorage.setItem(AUTH_USERNAME_STORAGE_KEY, data.username);
        onUpdated({ username: data.username, avatar_url: data.avatar_url });
        message.success("Profile updated.");
        closeModal();
      } catch {
        message.error("Failed to update profile.");
      } finally {
        setSubmitting(false);
      }
    };

    setModal({
      open: true,
      title: "Profile",
      okText: "Save",
      cancelText: "Cancel",
      onOk: () => void submitProfile(),
      onCancel: closeModal,
      content: (
        <Flex vertical align="center" gap={20} style={{ padding: "8px 0 4px" }}>
          <Upload
            name="avatar"
            accept="image/*"
            listType="picture-circle"
            showUploadList={false}
            maxCount={1}
            beforeUpload={uploadProfileAvatar}
            disabled={submitting}
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
              {avatarCrop.avatarPreview ? (
                <Image
                  src={avatarCrop.avatarPreview}
                  alt="Profile avatar preview"
                  width={96}
                  height={96}
                  style={{ objectFit: "cover", width: "100%", height: "100%" }}
                />
              ) : (
                <Avatar size={96} icon={<UserOutlined />} />
              )}
            </button>
          </Upload>
          <Flex vertical gap={10} style={{ width: "100%" }}>
            <Input
              value={draftUsername}
              placeholder="Username"
              status={showUsernameError && !draftUsername.trim() ? "error" : undefined}
              onChange={(event) => {
                setDraftUsername(event.target.value);
                setShowUsernameError(false);
              }}
              onPressEnter={() => void submitProfile()}
              disabled={submitting}
            />
            <Flex align="center" gap={6} justify="center">
              <InfoCircleOutlined style={{ color: "#8c8c8c" }} />
              <Text type="secondary">Update your username and avatar.</Text>
            </Flex>
          </Flex>
        </Flex>
      ),
      confirmLoading: submitting,
    });

    return () => {
      setModal({ clear: true });
    };
  }, [
    avatarCrop.avatarPayload,
    avatarCrop.avatarPreview,
    draftUsername,
    onClose,
    onUpdated,
    setModal,
    showUsernameError,
    submitting,
    uploadProfileAvatar,
  ]);

  return (
    <AvatarCropModal
      open={avatarCrop.cropModalOpen}
      confirmLoading={avatarCrop.cropApplying}
      cropSource={avatarCrop.cropSource}
      cropRenderWidth={avatarCrop.cropRenderWidth}
      cropRenderHeight={avatarCrop.cropRenderHeight}
      cropX={avatarCrop.cropX}
      cropY={avatarCrop.cropY}
      cropSize={avatarCrop.cropSize}
      onCancel={avatarCrop.resetCropState}
      onStartMove={avatarCrop.startCropMove}
      onStartResize={avatarCrop.startCropResize}
      onApply={() => {
        void avatarCrop.applyAvatarCrop().catch((error) => {
          message.error(
            error instanceof Error ? error.message : "Failed to apply avatar crop.",
          );
        });
      }}
    />
  );
}
