import { List } from "antd";
import ChatGroupItem from "./ChatGroupItem";


export default function ChatGroupsList() {
  return <List
    itemLayout="horizontal"
    dataSource={[{ id: 1, title: "group 1", unread_messages_count: 2 }]}
    renderItem={(item) => <ChatGroupItem group={item} />}
  />;
}
