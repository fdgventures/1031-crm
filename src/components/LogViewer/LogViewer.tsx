'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import type { AuditLogView, AuditLogGroupedByDay, AuditLogEntityType } from '@/types/audit-log.types';

interface LogViewerProps {
  entityType: AuditLogEntityType;
  entityId: number;
  entityName?: string;
  refreshTrigger?: number; // Add this to trigger refresh from parent
}

export default function LogViewer({ entityType, entityId, entityName, refreshTrigger }: LogViewerProps) {
  const [logs, setLogs] = useState<AuditLogView[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = useMemo(
    () => (isSupabaseConfigured ? getSupabaseClient() : null),
    []
  );

  const loadLogs = useCallback(async () => {
    if (!supabase) return;
    
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('audit_logs_view')
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setLogs(data || []);
    } catch (error) {
      console.error('Error loading logs:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase, entityType, entityId]);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    loadLogs();
  }, [supabase, loadLogs, refreshTrigger]);

  const groupedLogs = useMemo((): AuditLogGroupedByDay[] => {
    const groups: Record<string, AuditLogView[]> = {};

    logs.forEach((log) => {
      const date = new Date(log.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(log);
    });

    return Object.entries(groups).map(([date, logs]) => ({
      date,
      logs: logs.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
    }));
  }, [logs]);

  function getActionIcon(actionType: string): string {
    switch (actionType) {
      case 'create':
        return '✨';
      case 'update':
        return '✏️';
      case 'delete':
        return '🗑️';
      default:
        return '📝';
    }
  }

  function getActionColor(actionType: string): string {
    switch (actionType) {
      case 'create':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'update':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'delete':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  }

  function formatTime(dateString: string): string {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="text-center text-gray-500">Loading activity log...</div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          Activity Log {entityName && `- ${entityName}`}
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          History of all changes made to this record
        </p>
      </div>

      {logs.length === 0 ? (
        <div className="py-8 text-center text-gray-500">
          No activity recorded yet
        </div>
      ) : (
        <div className="space-y-8">
          {groupedLogs.map((group) => (
            <div key={group.date}>
              <div className="mb-4 flex items-center">
                <div className="h-px flex-1 bg-gray-200"></div>
                <h3 className="px-4 text-sm font-medium text-gray-700">
                  {group.date}
                </h3>
                <div className="h-px flex-1 bg-gray-200"></div>
              </div>

              <div className="space-y-3">
                {group.logs.map((log) => (
                  <div
                    key={log.id}
                    className="rounded-lg border border-gray-200 bg-gray-50 p-4"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{getActionIcon(log.action_type)}</span>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${getActionColor(
                              log.action_type
                            )}`}
                          >
                            {log.action_type.toUpperCase()}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatTime(log.created_at)}
                          </span>
                        </div>

                        {log.action_type === 'create' && (
                          <p className="mt-2 text-sm text-gray-700">
                            <span className="font-medium">{log.changed_by_name || 'System'}</span>
                            {' '}created this record
                          </p>
                        )}

                        {log.action_type === 'update' && log.field_name && (
                          <div className="mt-2">
                            <p className="text-sm text-gray-700">
                              <span className="font-medium">{log.changed_by_name || 'System'}</span>
                              {' '}changed{' '}
                              <span className="font-medium">{log.field_display_name || log.field_name}</span>
                            </p>
                            <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                              <div className="rounded border border-gray-200 bg-white p-2">
                                <p className="text-xs font-medium text-gray-500">From:</p>
                                <p className="mt-1 text-gray-700">
                                  {log.old_value || <span className="italic text-gray-400">empty</span>}
                                </p>
                              </div>
                              <div className="rounded border border-gray-200 bg-white p-2">
                                <p className="text-xs font-medium text-gray-500">To:</p>
                                <p className="mt-1 text-gray-700">
                                  {log.new_value || <span className="italic text-gray-400">empty</span>}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {log.action_type === 'delete' && (
                          <p className="mt-2 text-sm text-gray-700">
                            <span className="font-medium">{log.changed_by_name || 'System'}</span>
                            {' '}deleted this record
                          </p>
                        )}

                        {log.changed_by_role && (
                          <p className="mt-2 text-xs text-gray-500">
                            Role: {log.changed_by_role}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

