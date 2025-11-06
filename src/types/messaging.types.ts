export type EntityType = 'profile' | 'tax_account' | 'transaction' | 'exchange' | 'eat' | 'property';

export interface Conversation {
  id: number;
  entity_type: EntityType;
  entity_id: number;
  title: string | null;
  is_pinned: boolean;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  
  // Relations
  participants?: ConversationParticipant[];
  messages?: Message[];
  unread_count?: number;
}

export interface ConversationParticipant {
  id: number;
  conversation_id: number;
  user_id: string;
  joined_at: string;
  last_read_at: string | null;
  is_admin: boolean;
  
  // Relations
  user?: {
    id: string;
    email?: string;
  };
  user_profile?: {
    id: string;
    first_name?: string;
    last_name?: string;
    email?: string;
  };
}

export interface Message {
  id: number;
  conversation_id: number;
  content: string;
  parent_message_id: number | null;
  created_task_id: number | null;
  is_system_message: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  created_by: string;
  edited_at: string | null;
  is_deleted: boolean;
  
  // Relations
  parent_message?: Message;
  created_task?: {
    id: number;
    title: string;
    status: string;
  };
  attachments?: MessageAttachment[];
  reactions?: MessageReaction[];
  author?: {
    id: string;
    email?: string;
  };
  author_profile?: {
    first_name?: string;
    last_name?: string;
  };
  replies?: Message[];
}

export interface MessageAttachment {
  id: number;
  message_id: number;
  file_name: string;
  file_size: number | null;
  file_type: string | null;
  storage_path: string;
  created_at: string;
  uploaded_by: string | null;
}

export interface MessageReaction {
  id: number;
  message_id: number;
  user_id: string;
  reaction: string;
  created_at: string;
}

export interface ConversationInsert {
  entity_type: EntityType;
  entity_id: number;
  title?: string | null;
  is_pinned?: boolean;
  created_by?: string | null;
}

export interface MessageInsert {
  conversation_id: number;
  content: string;
  parent_message_id?: number | null;
  is_system_message?: boolean;
  metadata?: Record<string, unknown>;
  created_by: string;
}

export interface MessageAttachmentInsert {
  message_id: number;
  file_name: string;
  file_size?: number | null;
  file_type?: string | null;
  storage_path: string;
  uploaded_by?: string | null;
}

export interface ConversationParticipantInsert {
  conversation_id: number;
  user_id: string;
  is_admin?: boolean;
}

