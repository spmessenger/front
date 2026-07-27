"use client";

import React, { Fragment } from "react";
import { Dropdown, Typography } from "antd";
import type { MenuProps } from "antd";
import type { ChatMessageType, ChatType, WatchRoomType } from "@/lib/types";
import type { MessengerTheme } from "../../types";
import MessageAttachmentContent from "../MessageAttachmentContent";
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
} from "../../utils";
import ForwardedMessageBlock from "./ForwardedMessageBlock";
import MessageLinkPreviewBlock from "./MessageLinkPreviewBlock";
import MessageMetaRow from "./MessageMetaRow";
import MessageTextBlock from "./MessageTextBlock";
import ReplyReferenceBlock from "./ReplyReferenceBlock";

const { Text } = Typography;

type LinkPreviewByUrl = Record<
  string,
  {
    url: string;
    title?: string;
    description?: string;
    imageUrl?: string;
    siteName?: string;
    youtubeVideoId?: string;
  }
>;

type MessageProps = {
  chatMessage: ChatMessageType;
  index: number;
  messages: ChatMessageType[];
  messagesById: Map<number, ChatMessageType>;
  selectedChat: ChatType;
  selectedChatId: number | null;
  selectedChatLiveRemainingLabel: string | null;
  selectedChatLiveStatus:
    | {
        isActive: boolean;
        expiresAt: number | null;
      }
    | null
    | undefined;
  handleStopLiveLocationShare: () => void;
  setReplyTarget: (message: ChatMessageType | null) => void;
  handleOpenForwardModal: (message: ChatMessageType) => void;
  handleDeleteMessage: (messageId: number) => Promise<void>;
  messageElementsRef: React.MutableRefObject<Map<number, HTMLDivElement>>;
  highlightedMessageId: number | null;
  activeVoiceMessageId: number | null;
  voicePlaybackByMessageId: Record<
    number,
    { currentTime: number; duration: number }
  >;
  formatVoiceTime: (seconds: number) => string;
  toggleVoiceMessagePlayback: (messageId: number) => void;
  registerVoiceAudioElement: (
    messageId: number,
    element: HTMLAudioElement | null,
  ) => void;
  getVoiceAudioHandlers: (
    messageId: number,
  ) => React.AudioHTMLAttributes<HTMLAudioElement>;
  handleOpenAttachment: (message: ChatMessageType) => Promise<void>;
  handleRetryAttachment: (messageId: number) => Promise<void>;
  currentUserAvatarUrl: string | undefined;
  currentUsername: string | null;
  handleScrollToMessage: (messageId: number) => void;
  handleStartLiveLocationShare: (durationSeconds: number | null) => void;
  messengerTheme: MessengerTheme;
  linkPreviewByUrl: LinkPreviewByUrl;
  watchRoomsByKey: Record<string, WatchRoomType>;
  onClickYouTubeMetaButton: (messageId: number, youtubeVideoId: string) => void;
};

export default function Message({
  chatMessage,
  index,
  messages,
  messagesById,
  selectedChat,
  selectedChatId,
  selectedChatLiveRemainingLabel,
  selectedChatLiveStatus,
  handleStopLiveLocationShare,
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
  messengerTheme,
  linkPreviewByUrl,
  watchRoomsByKey,
  onClickYouTubeMetaButton,
}: MessageProps) {
  const previousMessage = messages[index - 1];
  const shouldShowDateDivider =
    !previousMessage ||
    !isSameCalendarDay(previousMessage.created_at, chatMessage.created_at);
  const referencedMessage = chatMessage.reference_message_id
    ? messagesById.get(chatMessage.reference_message_id)
    : null;
  const referenceAuthor = referencedMessage
    ? resolveMessageAuthor(referencedMessage, selectedChat.title)
    : (chatMessage.reference_author ?? "User");
  const referenceContent = referencedMessage
    ? shortenText(referencedMessage.text)
    : shortenText(chatMessage.reference_content ?? "Message");
  const hasReference = Boolean(chatMessage.reference_message_id);
  const hasForwarded = Boolean(chatMessage.forwarded_from_message_id);
  const forwarderName = resolveMessageAuthor(chatMessage, selectedChat.title);
  const forwardedSourceAuthor =
    chatMessage.forwarded_from_author ?? "Unknown";
  const forwardedSourceContent = chatMessage.forwarded_from_content
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
  const isMediaGroupCandidate = isGroupedMediaMessage(chatMessage);
  const messageUrls = extractUrls(chatMessage.text);
  const primaryMessageUrl = messageUrls[0] ?? null;
  const youtubeVideoId =
    chatMessage.metadata?.youtube?.youtube_video_id ??
    extractYouTubeVideoId(chatMessage.text);
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
      ? watchRoomsByKey[watchRoomMapKey(selectedChatId, youtubeVideoId)]
      : undefined;
  const attachmentGroupId = chatMessage.attachment_group_id;
  const previousIsSameMediaGroup =
    isMediaGroupCandidate &&
    Boolean(
      attachmentGroupId &&
        previousMessage &&
        previousMessage.attachment_group_id === attachmentGroupId &&
        isGroupedMediaMessage(previousMessage),
    );

  if (previousIsSameMediaGroup) {
    return null;
  }

  const mediaGroupMessages: ChatMessageType[] = [chatMessage];
  if (isMediaGroupCandidate && attachmentGroupId) {
    for (let nextIndex = index + 1; nextIndex < messages.length; nextIndex += 1) {
      const candidate = messages[nextIndex];
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
    <Fragment>
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
              messageElementsRef.current.set(chatMessage.id, element);
            } else {
              messageElementsRef.current.delete(chatMessage.id);
            }
          }}
          style={{
            alignSelf: chatMessage.is_own ? "flex-start" : "flex-end",
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
            transition: "outline-color 0.25s ease, box-shadow 0.25s ease",
          }}
        >
          {hasReference ? (
            <ReplyReferenceBlock
              referenceAuthor={referenceAuthor}
              referenceContent={referenceContent}
              referenceMessageId={chatMessage.reference_message_id}
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
            toggleVoiceMessagePlayback={toggleVoiceMessagePlayback}
            registerVoiceAudioElement={registerVoiceAudioElement}
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
                  : selectedChat.avatar_url
              }
              markerInitial={
                chatMessage.is_own
                  ? (currentUsername?.slice(0, 1).toUpperCase() ?? "Y")
                  : (selectedChat.title?.slice(0, 1).toUpperCase() ?? "U")
              }
              markerName={
                chatMessage.is_own
                  ? (currentUsername ?? "You")
                  : (selectedChat.title ?? "User")
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
              chatMessage.is_own ? currentUserAvatarUrl : selectedChat.avatar_url
            }
            markerInitial={
              chatMessage.is_own
                ? (currentUsername?.slice(0, 1).toUpperCase() ?? "Y")
                : (selectedChat.title?.slice(0, 1).toUpperCase() ?? "U")
            }
            markerName={
              chatMessage.is_own
                ? (currentUsername ?? "You")
                : (selectedChat.title ?? "User")
            }
            watcherCount={watchRoomSummary?.viewer_count}
            isLiveLocationSharing={Boolean(selectedChatLiveStatus?.isActive)}
            liveLocationRemainingLabel={selectedChatLiveRemainingLabel}
            onStartLiveLocationShare={handleStartLiveLocationShare}
            onStopLiveLocationShare={() => handleStopLiveLocationShare()}
            onOpenYouTubeWatchRoom={() => {
              onClickYouTubeMetaButton(chatMessage.id, youtubeVideoId);
            }}
          />
        </div>
      </Dropdown>
    </Fragment>
  );
}
