# Accounting System

## Overview

The Accounting System tracks financial movements (debits and credits) related to transactions and exchanges in the 1031 Exchange CRM.

## Database Schema

### Table: `accounting_entries`

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGSERIAL | Primary key |
| `date` | DATE | Entry date (defaults to current date) |
| `credit` | DECIMAL(15,2) | Credit amount |
| `debit` | DECIMAL(15,2) | Debit amount |
| `description` | TEXT | Entry description |
| `entry_type` | TEXT | Type of entry (see types below) |
| `from_exchange_id` | BIGINT | Source exchange (FK) |
| `to_exchange_id` | BIGINT | Destination exchange (FK) |
| `transaction_id` | BIGINT | Associated transaction (FK) |
| `task_id` | BIGINT | Associated task (FK) |
| `settlement_statement_id` | BIGINT | Reference to settlement statement (FK) |
| `settlement_type` | TEXT | 'seller' or 'buyer' |
| `metadata` | JSONB | Additional metadata |
| `created_at` | TIMESTAMPTZ | Created timestamp |
| `updated_at` | TIMESTAMPTZ | Last updated timestamp |
| `created_by` | UUID | User who created (FK) |

### Entry Types

- `sale_proceeds` - Funds from property sale to exchange
- `purchase_funds` - Funds from exchange to purchase
- `fees` - Various fees
- `earnest_money` - Earnest money deposits
- `wire_in` - Incoming wire transfers
- `wire_out` - Outgoing wire transfers
- `manual` - Manually created entries

## Automatic Entry Creation

### When Settlement Seller "Funds to Exchange" is updated:

1. **Creates/Updates Accounting Entry:**
   - `entry_type`: `sale_proceeds`
   - `credit`: Value from "Funds to Exchange" field
   - `debit`: 0
   - `description`: "Funds to Exchange (Sale Proceeds)"
   - `to_exchange_id`: Seller's current exchange
   - `transaction_id`: Current transaction
   - `settlement_statement_id`: Settlement seller ID
   - `settlement_type`: 'seller'

2. **Creates Task** (only on first creation):
   - `title`: "Receipt of funds"
   - `description`: "Confirm receipt of $X sale proceeds"
   - `status`: "pending"
   - `priority`: "high"
   - `entity_type`: "transaction"
   - Task is linked to accounting entry via `task_id`

## UI Features

### Accounting Table Display

The table shows:
- **Date**: Entry date
- **To Exchange**: Destination exchange number
- **Credit**: Amount credited (green, formatted as currency)
- **Description**: Entry description
- **From Exchange**: Source exchange number
- **Debit**: Amount debited (red, formatted as currency)
- **Actions**: Edit and Delete buttons

### Inline Editing

Users can edit directly in the table:
- Click **✏️ Edit** button
- Fields become editable: Credit, Debit, Description
- Click **✓ Save** to save changes
- Click **✕ Cancel** to discard

### Totals

At the bottom of the table:
- **Total Credit**: Sum of all credits
- **Total Debit**: Sum of all debits
- **Balance**: Difference (Credit - Debit)

### Location

The Accounting table is displayed:
- **On Transaction page**: Below Settlement Sellers/Buyers section
- **On Exchange page**: Filtered by exchange (shows only entries where to_exchange or from_exchange matches)

## Usage

### In Transaction Page

```tsx
import { AccountingTable } from "@/components/AccountingTable";

<AccountingTable
  transactionId={transactionId}
  onEntryChange={() => console.log('Entry changed')}
/>
```

### In Exchange Page

```tsx
<AccountingTable
  transactionId={transactionId}
  exchangeId={exchangeId}  // Filters entries for this exchange
  onEntryChange={() => console.log('Entry changed')}
/>
```

## Database Migration

Run migration `022_create_accounting_system.sql` to create the `accounting_entries` table and related indexes.

```bash
# Apply migration in Supabase Dashboard
# Or use Supabase CLI:
supabase db push
```

## Permissions

All authenticated users can:
- View accounting entries
- Create entries
- Update entries
- Delete entries

(Adjust RLS policies as needed for your security requirements)

## Future Enhancements

Possible additions:
- Manual entry creation from UI
- Entry categories/tags
- Filtering and search
- Export to CSV/Excel
- Integration with QuickBooks/accounting software
- Approval workflow for entries
- Balance reconciliation tools

