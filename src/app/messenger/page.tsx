"use client";
import React, { Fragment } from "react";
import {
  Avatar,
  Button,
  Checkbox,
  Dropdown,
  Input,
  Layout,
  Select,
  Typography,
  message as antdMessage,
} from "antd";
import {
  CheckOutlined,
  CloseOutlined,
  HomeFilled,
  LoadingOutlined,
  SmileOutlined,
} from "@ant-design/icons";
import type { MenuProps } from "antd";
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
const REPLY_PREVIEW_MAX_LENGTH = 100;
const SCROLL_HIGHLIGHT_DURATION_MS = 1800;

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
    reference_message_id: message.reference_message_id ?? undefined,
    reference_author: message.reference_author ?? undefined,
    reference_content: message.reference_content ?? undefined,
    forwarded_from_message_id: message.forwarded_from_message_id ?? undefined,
    forwarded_from_author: message.forwarded_from_author ?? undefined,
    forwarded_from_author_avatar_url: message.forwarded_from_author_avatar_url ?? undefined,
    forwarded_from_content: message.forwarded_from_content ?? undefined,
  };
}

function shortenText(text: string, maxLength: number = REPLY_PREVIEW_MAX_LENGTH): string {
  const normalizedText = text.replace(/\s+/g, " ").trim();
  if (normalizedText.length <= maxLength) {
    return normalizedText;
  }
  return `${normalizedText.slice(0, maxLength - 3).trimEnd()}...`;
}

function resolveMessageAuthor(
  message: Pick<ChatMessageType, "is_own">,
  selectedChatTitle: string | undefined,
): string {
  if (message.is_own) {
    return "You";
  }
  return selectedChatTitle || "User";
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

interface MessageComposerProps {
  isSocketConnected: boolean;
  replyTarget: ChatMessageType | null;
  selectedChatTitle: string | undefined;
  onCancelReply: () => void;
  onSendMessage: (text: string) => boolean;
}

interface ForwardMessageModalContentProps {
  chats: ChatType[];
  selectedChatId: number | null;
  sourceMessage: ChatMessageType;
  onCancel: () => void;
  onConfirm: (chatIds: number[]) => void;
}

function MessageComposer({
  isSocketConnected,
  replyTarget,
  selectedChatTitle,
  onCancelReply,
  onSendMessage,
}: MessageComposerProps) {
  const [draft, setDraft] = React.useState("");
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = React.useState(false);

  function appendEmoji(emojiData: EmojiClickData) {
    setDraft((currentDraft) => `${currentDraft}${emojiData.emoji}`);
    setIsEmojiPickerOpen(false);
  }

  function handleSendClick() {
    const text = draft.trim();
    if (!text) {
      return;
    }
    const didSend = onSendMessage(text);
    if (!didSend) {
      return;
    }
    setDraft("");
    setIsEmojiPickerOpen(false);
  }

  return (
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
        {replyTarget ? (
          <div
            style={{
              display: "flex",
              alignItems: "stretch",
              justifyContent: "space-between",
              width: "100%",
              gap: "10px",
              padding: "8px 10px",
              borderRadius: "10px",
              background: "rgba(0, 21, 41, 0.25)",
              color: "#fff",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <Text style={{ display: "block", color: "#69b1ff", fontWeight: 600 }}>
                {`In reply to ${resolveMessageAuthor(replyTarget, selectedChatTitle)}`}
              </Text>
              <Text style={{ color: "rgba(255, 255, 255, 0.85)" }}>
                {shortenText(replyTarget.text)}
              </Text>
            </div>
            <Button
              type="text"
              icon={<CloseOutlined />}
              onClick={onCancelReply}
              style={{ color: "rgba(255, 255, 255, 0.85)" }}
            />
          </div>
        ) : null}
      </div>
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
              handleSendClick();
            }
          }}
          placeholder="Type a message"
          autoSize={{ minRows: 1, maxRows: 4 }}
          style={{ minWidth: 0 }}
          disabled={!isSocketConnected}
        />
        <Button
          type="primary"
          onClick={handleSendClick}
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
  );
}

