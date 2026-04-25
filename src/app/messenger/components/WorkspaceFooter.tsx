"use client";

import React from "react";
import { Footer } from "antd/lib/layout/layout";
import MessageComposer from "./MessageComposer";
import type { ChatMessageType } from "@/lib/types";
import type { AttachmentPickerKind } from "../types";
import { useSelectedChat } from "@/hooks/features/messenger/chats";

interface WorkspaceFooterProps {
  isAttachmentUploading: boolean;
  replyTarget: ChatMessageType | null;
  onCancelReply: () => void;
  onSendMessage: (text: string) => boolean;
  onSendAttachment: (file: File, kind: AttachmentPickerKind) => Promise<void>;
  onSendAttachmentBatch: (files: File[], caption: string) => Promise<void>;
}

export default function WorkspaceFooter({
  isAttachmentUploading,
  replyTarget,
  onCancelReply,
  onSendMessage,
  onSendAttachment,
  onSendAttachmentBatch,
}: WorkspaceFooterProps) {
  const selectedChat = useSelectedChat();
  return (
    <Footer
      style={{
        background: "var(--mess-header)",
        padding: "16px 24px",
        borderTop: "3px solid var(--line)",
      }}
    >
      {selectedChat ? (
        <MessageComposer
          key={selectedChat.id}
          isAttachmentUploading={isAttachmentUploading}
          replyTarget={replyTarget}
          onCancelReply={onCancelReply}
          onSendMessage={onSendMessage}
          onSendAttachment={onSendAttachment}
          onSendAttachmentBatch={onSendAttachmentBatch}
        />
      ) : (
        "No active chat"
      )}
    </Footer>
  );
}
