import React from "react";
import { API_BASE_URL } from "@/lib/config";
import type { ChatMessageApiType, ChatMessageContentType, ChatMessageType, ChatType, ChatFolderType, WatchRoomType } from "@/lib/types";
import { REPLY_PREVIEW_MAX_LENGTH } from "./constants";
import type { AttachmentPickerKind } from "./types";

export function parseChatsCache(rawValue: string | null): ChatType[] | null {
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

export function parseChatGroupsCache(rawValue: string | null): ChatFolderType[] | null {
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

export function mapApiMessage(message: ChatMessageApiType): ChatMessageType {
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

export function shortenText(text: string, maxLength: number = REPLY_PREVIEW_MAX_LENGTH): string {
  const normalizedText = text.replace(/\s+/g, " ").trim();
  if (normalizedText.length <= maxLength) {
    return normalizedText;
  }
  return `${normalizedText.slice(0, maxLength - 3).trimEnd()}...`;
}

export function resolveMessageAuthor(
  message: Pick<ChatMessageType, "is_own">,
  selectedChatTitle: string | undefined,
): string {
  if (message.is_own) {
    return "You";
  }
  return selectedChatTitle || "User";
}

export function createClientMessageId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function isSameCalendarDay(leftIso: string, rightIso: string): boolean {
  const left = new Date(leftIso);
  const right = new Date(rightIso);
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

export function formatCalendarDay(iso: string): string {
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

export function sortChatsByRules(chats: ChatType[]): ChatType[] {
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

export function getChatPreviewText(message: Pick<ChatMessageType, "text" | "content_type" | "attachment">): string {
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
  if (message.content_type === "voice") {
    return "Voice message";
  }

  return "Attachment";
}

export function resolveContentTypeForFile(file: File, kind: AttachmentPickerKind): ChatMessageContentType {
  if (kind === "voice") {
    return "voice";
  }

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

export function resolveAttachmentPickerKind(file: File): AttachmentPickerKind {
  if (file.type.startsWith("image/") || file.type.startsWith("video/")) {
    return "photo_or_video";
  }
  if (file.type.startsWith("audio/")) {
    return "voice";
  }

  return "document";
}

export function isGroupedMediaMessage(message: ChatMessageType): boolean {
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

export function extractUrls(text: string): string[] {
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

export function extractYouTubeVideoIdFromUrl(urlValue: string): string | null {
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

export function extractYouTubeVideoId(text: string): string | null {
  const urls = extractUrls(text);
  for (const url of urls) {
    const videoId = extractYouTubeVideoIdFromUrl(url);
    if (videoId) {
      return videoId;
    }
  }

  return null;
}

export function renderTextWithClickableUrls(text: string): React.ReactNode {
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

export function watchRoomMapKey(chatId: number, youtubeVideoId: string): string {
  return `${chatId}:${youtubeVideoId}`;
}

export function getViewerSyncStates(room: WatchRoomType | null): WatchRoomType["viewer_sync_states"] {
  return room?.viewer_sync_states ?? [];
}

export function uploadFileWithProgress(
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
