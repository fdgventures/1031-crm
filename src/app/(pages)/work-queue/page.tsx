'use client';

import { useState, useEffect, useMemo } from 'react';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import type { TaskWithDetails } from '@/types/task.types';
import Link from 'next/link';

export default function WorkQueuePage() {
  const [tasks, setTasks] = useState<TaskWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('pending');

  const supabase = useMemo(
    () => (isSupabaseConfigured ? getSupabaseClient() : null),
    []
  );

  useEffect(() => {
    if (!supabase) return;
    loadTasks();
  }, [filter, supabase]);

  async function loadTasks() {
    if (!supabase) return;
    
    try {
      setLoading(true);
      
      let query = supabase
        .from('tasks')
        .select(`
          *,
          assignments:task_assignments(*),
          attachments:task_attachments(*),
          notes:task_notes(*)
        `)
        .order('due_date', { ascending: true, nullsFirst: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      setTasks(data || []);
    } catch (error) {
      console.error('Error loading tasks:', error);
      alert('Error loading tasks');
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleStatus(taskId: number, currentStatus: string) {
    if (!supabase) return;
    
    try {
      const newStatus = currentStatus === 'pending' ? 'completed' : 'pending';
      
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', taskId);

      if (error) throw error;
      
      await loadTasks();
    } catch (error) {
      console.error('Error updating task status:', error);
      alert('Error updating status');
    }
  }

  function getEntityUrl(entityType: string, entityId: number): string {
    const typeMap: Record<string, string> = {
      profile: 'profiles',
      tax_account: 'tax-accounts',
      transaction: 'transactions',
      exchange: 'exchanges',
      eat: 'eat',
      property: 'properties',
    };
    return `/${typeMap[entityType] || entityType}/${entityId}`;
  }

  function getEntityTypeName(entityType: string): string {
    const typeNames: Record<string, string> = {
      profile: 'Profiles',
      tax_account: 'Tax Accounts',
      transaction: 'Transactions',
      exchange: 'Exchanges',
      eat: 'EAT',
      property: 'Properties',
    };
    return typeNames[entityType] || entityType;
  }

  function formatDueDate(dueDate: string | null): { text: string; color: string } {
    if (!dueDate) return { text: 'No due date', color: 'text-gray-500' };

    const now = new Date();
    const due = new Date(dueDate);
    const diffMs = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { text: `Overdue (${Math.abs(diffDays)}d)`, color: 'text-red-600' };
    } else if (diffDays === 0) {
      return { text: 'Today', color: 'text-orange-600' };
    } else if (diffDays === 1) {
      return { text: 'Tomorrow', color: 'text-yellow-600' };
    } else if (diffDays <= 7) {
      return { text: `In ${diffDays}d`, color: 'text-blue-600' };
    } else {
      return { text: due.toLocaleDateString('en-US'), color: 'text-gray-600' };
    }
  }

  // Group tasks by entity type
  const tasksByType = tasks.reduce((acc, task) => {
    if (!acc[task.entity_type]) {
      acc[task.entity_type] = [];
    }
    acc[task.entity_type].push(task);
    return acc;
  }, {} as Record<string, TaskWithDetails[]>);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading tasks...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="rounded-xl bg-white p-6 shadow-sm">
          <h1 className="text-3xl font-bold text-gray-900">Work Queue</h1>
          <p className="mt-2 text-sm text-gray-600">
            A consolidated list of tasks across all CRM entities. Use this queue to manage team tasks and deadlines.
          </p>

          {/* Filters */}
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All ({tasks.length})
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filter === 'pending'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filter === 'completed'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Completed
            </button>
          </div>
        </header>

        {tasks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">No Tasks</h2>
            <p className="mt-2 text-sm text-gray-600">
              {filter === 'pending'
                ? 'All tasks are completed! 🎉'
                : filter === 'completed'
                ? 'No completed tasks yet.'
                : 'Create your first task on an entity page.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {Object.entries(tasksByType).map(([entityType, typeTasks]) => (
              <section
                key={entityType}
                className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
              >
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {getEntityTypeName(entityType)}
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    {typeTasks.length} {typeTasks.length === 1 ? 'task' : 'tasks'}
                  </p>
                </div>

                <ul className="space-y-3">
                  {typeTasks.map((task) => {
                    const dueInfo = formatDueDate(task.due_date);
                    return (
                      <li
                        key={task.id}
                        className="rounded-lg border border-gray-100 bg-gray-50 p-4"
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={task.status === 'completed'}
                            onChange={() => handleToggleStatus(task.id, task.status)}
                            className="mt-1 h-5 w-5 cursor-pointer rounded border-gray-300"
                          />
                          
                          <div className="flex-1">
                            <Link
                              href={getEntityUrl(task.entity_type, task.entity_id)}
                              className="block"
                            >
                              <p
                                className={`text-sm font-medium hover:text-blue-600 ${
                                  task.status === 'completed'
                                    ? 'text-gray-400 line-through'
                                    : 'text-gray-900'
                                }`}
                              >
                                {task.title}
                              </p>
                            </Link>
                            
                            <div className="mt-1 flex items-center gap-2 text-xs">
                              <span className={dueInfo.color}>{dueInfo.text}</span>
                              {task.notes && task.notes.length > 0 && (
                                <>
                                  <span className="text-gray-300">•</span>
                                  <span className="text-gray-500">
                                    {task.notes.length} {task.notes.length === 1 ? 'note' : 'notes'}
                                  </span>
                                </>
                              )}
                              {task.attachments && task.attachments.length > 0 && (
                                <>
                                  <span className="text-gray-300">•</span>
                                  <span className="text-gray-500">
                                    {task.attachments.length} {task.attachments.length === 1 ? 'file' : 'files'}
                                  </span>
                                </>
                              )}
                            </div>
                            
                            <Link
                              href={getEntityUrl(task.entity_type, task.entity_id)}
                              className="mt-2 inline-block text-xs text-blue-600 hover:text-blue-800"
                            >
                              Go to entity →
                            </Link>
                          </div>

                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              task.status === 'completed'
                                ? 'bg-green-50 text-green-700'
                                : 'bg-yellow-50 text-yellow-700'
                            }`}
                          >
                            {task.status === 'completed' ? '✓' : '○'}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
