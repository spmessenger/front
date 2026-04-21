"use client";
import React, { Fragment } from "react";
import {
  Avatar,
  Button,
  Checkbox,
  Dropdown,
  Image,
  Input,
  Layout,
  Modal as AntdModal,
  Progress,
  Select,
  Tooltip,
  Typography,
  message as antdMessage,
} from "antd";
import {
  CheckOutlined,
  CloseOutlined,
  CrownFilled,
  FileImageOutlined,
  FileTextOutlined,
  HomeFilled,
  InboxOutlined,
  LoadingOutlined,
  PaperClipOutlined,
  RedoOutlined,
  SmileOutlined,
  YoutubeFilled,
} from "@ant-design/icons";
import type { MenuProps } from "antd";
import { Content, Header, Footer } from "antd/lib/layout/layout";
import Sider from "antd/lib/layout/Sider";
import EmojiPicker, { type EmojiClickData } from "emoji-picker-react";
import ChatsList from "./components/ChatsList";
import ChatGroupsList from "./components/ChatGroupsList";
import ControlPanel from "./components/ControlPanel";
import SearchInput from "./components/SearchInput";
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
  ChatMessageContentType,
  ChatFolderReplaceItemType,
  ChatFolderType,
  ChatMessageApiType,
  ChatMessageType,
  ChatType,
  WatchRoomInviteType,
  WatchRoomType,
} from "@/lib/types";

const { Text } = Typography;
const { TextArea } = Input;
const REPLY_PREVIEW_MAX_LENGTH = 100;
const SCROLL_HIGHLIGHT_DURATION_MS = 1800;
const CHATS_CACHE_STORAGE_KEY = "messenger.chats.v1";
const CHAT_GROUPS_CACHE_STORAGE_KEY = "messenger.chatGroups.v1";
const MESSENGER_THEME_STORAGE_KEY = "messenger.theme.v1";
const ATTACHMENT_MAX_SIZE_BYTES = 100 * 1024 * 1024;

type MessengerTheme = "retro" | "mono";
type AttachmentPickerKind = "photo_or_video" | "document";

const MESSENGER_THEME_VARS: Record<MessengerTheme, Record<string, string>> = {
  retro: {
    "--mess-shell-bg": "#f3e1ca",
    "--mess-text": "#3f2831",
    "--mess-muted-text": "rgba(63, 40, 49, 0.72)",
    "--mess-sidebar-left": "#b396cb",
    "--mess-sidebar-mid": "#c75f8f",
    "--mess-header": "#6ebfbe",
    "--mess-reply-bg": "rgba(124, 149, 221, 0.24)",
    "--mess-reply-title": "#7c95dd",
    "--mess-highlight": "#e2bf61",
    "--mess-highlight-glow": "rgba(226, 191, 97, 0.35)",
    "--mess-group-active-bg": "rgba(110, 191, 190, 0.38)",
    "--mess-own-bubble": "#9fd6d2",
    "--mess-other-bubble": "#f9e9d3",
    "--mess-soft-card-bg": "rgba(124, 149, 221, 0.17)",
    "--mess-soft-border": "rgba(77, 46, 58, 0.25)",
    "--mess-accent": "#c75f8f",
    "--mess-date-bg": "#f3e1ca",
  },
  mono: {
    "--mess-shell-bg": "#0d0d0d",
    "--mess-text": "#ffffff",
    "--mess-muted-text": "#ffffff",
    "--mess-sidebar-left": "#000000",
    "--mess-sidebar-mid": "#0a0a0a",
    "--mess-header": "#111111",
    "--mess-reply-bg": "rgba(255, 255, 255, 0.08)",
    "--mess-reply-title": "#ffffff",
    "--mess-highlight": "#ffffff",
    "--mess-highlight-glow": "rgba(255, 255, 255, 0.22)",
    "--mess-group-active-bg": "rgba(255, 255, 255, 0.14)",
    "--mess-own-bubble": "#1d1d1d",
    "--mess-other-bubble": "#121212",
    "--mess-soft-card-bg": "rgba(255, 255, 255, 0.08)",
    "--mess-soft-border": "rgba(255, 255, 255, 0.25)",
    "--mess-accent": "#ffffff",
    "--mess-date-bg": "#0d0d0d",
  },
};

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
      type: "watch_room_updated";
      room: WatchRoomType;
    }
  | {
      type: "watch_room_invite";
      invite: WatchRoomInviteType;
    }
  | {
      type: "error";
      detail: string;
    chat_id?: number;
    };

type YouTubePlayerLike = {
  getCurrentTime: () => number;
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
  getPlayerState: () => number;
  destroy: () => void;
};

function hasYouTubePlayerMethods(player: unknown): player is YouTubePlayerLike {
  if (!player || typeof player !== "object") {
    return false;
  }
  const candidate = player as Partial<YouTubePlayerLike>;
  return (
    typeof candidate.getCurrentTime === "function" &&
    typeof candidate.playVideo === "function" &&
    typeof candidate.pauseVideo === "function" &&
    typeof candidate.seekTo === "function" &&
    typeof candidate.getPlayerState === "function"
  );
}

