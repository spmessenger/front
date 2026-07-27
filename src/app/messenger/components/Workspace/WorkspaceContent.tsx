/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { Fragment } from "react";
import { Image, Typography } from "antd";
import { InboxOutlined, LoadingOutlined } from "@ant-design/icons";
import { Content } from "antd/lib/layout/layout";
import type { ChatMessageType, WatchRoomType } from "@/lib/types";
import ChatExpensesPanel from "../ChatExpensesPanel";
import { Message } from "../messages";
import { useLinkPreviews } from "../../hooks";
import { ENABLE_EXPENSE_SPLIT_FEATURE } from "../../constants";
import {
  useChatMessages,
  useExpensesPanelWidth,
  useIsExpensesViewOpen,
  useIsMessagesNearBottomSetter,
  useMessengerTheme,
  useSelectedChat,
  useSelectedChatId,
  useWatchRoomsByKey,
} from "@/hooks/features/messenger/chats";
import { MessengerApi } from "@/lib";

const { Text } = Typography;

type WorkspaceContentProps = {
  messagesContainerRef: React.RefObject<HTMLDivElement | null>;
  onRequestOlderMessages: () => void;
  handleMessagesDragEnter: (event: React.DragEvent<HTMLDivElement>) => void;
  handleMessagesDragOver: (event: React.DragEvent<HTMLDivElement>) => void;
  handleMessagesDragLeave: (event: React.DragEvent<HTMLDivElement>) => void;
  handleMessagesDrop: (event: React.DragEvent<HTMLDivElement>) => Promise<void>;
  isMessagesDragOver: boolean;
  selectedChatLiveRemainingLabel: string | null;
  selectedChatLiveStatus: {
    isActive: boolean;
    expiresAt: number | null;
  } | null | undefined;
  handleStopLiveLocationShare: () => void;
  isMessagesLoading: boolean;
  isOlderMessagesLoading: boolean;
  setReplyTarget: (message: ChatMessageType | null) => void;
  handleOpenForwardModal: (message: ChatMessageType) => void;
  handleDeleteMessage: (messageId: number) => Promise<void>;
  messageElementsRef: React.MutableRefObject<Map<number, HTMLDivElement>>;
  highlightedMessageId: number | null;
  activeVoiceMessageId: number | null;
  voicePlaybackByMessageId: Record<number, any>;
  formatVoiceTime: (seconds: number) => string;
  toggleVoiceMessagePlayback: (messageId: number) => void;
  registerVoiceAudioElement: (
    messageId: number,
    element: HTMLAudioElement | null,
  ) => void;
  getVoiceAudioHandlers: (messageId: number) => React.AudioHTMLAttributes<HTMLAudioElement>;
  handleOpenAttachment: (message: ChatMessageType) => Promise<void>;
  handleRetryAttachment: (messageId: number) => Promise<void>;
  currentUserAvatarUrl: string | undefined;
  currentUsername: string | null;
  handleScrollToMessage: (messageId: number) => void;
  handleStartLiveLocationShare: (durationSeconds: number | null) => void;
  isResizingExpensesPanelRef: React.MutableRefObject<boolean>;
};

