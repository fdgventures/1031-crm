# Audit Logs System

## Overview

The Audit Logs system provides a complete audit trail of all changes made to entities in the CRM system. It tracks creates, updates, and deletes across all major entities.

## Features

✅ **Comprehensive Logging**
- Tracks all entity changes (create, update, delete)
- Records field-level changes with old and new values
- Captures who made the change and when
- Supports metadata for additional context

✅ **Entity-Specific Logs**
- View logs for individual entities on their detail pages
- See complete history of changes for a specific record

✅ **Global Logs Page**
- View all logs across the entire system at `/logs`
- Filter by entity type (Profiles, Tax Accounts, Transactions, etc.)
- Grouped by date for easy navigation
- Last 500 logs displayed

✅ **User-Friendly Display**
- Visual indicators for action types (✨ create, ✏️ update, 🗑️ delete)
- Before/after comparison for updates
- Formatted field names (e.g., "first_name" → "First Name")
- Time-based grouping

## Database Structure

### Table: `audit_logs`

**Columns:**
- `id` - Unique identifier
- `entity_type` - Type of entity (profile, tax_account, transaction, exchange, eat, property, business_card, task)
- `entity_id` - ID of the entity that changed
- `action_type` - Type of action (create, update, delete)
- `field_name` - Name of the field that changed (for updates)
- `old_value` - Previous value
- `new_value` - New value
- `changed_by` - User who made the change
- `metadata` - Additional JSON metadata (optional)
- `created_at` - When the change occurred

**Indexes:**
- `idx_audit_logs_entity` - Fast lookup by entity
- `idx_audit_logs_created_at` - Fast date-based queries
- `idx_audit_logs_changed_by` - Fast lookup by user
- `idx_audit_logs_action_type` - Fast filtering by action

### View: `audit_logs_view`

Enhanced view that includes:
- User information (name and role)
- Formatted field names
- All original audit_logs data

## TypeScript Types

**Location:** `src/types/audit-log.types.ts`

Key types:
- `AuditLog` - Base audit log record
- `AuditLogView` - Enhanced log with user info
- `AuditLogGroupedByDay` - Logs grouped by date
- `CreateAuditLogInput` - Data for creating a log

## Components

### LogViewer Component

**Location:** `src/components/LogViewer/LogViewer.tsx`

**Props:**
```typescript
interface LogViewerProps {
  entityType: AuditLogEntityType;
  entityId: number;
  entityName?: string;
}
```

**Usage:**
```tsx
<LogViewer
  entityType="profile"
  entityId={123}
  entityName="John Doe"
/>
```

**Features:**
- Displays logs for a specific entity
- Groups logs by date
- Shows before/after values for updates
- Displays user who made the change

### Logs Page

**Location:** `src/app/(pages)/logs/page.tsx`

**Features:**
- Shows all logs from all entities
- Filter by entity type
- Links to entity detail pages
- Displays last 500 logs
- Grouped by date

## Integration

The LogViewer component is integrated on all entity detail pages:
- `/profiles/[id]` - Profile logs
- `/tax-accounts/[id]` - Tax Account logs
- `/transactions/[id]` - Transaction logs
- `/exchanges/[id]` - Exchange logs
- `/eat/[id]` - EAT logs
- `/properties/[id]` - Property logs

## Creating Audit Logs

### Manual Logging

To manually create an audit log entry:

```typescript
import { getSupabaseClient } from '@/lib/supabase';

const supabase = getSupabaseClient();

// For creates
await supabase.from('audit_logs').insert({
  entity_type: 'profile',
  entity_id: profileId,
  action_type: 'create',
  changed_by: userId,
});

// For updates
await supabase.from('audit_logs').insert({
  entity_type: 'profile',
  entity_id: profileId,
  action_type: 'update',
  field_name: 'first_name',
  old_value: 'John',
  new_value: 'Jane',
  changed_by: userId,
});

// For deletes
await supabase.from('audit_logs').insert({
  entity_type: 'profile',
  entity_id: profileId,
  action_type: 'delete',
  changed_by: userId,
});
```

### Automatic Logging with Triggers (Future Enhancement)

You can create PostgreSQL triggers to automatically log changes:

```sql
-- Example trigger for profile updates
CREATE OR REPLACE FUNCTION log_profile_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Log each changed field
    IF OLD.first_name IS DISTINCT FROM NEW.first_name THEN
      INSERT INTO audit_logs (entity_type, entity_id, action_type, field_name, old_value, new_value, changed_by)
      VALUES ('profile', NEW.id, 'update', 'first_name', OLD.first_name, NEW.first_name, auth.uid());
    END IF;
    -- Repeat for other fields...
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profile_audit_trigger
  AFTER UPDATE ON profile
  FOR EACH ROW
  EXECUTE FUNCTION log_profile_changes();
```

## Permissions (RLS)

### View Logs
- All authenticated users can view logs

### Create Logs
- Only admins can manually create logs
- (`workspace_owner`, `platform_super_admin`, `admin`)

### Immutability
- Logs cannot be updated or deleted
- This ensures audit trail integrity

## Best Practices

1. **Log All Significant Changes**
   - Always log creates, updates, and deletes
   - Include the user making the change
   - Log individual field changes for updates

2. **Use Meaningful Field Names**
   - The system auto-formats field names
   - Use snake_case in database (e.g., `first_name`)
   - Will display as "First Name" in UI

3. **Include Context in Metadata**
   - Use the `metadata` JSON field for additional context
   - Store information like IP address, source, etc.

4. **Don't Log Sensitive Data**
   - Be careful with passwords, tokens, etc.
   - Consider hashing or masking sensitive values

5. **Regular Cleanup**
   - Consider archiving old logs (>1 year)
   - Implement data retention policies

## Viewing Logs

### On Entity Pages
Scroll to the bottom of any entity detail page to see the "Activity Log" section.

### On Global Logs Page
Navigate to `/logs` to see all system-wide activity:
- Use filters to narrow down by entity type
- Click on entity badges to navigate to that entity
- Logs are grouped by date for easy navigation

## Troubleshooting

### Logs Not Appearing

1. **Check Migration**
   - Ensure `020_create_audit_logs_system.sql` is applied
   - Verify table and view exist in database

2. **Check RLS Policies**
   - Ensure user has permission to view logs
   - Check if policies are enabled

3. **Check Data**
   - Query database directly to see if logs exist:
   ```sql
   SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 10;
   ```

### Performance Issues

1. **Too Many Logs**
   - Limit queries with `.limit(500)`
   - Implement pagination for large datasets

2. **Slow Queries**
   - Ensure indexes are created
   - Use date range filters

## Future Enhancements

- [ ] Automatic logging via database triggers
- [ ] Export logs to CSV/PDF
- [ ] Advanced filtering (date ranges, search)
- [ ] Real-time log updates with subscriptions
- [ ] Log analytics and reporting
- [ ] Rollback functionality
- [ ] Diff viewer for complex objects

---

**Version:** 1.0  
**Created:** November 2025

