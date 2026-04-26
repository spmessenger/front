export interface ContactType {
  id: number;
  username: string;
  avatar_url?: string;
}

export interface ProfileType {
  id: number;
  username: string;
  email?: string | null;
  avatar_url?: string;
  subscription_tier?: "free" | "premium";
  youtube_access_mode?: "direct" | "assisted";
  tier_features?: string[];
  youtube_assisted_enabled?: boolean;
  can_enable_assisted?: boolean;
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
  content_type?: ChatMessageContentType;
  attachment?: ChatAttachmentType;
  attachment_group_id?: string;
  created_at: string;
  is_own: boolean;
  delivery_status: "pending" | "delivered";
  client_message_id?: string;
  reference_message_id?: number;
  reference_author?: string;
  reference_content?: string;
  forwarded_from_message_id?: number;
  forwarded_from_author?: string;
  forwarded_from_author_avatar_url?: string;
  forwarded_from_content?: string;
}

export type ChatMessageContentType = "text" | "image" | "video" | "document" | "voice";

export interface ChatAttachmentType {
  id: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  duration_ms?: number;
  duration_seconds?: number;
  url?: string;
  status?: "pending" | "ready" | "failed";
  upload_progress?: number;
}

export interface ChatAttachmentApiType {
  id: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  duration_ms?: number | null;
  duration_seconds?: number | null;
  download_url?: string | null;
  status?: "pending" | "ready" | "failed";
}

export interface ChatMessageApiType {
  id: number;
  chat_id: number;
  reference_message_id?: number | null;
  reference_author?: string | null;
  reference_content?: string | null;
  forwarded_from_message_id?: number | null;
  forwarded_from_author?: string | null;
  forwarded_from_author_avatar_url?: string | null;
  forwarded_from_content?: string | null;
  content: string;
  content_type?: ChatMessageContentType | null;
  attachment?: ChatAttachmentApiType | null;
  attachment_group_id?: string | null;
  created_at_timestamp: number;
  is_own: boolean;
}

export interface ChatMessageDeleteResponse {
  chat_id: number;
  message_id: number;
}

export interface AttachmentInitPayload {
  filename: string;
  mime_type: string;
  size_bytes: number;
}

export interface AttachmentInitResponse {
  attachment_id: string;
  storage_key: string;
  upload_url: string;
  upload_method: "PUT" | "POST";
  headers?: Record<string, string>;
  expires_in: number;
}

export interface AttachmentCompletePayload {
  sha256?: string;
  duration_ms?: number;
  duration_seconds?: number;
}

export interface AttachmentCompleteResponse {
  attachment_id: string;
  status: "pending" | "ready" | "failed";
  mime_type: string;
  size_bytes: number;
  duration_ms?: number | null;
  duration_seconds?: number | null;
}

export interface AttachmentDownloadResponse {
  url: string;
  expires_in: number;
}

export interface LinkPreviewResponse {
  url: string;
  title?: string | null;
  description?: string | null;
  image_url?: string | null;
  site_name?: string | null;
  youtube_video_id?: string | null;
}

export interface WatchRoomType {
  id: string;
  chat_id: number;
  youtube_video_id: string;
  youtube_access_mode?: "direct" | "assisted";
  host_user_id: number;
  viewer_user_ids: number[];
  viewer_count: number;
  sync_revision: number;
  sync_current_time_seconds: number;
  sync_is_playing: boolean;
  viewer_sync_states: WatchRoomViewerSyncStateType[];
  created_at: number;
}

export interface YouTubeAccessContextType {
  subscription_tier: "free" | "premium";
  youtube_access_mode: "direct" | "assisted";
  tier_features: string[];
  youtube_assisted_enabled: boolean;
  can_enable_assisted: boolean;
}

export interface YouTubeAccessTierType {
  tier: "free" | "premium";
  features: string[];
}

export interface WatchRoomViewerSyncStateType {
  user_id: number;
  current_time_seconds: number;
  is_playing: boolean;
  updated_at: number;
}

export interface WatchRoomInviteType {
  id: string;
  room_id: string;
  from_user_id: number;
  from_username: string;
  to_user_id: number;
  source_chat_id: number;
  target_chat_id?: number | null;
  youtube_video_id: string;
  status: "pending" | "accepted" | "declined";
  created_at: number;
}

export interface WatchRoomChatMessageType {
  id: string;
  room_id: string;
  user_id: number;
  username: string;
  content: string;
  created_at: number;
}

export interface LiveLocationShareType {
  chat_id: number;
  user_id: number;
  username: string;
  avatar_url?: string | null;
  latitude: number;
  longitude: number;
  accuracy_meters?: number | null;
  started_at: number;
  updated_at: number;
  expires_at?: number | null;
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
  unread_messages_count: any;
  id: number;
  title: string;
  chat_ids: number[];
}

export interface ChatFolderReplaceItemType {
  title: string;
  chat_ids: number[];
}

export interface ExpenseParticipantShareInputType {
  user_id: number;
  share_minor: number;
}

export interface ExpenseCreatePayloadType {
  title: string;
  amount_minor: number;
  currency: string;
  payer_user_id: number;
  participant_user_ids: number[];
  shares_minor?: ExpenseParticipantShareInputType[];
}

export interface ExpenseParticipantShareType {
  user_id: number;
  share_minor: number;
}

export interface ExpenseType {
  id: string;
  chat_id: number;
  title: string;
  amount_minor: number;
  currency: string;
  payer_user_id: number;
  created_by_user_id: number;
  created_at: number;
  shares: ExpenseParticipantShareType[];
}

export interface ExpenseBalanceType {
  user_id: number;
  balance_minor: number;
}

export interface ExpenseSettlementType {
  from_user_id: number;
  to_user_id: number;
  amount_minor: number;
}

export interface ExpenseOverviewType {
  chat_id: number;
  currency: string;
  total_expenses_minor: number;
  balances: ExpenseBalanceType[];
  settlements: ExpenseSettlementType[];
  open_expense_count: number;
}

export interface ExpensePaymentType {
  id: string;
  chat_id: number;
  from_user_id: number;
  to_user_id: number;
  amount_minor: number;
  created_by_user_id: number;
  created_at: number;
}