export default function WorkspaceContent({
  messagesContainerRef,
  onRequestOlderMessages,
  handleMessagesDragEnter,
  handleMessagesDragOver,
  handleMessagesDragLeave,
  handleMessagesDrop,
  isMessagesDragOver,
  selectedChatLiveRemainingLabel,
  selectedChatLiveStatus,
  handleStopLiveLocationShare,
  isMessagesLoading,
  isOlderMessagesLoading,
  setReplyTarget,
  handleOpenForwardModal,
  handleDeleteMessage,
  messageElementsRef,
  highlightedMessageId,
  activeVoiceMessageId,
  voicePlaybackByMessageId,
  formatVoiceTime,
  toggleVoiceMessagePlayback,
  registerVoiceAudioElement,
  getVoiceAudioHandlers,
  handleOpenAttachment,
  handleRetryAttachment,
  currentUserAvatarUrl,
  currentUsername,
  handleScrollToMessage,
  handleStartLiveLocationShare,
  isResizingExpensesPanelRef,
}: WorkspaceContentProps) {
  const selectedChat = useSelectedChat();
  const selectedChatId = useSelectedChatId();
  const messages = useChatMessages(selectedChatId);
  const messagesById = React.useMemo(() => {
    const messagesById = new Map<number, ChatMessageType>();
    messages.forEach((message) => {
      messagesById.set(message.id, message);
    });
    return messagesById;
  }, [messages]);
  const messengerTheme = useMessengerTheme();
  const setIsMessagesNearBottom = useIsMessagesNearBottomSetter();
  const watchRoomsByKey: Record<string, WatchRoomType> = useWatchRoomsByKey();
  const { linkPreviewByUrl } = useLinkPreviews(messages);
  const isExpensesViewOpen = useIsExpensesViewOpen();
  const expensesPanelWidth = useExpensesPanelWidth();
  const isExpenseFeatureEnabled = ENABLE_EXPENSE_SPLIT_FEATURE;
  const handleMessagesScroll = React.useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      const container = event.currentTarget;
      const threshold = 80;
      const distanceToBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight;
      setIsMessagesNearBottom(distanceToBottom <= threshold);

      const maxScrollTop = Math.max(
        container.scrollHeight - container.clientHeight,
        1,
      );
      const scrollTopShare = container.scrollTop / maxScrollTop;
      if (scrollTopShare > 0.2) {
        return;
      }

      onRequestOlderMessages();
    },
    [onRequestOlderMessages, setIsMessagesNearBottom],
  );
  const emptyStateStyle = React.useMemo<React.CSSProperties>(
    () => ({
      color: "var(--mess-muted-text)",
      display: "block",
    }),
    [],
  );

  const onClickYouTubeMetaButton = React.useCallback(
    async (messageId: number, youtubeVideoId: string) => {
      const resp = await MessengerApi.createYouTubeWatchRoom(youtubeVideoId, messageId);
      console.log(resp.data);
    },
    [],
  );

  return (
    <div style={{ display: "flex", minHeight: 0, flex: 1 }}>
      <Content
        ref={messagesContainerRef}
        onScroll={handleMessagesScroll}
        onDragEnter={handleMessagesDragEnter}
        onDragOver={handleMessagesDragOver}
        onDragLeave={handleMessagesDragLeave}
        onDrop={(event) => {
          void handleMessagesDrop(event);
        }}
        style={{
          background: "var(--mess-shell-bg)",
          color: "var(--mess-text)",
          fontFamily:
            messengerTheme === "mono"
              ? "var(--font-geist-mono), monospace"
              : "var(--font-pixel), monospace",
          padding: "24px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-start",
          gap: "12px",
          overflowY: "auto",
          overflowX: "hidden",
          minWidth: 0,
          position: "relative",
          flex: 1,
        }}
      >
        {isMessagesDragOver ? (
          <div
            style={{
              position: "absolute",
              inset: "14px",
              zIndex: 5,
              border: "2px dashed var(--mess-highlight)",
              borderRadius: "12px",
              background: "var(--mess-soft-card-bg)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
            }}
          >
            <Text
              className="retro-pixel-text"
              style={{ color: "var(--mess-text)" }}
            >
              <InboxOutlined style={{ marginRight: "8px" }} />
              Drop file to upload
            </Text>
          </div>
        ) : null}
        {selectedChat ? (
          isMessagesLoading ? (
            <Text style={emptyStateStyle}>Loading messages...</Text>
          ) : messages.length > 0 ? (
            <Fragment>
              {isOlderMessagesLoading ? (
                <LoadingOutlined
                  spin
                  style={{
                    alignSelf: "center",
                    color: "var(--mess-text)",
                  }}
                />
              ) : null}
              <Image.PreviewGroup>
                {messages.map((chatMessage, index) => (
                  <Message
                    key={chatMessage.id}
                    chatMessage={chatMessage}
                    index={index}
                    onClickYouTubeMetaButton={onClickYouTubeMetaButton}
                    messages={messages}
                    messagesById={messagesById}
                    selectedChat={selectedChat}
                    selectedChatId={selectedChatId}
                    selectedChatLiveRemainingLabel={
                      selectedChatLiveRemainingLabel
                    }
                    selectedChatLiveStatus={selectedChatLiveStatus}
                    handleStopLiveLocationShare={handleStopLiveLocationShare}
                    setReplyTarget={setReplyTarget}
                    handleOpenForwardModal={handleOpenForwardModal}
                    handleDeleteMessage={handleDeleteMessage}
                    messageElementsRef={messageElementsRef}
                    highlightedMessageId={highlightedMessageId}
                    activeVoiceMessageId={activeVoiceMessageId}
                    voicePlaybackByMessageId={voicePlaybackByMessageId}
                    formatVoiceTime={formatVoiceTime}
                    toggleVoiceMessagePlayback={toggleVoiceMessagePlayback}
                    registerVoiceAudioElement={registerVoiceAudioElement}
                    getVoiceAudioHandlers={getVoiceAudioHandlers}
                    handleOpenAttachment={handleOpenAttachment}
                    handleRetryAttachment={handleRetryAttachment}
                    currentUserAvatarUrl={currentUserAvatarUrl}
                    currentUsername={currentUsername}
                    handleScrollToMessage={handleScrollToMessage}
                    handleStartLiveLocationShare={handleStartLiveLocationShare}
                    messengerTheme={messengerTheme}
                    linkPreviewByUrl={linkPreviewByUrl}
                    watchRoomsByKey={watchRoomsByKey}
                  />
                ))}
              </Image.PreviewGroup>
            </Fragment>
          ) : (
            <Text style={emptyStateStyle}>
              No messages yet. Send the first one.
            </Text>
          )
        ) : (
          <Text style={emptyStateStyle}>
            Choose a chat from the list to start messaging.
          </Text>
        )}
      </Content>
      {isExpenseFeatureEnabled && isExpensesViewOpen ? (
        <div
          role="separator"
          aria-orientation="vertical"
          onMouseDown={(event) => {
            event.preventDefault();
            isResizingExpensesPanelRef.current = true;
            document.body.style.userSelect = "none";
            document.body.style.cursor = "col-resize";
          }}
          style={{
            width: "6px",
            cursor: "col-resize",
            background: "var(--line)",
            opacity: 0.55,
            transition: "opacity 0.15s ease",
            flexShrink: 0,
          }}
        />
      ) : null}
      <div
        style={{
          width:
            isExpenseFeatureEnabled && isExpensesViewOpen
              ? `${expensesPanelWidth}px`
              : "0px",
          transition: "width 0.2s ease",
          background: "var(--mess-shell-bg)",
          overflow: "hidden",
          minHeight: 0,
        }}
      >
        {isExpenseFeatureEnabled ? <ChatExpensesPanel /> : null}
      </div>
    </div>
  );
}
