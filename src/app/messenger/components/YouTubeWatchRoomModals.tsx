"use client";

import React from "react";
import { Avatar, Button, Dropdown, Input, Modal as AntdModal, Popover, Typography } from "antd";
import type { MenuProps } from "antd";
import { CheckOutlined, FullscreenExitOutlined, FullscreenOutlined, LoadingOutlined, SmileOutlined } from "@ant-design/icons";
import type { ContactType, WatchRoomChatMessageType, WatchRoomType } from "@/lib/types";
import type { MessengerTheme } from "../types";
import { API_BASE_URL } from "@/lib/config";

const { Text } = Typography;

type WatchRoomViewerItem = {
  userId: number;
  username: string;
  isCurrentUser: boolean;
};

type WatchRoomReactionView = {
  id: string;
  emoji: string;
  x_percent: number;
  y_percent: number;
};

interface YouTubeWatchRoomModalsProps {
  messengerTheme: MessengerTheme;
  youtubePreviewVideoId: string | null;
  activeWatchRoom: WatchRoomType | null;
  isWatchRoomSyncing: boolean;
  isYouTubePlayerUsable: boolean;
  isYouTubeApiBlocked: boolean;
  syncedToUserId: number | null;
  syncedToUserName: string | null;
  syncTargetMenuItems: MenuProps["items"];
  watchRoomViewerItems: WatchRoomViewerItem[];
  watchRoomChatMessages: WatchRoomChatMessageType[];
  watchRoomReactions: WatchRoomReactionView[];
  youtubeAccessMode: "direct" | "assisted";
  youtubeAssistEnabled: boolean;
  canEnableYouTubeAssist: boolean;
  currentUserId: number | null;
  isSocketConnected: boolean;
  isWatchRoomInviteModalOpen: boolean;
  watchRoomInviteUserId: number | null;
  availableUsers: ContactType[];
  onCloseWatchRoom: () => void;
  onSyncTargetSelect: (targetUserId: number) => void;
  onToggleYouTubeAssistEnabled: (enabled: boolean) => void;
  onOpenInviteModal: () => void;
  onCloseInviteModal: () => void;
  onInviteUserSelect: (userId: number) => void;
  onInviteConfirm: () => void;
  onSendWatchRoomChatMessage: (content: string) => void;
  onSendWatchRoomReaction: (emoji: string) => void;
  handleYouTubePlayerHostRef: (node: HTMLDivElement | null) => void;
}

