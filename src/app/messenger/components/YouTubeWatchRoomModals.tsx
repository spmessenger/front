"use client";

import React from "react";
import {
  Avatar,
  Button,
  Dropdown,
  Input,
  Modal as AntdModal,
  Popover,
  Typography,
  message as antdMessage,
} from "antd";
import type { MenuProps } from "antd";
import {
  CheckOutlined,
  FullscreenExitOutlined,
  FullscreenOutlined,
  SmileOutlined,
} from "@ant-design/icons";
import {
  useActiveWatchRoom,
  useActiveWatchRoomSetter,
  useCanEnableYouTubeAssist,
  useCanEnableYouTubeAssistSetter,
  useIsSocketConnected,
  useIsWatchRoomInviteModalOpen,
  useIsWatchRoomInviteModalOpenSetter,
  useIsWatchRoomSyncing,
  useIsWatchRoomSyncingSetter,
  useIsYouTubeApiBlocked,
  useIsYouTubeApiBlockedSetter,
  useIsYouTubeApiReady,
  useIsYouTubeApiReadySetter,
  useIsYouTubePlayerReady,
  useIsYouTubePlayerReadySetter,
  useMessengerTheme,
  useSocket,
  useSyncedToUserId,
  useSyncedToUserIdSetter,
  useWatchRoomChatMessagesByRoomId,
  useWatchRoomChatMessagesByRoomIdSetter,
  useWatchRoomInviteUserId,
  useWatchRoomInviteUserIdSetter,
  useWatchRoomPlaybackSecondsSetter,
  useWatchRoomReactionsByRoomId,
  useWatchRoomsByKeySetter,
  useYoutubeAccessMode,
  useYoutubeAccessModeSetter,
  useYoutubeAssistEnabled,
  useYoutubeAssistEnabledSetter,
  useYoutubePreviewVideoId,
  useYoutubePreviewVideoIdSetter,
} from "@/hooks/features/messenger/chats";
import type {
  ContactType,
  WatchRoomChatMessageType,
  WatchRoomType,
} from "@/lib/types";
import type { MessengerTheme, YouTubePlayerLike } from "../types";
import { hasYouTubePlayerMethods } from "../types";
import { API_BASE_URL } from "@/lib/config";
import AuthApi from "@/lib/api/auth";
import MessengerApi from "@/lib/api/messenger";
import YouTube, { YouTubePlayer } from "react-youtube";
import { getViewerSyncStates, watchRoomMapKey } from "../utils";

const { Text } = Typography;
const WATCH_ROOM_REACTION_PREFIX = "[[reaction]]";

type WatchRoomViewerItem = {
  userId: number;
  username: string;
  isCurrentUser: boolean;
};

type WatchRoomReactionView = {
  id: string;
  emoji: string;
  x_percent: number;
  y_percent: number;
};

