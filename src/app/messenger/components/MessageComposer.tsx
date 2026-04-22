"use client";

import React from "react";
import { Button, Dropdown, Image, Input, Modal as AntdModal, Typography } from "antd";
import type { MenuProps } from "antd";
import {
  CloseOutlined,
  FileImageOutlined,
  FileTextOutlined,
  PaperClipOutlined,
  SmileOutlined,
} from "@ant-design/icons";
import EmojiPicker, { type EmojiClickData } from "emoji-picker-react";
import type { ChatMessageType } from "@/lib/types";
import type { AttachmentPickerKind, MessengerTheme } from "../types";
import { resolveMessageAuthor, shortenText } from "../utils";

const { Text } = Typography;
const { TextArea } = Input;

interface MessageComposerProps {
  isSocketConnected: boolean;
  messengerTheme: MessengerTheme;
  isAttachmentUploading: boolean;
  replyTarget: ChatMessageType | null;
  selectedChatTitle: string | undefined;
  onCancelReply: () => void;
  onSendMessage: (text: string) => boolean;
  onSendAttachment: (file: File, kind: AttachmentPickerKind) => Promise<void>;
  onSendAttachmentBatch: (files: File[], caption: string) => Promise<void>;
}

export default function MessageComposer({
  isSocketConnected,
  messengerTheme,
  isAttachmentUploading,
  replyTarget,
  selectedChatTitle,
  onCancelReply,
  onSendMessage,
  onSendAttachment,
  onSendAttachmentBatch,
}: MessageComposerProps) {
  const [draft, setDraft] = React.useState("");
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = React.useState(false);
  const [isMediaModalOpen, setIsMediaModalOpen] = React.useState(false);
  const [mediaCaptionDraft, setMediaCaptionDraft] = React.useState("");
  const [pendingMediaFiles, setPendingMediaFiles] = React.useState<
    Array<{ id: string; file: File; previewUrl: string }>
  >([]);
  const pendingMediaFilesRef = React.useRef<Array<{ id: string; file: File; previewUrl: string }>>([]);
  const photoVideoInputRef = React.useRef<HTMLInputElement | null>(null);
  const documentInputRef = React.useRef<HTMLInputElement | null>(null);

  function appendEmoji(emojiData: EmojiClickData) {
    setDraft((currentDraft) => `${currentDraft}${emojiData.emoji}`);
    setIsEmojiPickerOpen(false);
  }

  function handleSendClick() {
    const text = draft.trim();
    if (!text) {
      return;
    }
    const didSend = onSendMessage(text);
    if (!didSend) {
      return;
    }
    setDraft("");
    setIsEmojiPickerOpen(false);
  }

  const attachmentMenuItems: MenuProps["items"] = [
    {
      key: "photo_or_video",
      label: "Photo or video",
      icon: <FileImageOutlined />,
    },
    {
      key: "document",
      label: "Document",
      icon: <FileTextOutlined />,
    },
  ];

  const handleAttachmentMenuClick: MenuProps["onClick"] = ({ key }) => {
    if (key === "photo_or_video") {
      photoVideoInputRef.current?.click();
      return;
    }

    if (key === "document") {
      documentInputRef.current?.click();
    }
  };

  function addMediaFiles(files: File[]) {
    const nextFiles = files.filter(
      (file) => file.type.startsWith("image/") || file.type.startsWith("video/"),
    );
    if (nextFiles.length === 0) {
      return;
    }

    const nextItems = nextFiles.map((file) => ({
      id:
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    setPendingMediaFiles((current) => [...current, ...nextItems]);
    setIsMediaModalOpen(true);
  }

  function removePendingMediaFile(id: string) {
    setPendingMediaFiles((current) => {
      const item = current.find((pending) => pending.id === id);
      if (item) {
        URL.revokeObjectURL(item.previewUrl);
      }
      return current.filter((pending) => pending.id !== id);
    });
  }

  function closeMediaModal() {
    setPendingMediaFiles((current) => {
      current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
      return [];
    });
    setMediaCaptionDraft("");
    setIsMediaModalOpen(false);
  }

  React.useEffect(() => {
    pendingMediaFilesRef.current = pendingMediaFiles;
  }, [pendingMediaFiles]);

  React.useEffect(() => {
    return () => {
      pendingMediaFilesRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    };
  }, []);

  async function handleAttachmentInputChange(
    event: React.ChangeEvent<HTMLInputElement>,
    kind: AttachmentPickerKind,
  ) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) {
      return;
    }

    if (kind === "photo_or_video") {
      addMediaFiles(files);
      return;
    }

    await onSendAttachment(files[0], kind);
  }

  async function handleSendPendingMedia() {
    if (pendingMediaFiles.length === 0) {
      return;
    }

    await onSendAttachmentBatch(
      pendingMediaFiles.map((item) => item.file),
      mediaCaptionDraft.trim(),
    );
    closeMediaModal();
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        minWidth: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          gap: "12px",
          alignItems: "flex-end",
          minWidth: 0,
        }}
      >
        {replyTarget ? (
          <div
            style={{
              display: "flex",
              alignItems: "stretch",
              justifyContent: "space-between",
              width: "100%",
              gap: "10px",
              padding: "8px 10px",
              borderRadius: "10px",
              background: "var(--mess-reply-bg)",
              color: "var(--mess-text)",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <Text style={{ display: "block", color: "var(--mess-reply-title)", fontWeight: 600 }}>
                {`In reply to ${resolveMessageAuthor(replyTarget, selectedChatTitle)}`}
              </Text>
              <Text style={{ color: "var(--mess-text)" }}>
                {shortenText(replyTarget.text)}
              </Text>
            </div>
            <Button
              type="text"
              icon={<CloseOutlined />}
              onClick={onCancelReply}
              style={{ color: "var(--mess-text)" }}
            />
          </div>
        ) : null}
      </div>
      <div
        style={{
          display: "flex",
          gap: "12px",
          alignItems: "flex-end",
          minWidth: 0,
        }}
      >
        <Dropdown
          trigger={["hover", "click"]}
          placement="topLeft"
          overlayClassName={messengerTheme === "mono" ? "messenger-mono-attach-menu" : undefined}
          menu={{ items: attachmentMenuItems, onClick: handleAttachmentMenuClick }}
          disabled={!isSocketConnected || isAttachmentUploading}
        >
          <Button
            size="large"
            icon={<PaperClipOutlined />}
            aria-label="Attach file"
            title="Attach file"
            disabled={!isSocketConnected || isAttachmentUploading}
          />
        </Dropdown>
        <input
          ref={photoVideoInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          style={{ display: "none" }}
          onChange={(event) => {
            void handleAttachmentInputChange(event, "photo_or_video");
          }}
        />
        <input
          ref={documentInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.txt,.xlsx,.xls,.ppt,.pptx,.zip,.rar,application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          style={{ display: "none" }}
          onChange={(event) => {
            void handleAttachmentInputChange(event, "document");
          }}
        />
        <TextArea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onPressEnter={(event) => {
            if (!event.shiftKey) {
              event.preventDefault();
              handleSendClick();
            }
          }}
          placeholder="Type a message"
          autoSize={{ minRows: 1, maxRows: 4 }}
          style={{ minWidth: 0 }}
          disabled={!isSocketConnected}
        />
        <Button
          size="large"
          icon={<SmileOutlined />}
          aria-label="Open emoji picker"
          title="Open emoji picker"
          onClick={() => setIsEmojiPickerOpen((prev) => !prev)}
          disabled={!isSocketConnected || isAttachmentUploading}
        />
        <Button
          type="primary"
          onClick={handleSendClick}
          disabled={!draft.trim() || !isSocketConnected}
        >
          Send
        </Button>
      </div>
      {isEmojiPickerOpen ? (
        <div style={{ width: "100%" }}>
          <EmojiPicker
            onEmojiClick={(emojiData) => appendEmoji(emojiData)}
            lazyLoadEmojis
            searchDisabled={false}
            skinTonesDisabled={false}
            width="100%"
            height={360}
          />
        </div>
      ) : null}
      <AntdModal
        title="Send media"
        open={isMediaModalOpen}
        onCancel={closeMediaModal}
        destroyOnHidden
        className="media-compose-modal"
        footer={[
          <Button key="cancel" onClick={closeMediaModal}>
            Cancel
          </Button>,
          <Button
            key="add-more"
            onClick={() => {
              photoVideoInputRef.current?.click();
            }}
            disabled={!isSocketConnected || isAttachmentUploading}
          >
            Add more
          </Button>,
          <Button
            key="send"
            type="primary"
            onClick={() => {
              void handleSendPendingMedia();
            }}
            disabled={
              pendingMediaFiles.length === 0 ||
              !isSocketConnected ||
              isAttachmentUploading
            }
            loading={isAttachmentUploading}
          >
            Send media
          </Button>,
        ]}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
              gap: "8px",
              maxHeight: "320px",
              overflowY: "auto",
            }}
          >
            {pendingMediaFiles.map((item) => (
              <div
                key={item.id}
                style={{
                  position: "relative",
                  border: "1px solid var(--mess-soft-border)",
                  borderRadius: "8px",
                  overflow: "hidden",
                  background: "var(--mess-shell-bg)",
                }}
              >
                {item.file.type.startsWith("video/") ? (
                  <video
                    src={item.previewUrl}
                    style={{ width: "100%", height: "120px", objectFit: "cover", display: "block" }}
                    muted
                  />
                ) : (
                  <Image
                    src={item.previewUrl}
                    alt={item.file.name}
                    preview={false}
                    style={{ width: "100%", height: "120px", objectFit: "cover", display: "block" }}
                  />
                )}
                <Button
                  size="small"
                  danger
                  onClick={() => removePendingMediaFile(item.id)}
                  style={{ position: "absolute", top: "6px", right: "6px" }}
                >
                  Delete
                </Button>
              </div>
            ))}
          </div>
          <TextArea
            value={mediaCaptionDraft}
            onChange={(event) => setMediaCaptionDraft(event.target.value)}
            placeholder="Add caption"
            autoSize={{ minRows: 2, maxRows: 5 }}
            disabled={!isSocketConnected || isAttachmentUploading}
          />
        </div>
      </AntdModal>
    </div>
  );
}
