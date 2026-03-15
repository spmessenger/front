import React from "react";
import Text from "antd/lib/typography/Text";
import type { ChatType } from "./types";
import { Avatar, Badge, Flex } from "antd";
import { HomeFilled } from "@ant-design/icons";

interface ChatItemProps {
  chat: ChatType & { avatar?: React.ReactNode };
  onClick: (chat: ChatType) => void;
}

export default function ChatItemContainer(props: ChatItemProps) {
  return <ChatItem {...props} />;
}

function PrivateChatItem(props: ChatItemProps) {
  props.chat.title = "Избранное";
  props.chat.avatar = <Avatar size={48} icon={<HomeFilled />} />;
  return <GeneralChatItem {...props} />;
}

function GeneralChatItem({ chat, onClick }: ChatItemProps) {
  const previewText = (chat.last_message ?? "No messages yet").replace(/\s+/g, " ").trim();
  const previewTime = chat.last_message_at
    ? new Date(chat.last_message_at).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <div onClick={() => onClick(chat)} style={{ cursor: "pointer" }}>
      <Flex gap={10} style={{ margin: "8px", minWidth: 0 }}>
        {chat.avatar ?? <Avatar size={48} src={chat.avatar_url} alt={chat.title} />}
        <Flex justify="space-between" vertical style={{ minWidth: 0, flex: 1 }}>
          <Text strong ellipsis style={{ display: "block" }}>
            {chat.title}
          </Text>
          <Text
            type="secondary"
            ellipsis={{ tooltip: previewText }}
            style={{ display: "block", maxWidth: "100%" }}
          >
            {previewText}
          </Text>
        </Flex>
        <Flex
          vertical
          gap={4}
          wrap
          style={{ marginLeft: "auto", flexShrink: 0, minWidth: "52px" }}
          align="end"
        >
          <Text type="secondary">{previewTime}</Text>
          <Badge count={1} />
        </Flex>
      </Flex>
    </div>
  );
}

function ChatItem(props: ChatItemProps) {
  let ChatI;

  switch (props.chat.type) {
    case "private":
      ChatI = PrivateChatItem;
      break;
    default:
      ChatI = GeneralChatItem;
  }
  return <ChatI {...props} />;
}
