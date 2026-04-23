import React from "react";
import { CaretRightFilled, PauseOutlined } from "@ant-design/icons";

type VoiceMessageAttachmentProps = {
  messageId: number;
  attachmentUrl: string;
  isPending: boolean;
  isActive: boolean;
  currentTime: number;
  duration: number;
  formatVoiceTime: (seconds: number) => string;
  onTogglePlayback: (messageId: number) => void;
  onRegisterAudioElement: (messageId: number, node: HTMLAudioElement | null) => void;
  getVoiceAudioHandlers: (messageId: number) => React.AudioHTMLAttributes<HTMLAudioElement>;
};

export default function VoiceMessageAttachment({
  messageId,
  attachmentUrl,
  isPending,
  isActive,
  currentTime,
  duration,
  formatVoiceTime,
  onTogglePlayback,
  onRegisterAudioElement,
  getVoiceAudioHandlers,
}: VoiceMessageAttachmentProps) {
  return (
    <div className="voice-message-bubble">
      <button
        type="button"
        className="voice-message-toggle"
        onClick={() => onTogglePlayback(messageId)}
        disabled={isPending}
        aria-label={isActive ? "Stop voice message" : "Play voice message"}
        title={isActive ? "Stop" : "Play"}
      >
        {isActive ? <PauseOutlined /> : <CaretRightFilled />}
      </button>
      <div className="voice-message-meta">
        <span className="voice-message-label">Voice message</span>
        <div className="voice-message-progress-track" aria-hidden>
          <div
            className="voice-message-progress-fill"
            style={{
              width: `${Math.max(
                0,
                Math.min(100, ((currentTime / Math.max(duration, 0.001)) * 100)),
              )}%`,
            }}
          />
        </div>
        <span className="voice-message-time">
          {`${formatVoiceTime(currentTime)} / ${formatVoiceTime(duration)}`}
        </span>
      </div>
      <audio
        ref={(node) => {
          onRegisterAudioElement(messageId, node);
        }}
        src={attachmentUrl}
        preload="metadata"
        {...getVoiceAudioHandlers(messageId)}
        style={{ display: "none" }}
      />
    </div>
  );
}

