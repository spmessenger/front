"use client";

import React from "react";
import {
  Button,
  Dropdown,
  Image,
  Input,
  Modal as AntdModal,
  Typography,
  message,
} from "antd";
import type { MenuProps } from "antd";
import {
  BoldOutlined,
  CloseOutlined,
  EnvironmentOutlined,
  FileImageOutlined,
  FileTextOutlined,
  ItalicOutlined,
  LockFilled,
  PaperClipOutlined,
  SendOutlined,
  SmileOutlined,
} from "@ant-design/icons";
import EmojiPicker, { type EmojiClickData } from "emoji-picker-react";
import type { ChatMessageType } from "@/lib/types";
import type { AttachmentPickerKind, MessengerTheme } from "../types";
import { buildGeoShareUrl, resolveMessageAuthor, shortenText } from "../utils";
import VoiceRecordButton from "./VoiceRecordButton";

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
  const pendingMediaFilesRef = React.useRef<
    Array<{ id: string; file: File; previewUrl: string }>
  >([]);
  const photoVideoInputRef = React.useRef<HTMLInputElement | null>(null);
  const documentInputRef = React.useRef<HTMLInputElement | null>(null);
  const textAreaRef = React.useRef<any>(null);
  const voiceRecorderRef = React.useRef<MediaRecorder | null>(null);
  const voiceStreamRef = React.useRef<MediaStream | null>(null);
  const voiceChunksRef = React.useRef<BlobPart[]>([]);
  const voiceTimerRef = React.useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const voiceRecordingStartedAtRef = React.useRef<number>(0);
  const shouldDiscardRecordedVoiceRef = React.useRef(false);
  const isVoiceHoldActiveRef = React.useRef(false);
  const [isVoiceRecording, setIsVoiceRecording] = React.useState(false);
  const [isVoiceRecordingLocked, setIsVoiceRecordingLocked] =
    React.useState(false);
  const [voiceRecordingSeconds, setVoiceRecordingSeconds] = React.useState(0);
  const [isGeoSharing, setIsGeoSharing] = React.useState(false);
  const shouldShowGeoHint = /\b(i\s*am\s*here|i'?m\s*here|im\s*here|я\s*(тут|здесь))\b/i.test(
    draft,
  );

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

  async function handleShareCurrentLocation() {
    if (!isSocketConnected || isGeoSharing) {
      return;
    }
    if (typeof window === "undefined" || !navigator.geolocation) {
      message.error("Geolocation is not supported in this browser.");
      return;
    }

    setIsGeoSharing(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        });
      });
      const { latitude, longitude, accuracy } = position.coords;
      const didSend = onSendMessage(
        `I am here: [Shared location](${buildGeoShareUrl(latitude, longitude, 17, accuracy)})`,
      );
      if (didSend) {
        setDraft("");
        setIsEmojiPickerOpen(false);
      }
    } catch {
      message.error("Could not get your location.");
    } finally {
      setIsGeoSharing(false);
    }
  }

  function getNativeTextArea(): HTMLTextAreaElement | null {
    return textAreaRef.current?.resizableTextArea?.textArea ?? null;
  }

  function applyInlineFormat(wrapper: string) {
    const textArea = getNativeTextArea();
    const currentText = draft;
    if (!textArea) {
      setDraft((value) => `${value}${wrapper}${wrapper}`);
      return;
    }

    const start = textArea.selectionStart ?? currentText.length;
    const end = textArea.selectionEnd ?? currentText.length;
    const selected = currentText.slice(start, end);
    const wrapped = `${wrapper}${selected}${wrapper}`;
    const next = `${currentText.slice(0, start)}${wrapped}${currentText.slice(end)}`;
    setDraft(next);

    requestAnimationFrame(() => {
      const node = getNativeTextArea();
      if (!node) {
        return;
      }
      node.focus();
      if (selected.length > 0) {
        node.setSelectionRange(start, end + wrapper.length * 2);
        return;
      }
      const caret = start + wrapper.length;
      node.setSelectionRange(caret, caret);
    });
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
      (file) =>
        file.type.startsWith("image/") || file.type.startsWith("video/"),
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

  const stopVoiceTracks = React.useCallback(() => {
    const stream = voiceStreamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    voiceStreamRef.current = null;
  }, []);

  const clearVoiceTimer = React.useCallback(() => {
    if (voiceTimerRef.current) {
      clearInterval(voiceTimerRef.current);
      voiceTimerRef.current = null;
    }
  }, []);

  const stopVoiceRecording = React.useCallback(() => {
    const recorder = voiceRecorderRef.current;
    if (!recorder) {
      return;
    }
    if (recorder.state !== "inactive") {
      try {
        recorder.requestData();
      } catch {
        // ignore requestData errors for unsupported recorder states
      }
      recorder.stop();
    }
  }, []);

  const cancelVoiceRecording = React.useCallback(() => {
    shouldDiscardRecordedVoiceRef.current = true;
    isVoiceHoldActiveRef.current = false;
    clearVoiceTimer();
    setIsVoiceRecording(false);
    setIsVoiceRecordingLocked(false);
    setVoiceRecordingSeconds(0);
    stopVoiceRecording();
  }, [clearVoiceTimer, stopVoiceRecording]);

  const startVoiceRecording = React.useCallback(async () => {
    if (!isSocketConnected || isAttachmentUploading) {
      return;
    }
    if (
      typeof window === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      message.error("Voice recording is not supported in this browser.");
      return;
    }
    if (typeof MediaRecorder === "undefined") {
      message.error("Media recorder is not available in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      voiceStreamRef.current = stream;
      voiceChunksRef.current = [];

      const preferredMimeTypes = [
        "audio/ogg;codecs=opus",
        "audio/webm;codecs=opus",
        "audio/ogg",
        "audio/webm",
        "audio/mp4",
      ];
      const mimeType = preferredMimeTypes.find((value) =>
        MediaRecorder.isTypeSupported(value),
      );
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      voiceRecorderRef.current = recorder;

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          voiceChunksRef.current.push(event.data);
        }
      };
      recorder.onstop = async () => {
        isVoiceHoldActiveRef.current = false;
        clearVoiceTimer();
        setIsVoiceRecording(false);
        setIsVoiceRecordingLocked(false);
        const recordedSeconds = Math.max(
          0,
          Math.round((Date.now() - voiceRecordingStartedAtRef.current) / 1000),
        );
        setVoiceRecordingSeconds(0);

        const chunks = voiceChunksRef.current;
        voiceChunksRef.current = [];
        stopVoiceTracks();

        if (shouldDiscardRecordedVoiceRef.current) {
          shouldDiscardRecordedVoiceRef.current = false;
          return;
        }

        if (chunks.length === 0) {
          return;
        }

        if (recordedSeconds < 1) {
          message.warning("Voice message is too short.");
          return;
        }

        const blobType = recorder.mimeType || mimeType || "audio/webm";
        const blob = new Blob(chunks, { type: blobType });
        const extension = blobType.includes("ogg")
          ? "ogg"
          : blobType.includes("mp4")
            ? "m4a"
            : blobType.includes("wav")
              ? "wav"
              : "webm";
        const file = new File([blob], `voice-${Date.now()}.${extension}`, {
          type: blob.type || blobType,
        });
        await onSendAttachment(file, "voice");
      };
      recorder.onerror = () => {
        clearVoiceTimer();
        setIsVoiceRecording(false);
        setIsVoiceRecordingLocked(false);
        setVoiceRecordingSeconds(0);
        stopVoiceTracks();
        message.error("Failed to record voice message.");
      };

      recorder.start(300);
      shouldDiscardRecordedVoiceRef.current = false;
      voiceRecordingStartedAtRef.current = Date.now();
      setVoiceRecordingSeconds(0);
      setIsVoiceRecording(true);
      clearVoiceTimer();
      voiceTimerRef.current = setInterval(() => {
        setVoiceRecordingSeconds((current) => current + 1);
      }, 1000);
    } catch {
      isVoiceHoldActiveRef.current = false;
      stopVoiceTracks();
      clearVoiceTimer();
      setIsVoiceRecording(false);
      setIsVoiceRecordingLocked(false);
      setVoiceRecordingSeconds(0);
      message.error("Microphone access denied.");
    }
  }, [
    clearVoiceTimer,
    isAttachmentUploading,
    isSocketConnected,
    onSendAttachment,
    stopVoiceTracks,
  ]);

  const beginVoiceHoldRecording = React.useCallback(() => {
    if (isVoiceRecording || isAttachmentUploading || !isSocketConnected) {
      return;
    }
    setIsVoiceRecordingLocked(false);
    isVoiceHoldActiveRef.current = true;
    void startVoiceRecording();
  }, [
    isAttachmentUploading,
    isSocketConnected,
    isVoiceRecording,
    startVoiceRecording,
  ]);

  const endVoiceHoldRecording = React.useCallback(() => {
    isVoiceHoldActiveRef.current = false;
    if (!isVoiceRecording) {
      return;
    }
    stopVoiceRecording();
  }, [isVoiceRecording, stopVoiceRecording]);

  const lockVoiceRecording = React.useCallback(() => {
    if (!isVoiceRecording) {
      return;
    }
    isVoiceHoldActiveRef.current = false;
    setIsVoiceRecordingLocked(true);
  }, [isVoiceRecording]);

  React.useEffect(() => {
    const handleGlobalVoiceRelease = () => {
      if (isVoiceHoldActiveRef.current) {
        endVoiceHoldRecording();
      }
    };

    window.addEventListener("mouseup", handleGlobalVoiceRelease);
    window.addEventListener("touchend", handleGlobalVoiceRelease);
    window.addEventListener("touchcancel", handleGlobalVoiceRelease);

    return () => {
      window.removeEventListener("mouseup", handleGlobalVoiceRelease);
      window.removeEventListener("touchend", handleGlobalVoiceRelease);
      window.removeEventListener("touchcancel", handleGlobalVoiceRelease);
    };
  }, [endVoiceHoldRecording]);

  React.useEffect(() => {
    return () => {
      pendingMediaFilesRef.current.forEach((item) =>
        URL.revokeObjectURL(item.previewUrl),
      );
      clearVoiceTimer();
      stopVoiceRecording();
      stopVoiceTracks();
    };
  }, [clearVoiceTimer, stopVoiceRecording, stopVoiceTracks]);

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
              <Text
                style={{
                  display: "block",
                  color: "var(--mess-reply-title)",
                  fontWeight: 600,
                }}
              >
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
      {shouldShowGeoHint && !isVoiceRecording ? (
        <button
          type="button"
          onClick={() => {
            void handleShareCurrentLocation();
          }}
          disabled={!isSocketConnected || isGeoSharing}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "10px",
            width: "100%",
            padding: "8px 10px",
            border: "1px solid var(--mess-soft-border)",
            borderRadius: "10px",
            background: "var(--mess-soft-card-bg)",
            color: "var(--mess-text)",
            cursor: isSocketConnected && !isGeoSharing ? "pointer" : "not-allowed",
            fontFamily:
              messengerTheme === "mono"
                ? "var(--font-geist-mono), monospace"
                : "var(--font-pixel), monospace",
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
            <EnvironmentOutlined />
            Share current location
          </span>
          <Text style={{ color: "var(--mess-muted-text)", fontSize: "12px" }}>
            {isGeoSharing ? "Locating..." : "Send map"}
          </Text>
        </button>
      ) : null}
      <div
        style={{
          display: "flex",
          gap: "12px",
          alignItems: "flex-end",
          minWidth: 0,
        }}
      >
        <Dropdown
          trigger={["hover"]}
          placement="topLeft"
          overlayClassName={
            messengerTheme === "mono" ? "messenger-mono-attach-menu" : undefined
          }
          menu={{
            items: attachmentMenuItems,
            onClick: handleAttachmentMenuClick,
          }}
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
          ref={textAreaRef}
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
          disabled={!isSocketConnected || isVoiceRecording}
        />
        {isVoiceRecording ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              minWidth: "86px",
            }}
          >
            <Text
              style={{
                color: "var(--mess-muted-text)",
                textAlign: "center",
              }}
            >
              {`REC ${Math.floor(voiceRecordingSeconds / 60)
                .toString()
                .padStart(
                  2,
                  "0",
                )}:${(voiceRecordingSeconds % 60).toString().padStart(2, "0")}`}
            </Text>
            {isVoiceRecordingLocked ? (
              <Text
                style={{
                  color: "var(--mess-accent)",
                  fontSize: "11px",
                  lineHeight: 1,
                }}
              >
                <LockFilled style={{ marginRight: "4px" }} />
                Locked
              </Text>
            ) : (
              <Text
                style={{
                  color: "var(--mess-muted-text)",
                  fontSize: "11px",
                  lineHeight: 1,
                }}
              >
                Swipe up to lock - left to cancel
              </Text>
            )}
          </div>
        ) : null}
        <Button
          size="large"
          icon={<BoldOutlined />}
          aria-label="Bold"
          title="Bold"
          onClick={() => applyInlineFormat("**")}
          disabled={!isSocketConnected || isVoiceRecording}
        />
        <Button
          size="large"
          icon={<ItalicOutlined />}
          aria-label="Italic"
          title="Italic"
          onClick={() => applyInlineFormat("*")}
          disabled={!isSocketConnected || isVoiceRecording}
        />
        <Button
          size="large"
          icon={<SmileOutlined />}
          aria-label="Open emoji picker"
          title="Open emoji picker"
          onClick={() => setIsEmojiPickerOpen((prev) => !prev)}
          disabled={!isSocketConnected || isAttachmentUploading}
        />
        {draft ? (
          <Button
            type="primary"
            size="large"
            onClick={handleSendClick}
            disabled={!draft.trim() || !isSocketConnected}
            icon={<SendOutlined />}
          />
        ) : (
          <VoiceRecordButton
            isVoiceRecording={isVoiceRecording}
            isVoiceRecordingLocked={isVoiceRecordingLocked}
            disabled={!isSocketConnected || isAttachmentUploading}
            onBeginHold={beginVoiceHoldRecording}
            onEndHold={endVoiceHoldRecording}
            onLockRecording={lockVoiceRecording}
            onCancelRecording={cancelVoiceRecording}
          />
        )}
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
                    style={{
                      width: "100%",
                      height: "120px",
                      objectFit: "cover",
                      display: "block",
                    }}
                    muted
                  />
                ) : (
                  <Image
                    src={item.previewUrl}
                    alt={item.file.name}
                    preview={false}
                    style={{
                      width: "100%",
                      height: "120px",
                      objectFit: "cover",
                      display: "block",
                    }}
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
