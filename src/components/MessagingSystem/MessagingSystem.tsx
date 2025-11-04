"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import { Button } from "@/components/ui";
import { Conversation, Message, EntityType } from "@/types/messaging.types";

interface MessagingSystemProps {
  entityType: EntityType;
  entityId: number;
  entityName?: string;
}

export default function MessagingSystem({
  entityType,
  entityId,
  entityName,
}: MessagingSystemProps) {
  const supabase = getSupabaseClient();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [newConversationTitle, setNewConversationTitle] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Load current user
  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    loadUser();
  }, [supabase]);

  const loadConversations = useCallback(async () => {
    try {
      setLoading(true);
      console.log('Loading conversations for:', entityType, entityId);
      
      const { data, error } = await supabase
        .from("conversations")
        .select(`
          *,
          participants:conversation_participants(
            id,
            user_id,
            is_admin
          )
        `)
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .order("is_pinned", { ascending: false })
        .order("last_message_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Supabase error details:", error);
        throw error;
      }
      
      console.log('Loaded conversations:', data);
      setConversations((data || []) as Conversation[]);
    } catch (err) {
      console.error("Failed to load conversations:", err);
      // Don't fail silently - show empty state
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId, supabase]);

  const loadMessages = useCallback(async (conversationId: number) => {
    try {
      const { data, error } = await supabase
        .from("messages")
        .select(`
          *,
          attachments:message_attachments(*),
          created_task:tasks(id, title, status),
          reactions:message_reactions(*)
        `)
        .eq("conversation_id", conversationId)
        .eq("is_deleted", false)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages((data || []) as Message[]);
      
      // Scroll to bottom
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (err) {
      console.error("Failed to load messages:", err);
    }
  }, [supabase]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id);
    }
  }, [selectedConversation, loadMessages]);

  const createConversation = async () => {
    if (!currentUserId) return;

    try {
      const { data, error } = await supabase
        .from("conversations")
        .insert({
          entity_type: entityType,
          entity_id: entityId,
          title: newConversationTitle || null,
          created_by: currentUserId,
        })
        .select()
        .single();

      if (error) throw error;

      // Add creator as participant
      await supabase.from("conversation_participants").insert({
        conversation_id: data.id,
        user_id: currentUserId,
        is_admin: true,
      });

      setNewConversationTitle("");
      setShowNewConversation(false);
      await loadConversations();
      setSelectedConversation(data as Conversation);
    } catch (err) {
      console.error("Failed to create conversation:", err);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !currentUserId) return;

    try {
      setSending(true);

      // Create message
      const { data: message, error } = await supabase
        .from("messages")
        .insert({
          conversation_id: selectedConversation.id,
          content: newMessage.trim(),
          parent_message_id: replyToMessage?.id || null,
          created_by: currentUserId,
        })
        .select()
        .single();

      if (error) throw error;

      // Upload attachments if any
      if (attachments.length > 0 && message) {
        for (const file of attachments) {
          const fileName = `${Date.now()}_${file.name}`;
          const filePath = `messages/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from("document-files")
            .upload(filePath, file);

          if (!uploadError) {
            await supabase.from("message_attachments").insert({
              message_id: message.id,
              file_name: file.name,
              file_size: file.size,
              file_type: file.type,
              storage_path: filePath,
              uploaded_by: currentUserId,
            });
          }
        }
      }

      setNewMessage("");
      setReplyToMessage(null);
      setAttachments([]);
      await loadMessages(selectedConversation.id);
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setSending(false);
    }
  };

  const togglePin = async (conversationId: number, currentPinned: boolean) => {
    try {
      const { error } = await supabase
        .from("conversations")
        .update({ is_pinned: !currentPinned })
        .eq("id", conversationId);

      if (error) throw error;
      await loadConversations();
    } catch (err) {
      console.error("Failed to toggle pin:", err);
    }
  };

  const createTaskFromMessage = async (message: Message) => {
    if (!currentUserId) return;

    try {
      const { data: task, error: taskError } = await supabase
        .from("tasks")
        .insert({
          title: message.content.substring(0, 100),
          entity_type: entityType,
          entity_id: entityId,
          status: "pending",
          created_by: currentUserId,
        })
        .select()
        .single();

      if (taskError) throw taskError;

      // Link task to message
      await supabase
        .from("messages")
        .update({ created_task_id: task.id })
        .eq("id", message.id);

      await loadMessages(selectedConversation!.id);
    } catch (err) {
      console.error("Failed to create task:", err);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments(files);
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">
          Messages {entityName && `- ${entityName}`}
        </h2>
        <Button
          onClick={() => setShowNewConversation(true)}
          variant="primary"
          size="small"
        >
          + New Conversation
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3">
        {/* Conversations List */}
        <div className="border-r border-gray-200 max-h-[600px] overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <p>No conversations yet</p>
              <Button
                onClick={() => setShowNewConversation(true)}
                variant="outline"
                size="small"
                className="mt-4"
              >
                Start First Conversation
              </Button>
            </div>
          ) : (
            <div>
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv)}
                  className={`p-4 border-b cursor-pointer hover:bg-gray-50 ${
                    selectedConversation?.id === conv.id ? "bg-blue-50" : ""
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {conv.is_pinned && <span className="text-yellow-500">📌</span>}
                        <p className="font-medium text-gray-900 text-sm">
                          {conv.title || `Conversation #${conv.id}`}
                        </p>
                      </div>
                      {conv.last_message_at && (
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(conv.last_message_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePin(conv.id, conv.is_pinned);
                      }}
                      className="text-gray-400 hover:text-yellow-500 text-xs"
                    >
                      {conv.is_pinned ? "Unpin" : "Pin"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Messages Area */}
        <div className="lg:col-span-2 flex flex-col max-h-[600px]">
          {selectedConversation ? (
            <>
              {/* Messages List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.created_by === currentUserId ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg p-3 ${
                        message.created_by === currentUserId
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-900"
                      }`}
                    >
                      {/* Reply indicator */}
                      {message.parent_message_id && (
                        <div className="text-xs opacity-75 mb-1 italic">
                          Replying to message...
                        </div>
                      )}
                      
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      
                      {/* Attachments */}
                      {message.attachments && message.attachments.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {message.attachments.map((att) => (
                            <div key={att.id} className="text-xs opacity-90">
                              📎 {att.file_name}
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Task indicator */}
                      {message.created_task && (
                        <div className="mt-2 text-xs opacity-90">
                          ✓ Created task: {message.created_task.title}
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between mt-2 text-xs opacity-75">
                        <span>{new Date(message.created_at).toLocaleTimeString()}</span>
                        <div className="flex gap-2">
                          {message.created_by !== currentUserId && (
                            <button
                              onClick={() => setReplyToMessage(message)}
                              className="hover:underline"
                            >
                              Reply
                            </button>
                          )}
                          {!message.created_task_id && (
                            <button
                              onClick={() => createTaskFromMessage(message)}
                              className="hover:underline"
                            >
                              Create Task
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="border-t p-4">
                {replyToMessage && (
                  <div className="bg-gray-100 p-2 rounded mb-2 text-sm">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-medium">Replying to:</span>
                        <p className="text-gray-600 mt-1 line-clamp-2">
                          {replyToMessage.content}
                        </p>
                      </div>
                      <button
                        onClick={() => setReplyToMessage(null)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )}

                {attachments.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-2">
                    {attachments.map((file, index) => (
                      <div
                        key={index}
                        className="bg-blue-50 px-2 py-1 rounded text-xs flex items-center gap-1"
                      >
                        📎 {file.name}
                        <button
                          onClick={() => removeAttachment(index)}
                          className="text-red-600 hover:text-red-800 ml-1"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    multiple
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 text-gray-500 hover:text-gray-700"
                    title="Attach files"
                  >
                    📎
                  </button>
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder="Type a message... (Shift+Enter for new line)"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    rows={2}
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={!newMessage.trim() || sending}
                    variant="primary"
                  >
                    {sending ? "Sending..." : "Send"}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full p-8 text-gray-500">
              Select a conversation or create a new one
            </div>
          )}
        </div>
      </div>

      {/* New Conversation Modal */}
      {showNewConversation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">New Conversation</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title (Optional)
                </label>
                <input
                  type="text"
                  value={newConversationTitle}
                  onChange={(e) => setNewConversationTitle(e.target.value)}
                  placeholder="Enter conversation title..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={createConversation} variant="primary" className="flex-1">
                  Create
                </Button>
                <Button
                  onClick={() => {
                    setShowNewConversation(false);
                    setNewConversationTitle("");
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

