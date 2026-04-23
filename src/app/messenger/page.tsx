"use client";
import React, { Fragment } from "react";
import {
  Avatar,
  Button,
  Dropdown,
  Image,
  Layout,
  Progress,
  Tooltip,
  Typography,
  message as antdMessage,
} from "antd";
import {
  CheckOutlined,
  HomeFilled,
  InboxOutlined,
  LoadingOutlined,
  YoutubeFilled,
} from "@ant-design/icons";
import type { MenuProps } from "antd";
import { Content, Header, Footer } from "antd/lib/layout/layout";
import Sider from "antd/lib/layout/Sider";
import ChatsList from "./components/ChatsList";
import ChatGroupsList from "./components/ChatGroupsList";
import ControlPanel from "./components/ControlPanel";
import SearchInput from "./components/SearchInput";
import MessageComposer from "./components/MessageComposer";
import ForwardMessageModalContent from "./components/ForwardMessageModalContent";
import GroupSettingsModalContent from "./components/GroupSettingsModalContent";
import YouTubeWatchRoomModals from "./components/YouTubeWatchRoomModals";
import ExpenseSplitModal from "./components/ExpenseSplitModal";
import ChatExpensesPanel from "./components/ChatExpensesPanel";
import MessageAttachmentContent from "./components/MessageAttachmentContent";
import ReplyReferenceBlock from "./components/messages/ReplyReferenceBlock";
import ForwardedMessageBlock from "./components/messages/ForwardedMessageBlock";
import MessageTextBlock from "./components/messages/MessageTextBlock";
import MessageLinkPreviewBlock from "./components/messages/MessageLinkPreviewBlock";
import MessageMetaRow from "./components/messages/MessageMetaRow";
import { useLinkPreviews } from "./hooks/useLinkPreviews";
import { useVoicePlayback } from "./hooks/useVoicePlayback";
import {
  ALL_CHATS_GROUP_ID,
  ALL_CHATS_GROUP_TITLE,
  ATTACHMENT_MAX_SIZE_BYTES,
  CHAT_GROUPS_CACHE_STORAGE_KEY,
  CHATS_CACHE_STORAGE_KEY,
  ENABLE_EXPENSE_SPLIT_FEATURE,
  MESSENGER_THEME_STORAGE_KEY,
  MESSENGER_THEME_VARS,
  SCROLL_HIGHLIGHT_DURATION_MS,
} from "./constants";
import type { AttachmentPickerKind, ChatSocketResponse, MessengerTheme, YouTubePlayerLike } from "./types";
import { hasYouTubePlayerMethods } from "./types";
import {
  createClientMessageId,
  extractUrls,
  extractYouTubeVideoId,
  extractYouTubeVideoIdFromUrl,
  formatCalendarDay,
  getChatPreviewText,
  getViewerSyncStates,
  isGroupedMediaMessage,
  isSameCalendarDay,
  mapApiMessage,
  parseChatGroupsCache,
  parseChatsCache,
  resolveAttachmentPickerKind,
  resolveContentTypeForFile,
  resolveMessageAuthor,
  readAudioDurationSeconds,
  shortenText,
  sortChatsByRules,
  uploadFileWithProgress,
  watchRoomMapKey,
} from "./utils";
import AppModal from "@/components/Modal";
import { useModalSetter } from "@/hooks/features/ui/modal";
import AuthApi from "@/lib/api/auth";
import MessengerApi from "@/lib/api/messenger";
import { API_BASE_URL } from "@/lib/config";
import {
  useChatMessages,
  useChatMessagesSetter,
  useChats,
  useChatsSetter,
  useSelectedChat,
  useSelectedChatSetter,
} from "@/hooks/features/messenger/chats";
import type {
  ContactType,
  ExpensePaymentType,
  ExpenseType,
  ExpenseOverviewType,
  ChatFolderType,
  ChatMessageType,
  ChatType,
  WatchRoomChatMessageType,
  WatchRoomType,
} from "@/lib/types";

const { Text } = Typography;
const WATCH_ROOM_REACTION_PREFIX = "[[reaction]]";

