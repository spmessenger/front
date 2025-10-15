import ListItem, { Meta } from "antd/lib/list/Item";

function PrivateChatItem({chat}) {
  return (
    <ListItem style={{ height: "68px" }}>
      <Meta
        avatar={<div>Avatar</div>}
        title={"Избранное"}
        description={chat.type}
      />
    </ListItem>
  );
}

function GeneralChatItem({chat}) {
  return (
    <ListItem style={{ height: "68px" }}>
      <Meta
        avatar={<div>Avatar</div>}
        title={chat.title}
        description={chat.type}
      />
    </ListItem>
  );
}

export default function ChatItem({chat}) {
  let ChatI;

  switch (chat.type) {
    case "private":
      ChatI = PrivateChatItem;
      break;
    default:
      ChatI = GeneralChatItem;
  }
  console.log(ChatI);
  return <ChatI chat={chat} />;
}
