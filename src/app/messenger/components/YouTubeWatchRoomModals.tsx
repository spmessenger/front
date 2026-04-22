"use client";

import React from "react";
import { Avatar, Button, Dropdown, Input, Modal as AntdModal, Popover, Typography } from "antd";
import type { MenuProps } from "antd";
import { CheckOutlined, LoadingOutlined, SmileOutlined } from "@ant-design/icons";
import type { ContactType, WatchRoomChatMessageType, WatchRoomType } from "@/lib/types";
import type { MessengerTheme } from "../types";

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
  currentUserId: number | null;
  isSocketConnected: boolean;
  isWatchRoomInviteModalOpen: boolean;
  watchRoomInviteUserId: number | null;
  availableUsers: ContactType[];
  onCloseWatchRoom: () => void;
  onSyncTargetSelect: (targetUserId: number) => void;
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
  currentUserId,
  isSocketConnected,
  isWatchRoomInviteModalOpen,
  watchRoomInviteUserId,
  availableUsers,
  onCloseWatchRoom,
  onSyncTargetSelect,
  onOpenInviteModal,
  onCloseInviteModal,
  onInviteUserSelect,
  onInviteConfirm,
  onSendWatchRoomChatMessage,
  onSendWatchRoomReaction,
  handleYouTubePlayerHostRef,
}: YouTubeWatchRoomModalsProps) {
  const reactionEmojiSet = React.useMemo(() => ["👍", "❤️", "😂", "😮", "🔥", "👏"], []);
  const inviteableUsers = availableUsers.filter((user) => !activeWatchRoom?.viewer_user_ids.includes(user.id));
  const syncMenuItems = syncTargetMenuItems ?? [];
  const [watchRoomChatDraft, setWatchRoomChatDraft] = React.useState("");
  const watchRoomChatMessagesRef = React.useRef<HTMLDivElement | null>(null);
  const visibleViewerItems = watchRoomViewerItems.slice(0, 7);
  const hiddenViewerCount = Math.max(0, watchRoomViewerItems.length - visibleViewerItems.length);

  React.useEffect(() => {
    if (!youtubePreviewVideoId) {
      setWatchRoomChatDraft("");
    }
  }, [youtubePreviewVideoId]);

  React.useEffect(() => {
    const node = watchRoomChatMessagesRef.current;
    if (!node) {
      return;
    }
    node.scrollTop = node.scrollHeight;
  }, [watchRoomChatMessages]);

  const submitWatchRoomChat = React.useCallback(() => {
    const content = watchRoomChatDraft.trim();
    if (!content || !isSocketConnected) {
      return;
    }
    onSendWatchRoomChatMessage(content);
    setWatchRoomChatDraft("");
  }, [isSocketConnected, onSendWatchRoomChatMessage, watchRoomChatDraft]);

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
              style={{
                display: "flex",
                gap: "12px",
                alignItems: "stretch",
                flexWrap: "nowrap",
              }}
            >
              <div
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
                  src={`https://www.youtube.com/embed/${youtubePreviewVideoId}?autoplay=0&rel=0`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
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
                {!isYouTubePlayerUsable && !isYouTubeApiBlocked ? (
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
              </div>
              <div
                className={
                  messengerTheme === "mono"
                    ? "watch-room-chat-panel watch-room-chat-panel-mono"
                    : "watch-room-chat-panel"
                }
                style={{ flex: "0 0 300px", maxWidth: "360px" }}
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
