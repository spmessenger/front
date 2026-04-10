import { Button, Flex } from "antd";
import { SettingOutlined } from "@ant-design/icons";
import ChatGroupItem from "./ChatGroupItem";

export interface ChatGroupType {
  id: number;
  title: string;
  unread_messages_count: number;
}

interface ChatGroupsListProps {
  groups: ChatGroupType[];
  selectedGroupId: number | null;
  onSelectGroup?: (groupId: number) => void;
  onOpenGroupSettings?: () => void;
}

export default function ChatGroupsList({
  groups,
  selectedGroupId,
  onSelectGroup,
  onOpenGroupSettings,
}: ChatGroupsListProps) {
  return (
    <Flex vertical align="center" gap="10px" style={{ padding: "10px 0" }}>
      {groups.map((group) => (
        <ChatGroupItem
          key={group.id}
          group={group}
          isActive={selectedGroupId === group.id}
          onSelect={onSelectGroup}
        />
      ))}
      <Button
        type="text"
        size="small"
        icon={<SettingOutlined />}
        title="Group settings"
        aria-label="Group settings"
        onClick={onOpenGroupSettings}
        style={{ color: "#fff" }}
      />
    </Flex>
  );
}
