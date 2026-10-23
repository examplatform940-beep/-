export interface AssistantAction {
  type:
    | 'OPEN_YOUTUBE'
    | 'OPEN_MESSENGER'
    | 'POST_COMMENT'
    | 'CREATE_LIST'
    | 'ADD_NOTE'
    | 'FORMAT_TEXT'
    | 'SET_TIMER';
  query?: string;
  url?: string;
  app?: 'whatsapp' | 'telegram';
  message?: string;
  contact?: string;
  platform?: 'tiktok' | 'instagram';
  commentText?: string;
  title?: string;
  items?: string[];
  content?: string;
  formatted?: string;
  minutes?: number;
  label?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  action?: AssistantAction | null;
  audioBase64?: string;
  isLoadingAudio?: boolean;
}

export interface SocialCommentItem {
  id: string;
  platform: 'tiktok' | 'instagram';
  commentText: string;
  status: 'typing' | 'posted';
  timestamp: string;
}

export interface ActiveMedia {
  query: string;
  url: string;
  isOpen: boolean;
}

export interface ListItem {
  id: string;
  title: string;
  items: Array<{ id: string; text: string; done: boolean }>;
  createdAt: string;
}

export interface NoteItem {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}
