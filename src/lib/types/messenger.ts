export interface ContactType {
  id: number;
  username: string;
  avatar_url?: string;
}

export interface ProfileType {
  id: number;
  username: string;
  avatar_url?: string;
}

export type ChatKind = "dialog" | "group" | "private";

export interface ChatType {
  id: number;
  title?: string;
  type: ChatKind;
  avatar_url?: string;
  last_message?: string;
  last_message_at?: string;
  unread_messages_count?: number;
  pin_position?: number;
}

export interface ChatMessageType {
  id: number;
  chat_id: number;
  text: string;
  created_at: string;
  is_own: boolean;
  delivery_status: "pending" | "delivered";
  client_message_id?: string;
}

export interface ChatMessageApiType {
  id: number;
  chat_id: number;
  content: string;
  created_at_timestamp: number;
  is_own: boolean;
}

export interface ParticipantType {
  id: number;
  chat_id: number;
  user_id: number;
  role: "admin" | "member";
  draft?: string | null;
  pin_position?: number;
  chat_visible?: boolean;
}

export interface ChatCreationType {
  chat: ChatType;
  participants: ParticipantType[];
}

export interface AvatarUploadPayload {
  data_url: string;
  stage_size: number;
  crop_x: number;
  crop_y: number;
  crop_size: number;
}

export interface CreateGroupPayload {
  title: string;
  participants: number[];
  avatar?: AvatarUploadPayload;
}

export interface ChatFolderType {
  id: number;
  title: string;
  chat_ids: number[];
}

export interface ChatFolderReplaceItemType {
  title: string;
  chat_ids: number[];
}
