import React from "react";
import { Button, Tooltip, Typography } from "antd";
import { CheckOutlined, LoadingOutlined, YoutubeFilled } from "@ant-design/icons";
import type { MessengerTheme } from "../../types";

const { Text } = Typography;

type MessageMetaRowProps = {
  createdAt: string;
  isOwn: boolean;
  deliveryStatus: "pending" | "delivered";
  youtubeVideoId: string | null;
  watcherCount?: number;
  messengerTheme: MessengerTheme;
  onOpenYouTubeWatchRoom: (videoId: string) => void;
};

export default function MessageMetaRow({
  createdAt,
  isOwn,
  deliveryStatus,
  youtubeVideoId,
  watcherCount,
  messengerTheme,
  onOpenYouTubeWatchRoom,
}: MessageMetaRowProps) {
  return (
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
      {typeof watcherCount === "number" ? (
        <Text style={{ color: "var(--mess-muted-text)", fontSize: "12px" }}>
          {watcherCount}
        </Text>
      ) : null}
    </div>
  );
}

