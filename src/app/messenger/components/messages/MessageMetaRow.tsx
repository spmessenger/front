import React from "react";
import { Button, Dropdown, Modal as AntdModal, Tooltip, Typography } from "antd";
import type { MenuProps } from "antd";
import { CheckOutlined, EnvironmentFilled, LoadingOutlined, StopOutlined, YoutubeFilled } from "@ant-design/icons";
import type { MessengerTheme } from "../../types";
import { parseGeoShareUrl } from "../../utils";
import GeoLeafletMap from "./GeoLeafletMap";

const { Text } = Typography;

type MessageMetaRowProps = {
  createdAt: string;
  isOwn: boolean;
  deliveryStatus: "pending" | "delivered";
  youtubeVideoId: string | null;
  geoShareUrl?: string | null;
  markerAvatarUrl?: string;
  markerInitial?: string;
  markerName?: string;
  watcherCount?: number;
  messengerTheme: MessengerTheme;
  isSocketConnected: boolean;
  isLiveLocationSharing: boolean;
  liveLocationRemainingLabel?: string | null;
  onStartLiveLocationShare: (durationSeconds: number | null) => void;
  onStopLiveLocationShare: () => void;
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
  markerName,
  watcherCount,
  messengerTheme,
  isSocketConnected,
  isLiveLocationSharing,
  liveLocationRemainingLabel,
  onStartLiveLocationShare,
  onStopLiveLocationShare,
  onOpenYouTubeWatchRoom,
}: MessageMetaRowProps) {
  const [isGeoMapModalOpen, setIsGeoMapModalOpen] = React.useState(false);
  const geoPoint = parseGeoShareUrl(geoShareUrl ?? "");
  const liveLocationMenuItems: MenuProps["items"] = [
    {
      key: "900",
      label: "15 minutes",
    },
    {
      key: "3600",
      label: "1 hour",
    },
    {
      key: "until_cancel",
      label: "Until cancel",
    },
  ];

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
        {!youtubeVideoId && geoPoint ? (
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
      {geoPoint ? (
        <AntdModal
          open={isGeoMapModalOpen}
          onCancel={() => setIsGeoMapModalOpen(false)}
          footer={null}
          title={(
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
              <span>Shared location</span>
              {isLiveLocationSharing ? (
                <Button
                  size="small"
                  danger
                  icon={<StopOutlined />}
                  onClick={(event) => {
                    event.stopPropagation();
                    onStopLiveLocationShare();
                  }}
                  disabled={!isSocketConnected}
                >
                  {liveLocationRemainingLabel ? `Stop (${liveLocationRemainingLabel})` : "Stop"}
                </Button>
              ) : (
                <Dropdown
                  trigger={["click"]}
                  placement="bottomRight"
                  menu={{
                    items: liveLocationMenuItems,
                    onClick: ({ key, domEvent }) => {
                      domEvent.stopPropagation();
                      if (key === "until_cancel") {
                        onStartLiveLocationShare(null);
                        return;
                      }
                      const durationSeconds = Number(key);
                      if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
                        return;
                      }
                      onStartLiveLocationShare(durationSeconds);
                    },
                  }}
                  disabled={!isSocketConnected}
                >
                  <Button
                    size="small"
                    icon={<EnvironmentFilled />}
                    onClick={(event) => {
                      event.stopPropagation();
                    }}
                    disabled={!isSocketConnected}
                  >
                    Share live
                  </Button>
                </Dropdown>
              )}
            </div>
          )}
          width="calc(100vw - 48px)"
          style={{ maxWidth: "calc(100vw - 48px)", top: 16 }}
          className={
            messengerTheme === "mono"
              ? "youtube-preview-modal youtube-preview-modal-mono"
              : "youtube-preview-modal"
          }
          styles={{ body: { padding: 0, height: "calc(100vh - 150px)" } }}
        >
          {isGeoMapModalOpen ? (
            <GeoLeafletMap
              latitude={geoPoint.latitude}
              longitude={geoPoint.longitude}
              markerName={markerName || "User"}
              markerAvatarUrl={markerAvatarUrl}
              markerInitial={markerInitial}
              sentAtIso={createdAt}
              height="100%"
              zoom={16}
              interactive
            />
          ) : null}
        </AntdModal>
      ) : null}
    </>
  );
}
