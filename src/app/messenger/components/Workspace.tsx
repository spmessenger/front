"use client";

import React from "react";
import { Layout } from "antd";
import WorkspaceHeader from "./WorkspaceHeader";
import WorkspaceContent from "./WorkspaceContent";
import WorkspaceFooter from "./WorkspaceFooter";

type WorkspaceProps = Omit<
  React.ComponentProps<typeof WorkspaceContent>,
  | "messengerTheme"
  | "selectedChat"
  | "selectedChatId"
  | "isSocketConnected"
  | "selectedMessages"
  | "selectedMessagesById"
  | "watchRoomsByKey"
  | "isExpenseFeatureEnabled"
  | "isExpensesViewOpen"
  | "expensesPanelWidth"
> &
  Omit<React.ComponentProps<typeof WorkspaceFooter>, "selectedChat">;

export default function Workspace({
  messagesContainerRef,
  onRequestOlderMessages,
  handleMessagesDragEnter,
  handleMessagesDragOver,
  handleMessagesDragLeave,
  handleMessagesDrop,
  isMessagesDragOver,
  activeLiveLocationsForSelectedChat,
  selectedChatLiveRemainingLabel,
  selectedChatLiveStatus,
  liveLocationMenuItems,
  handleLiveLocationMenuClick,
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
  isAttachmentUploading,
  replyTarget,
  onCancelReply,
  onSendMessage,
  onSendAttachment,
  onSendAttachmentBatch,
}: WorkspaceProps) {
  return (
    <Layout
      style={{
        border: "3px solid var(--line)",
        borderRadius: "0 10px 10px 0",
        overflow: "hidden",
        height: "100%",
        minHeight: 0,
        flex: 1,
      }}
    >
      <WorkspaceHeader />
      <WorkspaceContent
        messagesContainerRef={messagesContainerRef}
        onRequestOlderMessages={onRequestOlderMessages}
        handleMessagesDragEnter={handleMessagesDragEnter}
        handleMessagesDragOver={handleMessagesDragOver}
        handleMessagesDragLeave={handleMessagesDragLeave}
        handleMessagesDrop={handleMessagesDrop}
        isMessagesDragOver={isMessagesDragOver}
        activeLiveLocationsForSelectedChat={activeLiveLocationsForSelectedChat}
        selectedChatLiveRemainingLabel={selectedChatLiveRemainingLabel}
        selectedChatLiveStatus={selectedChatLiveStatus}
        liveLocationMenuItems={liveLocationMenuItems}
        handleLiveLocationMenuClick={handleLiveLocationMenuClick}
        handleStopLiveLocationShare={handleStopLiveLocationShare}
        isMessagesLoading={isMessagesLoading}
        isOlderMessagesLoading={isOlderMessagesLoading}
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
        handleOpenYouTubeWatchRoom={handleOpenYouTubeWatchRoom}
        isResizingExpensesPanelRef={isResizingExpensesPanelRef}
      />
      <WorkspaceFooter
        isAttachmentUploading={isAttachmentUploading}
        replyTarget={replyTarget}
        onCancelReply={onCancelReply}
        onSendMessage={onSendMessage}
        onSendAttachment={onSendAttachment}
        onSendAttachmentBatch={onSendAttachmentBatch}
      />
    </Layout>
  );
}
