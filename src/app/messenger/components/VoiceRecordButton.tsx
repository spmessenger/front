"use client";

import React from "react";
import { Button } from "antd";
import { AudioOutlined, StopOutlined } from "@ant-design/icons";

interface VoiceRecordButtonProps {
  isVoiceRecording: boolean;
  isVoiceRecordingLocked: boolean;
  disabled: boolean;
  onBeginHold: () => void;
  onEndHold: () => void;
  onLockRecording: () => void;
  onCancelRecording: () => void;
}

export default function VoiceRecordButton({
  isVoiceRecording,
  isVoiceRecordingLocked,
  disabled,
  onBeginHold,
  onEndHold,
  onLockRecording,
  onCancelRecording,
}: VoiceRecordButtonProps) {
  const isKeyboardHoldActiveRef = React.useRef(false);
  const isPointerHoldActiveRef = React.useRef(false);
  const pointerStartYRef = React.useRef<number | null>(null);
  const pointerStartXRef = React.useRef<number | null>(null);
  const lockSentRef = React.useRef(false);

  const LOCK_THRESHOLD_PX = 54;
  const CANCEL_THRESHOLD_PX = 72;

  const maybeLockByY = React.useCallback(
    (currentY: number) => {
      if (!isPointerHoldActiveRef.current || lockSentRef.current || isVoiceRecordingLocked) {
        return;
      }
      const startY = pointerStartYRef.current;
      if (startY === null) {
        return;
      }
      if (startY - currentY >= LOCK_THRESHOLD_PX) {
        lockSentRef.current = true;
        isPointerHoldActiveRef.current = false;
        pointerStartYRef.current = null;
        onLockRecording();
      }
    },
    [isVoiceRecordingLocked, onLockRecording],
  );

  const maybeCancelByX = React.useCallback(
    (currentX: number) => {
      if (!isPointerHoldActiveRef.current || lockSentRef.current || isVoiceRecordingLocked) {
        return;
      }
      const startX = pointerStartXRef.current;
      if (startX === null) {
        return;
      }
      if (startX - currentX >= CANCEL_THRESHOLD_PX) {
        lockSentRef.current = true;
        isPointerHoldActiveRef.current = false;
        pointerStartYRef.current = null;
        pointerStartXRef.current = null;
        onCancelRecording();
      }
    },
    [isVoiceRecordingLocked, onCancelRecording],
  );

  const releasePointerHold = React.useCallback(() => {
    if (!isPointerHoldActiveRef.current) {
      return;
    }
    isPointerHoldActiveRef.current = false;
    pointerStartYRef.current = null;
    pointerStartXRef.current = null;
    if (!isVoiceRecordingLocked && !lockSentRef.current) {
      onEndHold();
    }
    lockSentRef.current = false;
  }, [isVoiceRecordingLocked, onEndHold]);

  React.useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      maybeLockByY(event.clientY);
      maybeCancelByX(event.clientX);
    };
    const handleTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch) {
        return;
      }
      maybeLockByY(touch.clientY);
      maybeCancelByX(touch.clientX);
    };
    const handleMouseUp = () => {
      releasePointerHold();
    };
    const handleTouchEnd = () => {
      releasePointerHold();
    };
    const handleTouchCancel = () => {
      releasePointerHold();
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("touchend", handleTouchEnd);
    window.addEventListener("touchcancel", handleTouchCancel);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("touchcancel", handleTouchCancel);
    };
  }, [maybeCancelByX, maybeLockByY, releasePointerHold]);

  return (
    <Button
      size="large"
      icon={isVoiceRecording ? <StopOutlined /> : <AudioOutlined />}
      aria-label={
        isVoiceRecording
          ? "Recording voice message"
          : "Hold to record voice message"
      }
      title={
        isVoiceRecording
          ? (isVoiceRecordingLocked ? "Click to stop recording" : "Release to send")
          : "Hold to record. Swipe up to lock or left to cancel."
      }
      className={isVoiceRecording ? "voice-record-button-active" : undefined}
      onMouseDown={(event) => {
        event.preventDefault();
        isPointerHoldActiveRef.current = true;
        pointerStartYRef.current = event.clientY;
        pointerStartXRef.current = event.clientX;
        lockSentRef.current = false;
        onBeginHold();
      }}
      onMouseUp={(event) => {
        event.preventDefault();
        releasePointerHold();
      }}
      onTouchStart={(event) => {
        event.preventDefault();
        const touch = event.touches[0];
        isPointerHoldActiveRef.current = true;
        pointerStartYRef.current = touch ? touch.clientY : null;
        pointerStartXRef.current = touch ? touch.clientX : null;
        lockSentRef.current = false;
        onBeginHold();
      }}
      onTouchEnd={(event) => {
        event.preventDefault();
        releasePointerHold();
      }}
      onTouchCancel={(event) => {
        event.preventDefault();
        releasePointerHold();
      }}
      onKeyDown={(event) => {
        if (event.repeat || (event.key !== " " && event.key !== "Enter")) {
          return;
        }
        event.preventDefault();
        if (isKeyboardHoldActiveRef.current) {
          return;
        }
        isKeyboardHoldActiveRef.current = true;
        onBeginHold();
      }}
      onKeyUp={(event) => {
        if (event.key !== " " && event.key !== "Enter") {
          return;
        }
        event.preventDefault();
        if (!isKeyboardHoldActiveRef.current) {
          return;
        }
        isKeyboardHoldActiveRef.current = false;
        if (!isVoiceRecordingLocked) {
          onEndHold();
        }
      }}
      onClick={(event) => {
        event.preventDefault();
        if (isVoiceRecording && isVoiceRecordingLocked) {
          onEndHold();
        }
      }}
      disabled={disabled}
      danger={isVoiceRecording}
    />
  );
}
