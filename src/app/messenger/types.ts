import type {
  ChatMessageApiType,
  WatchRoomChatMessageType,
  WatchRoomInviteType,
  WatchRoomType,
} from "@/lib/types";

export type MessengerTheme = "retro" | "mono";
export type AttachmentPickerKind = "photo_or_video" | "document";

export type ChatSocketResponse =
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
      type: "watch_room_chat_message";
      message: WatchRoomChatMessageType;
    }
  | {
      type: "error";
      detail: string;
      chat_id?: number;
    };

export type YouTubePlayerLike = {
  getCurrentTime: () => number;
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
  getPlayerState: () => number;
  destroy: () => void;
};

export function hasYouTubePlayerMethods(player: unknown): player is YouTubePlayerLike {
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
          width?: number | string;
          height?: number | string;
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
