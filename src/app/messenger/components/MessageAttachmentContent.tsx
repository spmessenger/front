import React from "react";
import { Button, Image, Progress, Typography } from "antd";
import { RedoOutlined } from "@ant-design/icons";
import { isGroupedMediaMessage } from "../utils";
import type { ChatMessageType } from "@/lib/types";
import VoiceMessageAttachment from "./messages/VoiceMessageAttachment";

const { Text } = Typography;

type MessageAttachmentContentProps = {
  chatMessage: ChatMessageType;
  hasMediaGroup: boolean;
  mediaGroupMessages: ChatMessageType[];
  activeVoiceMessageId: number | null;
  voicePlaybackByMessageId: Record<number, { currentTime: number; duration: number }>;
  formatVoiceTime: (seconds: number) => string;
  toggleVoiceMessagePlayback: (messageId: number) => void;
  registerVoiceAudioElement: (messageId: number, node: HTMLAudioElement | null) => void;
  getVoiceAudioHandlers: (messageId: number) => React.AudioHTMLAttributes<HTMLAudioElement>;
  handleOpenAttachment: (message: ChatMessageType) => Promise<void>;
  handleRetryAttachment: (messageId: number) => Promise<void>;
};

export default function MessageAttachmentContent({
  chatMessage,
  hasMediaGroup,
  mediaGroupMessages,
  activeVoiceMessageId,
  voicePlaybackByMessageId,
  formatVoiceTime,
  toggleVoiceMessagePlayback,
  registerVoiceAudioElement,
  getVoiceAudioHandlers,
  handleOpenAttachment,
  handleRetryAttachment,
}: MessageAttachmentContentProps) {
  if (!chatMessage.attachment) {
    return null;
  }

  return (
    <div style={{ marginBottom: chatMessage.text.trim() ? "8px" : 0 }}>
      {hasMediaGroup ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: mediaGroupMessages.length > 1 ? "repeat(2, minmax(0, 1fr))" : "minmax(0, 1fr)",
            gap: "2px",
            width: "min(420px, 100%)",
            borderRadius: "12px",
            overflow: "hidden",
          }}
        >
          {mediaGroupMessages.map((mediaMessage) => (
            <div
              key={mediaMessage.id}
              style={{
                position: "relative",
                borderRadius: "8px",
                overflow: "hidden",
                background: "rgba(0,0,0,0.08)",
              }}
            >
              {mediaMessage.content_type === "image" && mediaMessage.attachment?.url ? (
                <Image
                  src={mediaMessage.attachment.url}
                  alt={mediaMessage.attachment.original_name}
                  width={132}
                  style={{
                    display: "block",
                    width: "100%",
                    aspectRatio: "1 / 1",
                    objectFit: "cover",
                  }}
                  preview={mediaMessage.attachment.status !== "pending"}
                />
              ) : mediaMessage.content_type === "video" && mediaMessage.attachment?.url ? (
                <video
                  src={mediaMessage.attachment.url}
                  onClick={() => {
                    void handleOpenAttachment(mediaMessage);
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    aspectRatio: "1 / 1",
                    objectFit: "cover",
                    cursor: "pointer",
                  }}
                />
              ) : null}
            </div>
          ))}
        </div>
      ) : chatMessage.content_type === "image" && chatMessage.attachment.url ? (
        <Image
          src={chatMessage.attachment.url}
          alt={chatMessage.attachment.original_name}
          width={320}
          style={{
            display: "block",
            width: "min(320px, 100%)",
            maxHeight: "360px",
            objectFit: "cover",
            borderRadius: "10px",
          }}
          preview={chatMessage.attachment.status !== "pending"}
        />
      ) : chatMessage.content_type === "video" && chatMessage.attachment.url ? (
        <div
          style={{
            width: "100%",
            borderRadius: "10px",
            overflow: "hidden",
            background: "#000000",
          }}
        >
          <video
            src={chatMessage.attachment.url}
            controls
            style={{
              display: "block",
              width: "100%",
              height: "auto",
              maxHeight: "360px",
              objectFit: "contain",
              background: "#000000",
            }}
          />
        </div>
      ) : chatMessage.content_type === "voice" && chatMessage.attachment.url ? (
        <VoiceMessageAttachment
          messageId={chatMessage.id}
          attachmentUrl={chatMessage.attachment.url}
          isPending={chatMessage.attachment.status === "pending"}
          isActive={activeVoiceMessageId === chatMessage.id}
          currentTime={voicePlaybackByMessageId[chatMessage.id]?.currentTime ?? 0}
          duration={
            voicePlaybackByMessageId[chatMessage.id]?.duration
            ?? chatMessage.attachment.duration_seconds
            ?? 0
          }
          formatVoiceTime={formatVoiceTime}
          onTogglePlayback={toggleVoiceMessagePlayback}
          onRegisterAudioElement={registerVoiceAudioElement}
          getVoiceAudioHandlers={getVoiceAudioHandlers}
        />
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <Button
            size="small"
            onClick={() => {
              void handleOpenAttachment(chatMessage);
            }}
            disabled={chatMessage.attachment.status === "pending"}
          >
            {chatMessage.attachment.original_name}
          </Button>
          {chatMessage.attachment.status === "pending" ? (
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Progress
                type="circle"
                percent={chatMessage.attachment.upload_progress ?? 0}
                size={22}
                showInfo={false}
                strokeWidth={14}
              />
              <Text style={{ color: "var(--mess-muted-text)", fontSize: "12px" }}>
                {`Uploading ${chatMessage.attachment.upload_progress ?? 0}%`}
              </Text>
            </div>
          ) : null}
          {chatMessage.attachment.status === "failed" ? (
            <Button
              size="small"
              icon={<RedoOutlined />}
              onClick={() => {
                void handleRetryAttachment(chatMessage.id);
              }}
            >
              Retry
            </Button>
          ) : null}
        </div>
      )}
      {!hasMediaGroup &&
      chatMessage.attachment.status === "pending" &&
      isGroupedMediaMessage(chatMessage) ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            marginTop: "6px",
          }}
        >
          <Progress
            type="circle"
            percent={chatMessage.attachment.upload_progress ?? 0}
            size={22}
            showInfo={false}
            strokeWidth={14}
          />
          <Text
            style={{
              color: "var(--mess-muted-text)",
              fontSize: "12px",
            }}
          >
            {`Uploading ${chatMessage.attachment.upload_progress ?? 0}%`}
          </Text>
        </div>
      ) : null}
    </div>
  );
}
