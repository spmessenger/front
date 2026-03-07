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
  return (
    <div onClick={() => onClick(chat)} style={{ cursor: "pointer" }}>
      <Flex gap={10} style={{ margin: "8px" }}>
        {chat.avatar ?? <Avatar size={48} src={chat.avatar_url} alt={chat.title} />}
        <Flex justify="space-between" vertical>
          <Text strong>{chat.title}</Text>
          <Text type="secondary">{"last message"}</Text>
        </Flex>
        <Flex vertical gap={4} wrap style={{ marginLeft: "auto" }} align="end">
          <Text type="secondary">12:00</Text>
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
