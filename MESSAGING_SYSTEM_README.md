# Messaging System

## Overview

The Messaging System provides conversation and comment functionality for all entities in the 1031 Exchange CRM. Users can create conversations, send messages, reply to messages, attach files, create tasks from messages, and pin important conversations.

## Database Schema

### Tables

#### 1. `conversations`
Main conversation container linked to entities.

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGSERIAL | Primary key |
| `entity_type` | TEXT | Type of entity (profile, tax_account, transaction, etc.) |
| `entity_id` | BIGINT | ID of the entity |
| `title` | TEXT | Optional conversation title |
| `is_pinned` | BOOLEAN | Whether conversation is pinned to top |
| `last_message_at` | TIMESTAMPTZ | Timestamp of last message |
| `created_at` | TIMESTAMPTZ | Created timestamp |
| `updated_at` | TIMESTAMPTZ | Last updated |
| `created_by` | UUID | User who created conversation |

#### 2. `conversation_participants`
Users participating in conversations (for multi-user discussions).

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGSERIAL | Primary key |
| `conversation_id` | BIGINT | FK to conversations |
| `user_id` | UUID | FK to auth.users |
| `joined_at` | TIMESTAMPTZ | When user joined |
| `last_read_at` | TIMESTAMPTZ | Last read timestamp (for unread badges) |
| `is_admin` | BOOLEAN | Whether user is admin of conversation |

#### 3. `messages`
Individual messages within conversations.

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGSERIAL | Primary key |
| `conversation_id` | BIGINT | FK to conversations |
| `content` | TEXT | Message content |
| `parent_message_id` | BIGINT | FK to messages (for replies) |
| `created_task_id` | BIGINT | FK to tasks (if task created from message) |
| `is_system_message` | BOOLEAN | Whether message is system-generated |
| `metadata` | JSONB | Additional metadata |
| `created_at` | TIMESTAMPTZ | Created timestamp |
| `updated_at` | TIMESTAMPTZ | Last updated |
| `created_by` | UUID | Message author |
| `edited_at` | TIMESTAMPTZ | Last edit timestamp |
| `is_deleted` | BOOLEAN | Soft delete flag |

#### 4. `message_attachments`
File attachments for messages.

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGSERIAL | Primary key |
| `message_id` | BIGINT | FK to messages |
| `file_name` | TEXT | Original file name |
| `file_size` | BIGINT | File size in bytes |
| `file_type` | TEXT | MIME type |
| `storage_path` | TEXT | Path in Supabase storage |
| `created_at` | TIMESTAMPTZ | Upload timestamp |
| `uploaded_by` | UUID | User who uploaded |

#### 5. `message_reactions`
Emoji reactions to messages (optional feature).

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGSERIAL | Primary key |
| `message_id` | BIGINT | FK to messages |
| `user_id` | UUID | User who reacted |
| `reaction` | TEXT | Emoji reaction |
| `created_at` | TIMESTAMPTZ | Created timestamp |

## Features

### 1. **Conversations**
- Create unlimited conversations per entity
- Optional titles for conversations
- Pin important conversations to top
- Auto-sort by last message timestamp
- Multi-user support with participants

### 2. **Messages**
- Send text messages
- Reply to specific messages (threading)
- Edit your own messages
- Soft delete messages
- System messages for automated notifications
- Real-time-like updates

### 3. **File Attachments**
- Attach multiple files to messages
- Stored in Supabase storage (`document-files` bucket)
- Display file name and size
- Download attachments

### 4. **Task Creation**
- Create task directly from any message
- Task is linked to message
- Message shows task creation badge
- One task per message

### 5. **Reactions** (Optional)
- Add emoji reactions to messages
- See who reacted
- Multiple reactions per message

## UI Features

### Layout

The messaging component uses a 3-column layout:

