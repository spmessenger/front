"use client";

import React from "react";
import { Avatar, Button, Checkbox, Typography } from "antd";
import { HomeFilled } from "@ant-design/icons";
import type { ChatMessageType, ChatType } from "@/lib/types";
import { shortenText } from "../utils";

const { Text } = Typography;

interface ForwardMessageModalContentProps {
  chats: ChatType[];
  selectedChatId: number | null;
  sourceMessage: ChatMessageType;
  onCancel: () => void;
  onConfirm: (chatIds: number[]) => void;
}

export default function ForwardMessageModalContent({
  chats,
  selectedChatId,
  sourceMessage,
  onCancel,
  onConfirm,
}: ForwardMessageModalContentProps) {
  const [targetChatIds, setTargetChatIds] = React.useState<number[]>(
    selectedChatId !== null ? [selectedChatId] : [],
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <div
        style={{
          borderRadius: "8px",
          padding: "8px 10px",
          background: "var(--mess-soft-card-bg)",
          border: "1px solid var(--mess-soft-border)",
        }}
      >
        <Text style={{ color: "var(--mess-accent)", display: "block", marginBottom: "4px" }}>
          Message to forward
        </Text>
        <Text style={{ whiteSpace: "pre-wrap", color: "var(--mess-text)" }}>
          {shortenText(sourceMessage.text, 160)}
        </Text>
      </div>
      <div style={{ maxHeight: "320px", overflowY: "auto", paddingRight: "6px" }}>
        <Checkbox.Group
          value={targetChatIds}
          onChange={(values) => setTargetChatIds(values.map((value) => Number(value)))}
          style={{ width: "100%" }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {chats.map((chat) => (
              <label
                key={chat.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  border: "1px solid var(--mess-soft-border)",
                  borderRadius: "8px",
                  padding: "8px 10px",
                  cursor: "pointer",
                }}
              >
                <Checkbox value={chat.id} />
                <Avatar size={28} src={chat.avatar_url} icon={chat.type === "private" ? <HomeFilled /> : undefined} />
                <Text ellipsis className="retro-pixel-text" style={{ minWidth: 0 }}>
                  {chat.title || `Chat ${chat.id}`}
                </Text>
              </label>
            ))}
          </div>
        </Checkbox.Group>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
        <Button onClick={onCancel}>Cancel</Button>
        <Button
          type="primary"
          disabled={targetChatIds.length === 0}
          onClick={() => onConfirm(targetChatIds)}
        >
          Forward
        </Button>
      </div>
    </div>
  );
}
