"use client";
import React, { Fragment } from "react";
import { message as antdMessage } from "antd";
import LeftSider from "./components/LeftSider";
import ChatsListSider from "./components/ChatsListSider";
import YouTubeWatchRoomModals from "./components/YouTubeWatchRoomModals";
import ExpenseSplitModal from "./components/ExpenseSplitModal";
import Workspace from "./components/Workspace";
import {
  ALL_CHATS_GROUP_ID,
  CHAT_GROUPS_CACHE_STORAGE_KEY,
  CHATS_CACHE_STORAGE_KEY,
  ENABLE_EXPENSE_SPLIT_FEATURE,
  MESSENGER_THEME_STORAGE_KEY,
  MESSENGER_THEME_VARS,
  SCROLL_HIGHLIGHT_DURATION_MS,
} from "./constants";

import { hasYouTubePlayerMethods } from "./types";
import {
  extractYouTubeVideoId,
  getViewerSyncStates,
  parseChatGroupsCache,
  parseChatsCache,
  sortChatsByRules,
  watchRoomMapKey,
} from "./utils";
import AppModal from "@/components/Modal";
import AuthApi from "@/lib/api/auth";
import MessengerApi from "@/lib/api/messenger";
import {
  useActiveWatchRoom,
  useCanEnableYouTubeAssistSetter,
  useChatExpensesSetter,
  useChatFolders,
  useChatFoldersSetter,
  useChatMessages,
  useExpenseOverview,
  useExpenseOverviewSetter,
  useExpenseParticipants,
  useExpenseParticipantsSetter,
  useExpensePaymentsSetter,
  useExpensesPanelWidthSetter,
  useHasChatGroupsSyncedOnce,
  useHasChatGroupsSyncedOnceSetter,
  useHasChatsSyncedOnce,
  useHasChatsSyncedOnceSetter,
  useIsExpenseMarkingPaid,
  useIsExpenseMarkingPaidSetter,
  useIsExpenseModalOpen,
  useIsExpenseModalOpenSetter,
  useIsExpenseSubmitting,
  useIsExpenseSubmittingSetter,
  useIsExpensesViewLoadingSetter,
  useIsMessagesNearBottom,
  useIsExpensesViewOpen,
  useIsSocketConnected,
  useIsYouTubeApiBlockedSetter,
  useIsYouTubeApiReady,
  useIsYouTubeApiReadySetter,
  useIsYouTubePlayerReady,
  useIsYouTubePlayerReadySetter,
  useIsChatGroupsSyncingSetter,
  useIsChatsSyncingSetter,
  useMessengerTheme,
  useSyncedToUserId,
  useSyncedToUserIdSetter,
  useWatchRoomChatMessagesByRoomIdSetter,
  useWatchRoomPlaybackSecondsSetter,
  useWatchRoomsByKeySetter,
  useYoutubeAccessMode,
  useYoutubeAccessModeSetter,
  useYoutubeAssistEnabledSetter,
  useYoutubePreviewVideoId,
  useChats,
  useChatsSetter,
  useSelectedChat,
  useSelectedChatSetter,
} from "@/hooks/features/messenger/chats";
import type {
  ContactType,
  ChatMessageType,
  WatchRoomType,
} from "@/lib/types";

const WATCH_ROOM_REACTION_PREFIX = "[[reaction]]";


