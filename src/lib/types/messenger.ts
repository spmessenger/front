export interface ContactType {
  id: number;
  username: string;
  avatar_url?: string;
}

export interface ChatType {
  id: number;
  title?: string;
  type: string; // TODO: enum
}
