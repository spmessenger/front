import React from "react";
import { Avatar, Button, Modal as AntdModal, Tooltip, Typography } from "antd";
import { CheckOutlined, EnvironmentFilled, LoadingOutlined, YoutubeFilled } from "@ant-design/icons";
import type { MessengerTheme } from "../../types";
import { parseGeoShareUrl } from "../../utils";

const { Text } = Typography;

type MessageMetaRowProps = {
  createdAt: string;
  isOwn: boolean;
  deliveryStatus: "pending" | "delivered";
  youtubeVideoId: string | null;
  geoShareUrl?: string | null;
  markerAvatarUrl?: string;
  markerInitial?: string;
  watcherCount?: number;
  messengerTheme: MessengerTheme;
  onOpenYouTubeWatchRoom: (videoId: string) => void;
};

export default function MessageMetaRow({
  createdAt,
  isOwn,
  deliveryStatus,
  youtubeVideoId,
  geoShareUrl,
  markerAvatarUrl,
  markerInitial,
  watcherCount,
  messengerTheme,
  onOpenYouTubeWatchRoom,
}: MessageMetaRowProps) {
  const [isGeoMapModalOpen, setIsGeoMapModalOpen] = React.useState(false);
  const geoPoint = parseGeoShareUrl(geoShareUrl ?? "");
  const geoEmbedUrl = React.useMemo(() => {
    if (!geoPoint) {
      return null;
    }
    const delta = 0.006;
    const { latitude, longitude } = geoPoint;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${longitude - delta}%2C${latitude - delta}%2C${longitude + delta}%2C${latitude + delta}&layer=mapnik`;
  }, [geoPoint]);

  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          marginTop: "6px",
        }}
      >
        <Text
          style={{
            color: "var(--mess-muted-text)",
            fontSize: "12px",
          }}
        >
          {new Date(createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
          {isOwn ? (
            deliveryStatus === "pending" ? (
              <LoadingOutlined style={{ marginLeft: "6px" }} spin />
            ) : (
              <CheckOutlined style={{ marginLeft: "6px" }} />
            )
          ) : null}
        </Text>
        {youtubeVideoId ? (
          <Tooltip
            title="Watch on Your side"
            classNames={{
              root:
                messengerTheme === "mono"
                  ? "youtube-tooltip youtube-tooltip-mono"
                  : "youtube-tooltip",
            }}
          >
            <Button
              type="text"
              size="small"
              icon={<YoutubeFilled />}
              aria-label="Open YouTube preview"
              onClick={(event) => {
                event.stopPropagation();
                onOpenYouTubeWatchRoom(youtubeVideoId);
              }}
              className={
                messengerTheme === "mono"
                  ? "youtube-trigger-btn youtube-trigger-btn-mono"
                  : "youtube-trigger-btn"
              }
              style={{
                height: "20px",
                minWidth: "20px",
                padding: 0,
                marginLeft: "auto",
              }}
            />
          </Tooltip>
        ) : null}
        {!youtubeVideoId && geoEmbedUrl ? (
          <Tooltip
            title="Open map"
            classNames={{
              root:
                messengerTheme === "mono"
                  ? "youtube-tooltip youtube-tooltip-mono"
                  : "youtube-tooltip",
            }}
          >
            <Button
              type="text"
              size="small"
              icon={<EnvironmentFilled />}
              aria-label="Open map in modal"
              onClick={(event) => {
                event.stopPropagation();
                setIsGeoMapModalOpen(true);
              }}
              className={
                messengerTheme === "mono"
                  ? "youtube-trigger-btn youtube-trigger-btn-mono"
                  : "youtube-trigger-btn"
              }
              style={{
                height: "20px",
                minWidth: "20px",
                padding: 0,
                marginLeft: "auto",
              }}
            />
          </Tooltip>
        ) : null}
        {typeof watcherCount === "number" ? (
          <Text style={{ color: "var(--mess-muted-text)", fontSize: "12px" }}>
            {watcherCount}
          </Text>
        ) : null}
      </div>
      {geoEmbedUrl ? (
        <AntdModal
          open={isGeoMapModalOpen}
          onCancel={() => setIsGeoMapModalOpen(false)}
          footer={null}
          title="Shared location"
          width="calc(100vw - 48px)"
          style={{ maxWidth: "calc(100vw - 48px)", top: 16 }}
          className={
            messengerTheme === "mono"
              ? "youtube-preview-modal youtube-preview-modal-mono"
              : "youtube-preview-modal"
          }
          styles={{ body: { padding: 0, height: "calc(100vh - 150px)" } }}
        >
          <div
            style={{
              position: "relative",
              width: "100%",
              height: "100%",
              background: "var(--mess-shell-bg)",
            }}
          >
            <iframe
              title="Shared location fullscreen map"
              src={geoEmbedUrl}
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
        </AntdModal>
      ) : null}
    </>
  );
}