export default function Messenger() {
  const MESSAGES_PAGE_SIZE = 30;
  const chats = useChats();
  const setChats = useChatsSetter();
  const selectedChat = useSelectedChat();
  const setSelectedChat = useSelectedChatSetter();
  const selectedChatId = selectedChat?.id ?? null;
  const selectedChatIdRef = React.useRef<number | null>(selectedChatId);
  const currentUserIdRef = React.useRef<number | null>(null);
  const selectedMessages = useChatMessages(selectedChatId);
  const selectedMessagesById = React.useMemo(() => {
    const messagesById = new Map<number, ChatMessageType>();
    selectedMessages.forEach((message) => {
      messagesById.set(message.id, message);
    });
    return messagesById;
  }, [selectedMessages]);
  React.useEffect(() => {
    if (!selectedChat) {
      return;
    }

    const selectedChatFromList = chats.find(
      (chat) => chat.id === selectedChat.id,
    );
    if (!selectedChatFromList) {
      setSelectedChat(null);
      return;
    }

    if (selectedChatFromList !== selectedChat) {
      setSelectedChat(selectedChatFromList);
    }
  }, [chats, selectedChat, setSelectedChat]);
  const chatFolders = useChatFolders();
  const setChatFolders = useChatFoldersSetter();
  const [isMessagesLoading, setIsMessagesLoading] = React.useState(false);
  const [isOlderMessagesLoading, setIsOlderMessagesLoading] =
    React.useState(false);

  const [availableUsers, setAvailableUsers] = React.useState<ContactType[]>([]);
  const [hasMoreMessagesByChat, setHasMoreMessagesByChat] = React.useState<
    Record<number, boolean>
  >({});
  const [replyTarget, setReplyTarget] = React.useState<ChatMessageType | null>(
    null,
  );
  const [pendingScrollTargetMessageId, setPendingScrollTargetMessageId] =
    React.useState<number | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = React.useState<
    number | null
  >(null);
  const isSocketConnected = useIsSocketConnected();
  const isMessagesNearBottom = useIsMessagesNearBottom();
  const messengerTheme = useMessengerTheme();
  const setIsChatsSyncing = useIsChatsSyncingSetter();
  const setIsChatGroupsSyncing = useIsChatGroupsSyncingSetter();
  const hasChatsSyncedOnce = useHasChatsSyncedOnce();
  const setHasChatsSyncedOnce = useHasChatsSyncedOnceSetter();
  const hasChatGroupsSyncedOnce = useHasChatGroupsSyncedOnce();
  const setHasChatGroupsSyncedOnce = useHasChatGroupsSyncedOnceSetter();
  const youtubePreviewVideoId = useYoutubePreviewVideoId();
  const isYouTubeApiReady = useIsYouTubeApiReady();
  const setIsYouTubeApiReady = useIsYouTubeApiReadySetter();
  const setIsYouTubeApiBlocked = useIsYouTubeApiBlockedSetter();
  const isYouTubePlayerReady = useIsYouTubePlayerReady();
  const setIsYouTubePlayerReady = useIsYouTubePlayerReadySetter();
  const syncedToUserId = useSyncedToUserId();
  const setSyncedToUserId = useSyncedToUserIdSetter();
  const [currentUserId, setCurrentUserId] = React.useState<number | null>(null);
  const [currentUsername, setCurrentUsername] = React.useState<string | null>(
    null,
  );
  const [liveLocationStatusByChatId, setLiveLocationStatusByChatId] =
    React.useState<
      Record<number, { isActive: boolean; expiresAt: number | null }>
    >({});
  const youtubeAccessMode = useYoutubeAccessMode();
  const setYoutubeAccessMode = useYoutubeAccessModeSetter();
  const setYoutubeAssistEnabled = useYoutubeAssistEnabledSetter();
  const setCanEnableYouTubeAssist = useCanEnableYouTubeAssistSetter();
  const activeWatchRoom = useActiveWatchRoom();
  const setWatchRoomChatMessagesByRoomId =
    useWatchRoomChatMessagesByRoomIdSetter();
  const setWatchRoomPlaybackSeconds = useWatchRoomPlaybackSecondsSetter();
  const setWatchRoomsByKey = useWatchRoomsByKeySetter();
  const isExpenseModalOpen = useIsExpenseModalOpen();
  const setIsExpenseModalOpen = useIsExpenseModalOpenSetter();
  const isExpenseSubmitting = useIsExpenseSubmitting();
  const setIsExpenseSubmitting = useIsExpenseSubmittingSetter();
  const isExpenseMarkingPaid = useIsExpenseMarkingPaid();
  const setIsExpenseMarkingPaid = useIsExpenseMarkingPaidSetter();
  const expenseParticipants = useExpenseParticipants();
  const setExpenseParticipants = useExpenseParticipantsSetter();
  const expenseOverview = useExpenseOverview();
  const setExpenseOverview = useExpenseOverviewSetter();
  const isExpensesViewOpen = useIsExpensesViewOpen();
  const setIsExpensesViewLoading = useIsExpensesViewLoadingSetter();
  const setExpensesPanelWidth = useExpensesPanelWidthSetter();
  const setChatExpenses = useChatExpensesSetter();
  const setExpensePayments = useExpensePaymentsSetter();
  const unavailableWatchRoomKeysRef = React.useRef<Set<string>>(new Set());
  const syncEnsureTimeoutsRef = React.useRef<
    Array<ReturnType<typeof setTimeout>>
  >([]);
  const syncedToUserIdRef = React.useRef<number | null>(null);
  const activeWatchRoomIdRef = React.useRef<string | null>(null);
  const activeWatchRoomRef = React.useRef<WatchRoomType | null>(null);
  const isSocketConnectedRef = React.useRef(false);
  const lastWatchRoomPlaybackSentAtRef = React.useRef(0);
  const suppressUnsyncUntilRef = React.useRef(0);
  const [youTubePlayerHostElement, setYouTubePlayerHostElement] =
    React.useState<HTMLDivElement | null>(null);
  const youTubePlayerRef = React.useRef<YouTubePlayerLike | null>(null);
  const youTubeApiReadyRef = React.useRef(false);
  const socketRef = React.useRef<WebSocket | null>(null);
  const geolocationWatchIdRef = React.useRef<number | null>(null);
  const liveLocationIntervalRef = React.useRef<ReturnType<
    typeof setInterval
  > | null>(null);
  const latestLiveCoordsRef = React.useRef<{
    latitude: number;
    longitude: number;
    accuracy_meters?: number;
  } | null>(null);
  const messagesContainerRef = React.useRef<HTMLDivElement | null>(null);
  const messageElementsRef = React.useRef<Map<number, HTMLDivElement>>(
    new Map(),
  );
  const highlightTimeoutRef = React.useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const jumpRetryTimeoutRef = React.useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const olderLoadScrollRestoreRef = React.useRef<{
    chatId: number;
    previousScrollTop: number;
    previousScrollHeight: number;
  } | null>(null);
  const chatsSyncRequestsRef = React.useRef(0);
  const chatGroupsSyncRequestsRef = React.useRef(0);
  const didHydrateCacheRef = React.useRef(false);
  const isResizingExpensesPanelRef = React.useRef(false);
  const isExpenseFeatureEnabled = ENABLE_EXPENSE_SPLIT_FEATURE;

  const isYouTubePlayerUsable =
    isYouTubePlayerReady && hasYouTubePlayerMethods(youTubePlayerRef.current);
  const tryExtractWatchRoomReactionEmoji = React.useCallback(
    (content: string) => {
      if (!content.startsWith(WATCH_ROOM_REACTION_PREFIX)) {
        return null;
      }
      const emoji = content.slice(WATCH_ROOM_REACTION_PREFIX.length).trim();
      return emoji.length > 0 ? emoji : null;
    },
    [],
  );

  const clampExpensesPanelWidth = React.useCallback((width: number) => {
    if (typeof window === "undefined") {
      return Math.max(280, Math.min(560, Math.round(width)));
    }
    const maxWidth = Math.max(320, Math.floor(window.innerWidth * 0.6));
    return Math.max(280, Math.min(maxWidth, Math.round(width)));
  }, []);
  const clearSyncEnsureTimeouts = React.useCallback(() => {
    syncEnsureTimeoutsRef.current.forEach((timeoutId) =>
      clearTimeout(timeoutId),
    );
    syncEnsureTimeoutsRef.current = [];
  }, []);
  const resolveTargetPlaybackSeconds = React.useCallback(
    (targetState: {
      current_time_seconds: number;
      is_playing: boolean;
      updated_at: number;
    }) => {
      const nowSeconds = Date.now() / 1000;
      const transportLeadSeconds = 0.3;
      return targetState.is_playing
        ? targetState.current_time_seconds +
            Math.max(0, nowSeconds - targetState.updated_at) +
            transportLeadSeconds
        : targetState.current_time_seconds;
    },
    [],
  );
  const applyTargetSyncStateToPlayer = React.useCallback(
    (targetState: {
      current_time_seconds: number;
      is_playing: boolean;
      updated_at: number;
    }) => {
      const player = youTubePlayerRef.current;
      if (!hasYouTubePlayerMethods(player)) {
        return false;
      }
      const targetSeconds = Math.max(
        0,
        resolveTargetPlaybackSeconds(targetState),
      );
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
  const sendWatchRoomPlaybackUpdate = React.useCallback(
    (force: boolean = false) => {
      const room = activeWatchRoomRef.current;
      const socket = socketRef.current;
      const player = youTubePlayerRef.current;
      if (!room || !hasYouTubePlayerMethods(player)) {
        return;
      }
      if (
        !isSocketConnectedRef.current ||
        !socket ||
        socket.readyState !== WebSocket.OPEN
      ) {
        return;
      }

      const nowMs = Date.now();
      const minIntervalMs = 350;
      if (
        !force &&
        nowMs - lastWatchRoomPlaybackSentAtRef.current < minIntervalMs
      ) {
        return;
      }

      const currentTime = player.getCurrentTime();
      const isPlaying =
        player.getPlayerState() === (window.YT?.PlayerState?.PLAYING ?? 1);
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
    },
    [],
  );
  const refreshChats = React.useCallback(async () => {
    chatsSyncRequestsRef.current += 1;
    setIsChatsSyncing(true);

    try {
      const res = await MessengerApi.getChats();
      setChats(sortChatsByRules(res.data));
      setHasChatsSyncedOnce(true);
    } finally {
      chatsSyncRequestsRef.current = Math.max(
        0,
        chatsSyncRequestsRef.current - 1,
      );
      if (chatsSyncRequestsRef.current === 0) {
        setIsChatsSyncing(false);
      }
    }
  }, [setChats, setHasChatsSyncedOnce, setIsChatsSyncing]);

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
      chatGroupsSyncRequestsRef.current = Math.max(
        0,
        chatGroupsSyncRequestsRef.current - 1,
      );
      if (chatGroupsSyncRequestsRef.current === 0) {
        setIsChatGroupsSyncing(false);
      }
    }
  }, [setChatFolders, setHasChatGroupsSyncedOnce, setIsChatGroupsSyncing]);

  const chatsForFolders = React.useMemo(
    () => chats.filter((chat) => chat.type !== "private"),
    [chats],
  );

  const messengerThemeVars = React.useMemo(
    () => MESSENGER_THEME_VARS[messengerTheme],
    [messengerTheme],
  );
  const selectedChatLiveStatus =
    selectedChatId === null
      ? undefined
      : liveLocationStatusByChatId[selectedChatId];

  React.useEffect(() => {
    if (
      !selectedChatLiveStatus?.isActive ||
      selectedChatLiveStatus.expiresAt === null
    ) {
      return;
    }
    const timerId = setInterval(() => {
      setLiveLocationNowMs(Date.now());
    }, 1000);
    return () => clearInterval(timerId);
  }, [selectedChatLiveStatus]);

  React.useEffect(() => {
    void AuthApi.getProfile()
      .then(({ data }) => {
        setCurrentUserId(data.id);
        setCurrentUsername(data.username);
        setCurrentUserAvatarUrl(data.avatar_url);
        setYoutubeAccessMode(data.youtube_access_mode ?? "direct");
        setYoutubeAssistEnabled(Boolean(data.youtube_assisted_enabled));
        setCanEnableYouTubeAssist(Boolean(data.can_enable_assisted));
      })
      .catch(() => undefined);
  }, [
    setCanEnableYouTubeAssist,
    setYoutubeAccessMode,
    setYoutubeAssistEnabled,
  ]);

  const refreshExpenseContext = React.useCallback(
    async (chatId: number) => {
      const [participantsRes, overviewRes] = await Promise.all([
        MessengerApi.getChatParticipants(chatId),
        MessengerApi.getChatExpenseOverview(chatId),
      ]);
      setExpenseParticipants(participantsRes.data);
      setExpenseOverview(overviewRes.data);
    },
    [setExpenseOverview, setExpenseParticipants],
  );

  const refreshExpensesViewData = React.useCallback(
    async (chatId: number) => {
      const [expensesRes, paymentsRes, overviewRes, participantsRes] =
        await Promise.all([
          MessengerApi.getChatExpenses(chatId),
          MessengerApi.getChatExpensePayments(chatId),
          MessengerApi.getChatExpenseOverview(chatId),
          MessengerApi.getChatParticipants(chatId),
        ]);
      setChatExpenses(expensesRes.data);
      setExpensePayments(paymentsRes.data);
      setExpenseOverview(overviewRes.data);
      setExpenseParticipants(participantsRes.data);
    },
    [
      setChatExpenses,
      setExpenseOverview,
      setExpenseParticipants,
      setExpensePayments,
    ],
  );

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
  }, [
    isExpensesViewOpen,
    refreshExpensesViewData,
    selectedChatId,
    setIsExpensesViewLoading,
  ]);

  React.useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!isResizingExpensesPanelRef.current) {
        return;
      }
      const nextWidth = clampExpensesPanelWidth(
        window.innerWidth - event.clientX,
      );
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
  }, [clampExpensesPanelWidth, setExpensesPanelWidth]);

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
        const filteredMessages = data.filter(
          (message) => !tryExtractWatchRoomReactionEmoji(message.content),
        );
        setWatchRoomChatMessagesByRoomId((current) => ({
          ...current,
          [roomId]: filteredMessages,
        }));
      })
      .catch(() => undefined);
  }, [
    activeWatchRoom?.id,
    setWatchRoomChatMessagesByRoomId,
    tryExtractWatchRoomReactionEmoji,
  ]);

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
          const { data } = await MessengerApi.getWatchRoomByChat(
            selectedChatId,
            youtubeId,
          );
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
  }, [selectedChatId, selectedMessages, setWatchRoomsByKey]);

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
  }, [
    activeWatchRoom?.id,
    activeWatchRoom?.sync_revision,
    activeWatchRoom?.sync_current_time_seconds,
    activeWatchRoom?.sync_is_playing,
    setWatchRoomPlaybackSeconds,
  ]);

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
  }, [setChatFolders, setChats]);

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
      currentFolders.map((folder) => {
        if (folder.id === ALL_CHATS_GROUP_ID) {
          return folder;
        }

        return {
          ...folder,
          chat_ids: folder.chat_ids.filter((chatId) =>
            allowedChatIds.has(chatId),
          ),
        };
      }),
    );
  }, [
    chatsForFolders,
    hasChatGroupsSyncedOnce,
    hasChatsSyncedOnce,
    setChatFolders,
  ]);

  React.useEffect(() => {
    selectedChatIdRef.current = selectedChatId;
  }, [selectedChatId]);

  React.useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

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
  }, [setIsYouTubeApiBlocked, setIsYouTubeApiReady]);

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
            : hasYouTubePlayerMethods(createdPlayer)
              ? createdPlayer
              : null;
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
    activeWatchRoom?.sync_current_time_seconds,
    activeWatchRoom?.sync_is_playing,
    activeWatchRoom?.host_user_id,
    currentUserId,
    youTubePlayerHostElement,
    sendWatchRoomPlaybackUpdate,
    setIsYouTubeApiBlocked,
    setIsYouTubePlayerReady,
    setSyncedToUserId,
  ]);

  React.useEffect(() => {
    if (!activeWatchRoom || !isYouTubePlayerUsable || syncedToUserId === null) {
      return;
    }

    const targetState = getViewerSyncStates(activeWatchRoom).find(
      (state) => state.user_id === syncedToUserId,
    );
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
    const localIsPlaying =
      player.getPlayerState() === (window.YT?.PlayerState?.PLAYING ?? 1);
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
    setSyncedToUserId,
  ]);

  React.useEffect(() => {
    if (!activeWatchRoom || !isYouTubePlayerUsable || syncedToUserId === null) {
      return;
    }

    const intervalId = setInterval(() => {
      const player = youTubePlayerRef.current;
      if (!hasYouTubePlayerMethods(player)) {
        return;
      }

      const targetState = getViewerSyncStates(activeWatchRoom).find(
        (state) => state.user_id === syncedToUserId,
      );
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
  }, [
    activeWatchRoom,
    isYouTubePlayerUsable,
    resolveTargetPlaybackSeconds,
    syncedToUserId,
    setSyncedToUserId,
  ]);

  React.useEffect(() => {
    if (!activeWatchRoom || !isYouTubePlayerUsable) {
      return;
    }
    if (
      !isSocketConnected ||
      !socketRef.current ||
      socketRef.current.readyState !== WebSocket.OPEN
    ) {
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
    activeWatchRoom,
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
    return () => {
      if (
        geolocationWatchIdRef.current !== null &&
        typeof navigator !== "undefined" &&
        navigator.geolocation
      ) {
        navigator.geolocation.clearWatch(geolocationWatchIdRef.current);
        geolocationWatchIdRef.current = null;
      }
      if (liveLocationIntervalRef.current) {
        clearInterval(liveLocationIntervalRef.current);
        liveLocationIntervalRef.current = null;
      }
      latestLiveCoordsRef.current = null;
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

  const jumpToRenderedMessage = React.useCallback(
    (messageId: number): boolean => {
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
    },
    [],
  );

  const scheduleJumpRetry = React.useCallback(
    (messageId: number, retriesLeft: number) => {
      if (jumpRetryTimeoutRef.current) {
        clearTimeout(jumpRetryTimeoutRef.current);
      }
      jumpRetryTimeoutRef.current = setTimeout(() => {
        const didJump = jumpToRenderedMessage(messageId);
        if (
          !didJump &&
          retriesLeft > 0 &&
          selectedMessagesById.has(messageId)
        ) {
          scheduleJumpRetry(messageId, retriesLeft - 1);
        }
      }, 30);
    },
    [jumpToRenderedMessage, selectedMessagesById],
  );

  const handleScrollToMessage = React.useCallback(
    (messageId: number) => {
      if (jumpToRenderedMessage(messageId)) {
        return;
      }
      setPendingScrollTargetMessageId(messageId);
      if (selectedMessagesById.has(messageId)) {
        scheduleJumpRetry(messageId, 40);
      } else {
        requestOlderMessagesForSearch();
      }
    },
    [
      jumpToRenderedMessage,
      requestOlderMessagesForSearch,
      scheduleJumpRetry,
      selectedMessagesById,
    ],
  );

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
    if (!selectedChatId || !isMessagesNearBottom) {
      return;
    }
    requestAnimationFrame(() => {
      const container = messagesContainerRef.current;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    });
  }, [isMessagesNearBottom, selectedChatId, selectedMessages]);

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
      const { data: expense } = await MessengerApi.createExpense(
        selectedChatId,
        {
          title: data.title,
          amount_minor: data.amountMinor,
          currency: data.currency,
          payer_user_id: data.payerUserId,
          participant_user_ids: data.participantUserIds,
          shares_minor: data.sharesMinor,
        },
      );
      await refreshExpenseContext(selectedChatId);
      if (isExpensesViewOpen) {
        await refreshExpensesViewData(selectedChatId);
      }

      const participantNameById = new Map<number, string>();
      expenseParticipants.forEach((participant) => {
        participantNameById.set(participant.id, participant.username);
      });
      const payerName =
        participantNameById.get(expense.payer_user_id) ??
        `User ${expense.payer_user_id}`;
      const shareLines = expense.shares
        .filter((share) => share.user_id !== expense.payer_user_id)
        .map((share) => {
          const username =
            participantNameById.get(share.user_id) ?? `User ${share.user_id}`;
          return `- ${username} owes ${(share.share_minor / 100).toFixed(2)} ${expense.currency}`;
        });
      const summaryText = [
        `Split expense: ${expense.title}`,
        `Total: ${(expense.amount_minor / 100).toFixed(2)} ${expense.currency}`,
        `Paid by: ${payerName}`,
        "Debts:",
        ...(shareLines.length > 0 ? shareLines : ["- No debts"]),
      ].join("\n");

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
      const { data } = await MessengerApi.markExpenseSettlementPaid(
        selectedChatId,
        payload,
      );
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
        <LeftSider />
        <ChatsListSider />
        <Workspace />
      </div>
      <YouTubeWatchRoomModals />
      {isExpenseFeatureEnabled ? (
        <ExpenseSplitModal
          open={isExpenseModalOpen}
          participants={expenseParticipants}
          currentUserId={currentUserId}
          overview={expenseOverview}
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
