"use client";

import React from "react";
import { Button, Layout, Typography, message as antdMessage } from "antd";
import WorkspaceHeader from "./WorkspaceHeader";
import WorkspaceContent from "./WorkspaceContent";
import WorkspaceFooter from "./WorkspaceFooter";
import ForwardMessageModalContent from "./ForwardMessageModalContent";
import { useVoicePlayback } from "../hooks/useVoicePlayback";
import {
  ATTACHMENT_MAX_SIZE_BYTES,
  SCROLL_HIGHLIGHT_DURATION_MS,
} from "../constants";
import type { AttachmentPickerKind, ChatSocketResponse } from "../types";
import {
  createClientMessageId,
  extractYouTubeVideoId,
  getChatPreviewText,
  mapApiMessage,
  resolveAttachmentPickerKind,
  resolveContentTypeForFile,
  resolveMessageAuthor,
  readAudioDurationMs,
  shortenText,
  sortChatsByRules,
  uploadFileWithProgress,
  watchRoomMapKey,
} from "../utils";
import { useModalSetter } from "@/hooks/features/ui/modal";
import {
  useActiveWatchRoomSetter,
  useChatMessages,
  useChatMessagesSetter,
  useChats,
  useChatsSetter,
  useExpensesPanelWidthSetter,
  useIsMessagesNearBottom,
  useIsMessagesNearBottomSetter,
  useIsSocketConnected,
  useIsSocketConnectedSetter,
  useSelectedChat,
  useSelectedChatSetter,
  useSocketSetter,
  useWatchRoomChatMessagesByRoomIdSetter,
  useWatchRoomReactionsByRoomIdSetter,
  useWatchRoomsByKeySetter,
  useYoutubePreviewVideoIdSetter,
  useIsYouTubeApiBlockedSetter,
  useSyncedToUserIdSetter,
} from "@/hooks/features/messenger/chats";
import AuthApi from "@/lib/api/auth";
import MessengerApi from "@/lib/api/messenger";
import { API_BASE_URL } from "@/lib/config";
import type {
  ChatMessageType,
  WatchRoomType,
} from "@/lib/types";

const { Text } = Typography;
const WATCH_ROOM_REACTION_PREFIX = "[[reaction]]";
const MESSAGES_PAGE_SIZE = 30;

type WatchRoomReactionView = {
  id: string;
  emoji: string;
  x_percent: number;
  y_percent: number;
};

