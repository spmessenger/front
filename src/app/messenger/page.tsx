"use client";
import React, { Fragment } from "react";
import { Layout } from "antd";
import { Content, Header, Footer } from "antd/lib/layout/layout";
import Sider from "antd/lib/layout/Sider";
import ChatsList from "./components/ChatsList";
import ChatGroupsList from "./components/ChatGroupsList";
import ControlPanel from "./components/ControlPanel";
import SearchInput from "./components/SearchInput";
import Modal from "@/components/Modal";
import MessengerApi from "@/lib/api/messenger";
import {
  useChats,
  useChatsSetter,
  useSelectedChat,
  useSelectedChatSetter,
} from "@/hooks/features/messenger/chats";

export default function Messenger() {
  const chats = useChats();
  const setChats = useChatsSetter();
  const selectedChat = useSelectedChat();
  const setSelectedChat = useSelectedChatSetter();

  React.useEffect(() => {
    MessengerApi.getChats().then((res) => setChats(res.data));
  }, [setChats]); // TODO: should be moved to a container-component

  return (
    <Fragment>
      <Sider width="5%" style={{ background: "#0c418aff" }}>
        <Header style={{ background: "#1677ff", padding: "0" }}>
          <ControlPanel />
        </Header>
        <Content>
          <ChatGroupsList />
        </Content>
      </Sider>
      <Sider width="25%" style={{ background: "#1677ff" }}>
        <Layout>
          <Header style={{ background: "#1677ff", padding: "0 10px" }}>
            <SearchInput />
          </Header>
          <Content style={{ background: "#0958d9" }}>
            <ChatsList chats={chats} onClick={(chat) => setSelectedChat(chat.id)} />
          </Content>
        </Layout>
      </Sider>
      <Layout>
        <Header style={{ background: "#4096ff" }}>
          {selectedChat?.title ?? "Select a chat"}
        </Header>
        <Content style={{ background: "#0958d9", color: "#fff", padding: "24px" }}>
          {selectedChat
            ? `Conversation: ${selectedChat.title ?? `Chat #${selectedChat.id}`}`
            : "Choose a chat from the list to start messaging."}
        </Content>
        <Footer style={{ background: "#4096ff" }}>
          {selectedChat ? "Message composer placeholder" : "No active chat"}
        </Footer>
      </Layout>
      <Modal />
    </Fragment>
  );
}
