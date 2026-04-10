"use client";
import React, { Fragment } from "react";
import { Avatar, Button, Input, Layout, Select, Typography, message as antdMessage } from "antd";
import { CheckOutlined, HomeFilled, LoadingOutlined, SmileOutlined } from "@ant-design/icons";
import { Content, Header, Footer } from "antd/lib/layout/layout";
import Sider from "antd/lib/layout/Sider";
import EmojiPicker, { type EmojiClickData } from "emoji-picker-react";
import ChatsList from "./components/ChatsList";
import ChatGroupsList from "./components/ChatGroupsList";
import ControlPanel from "./components/ControlPanel";
import SearchInput from "./components/SearchInput";
import Modal from "@/components/Modal";
import { useModalSetter } from "@/hooks/features/ui/modal";
import MessengerApi from "@/lib/api/messenger";
import {
  useChatMessages,
  useChatMessagesSetter,
  useChats,
  useChatsSetter,
  useSelectedChat,
  useSelectedChatSetter,
} from "@/hooks/features/messenger/chats";
import type {
  ChatFolderReplaceItemType,
  ChatFolderType,
  ChatMessageApiType,
  ChatMessageType,
  ChatType,
} from "@/lib/types";

const { Text } = Typography;
const { TextArea } = Input;

type ChatSocketResponse =
  | {
      type: "messages";
      chat_id: number;
      messages: ChatMessageApiType[];
      has_more: boolean;
      request_before_message_id?: number | null;
    }
  | {
      type: "message";
      message: ChatMessageApiType & {
        client_message_id?: string | null;
      };
    }
  | {
      type: "chat_created";
      chat_id: number;
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

function isSameCalendarDay(leftIso: string, rightIso: string): boolean {
  const left = new Date(leftIso);
  const right = new Date(rightIso);
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function formatCalendarDay(iso: string): string {
  return new Date(iso).toLocaleDateString([], {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function chatLastMessageTimestamp(chat: ChatType): number {
  if (!chat.last_message_at) {
    return 0;
  }
  const parsed = Date.parse(chat.last_message_at);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function sortChatsByRules(chats: ChatType[]): ChatType[] {
  return [...chats].sort((left, right) => {
    const leftIsPrivate = left.type === "private";
    const rightIsPrivate = right.type === "private";
    if (leftIsPrivate !== rightIsPrivate) {
      return leftIsPrivate ? -1 : 1;
    }

    if (leftIsPrivate && rightIsPrivate) {
      return chatLastMessageTimestamp(right) - chatLastMessageTimestamp(left);
    }

    const leftPin = left.pin_position ?? 0;
    const rightPin = right.pin_position ?? 0;
    const leftPinned = leftPin > 0;
    const rightPinned = rightPin > 0;
    if (leftPinned !== rightPinned) {
      return leftPinned ? -1 : 1;
    }

    if (leftPinned && rightPinned) {
      if (leftPin !== rightPin) {
        return rightPin - leftPin;
      }
      return chatLastMessageTimestamp(right) - chatLastMessageTimestamp(left);
    }

    return chatLastMessageTimestamp(right) - chatLastMessageTimestamp(left);
  });
}

const ALL_CHATS_GROUP_ID = -1;
const ALL_CHATS_GROUP_TITLE = "\u0412\u0441\u0435 \u0447\u0430\u0442\u044b";

interface GroupSettingsModalContentProps {
  chats: ChatType[];
  groups: ChatFolderType[];
  onSave: (groups: ChatFolderReplaceItemType[]) => void;
  onCancel: () => void;
}

function GroupSettingsModalContent({
  chats,
  groups,
  onSave,
  onCancel,
}: GroupSettingsModalContentProps) {
  const [draftGroups, setDraftGroups] = React.useState<ChatFolderType[]>(groups);

  const selectableChats = React.useMemo(
    () => chats.filter((chat) => chat.type !== "private"),
    [chats],
  );

  function updateGroupTitle(groupId: number, title: string) {
    setDraftGroups((currentGroups) =>
      currentGroups.map((group) =>
        group.id === groupId ? { ...group, title } : group,
      ),
    );
  }

  function updateGroupChats(groupId: number, chatIds: number[]) {
    setDraftGroups((currentGroups) =>
      currentGroups.map((group) =>
        group.id === groupId ? { ...group, chat_ids: chatIds } : group,
      ),
    );
  }

  function removeGroup(groupId: number) {
    setDraftGroups((currentGroups) => currentGroups.filter((group) => group.id !== groupId));
  }

  function addGroup() {
    setDraftGroups((currentGroups) => [
      ...currentGroups,
      { id: Date.now(), title: `Group ${currentGroups.length + 1}`, chat_ids: [] },
    ]);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <Text strong>{`Default group: ${ALL_CHATS_GROUP_TITLE}`}</Text>
      {draftGroups.map((group) => (
        <div
          key={group.id}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            padding: "10px",
            border: "1px solid #f0f0f0",
            borderRadius: "8px",
          }}
        >
          <Input
            value={group.title}
            onChange={(event) => updateGroupTitle(group.id, event.target.value)}
            placeholder="Group name"
          />
          <Select
            mode="multiple"
            value={group.chat_ids}
            onChange={(nextChatIds) => updateGroupChats(group.id, nextChatIds as number[])}
            options={selectableChats.map((chat) => ({
              label: chat.title || `Chat ${chat.id}`,
              value: chat.id,
            }))}
            placeholder="Choose chats (private chats are excluded)"
            style={{ width: "100%" }}
          />
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <Button danger size="small" onClick={() => removeGroup(group.id)}>
              Remove
            </Button>
          </div>
        </div>
      ))}
      <Button onClick={addGroup}>Add group</Button>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
        <Button onClick={onCancel}>Cancel</Button>
        <Button
          type="primary"
          onClick={() => {
            const preparedGroups = draftGroups
              .map((group) => ({
                ...group,
                title: group.title.trim(),
              }))
              .filter((group) => group.title.length > 0);

            if (preparedGroups.length !== draftGroups.length) {
              antdMessage.error("Each group must have a name.");
              return;
            }

            onSave(
              preparedGroups.map((group) => ({
                title: group.title,
                chat_ids: group.chat_ids,
              })),
            );
          }}
        >
          Save
        </Button>
      </div>
    </div>
  );
}

export default function Messenger() {
  const MESSAGES_PAGE_SIZE = 30;
  const chats = useChats();
  const setChats = useChatsSetter();
  const setModal = useModalSetter();
  const selectedChat = useSelectedChat();
  const setSelectedChat = useSelectedChatSetter();
  const selectedChatId = selectedChat?.id ?? null;
  const selectedChatIdRef = React.useRef<number | null>(selectedChatId);
  const selectedMessages = useChatMessages(selectedChatId);
  const setChatMessages = useChatMessagesSetter();
  const [chatFolders, setChatFolders] = React.useState<ChatFolderType[]>([]);
  const [selectedFolderId, setSelectedFolderId] = React.useState<number>(ALL_CHATS_GROUP_ID);
  const [draft, setDraft] = React.useState("");
  const [isMessagesLoading, setIsMessagesLoading] = React.useState(false);
  const [isOlderMessagesLoading, setIsOlderMessagesLoading] = React.useState(false);
  const [hasMoreMessagesByChat, setHasMoreMessagesByChat] = React.useState<Record<number, boolean>>({});
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = React.useState(false);
  const [isSocketConnected, setIsSocketConnected] = React.useState(false);
  const socketRef = React.useRef<WebSocket | null>(null);
  const messagesContainerRef = React.useRef<HTMLDivElement | null>(null);
  const olderLoadScrollRestoreRef = React.useRef<{
    chatId: number;
    previousScrollTop: number;
    previousScrollHeight: number;
  } | null>(null);
  const stickToBottomRef = React.useRef(true);
  const pendingDeliveryTimeoutsRef = React.useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );
  const refreshChats = React.useCallback(() => {
    MessengerApi.getChats().then((res) => setChats(sortChatsByRules(res.data)));
  }, [setChats]);
  const refreshChatGroups = React.useCallback(() => {
    MessengerApi.getChatGroups()
      .then((res) => setChatFolders(res.data))
      .catch(() => {
        antdMessage.error("Failed to load chat groups.");
      });
  }, []);
  const chatsForFolders = React.useMemo(
    () => chats.filter((chat) => chat.type !== "private"),
    [chats],
  );
  const groupsForUi = React.useMemo(
    () =>
      [
        {
          id: ALL_CHATS_GROUP_ID,
          title: ALL_CHATS_GROUP_TITLE,
          unread_messages_count: chats.reduce(
            (sum, chat) => sum + (chat.unread_messages_count ?? 0),
            0,
          ),
        },
        ...chatFolders.map((folder) => ({
          id: folder.id,
          title: folder.title,
          unread_messages_count: chats.reduce((sum, chat) => {
            if (chat.type === "private" || !folder.chat_ids.includes(chat.id)) {
              return sum;
            }
            return sum + (chat.unread_messages_count ?? 0);
          }, 0),
        })),
      ],
    [chatFolders, chats],
  );
  const visibleChats = React.useMemo(() => {
    if (selectedFolderId === ALL_CHATS_GROUP_ID) {
      return sortChatsByRules(chats);
    }

    const selectedFolder = chatFolders.find((folder) => folder.id === selectedFolderId);
    if (!selectedFolder) {
      return sortChatsByRules(chats);
    }

    const chatsInFolder = chats.filter(
      (chat) => chat.type !== "private" && selectedFolder.chat_ids.includes(chat.id),
    );

    return sortChatsByRules(chatsInFolder);
  }, [chats, chatFolders, selectedFolderId]);

  const closeModal = React.useCallback(() => {
    setModal({ clear: true });
  }, [setModal]);

  const handleOpenGroupSettings = React.useCallback(() => {
    setModal({
      open: true,
      title: "Group settings",
      footer: null,
      onCancel: closeModal,
      content: (
        <GroupSettingsModalContent
          chats={chatsForFolders}
          groups={chatFolders}
          onCancel={closeModal}
          onSave={(groups) => {
            MessengerApi.replaceChatGroups(groups)
              .then((res) => {
                const nextGroups = res.data;
                setChatFolders(nextGroups);
                setSelectedFolderId((currentSelectedFolderId) => {
                  if (currentSelectedFolderId === ALL_CHATS_GROUP_ID) {
                    return currentSelectedFolderId;
                  }

                  return nextGroups.some((group) => group.id === currentSelectedFolderId)
                    ? currentSelectedFolderId
                    : ALL_CHATS_GROUP_ID;
                });
                closeModal();
              })
              .catch(() => {
                antdMessage.error("Failed to save chat groups.");
              });
          }}
        />
      ),
    });
  }, [chatFolders, chatsForFolders, closeModal, setModal]);

  const handleSelectFolder = React.useCallback((folderId: number) => {
    setSelectedFolderId(folderId);
  }, []);

  React.useEffect(() => {
    refreshChats();
    refreshChatGroups();
  }, [refreshChatGroups, refreshChats]);

  React.useEffect(() => {
    const allowedChatIds = new Set(chatsForFolders.map((chat) => chat.id));
    setChatFolders((currentFolders) =>
      currentFolders.map((folder) => ({
        ...folder,
        chat_ids: folder.chat_ids.filter((chatId) => allowedChatIds.has(chatId)),
      })),
    );
  }, [chatsForFolders]);

  React.useEffect(() => {
    selectedChatIdRef.current = selectedChatId;
  }, [selectedChatId]);

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
        const mappedMessages = payload.messages.map(mapApiMessage);
        const isOlderPage = payload.request_before_message_id !== null && payload.request_before_message_id !== undefined;
        setHasMoreMessagesByChat((current) => ({
          ...current,
          [payload.chat_id]: payload.has_more,
        }));
        setChatMessages((current) => {
          const existingMessages = current[payload.chat_id] ?? [];
          if (!isOlderPage) {
            return {
              ...current,
              [payload.chat_id]: mappedMessages,
            };
          }

          const mergedMessages = [...mappedMessages];
          existingMessages.forEach((message) => {
            if (!mergedMessages.some((existing) => existing.id === message.id)) {
              mergedMessages.push(message);
            }
          });
          mergedMessages.sort((a, b) => a.id - b.id);

          return {
            ...current,
            [payload.chat_id]: mergedMessages,
          };
        });
        if (!isOlderPage) {
          setIsMessagesLoading(false);
          requestAnimationFrame(() => {
            const container = messagesContainerRef.current;
            if (container) {
              container.scrollTop = container.scrollHeight;
            }
          });
        } else {
          setIsOlderMessagesLoading(false);
          requestAnimationFrame(() => {
            const container = messagesContainerRef.current;
            const restoreContext = olderLoadScrollRestoreRef.current;
            if (
              container &&
              restoreContext &&
              restoreContext.chatId === payload.chat_id
            ) {
              container.scrollTop =
                container.scrollHeight -
                restoreContext.previousScrollHeight +
                restoreContext.previousScrollTop;
            }
            olderLoadScrollRestoreRef.current = null;
          });
        }
        return;
      }

      if (payload.type === "chat_created") {
        void refreshChats();
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
        {
          const targetChatExists = currentChats.some((chat) => chat.id === nextMessage.chat_id);
          if (!targetChatExists) {
            void refreshChats();
            return currentChats;
          }

          const updatedChats = currentChats.map((chat) =>
            chat.id === nextMessage.chat_id
              ? {
                  ...chat,
                  last_message: nextMessage.text,
                  last_message_at: nextMessage.created_at,
                  unread_messages_count: nextMessage.is_own
                    ? chat.unread_messages_count ?? 0
                    : selectedChatIdRef.current === nextMessage.chat_id
                      ? 0
                      : (chat.unread_messages_count ?? 0) + 1,
                }
              : chat,
          );
          return sortChatsByRules(updatedChats);
        },
      );
    };

    return () => {
      pendingDeliveryTimeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
      pendingDeliveryTimeoutsRef.current.clear();
      socket.close();
      socketRef.current = null;
    };
  }, [refreshChats, setChatMessages, setChats]);

  React.useEffect(() => {
    setDraft("");
    setIsEmojiPickerOpen(false);
    setIsOlderMessagesLoading(false);
    olderLoadScrollRestoreRef.current = null;
  }, [selectedChatId]);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      setSelectedChat(null);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [setSelectedChat]);

  React.useEffect(() => {
    if (selectedChatId === null || !isSocketConnected) {
      return;
    }

    setIsMessagesLoading(true);
    setIsOlderMessagesLoading(false);
    socketRef.current?.send(
      JSON.stringify({
        action: "get_messages",
        chat_id: selectedChatId,
        before_message_id: null,
        limit: MESSAGES_PAGE_SIZE,
      }),
    );
  }, [selectedChatId, isSocketConnected]);

  function handleMessagesScroll(event: React.UIEvent<HTMLDivElement>) {
    const container = event.currentTarget;
    const threshold = 80;
    const distanceToBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    stickToBottomRef.current = distanceToBottom <= threshold;
    const maxScrollTop = Math.max(container.scrollHeight - container.clientHeight, 1);
    const scrollTopShare = container.scrollTop / maxScrollTop;
    const isInTopFifth = scrollTopShare <= 0.2;

    if (
      selectedChatId === null ||
      isMessagesLoading ||
      isOlderMessagesLoading ||
      !hasMoreMessagesByChat[selectedChatId] ||
      !isInTopFifth ||
      !socketRef.current ||
      socketRef.current.readyState !== WebSocket.OPEN
    ) {
      return;
    }

    const existingMessages = selectedMessages;
    const oldestMessage = existingMessages[0];
    if (!oldestMessage) {
      return;
    }

    olderLoadScrollRestoreRef.current = {
      chatId: selectedChatId,
      previousScrollTop: container.scrollTop,
      previousScrollHeight: container.scrollHeight,
    };
    setIsOlderMessagesLoading(true);
    socketRef.current.send(
      JSON.stringify({
        action: "get_messages",
        chat_id: selectedChatId,
        before_message_id: oldestMessage.id,
        limit: MESSAGES_PAGE_SIZE,
      }),
    );
  }

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
      sortChatsByRules(currentChats.map((chat) =>
        chat.id === selectedChatId
          ? {
              ...chat,
              last_message: text,
              last_message_at: optimisticMessage.created_at,
            }
          : chat,
      )),
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
      let hasPendingMessage = false;
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

        hasPendingMessage = true;
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
      if (hasPendingMessage) {
        if (socketRef.current?.readyState === WebSocket.OPEN) {
          socketRef.current.send(
            JSON.stringify({
              action: "get_messages",
              chat_id: selectedChatId,
            }),
          );
        }
        void refreshChats();
      }
    }, 200);
    pendingDeliveryTimeoutsRef.current.set(clientMessageId, timeoutId);

    setDraft("");
    setIsEmojiPickerOpen(false);
  }

  React.useEffect(() => {
    if (!selectedChatId || !stickToBottomRef.current) {
      return;
    }
    requestAnimationFrame(() => {
      const container = messagesContainerRef.current;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    });
  }, [selectedChatId, selectedMessages]);

  function appendEmoji(emojiData: EmojiClickData) {
    setDraft((currentDraft) => `${currentDraft}${emojiData.emoji}`);
    setIsEmojiPickerOpen(false);
  }

  function handleSelectChat(chatId: number) {
    setSelectedChat(chatId);
    setChats((currentChats) =>
      currentChats.map((chat) =>
        chat.id === chatId ? { ...chat, unread_messages_count: 0 } : chat,
      ),
    );
  }

  async function handlePinChat(chatId: number) {
    try {
      const response = await MessengerApi.pinChat(chatId);
      if (!response.data) {
        antdMessage.error("Failed to pin chat.");
        return;
      }
      await refreshChats();
    } catch {
      antdMessage.error("Failed to pin chat.");
    }
  }

  async function handleUnpinChat(chatId: number) {
    try {
      const response = await MessengerApi.unpinChat(chatId);
      if (!response.data) {
        antdMessage.error("Failed to unpin chat.");
        return;
      }
      await refreshChats();
    } catch {
      antdMessage.error("Failed to unpin chat.");
    }
  }

  function handleSelectedChatInfoModal() {
    if (!selectedChat) {
      return;
    }

    const closeModal = () => {
      setModal({ clear: true });
    };

    setModal({
      open: true,
      title: "Chat info",
      okText: "Close",
      cancelText: "Cancel",
      onOk: closeModal,
      onCancel: closeModal,
      content: (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "8px 0",
          }}
        >
          <Avatar
            size={48}
            src={selectedChat.avatar_url}
            icon={selectedChat.type === "private" ? <HomeFilled /> : undefined}
          />
          <Text strong style={{ fontSize: "16px" }}>
            {selectedChat.title}
          </Text>
        </div>
      ),
    });
  }

  return (
    <Fragment>
      <Sider width="5%" style={{ background: "#0c418aff" }}>
        <Header style={{ background: "#1677ff", padding: "0" }}>
          <ControlPanel />
        </Header>
        <Content>
          <ChatGroupsList
            groups={groupsForUi}
            selectedGroupId={selectedFolderId}
            onSelectGroup={handleSelectFolder}
            onOpenGroupSettings={handleOpenGroupSettings}
          />
        </Content>
      </Sider>
      <Sider width="25%" style={{ background: "#1677ff" }}>
        <Layout>
          <Header style={{ background: "#1677ff", padding: "0 10px" }}>
            <SearchInput />
          </Header>
          <Content style={{ background: "#0958d9" }}>
            <ChatsList
              chats={visibleChats}
              onClick={(chat) => handleSelectChat(chat.id)}
              onPinChat={(chat) => void handlePinChat(chat.id)}
              onUnpinChat={(chat) => void handleUnpinChat(chat.id)}
            />
          </Content>
        </Layout>
      </Sider>
      <Layout>
        <Header
          style={{
            background: "#4096ff",
            padding: "0 12px",
            cursor: selectedChat ? "pointer" : "default",
          }}
          onClick={handleSelectedChatInfoModal}
        >
          {selectedChat ? (
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Avatar
                size={36}
                src={selectedChat.avatar_url}
                icon={selectedChat.type === "private" ? <HomeFilled /> : undefined}
              />
              <span>{selectedChat.title}</span>
            </div>
          ) : (
            "Select a chat"
          )}
        </Header>
        <Content
          ref={messagesContainerRef}
          onScroll={handleMessagesScroll}
          style={{
            background: "#0958d9",
            color: "#fff",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-start",
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
              <Fragment>
                {isOlderMessagesLoading ? (
                  <LoadingOutlined
                    spin
                    style={{ alignSelf: "center", color: "rgba(255, 255, 255, 0.85)" }}
                  />
                ) : null}
                {selectedMessages.map((chatMessage, index) => {
                  const previousMessage = selectedMessages[index - 1];
                  const shouldShowDateDivider =
                    !previousMessage ||
                    !isSameCalendarDay(previousMessage.created_at, chatMessage.created_at);

                  return (
                    <Fragment key={chatMessage.id}>
                      {shouldShowDateDivider ? (
                        <div
                          style={{
                            position: "sticky",
                            top: 0,
                            zIndex: 2,
                            background: "#0958d9",
                            padding: "6px 0",
                            textAlign: "center",
                          }}
                        >
                          <Text style={{ color: "rgba(255, 255, 255, 0.8)" }}>
                            {formatCalendarDay(chatMessage.created_at)}
                          </Text>
                        </div>
                      ) : null}
                      <div
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
                    </Fragment>
                  );
                })}
              </Fragment>
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
