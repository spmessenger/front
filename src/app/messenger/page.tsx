"use client";
import React, { Fragment } from "react";
import { Button, Input, Layout, Typography, message } from "antd";
import { Content, Header, Footer } from "antd/lib/layout/layout";
import Sider from "antd/lib/layout/Sider";
import ChatsList from "./components/ChatsList";
import ChatGroupsList from "./components/ChatGroupsList";
import ControlPanel from "./components/ControlPanel";
import SearchInput from "./components/SearchInput";
import Modal from "@/components/Modal";
import MessengerApi from "@/lib/api/messenger";
import {
  useChatMessages,
  useChatMessagesSetter,
  useChats,
  useChatsSetter,
  useSelectedChat,
  useSelectedChatSetter,
} from "@/hooks/features/messenger/chats";
import type { ChatMessageApiType, ChatMessageType } from "@/lib/types";

const { Text } = Typography;
const { TextArea } = Input;

function mapApiMessage(message: ChatMessageApiType): ChatMessageType {
  return {
    id: message.id,
    chat_id: message.chat_id,
    text: message.content,
    created_at: new Date(message.created_at_timestamp * 1000).toISOString(),
    is_own: message.is_own,
  };
}

export default function Messenger() {
  const chats = useChats();
  const setChats = useChatsSetter();
  const selectedChat = useSelectedChat();
  const setSelectedChat = useSelectedChatSetter();
  const selectedMessages = useChatMessages(selectedChat?.id ?? null);
  const setChatMessages = useChatMessagesSetter();
  const [draft, setDraft] = React.useState("");
  const [isMessagesLoading, setIsMessagesLoading] = React.useState(false);
  const [isSending, setIsSending] = React.useState(false);

  React.useEffect(() => {
    MessengerApi.getChats().then((res) => setChats(res.data));
  }, [setChats]);

  React.useEffect(() => {
    setDraft("");
  }, [selectedChat?.id]);

  React.useEffect(() => {
    if (!selectedChat) {
      return;
    }

    let ignore = false;

    const fetchMessages = async () => {
      setIsMessagesLoading(true);

      try {
        const { data } = await MessengerApi.getChatMessages(selectedChat.id);

        if (ignore) {
          return;
        }

        setChatMessages((current) => ({
          ...current,
          [selectedChat.id]: data.map(mapApiMessage),
        }));
      } catch {
        if (!ignore) {
          message.error("Failed to load messages.");
        }
      } finally {
        if (!ignore) {
          setIsMessagesLoading(false);
        }
      }
    };

    void fetchMessages();

    return () => {
      ignore = true;
    };
  }, [selectedChat, setChatMessages]);

  async function handleSendMessage() {
    const text = draft.trim();

    if (!selectedChat || !text || isSending) {
      return;
    }

    setIsSending(true);

    try {
      const { data } = await MessengerApi.sendMessage(selectedChat.id, text);
      const nextMessage = mapApiMessage(data);

      setChatMessages((current) => ({
        ...current,
        [selectedChat.id]: [...(current[selectedChat.id] ?? []), nextMessage],
      }));
      setChats((currentChats) =>
        currentChats.map((chat) =>
          chat.id === selectedChat.id
            ? {
                ...chat,
                last_message: nextMessage.text,
                last_message_at: nextMessage.created_at,
              }
            : chat,
        ),
      );
      setDraft("");
    } catch {
      message.error("Failed to send message.");
    } finally {
      setIsSending(false);
    }
  }

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
        <Content
          style={{
            background: "#0958d9",
            color: "#fff",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            gap: "12px",
            overflowY: "auto",
            overflowX: "hidden",
            minWidth: 0,
          }}
        >
          {selectedChat ? (
            isMessagesLoading ? (
              "Loading messages..."
            ) : selectedMessages.length > 0 ? (
              selectedMessages.map((message) => (
                <div
                  key={message.id}
                  style={{
                    alignSelf: message.is_own ? "flex-start" : "flex-end",
                    maxWidth: "70%",
                    background: message.is_own ? "#91caff" : "#ffffff",
                    color: "#001529",
                    borderRadius: "16px",
                    padding: "10px 14px",
                    overflowWrap: "anywhere",
                    wordBreak: "break-word",
                  }}
                >
                  <div style={{ whiteSpace: "pre-wrap" }}>{message.text}</div>
                  <Text
                    style={{
                      display: "block",
                      marginTop: "6px",
                      color: "rgba(0, 21, 41, 0.65)",
                      fontSize: "12px",
                    }}
                  >
                    {new Date(message.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                </div>
              ))
            ) : (
              "No messages yet. Send the first one."
            )
          ) : (
            "Choose a chat from the list to start messaging."
          )}
        </Content>
        <Footer style={{ background: "#4096ff", padding: "16px 24px" }}>
          {selectedChat ? (
            <div
              style={{
                display: "flex",
                gap: "12px",
                alignItems: "flex-end",
                minWidth: 0,
              }}
            >
              <TextArea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onPressEnter={(event) => {
                  if (!event.shiftKey) {
                    event.preventDefault();
                    void handleSendMessage();
                  }
                }}
                placeholder="Type a message"
                autoSize={{ minRows: 1, maxRows: 4 }}
                disabled={isSending}
                style={{ minWidth: 0 }}
              />
              <Button
                type="primary"
                onClick={() => void handleSendMessage()}
                disabled={!draft.trim()}
                loading={isSending}
              >
                Send
              </Button>
            </div>
          ) : (
            "No active chat"
          )}
        </Footer>
      </Layout>
      <Modal />
    </Fragment>
  );
}
