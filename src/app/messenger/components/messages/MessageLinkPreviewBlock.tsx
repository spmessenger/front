import React from "react";
import { Avatar, Image, Typography } from "antd";
import { EnvironmentFilled, YoutubeFilled } from "@ant-design/icons";
import { parseGeoShareUrl, shortenText } from "../../utils";

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
  markerAvatarUrl?: string;
  markerInitial?: string;
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
  markerAvatarUrl,
  markerInitial,
}: MessageLinkPreviewBlockProps) {
  const geoPoint = parseGeoShareUrl(messageUrl);
  if (geoPoint) {
    const { latitude, longitude, accuracyMeters } = geoPoint;
    const delta = 0.006;
    const embedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${longitude - delta}%2C${latitude - delta}%2C${longitude + delta}%2C${latitude + delta}&layer=mapnik`;

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
            Location
          </Text>
          <Text
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              color: "var(--mess-text)",
              fontWeight: 600,
              lineHeight: 1.3,
            }}
          >
            <EnvironmentFilled />
            Shared location
          </Text>
          <Text
            style={{
              color: "var(--mess-muted-text)",
              fontSize: "12px",
              display: "block",
              marginTop: "2px",
            }}
          >
            {`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`}
            {typeof accuracyMeters === "number"
              ? ` - Accuracy ${Math.round(accuracyMeters)}m`
              : ""}
          </Text>
        </div>
        <div
          style={{
            position: "relative",
            width: "100%",
            maxWidth: "420px",
            height: "190px",
            background: "var(--mess-shell-bg)",
          }}
        >
          <iframe
            title="Shared location map"
            src={embedUrl}
            loading="lazy"
            style={{
              display: "block",
              width: "100%",
              height: "100%",
              border: 0,
              background: "var(--mess-shell-bg)",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -100%)",
              pointerEvents: "none",
              filter: "drop-shadow(0 3px 6px rgba(0,0,0,0.35))",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <Avatar
                size={42}
                src={markerAvatarUrl}
                icon={!markerAvatarUrl ? <EnvironmentFilled /> : undefined}
                style={{
                  border: "3px solid var(--mess-accent)",
                  background: "var(--mess-own-bubble)",
                  color: "var(--mess-text)",
                }}
              >
                {markerInitial}
              </Avatar>
              <span
                style={{
                  width: 0,
                  height: 0,
                  borderLeft: "7px solid transparent",
                  borderRight: "7px solid transparent",
                  borderTop: "10px solid var(--mess-accent)",
                  marginTop: "-1px",
                }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

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
