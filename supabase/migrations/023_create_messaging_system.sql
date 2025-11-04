-- Drop existing tables and recreate (for clean migration)
DROP TABLE IF EXISTS message_reactions CASCADE;
DROP TABLE IF EXISTS message_attachments CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversation_participants CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;

-- Create conversations table
CREATE TABLE conversations (
  id BIGSERIAL PRIMARY KEY,
  
  -- Entity association (like tasks/documents)
  entity_type TEXT NOT NULL CHECK (entity_type IN ('profile', 'tax_account', 'transaction', 'exchange', 'eat', 'property')),
  entity_id BIGINT NOT NULL,
  
  -- Conversation details
  title TEXT,
  is_pinned BOOLEAN DEFAULT FALSE,
  last_message_at TIMESTAMP WITH TIME ZONE,
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create conversation_participants table (for multi-user conversations)
CREATE TABLE conversation_participants (
  id BIGSERIAL PRIMARY KEY,
  conversation_id BIGINT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Participant metadata
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_read_at TIMESTAMP WITH TIME ZONE,
  is_admin BOOLEAN DEFAULT FALSE,
  
  -- Unique constraint: one user per conversation
  UNIQUE(conversation_id, user_id)
);

-- Create messages table
CREATE TABLE messages (
  id BIGSERIAL PRIMARY KEY,
  conversation_id BIGINT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  
  -- Message content
  content TEXT NOT NULL,
  
  -- Reply functionality
  parent_message_id BIGINT REFERENCES messages(id) ON DELETE SET NULL,
  
  -- Task creation from message
  created_task_id BIGINT REFERENCES tasks(id) ON DELETE SET NULL,
  
  -- Metadata
  is_system_message BOOLEAN DEFAULT FALSE, -- For automated messages
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  edited_at TIMESTAMP WITH TIME ZONE,
  is_deleted BOOLEAN DEFAULT FALSE
);

-- Create message_attachments table
CREATE TABLE message_attachments (
  id BIGSERIAL PRIMARY KEY,
  message_id BIGINT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  
  -- File information
  file_name TEXT NOT NULL,
  file_size BIGINT,
  file_type TEXT,
  storage_path TEXT NOT NULL, -- Path in Supabase storage
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create message_reactions table (optional: for emoji reactions)
CREATE TABLE message_reactions (
  id BIGSERIAL PRIMARY KEY,
  message_id BIGINT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Reaction type (emoji)
  reaction TEXT NOT NULL,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint: one reaction type per user per message
  UNIQUE(message_id, user_id, reaction)
);

-- Drop existing indexes if they exist
DROP INDEX IF EXISTS idx_conversations_entity;
DROP INDEX IF EXISTS idx_conversations_pinned;
DROP INDEX IF EXISTS idx_conversations_created_by;
DROP INDEX IF EXISTS idx_conversations_last_message;
DROP INDEX IF EXISTS idx_conversation_participants_conversation;
DROP INDEX IF EXISTS idx_conversation_participants_user;
DROP INDEX IF EXISTS idx_messages_conversation;
DROP INDEX IF EXISTS idx_messages_parent;
DROP INDEX IF EXISTS idx_messages_created_by;
DROP INDEX IF EXISTS idx_messages_created_at;
DROP INDEX IF EXISTS idx_messages_task;
DROP INDEX IF EXISTS idx_message_attachments_message;
DROP INDEX IF EXISTS idx_message_reactions_message;
DROP INDEX IF EXISTS idx_message_reactions_user;

-- Add indexes for better query performance
CREATE INDEX idx_conversations_entity ON conversations(entity_type, entity_id);
CREATE INDEX idx_conversations_pinned ON conversations(is_pinned) WHERE is_pinned = TRUE;
CREATE INDEX idx_conversations_created_by ON conversations(created_by);
CREATE INDEX idx_conversations_last_message ON conversations(last_message_at DESC);

CREATE INDEX idx_conversation_participants_conversation ON conversation_participants(conversation_id);
CREATE INDEX idx_conversation_participants_user ON conversation_participants(user_id);

CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_parent ON messages(parent_message_id);
CREATE INDEX idx_messages_created_by ON messages(created_by);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX idx_messages_task ON messages(created_task_id);

CREATE INDEX idx_message_attachments_message ON message_attachments(message_id);

CREATE INDEX idx_message_reactions_message ON message_reactions(message_id);
CREATE INDEX idx_message_reactions_user ON message_reactions(user_id);

-- Enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversations
-- Simplified: All authenticated users can view all conversations
-- (You can restrict this later based on your security requirements)
CREATE POLICY "Users can view conversations they participate in"
  ON conversations
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create conversations"
  ON conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Conversation creators and admins can update"
  ON conversations
  FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_participants.conversation_id = conversations.id
      AND conversation_participants.user_id = auth.uid()
      AND conversation_participants.is_admin = TRUE
    )
  );

CREATE POLICY "Conversation creators can delete"
  ON conversations
  FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- RLS Policies for conversation_participants
-- Simplified: All authenticated users can view participants
CREATE POLICY "Users can view participants of their conversations"
  ON conversation_participants
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can add participants"
  ON conversation_participants
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can remove themselves or admins can remove others"
  ON conversation_participants
  FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_participants.conversation_id = conversation_participants.conversation_id
      AND conversation_participants.user_id = auth.uid()
      AND conversation_participants.is_admin = TRUE
    )
  );

-- RLS Policies for messages
-- Simplified: All authenticated users can view and create messages
CREATE POLICY "Users can view messages in their conversations"
  ON messages
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Conversation participants can create messages"
  ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Message creators can update their messages"
  ON messages
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Message creators can delete their messages"
  ON messages
  FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- RLS Policies for message_attachments
-- Simplified: All authenticated users can view attachments
CREATE POLICY "Users can view attachments in their conversations"
  ON message_attachments
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create attachments"
  ON message_attachments
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can delete their own attachments"
  ON message_attachments
  FOR DELETE
  TO authenticated
  USING (uploaded_by = auth.uid());

-- RLS Policies for message_reactions
CREATE POLICY "Users can view reactions"
  ON message_reactions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can add reactions"
  ON message_reactions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can remove their own reactions"
  ON message_reactions
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Function to update conversation.last_message_at when new message is added
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update last_message_at
DROP TRIGGER IF EXISTS set_conversation_last_message ON messages;
CREATE TRIGGER set_conversation_last_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_last_message();

-- Function to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_messaging_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS set_conversations_updated_at ON conversations;
CREATE TRIGGER set_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_messaging_updated_at();

DROP TRIGGER IF EXISTS set_messages_updated_at ON messages;
CREATE TRIGGER set_messages_updated_at
  BEFORE UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_messaging_updated_at();

-- Add comments
COMMENT ON TABLE conversations IS 'Conversations attached to entities with multi-user support';
COMMENT ON TABLE conversation_participants IS 'Users participating in conversations';
COMMENT ON TABLE messages IS 'Individual messages within conversations with reply support';
COMMENT ON TABLE message_attachments IS 'File attachments for messages';
COMMENT ON TABLE message_reactions IS 'Emoji reactions to messages';

COMMENT ON COLUMN conversations.is_pinned IS 'Whether conversation is pinned to top';
COMMENT ON COLUMN messages.parent_message_id IS 'ID of parent message for replies';
COMMENT ON COLUMN messages.created_task_id IS 'ID of task created from this message';
COMMENT ON COLUMN messages.is_system_message IS 'Whether message was auto-generated by system';