```
┌─────────────────┬──────────────────────────────────────┐
│ Conversations   │   Selected Conversation              │
│                 │   ┌────────────────────────────────┐ │
│ 📌 Conv #1      │   │ Messages                       │ │
│    Conv #2      │   │ [Message bubbles]              │ │
│    Conv #3      │   │                                │ │
│                 │   │                                │ │
│ + New           │   └────────────────────────────────┘ │
│                 │   [Reply to...] [×]                  │
│                 │   📎 file.pdf [×]                    │
│                 │   [📎] [Message input...] [Send]     │
└─────────────────┴──────────────────────────────────────┘
```

### Message Features

**Own messages (right-aligned, blue):**
- Blue background
- Right-aligned
- Actions: Create Task

**Other users' messages (left-aligned, gray):**
- Gray background
- Left-aligned  
- Actions: Reply, Create Task

**All messages show:**
- Timestamp
- Attachments (if any)
- Reply indicator (if reply)
- Task badge (if task created)
- Reactions (if any)

### Keyboard Shortcuts

- `Enter` - Send message
- `Shift + Enter` - New line in message

## Usage

### In any entity page (Transaction, Exchange, Profile, etc.):

```tsx
import { MessagingSystem } from "@/components/MessagingSystem";

<MessagingSystem
  entityType="transaction"
  entityId={transactionId}
  entityName="TXN-001"  // Optional, for display
/>
```

### Positioning

The MessagingSystem should be placed:
- **After** Document Repository
- **Before** Tasks
- Same pattern across all entity pages

## Database Migration

Run migration `023_create_messaging_system.sql` to create all tables, indexes, and RLS policies.

```bash
# In Supabase Dashboard SQL Editor
# Copy and run the migration file
```

## Storage Setup

The messaging system uses the `document-files` bucket for attachments. Ensure the bucket exists and has appropriate policies.

## Permissions (RLS)

### Conversations
- **View**: Participants and creator
- **Create**: Any authenticated user
- **Update**: Creator and conversation admins
- **Delete**: Creator only

### Messages
- **View**: Conversation participants
- **Create**: Conversation participants
- **Update**: Message author only
- **Delete**: Message author only (soft delete)

### Attachments
- **View**: Conversation participants
- **Create**: Any authenticated user
- **Delete**: Uploader only

## API Examples

### Create Conversation

```typescript
const { data, error } = await supabase
  .from('conversations')
  .insert({
    entity_type: 'transaction',
    entity_id: 123,
    title: 'Discussion about closing',
    created_by: userId
  })
  .select()
  .single();
```

### Add Participant

```typescript
await supabase.from('conversation_participants').insert({
  conversation_id: conversationId,
  user_id: userId,
  is_admin: false
});
```

### Send Message

```typescript
const { data, error } = await supabase
  .from('messages')
  .insert({
    conversation_id: conversationId,
    content: 'Hello world!',
    parent_message_id: null, // or messageId for reply
    created_by: userId
  })
  .select()
  .single();
```

### Reply to Message

```typescript
const { data, error } = await supabase
  .from('messages')
  .insert({
    conversation_id: conversationId,
    content: 'This is a reply',
    parent_message_id: originalMessageId, // Link to parent
    created_by: userId
  });
```

### Create Task from Message

```typescript
// 1. Create task
const { data: task } = await supabase
  .from('tasks')
  .insert({
    title: messageContent,
    entity_type: 'transaction',
    entity_id: entityId,
    status: 'pending',
    created_by: userId
  })
  .select()
  .single();

// 2. Link task to message
await supabase
  .from('messages')
  .update({ created_task_id: task.id })
  .eq('id', messageId);
```

### Pin Conversation

```typescript
await supabase
  .from('conversations')
  .update({ is_pinned: true })
  .eq('id', conversationId);
```

## Future Enhancements

Possible additions:
- Typing indicators
- Read receipts
- Message search
- @mentions
- Rich text formatting
- Message templates
- Bulk actions
- Export conversations
- Email notifications for new messages
- Mobile push notifications
- Message archiving
- Conversation templates

