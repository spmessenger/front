import { Avatar, Badge, Flex } from "antd";
import { FolderFilled } from "@ant-design/icons";

interface ChatGroupItemProps {
  group: {
    id: number;
    title: string;
    unread_messages_count: number;
  };
  isActive?: boolean;
  onSelect?: (groupId: number) => void;
}

export default function ChatGroupItem({
  group,
  isActive = false,
  onSelect,
}: ChatGroupItemProps) {
  return (
    <Flex
      align="center"
      vertical
      gap={4}
      onClick={() => onSelect?.(group.id)}
      style={{
        cursor: "pointer",
        width: "100%",
        borderRadius: "8px",
        padding: "6px 2px",
        background: isActive ? "var(--mess-group-active-bg)" : "transparent",
      }}
    >
      <Badge count={group.unread_messages_count} size="small" overflowCount={99}>
        <Avatar icon={<FolderFilled />} />
      </Badge>
      <label
        className="retro-pixel-text"
        style={{
          color: "var(--mess-text)",
          fontSize: "12px",
          textAlign: "center",
          lineHeight: 1.2,
        }}
      >
        {group.title}
      </label>
    </Flex>
  );
}
