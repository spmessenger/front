import { Flex } from "antd";
import ChatGroupItem from "./ChatGroupItem";

export default function ChatGroupsList() {
  const groups = [{ id: 1, title: "group 1", unread_messages_count: 200 }, { id: 1, title: "group 1", unread_messages_count: 2 }];
  return (
    <Flex vertical align="center" gap="14px" style={{ padding: "10px 0" }}>
      {groups.map((group) => (
        <ChatGroupItem key={group.id} group={group} />
      ))}
    </Flex>
  );
}