declare global {
  interface Window {
    YT?: {
      Player: new (
        element: HTMLElement,
        options: {
          videoId?: string;
          playerVars?: Record<string, number | string>;
          events?: Record<string, (event: { data?: number; target?: unknown }) => void>;
        },
      ) => YouTubePlayerLike;
      PlayerState?: {
        PLAYING: number;
        PAUSED: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

function parseChatsCache(rawValue: string | null): ChatType[] | null {
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown;
    if (!Array.isArray(parsed)) {
      return null;
    }

    return parsed.filter((item): item is ChatType => {
      if (!item || typeof item !== "object") {
        return false;
      }

      const chat = item as Partial<ChatType>;
      return typeof chat.id === "number" && typeof chat.type === "string";
    });
  } catch {
    return null;
  }
}

function parseChatGroupsCache(rawValue: string | null): ChatFolderType[] | null {
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown;
    if (!Array.isArray(parsed)) {
      return null;
    }

    return parsed.filter((item): item is ChatFolderType => {
      if (!item || typeof item !== "object") {
        return false;
      }

      const group = item as Partial<ChatFolderType>;
      return (
        typeof group.id === "number" &&
        typeof group.title === "string" &&
        Array.isArray(group.chat_ids) &&
        group.chat_ids.every((chatId) => typeof chatId === "number")
      );
    });
  } catch {
    return null;
  }
}

function mapApiMessage(message: ChatMessageApiType): ChatMessageType {
  const resolvedAttachmentUrl = message.attachment?.download_url
    ? (
      message.attachment.download_url.startsWith("http")
        ? message.attachment.download_url
        : `${API_BASE_URL.replace(/\/$/, "")}/${message.attachment.download_url.replace(/^\//, "")}`
    )
    : undefined;

  return {
    id: message.id,
    chat_id: message.chat_id,
    text: message.content,
    content_type: message.content_type ?? "text",
    attachment: message.attachment
      ? {
          id: message.attachment.id,
          original_name: message.attachment.original_name,
          mime_type: message.attachment.mime_type,
          size_bytes: message.attachment.size_bytes,
          url: resolvedAttachmentUrl,
          status: message.attachment.status ?? "ready",
        }
      : undefined,
    attachment_group_id: message.attachment_group_id ?? undefined,
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
  messengerTheme: MessengerTheme;
  isAttachmentUploading: boolean;
  replyTarget: ChatMessageType | null;
  selectedChatTitle: string | undefined;
  onCancelReply: () => void;
  onSendMessage: (text: string) => boolean;
  onSendAttachment: (file: File, kind: AttachmentPickerKind) => Promise<void>;
  onSendAttachmentBatch: (files: File[], caption: string) => Promise<void>;
}

function getChatPreviewText(message: Pick<ChatMessageType, "text" | "content_type" | "attachment">): string {
  const normalizedText = message.text.trim();
  if (normalizedText.length > 0) {
    return normalizedText;
  }

  if (message.attachment?.original_name) {
    return message.attachment.original_name;
  }

  if (message.content_type === "image") {
    return "Photo";
  }

  if (message.content_type === "video") {
    return "Video";
  }

  if (message.content_type === "document") {
    return "Document";
  }

  return "Attachment";
}

function resolveContentTypeForFile(file: File, kind: AttachmentPickerKind): ChatMessageContentType {
  if (kind === "photo_or_video") {
    if (file.type.startsWith("image/")) {
      return "image";
    }
    if (file.type.startsWith("video/")) {
      return "video";
    }
  }

  return "document";
}

function resolveAttachmentPickerKind(file: File): AttachmentPickerKind {
  if (file.type.startsWith("image/") || file.type.startsWith("video/")) {
    return "photo_or_video";
  }

  return "document";
}

function isGroupedMediaMessage(message: ChatMessageType): boolean {
  return Boolean(
    message.attachment &&
    message.attachment_group_id &&
    (message.content_type === "image" || message.content_type === "video"),
  );
}

const URL_TOKEN_PATTERN =
  /((?:https?:\/\/|www\.|m\.youtube\.com\/|youtube\.com\/|youtu\.be\/)[^\s]+)/gi;

function normalizeExternalUrl(rawValue: string): string | null {
  const cleanedValue = rawValue.trim().replace(/[),.;!?]+$/, "");
  if (!cleanedValue) {
    return null;
  }

  const withProtocol = /^https?:\/\//i.test(cleanedValue)
    ? cleanedValue
    : `https://${cleanedValue}`;
  try {
    const parsedUrl = new URL(withProtocol);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return null;
    }
    return parsedUrl.toString();
  } catch {
    return null;
  }
}

function extractUrls(text: string): string[] {
  if (!text.trim()) {
    return [];
  }

  const regex = new RegExp(URL_TOKEN_PATTERN);
  const results = new Set<string>();
  let match: RegExpExecArray | null = regex.exec(text);
  while (match) {
    const normalized = normalizeExternalUrl(match[0]);
    if (normalized) {
      results.add(normalized);
    }
    match = regex.exec(text);
  }
  return Array.from(results);
}

function extractYouTubeVideoIdFromUrl(urlValue: string): string | null {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(urlValue);
  } catch {
    return null;
  }

  const hostname = parsedUrl.hostname.toLowerCase().replace(/^www\./, "");
  if (hostname === "youtu.be") {
    const pathId = parsedUrl.pathname.split("/").filter(Boolean)[0];
    if (pathId) {
      return pathId;
    }
    return null;
  }

  if (hostname === "youtube.com" || hostname === "m.youtube.com") {
    if (parsedUrl.pathname === "/watch") {
      const queryId = parsedUrl.searchParams.get("v");
      if (queryId) {
        return queryId;
      }
    }

    const pathParts = parsedUrl.pathname.split("/").filter(Boolean);
    if (pathParts.length >= 2 && (pathParts[0] === "shorts" || pathParts[0] === "embed")) {
      return pathParts[1];
    }
  }

  return null;
}

function extractYouTubeVideoId(text: string): string | null {
  const urls = extractUrls(text);
  for (const url of urls) {
    const videoId = extractYouTubeVideoIdFromUrl(url);
    if (videoId) {
      return videoId;
    }
  }

  return null;
}

function renderTextWithClickableUrls(text: string): React.ReactNode {
  if (!text) {
    return text;
  }

  const regex = new RegExp(URL_TOKEN_PATTERN);
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null = regex.exec(text);
  while (match) {
    const token = match[0];
    const index = match.index;
    if (index > lastIndex) {
      nodes.push(text.slice(lastIndex, index));
    }

    const normalizedUrl = normalizeExternalUrl(token);
    if (normalizedUrl) {
      nodes.push(
        <a
          key={`${index}-${token}`}
          href={normalizedUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(event) => event.stopPropagation()}
          style={{ textDecoration: "underline", textUnderlineOffset: "2px" }}
        >
          {token.replace(/[),.;!?]+$/, "")}
        </a>,
      );
    } else {
      nodes.push(token);
    }
    lastIndex = index + token.length;
    match = regex.exec(text);
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes.length > 0 ? nodes : text;
}

function watchRoomMapKey(chatId: number, youtubeVideoId: string): string {
  return `${chatId}:${youtubeVideoId}`;
}

