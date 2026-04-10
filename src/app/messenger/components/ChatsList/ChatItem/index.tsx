import React from "react";
import Text from "antd/lib/typography/Text";
import type { ChatType } from "./types";
import { Avatar, Badge, Dropdown, Flex } from "antd";
import { HomeFilled, PushpinOutlined, StopOutlined } from "@ant-design/icons";
import type { MenuProps } from "antd";

interface ChatItemProps {
  chat: ChatType & { avatar?: React.ReactNode };
  onClick: (chat: ChatType) => void;
  onPinChat?: (chat: ChatType) => void;
  onUnpinChat?: (chat: ChatType) => void;
}

export default function ChatItemContainer(props: ChatItemProps) {
  return <ChatItem {...props} />;
}

function PrivateChatItem(props: ChatItemProps) {
  const privateChat = {
    ...props.chat,
    title: props.chat.title ?? "?????????",
    avatar: <Avatar size={48} icon={<HomeFilled />} />,
  };
  return <GeneralChatItem {...props} chat={privateChat} />;
}

function GeneralChatItem({ chat, onClick, onPinChat, onUnpinChat }: ChatItemProps) {
  const previewText = (chat.last_message ?? "No messages yet").replace(/\s+/g, " ").trim();
  const previewTime = chat.last_message_at
    ? new Date(chat.last_message_at).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";
  const isPinned = (chat.pin_position ?? 0) > 0;
  const showPinnedIcon = chat.type !== "private" && isPinned;
  const menuItems: MenuProps["items"] =
    chat.type === "private"
      ? []
      : isPinned
        ? [
            {
              key: "unpin",
              label: "Unpin chat",
              icon: <StopOutlined />,
            },
          ]
        : [
            {
              key: "pin",
              label: "Pin chat",
              icon: <PushpinOutlined />,
            },
          ];

  const handleMenuClick: MenuProps["onClick"] = ({ key, domEvent }) => {
    domEvent.stopPropagation();
    if (key === "pin") {
      onPinChat?.(chat);
      return;
    }
    if (key === "unpin") {
      onUnpinChat?.(chat);
    }
  };

  return (
    <Dropdown
      trigger={["contextMenu"]}
      menu={{ items: menuItems, onClick: handleMenuClick }}
      disabled={menuItems.length === 0}
    >
      <div onClick={() => onClick(chat)} style={{ cursor: "pointer" }}>
        <Flex gap={10} style={{ margin: "8px", minWidth: 0 }}>
          {chat.avatar ?? <Avatar size={48} src={chat.avatar_url} alt={chat.title} />}
          <Flex justify="space-between" vertical style={{ minWidth: 0, flex: 1 }}>
            <Flex align="center" gap={6} style={{ minWidth: 0 }}>
              <Text strong ellipsis style={{ display: "block", minWidth: 0 }}>
                {chat.title}
              </Text>
              {showPinnedIcon ? (
                <PushpinOutlined
                  style={{ color: "rgba(0, 21, 41, 0.65)", fontSize: "12px" }}
                  title="Pinned"
                />
              ) : null}
            </Flex>
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
            <Badge count={chat.unread_messages_count ?? 0} />
          </Flex>
        </Flex>
      </div>
    </Dropdown>
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
