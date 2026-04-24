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
          duration_ms: message.attachment.duration_ms ?? undefined,
          duration_seconds: message.attachment.duration_seconds
            ?? (typeof message.attachment.duration_ms === "number"
              ? message.attachment.duration_ms / 1000
              : undefined),
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
  const normalizedText = stripInlineMarkdown(text).replace(/\s+/g, " ").trim();
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

function stripInlineMarkdown(text: string): string {
  if (!text) {
    return "";
  }

  return text
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/gi, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1");
}

export function getChatPreviewText(message: Pick<ChatMessageType, "text" | "content_type" | "attachment">): string {
  const normalizedText = stripInlineMarkdown(message.text).trim();
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

export function buildGeoShareUrl(
  latitude: number,
  longitude: number,
  zoom: number = 16,
  accuracyMeters?: number,
): string {
  const safeLatitude = Math.max(-90, Math.min(90, latitude));
  const safeLongitude = Math.max(-180, Math.min(180, longitude));
  const accuracyParam = Number.isFinite(accuracyMeters)
    ? `&accuracy=${Math.max(0, Math.round(accuracyMeters ?? 0))}`
    : "";
  return `https://www.openstreetmap.org/?mlat=${safeLatitude.toFixed(6)}&mlon=${safeLongitude.toFixed(6)}${accuracyParam}#map=${zoom}/${safeLatitude.toFixed(6)}/${safeLongitude.toFixed(6)}`;
}

export function parseGeoShareUrl(
  urlValue: string,
): { latitude: number; longitude: number; accuracyMeters?: number } | null {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(urlValue);
  } catch {
    return null;
  }

  const hostname = parsedUrl.hostname.toLowerCase().replace(/^www\./, "");
  if (hostname !== "openstreetmap.org") {
    return null;
  }

  const latitude = Number(parsedUrl.searchParams.get("mlat"));
  const longitude = Number(parsedUrl.searchParams.get("mlon"));
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return null;
  }

  const accuracy = Number(parsedUrl.searchParams.get("accuracy"));
  return {
    latitude,
    longitude,
    accuracyMeters: Number.isFinite(accuracy) && accuracy >= 0 ? accuracy : undefined,
  };
}

export async function readAudioDurationMs(file: File): Promise<number | null> {
  if (typeof window === "undefined") {
    return null;
  }
  if (!file.type.startsWith("audio/")) {
    return null;
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const audioElement = document.createElement("audio");
    audioElement.preload = "metadata";

    const durationMs = await new Promise<number | null>((resolve) => {
      let settled = false;
      const finish = (value: number | null) => {
        if (settled) {
          return;
        }
        settled = true;
        resolve(value);
      };

      const timeoutId = window.setTimeout(() => finish(null), 5000);

      const handleLoaded = () => {
        window.clearTimeout(timeoutId);
        const duration = audioElement.duration;
        if (Number.isFinite(duration) && duration > 0) {
          finish(Math.round(duration * 1000));
          return;
        }
        finish(null);
      };

      const handleError = () => {
        window.clearTimeout(timeoutId);
        finish(null);
      };

      audioElement.addEventListener("loadedmetadata", handleLoaded, { once: true });
      audioElement.addEventListener("error", handleError, { once: true });
      audioElement.src = objectUrl;
      audioElement.load();
    });

    if (durationMs === null) {
      return null;
    }
    return Math.max(0, durationMs);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function readAudioDurationSeconds(file: File): Promise<number | null> {
  const durationMs = await readAudioDurationMs(file);
  return durationMs === null ? null : durationMs / 1000;
}

function renderPlainTextWithClickableUrls(text: string): React.ReactNode {
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

function renderInlineMarkdown(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let index = 0;
  let keyIndex = 0;

  while (index < text.length) {
    const source = text.slice(index);
    const linkMatch = source.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/i);
    if (linkMatch) {
      const [, label, rawUrl] = linkMatch;
      const normalizedUrl = normalizeExternalUrl(rawUrl);
      if (normalizedUrl) {
        nodes.push(
          <a
            key={`${keyPrefix}-link-${keyIndex}`}
            href={normalizedUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(event) => event.stopPropagation()}
            style={{ textDecoration: "underline", textUnderlineOffset: "2px" }}
          >
            {renderInlineMarkdown(label, `${keyPrefix}-link-label-${keyIndex}`)}
          </a>,
        );
        index += linkMatch[0].length;
        keyIndex += 1;
        continue;
      }
    }

    const boldMatch = source.match(/^(?:\*\*([^*]+)\*\*|__([^_]+)__)/);
    if (boldMatch) {
      const content = boldMatch[1] ?? boldMatch[2] ?? "";
      nodes.push(
        <strong key={`${keyPrefix}-bold-${keyIndex}`}>
          {renderInlineMarkdown(content, `${keyPrefix}-bold-content-${keyIndex}`)}
        </strong>,
      );
      index += boldMatch[0].length;
      keyIndex += 1;
      continue;
    }

    const italicMatch = source.match(/^(?:\*([^*]+)\*|_([^_]+)_)/);
    if (italicMatch) {
      const content = italicMatch[1] ?? italicMatch[2] ?? "";
      nodes.push(
        <em key={`${keyPrefix}-italic-${keyIndex}`}>
          {renderInlineMarkdown(content, `${keyPrefix}-italic-content-${keyIndex}`)}
        </em>,
      );
      index += italicMatch[0].length;
      keyIndex += 1;
      continue;
    }

    let nextSpecialIndex = source.length;
    const specialChars = ["[", "*", "_"];
    specialChars.forEach((char) => {
      const foundIndex = source.indexOf(char);
      if (foundIndex >= 0 && foundIndex < nextSpecialIndex) {
        nextSpecialIndex = foundIndex;
      }
    });

    const plainChunk = source.slice(0, nextSpecialIndex);
    if (plainChunk) {
      const renderedChunk = renderPlainTextWithClickableUrls(plainChunk);
      if (Array.isArray(renderedChunk)) {
        renderedChunk.forEach((node, chunkIndex) => {
          nodes.push(<React.Fragment key={`${keyPrefix}-plain-${keyIndex}-${chunkIndex}`}>{node}</React.Fragment>);
        });
      } else {
        nodes.push(
          <React.Fragment key={`${keyPrefix}-plain-${keyIndex}`}>
            {renderedChunk}
          </React.Fragment>,
        );
      }
      index += plainChunk.length;
      keyIndex += 1;
      continue;
    }

    nodes.push(
      <React.Fragment key={`${keyPrefix}-char-${keyIndex}`}>
        {source[0]}
      </React.Fragment>,
    );
    index += 1;
    keyIndex += 1;
  }

  return nodes;
}

export function renderTextWithClickableUrls(text: string): React.ReactNode {
  if (!text) {
    return text;
  }

  const rendered = renderInlineMarkdown(text, "md");
  return rendered.length > 0 ? rendered : text;
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
