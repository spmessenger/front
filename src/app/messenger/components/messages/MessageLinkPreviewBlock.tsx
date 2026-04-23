import React from "react";
import { Image, Typography } from "antd";
import { YoutubeFilled } from "@ant-design/icons";
import { shortenText } from "../../utils";

const { Text } = Typography;

type MessageLinkPreviewBlockProps = {
  messageUrl: string;
  previewUrl: string;
  messageUrlHost: string | null;
  title?: string;
  description?: string;
  imageUrl?: string;
  siteName?: string;
  youtubeVideoId: string | null;
};

export default function MessageLinkPreviewBlock({
  messageUrl,
  previewUrl,
  messageUrlHost,
  title,
  description,
  imageUrl,
  siteName,
  youtubeVideoId,
}: MessageLinkPreviewBlockProps) {
  return (
    <div
      onClick={(event) => {
        event.stopPropagation();
        window.open(previewUrl || messageUrl, "_blank", "noopener,noreferrer");
      }}
      style={{
        marginTop: "8px",
        borderRadius: "10px",
        border: "1px solid var(--mess-soft-border)",
        background: "var(--mess-soft-card-bg)",
        overflow: "hidden",
        cursor: "pointer",
      }}
    >
      <div style={{ padding: "8px 10px" }}>
        <Text
          style={{
            display: "block",
            color: "var(--mess-accent)",
            fontSize: "12px",
            marginBottom: "2px",
          }}
        >
          {youtubeVideoId ? "YouTube" : (siteName || messageUrlHost)}
        </Text>
        <Text
          style={{
            display: "block",
            color: "var(--mess-text)",
            fontWeight: 600,
            lineHeight: 1.3,
          }}
        >
          {title || messageUrl}
        </Text>
        {description ? (
          <Text
            style={{
              color: "var(--mess-muted-text)",
              fontSize: "12px",
              display: "block",
              marginTop: "2px",
            }}
          >
            {shortenText(description, 180)}
          </Text>
        ) : null}
      </div>
      {imageUrl || youtubeVideoId ? (
        <div style={{ position: "relative" }}>
          <Image
            src={imageUrl || `https://i.ytimg.com/vi/${youtubeVideoId}/hqdefault.jpg`}
            alt={title || "Link preview"}
            preview={false}
            style={{
              display: "block",
              width: "100%",
              maxWidth: "420px",
              aspectRatio: youtubeVideoId ? "16 / 9" : "1.91 / 1",
              objectFit: "cover",
            }}
          />
          {youtubeVideoId ? (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: "none",
              }}
            >
              <YoutubeFilled
                style={{
                  color: "#ff4d4f",
                  fontSize: "40px",
                  filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.5))",
                }}
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

