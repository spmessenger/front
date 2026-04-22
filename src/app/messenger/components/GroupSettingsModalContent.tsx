"use client";

import React from "react";
import { Button, Input, Select, Typography, message as antdMessage } from "antd";
import type { ChatFolderReplaceItemType, ChatFolderType, ChatType } from "@/lib/types";
import { ALL_CHATS_GROUP_TITLE } from "../constants";

const { Text } = Typography;

interface GroupSettingsModalContentProps {
  chats: ChatType[];
  groups: ChatFolderType[];
  onSave: (groups: ChatFolderReplaceItemType[]) => void;
  onCancel: () => void;
}

export default function GroupSettingsModalContent({
  chats,
  groups,
  onSave,
  onCancel,
}: GroupSettingsModalContentProps) {
  const [draftGroups, setDraftGroups] = React.useState<ChatFolderType[]>(groups);

  const selectableChats = React.useMemo(
    () => chats.filter((chat) => chat.type !== "private"),
    [chats],
  );

  function updateGroupTitle(groupId: number, title: string) {
    setDraftGroups((currentGroups) =>
      currentGroups.map((group) =>
        group.id === groupId ? { ...group, title } : group,
      ),
    );
  }

  function updateGroupChats(groupId: number, chatIds: number[]) {
    setDraftGroups((currentGroups) =>
      currentGroups.map((group) =>
        group.id === groupId ? { ...group, chat_ids: chatIds } : group,
      ),
    );
  }

  function removeGroup(groupId: number) {
    setDraftGroups((currentGroups) => currentGroups.filter((group) => group.id !== groupId));
  }

  function addGroup() {
    setDraftGroups((currentGroups) => [
      ...currentGroups,
      { id: Date.now(), title: `Group ${currentGroups.length + 1}`, chat_ids: [] },
    ]);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <Text strong>{`Default group: ${ALL_CHATS_GROUP_TITLE}`}</Text>
      {draftGroups.map((group) => (
        <div
          key={group.id}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            padding: "10px",
            border: "1px solid var(--mess-soft-border)",
            borderRadius: "8px",
          }}
        >
          <Input
            value={group.title}
            onChange={(event) => updateGroupTitle(group.id, event.target.value)}
            placeholder="Group name"
          />
          <Select
            mode="multiple"
            value={group.chat_ids}
            onChange={(nextChatIds) => updateGroupChats(group.id, nextChatIds as number[])}
            options={selectableChats.map((chat) => ({
              label: chat.title || `Chat ${chat.id}`,
              value: chat.id,
            }))}
            placeholder="Choose chats (private chats are excluded)"
            style={{ width: "100%" }}
          />
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <Button danger size="small" onClick={() => removeGroup(group.id)}>
              Remove
            </Button>
          </div>
        </div>
      ))}
      <Button onClick={addGroup}>Add group</Button>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
        <Button onClick={onCancel}>Cancel</Button>
        <Button
          type="primary"
          onClick={() => {
            const preparedGroups = draftGroups
              .map((group) => ({
                ...group,
                title: group.title.trim(),
              }))
              .filter((group) => group.title.length > 0);

            if (preparedGroups.length !== draftGroups.length) {
              antdMessage.error("Each group must have a name.");
              return;
            }

            onSave(
              preparedGroups.map((group) => ({
                title: group.title,
                chat_ids: group.chat_ids,
              })),
            );
          }}
        >
          Save
        </Button>
      </div>
    </div>
  );
}