export default function Workspace() {
  const chats = useChats();
  const setChats = useChatsSetter();
  const selectedChat = useSelectedChat();
  const selectedChatId = selectedChat?.id ?? null;
  const setSelectedChat = useSelectedChatSetter();
  const selectedMessages = useChatMessages(selectedChatId);
  const selectedMessagesById = React.useMemo(() => {
    const messagesById = new Map<number, ChatMessageType>();
    selectedMessages.forEach((message) => {
      messagesById.set(message.id, message);
    });
    return messagesById;
  }, [selectedMessages]);
  const setChatMessages = useChatMessagesSetter();
  const setModal = useModalSetter();
  const isSocketConnected = useIsSocketConnected();
  const setIsSocketConnected = useIsSocketConnectedSetter();
  const setSocket = useSocketSetter();
  const isMessagesNearBottom = useIsMessagesNearBottom();
  const setIsMessagesNearBottom = useIsMessagesNearBottomSetter();
  const setActiveWatchRoom = useActiveWatchRoomSetter();
  const setYoutubePreviewVideoId = useYoutubePreviewVideoIdSetter();
  const setIsYouTubeApiBlocked = useIsYouTubeApiBlockedSetter();
  const setSyncedToUserId = useSyncedToUserIdSetter();
  const setWatchRoomsByKey = useWatchRoomsByKeySetter();
  const setWatchRoomChatMessagesByRoomId =
    useWatchRoomChatMessagesByRoomIdSetter();
  const setWatchRoomReactionsByRoomId = useWatchRoomReactionsByRoomIdSetter();
  const setExpensesPanelWidth = useExpensesPanelWidthSetter();
  const [isMessagesLoading, setIsMessagesLoading] = React.useState(false);
  const [isOlderMessagesLoading, setIsOlderMessagesLoading] =
    React.useState(false);
  const [isAttachmentUploading, setIsAttachmentUploading] =
    React.useState(false);
  const [currentUserId, setCurrentUserId] = React.useState<number | null>(null);
  const [currentUsername, setCurrentUsername] = React.useState<string | null>(
    null,
  );
  const [currentUserAvatarUrl, setCurrentUserAvatarUrl] = React.useState<
    string | undefined
  >(undefined);
  const [liveLocationNowMs, setLiveLocationNowMs] = React.useState(() =>
    Date.now(),
  );
  const [liveLocationStatusByChatId, setLiveLocationStatusByChatId] =
    React.useState<
      Record<number, { isActive: boolean; expiresAt: number | null }>
    >({});
  const [isMessagesDragOver, setIsMessagesDragOver] = React.useState(false);
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
  const selectedChatIdRef = React.useRef<number | null>(selectedChatId);
  const currentUserIdRef = React.useRef<number | null>(currentUserId);
  const socketRef = React.useRef<WebSocket | null>(null);
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
  const pendingDeliveryTimeoutsRef = React.useRef<
    Map<string, ReturnType<typeof setTimeout>>
  >(new Map());
  const attachmentRetryFilesRef = React.useRef<
    Map<number, { file: File; kind: AttachmentPickerKind }>
  >(new Map());
  const dragCounterRef = React.useRef(0);
  const geolocationWatchIdRef = React.useRef<number | null>(null);
  const liveLocationIntervalRef = React.useRef<ReturnType<
    typeof setInterval
  > | null>(null);
  const latestLiveCoordsRef = React.useRef<{
    latitude: number;
    longitude: number;
    accuracy_meters?: number;
  } | null>(null);
  const activeLiveLocationChatIdRef = React.useRef<number | null>(null);
  const unavailableWatchRoomKeysRef = React.useRef<Set<string>>(new Set());
  const isResizingExpensesPanelRef = React.useRef(false);

  const {
    activeVoiceMessageId,
    voicePlaybackByMessageId,
    formatVoiceTime,
    toggleVoiceMessagePlayback,
    registerVoiceAudioElement,
    getVoiceAudioHandlers,
  } = useVoicePlayback(selectedChatId);

  const closeModal = React.useCallback(() => {
    setModal({ clear: true });
  }, [setModal]);

  const refreshChats = React.useCallback(async () => {
    const res = await MessengerApi.getChats();
    setChats(sortChatsByRules(res.data));
  }, [setChats]);

  const applyDeletedMessageLocally = React.useCallback(
    (chatId: number, messageId: number) => {
      setChatMessages((current) => {
        const existingMessages = current[chatId] ?? [];
        const nextMessages = existingMessages.filter(
          (message) => message.id !== messageId,
        );
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
                last_message: lastMessage
                  ? getChatPreviewText(lastMessage)
                  : undefined,
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
    },
    [setChatMessages, setChats],
  );

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

  const appendWatchRoomReaction = React.useCallback(
    (roomId: string, emoji: string) => {
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
    },
    [setWatchRoomReactionsByRoomId],
  );

  const clampExpensesPanelWidth = React.useCallback((width: number) => {
    if (typeof window === "undefined") {
      return Math.max(280, Math.min(560, Math.round(width)));
    }
    const maxWidth = Math.max(320, Math.floor(window.innerWidth * 0.6));
    return Math.max(280, Math.min(maxWidth, Math.round(width)));
  }, []);

  const selectedChatLiveStatus =
    selectedChatId === null
      ? undefined
      : liveLocationStatusByChatId[selectedChatId];
  const selectedChatLiveRemainingSeconds = React.useMemo(() => {
    if (!selectedChatLiveStatus?.isActive) {
      return null;
    }
    if (selectedChatLiveStatus.expiresAt === null) {
      return null;
    }
    return Math.max(
      0,
      Math.floor(selectedChatLiveStatus.expiresAt - liveLocationNowMs / 1000),
    );
  }, [liveLocationNowMs, selectedChatLiveStatus]);
  const selectedChatLiveRemainingLabel = React.useMemo(() => {
    if (!selectedChatLiveStatus?.isActive) {
      return null;
    }
    if (selectedChatLiveRemainingSeconds === null) {
      return "Live";
    }
    if (selectedChatLiveRemainingSeconds <= 0) {
      return "Ending...";
    }
    const hours = Math.floor(selectedChatLiveRemainingSeconds / 3600);
    const minutes = Math.floor((selectedChatLiveRemainingSeconds % 3600) / 60);
    const seconds = selectedChatLiveRemainingSeconds % 60;
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }, [selectedChatLiveRemainingSeconds, selectedChatLiveStatus]);
  React.useEffect(() => {
    selectedChatIdRef.current = selectedChatId;
  }, [selectedChatId]);

  React.useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

  React.useEffect(() => {
    void AuthApi.getProfile()
      .then(({ data }) => {
        setCurrentUserId(data.id);
        setCurrentUsername(data.username);
        setCurrentUserAvatarUrl(data.avatar_url);
      })
      .catch(() => undefined);
  }, []);

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

  function stopLiveLocationTrackingResources() {
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
  }

  React.useEffect(() => {
    const socket = MessengerApi.getMessagesSocket();
    const pendingDeliveryTimeouts = pendingDeliveryTimeoutsRef.current;
    socketRef.current = socket;
    setSocket(socket);

    socket.onopen = () => {
      setIsSocketConnected(true);
    };

    socket.onclose = () => {
      setIsSocketConnected(false);
      setSocket(null);
      setIsMessagesLoading(false);
      stopLiveLocationTrackingResources();
      const activeChatId = activeLiveLocationChatIdRef.current;
      if (activeChatId !== null) {
        setLiveLocationStatusByChatId((current) => ({
          ...current,
          [activeChatId]: {
            isActive: false,
            expiresAt: null,
          },
        }));
        activeLiveLocationChatIdRef.current = null;
      }
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
        setActiveWatchRoom((current) =>
          current && current.id === room.id ? room : current,
        );
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
            <div
              style={{ display: "flex", flexDirection: "column", gap: "10px" }}
            >
              <Text>{`${invite.from_username} invited you to watch together.`}</Text>
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "8px",
                }}
              >
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
                    void MessengerApi.acceptWatchRoomInvite(invite.id).then(
                      ({ data }) => {
                        setActiveWatchRoom(data);
                        setYoutubePreviewVideoId(data.youtube_video_id);
                        setWatchRoomsByKey((current) => ({
                          ...current,
                          [watchRoomMapKey(
                            data.chat_id,
                            data.youtube_video_id,
                          )]: data,
                        }));
                      },
                    );
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
        const reactionEmoji = tryExtractWatchRoomReactionEmoji(
          nextRoomMessage.content,
        );
        if (reactionEmoji) {
          appendWatchRoomReaction(nextRoomMessage.room_id, reactionEmoji);
          return;
        }
        setWatchRoomChatMessagesByRoomId((current) => {
          const existingMessages = current[nextRoomMessage.room_id] ?? [];
          if (
            existingMessages.some(
              (message) => message.id === nextRoomMessage.id,
            )
          ) {
            return current;
          }
          return {
            ...current,
            [nextRoomMessage.room_id]: [...existingMessages, nextRoomMessage],
          };
        });
        return;
      }

      if (payload.type === "live_location_updated") {
        const nextShare = payload.share;
        if (
          currentUserIdRef.current !== null &&
          nextShare.user_id === currentUserIdRef.current
        ) {
          activeLiveLocationChatIdRef.current = nextShare.chat_id;
          setLiveLocationStatusByChatId((current) => ({
            ...current,
            [nextShare.chat_id]: {
              isActive: true,
              expiresAt: nextShare.expires_at ?? null,
            },
          }));
        }
        return;
      }

      if (payload.type === "live_location_stopped") {
        if (
          currentUserIdRef.current !== null &&
          payload.user_id === currentUserIdRef.current
        ) {
          if (activeLiveLocationChatIdRef.current === payload.chat_id) {
            stopLiveLocationTrackingResources();
            activeLiveLocationChatIdRef.current = null;
          }
          setLiveLocationStatusByChatId((current) => ({
            ...current,
            [payload.chat_id]: {
              isActive: false,
              expiresAt: null,
            },
          }));
        }
        return;
      }

      if (payload.type === "message_deleted") {
        applyDeletedMessageLocally(payload.chat_id, payload.message_id);
        return;
      }

      if (payload.type === "messages") {
        const mappedMessages = payload.messages.map(mapApiMessage);
        const isOlderPage =
          payload.request_before_message_id !== null &&
          payload.request_before_message_id !== undefined;
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
            if (
              !mergedMessages.some((existing) => existing.id === message.id)
            ) {
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
          const timeoutId = pendingDeliveryTimeouts.get(
            payload.message.client_message_id,
          );
          if (timeoutId) {
            clearTimeout(timeoutId);
            pendingDeliveryTimeouts.delete(payload.message.client_message_id);
          }

          const optimisticMessageIndex = existingMessages.findIndex(
            (existingMessage) =>
              existingMessage.client_message_id ===
                payload.message.client_message_id &&
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

        if (
          existingMessages.some(
            (existingMessage) => existingMessage.id === nextMessage.id,
          )
        ) {
          return current;
        }
        return {
          ...current,
          [nextMessage.chat_id]: [...existingMessages, nextMessage],
        };
      });
      setChats((currentChats) => {
        const targetChatExists = currentChats.some(
          (chat) => chat.id === nextMessage.chat_id,
        );
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
                  ? (chat.unread_messages_count ?? 0)
                  : selectedChatIdRef.current === nextMessage.chat_id
                    ? 0
                    : (chat.unread_messages_count ?? 0) + 1,
              }
            : chat,
        );
        return sortChatsByRules(updatedChats);
      });
    };

    return () => {
      pendingDeliveryTimeouts.forEach((timeoutId) => clearTimeout(timeoutId));
      pendingDeliveryTimeouts.clear();
      socket.close();
      socketRef.current = null;
      setSocket(null);
    };
  }, [
    applyDeletedMessageLocally,
    appendWatchRoomReaction,
    closeModal,
    refreshChats,
    setActiveWatchRoom,
    setChatMessages,
    setChats,
    setIsSocketConnected,
    setModal,
    setSocket,
    setWatchRoomChatMessagesByRoomId,
    setWatchRoomsByKey,
    setYoutubePreviewVideoId,
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
    return () => {
      stopLiveLocationTrackingResources();
    };
  }, []);

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
    const optimisticVoiceDurationMs =
      contentType === "voice" ? await readAudioDurationMs(file) : null;
    const optimisticVoiceDurationSeconds =
      optimisticVoiceDurationMs === null
        ? null
        : optimisticVoiceDurationMs / 1000;
    const optimisticMessageId = existingMessageId ?? -Date.now();
    const localPreviewUrl =
      contentType === "image" ||
      contentType === "video" ||
      contentType === "voice"
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
          duration_ms: optimisticVoiceDurationMs ?? undefined,
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
        [selectedChatId]: [
          ...(current[selectedChatId] ?? []),
          optimisticMessage,
        ],
      }));
      setChats((currentChats) =>
        sortChatsByRules(
          currentChats.map((chat) =>
            chat.id === selectedChatId
              ? {
                  ...chat,
                  last_message: getChatPreviewText(optimisticMessage),
                  last_message_at: optimisticMessage.created_at,
                }
              : chat,
          ),
        ),
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
                        duration_ms: optimisticVoiceDurationMs ?? undefined,
                        duration_seconds:
                          optimisticVoiceDurationSeconds ?? undefined,
                        url: localPreviewUrl ?? message.attachment.url,
                        status: "pending",
                        upload_progress: 0,
                      }
                    : {
                        id: `local-${existingMessageId}`,
                        original_name: file.name,
                        mime_type: file.type || "application/octet-stream",
                        size_bytes: file.size,
                        duration_ms: optimisticVoiceDurationMs ?? undefined,
                        duration_seconds:
                          optimisticVoiceDurationSeconds ?? undefined,
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
    setIsMessagesNearBottom(true);

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
      const { data: initData } = await MessengerApi.initAttachment(
        selectedChatId,
        {
          filename: file.name,
          mime_type: file.type || "application/octet-stream",
          size_bytes: file.size,
        },
      );

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

      await MessengerApi.completeAttachment(
        selectedChatId,
        initData.attachment_id,
        {
          duration_ms: optimisticVoiceDurationMs ?? undefined,
          duration_seconds: optimisticVoiceDurationSeconds ?? undefined,
        },
      );

      const { data: sentMessage } = await MessengerApi.sendMessage(
        selectedChatId,
        caption ?? "",
        {
          contentType,
          attachmentId: initData.attachment_id,
          attachmentGroupId,
        },
      );

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
        sortChatsByRules(
          currentChats.map((chat) =>
            chat.id === selectedChatId
              ? {
                  ...chat,
                  last_message: getChatPreviewText(mappedMessage),
                  last_message_at: mappedMessage.created_at,
                }
              : chat,
          ),
        ),
      );
      attachmentRetryFilesRef.current.delete(optimisticMessageId);
    } catch {
      setChatMessages((current) => {
        const existingMessages = current[selectedChatId] ?? [];
        const nextMessages: ChatMessageType[] = existingMessages.map(
          (message) => {
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
          },
        );

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

  async function handleSendAttachmentBatch(
    files: File[],
    caption: string,
  ): Promise<void> {
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
        await handleSendAttachment(
          file,
          kind,
          undefined,
          fileCaption,
          attachmentGroupId,
          false,
        );
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
      const { data } = await MessengerApi.deleteMessage(
        selectedChatId,
        messageId,
      );
      applyDeletedMessageLocally(data.chat_id, data.message_id);
    } catch {
      antdMessage.error("Failed to delete message.");
    }
  }

  function handleStopLiveLocationShare(chatIdOverride?: number) {
    const activeChatId =
      chatIdOverride ?? activeLiveLocationChatIdRef.current ?? selectedChatId;
    stopLiveLocationTrackingResources();

    if (activeChatId === null) {
      return;
    }

    activeLiveLocationChatIdRef.current = null;
    setLiveLocationStatusByChatId((current) => ({
      ...current,
      [activeChatId]: {
        isActive: false,
        expiresAt: null,
      },
    }));

    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return;
    }

    socket.send(
      JSON.stringify({
        action: "live_location_stop",
        chat_id: activeChatId,
      }),
    );
  }

  function handleStartLiveLocationShare(durationSeconds: number | null) {
    if (selectedChatId === null) {
      antdMessage.error("Choose a chat first.");
      return;
    }
    if (typeof window === "undefined" || !navigator.geolocation) {
      antdMessage.error("Geolocation is not supported in this browser.");
      return;
    }
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      antdMessage.error("WebSocket is not connected.");
      return;
    }

    if (
      activeLiveLocationChatIdRef.current !== null &&
      activeLiveLocationChatIdRef.current !== selectedChatId
    ) {
      handleStopLiveLocationShare(activeLiveLocationChatIdRef.current);
    } else {
      stopLiveLocationTrackingResources();
    }

    const expiresAt =
      durationSeconds === null
        ? null
        : Math.floor(Date.now() / 1000) + durationSeconds;

    const sendPosition = (
      action: "live_location_start" | "live_location_update",
    ) => {
      const latestCoords = latestLiveCoordsRef.current;
      if (
        !latestCoords ||
        !socketRef.current ||
        socketRef.current.readyState !== WebSocket.OPEN
      ) {
        return;
      }
      socketRef.current.send(
        JSON.stringify({
          action,
          chat_id: selectedChatId,
          latitude: latestCoords.latitude,
          longitude: latestCoords.longitude,
          accuracy_meters: latestCoords.accuracy_meters,
          expires_at_timestamp: expiresAt,
        }),
      );
    };

    let hasSentStart = false;
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        latestLiveCoordsRef.current = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy_meters: Number.isFinite(position.coords.accuracy)
            ? position.coords.accuracy
            : undefined,
        };

        if (!hasSentStart) {
          sendPosition("live_location_start");
          hasSentStart = true;
        }
      },
      () => {
        handleStopLiveLocationShare(selectedChatId);
        antdMessage.error("Could not read current location.");
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 15000,
      },
    );

    geolocationWatchIdRef.current = watchId;
    activeLiveLocationChatIdRef.current = selectedChatId;
    setLiveLocationStatusByChatId((current) => ({
      ...current,
      [selectedChatId]: {
        isActive: true,
        expiresAt,
      },
    }));

    liveLocationIntervalRef.current = setInterval(() => {
      if (expiresAt !== null && Date.now() / 1000 >= expiresAt) {
        handleStopLiveLocationShare(selectedChatId);
        return;
      }
      sendPosition(
        hasSentStart ? "live_location_update" : "live_location_start",
      );
      hasSentStart = true;
    }, 3000);

    antdMessage.success("Live location sharing started.");
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
    setIsMessagesNearBottom(true);
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
      sortChatsByRules(
        currentChats.map((chat) =>
          chat.id === selectedChatId
            ? {
                ...chat,
                last_message: text,
                last_message_at: optimisticMessage.created_at,
              }
            : chat,
        ),
      ),
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
          (existingMessage) =>
            existingMessage.client_message_id === clientMessageId,
        );

        if (optimisticMessageIndex === -1) {
          return current;
        }

        const optimisticMessageToUpdate =
          existingMessages[optimisticMessageIndex];
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

  function handleForwardMessage(
    sourceMessage: ChatMessageType,
    targetChatIds: number[],
  ): void {
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
        setIsMessagesNearBottom(true);
        requestAnimationFrame(() => {
          const container = messagesContainerRef.current;
          if (container) {
            container.scrollTop = container.scrollHeight;
          }
        });
      }
    });

    antdMessage.success(
      `Forwarded to ${targetChatIds.length} chat${targetChatIds.length > 1 ? "s" : ""}.`,
    );
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

    await handleSendAttachment(
      droppedFile,
      resolveAttachmentPickerKind(droppedFile),
    );
  }

  async function handleOpenYouTubeWatchRoom(videoId: string) {
    if (selectedChatId === null) {
      return;
    }

    try {
      let room: WatchRoomType;
      try {
        const { data } = await MessengerApi.getWatchRoomByChat(
          selectedChatId,
          videoId,
        );
        room = data;
      } catch {
        const { data } = await MessengerApi.createWatchRoom(
          selectedChatId,
          videoId,
        );
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
        [watchRoomMapKey(joinedRoom.chat_id, joinedRoom.youtube_video_id)]:
          joinedRoom,
      }));
    } catch {
      antdMessage.error("Failed to open watch room.");
    }
  }

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

  return (
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
      <WorkspaceHeader />
      <WorkspaceContent
        messagesContainerRef={messagesContainerRef}
        onRequestOlderMessages={requestOlderMessagesForSearch}
        handleMessagesDragEnter={handleMessagesDragEnter}
        handleMessagesDragOver={handleMessagesDragOver}
        handleMessagesDragLeave={handleMessagesDragLeave}
        handleMessagesDrop={handleMessagesDrop}
        isMessagesDragOver={isMessagesDragOver}
        selectedChatLiveRemainingLabel={selectedChatLiveRemainingLabel}
        selectedChatLiveStatus={selectedChatLiveStatus}
        handleStopLiveLocationShare={handleStopLiveLocationShare}
        isMessagesLoading={isMessagesLoading}
        isOlderMessagesLoading={isOlderMessagesLoading}
        setReplyTarget={setReplyTarget}
        handleOpenForwardModal={handleOpenForwardModal}
        handleDeleteMessage={handleDeleteMessage}
        messageElementsRef={messageElementsRef}
        highlightedMessageId={highlightedMessageId}
        activeVoiceMessageId={activeVoiceMessageId}
        voicePlaybackByMessageId={voicePlaybackByMessageId}
        formatVoiceTime={formatVoiceTime}
        toggleVoiceMessagePlayback={toggleVoiceMessagePlayback}
        registerVoiceAudioElement={registerVoiceAudioElement}
        getVoiceAudioHandlers={getVoiceAudioHandlers}
        handleOpenAttachment={handleOpenAttachment}
        handleRetryAttachment={handleRetryAttachment}
        currentUserAvatarUrl={currentUserAvatarUrl}
        currentUsername={currentUsername}
        handleScrollToMessage={handleScrollToMessage}
        handleStartLiveLocationShare={handleStartLiveLocationShare}
        handleOpenYouTubeWatchRoom={handleOpenYouTubeWatchRoom}
        isResizingExpensesPanelRef={isResizingExpensesPanelRef}
      />
      <WorkspaceFooter
        isAttachmentUploading={isAttachmentUploading}
        replyTarget={replyTarget}
        onCancelReply={() => setReplyTarget(null)}
        onSendMessage={handleSendMessage}
        onSendAttachment={handleSendAttachment}
        onSendAttachmentBatch={handleSendAttachmentBatch}
      />
    </Layout>
  );
}
