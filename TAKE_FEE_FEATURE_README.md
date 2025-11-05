# Take Fee Feature - Exchange Accounting

## Overview

The "Take Fee" feature allows administrators to automatically deduct fees from an exchange owner's account. Fees are configured in the tax account's fee schedule and can be applied with one click.

## How It Works

### 1. Fee Configuration

Fees are configured in the **Tax Account** fee schedule:
- Navigate to Tax Account page
- Configure fee schedules (name, amount, description)
- These fees become available for all exchanges owned by this tax account

### 2. Taking a Fee

On the **Exchange Accounting** section:
1. Click **"Take Fee"** button (only visible on exchange pages)
2. Modal opens showing all available fees from the owner's tax account
3. Select the desired fee
4. Click **"Take Fee"** to apply

### 3. Accounting Entry Created

When a fee is taken, an accounting entry is automatically created:
- **Type**: `fees`
- **Debit**: Fee amount (deducted from exchange)
- **Credit**: 0
- **From Exchange**: Current exchange
- **Description**: Fee name and description
- **Date**: Current date

## Database Structure

### Fee Schedules Table
```sql
fee_schedules (
  id BIGINT,
  tax_account_id BIGINT,  -- Owner of the fee schedule
  name TEXT,               -- Fee name (e.g., "Exchange Fee")
  amount NUMERIC(10,2),    -- Fee amount
  description TEXT         -- Optional description
)
```

### Accounting Entries
```sql
accounting_entries (
  ...
  entry_type TEXT,         -- 'fees'
  debit NUMERIC(15,2),     -- Fee amount
  credit NUMERIC(15,2),    -- 0
  from_exchange_id BIGINT, -- Exchange being charged
  description TEXT         -- "Fee: [name] - [description]"
)
```

## Components

### TakeFeeModal
**Location**: `src/components/AccountingTable/TakeFeeModal.tsx`

**Props:**
- `exchangeId`: number - The exchange being charged
- `taxAccountId`: number - Tax account ID (to load fees)
- `onClose`: () => void - Close modal callback
- `onSuccess`: () => void - Success callback (refreshes table)

**Features:**
- Loads all fees from tax account
- Radio button selection
- Shows fee name, description, and amount
- Validation and error handling
- Disabled state when no fees available

### AccountingTable (Updated)
**Location**: `src/components/AccountingTable/AccountingTable.tsx`

**New Props:**
- `taxAccountId?: number` - Tax account ID of exchange owner

**Features:**
- "Take Fee" button (only visible when `exchangeId` and `taxAccountId` provided)
- Opens TakeFeeModal
- Refreshes entries after fee is taken

## Usage Examples

### On Exchange Page

```tsx
import AccountingTable from "@/components/AccountingTable/AccountingTable";

<AccountingTable
  exchangeId={exchangeId}
  taxAccountId={exchange.tax_account_id}
  onEntryChange={() => loadExchangeData()}
/>
```

### Create Fee Schedule

```typescript
const { error } = await supabase
  .from("fee_schedules")
  .insert({
    tax_account_id: 123,
    name: "Exchange Processing Fee",
    amount: 500.00,
    description: "Standard 1031 exchange processing fee"
  });
```

### Query Fees for Tax Account

```typescript
const { data: fees } = await supabase
  .from("fee_schedules")
  .select("*")
  .eq("tax_account_id", taxAccountId)
  .order("name");
```

## Fee Entry in Accounting

After taking a fee, the accounting entry appears as:

| Date | From Exchange | Debit | Description | Credit | Actions |
|------|---------------|-------|-------------|--------|---------|
| 2025-01-15 | EX-2025-001 | $500.00 | Fee: Exchange Processing Fee - Standard processing | — | Edit / Delete |

## User Workflow

### Admin Perspective

1. **Setup** (one-time):
   - Configure fee schedules in Tax Account
   - Set amounts and descriptions

2. **Taking Fees** (as needed):
   - Navigate to Exchange page
   - Scroll to Accounting section
   - Click "Take Fee"
   - Select appropriate fee
   - Confirm

3. **Review**:
   - Fee appears in Accounting table
   - Can be edited or deleted if needed
   - Affects exchange balance

### Exchange Owner Perspective

- Fees are deducted from their exchange balance
- Visible in Accounting section
- Can see fee description and amount
- Historical record maintained

## Business Rules

1. **Fee Availability**:
   - Only fees from the exchange owner's tax account are available
   - If no fees configured, modal shows message to configure fees

2. **Permissions**:
   - Same permissions as accounting entries
   - Admins can take fees
   - Users can view fees in accounting table

3. **Fee Application**:
   - One fee at a time
   - Can be applied multiple times
   - Each application creates separate entry

4. **Accounting Impact**:
   - Debit from exchange (reduces balance)
   - Entry type: 'fees' for reporting
   - Can be edited/deleted like any accounting entry

## Example Scenarios

### Scenario 1: Standard Exchange Fee

**Setup:**
- Tax Account has fee: "Exchange Fee" - $500

**Action:**
1. Open exchange EX-2025-001
2. Click "Take Fee"
3. Select "Exchange Fee"
4. Confirm

**Result:**
- Accounting entry created
- Debit: $500
- Description: "Fee: Exchange Fee"
- Exchange balance reduced by $500

### Scenario 2: Multiple Fees

**Setup:**
- Tax Account has fees:
  - "Exchange Fee" - $500
  - "Document Preparation" - $150
  - "Wire Transfer" - $50

**Action:**
1. Take "Exchange Fee" - $500
2. Later, take "Wire Transfer" - $50

**Result:**
- Two separate accounting entries
- Total debit: $550
- Each with own description and date

### Scenario 3: No Fees Configured

**Action:**
1. Click "Take Fee"

**Result:**
- Modal shows: "No fees found for this tax account"
- Message: "Please add fee schedules in the tax account settings"
- "Take Fee" button disabled

## Technical Notes

### Error Handling

- Validates fee selection before submission
- Shows error message if API call fails
- Graceful handling of missing fee schedules
- Loading states during API calls

### Performance

- Fees loaded only when modal opens (lazy loading)
- Uses Supabase optimistic updates
- Minimal re-renders with proper state management

### Future Enhancements

Possible improvements:
- Bulk fee application
- Scheduled/recurring fees
- Fee templates
- Fee approval workflow
- Fee discounts/waivers
- Custom fee amounts (override)

## Related Features

- **Fee Schedules**: Managed in Tax Account settings
- **Accounting Entries**: All fees visible in accounting table
- **Exchange Balance**: Affected by fees
- **Reporting**: Fees can be filtered by entry_type = 'fees'

## API Reference

### Load Fees
```typescript
GET /fee_schedules
  ?tax_account_id=eq.{id}
  &order=name
```

### Create Fee Entry
```typescript
POST /accounting_entries
{
  date: "2025-01-15",
  debit: 500.00,
  credit: 0,
  description: "Fee: Exchange Fee",
  entry_type: "fees",
  from_exchange_id: 123,
  to_exchange_id: null,
  transaction_id: null
}
```

## Testing Checklist

- [ ] Can open "Take Fee" modal
- [ ] Fees load correctly from tax account
- [ ] Can select different fees
- [ ] Fee amount displays correctly
- [ ] "Take Fee" button disabled when no fees
- [ ] Creates accounting entry successfully
- [ ] Entry appears in table immediately
- [ ] Balance updates correctly
- [ ] Error handling works
- [ ] Modal closes after success
- [ ] Can edit/delete fee entries
- [ ] Works with multiple fees
- [ ] Proper permissions enforced