function ForwardMessageModalContent({
  chats,
  selectedChatId,
  sourceMessage,
  onCancel,
  onConfirm,
}: ForwardMessageModalContentProps) {
  const [targetChatIds, setTargetChatIds] = React.useState<number[]>(
    selectedChatId !== null ? [selectedChatId] : [],
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <div
        style={{
          borderRadius: "8px",
          padding: "8px 10px",
          background: "rgba(22, 119, 255, 0.08)",
          border: "1px solid rgba(22, 119, 255, 0.2)",
        }}
      >
        <Text style={{ color: "#1677ff", display: "block", marginBottom: "4px" }}>
          Message to forward
        </Text>
        <Text style={{ whiteSpace: "pre-wrap", color: "rgba(0, 21, 41, 0.88)" }}>
          {shortenText(sourceMessage.text, 160)}
        </Text>
      </div>
      <div style={{ maxHeight: "320px", overflowY: "auto", paddingRight: "6px" }}>
        <Checkbox.Group
          value={targetChatIds}
          onChange={(values) => setTargetChatIds(values.map((value) => Number(value)))}
          style={{ width: "100%" }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {chats.map((chat) => (
              <label
                key={chat.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  border: "1px solid #f0f0f0",
                  borderRadius: "8px",
                  padding: "8px 10px",
                  cursor: "pointer",
                }}
              >
                <Checkbox value={chat.id} />
                <Avatar size={28} src={chat.avatar_url} icon={chat.type === "private" ? <HomeFilled /> : undefined} />
                <Text ellipsis style={{ minWidth: 0 }}>
                  {chat.title || `Chat ${chat.id}`}
                </Text>
              </label>
            ))}
          </div>
        </Checkbox.Group>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
        <Button onClick={onCancel}>Cancel</Button>
        <Button
          type="primary"
          disabled={targetChatIds.length === 0}
          onClick={() => onConfirm(targetChatIds)}
        >
          Forward
        </Button>
      </div>
    </div>
  );
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
  const selectedMessagesById = React.useMemo(() => {
    const messagesById = new Map<number, ChatMessageType>();
    selectedMessages.forEach((message) => {
      messagesById.set(message.id, message);
    });
    return messagesById;
  }, [selectedMessages]);
  const setChatMessages = useChatMessagesSetter();
  const [chatFolders, setChatFolders] = React.useState<ChatFolderType[]>([]);
  const [selectedFolderId, setSelectedFolderId] = React.useState<number>(ALL_CHATS_GROUP_ID);
  const [isMessagesLoading, setIsMessagesLoading] = React.useState(false);
  const [isOlderMessagesLoading, setIsOlderMessagesLoading] = React.useState(false);
  const [hasMoreMessagesByChat, setHasMoreMessagesByChat] = React.useState<Record<number, boolean>>({});
  const [replyTarget, setReplyTarget] = React.useState<ChatMessageType | null>(null);
  const [pendingScrollTargetMessageId, setPendingScrollTargetMessageId] = React.useState<number | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = React.useState<number | null>(null);
  const [isSocketConnected, setIsSocketConnected] = React.useState(false);
  const socketRef = React.useRef<WebSocket | null>(null);
  const messagesContainerRef = React.useRef<HTMLDivElement | null>(null);
  const messageElementsRef = React.useRef<Map<number, HTMLDivElement>>(new Map());
  const highlightTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const jumpRetryTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
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
    const pendingDeliveryTimeouts = pendingDeliveryTimeoutsRef.current;
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
          const timeoutId = pendingDeliveryTimeouts.get(payload.message.client_message_id);
          if (timeoutId) {
            clearTimeout(timeoutId);
            pendingDeliveryTimeouts.delete(payload.message.client_message_id);
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
      pendingDeliveryTimeouts.forEach((timeoutId) => clearTimeout(timeoutId));
      pendingDeliveryTimeouts.clear();
      socket.close();
      socketRef.current = null;
    };
  }, [refreshChats, setChatMessages, setChats]);

  React.useEffect(() => {
    setReplyTarget(null);
    setHighlightedMessageId(null);
    setPendingScrollTargetMessageId(null);
    setIsOlderMessagesLoading(false);
    olderLoadScrollRestoreRef.current = null;
  }, [selectedChatId]);

  React.useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
      if (jumpRetryTimeoutRef.current) {
        clearTimeout(jumpRetryTimeoutRef.current);
      }
    };
  }, []);

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

  const requestOlderMessagesForSearch = React.useCallback(() => {
    if (
      selectedChatId === null ||
      isMessagesLoading ||
      isOlderMessagesLoading ||
      !hasMoreMessagesByChat[selectedChatId] ||
      !socketRef.current ||
      socketRef.current.readyState !== WebSocket.OPEN
    ) {
      return;
    }

    const oldestMessage = selectedMessages[0];
    if (!oldestMessage) {
      return;
    }

    const container = messagesContainerRef.current;
    if (container) {
      olderLoadScrollRestoreRef.current = {
        chatId: selectedChatId,
        previousScrollTop: container.scrollTop,
        previousScrollHeight: container.scrollHeight,
      };
    }

    setIsOlderMessagesLoading(true);
    socketRef.current.send(
      JSON.stringify({
        action: "get_messages",
        chat_id: selectedChatId,
        before_message_id: oldestMessage.id,
        limit: MESSAGES_PAGE_SIZE,
      }),
    );
  }, [
    hasMoreMessagesByChat,
    isMessagesLoading,
    isOlderMessagesLoading,
    selectedChatId,
    selectedMessages,
  ]);

  function handleSendMessage(text: string): boolean {
    if (selectedChatId === null || !text.trim()) {
      return false;
    }

    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      antdMessage.error("WebSocket is not connected.");
      return false;
    }

    const referenceMessageId = replyTarget?.id;
    const clientMessageId = createClientMessageId();
    stickToBottomRef.current = true;
    const optimisticMessage: ChatMessageType = {
      id: -Date.now(),
      chat_id: selectedChatId,
      text,
      created_at: new Date().toISOString(),
      is_own: true,
      delivery_status: "delivered",
      client_message_id: clientMessageId,
      reference_message_id: referenceMessageId,
      reference_author: replyTarget
        ? resolveMessageAuthor(replyTarget, selectedChat?.title)
        : undefined,
      reference_content: replyTarget ? shortenText(replyTarget.text) : undefined,
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
        reference_message_id: referenceMessageId,
        client_message_id: clientMessageId,
      }),
    );
    requestAnimationFrame(() => {
      const container = messagesContainerRef.current;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    });

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

    setReplyTarget(null);
    return true;
  }

  function handleForwardMessage(sourceMessage: ChatMessageType, targetChatIds: number[]): void {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      antdMessage.error("WebSocket is not connected.");
      return;
    }

    targetChatIds.forEach((targetChatId) => {
      const clientMessageId = createClientMessageId();
      socketRef.current?.send(
        JSON.stringify({
          action: "send_message",
          chat_id: targetChatId,
          content: sourceMessage.text,
          forwarded_from_message_id: sourceMessage.id,
          client_message_id: clientMessageId,
        }),
      );

      if (targetChatId === selectedChatId) {
        stickToBottomRef.current = true;
        requestAnimationFrame(() => {
          const container = messagesContainerRef.current;
          if (container) {
            container.scrollTop = container.scrollHeight;
          }
        });
      }
    });

    antdMessage.success(`Forwarded to ${targetChatIds.length} chat${targetChatIds.length > 1 ? "s" : ""}.`);
  }

  function handleOpenForwardModal(sourceMessage: ChatMessageType) {
    setModal({
      open: true,
      title: "Forward message",
      footer: null,
      onCancel: closeModal,
      content: (
        <ForwardMessageModalContent
          chats={sortChatsByRules(chats)}
          selectedChatId={selectedChatId}
          sourceMessage={sourceMessage}
          onCancel={closeModal}
          onConfirm={(chatIds) => {
            handleForwardMessage(sourceMessage, chatIds);
            closeModal();
          }}
        />
      ),
    });
  }

  const jumpToRenderedMessage = React.useCallback((messageId: number): boolean => {
    const targetElement = messageElementsRef.current.get(messageId);
    if (!targetElement) {
      return false;
    }

    setPendingScrollTargetMessageId(null);
    targetElement.scrollIntoView({ behavior: "auto", block: "center" });
    setHighlightedMessageId(messageId);
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
    }
    highlightTimeoutRef.current = setTimeout(() => {
      setHighlightedMessageId((currentHighlightedId) =>
        currentHighlightedId === messageId ? null : currentHighlightedId,
      );
    }, SCROLL_HIGHLIGHT_DURATION_MS);
    return true;
  }, []);

  const scheduleJumpRetry = React.useCallback((messageId: number, retriesLeft: number) => {
    if (jumpRetryTimeoutRef.current) {
      clearTimeout(jumpRetryTimeoutRef.current);
    }
    jumpRetryTimeoutRef.current = setTimeout(() => {
      const didJump = jumpToRenderedMessage(messageId);
      if (!didJump && retriesLeft > 0 && selectedMessagesById.has(messageId)) {
        scheduleJumpRetry(messageId, retriesLeft - 1);
      }
    }, 30);
  }, [jumpToRenderedMessage, selectedMessagesById]);

  const handleScrollToMessage = React.useCallback((messageId: number) => {
    if (jumpToRenderedMessage(messageId)) {
      return;
    }
    setPendingScrollTargetMessageId(messageId);
    if (selectedMessagesById.has(messageId)) {
      scheduleJumpRetry(messageId, 40);
    } else {
      requestOlderMessagesForSearch();
    }
  }, [jumpToRenderedMessage, requestOlderMessagesForSearch, scheduleJumpRetry, selectedMessagesById]);

  React.useEffect(() => {
    if (selectedChatId === null) {
      return;
    }

    const pendingTargetMessageId = pendingScrollTargetMessageId;
    if (pendingTargetMessageId === null) {
      return;
    }

    if (selectedMessagesById.has(pendingTargetMessageId)) {
      return;
    }

    if (isOlderMessagesLoading || isMessagesLoading) {
      return;
    }

    if (!hasMoreMessagesByChat[selectedChatId]) {
      setPendingScrollTargetMessageId(null);
      antdMessage.info("Referenced message is unavailable.");
      return;
    }

    requestOlderMessagesForSearch();
  }, [
    handleScrollToMessage,
    hasMoreMessagesByChat,
    isMessagesLoading,
    isOlderMessagesLoading,
    pendingScrollTargetMessageId,
    requestOlderMessagesForSearch,
    selectedChatId,
    selectedMessagesById,
  ]);

  React.useEffect(() => {
    const pendingTargetMessageId = pendingScrollTargetMessageId;
    if (pendingTargetMessageId === null) {
      return;
    }
    if (!selectedMessagesById.has(pendingTargetMessageId)) {
      return;
    }

    const frameId = requestAnimationFrame(() => {
      if (!jumpToRenderedMessage(pendingTargetMessageId)) {
        scheduleJumpRetry(pendingTargetMessageId, 40);
      }
    });
    return () => cancelAnimationFrame(frameId);
  }, [
    jumpToRenderedMessage,
    pendingScrollTargetMessageId,
    scheduleJumpRetry,
    selectedMessages,
    selectedMessagesById,
  ]);

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
                  const referencedMessage = chatMessage.reference_message_id
                    ? selectedMessagesById.get(chatMessage.reference_message_id)
                    : null;
                  const referenceAuthor = referencedMessage
                    ? resolveMessageAuthor(referencedMessage, selectedChat?.title)
                    : chatMessage.reference_author ?? "User";
                  const referenceContent = referencedMessage
                    ? shortenText(referencedMessage.text)
                    : shortenText(chatMessage.reference_content ?? "Message");
                  const hasReference = Boolean(chatMessage.reference_message_id);
                  const hasForwarded = Boolean(chatMessage.forwarded_from_message_id);
                  const forwarderName = resolveMessageAuthor(chatMessage, selectedChat?.title);
                  const forwardedSourceAuthor = chatMessage.forwarded_from_author ?? "Unknown";
                  const forwardedSourceContent = chatMessage.forwarded_from_content
                    ? shortenText(chatMessage.forwarded_from_content, 240)
                    : "";
                  const messageMenuItems: MenuProps["items"] = [
                    {
                      key: "answer",
                      label: "Answer",
                    },
                    {
                      key: "forward",
                      label: "Forward",
                    },
                  ];

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
                      <Dropdown
                        trigger={["contextMenu"]}
                        menu={{
                          items: messageMenuItems,
                          onClick: ({ key, domEvent }) => {
                            domEvent.stopPropagation();
                            if (key === "answer") {
                              setReplyTarget(chatMessage);
                              return;
                            }
                            if (key === "forward") {
                              handleOpenForwardModal(chatMessage);
                            }
                          },
                        }}
                      >
                        <div
                          ref={(element) => {
                            if (element) {
                              messageElementsRef.current.set(chatMessage.id, element);
                            } else {
                              messageElementsRef.current.delete(chatMessage.id);
                            }
                          }}
                          style={{
                            alignSelf: chatMessage.is_own ? "flex-start" : "flex-end",
                            maxWidth: "70%",
                            background: chatMessage.is_own ? "#91caff" : "#ffffff",
                            color: "#001529",
                            borderRadius: "16px",
                            padding: "10px 14px",
                            overflowWrap: "anywhere",
                            wordBreak: "break-word",
                            cursor: "context-menu",
                            outline:
                              highlightedMessageId === chatMessage.id
                                ? "2px solid #faad14"
                                : "2px solid transparent",
                            boxShadow:
                              highlightedMessageId === chatMessage.id
                                ? "0 0 0 4px rgba(250, 173, 20, 0.25)"
                                : "none",
                            transition: "outline-color 0.25s ease, box-shadow 0.25s ease",
                          }}
                        >
                          {hasReference ? (
                            <div
                              onClick={(event) => {
                                event.stopPropagation();
                                if (chatMessage.reference_message_id) {
                                  handleScrollToMessage(chatMessage.reference_message_id);
                                }
                              }}
                              style={{
                                borderLeft: "3px solid #69b1ff",
                                background: "rgba(0, 21, 41, 0.08)",
                                borderRadius: "8px",
                                padding: "6px 10px",
                                marginBottom: "8px",
                                cursor: "pointer",
                              }}
                            >
                              <Text
                                style={{
                                  display: "block",
                                  color: "#1677ff",
                                  fontSize: "12px",
                                  fontWeight: 600,
                                  marginBottom: "2px",
                                }}
                              >
                                {referenceAuthor}
                              </Text>
                              <Text style={{ color: "rgba(0, 21, 41, 0.75)", fontSize: "13px" }}>
                                {referenceContent}
                              </Text>
                            </div>
                          ) : null}
                          {hasForwarded ? (
                            <div
                              style={{
                                borderRadius: "10px",
                                background: "rgba(0, 21, 41, 0.08)",
                                padding: "8px 10px",
                                marginBottom: "8px",
                              }}
                            >
                              <Text
                                style={{
                                  display: "block",
                                  color: "#1677ff",
                                  fontWeight: 600,
                                  fontSize: "13px",
                                  marginBottom: "2px",
                                }}
                              >
                                {forwarderName}
                              </Text>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "6px",
                                  marginBottom: "2px",
                                }}
                              >
                                <Text style={{ color: "rgba(0, 21, 41, 0.75)", fontSize: "12px" }}>
                                  Forwarded from
                                </Text>
                                <Avatar
                                  size={18}
                                  src={chatMessage.forwarded_from_author_avatar_url}
                                  style={{ flexShrink: 0 }}
                                >
                                  {forwardedSourceAuthor.slice(0, 1).toUpperCase()}
                                </Avatar>
                                <Text style={{ color: "rgba(0, 21, 41, 0.85)", fontSize: "12px" }}>
                                  {forwardedSourceAuthor}
                                </Text>
                              </div>
                              <Text style={{ color: "rgba(0, 21, 41, 0.85)", whiteSpace: "pre-wrap" }}>
                                {forwardedSourceContent}
                              </Text>
                            </div>
                          ) : null}
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
                      </Dropdown>
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
            <MessageComposer
              key={selectedChat.id}
              isSocketConnected={isSocketConnected}
              replyTarget={replyTarget}
              selectedChatTitle={selectedChat.title}
              onCancelReply={() => setReplyTarget(null)}
              onSendMessage={handleSendMessage}
            />
          ) : (
            "No active chat"
          )}
        </Footer>
      </Layout>
      <Modal />
    </Fragment>
  );
}
