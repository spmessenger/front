/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { Fragment } from "react";
import { Dropdown, Image, Typography } from "antd";
import { InboxOutlined, LoadingOutlined } from "@ant-design/icons";
import { Content } from "antd/lib/layout/layout";
import type { MenuProps } from "antd";
import type { ChatMessageType, WatchRoomType } from "@/lib/types";
import {
  extractUrls,
  extractYouTubeVideoId,
  extractYouTubeVideoIdFromUrl,
  formatCalendarDay,
  isGroupedMediaMessage,
  isSameCalendarDay,
  resolveMessageAuthor,
  shortenText,
  watchRoomMapKey,
} from "../utils";
import ChatExpensesPanel from "./ChatExpensesPanel";
import ForwardedMessageBlock from "./messages/ForwardedMessageBlock";
import MessageAttachmentContent from "./MessageAttachmentContent";
import MessageLinkPreviewBlock from "./messages/MessageLinkPreviewBlock";
import MessageMetaRow from "./messages/MessageMetaRow";
import MessageTextBlock from "./messages/MessageTextBlock";
import ReplyReferenceBlock from "./messages/ReplyReferenceBlock";
import { useLinkPreviews } from "../hooks/useLinkPreviews";
import { ENABLE_EXPENSE_SPLIT_FEATURE } from "../constants";
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
  handleOpenYouTubeWatchRoom: (videoId: string) => Promise<void>;
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
  handleOpenYouTubeWatchRoom,
  isResizingExpensesPanelRef,
}: WorkspaceContentProps) {
  const selectedChat = useSelectedChat();
  const selectedChatId = useSelectedChatId();
  const selectedMessages = useChatMessages(selectedChatId);
  const selectedMessagesById = React.useMemo(() => {
    const messagesById = new Map<number, ChatMessageType>();
    selectedMessages.forEach((message) => {
      messagesById.set(message.id, message);
    });
    return messagesById;
  }, [selectedMessages]);
  const messengerTheme = useMessengerTheme();
  const setIsMessagesNearBottom = useIsMessagesNearBottomSetter();
  const watchRoomsByKey: Record<string, WatchRoomType> = useWatchRoomsByKey();
  const { linkPreviewByUrl } = useLinkPreviews(selectedMessages);
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
            "Loading messages..."
          ) : selectedMessages.length > 0 ? (
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
                {selectedMessages.map((chatMessage, index) => {
                  const previousMessage = selectedMessages[index - 1];
                  const shouldShowDateDivider =
                    !previousMessage ||
                    !isSameCalendarDay(
                      previousMessage.created_at,
                      chatMessage.created_at,
                    );
                  const referencedMessage = chatMessage.reference_message_id
                    ? selectedMessagesById.get(chatMessage.reference_message_id)
                    : null;
                  const referenceAuthor = referencedMessage
                    ? resolveMessageAuthor(
                        referencedMessage,
                        selectedChat?.title,
                      )
                    : (chatMessage.reference_author ?? "User");
                  const referenceContent = referencedMessage
                    ? shortenText(referencedMessage.text)
                    : shortenText(chatMessage.reference_content ?? "Message");
                  const hasReference = Boolean(
                    chatMessage.reference_message_id,
                  );
                  const hasForwarded = Boolean(
                    chatMessage.forwarded_from_message_id,
                  );
                  const forwarderName = resolveMessageAuthor(
                    chatMessage,
                    selectedChat?.title,
                  );
                  const forwardedSourceAuthor =
                    chatMessage.forwarded_from_author ?? "Unknown";
                  const forwardedSourceContent =
                    chatMessage.forwarded_from_content
                      ? shortenText(chatMessage.forwarded_from_content, 240)
                      : "";
                  const messageMenuItems: MenuProps["items"] = [
                    {
                      key: "answer",
                      label: "Answer",
                    },
                    // {  // TODO: implement forwarding
                    //   key: "forward",
                    //   label: "Forward",
                    // },
                    ...(chatMessage.is_own
                      ? [
                          {
                            key: "delete",
                            label: "Delete",
                            danger: true,
                          },
                        ]
                      : []),
                  ];
                  const isMediaGroupCandidate =
                    isGroupedMediaMessage(chatMessage);
                  const messageUrls = extractUrls(chatMessage.text);
                  const primaryMessageUrl = messageUrls[0] ?? null;
                  const youtubeVideoId = extractYouTubeVideoId(
                    chatMessage.text,
                  );
                  const primaryLinkPreview = primaryMessageUrl
                    ? linkPreviewByUrl[primaryMessageUrl]
                    : undefined;
                  const primaryPreviewUrl =
                    primaryLinkPreview?.url ?? primaryMessageUrl ?? "";
                  const primaryMessageUrlHost = primaryPreviewUrl
                    ? new URL(primaryPreviewUrl).hostname.replace(/^www\./, "")
                    : null;
                  const primaryYouTubeVideoId =
                    primaryLinkPreview?.youtubeVideoId ??
                    (primaryMessageUrl
                      ? extractYouTubeVideoIdFromUrl(primaryMessageUrl)
                      : null);
                  const watchRoomSummary =
                    selectedChatId !== null && youtubeVideoId
                      ? watchRoomsByKey[
                          watchRoomMapKey(selectedChatId, youtubeVideoId)
                        ]
                      : undefined;
                  const attachmentGroupId = chatMessage.attachment_group_id;
                  const previousIsSameMediaGroup =
                    isMediaGroupCandidate &&
                    Boolean(
                      attachmentGroupId &&
                      previousMessage &&
                      previousMessage.attachment_group_id ===
                        attachmentGroupId &&
                      isGroupedMediaMessage(previousMessage),
                    );
                  if (previousIsSameMediaGroup) {
                    return null;
                  }

                  const mediaGroupMessages: ChatMessageType[] = [chatMessage];
                  if (isMediaGroupCandidate && attachmentGroupId) {
                    for (
                      let nextIndex = index + 1;
                      nextIndex < selectedMessages.length;
                      nextIndex += 1
                    ) {
                      const candidate = selectedMessages[nextIndex];
                      if (
                        candidate.attachment_group_id !== attachmentGroupId ||
                        !isGroupedMediaMessage(candidate)
                      ) {
                        break;
                      }
                      mediaGroupMessages.push(candidate);
                    }
                  }
                  const hasMediaGroup = mediaGroupMessages.length > 1;
                  const isSingleVideoAttachment =
                    !hasMediaGroup &&
                    chatMessage.content_type === "video" &&
                    Boolean(chatMessage.attachment?.url);

                  return (
                    <Fragment key={chatMessage.id}>
                      {shouldShowDateDivider ? (
                        <div
                          style={{
                            position: "sticky",
                            top: 0,
                            zIndex: 2,
                            background: "var(--mess-date-bg)",
                            padding: "6px 0",
                            textAlign: "center",
                          }}
                        >
                          <Text style={{ color: "var(--mess-muted-text)" }}>
                            {formatCalendarDay(chatMessage.created_at)}
                          </Text>
                        </div>
                      ) : null}
                      <Dropdown
                        trigger={["contextMenu"]}
                        menu={{
                          items: messageMenuItems,
                          onClick: ({ key, domEvent }) => {
                            domEvent.stopPropagation();
                            if (key === "answer") {
                              setReplyTarget(chatMessage);
                              return;
                            }
                            if (key === "forward") {
                              handleOpenForwardModal(chatMessage);
                              return;
                            }
                            if (key === "delete") {
                              void handleDeleteMessage(chatMessage.id);
                            }
                          },
                        }}
                      >
                        <div
                          ref={(element) => {
                            if (element) {
                              messageElementsRef.current.set(
                                chatMessage.id,
                                element,
                              );
                            } else {
                              messageElementsRef.current.delete(chatMessage.id);
                            }
                          }}
                          style={{
                            alignSelf: chatMessage.is_own
                              ? "flex-start"
                              : "flex-end",
                            display: "inline-flex",
                            flexDirection: "column",
                            width: isSingleVideoAttachment ? "340px" : "auto",
                            maxWidth: isSingleVideoAttachment ? "100%" : "70%",
                            background: chatMessage.is_own
                              ? "var(--mess-own-bubble)"
                              : "var(--mess-other-bubble)",
                            color: "var(--mess-text)",
                            fontFamily:
                              messengerTheme === "mono"
                                ? "var(--font-geist-mono), monospace"
                                : "var(--font-pixel), monospace",
                            borderRadius: "16px",
                            padding: "10px 14px",
                            overflowWrap: "anywhere",
                            wordBreak: "break-word",
                            cursor: "context-menu",
                            outline:
                              highlightedMessageId === chatMessage.id
                                ? "2px solid var(--mess-highlight)"
                                : "2px solid transparent",
                            boxShadow:
                              highlightedMessageId === chatMessage.id
                                ? "0 0 0 4px var(--mess-highlight-glow)"
                                : "none",
                            transition:
                              "outline-color 0.25s ease, box-shadow 0.25s ease",
                          }}
                        >
                          {hasReference ? (
                            <ReplyReferenceBlock
                              referenceAuthor={referenceAuthor}
                              referenceContent={referenceContent}
                              referenceMessageId={
                                chatMessage.reference_message_id
                              }
                              onScrollToMessage={handleScrollToMessage}
                            />
                          ) : null}
                          {hasForwarded ? (
                            <ForwardedMessageBlock
                              forwarderName={forwarderName}
                              forwardedSourceAuthor={forwardedSourceAuthor}
                              forwardedSourceContent={forwardedSourceContent}
                              forwardedSourceAuthorAvatarUrl={
                                chatMessage.forwarded_from_author_avatar_url
                              }
                            />
                          ) : null}
                          <MessageAttachmentContent
                            chatMessage={chatMessage}
                            hasMediaGroup={hasMediaGroup}
                            mediaGroupMessages={mediaGroupMessages}
                            activeVoiceMessageId={activeVoiceMessageId}
                            voicePlaybackByMessageId={voicePlaybackByMessageId}
                            formatVoiceTime={formatVoiceTime}
                            toggleVoiceMessagePlayback={
                              toggleVoiceMessagePlayback
                            }
                            registerVoiceAudioElement={
                              registerVoiceAudioElement
                            }
                            getVoiceAudioHandlers={getVoiceAudioHandlers}
                            handleOpenAttachment={handleOpenAttachment}
                            handleRetryAttachment={handleRetryAttachment}
                          />
                          <MessageTextBlock
                            text={chatMessage.text}
                            messengerTheme={messengerTheme}
                          />
                          {primaryMessageUrl ? (
                            <MessageLinkPreviewBlock
                              messageUrl={primaryMessageUrl}
                              previewUrl={primaryPreviewUrl}
                              messageUrlHost={primaryMessageUrlHost}
                              title={primaryLinkPreview?.title}
                              description={primaryLinkPreview?.description}
                              imageUrl={primaryLinkPreview?.imageUrl}
                              siteName={primaryLinkPreview?.siteName}
                              youtubeVideoId={primaryYouTubeVideoId}
                              markerAvatarUrl={
                                chatMessage.is_own
                                  ? currentUserAvatarUrl
                                  : selectedChat?.avatar_url
                              }
                              markerInitial={
                                chatMessage.is_own
                                  ? (currentUsername
                                      ?.slice(0, 1)
                                      .toUpperCase() ?? "Y")
                                  : (selectedChat?.title
                                      ?.slice(0, 1)
                                      .toUpperCase() ?? "U")
                              }
                              markerName={
                                chatMessage.is_own
                                  ? (currentUsername ?? "You")
                                  : (selectedChat?.title ?? "User")
                              }
                              sentAtIso={chatMessage.created_at}
                            />
                          ) : null}
                          <MessageMetaRow
                            createdAt={chatMessage.created_at}
                            isOwn={chatMessage.is_own}
                            deliveryStatus={chatMessage.delivery_status}
                            youtubeVideoId={youtubeVideoId}
                            geoShareUrl={primaryMessageUrl}
                            markerAvatarUrl={
                              chatMessage.is_own
                                ? currentUserAvatarUrl
                                : selectedChat?.avatar_url
                            }
                            markerInitial={
                              chatMessage.is_own
                                ? (currentUsername?.slice(0, 1).toUpperCase() ??
                                  "Y")
                                : (selectedChat?.title
                                    ?.slice(0, 1)
                                    .toUpperCase() ?? "U")
                            }
                            markerName={
                              chatMessage.is_own
                                ? (currentUsername ?? "You")
                                : (selectedChat?.title ?? "User")
                            }
                            watcherCount={watchRoomSummary?.viewer_count}
                            isLiveLocationSharing={Boolean(
                              selectedChatLiveStatus?.isActive,
                            )}
                            liveLocationRemainingLabel={
                              selectedChatLiveRemainingLabel
                            }
                            onStartLiveLocationShare={
                              handleStartLiveLocationShare
                            }
                            onStopLiveLocationShare={() =>
                              handleStopLiveLocationShare()
                            }
                            onOpenYouTubeWatchRoom={(videoId) => {
                              void handleOpenYouTubeWatchRoom(videoId);
                            }}
                          />
                        </div>
                      </Dropdown>
                    </Fragment>
                  );
                })}
              </Image.PreviewGroup>
            </Fragment>
          ) : (
            "No messages yet. Send the first one."
          )
        ) : (
          "Choose a chat from the list to start messaging."
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
