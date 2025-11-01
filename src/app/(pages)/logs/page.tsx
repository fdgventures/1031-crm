'use client';

import { useState, useEffect, useMemo } from 'react';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import type { AuditLogView, AuditLogGroupedByDay, AuditLogEntityType } from '@/types/audit-log.types';
import Link from 'next/link';

export default function LogsPage() {
  const [logs, setLogs] = useState<AuditLogView[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | AuditLogEntityType>('all');

  const supabase = useMemo(
    () => (isSupabaseConfigured ? getSupabaseClient() : null),
    []
  );

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    loadLogs();
  }, [filter, supabase]);

  async function loadLogs() {
    if (!supabase) return;
    
    try {
      setLoading(true);
      
      let query = supabase
        .from('audit_logs_view')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500); // Limit to last 500 logs

      if (filter !== 'all') {
        query = query.eq('entity_type', filter);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      setLogs(data || []);
    } catch (error) {
      console.error('Error loading logs:', error);
    } finally {
      setLoading(false);
    }
  }

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

  function getEntityUrl(entityType: string, entityId: number): string {
    const typeMap: Record<string, string> = {
      profile: 'profiles',
      tax_account: 'tax-accounts',
      transaction: 'transactions',
      exchange: 'exchanges',
      eat: 'eat',
      property: 'properties',
      business_card: 'business-cards',
      task: null,
    };
    const path = typeMap[entityType];
    return path ? `/${path}/${entityId}` : '#';
  }

  function getEntityTypeName(entityType: string): string {
    const typeNames: Record<string, string> = {
      profile: 'Profile',
      tax_account: 'Tax Account',
      transaction: 'Transaction',
      exchange: 'Exchange',
      eat: 'EAT',
      property: 'Property',
      business_card: 'Business Card',
      task: 'Task',
    };
    return typeNames[entityType] || entityType;
  }

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
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading activity logs...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="rounded-xl bg-white p-6 shadow-sm">
          <h1 className="text-3xl font-bold text-gray-900">Activity Logs</h1>
          <p className="mt-2 text-sm text-gray-600">
            Complete audit trail of all changes across the CRM system
          </p>

          {/* Filters */}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('profile')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filter === 'profile'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Profiles
            </button>
            <button
              onClick={() => setFilter('tax_account')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filter === 'tax_account'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Tax Accounts
            </button>
            <button
              onClick={() => setFilter('transaction')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filter === 'transaction'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Transactions
            </button>
            <button
              onClick={() => setFilter('exchange')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filter === 'exchange'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Exchanges
            </button>
            <button
              onClick={() => setFilter('property')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filter === 'property'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Properties
            </button>
            <button
              onClick={() => setFilter('task')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filter === 'task'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Tasks
            </button>
          </div>
        </header>

        {logs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">No Activity</h2>
            <p className="mt-2 text-sm text-gray-600">
              {filter === 'all'
                ? 'No activity has been recorded yet.'
                : `No ${getEntityTypeName(filter).toLowerCase()} activity found.`}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {groupedLogs.map((group) => (
              <div key={group.date} className="rounded-xl bg-white p-6 shadow-sm">
                <div className="mb-6 flex items-center">
                  <div className="h-px flex-1 bg-gray-200"></div>
                  <h3 className="px-4 text-sm font-semibold text-gray-700">
                    {group.date}
                  </h3>
                  <div className="h-px flex-1 bg-gray-200"></div>
                </div>

                <div className="space-y-4">
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
                            <Link
                              href={getEntityUrl(log.entity_type, log.entity_id)}
                              className="rounded bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-700 hover:bg-gray-300"
                            >
                              {getEntityTypeName(log.entity_type)} #{log.entity_id}
                            </Link>
                            <span className="text-xs text-gray-500">
                              {formatTime(log.created_at)}
                            </span>
                          </div>

                          {log.action_type === 'create' && (
                            <p className="mt-2 text-sm text-gray-700">
                              <span className="font-medium">{log.changed_by_name || 'System'}</span>
                              {' '}created this {getEntityTypeName(log.entity_type).toLowerCase()}
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
                                  <p className="mt-1 text-gray-700 break-words">
                                    {log.old_value || <span className="italic text-gray-400">empty</span>}
                                  </p>
                                </div>
                                <div className="rounded border border-gray-200 bg-white p-2">
                                  <p className="text-xs font-medium text-gray-500">To:</p>
                                  <p className="mt-1 text-gray-700 break-words">
                                    {log.new_value || <span className="italic text-gray-400">empty</span>}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          {log.action_type === 'delete' && (
                            <p className="mt-2 text-sm text-gray-700">
                              <span className="font-medium">{log.changed_by_name || 'System'}</span>
                              {' '}deleted this {getEntityTypeName(log.entity_type).toLowerCase()}
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
    </div>
  );
}
