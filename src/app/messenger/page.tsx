"use client";
import React, { Fragment } from "react";
import { Button, Input, Layout, Typography, message as antdMessage } from "antd";
import { CheckOutlined, LoadingOutlined, SmileOutlined } from "@ant-design/icons";
import { Content, Header, Footer } from "antd/lib/layout/layout";
import Sider from "antd/lib/layout/Sider";
import EmojiPicker, { type EmojiClickData } from "emoji-picker-react";
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

type ChatSocketResponse =
  | {
      type: "messages";
      chat_id: number;
      messages: ChatMessageApiType[];
    }
  | {
      type: "message";
      message: ChatMessageApiType & {
        client_message_id?: string | null;
      };
    }
  | {
      type: "error";
      detail: string;
      chat_id?: number;
    };

function mapApiMessage(message: ChatMessageApiType): ChatMessageType {
  return {
    id: message.id,
    chat_id: message.chat_id,
    text: message.content,
    created_at: new Date(message.created_at_timestamp * 1000).toISOString(),
    is_own: message.is_own,
    delivery_status: "delivered",
  };
}

function createClientMessageId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  };

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function Messenger() {
  const chats = useChats();
  const setChats = useChatsSetter();
  const selectedChat = useSelectedChat();
  const setSelectedChat = useSelectedChatSetter();
  const selectedChatId = selectedChat?.id ?? null;
  const selectedMessages = useChatMessages(selectedChatId);
  const setChatMessages = useChatMessagesSetter();
  const [draft, setDraft] = React.useState("");
  const [isMessagesLoading, setIsMessagesLoading] = React.useState(false);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = React.useState(false);
  const [isSocketConnected, setIsSocketConnected] = React.useState(false);
  const socketRef = React.useRef<WebSocket | null>(null);
  const pendingDeliveryTimeoutsRef = React.useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  React.useEffect(() => {
    MessengerApi.getChats().then((res) => setChats(res.data));
  }, [setChats]);

  React.useEffect(() => {
    const socket = MessengerApi.getMessagesSocket();
    socketRef.current = socket;

    socket.onopen = () => {
      setIsSocketConnected(true);
    };

    socket.onclose = () => {
      setIsSocketConnected(false);
      setIsMessagesLoading(false);
    };

    socket.onerror = () => {
      antdMessage.error("WebSocket connection failed.");
    };

    socket.onmessage = (event) => {
      const payload = JSON.parse(event.data) as ChatSocketResponse;

      if (payload.type === "error") {
        setIsMessagesLoading(false);
        antdMessage.error(payload.detail);
        return;
      }

      if (payload.type === "messages") {
        setChatMessages((current) => ({
          ...current,
          [payload.chat_id]: payload.messages.map(mapApiMessage),
        }));
        setIsMessagesLoading(false);
        return;
      }

      const nextMessage = mapApiMessage(payload.message);
      setChatMessages((current) => {
        const existingMessages = current[nextMessage.chat_id] ?? [];

        if (payload.message.client_message_id) {
          const timeoutId = pendingDeliveryTimeoutsRef.current.get(payload.message.client_message_id);
          if (timeoutId) {
            clearTimeout(timeoutId);
            pendingDeliveryTimeoutsRef.current.delete(payload.message.client_message_id);
          }

          const optimisticMessageIndex = existingMessages.findIndex(
            (existingMessage) =>
              existingMessage.client_message_id === payload.message.client_message_id &&
              (existingMessage.delivery_status === "pending" ||
                existingMessage.delivery_status === "delivered"),
          );

          if (optimisticMessageIndex !== -1) {
            const updatedMessages = [...existingMessages];
            updatedMessages[optimisticMessageIndex] = nextMessage;
            return {
              ...current,
              [nextMessage.chat_id]: updatedMessages,
            };
          }
        }

        if (existingMessages.some((existingMessage) => existingMessage.id === nextMessage.id)) {
          return current;
        }
        return {
          ...current,
          [nextMessage.chat_id]: [...existingMessages, nextMessage],
        };
      });
      setChats((currentChats) =>
        currentChats.map((chat) =>
          chat.id === nextMessage.chat_id
            ? {
                ...chat,
                last_message: nextMessage.text,
                last_message_at: nextMessage.created_at,
              }
            : chat,
        ),
      );
    };

    return () => {
      pendingDeliveryTimeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
      pendingDeliveryTimeoutsRef.current.clear();
      socket.close();
      socketRef.current = null;
    };
  }, [setChatMessages, setChats]);

  React.useEffect(() => {
    setDraft("");
    setIsEmojiPickerOpen(false);
  }, [selectedChatId]);

  React.useEffect(() => {
    if (selectedChatId === null || !isSocketConnected) {
      return;
    }

    setIsMessagesLoading(true);
    socketRef.current?.send(
      JSON.stringify({
        action: "get_messages",
        chat_id: selectedChatId,
      }),
    );
  }, [selectedChatId, isSocketConnected]);

  function handleSendMessage() {
    const text = draft.trim();

    if (selectedChatId === null || !text) {
      return;
    }

    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      antdMessage.error("WebSocket is not connected.");
      return;
    }

    const clientMessageId = createClientMessageId();
    const optimisticMessage: ChatMessageType = {
      id: -Date.now(),
      chat_id: selectedChatId,
      text,
      created_at: new Date().toISOString(),
      is_own: true,
      delivery_status: "delivered",
      client_message_id: clientMessageId,
    };
    setChatMessages((current) => ({
      ...current,
      [selectedChatId]: [...(current[selectedChatId] ?? []), optimisticMessage],
    }));
    setChats((currentChats) =>
      currentChats.map((chat) =>
        chat.id === selectedChatId
          ? {
              ...chat,
              last_message: text,
              last_message_at: optimisticMessage.created_at,
            }
          : chat,
      ),
    );

    socketRef.current.send(
      JSON.stringify({
        action: "send_message",
        chat_id: selectedChatId,
        content: text,
        client_message_id: clientMessageId,
      }),
    );

    const timeoutId = setTimeout(() => {
      setChatMessages((current) => {
        const existingMessages = current[selectedChatId] ?? [];
        const optimisticMessageIndex = existingMessages.findIndex(
          (existingMessage) => existingMessage.client_message_id === clientMessageId,
        );

        if (optimisticMessageIndex === -1) {
          return current;
        }

        const optimisticMessageToUpdate = existingMessages[optimisticMessageIndex];
        if (optimisticMessageToUpdate.delivery_status === "pending") {
          return current;
        }

        const updatedMessages = [...existingMessages];
        updatedMessages[optimisticMessageIndex] = {
          ...optimisticMessageToUpdate,
          delivery_status: "pending",
        };

        return {
          ...current,
          [selectedChatId]: updatedMessages,
        };
      });
      pendingDeliveryTimeoutsRef.current.delete(clientMessageId);
    }, 200);
    pendingDeliveryTimeoutsRef.current.set(clientMessageId, timeoutId);

    setDraft("");
    setIsEmojiPickerOpen(false);
  }

  function appendEmoji(emojiData: EmojiClickData) {
    setDraft((currentDraft) => `${currentDraft}${emojiData.emoji}`);
    setIsEmojiPickerOpen(false);
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
              selectedMessages.map((chatMessage) => (
                <div
                  key={chatMessage.id}
                  style={{
                    alignSelf: chatMessage.is_own ? "flex-start" : "flex-end",
                    maxWidth: "70%",
                    background: chatMessage.is_own ? "#91caff" : "#ffffff",
                    color: "#001529",
                    borderRadius: "16px",
                    padding: "10px 14px",
                    overflowWrap: "anywhere",
                    wordBreak: "break-word",
                  }}
                >
                  <div style={{ whiteSpace: "pre-wrap" }}>{chatMessage.text}</div>
                  <Text
                    style={{
                      display: "block",
                      marginTop: "6px",
                      color: "rgba(0, 21, 41, 0.65)",
                      fontSize: "12px",
                    }}
                  >
                    {new Date(chatMessage.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {chatMessage.is_own ? (
                      chatMessage.delivery_status === "pending" ? (
                        <LoadingOutlined style={{ marginLeft: "6px" }} spin />
                      ) : (
                        <CheckOutlined style={{ marginLeft: "6px" }} />
                      )
                    ) : null}
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
                flexDirection: "column",
                gap: "10px",
                minWidth: 0,
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  alignItems: "flex-end",
                  minWidth: 0,
                }}
              >
                <Button
                  size="large"
                  icon={<SmileOutlined />}
                  aria-label="Open emoji picker"
                  title="Open emoji picker"
                  onClick={() => setIsEmojiPickerOpen((prev) => !prev)}
                  disabled={!isSocketConnected}
                />
                <TextArea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onPressEnter={(event) => {
                    if (!event.shiftKey) {
                      event.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Type a message"
                  autoSize={{ minRows: 1, maxRows: 4 }}
                  style={{ minWidth: 0 }}
                  disabled={!isSocketConnected}
                />
                <Button
                  type="primary"
                  onClick={handleSendMessage}
                  disabled={!draft.trim() || !isSocketConnected}
                >
                  Send
                </Button>
              </div>
              {isEmojiPickerOpen ? (
                <div style={{ width: "100%" }}>
                  <EmojiPicker
                    onEmojiClick={(emojiData) => appendEmoji(emojiData)}
                    lazyLoadEmojis
                    searchDisabled={false}
                    skinTonesDisabled={false}
                    width="100%"
                    height={360}
                  />
                </div>
              ) : null}
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

