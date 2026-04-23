import React from "react";
import { renderTextWithClickableUrls } from "../../utils";
import type { MessengerTheme } from "../../types";

type MessageTextBlockProps = {
  text: string;
  messengerTheme: MessengerTheme;
};

export default function MessageTextBlock({ text, messengerTheme }: MessageTextBlockProps) {
  if (!text.trim()) {
    return null;
  }

  return (
    <div
      style={{
        whiteSpace: "pre-wrap",
        fontFamily:
          messengerTheme === "mono"
            ? "var(--font-geist-mono), monospace"
            : "var(--font-pixel), monospace",
      }}
    >
      {renderTextWithClickableUrls(text)}
    </div>
  );
}

