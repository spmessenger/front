import { Avatar, Badge, Flex } from "antd";
import { FolderFilled } from "@ant-design/icons";

interface ChatGroupItemProps {
  group: {
    id: number;
    title: string;
    unread_messages_count: number;
  };
}

export default function ChatGroupItem({ group }: ChatGroupItemProps) {
  return (
    <Flex align="center" vertical>
      <Badge count={group.unread_messages_count} size="small" overflowCount={99}>
        <Avatar icon={<FolderFilled />} />
      </Badge>
      <label>{group.title}</label>
    </Flex>
  );
}