function uploadFileWithProgress(
  uploadUrl: string,
  method: "PUT" | "POST",
  headers: Record<string, string> | undefined,
  file: File,
  onProgress: (progress: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    const resolvedUploadUrl = uploadUrl.startsWith("http")
      ? uploadUrl
      : `${API_BASE_URL.replace(/\/$/, "")}/${uploadUrl.replace(/^\//, "")}`;
    request.open(method, resolvedUploadUrl, true);

    try {
      const uploadOrigin = new URL(resolvedUploadUrl).origin;
      const apiOrigin = new URL(API_BASE_URL).origin;
      request.withCredentials = uploadOrigin === apiOrigin;
    } catch {
      request.withCredentials = true;
    }

    if (headers) {
      Object.entries(headers).forEach(([key, value]) => {
        request.setRequestHeader(key, value);
      });
    } else if (file.type) {
      request.setRequestHeader("Content-Type", file.type);
    }

    request.upload.onprogress = (event) => {
      if (!event.lengthComputable) {
        return;
      }

      const progress = Math.max(0, Math.min(100, Math.round((event.loaded / event.total) * 100)));
      onProgress(progress);
    };

    request.onerror = () => reject(new Error("Attachment upload failed."));
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        onProgress(100);
        resolve();
        return;
      }
      const responseHint = request.responseText ? ` ${request.responseText}` : "";
      reject(new Error(`Attachment upload failed (${request.status}).${responseHint}`));
    };

    request.send(file);
  });
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
  messengerTheme,
  isAttachmentUploading,
  replyTarget,
  selectedChatTitle,
  onCancelReply,
  onSendMessage,
  onSendAttachment,
  onSendAttachmentBatch,
}: MessageComposerProps) {
  const [draft, setDraft] = React.useState("");
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = React.useState(false);
  const [isMediaModalOpen, setIsMediaModalOpen] = React.useState(false);
  const [mediaCaptionDraft, setMediaCaptionDraft] = React.useState("");
  const [pendingMediaFiles, setPendingMediaFiles] = React.useState<
    Array<{ id: string; file: File; previewUrl: string }>
  >([]);
  const pendingMediaFilesRef = React.useRef<Array<{ id: string; file: File; previewUrl: string }>>([]);
  const photoVideoInputRef = React.useRef<HTMLInputElement | null>(null);
  const documentInputRef = React.useRef<HTMLInputElement | null>(null);

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

  const attachmentMenuItems: MenuProps["items"] = [
    {
      key: "photo_or_video",
      label: "Photo or video",
      icon: <FileImageOutlined />,
    },
    {
      key: "document",
      label: "Document",
      icon: <FileTextOutlined />,
    },
  ];

  const handleAttachmentMenuClick: MenuProps["onClick"] = ({ key }) => {
    if (key === "photo_or_video") {
      photoVideoInputRef.current?.click();
      return;
    }

    if (key === "document") {
      documentInputRef.current?.click();
    }
  };

  function addMediaFiles(files: File[]) {
    const nextFiles = files.filter(
      (file) => file.type.startsWith("image/") || file.type.startsWith("video/"),
    );
    if (nextFiles.length === 0) {
      return;
    }

    const nextItems = nextFiles.map((file) => ({
      id:
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    setPendingMediaFiles((current) => [...current, ...nextItems]);
    setIsMediaModalOpen(true);
  }

  function removePendingMediaFile(id: string) {
    setPendingMediaFiles((current) => {
      const item = current.find((pending) => pending.id === id);
      if (item) {
        URL.revokeObjectURL(item.previewUrl);
      }
      return current.filter((pending) => pending.id !== id);
    });
  }

  function closeMediaModal() {
    setPendingMediaFiles((current) => {
      current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
      return [];
    });
    setMediaCaptionDraft("");
    setIsMediaModalOpen(false);
  }

  React.useEffect(() => {
    pendingMediaFilesRef.current = pendingMediaFiles;
  }, [pendingMediaFiles]);

  React.useEffect(() => {
    return () => {
      pendingMediaFilesRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    };
  }, []);

  async function handleAttachmentInputChange(
    event: React.ChangeEvent<HTMLInputElement>,
    kind: AttachmentPickerKind,
  ) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) {
      return;
    }

    if (kind === "photo_or_video") {
      addMediaFiles(files);
      return;
    }

    await onSendAttachment(files[0], kind);
  }

  async function handleSendPendingMedia() {
    if (pendingMediaFiles.length === 0) {
      return;
    }

    await onSendAttachmentBatch(
      pendingMediaFiles.map((item) => item.file),
      mediaCaptionDraft.trim(),
    );
    closeMediaModal();
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
              background: "var(--mess-reply-bg)",
              color: "var(--mess-text)",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <Text style={{ display: "block", color: "var(--mess-reply-title)", fontWeight: 600 }}>
                {`In reply to ${resolveMessageAuthor(replyTarget, selectedChatTitle)}`}
              </Text>
              <Text style={{ color: "var(--mess-text)" }}>
                {shortenText(replyTarget.text)}
              </Text>
            </div>
            <Button
              type="text"
              icon={<CloseOutlined />}
              onClick={onCancelReply}
              style={{ color: "var(--mess-text)" }}
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
        <Dropdown
          trigger={["hover", "click"]}
          placement="topLeft"
          overlayClassName={messengerTheme === "mono" ? "messenger-mono-attach-menu" : undefined}
          menu={{ items: attachmentMenuItems, onClick: handleAttachmentMenuClick }}
          disabled={!isSocketConnected || isAttachmentUploading}
        >
          <Button
            size="large"
            icon={<PaperClipOutlined />}
            aria-label="Attach file"
            title="Attach file"
            disabled={!isSocketConnected || isAttachmentUploading}
          />
        </Dropdown>
        <input
          ref={photoVideoInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          style={{ display: "none" }}
          onChange={(event) => {
            void handleAttachmentInputChange(event, "photo_or_video");
          }}
        />
        <input
          ref={documentInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.txt,.xlsx,.xls,.ppt,.pptx,.zip,.rar,application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          style={{ display: "none" }}
          onChange={(event) => {
            void handleAttachmentInputChange(event, "document");
          }}
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
          size="large"
          icon={<SmileOutlined />}
          aria-label="Open emoji picker"
          title="Open emoji picker"
          onClick={() => setIsEmojiPickerOpen((prev) => !prev)}
          disabled={!isSocketConnected || isAttachmentUploading}
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
      <AntdModal
        title="Send media"
        open={isMediaModalOpen}
        onCancel={closeMediaModal}
        destroyOnHidden
        className="media-compose-modal"
        footer={[
          <Button key="cancel" onClick={closeMediaModal}>
            Cancel
          </Button>,
          <Button
            key="add-more"
            onClick={() => {
              photoVideoInputRef.current?.click();
            }}
            disabled={!isSocketConnected || isAttachmentUploading}
          >
            Add more
          </Button>,
          <Button
            key="send"
            type="primary"
            onClick={() => {
              void handleSendPendingMedia();
            }}
            disabled={
              pendingMediaFiles.length === 0 ||
              !isSocketConnected ||
              isAttachmentUploading
            }
            loading={isAttachmentUploading}
          >
            Send media
          </Button>,
        ]}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
              gap: "8px",
              maxHeight: "320px",
              overflowY: "auto",
            }}
          >
            {pendingMediaFiles.map((item) => (
              <div
                key={item.id}
                style={{
                  position: "relative",
                  border: "1px solid var(--mess-soft-border)",
                  borderRadius: "8px",
                  overflow: "hidden",
                  background: "var(--mess-shell-bg)",
                }}
              >
                {item.file.type.startsWith("video/") ? (
                  <video
                    src={item.previewUrl}
                    style={{ width: "100%", height: "120px", objectFit: "cover", display: "block" }}
                    muted
                  />
                ) : (
                  <Image
                    src={item.previewUrl}
                    alt={item.file.name}
                    preview={false}
                    style={{ width: "100%", height: "120px", objectFit: "cover", display: "block" }}
                  />
                )}
                <Button
                  size="small"
                  danger
                  onClick={() => removePendingMediaFile(item.id)}
                  style={{ position: "absolute", top: "6px", right: "6px" }}
                >
                  Delete
                </Button>
              </div>
            ))}
          </div>
          <TextArea
            value={mediaCaptionDraft}
            onChange={(event) => setMediaCaptionDraft(event.target.value)}
            placeholder="Add caption"
            autoSize={{ minRows: 2, maxRows: 5 }}
            disabled={!isSocketConnected || isAttachmentUploading}
          />
        </div>
      </AntdModal>
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
          background: "var(--mess-soft-card-bg)",
          border: "1px solid var(--mess-soft-border)",
        }}
      >
        <Text style={{ color: "var(--mess-accent)", display: "block", marginBottom: "4px" }}>
          Message to forward
        </Text>
        <Text style={{ whiteSpace: "pre-wrap", color: "var(--mess-text)" }}>
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
                  border: "1px solid var(--mess-soft-border)",
                  borderRadius: "8px",
                  padding: "8px 10px",
                  cursor: "pointer",
                }}
              >
                <Checkbox value={chat.id} />
                <Avatar size={28} src={chat.avatar_url} icon={chat.type === "private" ? <HomeFilled /> : undefined} />
                <Text ellipsis className="retro-pixel-text" style={{ minWidth: 0 }}>
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
            border: "1px solid var(--mess-soft-border)",
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
  const [isWatchRoomSynced, setIsWatchRoomSynced] = React.useState(false);
  const [isWatchRoomSyncing, setIsWatchRoomSyncing] = React.useState(false);
  const [currentUserId, setCurrentUserId] = React.useState<number | null>(null);
  const [currentUsername, setCurrentUsername] = React.useState<string | null>(null);
  const [activeWatchRoom, setActiveWatchRoom] = React.useState<WatchRoomType | null>(null);
  const [watchRoomPlaybackSeconds, setWatchRoomPlaybackSeconds] = React.useState(0);
  const [watchRoomsByKey, setWatchRoomsByKey] = React.useState<Record<string, WatchRoomType>>({});
  const [isWatchRoomInviteModalOpen, setIsWatchRoomInviteModalOpen] = React.useState(false);
  const [watchRoomInviteUserId, setWatchRoomInviteUserId] = React.useState<number | null>(null);
  const [linkPreviewByUrl, setLinkPreviewByUrl] = React.useState<
    Record<string, {
      url: string;
      title?: string;
      description?: string;
      imageUrl?: string;
      siteName?: string;
      youtubeVideoId?: string;
    }>
  >({});
  const requestedYouTubePreviewUrlsRef = React.useRef<Set<string>>(new Set());
  const unavailableWatchRoomKeysRef = React.useRef<Set<string>>(new Set());
  const watchRoomAutoSyncInFlightRef = React.useRef(false);
  const [youTubePlayerHostElement, setYouTubePlayerHostElement] = React.useState<HTMLDivElement | null>(null);
  const youTubePlayerRef = React.useRef<YouTubePlayerLike | null>(null);
  const youTubeApiReadyRef = React.useRef(false);
  const watchRoomSyncStateRef = React.useRef<{ revision: number; isPlaying: boolean } | null>(null);
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
  const handleYouTubePlayerHostRef = React.useCallback((node: HTMLDivElement | null) => {
    setYouTubePlayerHostElement(node);
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

  React.useEffect(() => {
    const messageUrls = selectedMessages.flatMap((message) => extractUrls(message.text));

    messageUrls.forEach((url) => {
      if (requestedYouTubePreviewUrlsRef.current.has(url)) {
        return;
      }
      requestedYouTubePreviewUrlsRef.current.add(url);

      void MessengerApi.getLinkPreview(url)
        .then(({ data }) => {
          setLinkPreviewByUrl((current) => ({
            ...current,
            [url]: {
              url: data.url,
              title: data.title ?? undefined,
              description: data.description ?? undefined,
              imageUrl: data.image_url ?? undefined,
              siteName: data.site_name ?? undefined,
              youtubeVideoId: data.youtube_video_id ?? undefined,
            },
          }));
        })
        .catch(() => undefined);
    });
  }, [selectedMessages]);

  React.useEffect(() => {
    void AuthApi.getProfile()
      .then(({ data }) => {
        setCurrentUserId(data.id);
        setCurrentUsername(data.username);
      })
      .catch(() => undefined);
  }, []);

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
        isHost: userId === activeWatchRoom.host_user_id,
        isCurrentUser,
      };
    });
  }, [activeWatchRoom, availableUsers, currentUserId, currentUsername]);

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

    let isCancelled = false;

    const loadRooms = async () => {
      for (const youtubeId of youtubeIds) {
        const roomKey = watchRoomMapKey(selectedChatId, youtubeId);
        if (unavailableWatchRoomKeysRef.current.has(roomKey)) {
          continue;
        }
        try {
          const { data } = await MessengerApi.getWatchRoomByChat(selectedChatId, youtubeId);
          if (isCancelled) {
            return;
          }
          unavailableWatchRoomKeysRef.current.delete(roomKey);
          setWatchRoomsByKey((current) => ({
            ...current,
            [roomKey]: data,
          }));
        } catch {
          if (isCancelled) {
            return;
          }
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
    const intervalId = setInterval(() => {
      void loadRooms();
    }, 5000);

    return () => {
      isCancelled = true;
      clearInterval(intervalId);
    };
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

  React.useEffect(() => {
    const roomId = activeWatchRoom?.id;
    if (!roomId) {
      return;
    }

    let isCancelled = false;
    const refreshRoom = async () => {
      try {
        const { data } = await MessengerApi.getWatchRoom(roomId);
        if (isCancelled) {
          return;
        }
        setActiveWatchRoom(data);
        setWatchRoomsByKey((current) => ({
          ...current,
          [watchRoomMapKey(data.chat_id, data.youtube_video_id)]: data,
        }));
      } catch {
        if (!isCancelled) {
          watchRoomSyncStateRef.current = null;
          setIsYouTubePlayerReady(false);
          setActiveWatchRoom(null);
          setYoutubePreviewVideoId(null);
          setIsWatchRoomInviteModalOpen(false);
          setWatchRoomInviteUserId(null);
        }
      }
    };

    const intervalId = setInterval(() => {
      void refreshRoom();
    }, 3000);

    return () => {
      isCancelled = true;
      clearInterval(intervalId);
    };
  }, [activeWatchRoom?.id]);

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
    if (
      !youtubePreviewVideoId ||
      !youTubePlayerHostElement ||
      !window.YT?.Player ||
      !isYouTubeApiReady
    ) {
      return;
    }

    watchRoomSyncStateRef.current = null;
    setIsYouTubePlayerReady(false);
    const previousPlayer = youTubePlayerRef.current;
    if (hasYouTubePlayerMethods(previousPlayer)) {
      previousPlayer.destroy();
    }
    youTubePlayerRef.current = null;

    const createdPlayer = new window.YT.Player(youTubePlayerHostElement, {
      videoId: youtubePreviewVideoId,
      playerVars: {
        autoplay: 1,
        controls: 1,
        rel: 0,
        enablejsapi: 1,
        origin: window.location.origin,
        playsinline: 1,
      },
      events: {
        onReady: (event) => {
          if (!hasYouTubePlayerMethods(event.target)) {
            return;
          }
          youTubePlayerRef.current = event.target;
          setIsYouTubePlayerReady(true);
          setIsYouTubeApiBlocked(false);
          const isCurrentUserHost =
            currentUserId !== null && activeWatchRoom?.host_user_id === currentUserId;
          setIsWatchRoomSynced(Boolean(isCurrentUserHost));
          event.target.seekTo(initialSyncSeconds, true);
          if (initialSyncIsPlaying) {
            event.target.playVideo();
          } else {
            event.target.pauseVideo();
          }
        },
        onError: () => {
          setIsYouTubePlayerReady(false);
          setIsYouTubeApiBlocked(true);
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
      watchRoomSyncStateRef.current = null;
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
    isYouTubeApiReady,
    youtubePreviewVideoId,
    activeWatchRoom?.id,
    activeWatchRoom?.host_user_id,
    currentUserId,
    youTubePlayerHostElement,
  ]);

  React.useEffect(() => {
    const syncRevision = activeWatchRoom?.sync_revision;
    const syncSeconds = activeWatchRoom?.sync_current_time_seconds;
    const syncIsPlaying = activeWatchRoom?.sync_is_playing;
    if (
      syncRevision === undefined ||
      syncSeconds === undefined ||
      syncIsPlaying === undefined ||
      !isYouTubePlayerReady ||
      !hasYouTubePlayerMethods(youTubePlayerRef.current)
    ) {
      return;
    }
    const last = watchRoomSyncStateRef.current;
    if (last && last.revision === syncRevision) {
      return;
    }
    watchRoomSyncStateRef.current = {
      revision: syncRevision,
      isPlaying: syncIsPlaying,
    };
    const player = youTubePlayerRef.current;
    if (!hasYouTubePlayerMethods(player)) {
      return;
    }
    player.seekTo(syncSeconds, true);
    if (syncIsPlaying) {
      player.playVideo();
    } else {
      player.pauseVideo();
    }
    setIsWatchRoomSynced(true);
  }, [isYouTubePlayerReady, activeWatchRoom?.sync_revision, activeWatchRoom?.sync_current_time_seconds, activeWatchRoom?.sync_is_playing]);

  React.useEffect(() => {
    if (
      !activeWatchRoom ||
      !isYouTubePlayerReady ||
      !hasYouTubePlayerMethods(youTubePlayerRef.current)
    ) {
      return;
    }

    const intervalId = setInterval(() => {
      const player = youTubePlayerRef.current;
      if (!hasYouTubePlayerMethods(player)) {
        return;
      }

      const driftSeconds = Math.abs(player.getCurrentTime() - watchRoomPlaybackSeconds);
      if (driftSeconds > 1.2) {
        setIsWatchRoomSynced(false);
      }
    }, 700);

    return () => {
      clearInterval(intervalId);
    };
  }, [activeWatchRoom?.id, isYouTubePlayerReady, watchRoomPlaybackSeconds]);

  React.useEffect(() => {
    if (!activeWatchRoom || currentUserId === null) {
      return;
    }
    const isCurrentUserHost = activeWatchRoom.host_user_id === currentUserId;
    if (!isCurrentUserHost) {
      return;
    }

    let isCancelled = false;
    const intervalId = setInterval(() => {
      if (isCancelled || watchRoomAutoSyncInFlightRef.current) {
        return;
      }
      const player = youTubePlayerRef.current;
      const currentTime = hasYouTubePlayerMethods(player)
        ? player.getCurrentTime()
        : watchRoomPlaybackSeconds;
      const isPlaying = hasYouTubePlayerMethods(player)
        ? player.getPlayerState() === (window.YT?.PlayerState?.PLAYING ?? 1)
        : (activeWatchRoom.sync_is_playing ?? true);

      watchRoomAutoSyncInFlightRef.current = true;
      void MessengerApi.syncWatchRoom(activeWatchRoom.id, currentTime, isPlaying)
        .then(({ data }) => {
          if (isCancelled) {
            return;
          }
          setActiveWatchRoom((current) => (current?.id === data.id ? data : current));
          setWatchRoomsByKey((current) => ({
            ...current,
            [watchRoomMapKey(data.chat_id, data.youtube_video_id)]: data,
          }));
        })
        .catch(() => undefined)
        .finally(() => {
          watchRoomAutoSyncInFlightRef.current = false;
        });
    }, 2000);

    return () => {
      isCancelled = true;
      clearInterval(intervalId);
      watchRoomAutoSyncInFlightRef.current = false;
    };
  }, [
    activeWatchRoom?.id,
    activeWatchRoom?.host_user_id,
    activeWatchRoom?.sync_is_playing,
    currentUserId,
    isYouTubePlayerReady,
    watchRoomPlaybackSeconds,
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
  }, [closeModal, refreshChats, setChatMessages, setChats, setModal]);

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
    const optimisticMessageId = existingMessageId ?? -Date.now();
    const localPreviewUrl =
      contentType === "image" || contentType === "video"
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
                        url: localPreviewUrl ?? message.attachment.url,
                        status: "pending",
                        upload_progress: 0,
                      }
                    : {
                        id: `local-${existingMessageId}`,
                        original_name: file.name,
                        mime_type: file.type || "application/octet-stream",
                        size_bytes: file.size,
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

      await MessengerApi.completeAttachment(selectedChatId, initData.attachment_id, {});

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
        const nextMessages = existingMessages.map((message) =>
          message.id === optimisticMessageId
            ? {
                ...message,
                delivery_status: "pending",
                attachment: message.attachment
                  ? { ...message.attachment, status: "failed", upload_progress: undefined }
                  : message.attachment,
              }
            : message,
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
      setIsWatchRoomSynced(
        currentUserId !== null && joinedRoom.host_user_id === currentUserId,
      );
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

  async function handleSyncWatchRoom() {
    if (!activeWatchRoom) {
      return;
    }

    const isCurrentUserHost =
      currentUserId !== null && activeWatchRoom.host_user_id === currentUserId;

    try {
      setIsWatchRoomSyncing(true);
      let data: WatchRoomType;
      if (isCurrentUserHost) {
        const currentTime = hasYouTubePlayerMethods(youTubePlayerRef.current)
          ? youTubePlayerRef.current.getCurrentTime()
          : watchRoomPlaybackSeconds;
        const isPlaying =
          hasYouTubePlayerMethods(youTubePlayerRef.current)
            ? youTubePlayerRef.current.getPlayerState() === (window.YT?.PlayerState?.PLAYING ?? 1)
            : (activeWatchRoom.sync_is_playing ?? true);
        ({ data } = await MessengerApi.syncWatchRoom(activeWatchRoom.id, currentTime, isPlaying));
      } else {
        ({ data } = await MessengerApi.getWatchRoom(activeWatchRoom.id));
        if (!hasYouTubePlayerMethods(youTubePlayerRef.current)) {
          throw new Error("YouTube player is not ready");
        }
        youTubePlayerRef.current.seekTo(data.sync_current_time_seconds, true);
        if (data.sync_is_playing) {
          youTubePlayerRef.current.playVideo();
        } else {
          youTubePlayerRef.current.pauseVideo();
        }
      }

      setWatchRoomPlaybackSeconds(data.sync_current_time_seconds);
      watchRoomSyncStateRef.current = {
        revision: data.sync_revision,
        isPlaying: data.sync_is_playing,
      };
      setActiveWatchRoom(data);
      setWatchRoomsByKey((current) => ({
        ...current,
        [watchRoomMapKey(data.chat_id, data.youtube_video_id)]: data,
      }));
      setIsWatchRoomSynced(true);
    } catch {
      setIsWatchRoomSynced(false);
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

  async function handleCloseWatchRoom() {
    if (activeWatchRoom) {
      try {
        await MessengerApi.leaveWatchRoom(activeWatchRoom.id);
      } catch {
        // ignore leave errors
      }
    }
    watchRoomSyncStateRef.current = null;
    setIsYouTubePlayerReady(false);
    setIsWatchRoomSynced(false);
    setIsWatchRoomInviteModalOpen(false);
    setWatchRoomInviteUserId(null);
    setActiveWatchRoom(null);
    setYoutubePreviewVideoId(null);
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
          <ControlPanel />
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
                handleToggleMessengerTheme();
              }}
            >
              {messengerTheme === "retro" ? "Mono" : "Retro"}
            </Button>
          </div>
        </Header>
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
                            <div
                              onClick={(event) => {
                                event.stopPropagation();
                                if (chatMessage.reference_message_id) {
                                  handleScrollToMessage(chatMessage.reference_message_id);
                                }
                              }}
                              style={{
                                borderLeft: "3px solid var(--mess-reply-title)",
                                background: "var(--mess-soft-card-bg)",
                                borderRadius: "8px",
                                padding: "6px 10px",
                                marginBottom: "8px",
                                cursor: "pointer",
                              }}
                            >
                              <Text
                                style={{
                                  display: "block",
                                  color: "var(--mess-accent)",
                                  fontSize: "12px",
                                  fontWeight: 600,
                                  marginBottom: "2px",
                                }}
                              >
                                {referenceAuthor}
                              </Text>
                              <Text style={{ color: "var(--mess-muted-text)", fontSize: "13px" }}>
                                {referenceContent}
                              </Text>
                            </div>
                          ) : null}
                          {hasForwarded ? (
                            <div
                              style={{
                                borderRadius: "10px",
                                background: "var(--mess-soft-card-bg)",
                                padding: "8px 10px",
                                marginBottom: "8px",
                              }}
                            >
                              <Text
                                style={{
                                  display: "block",
                                  color: "var(--mess-accent)",
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
                                <Text style={{ color: "var(--mess-muted-text)", fontSize: "12px" }}>
                                  Forwarded from
                                </Text>
                                <Avatar
                                  size={18}
                                  src={chatMessage.forwarded_from_author_avatar_url}
                                  style={{ flexShrink: 0 }}
                                >
                                  {forwardedSourceAuthor.slice(0, 1).toUpperCase()}
                                </Avatar>
                                <Text style={{ color: "var(--mess-text)", fontSize: "12px" }}>
                                  {forwardedSourceAuthor}
                                </Text>
                              </div>
                              <Text style={{ color: "var(--mess-text)", whiteSpace: "pre-wrap" }}>
                                {forwardedSourceContent}
                              </Text>
                            </div>
                          ) : null}
                          {chatMessage.attachment ? (
                            <div style={{ marginBottom: chatMessage.text.trim() ? "8px" : "0" }}>
                              {hasMediaGroup ? (
                                <div
                                  style={{
                                    display: "grid",
                                    gridTemplateColumns:
                                      mediaGroupMessages.length === 2
                                        ? "repeat(2, minmax(0, 1fr))"
                                        : "repeat(3, minmax(0, 1fr))",
                                    gap: "4px",
                                    width: "min(420px, 100%)",
                                  }}
                                >
                                  {mediaGroupMessages.map((mediaMessage) => (
                                    <div
                                      key={mediaMessage.id}
                                      style={{
                                        position: "relative",
                                        borderRadius: "8px",
                                        overflow: "hidden",
                                        background: "rgba(0,0,0,0.08)",
                                      }}
                                    >
                                      {mediaMessage.content_type === "image" && mediaMessage.attachment?.url ? (
                                        <Image
                                          src={mediaMessage.attachment.url}
                                          alt={mediaMessage.attachment.original_name}
                                          width={132}
                                          style={{
                                            display: "block",
                                            width: "100%",
                                            aspectRatio: "1 / 1",
                                            objectFit: "cover",
                                          }}
                                          preview={mediaMessage.attachment.status !== "pending"}
                                        />
                                      ) : mediaMessage.content_type === "video" && mediaMessage.attachment?.url ? (
                                        <video
                                          src={mediaMessage.attachment.url}
                                          onClick={() => {
                                            void handleOpenAttachment(mediaMessage);
                                          }}
                                          style={{
                                            display: "block",
                                            width: "100%",
                                            aspectRatio: "1 / 1",
                                            objectFit: "cover",
                                            cursor: "pointer",
                                          }}
                                        />
                                      ) : null}
                                    </div>
                                  ))}
                                </div>
                              ) : chatMessage.content_type === "image" && chatMessage.attachment.url ? (
                                <Image
                                  src={chatMessage.attachment.url}
                                  alt={chatMessage.attachment.original_name}
                                  width={320}
                                  style={{
                                    display: "block",
                                    width: "min(320px, 100%)",
                                    maxHeight: "360px",
                                    objectFit: "cover",
                                    borderRadius: "10px",
                                  }}
                                  preview={chatMessage.attachment.status !== "pending"}
                                />
                              ) : chatMessage.content_type === "video" && chatMessage.attachment.url ? (
                                <div
                                  style={{
                                    width: "100%",
                                    borderRadius: "10px",
                                    overflow: "hidden",
                                    background: "#000000",
                                  }}
                                >
                                  <video
                                    src={chatMessage.attachment.url}
                                    controls
                                    style={{
                                      display: "block",
                                      width: "100%",
                                      height: "auto",
                                      maxHeight: "360px",
                                      objectFit: "contain",
                                      background: "#000000",
                                    }}
                                  />
                                </div>
                              ) : (
                                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                                  <Button
                                    size="small"
                                    onClick={() => {
                                      void handleOpenAttachment(chatMessage);
                                    }}
                                    disabled={chatMessage.attachment.status === "pending"}
                                  >
                                    {chatMessage.attachment.original_name}
                                  </Button>
                                  {chatMessage.attachment.status === "pending" ? (
                                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                      <Progress
                                        type="circle"
                                        percent={chatMessage.attachment.upload_progress ?? 0}
                                        size={22}
                                        showInfo={false}
                                        strokeWidth={14}
                                      />
                                      <Text style={{ color: "var(--mess-muted-text)", fontSize: "12px" }}>
                                        {`Uploading ${chatMessage.attachment.upload_progress ?? 0}%`}
                                      </Text>
                                    </div>
                                  ) : null}
                                  {chatMessage.attachment.status === "failed" ? (
                                    <Button
                                      size="small"
                                      icon={<RedoOutlined />}
                                      onClick={() => {
                                        void handleRetryAttachment(chatMessage.id);
                                      }}
                                    >
                                      Retry
                                    </Button>
                                  ) : null}
                                </div>
                              )}
                              {!hasMediaGroup &&
                              chatMessage.attachment.status === "pending" &&
                              (chatMessage.content_type === "image" || chatMessage.content_type === "video") ? (
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "6px",
                                    marginTop: "6px",
                                  }}
                                >
                                  <Progress
                                    type="circle"
                                    percent={chatMessage.attachment.upload_progress ?? 0}
                                    size={22}
                                    showInfo={false}
                                    strokeWidth={14}
                                  />
                                  <Text
                                    style={{
                                      color: "var(--mess-muted-text)",
                                      fontSize: "12px",
                                    }}
                                  >
                                    {`Uploading ${chatMessage.attachment.upload_progress ?? 0}%`}
                                  </Text>
                                </div>
                              ) : null}
                            </div>
                          ) : null}
                          {chatMessage.text.trim() ? (
                            <div
                              style={{
                                whiteSpace: "pre-wrap",
                                fontFamily:
                                  messengerTheme === "mono"
                                    ? "var(--font-geist-mono), monospace"
                                    : "var(--font-pixel), monospace",
                              }}
                            >
                              {renderTextWithClickableUrls(chatMessage.text)}
                            </div>
                          ) : null}
                          {primaryMessageUrl ? (
                            <div
                              onClick={(event) => {
                                event.stopPropagation();
                                window.open(primaryPreviewUrl, "_blank", "noopener,noreferrer");
                              }}
                              style={{
                                marginTop: "8px",
                                borderRadius: "10px",
                                border: "1px solid var(--mess-soft-border)",
                                background: "var(--mess-soft-card-bg)",
                                overflow: "hidden",
                                cursor: "pointer",
                              }}
                            >
                              <div style={{ padding: "8px 10px" }}>
                                <Text
                                  style={{
                                    display: "block",
                                    color: "var(--mess-accent)",
                                    fontSize: "12px",
                                    marginBottom: "2px",
                                  }}
                                >
                                  {primaryYouTubeVideoId ? "YouTube" : (primaryLinkPreview?.siteName || primaryMessageUrlHost)}
                                </Text>
                                <Text
                                  style={{
                                    display: "block",
                                    color: "var(--mess-text)",
                                    fontWeight: 600,
                                    lineHeight: 1.3,
                                  }}
                                >
                                  {primaryLinkPreview?.title || primaryMessageUrl}
                                </Text>
                                {primaryLinkPreview?.description ? (
                                  <Text
                                    style={{
                                      color: "var(--mess-muted-text)",
                                      fontSize: "12px",
                                      display: "block",
                                      marginTop: "2px",
                                    }}
                                  >
                                    {shortenText(primaryLinkPreview.description, 180)}
                                  </Text>
                                ) : null}
                              </div>
                              {primaryLinkPreview?.imageUrl || primaryYouTubeVideoId ? (
                                <div style={{ position: "relative" }}>
                                  <Image
                                    src={primaryLinkPreview?.imageUrl || `https://i.ytimg.com/vi/${primaryYouTubeVideoId}/hqdefault.jpg`}
                                    alt={primaryLinkPreview?.title || "Link preview"}
                                    preview={false}
                                    style={{
                                      display: "block",
                                      width: "100%",
                                      maxWidth: "420px",
                                      aspectRatio: primaryYouTubeVideoId ? "16 / 9" : "1.91 / 1",
                                      objectFit: "cover",
                                    }}
                                  />
                                  {primaryYouTubeVideoId ? (
                                    <div
                                      style={{
                                        position: "absolute",
                                        inset: 0,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        pointerEvents: "none",
                                      }}
                                    >
                                      <YoutubeFilled
                                        style={{
                                          color: "#ff4d4f",
                                          fontSize: "40px",
                                          filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.5))",
                                        }}
                                      />
                                    </div>
                                  ) : null}
                                </div>
                              ) : null}
                            </div>
                          ) : null}
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              marginTop: "6px",
                            }}
                          >
                            <Text
                              style={{
                                color: "var(--mess-muted-text)",
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
                            {youtubeVideoId ? (
                              <Tooltip
                                title="Watch on Your side"
                                classNames={{
                                  root:
                                    messengerTheme === "mono"
                                      ? "youtube-tooltip youtube-tooltip-mono"
                                      : "youtube-tooltip",
                                }}
                              >
                                <Button
                                  type="text"
                                  size="small"
                                  icon={<YoutubeFilled />}
                                  aria-label="Open YouTube preview"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    void handleOpenYouTubeWatchRoom(youtubeVideoId);
                                  }}
                                  className={
                                    messengerTheme === "mono"
                                      ? "youtube-trigger-btn youtube-trigger-btn-mono"
                                      : "youtube-trigger-btn"
                                  }
                                  style={{
                                    height: "20px",
                                    minWidth: "20px",
                                    padding: 0,
                                    marginLeft: "auto",
                                  }}
                                />
                              </Tooltip>
                            ) : null}
                            {watchRoomSummary ? (
                              <Text style={{ color: "var(--mess-muted-text)", fontSize: "12px" }}>
                                {watchRoomSummary.viewer_count}
                              </Text>
                            ) : null}
                          </div>
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
      <AntdModal
        title="YouTube video"
        open={youtubePreviewVideoId !== null}
        onCancel={() => {
          void handleCloseWatchRoom();
        }}
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
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <Text
                className={messengerTheme === "mono" ? "watch-room-meta-text-mono" : "retro-pixel-text"}
                style={{ color: "var(--mess-muted-text)" }}
              >
                Viewers: {activeWatchRoom?.viewer_count ?? 1}
              </Text>
              <div style={{ display: "flex", gap: "8px" }}>
                <Button
                  className={
                    messengerTheme === "mono"
                      ? `watch-room-btn watch-room-btn-mono ${isWatchRoomSynced ? "watch-room-btn-synced watch-room-btn-synced-mono" : ""}`
                      : `watch-room-btn ${isWatchRoomSynced ? "watch-room-btn-synced" : ""}`
                  }
                  disabled={!activeWatchRoom || isWatchRoomSyncing || !isYouTubePlayerReady}
                  onClick={() => void handleSyncWatchRoom()}
                >
                  {isWatchRoomSyncing ? "Syncing..." : isWatchRoomSynced ? "Synced" : "Sync"}
                </Button>
                <Button
                  className={messengerTheme === "mono" ? "watch-room-btn watch-room-btn-mono" : "watch-room-btn"}
                  onClick={() => setIsWatchRoomInviteModalOpen(true)}
                >
                  Invite
                </Button>
                <Button
                  danger
                  className={messengerTheme === "mono" ? "watch-room-btn watch-room-btn-mono" : "watch-room-btn"}
                  onClick={() => {
                    void handleCloseWatchRoom();
                  }}
                >
                  Leave room
                </Button>
              </div>
            </div>
            <div
              style={{
                display: "flex",
                gap: "12px",
                alignItems: "stretch",
                flexWrap: "nowrap",
              }}
            >
              <div
                style={{
                  position: "relative",
                  flex: "1 1 auto",
                  minWidth: 0,
                  paddingTop: "56.25%",
                  borderRadius: "10px",
                  overflow: "hidden",
                  background: "#000000",
                }}
              >
                <div
                  ref={handleYouTubePlayerHostRef}
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                  }}
                />
                {!isYouTubePlayerReady && !isYouTubeApiBlocked ? (
                  <div
                    className={
                      messengerTheme === "mono"
                        ? "youtube-player-loading-overlay youtube-player-loading-overlay-mono"
                        : "youtube-player-loading-overlay"
                    }
                  >
                    <LoadingOutlined />
                    <span>Loading player...</span>
                  </div>
                ) : null}
              </div>
              <div
                className={
                  messengerTheme === "mono"
                    ? "watch-room-viewers-panel watch-room-viewers-panel-mono"
                    : "watch-room-viewers-panel"
                }
                style={{ flex: "0 0 220px", maxWidth: "220px" }}
              >
                <Text className={messengerTheme === "mono" ? "watch-room-meta-text-mono" : "retro-pixel-text"}>
                  Viewers
                </Text>
                <div style={{ marginTop: "10px", display: "flex", flexDirection: "column", gap: "8px" }}>
                  {watchRoomViewerItems.map((viewer) => (
                    <div key={viewer.userId} className="watch-room-viewer-row">
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                        <Avatar size={24}>
                          {viewer.username.slice(0, 1).toUpperCase()}
                        </Avatar>
                        <Text
                          className={messengerTheme === "mono" ? "watch-room-meta-text-mono" : "retro-pixel-text"}
                          style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                        >
                          {viewer.username}{viewer.isCurrentUser ? " (You)" : ""}
                        </Text>
                      </div>
                      {viewer.isHost ? (
                        <CrownFilled className="watch-room-host-crown" />
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <Text
              className={messengerTheme === "mono" ? "watch-room-meta-text-mono" : "retro-pixel-text"}
              style={{ color: "var(--mess-muted-text)" }}
            >
              Use Sync to align playback for everyone in the room.
            </Text>
            {isYouTubeApiBlocked ? (
              <Text style={{ color: "var(--mess-muted-text)" }}>
                YouTube player API is unavailable in this browser/session. Fallback mode is active.
              </Text>
            ) : null}
          </div>
        ) : null}
      </AntdModal>
      <AntdModal
        title="Invite Viewer"
        open={isWatchRoomInviteModalOpen}
        onCancel={() => {
          setIsWatchRoomInviteModalOpen(false);
          setWatchRoomInviteUserId(null);
        }}
        destroyOnHidden
        width="94vw"
        className={
          messengerTheme === "mono"
            ? "youtube-preview-modal watch-room-modal watch-room-invite-modal watch-room-modal-mono"
            : "youtube-preview-modal watch-room-modal watch-room-invite-modal watch-room-modal-retro"
        }
        footer={[
          <Button
            key="cancel"
            onClick={() => {
              setIsWatchRoomInviteModalOpen(false);
              setWatchRoomInviteUserId(null);
            }}
          >
            Cancel
          </Button>,
          <Button
            key="invite"
            type="primary"
            disabled={watchRoomInviteUserId === null}
            onClick={() => void handleInviteToWatchRoom()}
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
            {availableUsers
              .filter((user) => !activeWatchRoom?.viewer_user_ids.includes(user.id))
              .map((user) => {
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
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                      <Avatar size={28} src={user.avatar_url}>
                        {user.username.slice(0, 1).toUpperCase()}
                      </Avatar>
                      <Text
                        className={messengerTheme === "mono" ? "watch-room-meta-text-mono" : "retro-pixel-text"}
                        style={{ margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                      >
                        {user.username}
                      </Text>
                    </div>
                    {isSelected ? <CheckOutlined /> : null}
                  </button>
                );
              })}
            {availableUsers.filter((user) => !activeWatchRoom?.viewer_user_ids.includes(user.id)).length === 0 ? (
              <Text
                className={messengerTheme === "mono" ? "watch-room-meta-text-mono" : "retro-pixel-text"}
                style={{ color: "var(--mess-muted-text)" }}
              >
                No users available to invite.
              </Text>
            ) : null}
          </div>
        </div>
      </AntdModal>
      <AppModal />
    </Fragment>
  );
}