export default function YouTubeWatchRoomModals() {
  const messengerTheme = useMessengerTheme() as MessengerTheme;
  const [player, setPlayer] = React.useState<YouTubePlayer>();
  const youtubePreviewVideoId = useYoutubePreviewVideoId();
  const setYoutubePreviewVideoId = useYoutubePreviewVideoIdSetter();
  const activeWatchRoom = useActiveWatchRoom();
  const setActiveWatchRoom = useActiveWatchRoomSetter();
  const isWatchRoomSyncing = useIsWatchRoomSyncing();
  const setIsWatchRoomSyncing = useIsWatchRoomSyncingSetter();
  const isYouTubeApiBlocked = useIsYouTubeApiBlocked();
  const setIsYouTubeApiBlocked = useIsYouTubeApiBlockedSetter();
  const isYouTubeApiReady = useIsYouTubeApiReady();
  const setIsYouTubeApiReady = useIsYouTubeApiReadySetter();
  const isYouTubePlayerReady = useIsYouTubePlayerReady();
  const setIsYouTubePlayerReady = useIsYouTubePlayerReadySetter();
  const syncedToUserId = useSyncedToUserId();
  const setSyncedToUserId = useSyncedToUserIdSetter();
  const youtubeAccessMode = useYoutubeAccessMode();
  const setYoutubeAccessMode = useYoutubeAccessModeSetter();
  const youtubeAssistEnabled = useYoutubeAssistEnabled();
  const setYoutubeAssistEnabled = useYoutubeAssistEnabledSetter();
  const canEnableYouTubeAssist = useCanEnableYouTubeAssist();
  const setCanEnableYouTubeAssist = useCanEnableYouTubeAssistSetter();
  const isSocketConnected = useIsSocketConnected();
  const socket = useSocket();
  const isWatchRoomInviteModalOpen = useIsWatchRoomInviteModalOpen();
  const setIsWatchRoomInviteModalOpen = useIsWatchRoomInviteModalOpenSetter();
  const watchRoomInviteUserId = useWatchRoomInviteUserId();
  const watchRoomChatMessagesByRoomId = useWatchRoomChatMessagesByRoomId();
  const setWatchRoomChatMessagesByRoomId =
    useWatchRoomChatMessagesByRoomIdSetter();
  const watchRoomReactionsByRoomId = useWatchRoomReactionsByRoomId();
  const setWatchRoomInviteUserId = useWatchRoomInviteUserIdSetter();
  const setWatchRoomPlaybackSeconds = useWatchRoomPlaybackSecondsSetter();
  const setWatchRoomsByKey = useWatchRoomsByKeySetter();
  const [currentUserId, setCurrentUserId] = React.useState<number | null>(null);
  const [currentUsername, setCurrentUsername] = React.useState<string | null>(
    null,
  );
  const [availableUsers, setAvailableUsers] = React.useState<ContactType[]>([]);
  const [youTubePlayerHostElement, setYouTubePlayerHostElement] =
    React.useState<HTMLIFrameElement | null>(null);
  const [watchRoomChatDraft, setWatchRoomChatDraft] = React.useState("");
  const [isStageFullscreen, setIsStageFullscreen] = React.useState(false);
  const [isOverlayUiVisible, setIsOverlayUiVisible] = React.useState(true);
  const [isAssistedIframeFallbackActive, setIsAssistedIframeFallbackActive] =
    React.useState(false);
  const youTubePlayerRef = React.useRef<YouTubePlayerLike | null>(null);
  const socketRef = React.useRef<WebSocket | null>(null);
  const activeWatchRoomRef = React.useRef<WatchRoomType | null>(null);
  const activeWatchRoomIdRef = React.useRef<string | null>(null);
  const syncedToUserIdRef = React.useRef<number | null>(null);
  const isSocketConnectedRef = React.useRef(false);
  const syncEnsureTimeoutsRef = React.useRef<
    Array<ReturnType<typeof setTimeout>>
  >([]);
  const lastWatchRoomPlaybackSentAtRef = React.useRef(0);
  const suppressUnsyncUntilRef = React.useRef(0);
  const assistedIframeLoadedRef = React.useRef(false);
  const watchRoomChatMessagesRef = React.useRef<HTMLDivElement | null>(null);
  const stageContainerRef = React.useRef<HTMLDivElement | null>(null);
  const overlayInactivityTimeoutRef = React.useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const handleYouTubePlayerHostRef = React.useCallback(
    (node: HTMLIFrameElement | null) => {
      setYouTubePlayerHostElement(node);
    },
    [],
  );
  const isYouTubePlayerUsable =
    isYouTubePlayerReady && hasYouTubePlayerMethods(youTubePlayerRef.current);
  const watchRoomChatMessages = React.useMemo<WatchRoomChatMessageType[]>(
    () =>
      activeWatchRoom
        ? (watchRoomChatMessagesByRoomId[activeWatchRoom.id] ?? [])
        : [],
    [activeWatchRoom, watchRoomChatMessagesByRoomId],
  );
  const watchRoomReactions = React.useMemo<WatchRoomReactionView[]>(
    () =>
      activeWatchRoom
        ? (watchRoomReactionsByRoomId[activeWatchRoom.id] ?? [])
        : [],
    [activeWatchRoom, watchRoomReactionsByRoomId],
  );

  const reactionEmojiSet = React.useMemo(
    () => [
      "\u{1F44D}",
      "\u2764\uFE0F",
      "\u{1F602}",
      "\u{1F62E}",
      "\u{1F525}",
      "\u{1F44F}",
    ],
    [],
  );
  const watchRoomViewerItems = React.useMemo<WatchRoomViewerItem[]>(() => {
    if (!activeWatchRoom) {
      return [];
    }

    return activeWatchRoom.viewer_user_ids.map((userId) => {
      const knownUser = availableUsers.find((user) => user.id === userId);
      const isCurrentUser = currentUserId === userId;
      const username =
        knownUser?.username ??
        (isCurrentUser && currentUsername ? currentUsername : `User ${userId}`);
      return {
        userId,
        username,
        isCurrentUser,
      };
    });
  }, [activeWatchRoom, availableUsers, currentUserId, currentUsername]);
  const syncedToUserName =
    watchRoomViewerItems.find((viewer) => viewer.userId === syncedToUserId)
      ?.username ?? null;
  const syncTargetViewerItems = React.useMemo(
    () => watchRoomViewerItems.filter((viewer) => !viewer.isCurrentUser),
    [watchRoomViewerItems],
  );
  const syncTargetMenuItems: MenuProps["items"] = syncTargetViewerItems.map(
    (viewer) => ({
      key: String(viewer.userId),
      label: viewer.username,
    }),
  );
  const inviteableUsers = availableUsers.filter(
    (user) => !activeWatchRoom?.viewer_user_ids.includes(user.id),
  );
  const syncMenuItems = syncTargetMenuItems ?? [];
  const visibleViewerItems = watchRoomViewerItems.slice(0, 7);
  const hiddenViewerCount = Math.max(
    0,
    watchRoomViewerItems.length - visibleViewerItems.length,
  );
  const assistedIframeSrc = React.useMemo(() => {
    if (!youtubePreviewVideoId) {
      return "";
    }
    const upstreamEmbedUrl = `https://www.youtube.com/embed/${encodeURIComponent(youtubePreviewVideoId)}?autoplay=0&rel=0&playsinline=1&enablejsapi=0`;
    return `${API_BASE_URL}/api/youtube/assist/tunnel?url=${encodeURIComponent(upstreamEmbedUrl)}`;
  }, [youtubePreviewVideoId]);
  const directIframeSrc = React.useMemo(() => {
    if (!youtubePreviewVideoId) {
      return "";
    }
    const query = new URLSearchParams({
      autoplay: "0",
      rel: "0",
      fs: "0",
      enablejsapi: "1",
    });
    if (typeof window !== "undefined") {
      query.set("origin", window.location.origin);
    }
    return `https://www.youtube.com/embed/${encodeURIComponent(youtubePreviewVideoId)}?${query.toString()}`;
  }, [youtubePreviewVideoId]);
  const effectiveIframeSrc = React.useMemo(() => {
    if (youtubeAccessMode !== "assisted") {
      return directIframeSrc;
    }
    return isAssistedIframeFallbackActive ? directIframeSrc : assistedIframeSrc;
  }, [
    assistedIframeSrc,
    directIframeSrc,
    isAssistedIframeFallbackActive,
    youtubeAccessMode,
  ]);

  const clearSyncEnsureTimeouts = React.useCallback(() => {
    syncEnsureTimeoutsRef.current.forEach((timeoutId) =>
      clearTimeout(timeoutId),
    );
    syncEnsureTimeoutsRef.current = [];
  }, []);

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
      const currentSocket = socketRef.current;
      const player = youTubePlayerRef.current;
      if (!room || !hasYouTubePlayerMethods(player)) {
        return;
      }
      if (
        !isSocketConnectedRef.current ||
        !currentSocket ||
        currentSocket.readyState !== WebSocket.OPEN
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
      currentSocket.send(
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

  const handleSendWatchRoomChatMessage = React.useCallback(
    (content: string) => {
      const room = activeWatchRoomRef.current;
      const currentSocket = socketRef.current;
      if (
        !room ||
        !currentSocket ||
        currentSocket.readyState !== WebSocket.OPEN
      ) {
        return;
      }
      currentSocket.send(
        JSON.stringify({
          action: "watch_room_chat_send",
          chat_id: room.chat_id,
          room_id: room.id,
          content,
        }),
      );
    },
    [],
  );

  const handleSendWatchRoomReaction = React.useCallback((emoji: string) => {
    const room = activeWatchRoomRef.current;
    const currentSocket = socketRef.current;
    if (
      !room ||
      !currentSocket ||
      currentSocket.readyState !== WebSocket.OPEN
    ) {
      return;
    }
    const content = `${WATCH_ROOM_REACTION_PREFIX}${emoji}`;
    currentSocket.send(
      JSON.stringify({
        action: "watch_room_chat_send",
        chat_id: room.chat_id,
        room_id: room.id,
        content,
      }),
    );
  }, []);

  const onSendWatchRoomChatMessage = handleSendWatchRoomChatMessage;
  const onSendWatchRoomReaction = handleSendWatchRoomReaction;

  React.useEffect(() => {
    socketRef.current = socket;
  }, [socket]);

  React.useEffect(() => {
    isSocketConnectedRef.current = isSocketConnected;
  }, [isSocketConnected]);

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
    void AuthApi.getProfile()
      .then(({ data }) => {
        setCurrentUserId(data.id);
        setCurrentUsername(data.username);
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

  React.useEffect(() => {
    void MessengerApi.getAvailableUsers()
      .then(({ data }) => {
        setAvailableUsers(data);
      })
      .catch(() => undefined);
  }, []);

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
    const roomAtPlayerCreation = activeWatchRoomRef.current;
    const initialSyncSeconds =
      roomAtPlayerCreation?.sync_current_time_seconds ?? 0;
    const initialSyncIsPlaying = roomAtPlayerCreation?.sync_is_playing ?? false;
    if (youtubeAccessMode === "assisted") {
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

    const createdPlayer = new window.YT.Player(youTubePlayerHostElement, {
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
      youTubePlayerRef.current = null;
    };
  }, [
    activeWatchRoom?.id,
    isYouTubeApiReady,
    sendWatchRoomPlaybackUpdate,
    setIsYouTubeApiBlocked,
    setIsYouTubePlayerReady,
    setSyncedToUserId,
    youtubeAccessMode,
    youtubePreviewVideoId,
    youTubePlayerHostElement,
  ]);

  React.useEffect(() => {
    if (isYouTubePlayerUsable || syncedToUserId === null) {
      return;
    }
    setSyncedToUserId(null);
  }, [isYouTubePlayerUsable, setSyncedToUserId, syncedToUserId]);

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
    applyTargetSyncStateToPlayer,
    isYouTubePlayerUsable,
    resolveTargetPlaybackSeconds,
    setSyncedToUserId,
    syncedToUserId,
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
    setSyncedToUserId,
    syncedToUserId,
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
    isSocketConnected,
    isYouTubePlayerUsable,
    sendWatchRoomPlaybackUpdate,
  ]);

  React.useEffect(() => {
    if (!youtubePreviewVideoId) {
      setWatchRoomChatDraft("");
    }
  }, [youtubePreviewVideoId]);

  React.useEffect(() => {
    if (youtubeAccessMode !== "assisted") {
      setIsAssistedIframeFallbackActive(false);
      assistedIframeLoadedRef.current = false;
      return;
    }
    setIsAssistedIframeFallbackActive(false);
    assistedIframeLoadedRef.current = false;
    const timeoutId = setTimeout(() => {
      setIsAssistedIframeFallbackActive((current) =>
        assistedIframeLoadedRef.current ? current : true,
      );
    }, 9000);
    return () => {
      clearTimeout(timeoutId);
    };
  }, [youtubeAccessMode, youtubePreviewVideoId]);

  React.useEffect(() => {
    const node = watchRoomChatMessagesRef.current;
    if (!node) {
      return;
    }
    node.scrollTop = node.scrollHeight;
  }, [watchRoomChatMessages]);

  React.useEffect(() => {
    const handleFullscreenChange = () => {
      const stage = stageContainerRef.current;
      if (!stage) {
        setIsStageFullscreen(false);
        return;
      }
      const fullscreenElement = document.fullscreenElement;
      setIsStageFullscreen(fullscreenElement === stage);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const markOverlayUiActive = React.useCallback(() => {
    setIsOverlayUiVisible(true);
    if (overlayInactivityTimeoutRef.current) {
      clearTimeout(overlayInactivityTimeoutRef.current);
      overlayInactivityTimeoutRef.current = null;
    }
    if (!isStageFullscreen) {
      return;
    }
    overlayInactivityTimeoutRef.current = setTimeout(() => {
      setIsOverlayUiVisible(false);
    }, 2300);
  }, [isStageFullscreen]);

  React.useEffect(() => {
    if (!isStageFullscreen) {
      setIsOverlayUiVisible(true);
      if (overlayInactivityTimeoutRef.current) {
        clearTimeout(overlayInactivityTimeoutRef.current);
        overlayInactivityTimeoutRef.current = null;
      }
      return;
    }
    markOverlayUiActive();
  }, [isStageFullscreen, markOverlayUiActive]);

  React.useEffect(() => {
    if (!isStageFullscreen) {
      return;
    }

    const handleUserActivity = () => {
      markOverlayUiActive();
    };

    window.addEventListener("mousedown", handleUserActivity);
    window.addEventListener("touchstart", handleUserActivity, {
      passive: true,
    });
    window.addEventListener("keydown", handleUserActivity);

    return () => {
      window.removeEventListener("mousedown", handleUserActivity);
      window.removeEventListener("touchstart", handleUserActivity);
      window.removeEventListener("keydown", handleUserActivity);
    };
  }, [isStageFullscreen, markOverlayUiActive]);

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

  async function onToggleYouTubeAssistEnabled(enabled: boolean) {
    try {
      const { data } = await AuthApi.setYouTubeAssistEnabled(enabled);
      setYoutubeAssistEnabled(data.youtube_assisted_enabled);
      setCanEnableYouTubeAssist(data.can_enable_assisted);
      setYoutubeAccessMode(data.youtube_access_mode);
      setActiveWatchRoom((current) =>
        current
          ? {
              ...current,
              youtube_access_mode: data.youtube_access_mode,
            }
          : current,
      );
    } catch {
      antdMessage.error("Failed to switch assisting mode.");
    }
  }

  React.useEffect(() => {
    return () => {
      if (overlayInactivityTimeoutRef.current) {
        clearTimeout(overlayInactivityTimeoutRef.current);
        overlayInactivityTimeoutRef.current = null;
      }
    };
  }, []);

  const submitWatchRoomChat = React.useCallback(() => {
    const content = watchRoomChatDraft.trim();
    if (!content || !isSocketConnected) {
      return;
    }
    onSendWatchRoomChatMessage(content);
    setWatchRoomChatDraft("");
  }, [isSocketConnected, onSendWatchRoomChatMessage, watchRoomChatDraft]);

  const toggleStageFullscreen = React.useCallback(() => {
    const stage = stageContainerRef.current;
    if (!stage) {
      return;
    }
    if (document.fullscreenElement === stage) {
      void document.exitFullscreen().catch(() => undefined);
      return;
    }
    void stage.requestFullscreen().catch(() => undefined);
  }, []);

  const onOpenInviteModal = () => setIsWatchRoomInviteModalOpen(true);
  const onCloseInviteModal = () => {
    setIsWatchRoomInviteModalOpen(false);
    setWatchRoomInviteUserId(null);
  };

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

  async function handleSyncWatchRoom(targetUserId: number) {
    if (
      !activeWatchRoom ||
      !hasYouTubePlayerMethods(youTubePlayerRef.current)
    ) {
      return;
    }

    try {
      clearSyncEnsureTimeouts();
      setIsWatchRoomSyncing(true);
      const { data } = await MessengerApi.getWatchRoom(activeWatchRoom.id);
      const targetState = getViewerSyncStates(data).find(
        (state) => state.user_id === targetUserId,
      );
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
                [watchRoomMapKey(
                  latestRoom.chat_id,
                  latestRoom.youtube_video_id,
                )]: latestRoom,
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

  const onCloseWatchRoom = handleCloseWatchRoom;
  const onSyncTargetSelect = handleSyncWatchRoom;
  const onInviteConfirm = handleInviteToWatchRoom;
  console.log("player", player);

  return (
    <>
      <AntdModal
        title={player?.videoTitle || "YouTube video"}
        open={youtubePreviewVideoId !== null}
        onCancel={onCloseWatchRoom}
        footer={null}
        destroyOnHidden
        width="94vw"
        className={
          messengerTheme === "mono"
            ? "youtube-preview-modal watch-room-modal watch-room-modal-mono"
            : "youtube-preview-modal watch-room-modal watch-room-modal-retro"
        }
      >
        {youtubePreviewVideoId ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              height: "88vh",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <Text
                className={
                  messengerTheme === "mono"
                    ? "watch-room-meta-text-mono"
                    : "retro-pixel-text"
                }
                style={{ color: "var(--mess-muted-text)" }}
              >
                <span style={{ marginRight: "10px" }}>
                  Viewers: {activeWatchRoom?.viewer_count ?? 1}
                </span>
                <span className="watch-room-viewer-avatars-inline">
                  {visibleViewerItems.map((viewer, index) => (
                    <span
                      key={viewer.userId}
                      title={
                        viewer.isCurrentUser
                          ? `${viewer.username} (You)`
                          : viewer.username
                      }
                    >
                      <Avatar
                        size={22}
                        src={
                          availableUsers.find(
                            (user) => user.id === viewer.userId,
                          )?.avatar_url
                        }
                        className={
                          viewer.isCurrentUser
                            ? "watch-room-inline-avatar watch-room-inline-avatar-self"
                            : "watch-room-inline-avatar"
                        }
                        style={{ marginLeft: index === 0 ? 0 : -8 }}
                      >
                        {viewer.username.slice(0, 1).toUpperCase()}
                      </Avatar>
                    </span>
                  ))}
                  {hiddenViewerCount > 0 ? (
                    <span className="watch-room-inline-avatar-overflow">
                      +{hiddenViewerCount}
                    </span>
                  ) : null}
                </span>
              </Text>
              <div style={{ display: "flex", gap: "8px" }}>
                <Dropdown
                  trigger={["click"]}
                  placement="bottomLeft"
                  overlayClassName={
                    messengerTheme === "mono"
                      ? "watch-room-sync-dropdown-mono"
                      : undefined
                  }
                  menu={{
                    items: syncMenuItems,
                    onClick: ({ key }) => onSyncTargetSelect(Number(key)),
                  }}
                  disabled={
                    !activeWatchRoom ||
                    isWatchRoomSyncing ||
                    !isYouTubePlayerUsable ||
                    syncMenuItems.length === 0
                  }
                >
                  <Button
                    className={
                      messengerTheme === "mono"
                        ? `watch-room-btn watch-room-btn-mono ${syncedToUserId !== null ? "watch-room-btn-synced watch-room-btn-synced-mono" : ""}`
                        : `watch-room-btn ${syncedToUserId !== null ? "watch-room-btn-synced" : ""}`
                    }
                    disabled={
                      !activeWatchRoom ||
                      isWatchRoomSyncing ||
                      !isYouTubePlayerUsable ||
                      syncMenuItems.length === 0
                    }
                  >
                    {isWatchRoomSyncing
                      ? "Syncing..."
                      : syncedToUserName
                        ? syncedToUserName
                        : "Sync to"}
                  </Button>
                </Dropdown>
                <Button
                  className={
                    messengerTheme === "mono"
                      ? "watch-room-btn watch-room-btn-mono"
                      : "watch-room-btn"
                  }
                  onClick={onOpenInviteModal}
                >
                  Invite
                </Button>
                {false ? (
                  <Button
                    className={
                      messengerTheme === "mono"
                        ? "watch-room-btn watch-room-btn-mono"
                        : "watch-room-btn"
                    }
                    onClick={() =>
                      onToggleYouTubeAssistEnabled(!youtubeAssistEnabled)
                    }
                    disabled={!canEnableYouTubeAssist}
                    title={
                      canEnableYouTubeAssist
                        ? "Toggle assisting mode"
                        : "Premium required for assisting"
                    }
                  >
                    {youtubeAssistEnabled ? "Assist On" : "Assist Off"}
                  </Button>
                ) : null}
                <Button
                  danger
                  className={
                    messengerTheme === "mono"
                      ? "watch-room-btn watch-room-btn-mono"
                      : "watch-room-btn"
                  }
                  onClick={onCloseWatchRoom}
                >
                  Leave room
                </Button>
              </div>
            </div>
            <div
              ref={stageContainerRef}
              className={
                isStageFullscreen
                  ? `watch-room-stage watch-room-stage-fullscreen ${isOverlayUiVisible ? "" : "watch-room-ui-inactive"}`
                  : "watch-room-stage"
              }
              style={{
                display: "flex",
                gap: "12px",
                alignItems: "stretch",
                flexWrap: "nowrap",
                height: "100%",
              }}
              onTouchStart={markOverlayUiActive}
            >
              <div
                className="watch-room-player-shell"
                style={{
                  position: "relative",
                  flex: "1 1 72%",
                  minWidth: 0,
                  borderRadius: "10px",
                  overflow: "hidden",
                  background: "#000000",
                }}
              >
                <YouTube
                  videoId={youtubePreviewVideoId}
                  onReady={(event) => setPlayer(event.target)}
                  style={{ width: "100%", height: "100%" }}
                  opts={{
                    width: "100%",
                    height: "100%",
                    playerVars: {
                      autoplay: 0,
                    },
                  }}
                />
                {youtubeAccessMode === "assisted" ? (
                  <div className="watch-room-access-badge">Assisted mode</div>
                ) : null}
                <div className="watch-room-reaction-overlay">
                  {watchRoomReactions.map((reaction) => (
                    <span
                      key={reaction.id}
                      className="watch-room-reaction-bubble"
                      style={{
                        left: `${reaction.x_percent}%`,
                        top: `${reaction.y_percent}%`,
                      }}
                    >
                      {reaction.emoji}
                    </span>
                  ))}
                </div>
                <Button
                  className={
                    messengerTheme === "mono"
                      ? "watch-room-btn watch-room-btn-mono watch-room-player-fs-btn"
                      : "watch-room-btn watch-room-player-fs-btn"
                  }
                  onClick={toggleStageFullscreen}
                  title={isStageFullscreen ? "Exit fullscreen" : "Fullscreen"}
                  icon={
                    isStageFullscreen ? (
                      <FullscreenExitOutlined />
                    ) : (
                      <FullscreenOutlined />
                    )
                  }
                />
              </div>
              {isStageFullscreen ? (
                <div
                  className="watch-room-chat-hover-zone"
                  onMouseEnter={markOverlayUiActive}
                />
              ) : null}
              <div
                className={
                  messengerTheme === "mono"
                    ? `watch-room-chat-panel watch-room-chat-panel-mono ${isStageFullscreen ? "watch-room-chat-panel-hoverable" : ""}`
                    : `watch-room-chat-panel ${isStageFullscreen ? "watch-room-chat-panel-hoverable" : ""}`
                }
                style={{ flex: "0 0 300px", maxWidth: "360px" }}
                onMouseEnter={markOverlayUiActive}
              >
                <Text
                  className={
                    messengerTheme === "mono"
                      ? "watch-room-meta-text-mono"
                      : "retro-pixel-text"
                  }
                >
                  Room chat
                </Text>
                <div
                  className="watch-room-chat-list"
                  ref={watchRoomChatMessagesRef}
                >
                  {watchRoomChatMessages.map((message) => {
                    const isOwn =
                      currentUserId !== null &&
                      message.user_id === currentUserId;
                    return (
                      <div
                        key={message.id}
                        className={
                          messengerTheme === "mono"
                            ? `watch-room-chat-message watch-room-chat-message-mono ${isOwn ? "watch-room-chat-message-own" : ""}`
                            : `watch-room-chat-message ${isOwn ? "watch-room-chat-message-own" : ""}`
                        }
                      >
                        <div className="watch-room-chat-message-head">
                          <span>{isOwn ? "You" : message.username}</span>
                        </div>
                        <div>{message.content}</div>
                      </div>
                    );
                  })}
                  {watchRoomChatMessages.length === 0 ? (
                    <Text
                      className={
                        messengerTheme === "mono"
                          ? "watch-room-meta-text-mono"
                          : "retro-pixel-text"
                      }
                      style={{ color: "var(--mess-muted-text)" }}
                    >
                      No messages yet.
                    </Text>
                  ) : null}
                </div>
                <div className="watch-room-chat-input-row">
                  <Input
                    value={watchRoomChatDraft}
                    onChange={(event) =>
                      setWatchRoomChatDraft(event.target.value)
                    }
                    placeholder="Write a message..."
                    maxLength={2000}
                    disabled={!isSocketConnected}
                    onPressEnter={(event) => {
                      event.preventDefault();
                      submitWatchRoomChat();
                    }}
                  />
                  <Popover
                    trigger="click"
                    placement="topRight"
                    overlayClassName={
                      messengerTheme === "mono"
                        ? "watch-room-reaction-popover-mono"
                        : undefined
                    }
                    content={
                      <div className="watch-room-reaction-picker-column">
                        {reactionEmojiSet.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            className="watch-room-reaction-picker-item"
                            onClick={() => onSendWatchRoomReaction(emoji)}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    }
                  >
                    <Button
                      className={
                        messengerTheme === "mono"
                          ? "watch-room-btn watch-room-btn-mono watch-room-emoji-btn"
                          : "watch-room-btn watch-room-emoji-btn"
                      }
                      disabled={!isSocketConnected}
                      icon={<SmileOutlined />}
                    />
                  </Popover>
                  <Button
                    type="primary"
                    disabled={!watchRoomChatDraft.trim() || !isSocketConnected}
                    onClick={submitWatchRoomChat}
                  >
                    Send
                  </Button>
                </div>
              </div>
            </div>
            <Text
              className={
                messengerTheme === "mono"
                  ? "watch-room-meta-text-mono"
                  : "retro-pixel-text"
              }
              style={{ color: "var(--mess-muted-text)" }}
            >
              Use Sync to align playback for everyone in the room.
            </Text>
            {isYouTubeApiBlocked ? (
              <Text style={{ color: "var(--mess-muted-text)" }}>
                YouTube player API is unavailable in this browser/session.
                Fallback mode is active.
              </Text>
            ) : null}
          </div>
        ) : null}
      </AntdModal>

      <AntdModal
        title="Invite Viewer"
        open={isWatchRoomInviteModalOpen}
        onCancel={onCloseInviteModal}
        destroyOnHidden
        width="94vw"
        className={
          messengerTheme === "mono"
            ? "youtube-preview-modal watch-room-modal watch-room-invite-modal watch-room-modal-mono"
            : "youtube-preview-modal watch-room-modal watch-room-invite-modal watch-room-modal-retro"
        }
        footer={[
          <Button key="cancel" onClick={onCloseInviteModal}>
            Cancel
          </Button>,
          <Button
            key="invite"
            type="primary"
            disabled={watchRoomInviteUserId === null}
            onClick={onInviteConfirm}
          >
            Invite
          </Button>,
        ]}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <Text style={{ color: "var(--mess-muted-text)" }}>
            Select a user to invite into this watch room.
          </Text>
          <div
            className={
              messengerTheme === "mono"
                ? "watch-room-invite-list watch-room-invite-list-mono"
                : "watch-room-invite-list"
            }
          >
            {inviteableUsers.map((user) => {
              const isSelected = watchRoomInviteUserId === user.id;
              return (
                <button
                  key={user.id}
                  type="button"
                  className={
                    messengerTheme === "mono"
                      ? `watch-room-invite-item watch-room-invite-item-mono ${isSelected ? "watch-room-invite-item-selected watch-room-invite-item-selected-mono" : ""}`
                      : `watch-room-invite-item ${isSelected ? "watch-room-invite-item-selected" : ""}`
                  }
                  onClick={() => setWatchRoomInviteUserId(user.id)}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      minWidth: 0,
                    }}
                  >
                    <Avatar size={28} src={user.avatar_url}>
                      {user.username.slice(0, 1).toUpperCase()}
                    </Avatar>
                    <Text
                      className={
                        messengerTheme === "mono"
                          ? "watch-room-meta-text-mono"
                          : "retro-pixel-text"
                      }
                      style={{
                        margin: 0,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {user.username}
                    </Text>
                  </div>
                  {isSelected ? <CheckOutlined /> : null}
                </button>
              );
            })}
            {inviteableUsers.length === 0 ? (
              <Text
                className={
                  messengerTheme === "mono"
                    ? "watch-room-meta-text-mono"
                    : "retro-pixel-text"
                }
                style={{ color: "var(--mess-muted-text)" }}
              >
                No users available to invite.
              </Text>
            ) : null}
          </div>
        </div>
      </AntdModal>
    </>
  );
}
