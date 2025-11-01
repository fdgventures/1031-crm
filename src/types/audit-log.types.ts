export type AuditLogEntityType = 'profile' | 'tax_account' | 'transaction' | 'exchange' | 'eat' | 'property' | 'business_card' | 'task';

export type AuditLogActionType = 'create' | 'update' | 'delete';

export interface AuditLog {
  id: number;
  entity_type: AuditLogEntityType;
  entity_id: number;
  action_type: AuditLogActionType;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  changed_by: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface AuditLogView extends AuditLog {
  field_display_name: string | null;
  changed_by_role: string | null;
  changed_by_name: string | null;
}

export interface AuditLogGroupedByDay {
  date: string;
  logs: AuditLogView[];
}

export interface CreateAuditLogInput {
  entity_type: AuditLogEntityType;
  entity_id: number;
  action_type: AuditLogActionType;
  field_name?: string;
  old_value?: string;
  new_value?: string;
  metadata?: Record<string, unknown>;
}