export default function YouTubeWatchRoomModals({
  messengerTheme,
  youtubePreviewVideoId,
  activeWatchRoom,
  isWatchRoomSyncing,
  isYouTubePlayerUsable,
  isYouTubeApiBlocked,
  syncedToUserId,
  syncedToUserName,
  syncTargetMenuItems,
  watchRoomViewerItems,
  watchRoomChatMessages,
  watchRoomReactions,
  youtubeAccessMode,
  youtubeAssistEnabled,
  canEnableYouTubeAssist,
  currentUserId,
  isSocketConnected,
  isWatchRoomInviteModalOpen,
  watchRoomInviteUserId,
  availableUsers,
  onCloseWatchRoom,
  onSyncTargetSelect,
  onToggleYouTubeAssistEnabled,
  onOpenInviteModal,
  onCloseInviteModal,
  onInviteUserSelect,
  onInviteConfirm,
  onSendWatchRoomChatMessage,
  onSendWatchRoomReaction,
  handleYouTubePlayerHostRef,
}: YouTubeWatchRoomModalsProps) {
  const reactionEmojiSet = React.useMemo(() => ["\u{1F44D}", "\u2764\uFE0F", "\u{1F602}", "\u{1F62E}", "\u{1F525}", "\u{1F44F}"], []);
  const inviteableUsers = availableUsers.filter((user) => !activeWatchRoom?.viewer_user_ids.includes(user.id));
  const syncMenuItems = syncTargetMenuItems ?? [];
  const [watchRoomChatDraft, setWatchRoomChatDraft] = React.useState("");
  const [isStageFullscreen, setIsStageFullscreen] = React.useState(false);
  const [isOverlayUiVisible, setIsOverlayUiVisible] = React.useState(true);
  const [isAssistedIframeLoaded, setIsAssistedIframeLoaded] = React.useState(false);
  const [isAssistedIframeFallbackActive, setIsAssistedIframeFallbackActive] = React.useState(false);
  const assistedIframeLoadedRef = React.useRef(false);
  const watchRoomChatMessagesRef = React.useRef<HTMLDivElement | null>(null);
  const stageContainerRef = React.useRef<HTMLDivElement | null>(null);
  const overlayInactivityTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const visibleViewerItems = watchRoomViewerItems.slice(0, 7);
  const hiddenViewerCount = Math.max(0, watchRoomViewerItems.length - visibleViewerItems.length);
  const assistedIframeSrc = React.useMemo(() => {
    if (!youtubePreviewVideoId) {
      return "";
    }
    const upstreamEmbedUrl = `https://www.youtube.com/embed/${encodeURIComponent(youtubePreviewVideoId)}?autoplay=0&rel=0&playsinline=1&enablejsapi=0`;
    return `${API_BASE_URL}/api/youtube/assist/tunnel?url=${encodeURIComponent(upstreamEmbedUrl)}`;
  }, [youtubePreviewVideoId]);
  const directIframeSrc = React.useMemo(() => {
    if (!youtubePreviewVideoId) {
      return "";
    }
    return `https://www.youtube.com/embed/${youtubePreviewVideoId}?autoplay=0&rel=0&fs=0&enablejsapi=1`;
  }, [youtubePreviewVideoId]);
  const effectiveIframeSrc = React.useMemo(() => {
    if (youtubeAccessMode !== "assisted") {
      return directIframeSrc;
    }
    return isAssistedIframeFallbackActive ? directIframeSrc : assistedIframeSrc;
  }, [assistedIframeSrc, directIframeSrc, isAssistedIframeFallbackActive, youtubeAccessMode]);

  React.useEffect(() => {
    if (!youtubePreviewVideoId) {
      setWatchRoomChatDraft("");
    }
  }, [youtubePreviewVideoId]);

  React.useEffect(() => {
    if (youtubeAccessMode !== "assisted") {
      setIsAssistedIframeLoaded(false);
      setIsAssistedIframeFallbackActive(false);
      assistedIframeLoadedRef.current = false;
      return;
    }
    setIsAssistedIframeLoaded(false);
    setIsAssistedIframeFallbackActive(false);
    assistedIframeLoadedRef.current = false;
    const timeoutId = setTimeout(() => {
      setIsAssistedIframeFallbackActive((current) => (assistedIframeLoadedRef.current ? current : true));
    }, 9000);
    return () => {
      clearTimeout(timeoutId);
    };
  }, [youtubeAccessMode, youtubePreviewVideoId]);

  React.useEffect(() => {
    const node = watchRoomChatMessagesRef.current;
    if (!node) {
      return;
    }
    node.scrollTop = node.scrollHeight;
  }, [watchRoomChatMessages]);

  React.useEffect(() => {
    const handleFullscreenChange = () => {
      const stage = stageContainerRef.current;
      if (!stage) {
        setIsStageFullscreen(false);
        return;
      }
      const fullscreenElement = document.fullscreenElement;
      setIsStageFullscreen(fullscreenElement === stage);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const markOverlayUiActive = React.useCallback(() => {
    setIsOverlayUiVisible(true);
    if (overlayInactivityTimeoutRef.current) {
      clearTimeout(overlayInactivityTimeoutRef.current);
      overlayInactivityTimeoutRef.current = null;
    }
    if (!isStageFullscreen) {
      return;
    }
    overlayInactivityTimeoutRef.current = setTimeout(() => {
      setIsOverlayUiVisible(false);
    }, 2300);
  }, [isStageFullscreen]);

  React.useEffect(() => {
    if (!isStageFullscreen) {
      setIsOverlayUiVisible(true);
      if (overlayInactivityTimeoutRef.current) {
        clearTimeout(overlayInactivityTimeoutRef.current);
        overlayInactivityTimeoutRef.current = null;
      }
      return;
    }
    markOverlayUiActive();
  }, [isStageFullscreen, markOverlayUiActive]);

  React.useEffect(() => {
    if (!isStageFullscreen) {
      return;
    }

    const handleUserActivity = () => {
      markOverlayUiActive();
    };

    window.addEventListener("mousedown", handleUserActivity);
    window.addEventListener("touchstart", handleUserActivity, { passive: true });
    window.addEventListener("keydown", handleUserActivity);

    return () => {
      window.removeEventListener("mousedown", handleUserActivity);
      window.removeEventListener("touchstart", handleUserActivity);
      window.removeEventListener("keydown", handleUserActivity);
    };
  }, [isStageFullscreen, markOverlayUiActive]);

  React.useEffect(() => {
    return () => {
      if (overlayInactivityTimeoutRef.current) {
        clearTimeout(overlayInactivityTimeoutRef.current);
        overlayInactivityTimeoutRef.current = null;
      }
    };
  }, []);

  const submitWatchRoomChat = React.useCallback(() => {
    const content = watchRoomChatDraft.trim();
    if (!content || !isSocketConnected) {
      return;
    }
    onSendWatchRoomChatMessage(content);
    setWatchRoomChatDraft("");
  }, [isSocketConnected, onSendWatchRoomChatMessage, watchRoomChatDraft]);

  const toggleStageFullscreen = React.useCallback(() => {
    const stage = stageContainerRef.current;
    if (!stage) {
      return;
    }
    if (document.fullscreenElement === stage) {
      void document.exitFullscreen().catch(() => undefined);
      return;
    }
    void stage.requestFullscreen().catch(() => undefined);
  }, []);

  return (
    <>
      <AntdModal
        title="YouTube video"
        open={youtubePreviewVideoId !== null}
        onCancel={onCloseWatchRoom}
        footer={null}
        destroyOnHidden
        width="94vw"
        className={
          messengerTheme === "mono"
            ? "youtube-preview-modal watch-room-modal watch-room-modal-mono"
            : "youtube-preview-modal watch-room-modal watch-room-modal-retro"
        }
      >
        {youtubePreviewVideoId ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <Text
                className={messengerTheme === "mono" ? "watch-room-meta-text-mono" : "retro-pixel-text"}
                style={{ color: "var(--mess-muted-text)" }}
              >
                <span style={{ marginRight: "10px" }}>Viewers: {activeWatchRoom?.viewer_count ?? 1}</span>
                <span className="watch-room-viewer-avatars-inline">
                  {visibleViewerItems.map((viewer, index) => (
                    <span
                      key={viewer.userId}
                      title={viewer.isCurrentUser ? `${viewer.username} (You)` : viewer.username}
                    >
                      <Avatar
                        size={22}
                        src={availableUsers.find((user) => user.id === viewer.userId)?.avatar_url}
                        className={viewer.isCurrentUser ? "watch-room-inline-avatar watch-room-inline-avatar-self" : "watch-room-inline-avatar"}
                        style={{ marginLeft: index === 0 ? 0 : -8 }}
                      >
                        {viewer.username.slice(0, 1).toUpperCase()}
                      </Avatar>
                    </span>
                  ))}
                  {hiddenViewerCount > 0 ? (
                    <span className="watch-room-inline-avatar-overflow">+{hiddenViewerCount}</span>
                  ) : null}
                </span>
              </Text>
              <div style={{ display: "flex", gap: "8px" }}>
                <Dropdown
                  trigger={["click"]}
                  placement="bottomLeft"
                  overlayClassName={messengerTheme === "mono" ? "watch-room-sync-dropdown-mono" : undefined}
                  menu={{
                    items: syncMenuItems,
                    onClick: ({ key }) => onSyncTargetSelect(Number(key)),
                  }}
                  disabled={!activeWatchRoom || isWatchRoomSyncing || !isYouTubePlayerUsable || syncMenuItems.length === 0}
                >
                  <Button
                    className={
                      messengerTheme === "mono"
                        ? `watch-room-btn watch-room-btn-mono ${syncedToUserId !== null ? "watch-room-btn-synced watch-room-btn-synced-mono" : ""}`
                        : `watch-room-btn ${syncedToUserId !== null ? "watch-room-btn-synced" : ""}`
                    }
                    disabled={!activeWatchRoom || isWatchRoomSyncing || !isYouTubePlayerUsable || syncMenuItems.length === 0}
                  >
                    {isWatchRoomSyncing
                      ? "Syncing..."
                      : syncedToUserName
                        ? syncedToUserName
                        : "Sync"}
                  </Button>
                </Dropdown>
                <Button
                  className={messengerTheme === "mono" ? "watch-room-btn watch-room-btn-mono" : "watch-room-btn"}
                  onClick={onOpenInviteModal}
                >
                  Invite
                </Button>
                {false ? (
                  <Button
                    className={messengerTheme === "mono" ? "watch-room-btn watch-room-btn-mono" : "watch-room-btn"}
                    onClick={() => onToggleYouTubeAssistEnabled(!youtubeAssistEnabled)}
                    disabled={!canEnableYouTubeAssist}
                    title={canEnableYouTubeAssist ? "Toggle assisting mode" : "Premium required for assisting"}
                  >
                    {youtubeAssistEnabled ? "Assist On" : "Assist Off"}
                  </Button>
                ) : null}
                <Button
                  danger
                  className={messengerTheme === "mono" ? "watch-room-btn watch-room-btn-mono" : "watch-room-btn"}
                  onClick={onCloseWatchRoom}
                >
                  Leave room
                </Button>
              </div>
            </div>
            <div
              ref={stageContainerRef}
              className={
                isStageFullscreen
                  ? `watch-room-stage watch-room-stage-fullscreen ${isOverlayUiVisible ? "" : "watch-room-ui-inactive"}`
                  : "watch-room-stage"
              }
              style={{
                display: "flex",
                gap: "12px",
                alignItems: "stretch",
                flexWrap: "nowrap",
              }}
              onTouchStart={markOverlayUiActive}
            >
              <div
                className="watch-room-player-shell"
                style={{
                  position: "relative",
                  flex: "1 1 72%",
                  minWidth: 0,
                  paddingTop: "56.25%",
                  borderRadius: "10px",
                  overflow: "hidden",
                  background: "#000000",
                }}
              >
                <iframe
                  title="YouTube fallback"
                  src={effectiveIframeSrc}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                  onLoad={() => {
                    if (youtubeAccessMode === "assisted") {
                      assistedIframeLoadedRef.current = true;
                      setIsAssistedIframeLoaded(true);
                    }
                  }}
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    border: 0,
                    zIndex: 1,
                    pointerEvents: isYouTubePlayerUsable ? "none" : "auto",
                  }}
                />
                {youtubeAccessMode === "assisted" ? (
                  <div className="watch-room-access-badge">Assisted mode</div>
                ) : null}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    zIndex: 2,
                    pointerEvents: isYouTubePlayerUsable ? "auto" : "none",
                  }}
                  ref={handleYouTubePlayerHostRef}
                />
                {!isYouTubePlayerUsable && !isYouTubeApiBlocked && youtubeAccessMode !== "assisted" ? (
                  <div
                    className={
                      messengerTheme === "mono"
                        ? "youtube-player-loading-overlay youtube-player-loading-overlay-mono"
                        : "youtube-player-loading-overlay"
                    }
                  >
                    <LoadingOutlined />
                    <span>Loading player...</span>
                  </div>
                ) : null}
                <div className="watch-room-reaction-overlay">
                  {watchRoomReactions.map((reaction) => (
                    <span
                      key={reaction.id}
                      className="watch-room-reaction-bubble"
                      style={{
                        left: `${reaction.x_percent}%`,
                        top: `${reaction.y_percent}%`,
                      }}
                    >
                      {reaction.emoji}
                    </span>
                  ))}
                </div>
                <Button
                  className={messengerTheme === "mono" ? "watch-room-btn watch-room-btn-mono watch-room-player-fs-btn" : "watch-room-btn watch-room-player-fs-btn"}
                  onClick={toggleStageFullscreen}
                  title={isStageFullscreen ? "Exit fullscreen" : "Fullscreen"}
                  icon={isStageFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
                />
              </div>
              {isStageFullscreen ? (
                <div
                  className="watch-room-chat-hover-zone"
                  onMouseEnter={markOverlayUiActive}
                />
              ) : null}
              <div
                className={
                  messengerTheme === "mono"
                    ? `watch-room-chat-panel watch-room-chat-panel-mono ${isStageFullscreen ? "watch-room-chat-panel-hoverable" : ""}`
                    : `watch-room-chat-panel ${isStageFullscreen ? "watch-room-chat-panel-hoverable" : ""}`
                }
                style={{ flex: "0 0 300px", maxWidth: "360px" }}
                onMouseEnter={markOverlayUiActive}
              >
                <Text className={messengerTheme === "mono" ? "watch-room-meta-text-mono" : "retro-pixel-text"}>
                  Room chat
                </Text>
                <div className="watch-room-chat-list" ref={watchRoomChatMessagesRef}>
                  {watchRoomChatMessages.map((message) => {
                    const isOwn = currentUserId !== null && message.user_id === currentUserId;
                    return (
                      <div
                        key={message.id}
                        className={
                          messengerTheme === "mono"
                            ? `watch-room-chat-message watch-room-chat-message-mono ${isOwn ? "watch-room-chat-message-own" : ""}`
                            : `watch-room-chat-message ${isOwn ? "watch-room-chat-message-own" : ""}`
                        }
                      >
                        <div className="watch-room-chat-message-head">
                          <span>{isOwn ? "You" : message.username}</span>
                        </div>
                        <div>{message.content}</div>
                      </div>
                    );
                  })}
                  {watchRoomChatMessages.length === 0 ? (
                    <Text
                      className={messengerTheme === "mono" ? "watch-room-meta-text-mono" : "retro-pixel-text"}
                      style={{ color: "var(--mess-muted-text)" }}
                    >
                      No messages yet.
                    </Text>
                  ) : null}
                </div>
                <div className="watch-room-chat-input-row">
                  <Input
                    value={watchRoomChatDraft}
                    onChange={(event) => setWatchRoomChatDraft(event.target.value)}
                    placeholder="Write a message..."
                    maxLength={2000}
                    disabled={!isSocketConnected}
                    onPressEnter={(event) => {
                      event.preventDefault();
                      submitWatchRoomChat();
                    }}
                  />
                  <Popover
                    trigger="click"
                    placement="topRight"
                    overlayClassName={messengerTheme === "mono" ? "watch-room-reaction-popover-mono" : undefined}
                    content={(
                      <div className="watch-room-reaction-picker-column">
                        {reactionEmojiSet.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            className="watch-room-reaction-picker-item"
                            onClick={() => onSendWatchRoomReaction(emoji)}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}
                  >
                    <Button
                      className={messengerTheme === "mono" ? "watch-room-btn watch-room-btn-mono watch-room-emoji-btn" : "watch-room-btn watch-room-emoji-btn"}
                      disabled={!isSocketConnected}
                      icon={<SmileOutlined />}
                    />
                  </Popover>
                  <Button
                    type="primary"
                    disabled={!watchRoomChatDraft.trim() || !isSocketConnected}
                    onClick={submitWatchRoomChat}
                  >
                    Send
                  </Button>
                </div>
              </div>
            </div>
            <Text
              className={messengerTheme === "mono" ? "watch-room-meta-text-mono" : "retro-pixel-text"}
              style={{ color: "var(--mess-muted-text)" }}
            >
              Use Sync to align playback for everyone in the room.
            </Text>
            {isYouTubeApiBlocked ? (
              <Text style={{ color: "var(--mess-muted-text)" }}>
                YouTube player API is unavailable in this browser/session. Fallback mode is active.
              </Text>
            ) : null}
          </div>
        ) : null}
      </AntdModal>

      <AntdModal
        title="Invite Viewer"
        open={isWatchRoomInviteModalOpen}
        onCancel={onCloseInviteModal}
        destroyOnHidden
        width="94vw"
        className={
          messengerTheme === "mono"
            ? "youtube-preview-modal watch-room-modal watch-room-invite-modal watch-room-modal-mono"
            : "youtube-preview-modal watch-room-modal watch-room-invite-modal watch-room-modal-retro"
        }
        footer={[
          <Button key="cancel" onClick={onCloseInviteModal}>
            Cancel
          </Button>,
          <Button
            key="invite"
            type="primary"
            disabled={watchRoomInviteUserId === null}
            onClick={onInviteConfirm}
          >
            Invite
          </Button>,
        ]}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <Text style={{ color: "var(--mess-muted-text)" }}>
            Select a user to invite into this watch room.
          </Text>
          <div
            className={
              messengerTheme === "mono"
                ? "watch-room-invite-list watch-room-invite-list-mono"
                : "watch-room-invite-list"
            }
          >
            {inviteableUsers.map((user) => {
              const isSelected = watchRoomInviteUserId === user.id;
              return (
                <button
                  key={user.id}
                  type="button"
                  className={
                    messengerTheme === "mono"
                      ? `watch-room-invite-item watch-room-invite-item-mono ${isSelected ? "watch-room-invite-item-selected watch-room-invite-item-selected-mono" : ""}`
                      : `watch-room-invite-item ${isSelected ? "watch-room-invite-item-selected" : ""}`
                  }
                  onClick={() => onInviteUserSelect(user.id)}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                    <Avatar size={28} src={user.avatar_url}>
                      {user.username.slice(0, 1).toUpperCase()}
                    </Avatar>
                    <Text
                      className={messengerTheme === "mono" ? "watch-room-meta-text-mono" : "retro-pixel-text"}
                      style={{ margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                    >
                      {user.username}
                    </Text>
                  </div>
                  {isSelected ? <CheckOutlined /> : null}
                </button>
              );
            })}
            {inviteableUsers.length === 0 ? (
              <Text
                className={messengerTheme === "mono" ? "watch-room-meta-text-mono" : "retro-pixel-text"}
                style={{ color: "var(--mess-muted-text)" }}
              >
                No users available to invite.
              </Text>
            ) : null}
          </div>
        </div>
      </AntdModal>
    </>
  );
}

