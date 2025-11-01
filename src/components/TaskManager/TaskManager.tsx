'use client';

import { useState, useEffect, useMemo } from 'react';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import type { 
  Task, 
  TaskWithDetails, 
  TaskEntityType, 
  CreateTaskInput,
  TaskNote,
  TaskAttachment 
} from '@/types/task.types';

interface TaskManagerProps {
  entityType: TaskEntityType;
  entityId: number;
  entityName?: string;
  onLogCreate?: () => void; // Callback to trigger log refresh
}

export default function TaskManager({ entityType, entityId, entityName, onLogCreate }: TaskManagerProps) {
  const [tasks, setTasks] = useState<TaskWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTask, setEditingTask] = useState<number | null>(null);
  const [expandedTask, setExpandedTask] = useState<number | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  // Form for creating/editing task
  const [formData, setFormData] = useState({
    title: '',
    due_date: '',
    assignee_ids: [] as string[],
  });

  // Notes and files
  const [newNote, setNewNote] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);

  const supabase = useMemo(
    () => (isSupabaseConfigured ? getSupabaseClient() : null),
    []
  );

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return;
    }

    const checkUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        console.log('Auth check - User:', user?.id);

        if (user) {
          console.log('User found:', user.id);
          setIsAuthenticated(true);
          
          const { data: userProfile, error: profileError } = await supabase
            .from('user_profiles')
            .select('role_type')
            .eq('id', user.id)
            .single();

          console.log('User profile:', userProfile, 'Error:', profileError);

          const adminRoles = ['workspace_owner', 'platform_super_admin', 'admin'];
          const isUserAdmin = adminRoles.includes(userProfile?.role_type || '');
          console.log('Is admin:', isUserAdmin, 'Role:', userProfile?.role_type);
          
          setIsAdmin(isUserAdmin);
        } else {
          console.log('No user found');
          setIsAuthenticated(false);
          setIsAdmin(false);
        }
      } catch (err) {
        console.error('Error checking auth:', err);
        setIsAuthenticated(false);
        setIsAdmin(false);
      } finally {
        setAuthLoading(false);
      }
    };

    checkUser();
    loadTasks();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log('Auth state change:', _event, session?.user?.id);
      
      if (session?.user) {
        setIsAuthenticated(true);
        
        const { data: userProfile } = await supabase
          .from('user_profiles')
          .select('role_type')
          .eq('id', session.user.id)
          .single();

        const adminRoles = ['workspace_owner', 'platform_super_admin', 'admin'];
        setIsAdmin(adminRoles.includes(userProfile?.role_type || ''));
      } else {
        setIsAuthenticated(false);
        setIsAdmin(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [entityType, entityId, supabase]);

  async function loadTasks() {
    if (!supabase) return;
    
    try {
      setLoading(true);
      
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          *,
          assignments:task_assignments(*),
          attachments:task_attachments(*),
          notes:task_notes(*)
        `)
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('due_date', { ascending: true });

      if (tasksError) throw tasksError;
      
      setTasks(tasksData || []);
    } catch (error) {
      console.error('Error loading tasks:', error);
      alert('Error loading tasks');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateTask(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        console.error('Auth error:', authError);
        alert('Authentication error. Please sign in again.');
        return;
      }
      
      if (!user) {
        alert('You must be signed in to create tasks. Please sign in.');
        return;
      }

      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .insert({
          title: formData.title,
          entity_type: entityType,
          entity_id: entityId,
          due_date: formData.due_date || null,
          created_by: user.id,
          status: 'pending',
        })
        .select()
        .single();

      if (taskError) throw taskError;

      // Add assignments
      if (formData.assignee_ids.length > 0 && task) {
        const assignments = formData.assignee_ids.map(assigneeId => ({
          task_id: task.id,
          assignee_type: 'admin' as const,
          assignee_id: assigneeId,
        }));

        const { error: assignError } = await supabase
          .from('task_assignments')
          .insert(assignments);

        if (assignError) throw assignError;
      }

      setFormData({ title: '', due_date: '', assignee_ids: [] });
      setShowCreateForm(false);
      await loadTasks();
      
      // Create audit log for task creation
      if (task && user) {
        const { error: auditError } = await supabase.from('audit_logs').insert({
          entity_type: entityType,
          entity_id: entityId,
          action_type: 'update',
          field_name: 'task_created',
          old_value: null,
          new_value: formData.title,
          changed_by: user.id,
          metadata: { task_id: task.id },
        });

        if (!auditError && onLogCreate) {
          onLogCreate();
        }
      }

      alert('Task created successfully');
    } catch (error) {
      console.error('Error creating task:', error);
      alert(`Error creating task: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async function handleToggleStatus(taskId: number, currentStatus: string) {
    if (!supabase) return;
    
    try {
      const newStatus = currentStatus === 'pending' ? 'completed' : 'pending';
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', taskId);

      if (error) throw error;
      
      await loadTasks();

      // Create audit log
      if (user) {
        const { error: auditError } = await supabase.from('audit_logs').insert({
          entity_type: entityType,
          entity_id: entityId,
          action_type: 'update',
          field_name: 'task_status',
          old_value: currentStatus,
          new_value: newStatus,
          changed_by: user.id,
          metadata: { task_id: taskId },
        });

        if (!auditError && onLogCreate) {
          onLogCreate();
        }
      }
    } catch (error) {
      console.error('Error updating task status:', error);
      alert('Error updating status');
    }
  }

  async function handleDeleteTask(taskId: number) {
    if (!confirm('Are you sure you want to delete this task?')) return;
    if (!supabase) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Get task title before deleting
      const task = tasks.find(t => t.id === taskId);
      
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;
      
      await loadTasks();

      // Create audit log
      if (user && task) {
        const { error: auditError } = await supabase.from('audit_logs').insert({
          entity_type: entityType,
          entity_id: entityId,
          action_type: 'update',
          field_name: 'task_deleted',
          old_value: task.title,
          new_value: null,
          changed_by: user.id,
          metadata: { task_id: taskId },
        });

        if (!auditError && onLogCreate) {
          onLogCreate();
        }
      }

      alert('Task deleted');
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Error deleting task');
    }
  }

  async function handleUpdateTask(taskId: number) {
    if (!supabase) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const task = tasks.find(t => t.id === taskId);
      
      const { error } = await supabase
        .from('tasks')
        .update({
          title: formData.title,
          due_date: formData.due_date || null,
        })
        .eq('id', taskId);

      if (error) throw error;
      
      // Create audit logs for changed fields
      const auditLogs = [];
      
      if (task && user) {
        if (task.title !== formData.title) {
          auditLogs.push({
            entity_type: entityType,
            entity_id: entityId,
            action_type: 'update',
            field_name: 'task_title',
            old_value: task.title,
            new_value: formData.title,
            changed_by: user.id,
            metadata: { task_id: taskId },
          });
        }
        
        const oldDueDate = task.due_date ? new Date(task.due_date).toLocaleDateString() : null;
        const newDueDate = formData.due_date ? new Date(formData.due_date).toLocaleDateString() : null;
        
        if (oldDueDate !== newDueDate) {
          auditLogs.push({
            entity_type: entityType,
            entity_id: entityId,
            action_type: 'update',
            field_name: 'task_due_date',
            old_value: oldDueDate,
            new_value: newDueDate,
            changed_by: user.id,
            metadata: { task_id: taskId },
          });
        }
      }

      if (auditLogs.length > 0) {
        const { error: auditError } = await supabase.from('audit_logs').insert(auditLogs);
        
        if (!auditError && onLogCreate) {
          onLogCreate();
        }
      }
      
      setEditingTask(null);
      setFormData({ title: '', due_date: '', assignee_ids: [] });
      await loadTasks();
      alert('Task updated');
    } catch (error) {
      console.error('Error updating task:', error);
      alert('Error updating task');
    }
  }

  async function handleAddNote(taskId: number) {
    if (!newNote.trim()) return;
    if (!supabase) return;

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        alert('You must be signed in to add notes. Please sign in.');
        return;
      }

      const { error } = await supabase
        .from('task_notes')
        .insert({
          task_id: taskId,
          note_text: newNote,
          created_by: user.id,
        });

      if (error) throw error;
      
      setNewNote('');
      await loadTasks();
    } catch (error) {
      console.error('Error adding note:', error);
      alert(`Error adding note: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async function handleFileUpload(taskId: number, file: File) {
    if (!supabase) return;
    
    try {
      setUploadingFile(true);
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        alert('You must be signed in to upload files. Please sign in.');
        return;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${taskId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('task-attachments')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('task_attachments')
        .insert({
          task_id: taskId,
          file_path: filePath,
          file_name: file.name,
          file_size: file.size,
          file_type: file.type,
          uploaded_by: user.id,
        });

      if (dbError) throw dbError;
      
      await loadTasks();
      alert('File uploaded');
    } catch (error) {
      console.error('Error uploading file:', error);
      alert(`Error uploading file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setUploadingFile(false);
    }
  }

  async function handleDeleteAttachment(attachmentId: number, filePath: string) {
    if (!confirm('Delete file?')) return;
    if (!supabase) return;

    try {
      const { error: storageError } = await supabase.storage
        .from('task-attachments')
        .remove([filePath]);

      if (storageError) console.error('Storage error:', storageError);

      const { error: dbError } = await supabase
        .from('task_attachments')
        .delete()
        .eq('id', attachmentId);

      if (dbError) throw dbError;
      
      await loadTasks();
    } catch (error) {
      console.error('Error deleting attachment:', error);
      alert('Error deleting file');
    }
  }

  const startEdit = (task: TaskWithDetails) => {
    setEditingTask(task.id);
    setFormData({
      title: task.title,
      due_date: task.due_date ? task.due_date.split('T')[0] : '',
      assignee_ids: [],
    });
  };

  if (loading || authLoading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="text-center text-gray-500">
          {authLoading ? 'Checking permissions...' : 'Loading tasks...'}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">
          Tasks {entityName && `- ${entityName}`}
        </h2>
        {isAdmin && (
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            {showCreateForm ? 'Cancel' : '+ New Task'}
          </button>
        )}
      </div>

      {!isAuthenticated && (
        <div className="mb-4 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <p className="text-sm text-yellow-800">
            Please sign in to view and manage tasks.
          </p>
        </div>
      )}

      {isAuthenticated && !isAdmin && tasks.length > 0 && (
        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm text-blue-800">
            You can view tasks, but only admins can create, edit, or delete them.
          </p>
        </div>
      )}

      {showCreateForm && (
        <form onSubmit={handleCreateTask} className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Task Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Due Date
              </label>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Create Task
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  setFormData({ title: '', due_date: '', assignee_ids: [] });
                }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      {tasks.length === 0 ? (
        <div className="py-8 text-center text-gray-500">
          No tasks for this entity
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <div key={task.id} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={task.status === 'completed'}
                  onChange={() => handleToggleStatus(task.id, task.status)}
                  className="mt-1 h-5 w-5 cursor-pointer rounded border-gray-300"
                />

                <div className="flex-1">
                  {editingTask === task.id ? (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2"
                      />
                      <input
                        type="date"
                        value={formData.due_date}
                        onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdateTask(task.id)}
                          className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingTask(null);
                            setFormData({ title: '', due_date: '', assignee_ids: [] });
                          }}
                          className="rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className={`font-medium ${task.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                            {task.title}
                          </h3>
                          <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
                            <span className={`rounded-full px-2 py-0.5 ${
                              task.status === 'completed' 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {task.status === 'completed' ? 'Completed' : 'Pending'}
                            </span>
                            {task.due_date && (
                              <span>
                                Due: {new Date(task.due_date).toLocaleDateString('en-US')}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => setExpandedTask(expandedTask === task.id ? null : task.id)}
                            className="text-sm text-blue-600 hover:text-blue-700"
                          >
                            {expandedTask === task.id ? 'Collapse' : 'Expand'}
                          </button>
                          {isAdmin && (
                            <>
                              <button
                                onClick={() => startEdit(task)}
                                className="text-sm text-blue-600 hover:text-blue-700"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteTask(task.id)}
                                className="text-sm text-red-600 hover:text-red-700"
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {expandedTask === task.id && (
                        <div className="mt-4 space-y-4 border-t border-gray-200 pt-4">
                          {/* Notes */}
                          <div>
                            <h4 className="mb-2 font-medium text-gray-900">Notes</h4>
                            <div className="space-y-2">
                              {task.notes && task.notes.length > 0 ? (
                                task.notes.map((note: TaskNote) => (
                                  <div key={note.id} className="rounded bg-white p-2 text-sm">
                                    <p className="text-gray-700">{note.note_text}</p>
                                    <p className="mt-1 text-xs text-gray-500">
                                      {new Date(note.created_at).toLocaleString('en-US')}
                                    </p>
                                  </div>
                                ))
                              ) : (
                                <p className="text-sm text-gray-500">No notes</p>
                              )}
                            </div>
                            {isAdmin && (
                              <div className="mt-2 flex gap-2">
                                <input
                                  type="text"
                                  value={newNote}
                                  onChange={(e) => setNewNote(e.target.value)}
                                  placeholder="Add a note..."
                                  className="flex-1 rounded border border-gray-300 px-3 py-1 text-sm"
                                />
                                <button
                                  onClick={() => handleAddNote(task.id)}
                                  className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
                                >
                                  Add
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Files */}
                          <div>
                            <h4 className="mb-2 font-medium text-gray-900">Files</h4>
                            <div className="space-y-2">
                              {task.attachments && task.attachments.length > 0 ? (
                                task.attachments.map((att: TaskAttachment) => (
                                  <div key={att.id} className="flex items-center justify-between rounded bg-white p-2 text-sm">
                                    <span className="text-gray-700">{att.file_name}</span>
                                    {isAdmin && (
                                      <button
                                        onClick={() => handleDeleteAttachment(att.id, att.file_path)}
                                        className="text-xs text-red-600 hover:text-red-700"
                                      >
                                        Delete
                                      </button>
                                    )}
                                  </div>
                                ))
                              ) : (
                                <p className="text-sm text-gray-500">No files</p>
                              )}
                            </div>
                            {isAdmin && (
                              <div className="mt-2">
                                <input
                                  type="file"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleFileUpload(task.id, file);
                                  }}
                                  disabled={uploadingFile}
                                  className="text-sm"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