type WatchRoomReactionView = {
  id: string;
  emoji: string;
  x_percent: number;
  y_percent: number;
};

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
  const [isAttachmentUploading, setIsAttachmentUploading] = React.useState(false);
  const [availableUsers, setAvailableUsers] = React.useState<ContactType[]>([]);
  const [isMessagesDragOver, setIsMessagesDragOver] = React.useState(false);
  const [hasMoreMessagesByChat, setHasMoreMessagesByChat] = React.useState<Record<number, boolean>>({});
  const [replyTarget, setReplyTarget] = React.useState<ChatMessageType | null>(null);
  const [pendingScrollTargetMessageId, setPendingScrollTargetMessageId] = React.useState<number | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = React.useState<number | null>(null);
  const [isSocketConnected, setIsSocketConnected] = React.useState(false);
  const [messengerTheme, setMessengerTheme] = React.useState<MessengerTheme>("retro");
  const [isChatsSyncing, setIsChatsSyncing] = React.useState(false);
  const [isChatGroupsSyncing, setIsChatGroupsSyncing] = React.useState(false);
  const [hasChatsSyncedOnce, setHasChatsSyncedOnce] = React.useState(false);
  const [hasChatGroupsSyncedOnce, setHasChatGroupsSyncedOnce] = React.useState(false);
  const [youtubePreviewVideoId, setYoutubePreviewVideoId] = React.useState<string | null>(null);
  const [isYouTubeApiReady, setIsYouTubeApiReady] = React.useState(false);
  const [isYouTubeApiBlocked, setIsYouTubeApiBlocked] = React.useState(false);
  const [isYouTubePlayerReady, setIsYouTubePlayerReady] = React.useState(false);
  const [syncedToUserId, setSyncedToUserId] = React.useState<number | null>(null);
  const [isWatchRoomSyncing, setIsWatchRoomSyncing] = React.useState(false);
  const [currentUserId, setCurrentUserId] = React.useState<number | null>(null);
  const [currentUsername, setCurrentUsername] = React.useState<string | null>(null);
  const [youtubeAccessMode, setYoutubeAccessMode] = React.useState<"direct" | "assisted">("direct");
  const [youtubeAssistEnabled, setYoutubeAssistEnabled] = React.useState(false);
  const [canEnableYouTubeAssist, setCanEnableYouTubeAssist] = React.useState(false);
  const [activeWatchRoom, setActiveWatchRoom] = React.useState<WatchRoomType | null>(null);
  const [watchRoomChatMessagesByRoomId, setWatchRoomChatMessagesByRoomId] = React.useState<
    Record<string, WatchRoomChatMessageType[]>
  >({});
  const [watchRoomReactionsByRoomId, setWatchRoomReactionsByRoomId] = React.useState<
    Record<string, WatchRoomReactionView[]>
  >({});
  const [watchRoomPlaybackSeconds, setWatchRoomPlaybackSeconds] = React.useState(0);
  const [watchRoomsByKey, setWatchRoomsByKey] = React.useState<Record<string, WatchRoomType>>({});
  const [isWatchRoomInviteModalOpen, setIsWatchRoomInviteModalOpen] = React.useState(false);
  const [watchRoomInviteUserId, setWatchRoomInviteUserId] = React.useState<number | null>(null);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = React.useState(false);
  const [isExpenseSubmitting, setIsExpenseSubmitting] = React.useState(false);
  const [isExpenseMarkingPaid, setIsExpenseMarkingPaid] = React.useState(false);
  const [expenseParticipants, setExpenseParticipants] = React.useState<ContactType[]>([]);
  const [expenseOverview, setExpenseOverview] = React.useState<ExpenseOverviewType | null>(null);
  const [isExpensesViewOpen, setIsExpensesViewOpen] = React.useState(false);
  const [isExpensesViewLoading, setIsExpensesViewLoading] = React.useState(false);
  const [expensesPanelWidth, setExpensesPanelWidth] = React.useState(360);
  const [chatExpenses, setChatExpenses] = React.useState<ExpenseType[]>([]);
  const [expensePayments, setExpensePayments] = React.useState<ExpensePaymentType[]>([]);
  const unavailableWatchRoomKeysRef = React.useRef<Set<string>>(new Set());
  const syncEnsureTimeoutsRef = React.useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const syncedToUserIdRef = React.useRef<number | null>(null);
  const activeWatchRoomIdRef = React.useRef<string | null>(null);
  const activeWatchRoomRef = React.useRef<WatchRoomType | null>(null);
  const isSocketConnectedRef = React.useRef(false);
  const lastWatchRoomPlaybackSentAtRef = React.useRef(0);
  const suppressUnsyncUntilRef = React.useRef(0);
  const [youTubePlayerHostElement, setYouTubePlayerHostElement] = React.useState<HTMLDivElement | null>(null);
  const youTubePlayerRef = React.useRef<YouTubePlayerLike | null>(null);
  const youTubeApiReadyRef = React.useRef(false);
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
  const attachmentRetryFilesRef = React.useRef<Map<number, { file: File; kind: AttachmentPickerKind }>>(
    new Map(),
  );
  const dragCounterRef = React.useRef(0);
  const chatsSyncRequestsRef = React.useRef(0);
  const chatGroupsSyncRequestsRef = React.useRef(0);
  const didHydrateCacheRef = React.useRef(false);
  const isResizingExpensesPanelRef = React.useRef(false);
  const isExpenseFeatureEnabled = ENABLE_EXPENSE_SPLIT_FEATURE;
  const handleYouTubePlayerHostRef = React.useCallback((node: HTMLDivElement | null) => {
    if (!node) {
      return;
    }
    setYouTubePlayerHostElement(node);
  }, []);
  const isYouTubePlayerUsable = isYouTubePlayerReady && hasYouTubePlayerMethods(youTubePlayerRef.current);
  const tryExtractWatchRoomReactionEmoji = React.useCallback((content: string) => {
    if (!content.startsWith(WATCH_ROOM_REACTION_PREFIX)) {
      return null;
    }
    const emoji = content.slice(WATCH_ROOM_REACTION_PREFIX.length).trim();
    return emoji.length > 0 ? emoji : null;
  }, []);
  const appendWatchRoomReaction = React.useCallback((roomId: string, emoji: string) => {
    const reactionId = `${roomId}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const reaction: WatchRoomReactionView = {
      id: reactionId,
      emoji,
      x_percent: 20 + Math.random() * 60,
      y_percent: 65 + Math.random() * 20,
    };
    setWatchRoomReactionsByRoomId((current) => ({
      ...current,
      [roomId]: [...(current[roomId] ?? []), reaction],
    }));
    setTimeout(() => {
      setWatchRoomReactionsByRoomId((current) => {
        const existing = current[roomId] ?? [];
        const next = existing.filter((item) => item.id !== reactionId);
        if (next.length === existing.length) {
          return current;
        }
        return {
          ...current,
          [roomId]: next,
        };
      });
    }, 1700);
  }, []);
  const clampExpensesPanelWidth = React.useCallback((width: number) => {
    if (typeof window === "undefined") {
      return Math.max(280, Math.min(560, Math.round(width)));
    }
    const maxWidth = Math.max(320, Math.floor(window.innerWidth * 0.6));
    return Math.max(280, Math.min(maxWidth, Math.round(width)));
  }, []);
  const clearSyncEnsureTimeouts = React.useCallback(() => {
    syncEnsureTimeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
    syncEnsureTimeoutsRef.current = [];
  }, []);
  const resolveTargetPlaybackSeconds = React.useCallback(
    (targetState: { current_time_seconds: number; is_playing: boolean; updated_at: number }) => {
      const nowSeconds = Date.now() / 1000;
      const transportLeadSeconds = 0.3;
      return targetState.is_playing
        ? targetState.current_time_seconds + Math.max(0, nowSeconds - targetState.updated_at) + transportLeadSeconds
        : targetState.current_time_seconds;
    },
    [],
  );
  const applyTargetSyncStateToPlayer = React.useCallback(
    (targetState: { current_time_seconds: number; is_playing: boolean; updated_at: number }) => {
      const player = youTubePlayerRef.current;
      if (!hasYouTubePlayerMethods(player)) {
        return false;
      }
      const targetSeconds = Math.max(0, resolveTargetPlaybackSeconds(targetState));
      suppressUnsyncUntilRef.current = Date.now() + 1200;
      player.seekTo(targetSeconds, true);
      if (targetState.is_playing) {
        player.playVideo();
      } else {
        player.pauseVideo();
      }
      return true;
    },
    [resolveTargetPlaybackSeconds],
  );
  const sendWatchRoomPlaybackUpdate = React.useCallback((force: boolean = false) => {
    const room = activeWatchRoomRef.current;
    const socket = socketRef.current;
    const player = youTubePlayerRef.current;
    if (!room || !hasYouTubePlayerMethods(player)) {
      return;
    }
    if (!isSocketConnectedRef.current || !socket || socket.readyState !== WebSocket.OPEN) {
      return;
    }

    const nowMs = Date.now();
    const minIntervalMs = 350;
    if (!force && nowMs - lastWatchRoomPlaybackSentAtRef.current < minIntervalMs) {
      return;
    }

    const currentTime = player.getCurrentTime();
    const isPlaying = player.getPlayerState() === (window.YT?.PlayerState?.PLAYING ?? 1);
    socket.send(
      JSON.stringify({
        action: "watch_room_playback",
        chat_id: room.chat_id,
        room_id: room.id,
        current_time_seconds: currentTime,
        is_playing: isPlaying,
      }),
    );
    lastWatchRoomPlaybackSentAtRef.current = nowMs;
  }, []);
  const refreshChats = React.useCallback(async () => {
    chatsSyncRequestsRef.current += 1;
    setIsChatsSyncing(true);

    try {
      const res = await MessengerApi.getChats();
      setChats(sortChatsByRules(res.data));
      setHasChatsSyncedOnce(true);
    } finally {
      chatsSyncRequestsRef.current = Math.max(0, chatsSyncRequestsRef.current - 1);
      if (chatsSyncRequestsRef.current === 0) {
        setIsChatsSyncing(false);
      }
    }
  }, [setChats]);
  const refreshChatGroups = React.useCallback(async () => {
    chatGroupsSyncRequestsRef.current += 1;
    setIsChatGroupsSyncing(true);

    try {
      const res = await MessengerApi.getChatGroups();
      setChatFolders(res.data);
      setHasChatGroupsSyncedOnce(true);
    } catch {
      antdMessage.error("Failed to load chat groups.");
    } finally {
      chatGroupsSyncRequestsRef.current = Math.max(0, chatGroupsSyncRequestsRef.current - 1);
      if (chatGroupsSyncRequestsRef.current === 0) {
        setIsChatGroupsSyncing(false);
      }
    }
  }, []);

  const applyDeletedMessageLocally = React.useCallback((chatId: number, messageId: number) => {
    setChatMessages((current) => {
      const existingMessages = current[chatId] ?? [];
      const nextMessages = existingMessages.filter((message) => message.id !== messageId);
      if (nextMessages.length === existingMessages.length) {
        return current;
      }

      setChats((currentChats) =>
        sortChatsByRules(
          currentChats.map((chat) => {
            if (chat.id !== chatId) {
              return chat;
            }
            const lastMessage = nextMessages[nextMessages.length - 1];
            return {
              ...chat,
              last_message: lastMessage ? getChatPreviewText(lastMessage) : undefined,
              last_message_at: lastMessage?.created_at,
            };
          }),
        ),
      );

      return {
        ...current,
        [chatId]: nextMessages,
      };
    });
  }, [setChatMessages, setChats]);
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
  const isBackgroundSyncing = isChatsSyncing || isChatGroupsSyncing;
  const messengerThemeVars = React.useMemo(
    () => MESSENGER_THEME_VARS[messengerTheme],
    [messengerTheme],
  );

  const closeModal = React.useCallback(() => {
    setModal({ clear: true });
  }, [setModal]);
  const { linkPreviewByUrl } = useLinkPreviews(selectedMessages);
  const {
    activeVoiceMessageId,
    voicePlaybackByMessageId,
    formatVoiceTime,
    toggleVoiceMessagePlayback,
    registerVoiceAudioElement,
    getVoiceAudioHandlers,
  } = useVoicePlayback(selectedChatId);

  React.useEffect(() => {
    void AuthApi.getProfile()
      .then(({ data }) => {
        setCurrentUserId(data.id);
        setCurrentUsername(data.username);
        setYoutubeAccessMode(data.youtube_access_mode ?? "direct");
        setYoutubeAssistEnabled(Boolean(data.youtube_assisted_enabled));
        setCanEnableYouTubeAssist(Boolean(data.can_enable_assisted));
      })
      .catch(() => undefined);
  }, []);

  const refreshExpenseContext = React.useCallback(async (chatId: number) => {
    const [participantsRes, overviewRes] = await Promise.all([
      MessengerApi.getChatParticipants(chatId),
      MessengerApi.getChatExpenseOverview(chatId),
    ]);
    setExpenseParticipants(participantsRes.data);
    setExpenseOverview(overviewRes.data);
  }, []);

  const refreshExpensesViewData = React.useCallback(async (chatId: number) => {
    const [expensesRes, paymentsRes, overviewRes, participantsRes] = await Promise.all([
      MessengerApi.getChatExpenses(chatId),
      MessengerApi.getChatExpensePayments(chatId),
      MessengerApi.getChatExpenseOverview(chatId),
      MessengerApi.getChatParticipants(chatId),
    ]);
    setChatExpenses(expensesRes.data);
    setExpensePayments(paymentsRes.data);
    setExpenseOverview(overviewRes.data);
    setExpenseParticipants(participantsRes.data);
  }, []);

  React.useEffect(() => {
    if (!isExpenseModalOpen || selectedChatId === null) {
      return;
    }
    void refreshExpenseContext(selectedChatId).catch(() => undefined);
  }, [isExpenseModalOpen, selectedChatId, refreshExpenseContext]);

  React.useEffect(() => {
    if (!isExpensesViewOpen || selectedChatId === null) {
      return;
    }
    setIsExpensesViewLoading(true);
    void refreshExpensesViewData(selectedChatId)
      .catch(() => undefined)
      .finally(() => setIsExpensesViewLoading(false));
  }, [isExpensesViewOpen, selectedChatId, refreshExpensesViewData]);

  React.useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!isResizingExpensesPanelRef.current) {
        return;
      }
      const nextWidth = clampExpensesPanelWidth(window.innerWidth - event.clientX);
      setExpensesPanelWidth(nextWidth);
    };
    const handleMouseUp = () => {
      if (!isResizingExpensesPanelRef.current) {
        return;
      }
      isResizingExpensesPanelRef.current = false;
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [clampExpensesPanelWidth]);

  const watchRoomViewerItems = React.useMemo(() => {
    if (!activeWatchRoom) {
      return [];
    }

    return activeWatchRoom.viewer_user_ids.map((userId) => {
      const knownUser = availableUsers.find((user) => user.id === userId);
      const isCurrentUser = currentUserId === userId;
      const username = knownUser?.username ??
        (isCurrentUser && currentUsername ? currentUsername : `User ${userId}`);
      return {
        userId,
        username,
        isCurrentUser,
      };
    });
  }, [activeWatchRoom, availableUsers, currentUserId, currentUsername]);

  const syncTargetViewerItems = React.useMemo(
    () => watchRoomViewerItems.filter((viewer) => !viewer.isCurrentUser),
    [watchRoomViewerItems],
  );

  const syncedToUserName = React.useMemo(
    () => watchRoomViewerItems.find((viewer) => viewer.userId === syncedToUserId)?.username ?? null,
    [watchRoomViewerItems, syncedToUserId],
  );
  const activeWatchRoomChatMessages = React.useMemo(
    () => (activeWatchRoom ? watchRoomChatMessagesByRoomId[activeWatchRoom.id] ?? [] : []),
    [activeWatchRoom, watchRoomChatMessagesByRoomId],
  );
  const activeWatchRoomReactions = React.useMemo(
    () => (activeWatchRoom ? watchRoomReactionsByRoomId[activeWatchRoom.id] ?? [] : []),
    [activeWatchRoom, watchRoomReactionsByRoomId],
  );
  const activeWatchRoomYouTubeAccessMode = React.useMemo(
    () => youtubeAccessMode,
    [youtubeAccessMode],
  );

  React.useEffect(() => {
    syncedToUserIdRef.current = syncedToUserId;
  }, [syncedToUserId]);

  React.useEffect(() => {
    activeWatchRoomIdRef.current = activeWatchRoom?.id ?? null;
  }, [activeWatchRoom?.id]);

  React.useEffect(() => {
    activeWatchRoomRef.current = activeWatchRoom;
  }, [activeWatchRoom]);

  React.useEffect(() => {
    if (!activeWatchRoom?.id) {
      return;
    }
    const roomId = activeWatchRoom.id;
    void MessengerApi.getWatchRoomMessages(roomId, 120)
      .then(({ data }) => {
        const filteredMessages = data.filter((message) => !tryExtractWatchRoomReactionEmoji(message.content));
        setWatchRoomChatMessagesByRoomId((current) => ({
          ...current,
          [roomId]: filteredMessages,
        }));
      })
      .catch(() => undefined);
  }, [activeWatchRoom?.id, tryExtractWatchRoomReactionEmoji]);

  React.useEffect(() => {
    isSocketConnectedRef.current = isSocketConnected;
  }, [isSocketConnected]);

  React.useEffect(() => {
    if (!activeWatchRoom?.id) {
      lastWatchRoomPlaybackSentAtRef.current = 0;
    }
  }, [activeWatchRoom?.id]);

  React.useEffect(() => {
    if (syncedToUserId === null) {
      clearSyncEnsureTimeouts();
    }
  }, [clearSyncEnsureTimeouts, syncedToUserId]);

  React.useEffect(() => {
    return () => {
      clearSyncEnsureTimeouts();
    };
  }, [clearSyncEnsureTimeouts]);

  React.useEffect(() => {
    if (selectedChatId === null) {
      return;
    }

    const youtubeIds = Array.from(
      new Set(
        selectedMessages
          .map((message) => extractYouTubeVideoId(message.text))
          .filter((videoId): videoId is string => Boolean(videoId)),
      ),
    );

    if (youtubeIds.length === 0) {
      return;
    }

    const loadRooms = async () => {
      for (const youtubeId of youtubeIds) {
        const roomKey = watchRoomMapKey(selectedChatId, youtubeId);
        if (unavailableWatchRoomKeysRef.current.has(roomKey)) {
          continue;
        }
        try {
          const { data } = await MessengerApi.getWatchRoomByChat(selectedChatId, youtubeId);
          unavailableWatchRoomKeysRef.current.delete(roomKey);
          setWatchRoomsByKey((current) => ({
            ...current,
            [roomKey]: data,
          }));
        } catch {
          unavailableWatchRoomKeysRef.current.add(roomKey);
          setWatchRoomsByKey((current) => {
            const next = { ...current };
            delete next[roomKey];
            return next;
          });
        }
      }
    };

    void loadRooms();
  }, [selectedChatId, selectedMessages]);

  React.useEffect(() => {
    const roomId = activeWatchRoom?.id;
    const syncRevision = activeWatchRoom?.sync_revision;
    const syncCurrentTimeSeconds = activeWatchRoom?.sync_current_time_seconds;
    const syncIsPlaying = activeWatchRoom?.sync_is_playing;
    if (
      roomId === undefined ||
      syncRevision === undefined ||
      syncCurrentTimeSeconds === undefined ||
      syncIsPlaying === undefined
    ) {
      return;
    }

    setWatchRoomPlaybackSeconds(syncCurrentTimeSeconds);
    if (!syncIsPlaying) {
      return;
    }

    const intervalId = setInterval(() => {
      setWatchRoomPlaybackSeconds((current) => current + 1);
    }, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [activeWatchRoom?.id, activeWatchRoom?.sync_revision, activeWatchRoom?.sync_current_time_seconds, activeWatchRoom?.sync_is_playing]);

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
    const storedTheme = window.localStorage.getItem(MESSENGER_THEME_STORAGE_KEY);
    if (storedTheme === "retro" || storedTheme === "mono") {
      setMessengerTheme(storedTheme);
    }
  }, []);

  React.useEffect(() => {
    window.localStorage.setItem(MESSENGER_THEME_STORAGE_KEY, messengerTheme);
  }, [messengerTheme]);

  React.useEffect(() => {
    const cachedChats = parseChatsCache(
      window.localStorage.getItem(CHATS_CACHE_STORAGE_KEY),
    );
    if (cachedChats && cachedChats.length > 0) {
      setChats(sortChatsByRules(cachedChats));
    }

    const cachedChatGroups = parseChatGroupsCache(
      window.localStorage.getItem(CHAT_GROUPS_CACHE_STORAGE_KEY),
    );
    if (cachedChatGroups && cachedChatGroups.length > 0) {
      setChatFolders(cachedChatGroups);
    }

    didHydrateCacheRef.current = true;
  }, [setChats]);

  React.useEffect(() => {
    refreshChats();
    refreshChatGroups();
  }, [refreshChatGroups, refreshChats]);

  React.useEffect(() => {
    if (!didHydrateCacheRef.current) {
      return;
    }

    window.localStorage.setItem(CHATS_CACHE_STORAGE_KEY, JSON.stringify(chats));
  }, [chats]);

  React.useEffect(() => {
    if (!didHydrateCacheRef.current) {
      return;
    }

    window.localStorage.setItem(
      CHAT_GROUPS_CACHE_STORAGE_KEY,
      JSON.stringify(chatFolders),
    );
  }, [chatFolders]);

  React.useEffect(() => {
    if (!hasChatsSyncedOnce || !hasChatGroupsSyncedOnce) {
      return;
    }

    const allowedChatIds = new Set(chatsForFolders.map((chat) => chat.id));
    setChatFolders((currentFolders) =>
      currentFolders.map((folder) => ({
        ...folder,
        chat_ids: folder.chat_ids.filter((chatId) => allowedChatIds.has(chatId)),
      })),
    );
  }, [chatsForFolders, hasChatsSyncedOnce, hasChatGroupsSyncedOnce]);

  React.useEffect(() => {
    selectedChatIdRef.current = selectedChatId;
  }, [selectedChatId]);

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    let pollId: ReturnType<typeof setInterval> | null = null;
    let pollAttempts = 0;
    const ensureApiReady = () => {
      if (window.YT?.Player) {
        youTubeApiReadyRef.current = true;
        setIsYouTubeApiReady(true);
        setIsYouTubeApiBlocked(false);
        if (pollId) {
          clearInterval(pollId);
          pollId = null;
        }
        return true;
      }
      return false;
    };

    if (window.YT?.Player) {
      youTubeApiReadyRef.current = true;
      setIsYouTubeApiReady(true);
      setIsYouTubeApiBlocked(false);
      return;
    }
    const existingScript = document.getElementById("youtube-iframe-api");
    if (existingScript) {
      window.onYouTubeIframeAPIReady = () => {
        youTubeApiReadyRef.current = true;
        setIsYouTubeApiReady(true);
        setIsYouTubeApiBlocked(false);
      };
      if (!ensureApiReady()) {
        pollId = setInterval(() => {
          pollAttempts += 1;
          if (ensureApiReady() || pollAttempts > 60) {
            if (pollId) {
              clearInterval(pollId);
              pollId = null;
            }
          }
        }, 250);
      }
      return () => {
        if (pollId) {
          clearInterval(pollId);
        }
      };
    }

    const script = document.createElement("script");
    script.id = "youtube-iframe-api";
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.onerror = () => {
      youTubeApiReadyRef.current = false;
      setIsYouTubeApiReady(false);
      setIsYouTubeApiBlocked(true);
    };
    script.onload = () => {
      void ensureApiReady();
    };
    document.body.appendChild(script);
    window.onYouTubeIframeAPIReady = () => {
      youTubeApiReadyRef.current = true;
      setIsYouTubeApiReady(true);
      setIsYouTubeApiBlocked(false);
    };
    pollId = setInterval(() => {
      pollAttempts += 1;
      if (ensureApiReady() || pollAttempts > 60) {
        if (pollId) {
          clearInterval(pollId);
          pollId = null;
        }
      }
    }, 250);

    return () => {
      if (pollId) {
        clearInterval(pollId);
      }
    };
  }, []);

  React.useEffect(() => {
    const initialSyncSeconds = activeWatchRoom?.sync_current_time_seconds ?? 0;
    const initialSyncIsPlaying = activeWatchRoom?.sync_is_playing ?? false;
    if (activeWatchRoomYouTubeAccessMode === "assisted") {
      const previousPlayer = youTubePlayerRef.current;
      if (hasYouTubePlayerMethods(previousPlayer)) {
        previousPlayer.destroy();
      }
      youTubePlayerRef.current = null;
      setIsYouTubePlayerReady(false);
      setIsYouTubeApiBlocked(false);
      return;
    }
    if (
      !youtubePreviewVideoId ||
      !youTubePlayerHostElement ||
      !window.YT?.Player ||
      !isYouTubeApiReady
    ) {
      return;
    }

    setIsYouTubePlayerReady(false);
    const previousPlayer = youTubePlayerRef.current;
    if (hasYouTubePlayerMethods(previousPlayer)) {
      previousPlayer.destroy();
    }
    youTubePlayerRef.current = null;

    youTubePlayerHostElement.innerHTML = "";
    const playerMountNode = document.createElement("div");
    playerMountNode.style.width = "100%";
    playerMountNode.style.height = "100%";
    youTubePlayerHostElement.appendChild(playerMountNode);

    const createdPlayer = new window.YT.Player(playerMountNode, {
      width: "100%",
      height: "100%",
      videoId: youtubePreviewVideoId,
      playerVars: {
        autoplay: 1,
        controls: 1,
        rel: 0,
        fs: 0,
        enablejsapi: 1,
        origin: window.location.origin,
        playsinline: 1,
      },
      events: {
        onReady: (event) => {
          const playerInstance = hasYouTubePlayerMethods(event.target)
            ? event.target
            : (hasYouTubePlayerMethods(createdPlayer) ? createdPlayer : null);
          if (!playerInstance) {
            setIsYouTubePlayerReady(false);
            setIsYouTubeApiBlocked(true);
            return;
          }
          youTubePlayerRef.current = playerInstance;
          setIsYouTubePlayerReady(true);
          setIsYouTubeApiBlocked(false);
          setSyncedToUserId(null);
          suppressUnsyncUntilRef.current = Date.now() + 1500;
          playerInstance.seekTo(initialSyncSeconds, true);
          if (initialSyncIsPlaying) {
            playerInstance.playVideo();
          } else {
            playerInstance.pauseVideo();
          }
        },
        onError: () => {
          setIsYouTubePlayerReady(false);
          setIsYouTubeApiBlocked(true);
        },
        onStateChange: (event) => {
          if (syncedToUserIdRef.current === null) {
            sendWatchRoomPlaybackUpdate(true);
            return;
          }
          if (Date.now() < suppressUnsyncUntilRef.current) {
            sendWatchRoomPlaybackUpdate(true);
            return;
          }
          const state = event.data;
          const unstartedState = -1;
          const endedState = 0;
          if (state === unstartedState || state === endedState) {
            setSyncedToUserId(null);
          }
          sendWatchRoomPlaybackUpdate(true);
        },
      },
    });
    const playerReadyTimeoutId = setTimeout(() => {
      if (hasYouTubePlayerMethods(youTubePlayerRef.current)) {
        return;
      }
      setIsYouTubePlayerReady(false);
      setIsYouTubeApiBlocked(true);
      if (hasYouTubePlayerMethods(createdPlayer)) {
        createdPlayer.destroy();
      }
    }, 10000);

    return () => {
      clearTimeout(playerReadyTimeoutId);
      setIsYouTubePlayerReady(false);
      if (hasYouTubePlayerMethods(youTubePlayerRef.current)) {
        youTubePlayerRef.current.destroy();
      }
      if (hasYouTubePlayerMethods(createdPlayer)) {
        createdPlayer.destroy();
      }
      if (youTubePlayerHostElement) {
        youTubePlayerHostElement.innerHTML = "";
      }
      youTubePlayerRef.current = null;
    };
  }, [
    activeWatchRoomYouTubeAccessMode,
    isYouTubeApiReady,
    youtubePreviewVideoId,
    activeWatchRoom?.id,
    activeWatchRoom?.host_user_id,
    currentUserId,
    youTubePlayerHostElement,
    sendWatchRoomPlaybackUpdate,
  ]);

  React.useEffect(() => {
    if (isYouTubePlayerUsable || syncedToUserId === null) {
      return;
    }
    setSyncedToUserId(null);
  }, [isYouTubePlayerUsable, syncedToUserId]);

  React.useEffect(() => {
    if (
      !activeWatchRoom ||
      !isYouTubePlayerUsable ||
      syncedToUserId === null
    ) {
      return;
    }

    const targetState = getViewerSyncStates(activeWatchRoom).find((state) => state.user_id === syncedToUserId);
    if (!targetState) {
      setSyncedToUserId(null);
      return;
    }

    const player = youTubePlayerRef.current;
    if (!hasYouTubePlayerMethods(player)) {
      return;
    }

    const expectedSeconds = resolveTargetPlaybackSeconds(targetState);
    const localSeconds = player.getCurrentTime();
    const driftSeconds = Math.abs(localSeconds - expectedSeconds);
    const localIsPlaying = player.getPlayerState() === (window.YT?.PlayerState?.PLAYING ?? 1);
    const isPlaybackStateMismatched = localIsPlaying !== targetState.is_playing;
    if (isPlaybackStateMismatched || driftSeconds > 0.75) {
      void applyTargetSyncStateToPlayer(targetState);
    }
  }, [
    activeWatchRoom,
    isYouTubePlayerUsable,
    syncedToUserId,
    resolveTargetPlaybackSeconds,
    applyTargetSyncStateToPlayer,
  ]);

  React.useEffect(() => {
    if (
      !activeWatchRoom ||
      !isYouTubePlayerUsable ||
      syncedToUserId === null
    ) {
      return;
    }

    const intervalId = setInterval(() => {
      const player = youTubePlayerRef.current;
      if (!hasYouTubePlayerMethods(player)) {
        return;
      }

      const targetState = getViewerSyncStates(activeWatchRoom).find((state) => state.user_id === syncedToUserId);
      if (!targetState) {
        setSyncedToUserId(null);
        return;
      }

      const expectedSeconds = resolveTargetPlaybackSeconds(targetState);
      const driftSeconds = Math.abs(player.getCurrentTime() - expectedSeconds);
      if (driftSeconds > 1.3) {
        setSyncedToUserId(null);
      }
    }, 700);

    return () => {
      clearInterval(intervalId);
    };
  }, [activeWatchRoom, isYouTubePlayerUsable, resolveTargetPlaybackSeconds, syncedToUserId]);

  React.useEffect(() => {
    if (!activeWatchRoom || !isYouTubePlayerUsable) {
      return;
    }
    if (!isSocketConnected || !socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    sendWatchRoomPlaybackUpdate(true);
    const intervalId = setInterval(() => {
      sendWatchRoomPlaybackUpdate(false);
    }, 450);

    return () => {
      clearInterval(intervalId);
    };
  }, [
    activeWatchRoom?.id,
    isYouTubePlayerUsable,
    isSocketConnected,
    sendWatchRoomPlaybackUpdate,
  ]);

  React.useEffect(() => {
    void MessengerApi.getAvailableUsers()
      .then(({ data }) => {
        setAvailableUsers(data);
      })
      .catch(() => undefined);
  }, []);

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

      if (payload.type === "watch_room_updated") {
        const room = payload.room;
        setWatchRoomsByKey((current) => ({
          ...current,
          [watchRoomMapKey(room.chat_id, room.youtube_video_id)]: room,
        }));
        setActiveWatchRoom((current) => (
          current && current.id === room.id ? room : current
        ));
        return;
      }

      if (payload.type === "watch_room_invite") {
        const invite = payload.invite;
        setModal({
          open: true,
          title: "Watch Room Invite",
          onCancel: closeModal,
          footer: null,
          content: (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <Text>{`${invite.from_username} invited you to watch together.`}</Text>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                <Button
                  onClick={() => {
                    void MessengerApi.declineWatchRoomInvite(invite.id);
                    closeModal();
                  }}
                >
                  Decline
                </Button>
                <Button
                  type="primary"
                  onClick={() => {
                    void MessengerApi.acceptWatchRoomInvite(invite.id).then(({ data }) => {
                      setActiveWatchRoom(data);
                      setYoutubePreviewVideoId(data.youtube_video_id);
                      setWatchRoomsByKey((current) => ({
                        ...current,
                        [watchRoomMapKey(data.chat_id, data.youtube_video_id)]: data,
                      }));
                    });
                    closeModal();
                  }}
                >
                  Join
                </Button>
              </div>
            </div>
          ),
        });
        return;
      }

      if (payload.type === "watch_room_chat_message") {
        const nextRoomMessage = payload.message;
        const reactionEmoji = tryExtractWatchRoomReactionEmoji(nextRoomMessage.content);
        if (reactionEmoji) {
          appendWatchRoomReaction(nextRoomMessage.room_id, reactionEmoji);
          return;
        }
        setWatchRoomChatMessagesByRoomId((current) => {
          const existingMessages = current[nextRoomMessage.room_id] ?? [];
          if (existingMessages.some((message) => message.id === nextRoomMessage.id)) {
            return current;
          }
          return {
            ...current,
            [nextRoomMessage.room_id]: [...existingMessages, nextRoomMessage],
          };
        });
        return;
      }

      if (payload.type === "message_deleted") {
        applyDeletedMessageLocally(payload.chat_id, payload.message_id);
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
                  last_message: getChatPreviewText(nextMessage),
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
  }, [
    applyDeletedMessageLocally,
    appendWatchRoomReaction,
    closeModal,
    refreshChats,
    setChatMessages,
    setChats,
    setModal,
    tryExtractWatchRoomReactionEmoji,
  ]);

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

  async function handleSendAttachment(
    file: File,
    kind: AttachmentPickerKind,
    existingMessageId?: number,
    caption?: string,
    attachmentGroupId?: string,
    manageUploadState: boolean = true,
  ): Promise<void> {
    if (selectedChatId === null) {
      antdMessage.error("Select a chat first.");
      return;
    }

    if (file.size > ATTACHMENT_MAX_SIZE_BYTES) {
      antdMessage.error("File is too large.");
      return;
    }

    const contentType = resolveContentTypeForFile(file, kind);
    const optimisticVoiceDurationSeconds = contentType === "voice"
      ? await readAudioDurationSeconds(file)
      : null;
    const optimisticMessageId = existingMessageId ?? -Date.now();
    const localPreviewUrl =
      contentType === "image" || contentType === "video" || contentType === "voice"
        ? URL.createObjectURL(file)
        : undefined;

    attachmentRetryFilesRef.current.set(optimisticMessageId, { file, kind });

    if (existingMessageId === undefined) {
      const optimisticMessage: ChatMessageType = {
        id: optimisticMessageId,
        chat_id: selectedChatId,
        text: caption ?? "",
        content_type: contentType,
        attachment_group_id: attachmentGroupId,
        attachment: {
          id: `local-${optimisticMessageId}`,
          original_name: file.name,
          mime_type: file.type || "application/octet-stream",
          size_bytes: file.size,
          duration_seconds: optimisticVoiceDurationSeconds ?? undefined,
          url: localPreviewUrl,
          status: "pending",
          upload_progress: 0,
        },
        created_at: new Date().toISOString(),
        is_own: true,
        delivery_status: "pending",
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
                last_message: getChatPreviewText(optimisticMessage),
                last_message_at: optimisticMessage.created_at,
              }
            : chat,
        )),
      );
    } else {
      setChatMessages((current) => {
        const existingMessages = current[selectedChatId] ?? [];
        return {
          ...current,
          [selectedChatId]: existingMessages.map((message) =>
            message.id === existingMessageId
              ? {
                  ...message,
                  content_type: contentType,
                  attachment: message.attachment
                    ? {
                        ...message.attachment,
                        original_name: file.name,
                        mime_type: file.type || "application/octet-stream",
                        size_bytes: file.size,
                        duration_seconds: optimisticVoiceDurationSeconds ?? undefined,
                        url: localPreviewUrl ?? message.attachment.url,
                        status: "pending",
                        upload_progress: 0,
                      }
                    : {
                        id: `local-${existingMessageId}`,
                        original_name: file.name,
                        mime_type: file.type || "application/octet-stream",
                        size_bytes: file.size,
                        duration_seconds: optimisticVoiceDurationSeconds ?? undefined,
                        url: localPreviewUrl,
                        status: "pending",
                        upload_progress: 0,
                      },
                }
              : message,
          ),
        };
      });
    }
    setReplyTarget(null);
    stickToBottomRef.current = true;

    requestAnimationFrame(() => {
      const container = messagesContainerRef.current;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    });

    if (manageUploadState) {
      setIsAttachmentUploading(true);
    }

    try {
      const { data: initData } = await MessengerApi.initAttachment(selectedChatId, {
        filename: file.name,
        mime_type: file.type || "application/octet-stream",
        size_bytes: file.size,
      });

      await uploadFileWithProgress(
        initData.upload_url,
        initData.upload_method ?? "PUT",
        initData.headers,
        file,
        (progress) => {
          setChatMessages((current) => {
            const existingMessages = current[selectedChatId] ?? [];
            return {
              ...current,
              [selectedChatId]: existingMessages.map((message) =>
                message.id === optimisticMessageId && message.attachment
                  ? {
                      ...message,
                      attachment: {
                        ...message.attachment,
                        upload_progress: progress,
                      },
                    }
                  : message,
              ),
            };
          });
        },
      );

      await MessengerApi.completeAttachment(selectedChatId, initData.attachment_id, {
        duration_seconds: optimisticVoiceDurationSeconds ?? undefined,
      });

      const { data: sentMessage } = await MessengerApi.sendMessage(selectedChatId, caption ?? "", {
        contentType,
        attachmentId: initData.attachment_id,
        attachmentGroupId,
      });

      const mappedMessage = mapApiMessage(sentMessage);

      setChatMessages((current) => {
        const existingMessages = current[selectedChatId] ?? [];
        const nextMessages = existingMessages.map((message) =>
          message.id === optimisticMessageId ? mappedMessage : message,
        );

        return {
          ...current,
          [selectedChatId]: nextMessages,
        };
      });

      setChats((currentChats) =>
        sortChatsByRules(currentChats.map((chat) =>
          chat.id === selectedChatId
            ? {
                ...chat,
                last_message: getChatPreviewText(mappedMessage),
                last_message_at: mappedMessage.created_at,
              }
            : chat,
        )),
      );
      attachmentRetryFilesRef.current.delete(optimisticMessageId);
    } catch {
      setChatMessages((current) => {
        const existingMessages = current[selectedChatId] ?? [];
        const nextMessages: ChatMessageType[] = existingMessages.map((message) => {
          if (message.id !== optimisticMessageId) {
            return message;
          }

          const nextAttachment = message.attachment
            ? {
                ...message.attachment,
                status: "failed" as const,
                upload_progress: undefined,
              }
            : undefined;

          return {
            ...message,
            delivery_status: "pending",
            attachment: nextAttachment,
          };
        });

        return {
          ...current,
          [selectedChatId]: nextMessages,
        };
      });
      antdMessage.error("Failed to upload attachment.");
    } finally {
      if (manageUploadState) {
        setIsAttachmentUploading(false);
      }
    }
  }

  async function handleSendAttachmentBatch(files: File[], caption: string): Promise<void> {
    if (files.length === 0) {
      return;
    }

    setIsAttachmentUploading(true);
    try {
      const attachmentGroupId = createClientMessageId();
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        const kind = resolveAttachmentPickerKind(file);
        const fileCaption = index === 0 ? caption : "";
        await handleSendAttachment(file, kind, undefined, fileCaption, attachmentGroupId, false);
      }
    } finally {
      setIsAttachmentUploading(false);
    }
  }

  async function handleRetryAttachment(messageId: number) {
    const retryData = attachmentRetryFilesRef.current.get(messageId);
    if (!retryData) {
      antdMessage.info("Choose the file again to retry.");
      return;
    }

    await handleSendAttachment(retryData.file, retryData.kind, messageId);
  }

  async function handleDeleteMessage(messageId: number) {
    if (selectedChatId === null) {
      return;
    }
    try {
      const { data } = await MessengerApi.deleteMessage(selectedChatId, messageId);
      applyDeletedMessageLocally(data.chat_id, data.message_id);
    } catch {
      antdMessage.error("Failed to delete message.");
    }
  }

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
          <Text strong className="retro-pixel-text" style={{ fontSize: "16px" }}>
            {selectedChat.title}
          </Text>
        </div>
      ),
    });
  }

  async function handleOpenAttachment(message: ChatMessageType) {
    const attachment = message.attachment;
    if (!attachment || attachment.status === "failed") {
      return;
    }

    if (attachment.url) {
      window.open(attachment.url, "_blank", "noopener,noreferrer");
      return;
    }

    try {
      const { data } = await MessengerApi.getAttachmentDownloadUrl(
        message.chat_id,
        attachment.id,
      );
      setChatMessages((current) => {
        const existingMessages = current[message.chat_id] ?? [];
        return {
          ...current,
          [message.chat_id]: existingMessages.map((existingMessage) =>
            existingMessage.id === message.id && existingMessage.attachment
              ? {
                  ...existingMessage,
                  attachment: {
                    ...existingMessage.attachment,
                    url: data.url.startsWith("http")
                      ? data.url
                      : `${API_BASE_URL.replace(/\/$/, "")}/${data.url.replace(/^\//, "")}`,
                  },
                }
              : existingMessage,
          ),
        };
      });
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch {
      antdMessage.error("Failed to open attachment.");
    }
  }

  function handleMessagesDragEnter(event: React.DragEvent<HTMLDivElement>) {
    if (!selectedChatId) {
      return;
    }

    if (!event.dataTransfer.types.includes("Files")) {
      return;
    }

    event.preventDefault();
    dragCounterRef.current += 1;
    setIsMessagesDragOver(true);
  }

  function handleMessagesDragOver(event: React.DragEvent<HTMLDivElement>) {
    if (!selectedChatId || !event.dataTransfer.types.includes("Files")) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setIsMessagesDragOver(true);
  }

  function handleMessagesDragLeave(event: React.DragEvent<HTMLDivElement>) {
    if (!selectedChatId || !event.dataTransfer.types.includes("Files")) {
      return;
    }

    event.preventDefault();
    dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
    if (dragCounterRef.current === 0) {
      setIsMessagesDragOver(false);
    }
  }

  async function handleMessagesDrop(event: React.DragEvent<HTMLDivElement>) {
    if (!selectedChatId) {
      return;
    }

    event.preventDefault();
    dragCounterRef.current = 0;
    setIsMessagesDragOver(false);
    const droppedFile = event.dataTransfer.files?.[0];
    if (!droppedFile) {
      return;
    }

    await handleSendAttachment(droppedFile, resolveAttachmentPickerKind(droppedFile));
  }

  function handleToggleMessengerTheme() {
    setMessengerTheme((currentTheme) =>
      currentTheme === "retro" ? "mono" : "retro",
    );
  }

  async function handleCreateExpense(data: {
    title: string;
    amountMinor: number;
    currency: string;
    payerUserId: number | null;
    participantUserIds: number[];
    sharesMinor?: Array<{ user_id: number; share_minor: number }>;
  }) {
    if (selectedChatId === null || data.payerUserId === null) {
      return;
    }

    try {
      setIsExpenseSubmitting(true);
      const { data: expense } = await MessengerApi.createExpense(selectedChatId, {
        title: data.title,
        amount_minor: data.amountMinor,
        currency: data.currency,
        payer_user_id: data.payerUserId,
        participant_user_ids: data.participantUserIds,
        shares_minor: data.sharesMinor,
      });
      await refreshExpenseContext(selectedChatId);
      if (isExpensesViewOpen) {
        await refreshExpensesViewData(selectedChatId);
      }

      const participantNameById = new Map<number, string>();
      expenseParticipants.forEach((participant) => {
        participantNameById.set(participant.id, participant.username);
      });
      const payerName = participantNameById.get(expense.payer_user_id) ?? `User ${expense.payer_user_id}`;
      const shareLines = expense.shares
        .filter((share) => share.user_id !== expense.payer_user_id)
        .map((share) => {
          const username = participantNameById.get(share.user_id) ?? `User ${share.user_id}`;
          return `- ${username} owes ${(share.share_minor / 100).toFixed(2)} ${expense.currency}`;
        });
      const summaryText = [
        `Split expense: ${expense.title}`,
        `Total: ${(expense.amount_minor / 100).toFixed(2)} ${expense.currency}`,
        `Paid by: ${payerName}`,
        'Debts:',
        ...(shareLines.length > 0 ? shareLines : ['- No debts']),
      ].join('\n');

      await MessengerApi.sendMessage(selectedChatId, summaryText);
      antdMessage.success("Expense added.");
      setIsExpenseModalOpen(false);
    } catch {
      antdMessage.error("Failed to create expense.");
    } finally {
      setIsExpenseSubmitting(false);
    }
  }

  async function handleMarkExpenseSettlementPaid(payload: {
    from_user_id: number;
    to_user_id: number;
    amount_minor: number;
  }) {
    if (selectedChatId === null) {
      return;
    }
    try {
      setIsExpenseMarkingPaid(true);
      const { data } = await MessengerApi.markExpenseSettlementPaid(selectedChatId, payload);
      setExpenseOverview(data);
      if (isExpensesViewOpen) {
        await refreshExpensesViewData(selectedChatId);
      }
      antdMessage.success("Settlement marked as paid.");
    } catch {
      antdMessage.error("Failed to mark settlement as paid.");
    } finally {
      setIsExpenseMarkingPaid(false);
    }
  }

  async function handleOpenYouTubeWatchRoom(videoId: string) {
    if (selectedChatId === null) {
      return;
    }

    try {
      let room: WatchRoomType;
      try {
        const { data } = await MessengerApi.getWatchRoomByChat(selectedChatId, videoId);
        room = data;
      } catch {
        const { data } = await MessengerApi.createWatchRoom(selectedChatId, videoId);
        room = data;
      }

      const { data: joinedRoom } = await MessengerApi.joinWatchRoom(room.id);
      setIsYouTubeApiBlocked(false);
      setSyncedToUserId(null);
      unavailableWatchRoomKeysRef.current.delete(
        watchRoomMapKey(joinedRoom.chat_id, joinedRoom.youtube_video_id),
      );
      setActiveWatchRoom(joinedRoom);
      setYoutubePreviewVideoId(videoId);
      setWatchRoomsByKey((current) => ({
        ...current,
        [watchRoomMapKey(joinedRoom.chat_id, joinedRoom.youtube_video_id)]: joinedRoom,
      }));
    } catch {
      antdMessage.error("Failed to open watch room.");
    }
  }

  async function handleToggleYouTubeAssistEnabled(enabled: boolean) {
    try {
      const { data } = await AuthApi.setYouTubeAssistEnabled(enabled);
      setYoutubeAssistEnabled(data.youtube_assisted_enabled);
      setCanEnableYouTubeAssist(data.can_enable_assisted);
      setYoutubeAccessMode(data.youtube_access_mode);
      setActiveWatchRoom((current) => (
        current
          ? {
              ...current,
              youtube_access_mode: data.youtube_access_mode,
            }
          : current
      ));
    } catch {
      antdMessage.error("Failed to switch assisting mode.");
    }
  }

  async function handleSyncWatchRoom(targetUserId: number) {
    if (!activeWatchRoom || !hasYouTubePlayerMethods(youTubePlayerRef.current)) {
      return;
    }

    try {
      clearSyncEnsureTimeouts();
      setIsWatchRoomSyncing(true);
      const { data } = await MessengerApi.getWatchRoom(activeWatchRoom.id);
      const targetState = getViewerSyncStates(data).find((state) => state.user_id === targetUserId);
      if (!targetState) {
        throw new Error("Target user sync state not found");
      }

      const didApply = applyTargetSyncStateToPlayer(targetState);
      if (!didApply) {
        throw new Error("YouTube player is not ready");
      }

      setWatchRoomPlaybackSeconds(data.sync_current_time_seconds);
      setActiveWatchRoom(data);
      setWatchRoomsByKey((current) => ({
        ...current,
        [watchRoomMapKey(data.chat_id, data.youtube_video_id)]: data,
      }));
      setSyncedToUserId(targetUserId);
      const roomId = data.id;
      [350, 1100, 2200].forEach((delayMs) => {
        const timeoutId = setTimeout(() => {
          if (
            syncedToUserIdRef.current !== targetUserId ||
            activeWatchRoomIdRef.current !== roomId
          ) {
            return;
          }
          void MessengerApi.getWatchRoom(roomId)
            .then(({ data: latestRoom }) => {
              if (
                syncedToUserIdRef.current !== targetUserId ||
                activeWatchRoomIdRef.current !== roomId
              ) {
                return;
              }
              const latestTargetState = getViewerSyncStates(latestRoom).find(
                (state) => state.user_id === targetUserId,
              );
              if (!latestTargetState) {
                return;
              }
              void applyTargetSyncStateToPlayer(latestTargetState);
              setActiveWatchRoom(latestRoom);
              setWatchRoomsByKey((current) => ({
                ...current,
                [watchRoomMapKey(latestRoom.chat_id, latestRoom.youtube_video_id)]: latestRoom,
              }));
            })
            .catch(() => undefined);
        }, delayMs);
        syncEnsureTimeoutsRef.current.push(timeoutId);
      });
    } catch {
      setSyncedToUserId(null);
    } finally {
      setIsWatchRoomSyncing(false);
    }
  }

  async function handleInviteToWatchRoom() {
    if (!activeWatchRoom || watchRoomInviteUserId === null) {
      return;
    }
    try {
      await MessengerApi.inviteToWatchRoom(
        activeWatchRoom.id,
        watchRoomInviteUserId,
      );
      antdMessage.success("Invitation sent.");
      setIsWatchRoomInviteModalOpen(false);
      setWatchRoomInviteUserId(null);
    } catch {
      antdMessage.error("Failed to send invitation.");
    }
  }

  function handleSendWatchRoomChatMessage(content: string) {
    const room = activeWatchRoomRef.current;
    const socket = socketRef.current;
    if (!room || !socket || socket.readyState !== WebSocket.OPEN) {
      return;
    }
    socket.send(
      JSON.stringify({
        action: "watch_room_chat_send",
        chat_id: room.chat_id,
        room_id: room.id,
        content,
      }),
    );
  }

  function handleSendWatchRoomReaction(emoji: string) {
    const room = activeWatchRoomRef.current;
    const socket = socketRef.current;
    if (!room || !socket || socket.readyState !== WebSocket.OPEN) {
      return;
    }
    const content = `${WATCH_ROOM_REACTION_PREFIX}${emoji}`;
    socket.send(
      JSON.stringify({
        action: "watch_room_chat_send",
        chat_id: room.chat_id,
        room_id: room.id,
        content,
      }),
    );
  }

  async function handleCloseWatchRoom() {
    if (activeWatchRoom) {
      try {
        await MessengerApi.leaveWatchRoom(activeWatchRoom.id);
      } catch {
        // ignore leave errors
      }
    }
    clearSyncEnsureTimeouts();
    setIsYouTubePlayerReady(false);
    setSyncedToUserId(null);
    setIsWatchRoomInviteModalOpen(false);
    setWatchRoomInviteUserId(null);
    setActiveWatchRoom(null);
    setYoutubePreviewVideoId(null);
  }

  const syncTargetMenuItems: MenuProps["items"] = syncTargetViewerItems.map((viewer) => ({
    key: String(viewer.userId),
    label: viewer.username,
  }));

  return (
    <Fragment>
      <div
        className={`messenger-theme ${messengerTheme === "mono" ? "messenger-theme-mono" : "messenger-theme-retro"}`}
        style={{
          ...messengerThemeVars,
          display: "flex",
          width: "100%",
          minHeight: 0,
          gap: 0,
          color: "var(--mess-text)",
        }}
      >
      <Sider
        width="5%"
        style={{
          background: "var(--mess-sidebar-left)",
          border: "3px solid var(--line)",
          borderRight: 0,
          borderRadius: "10px 0 0 10px",
          overflow: "hidden",
          height: "100%",
          minHeight: 0,
        }}
      >
        <Header
          style={{
            background: "var(--mess-sidebar-mid)",
            padding: "0",
            borderBottom: "3px solid var(--line)",
          }}
        >
          <ControlPanel messengerTheme={messengerTheme} />
        </Header>
        <Content style={{ overflowY: "auto", minHeight: 0 }}>
          <ChatGroupsList
            groups={groupsForUi}
            selectedGroupId={selectedFolderId}
            onSelectGroup={handleSelectFolder}
            onOpenGroupSettings={handleOpenGroupSettings}
          />
        </Content>
      </Sider>
      <Sider
        width="25%"
        style={{
          background: "var(--mess-sidebar-mid)",
          border: "3px solid var(--line)",
          borderRight: 0,
          borderLeft: 0,
          overflow: "hidden",
          height: "100%",
          minHeight: 0,
        }}
      >
        <Layout style={{ height: "100%", minHeight: 0 }}>
          <Header
            style={{
              background: "var(--mess-sidebar-mid)",
              padding: "0 10px",
              borderBottom: "3px solid var(--line)",
            }}
          >
            <SearchInput />
          </Header>
          <Content style={{ background: "var(--mess-shell-bg)", overflowY: "auto", minHeight: 0 }}>
            <ChatsList
              chats={visibleChats}
              onClick={(chat) => handleSelectChat(chat.id)}
              onPinChat={(chat) => void handlePinChat(chat.id)}
              onUnpinChat={(chat) => void handleUnpinChat(chat.id)}
            />
          </Content>
        </Layout>
      </Sider>
      <Layout
        style={{
          border: "3px solid var(--line)",
          borderRadius: "0 10px 10px 0",
          overflow: "hidden",
          height: "100%",
          minHeight: 0,
          flex: 1,
        }}
      >
        <Header
          style={{
            background: "var(--mess-header)",
            padding: "0 12px",
            cursor: selectedChat ? "pointer" : "default",
            borderBottom: "3px solid var(--line)",
          }}
          onClick={handleSelectedChatInfoModal}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            {selectedChat ? (
              <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                <Avatar
                  size={36}
                  src={selectedChat.avatar_url}
                  icon={selectedChat.type === "private" ? <HomeFilled /> : undefined}
                />
                <span className="retro-pixel-text" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {selectedChat.title}
                </span>
              </div>
            ) : (
              <span className="retro-pixel-text">Select a chat</span>
            )}
            {isBackgroundSyncing ? (
              <Text
                className="retro-pixel-text"
                style={{ marginLeft: "12px", color: "var(--mess-muted-text)", fontSize: "10px" }}
              >
                Syncing...
              </Text>
            ) : null}
            <Button
              type="default"
              size="small"
              className="retro-pixel-text"
              style={{ marginLeft: "8px" }}
              onClick={(event) => {
                event.stopPropagation();
                if (selectedChatId === null) {
                  return;
                }
                setIsExpenseModalOpen(true);
              }}
              disabled={selectedChatId === null}
              hidden={!isExpenseFeatureEnabled}
            >
              Split
            </Button>
            <Button
              type="default"
              size="small"
              className="retro-pixel-text"
              style={{ marginLeft: "8px" }}
              onClick={(event) => {
                event.stopPropagation();
                if (selectedChatId === null) {
                  return;
                }
                setIsExpensesViewOpen((current) => !current);
              }}
              disabled={selectedChatId === null}
              hidden={!isExpenseFeatureEnabled}
            >
              Expenses
            </Button>
            <Button
              type="default"
              size="small"
              className="retro-pixel-text"
              style={{ marginLeft: "8px" }}
              onClick={(event) => {
                event.stopPropagation();
                handleToggleMessengerTheme();
              }}
            >
              {messengerTheme === "retro" ? "Mono" : "Retro"}
            </Button>
          </div>
        </Header>
        <div style={{ display: "flex", minHeight: 0, flex: 1 }}>
        <Content
          ref={messagesContainerRef}
          onScroll={handleMessagesScroll}
          onDragEnter={handleMessagesDragEnter}
          onDragOver={handleMessagesDragOver}
          onDragLeave={handleMessagesDragLeave}
          onDrop={(event) => {
            void handleMessagesDrop(event);
          }}
          style={{
            background: "var(--mess-shell-bg)",
            color: "var(--mess-text)",
            fontFamily:
              messengerTheme === "mono"
                ? "var(--font-geist-mono), monospace"
                : "var(--font-pixel), monospace",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-start",
            gap: "12px",
            overflowY: "auto",
            overflowX: "hidden",
            minWidth: 0,
            position: "relative",
            flex: 1,
          }}
        >
          {isMessagesDragOver ? (
            <div
              style={{
                position: "absolute",
                inset: "14px",
                zIndex: 5,
                border: "2px dashed var(--mess-highlight)",
                borderRadius: "12px",
                background: "var(--mess-soft-card-bg)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: "none",
              }}
            >
              <Text className="retro-pixel-text" style={{ color: "var(--mess-text)" }}>
                <InboxOutlined style={{ marginRight: "8px" }} />
                Drop file to upload
              </Text>
            </div>
          ) : null}
          {selectedChat ? (
            isMessagesLoading ? (
              "Loading messages..."
            ) : selectedMessages.length > 0 ? (
              <Fragment>
                {isOlderMessagesLoading ? (
                  <LoadingOutlined
                    spin
                    style={{ alignSelf: "center", color: "var(--mess-text)" }}
                  />
                ) : null}
                <Image.PreviewGroup>
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
                    ...(chatMessage.is_own
                      ? [
                          {
                            key: "delete",
                            label: "Delete",
                            danger: true,
                          },
                        ]
                      : []),
                  ];
                  const isMediaGroupCandidate = isGroupedMediaMessage(chatMessage);
                  const messageUrls = extractUrls(chatMessage.text);
                  const primaryMessageUrl = messageUrls[0] ?? null;
                  const youtubeVideoId = extractYouTubeVideoId(chatMessage.text);
                  const primaryLinkPreview = primaryMessageUrl
                    ? linkPreviewByUrl[primaryMessageUrl]
                    : undefined;
                  const primaryPreviewUrl = primaryLinkPreview?.url ?? primaryMessageUrl ?? "";
                  const primaryMessageUrlHost = primaryPreviewUrl
                    ? new URL(primaryPreviewUrl).hostname.replace(/^www\./, "")
                    : null;
                  const primaryYouTubeVideoId = primaryLinkPreview?.youtubeVideoId
                    ?? (primaryMessageUrl ? extractYouTubeVideoIdFromUrl(primaryMessageUrl) : null);
                  const watchRoomSummary = selectedChatId !== null && youtubeVideoId
                    ? watchRoomsByKey[watchRoomMapKey(selectedChatId, youtubeVideoId)]
                    : undefined;
                  const attachmentGroupId = chatMessage.attachment_group_id;
                  const previousIsSameMediaGroup =
                    isMediaGroupCandidate &&
                    Boolean(
                      attachmentGroupId &&
                      previousMessage &&
                      previousMessage.attachment_group_id === attachmentGroupId &&
                      isGroupedMediaMessage(previousMessage),
                    );
                  if (previousIsSameMediaGroup) {
                    return null;
                  }

                  const mediaGroupMessages: ChatMessageType[] = [chatMessage];
                  if (isMediaGroupCandidate && attachmentGroupId) {
                    for (let nextIndex = index + 1; nextIndex < selectedMessages.length; nextIndex += 1) {
                      const candidate = selectedMessages[nextIndex];
                      if (
                        candidate.attachment_group_id !== attachmentGroupId ||
                        !isGroupedMediaMessage(candidate)
                      ) {
                        break;
                      }
                      mediaGroupMessages.push(candidate);
                    }
                  }
                  const hasMediaGroup = mediaGroupMessages.length > 1;
                  const isSingleVideoAttachment =
                    !hasMediaGroup &&
                    chatMessage.content_type === "video" &&
                    Boolean(chatMessage.attachment?.url);

                  return (
                    <Fragment key={chatMessage.id}>
                      {shouldShowDateDivider ? (
                        <div
                          style={{
                            position: "sticky",
                            top: 0,
                            zIndex: 2,
                            background: "var(--mess-date-bg)",
                            padding: "6px 0",
                            textAlign: "center",
                          }}
                        >
                          <Text style={{ color: "var(--mess-muted-text)" }}>
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
                              return;
                            }
                            if (key === "delete") {
                              void handleDeleteMessage(chatMessage.id);
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
                            display: "inline-flex",
                            flexDirection: "column",
                            width: isSingleVideoAttachment ? "340px" : "auto",
                            maxWidth: isSingleVideoAttachment ? "100%" : "70%",
                            background: chatMessage.is_own
                              ? "var(--mess-own-bubble)"
                              : "var(--mess-other-bubble)",
                            color: "var(--mess-text)",
                            fontFamily:
                              messengerTheme === "mono"
                                ? "var(--font-geist-mono), monospace"
                                : "var(--font-pixel), monospace",
                            borderRadius: "16px",
                            padding: "10px 14px",
                            overflowWrap: "anywhere",
                            wordBreak: "break-word",
                            cursor: "context-menu",
                            outline:
                              highlightedMessageId === chatMessage.id
                                ? "2px solid var(--mess-highlight)"
                                : "2px solid transparent",
                            boxShadow:
                              highlightedMessageId === chatMessage.id
                                ? "0 0 0 4px var(--mess-highlight-glow)"
                                : "none",
                            transition: "outline-color 0.25s ease, box-shadow 0.25s ease",
                          }}
                        >
                          {hasReference ? (
                            <ReplyReferenceBlock
                              referenceAuthor={referenceAuthor}
                              referenceContent={referenceContent}
                              referenceMessageId={chatMessage.reference_message_id}
                              onScrollToMessage={handleScrollToMessage}
                            />
                          ) : null}
                          {hasForwarded ? (
                            <ForwardedMessageBlock
                              forwarderName={forwarderName}
                              forwardedSourceAuthor={forwardedSourceAuthor}
                              forwardedSourceContent={forwardedSourceContent}
                              forwardedSourceAuthorAvatarUrl={chatMessage.forwarded_from_author_avatar_url}
                            />
                          ) : null}
                          <MessageAttachmentContent
                            chatMessage={chatMessage}
                            hasMediaGroup={hasMediaGroup}
                            mediaGroupMessages={mediaGroupMessages}
                            activeVoiceMessageId={activeVoiceMessageId}
                            voicePlaybackByMessageId={voicePlaybackByMessageId}
                            formatVoiceTime={formatVoiceTime}
                            toggleVoiceMessagePlayback={toggleVoiceMessagePlayback}
                            registerVoiceAudioElement={registerVoiceAudioElement}
                            getVoiceAudioHandlers={getVoiceAudioHandlers}
                            handleOpenAttachment={handleOpenAttachment}
                            handleRetryAttachment={handleRetryAttachment}
                          />
                          <MessageTextBlock
                            text={chatMessage.text}
                            messengerTheme={messengerTheme}
                          />
                          {primaryMessageUrl ? (
                            <MessageLinkPreviewBlock
                              messageUrl={primaryMessageUrl}
                              previewUrl={primaryPreviewUrl}
                              messageUrlHost={primaryMessageUrlHost}
                              title={primaryLinkPreview?.title}
                              description={primaryLinkPreview?.description}
                              imageUrl={primaryLinkPreview?.imageUrl}
                              siteName={primaryLinkPreview?.siteName}
                              youtubeVideoId={primaryYouTubeVideoId}
                            />
                          ) : null}
                          <MessageMetaRow
                            createdAt={chatMessage.created_at}
                            isOwn={chatMessage.is_own}
                            deliveryStatus={chatMessage.delivery_status}
                            youtubeVideoId={youtubeVideoId}
                            watcherCount={watchRoomSummary?.viewer_count}
                            messengerTheme={messengerTheme}
                            onOpenYouTubeWatchRoom={(videoId) => {
                              void handleOpenYouTubeWatchRoom(videoId);
                            }}
                          />
                        </div>
                      </Dropdown>
                    </Fragment>
                  );
                })}
                </Image.PreviewGroup>
              </Fragment>
            ) : (
              "No messages yet. Send the first one."
            )
          ) : (
            "Choose a chat from the list to start messaging."
          )}
        </Content>
        {isExpenseFeatureEnabled && isExpensesViewOpen ? (
          <div
            role="separator"
            aria-orientation="vertical"
            onMouseDown={(event) => {
              event.preventDefault();
              isResizingExpensesPanelRef.current = true;
              document.body.style.userSelect = "none";
              document.body.style.cursor = "col-resize";
            }}
            style={{
              width: "6px",
              cursor: "col-resize",
              background: "var(--line)",
              opacity: 0.55,
              transition: "opacity 0.15s ease",
              flexShrink: 0,
            }}
          />
        ) : null}
        <div
          style={{
            width: isExpenseFeatureEnabled && isExpensesViewOpen ? `${expensesPanelWidth}px` : "0px",
            transition: "width 0.2s ease",
            background: "var(--mess-shell-bg)",
            overflow: "hidden",
            minHeight: 0,
          }}
        >
          {isExpenseFeatureEnabled ? (
            <ChatExpensesPanel
              open={isExpensesViewOpen}
              onClose={() => setIsExpensesViewOpen(false)}
              messengerTheme={messengerTheme}
              isLoading={isExpensesViewLoading}
              participants={expenseParticipants}
              expenses={chatExpenses}
              overview={expenseOverview}
              payments={expensePayments}
            />
          ) : null}
        </div>
        </div>
        <Footer
          style={{
            background: "var(--mess-header)",
            padding: "16px 24px",
            borderTop: "3px solid var(--line)",
          }}
        >
          {selectedChat ? (
            <MessageComposer
              key={selectedChat.id}
              isSocketConnected={isSocketConnected}
              messengerTheme={messengerTheme}
              isAttachmentUploading={isAttachmentUploading}
              replyTarget={replyTarget}
              selectedChatTitle={selectedChat.title}
              onCancelReply={() => setReplyTarget(null)}
              onSendMessage={handleSendMessage}
              onSendAttachment={handleSendAttachment}
              onSendAttachmentBatch={handleSendAttachmentBatch}
            />
          ) : (
            "No active chat"
          )}
        </Footer>
      </Layout>
      </div>
      <YouTubeWatchRoomModals
        messengerTheme={messengerTheme}
        youtubePreviewVideoId={youtubePreviewVideoId}
        activeWatchRoom={activeWatchRoom}
        isWatchRoomSyncing={isWatchRoomSyncing}
        isYouTubePlayerUsable={isYouTubePlayerUsable}
        isYouTubeApiBlocked={isYouTubeApiBlocked}
        syncedToUserId={syncedToUserId}
        syncedToUserName={syncedToUserName}
        syncTargetMenuItems={syncTargetMenuItems}
        watchRoomViewerItems={watchRoomViewerItems}
        watchRoomChatMessages={activeWatchRoomChatMessages}
        watchRoomReactions={activeWatchRoomReactions}
        youtubeAccessMode={activeWatchRoomYouTubeAccessMode}
        youtubeAssistEnabled={youtubeAssistEnabled}
        canEnableYouTubeAssist={canEnableYouTubeAssist}
        currentUserId={currentUserId}
        isSocketConnected={isSocketConnected}
        isWatchRoomInviteModalOpen={isWatchRoomInviteModalOpen}
        watchRoomInviteUserId={watchRoomInviteUserId}
        availableUsers={availableUsers}
        onCloseWatchRoom={() => {
          void handleCloseWatchRoom();
        }}
        onSyncTargetSelect={(targetUserId) => {
          void handleSyncWatchRoom(targetUserId);
        }}
        onToggleYouTubeAssistEnabled={(enabled) => {
          void handleToggleYouTubeAssistEnabled(enabled);
        }}
        onOpenInviteModal={() => setIsWatchRoomInviteModalOpen(true)}
        onCloseInviteModal={() => {
          setIsWatchRoomInviteModalOpen(false);
          setWatchRoomInviteUserId(null);
        }}
        onInviteUserSelect={(userId) => setWatchRoomInviteUserId(userId)}
        onInviteConfirm={() => {
          void handleInviteToWatchRoom();
        }}
        onSendWatchRoomChatMessage={handleSendWatchRoomChatMessage}
        onSendWatchRoomReaction={handleSendWatchRoomReaction}
        handleYouTubePlayerHostRef={handleYouTubePlayerHostRef}
      />
      {isExpenseFeatureEnabled ? (
        <ExpenseSplitModal
          open={isExpenseModalOpen}
          participants={expenseParticipants}
          currentUserId={currentUserId}
          overview={expenseOverview}
          messengerTheme={messengerTheme}
          isSubmitting={isExpenseSubmitting}
          isMarkingPaid={isExpenseMarkingPaid}
          onCancel={() => setIsExpenseModalOpen(false)}
          onCreate={handleCreateExpense}
          onMarkSettlementPaid={handleMarkExpenseSettlementPaid}
        />
      ) : null}
      <AppModal />
    </Fragment>
  );
}

