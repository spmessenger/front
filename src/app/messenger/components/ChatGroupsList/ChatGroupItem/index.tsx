import ListItem, { Meta } from "antd/lib/list/Item";

interface ChatGroupItemProps {
  group: {
    id: number;
    title: string;
    unread_messages_count: number;
  };
}

export default function ChatGroupItem({ group }: ChatGroupItemProps) {
  return (
    <ListItem>
      <Meta title={group.title} />
    </ListItem>
  );
}
