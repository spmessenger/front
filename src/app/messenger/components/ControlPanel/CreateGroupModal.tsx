import React from "react";
import Image from "next/image";
import { Avatar, Card, Flex, Input, Progress, Upload, message } from "antd";
import type { GetProp, InputRef, UploadProps } from "antd";
import Text from "antd/lib/typography/Text";
import { LoadingOutlined, PlusOutlined, SearchOutlined } from "@ant-design/icons";
import { useModalSetter } from "@/hooks/features/ui/modal";
import { useFetchContacts } from "@/hooks/api/messenger";
import { useAvatarCrop } from "@/hooks/features/ui/avatarCrop";
import ChatsList from "../ChatsList";
import AvatarCropModal from "@/components/AvatarCropModal";
import MessengerApi from "@/lib/api/messenger";
import type { ChatType, ContactType } from "@/lib/types";
import {
  useChatsSetter,
  useSelectedChatSetter,
} from "@/hooks/features/messenger/chats";

const MIN_GROUP_NAME_LENGTH = 1;
type UploadFile = Parameters<GetProp<UploadProps, "beforeUpload">>[0];

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

export default function CreateGroupModal({ onClose }: { onClose: () => void }) {
  const setModal = useModalSetter();
  const setChats = useChatsSetter();
  const setSelectedChat = useSelectedChatSetter();
  const { contacts, isLoading: isContactsLoading } = useFetchContacts();
  const [state, setState] = React.useState<number>(0);
  const [title, setTitle] = React.useState("");
  const [selectedContacts, setSelectedContacts] = React.useState<number[]>([]);
  const [submitting, setSubmitting] = React.useState(false);
  const [showTitleError, setShowTitleError] = React.useState(false);
  const [avatarUploadPercent, setAvatarUploadPercent] = React.useState(0);
  const [avatarUploading, setAvatarUploading] = React.useState(false);
  const inputRef = React.useRef<InputRef>(null);
  const avatarCrop = useAvatarCrop();

  const normalizedTitle = title.trim();
  const hasInvalidTitle = normalizedTitle.length < MIN_GROUP_NAME_LENGTH;

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
    setAvatarUploadPercent(0);
    setAvatarUploading(false);
    avatarCrop.clearAvatar();
    setState(0);
  }, [avatarCrop]);

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
        avatar: avatarCrop.avatarPayload,
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
    selectedContacts,
    setChats,
    setSelectedChat,
    avatarCrop.avatarPayload,
  ]);

  const beforeAvatarUpload = React.useCallback((file: UploadFile) => {
    if (!file.type.startsWith("image/")) {
      message.error("Only image files are allowed.");
      return Upload.LIST_IGNORE;
    }

    return true;
  }, []);

  const uploadAvatar = React.useCallback<NonNullable<UploadProps["customRequest"]>>(
    async ({ file, onError, onProgress, onSuccess }) => {
      setAvatarUploading(true);
      setAvatarUploadPercent(0);
      try {
        const nativeFile = file as File;
        const total = nativeFile.size || 1;
        await avatarCrop.openCropFromFile(nativeFile);
        setAvatarUploadPercent(100);
        setAvatarUploading(false);
        onProgress?.({ percent: 100, total, loaded: total });
        onSuccess?.("ok");
      } catch (error) {
        const uploadError =
          error instanceof Error ? error : new Error("Failed to upload avatar.");
        setAvatarUploading(false);
        setAvatarUploadPercent(0);
        onError?.(uploadError);
        message.error(uploadError.message);
      }
    },
    [avatarCrop],
  );

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
                {avatarCrop.avatarPreview ? (
                  <Image
                    src={avatarCrop.avatarPreview}
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
            {isContactsLoading ? (
              <Flex justify="center" style={{ padding: "24px 0" }}>
                <LoadingOutlined spin />
              </Flex>
            ) : (
              <ChatsList
                onClick={onContactClick}
                chats={castContactsToChats(contacts)}
              />
            )}
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
    avatarCrop.avatarPreview,
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
    isContactsLoading,
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
