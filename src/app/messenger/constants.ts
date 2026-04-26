import type { MessengerTheme } from "./types";

export const REPLY_PREVIEW_MAX_LENGTH = 100;
export const SCROLL_HIGHLIGHT_DURATION_MS = 1800;
export const CHATS_CACHE_STORAGE_KEY = "messenger.chats.v1";
export const CHAT_GROUPS_CACHE_STORAGE_KEY = "messenger.chatGroups.v1";
export const MESSENGER_THEME_STORAGE_KEY = "messenger.theme.v1";
export const ATTACHMENT_MAX_SIZE_BYTES = 100 * 1024 * 1024;
export const ALL_CHATS_GROUP_ID = 0;
export const ALL_CHATS_GROUP_TITLE = "\u0412\u0441\u0435 \u0447\u0430\u0442\u044b";
export const ENABLE_EXPENSE_SPLIT_FEATURE = false;

export const MESSENGER_THEME_VARS: Record<MessengerTheme, Record<string, string>> = {
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
