# Property Identification System - 1031 Exchange

## Overview

The Property Identification System allows users to identify replacement properties for 1031 exchanges in compliance with IRS rules. The system automatically tracks which rules apply and validates compliance in real-time.

## 1031 Exchange Rules

### Three Property Rule
- **Limit**: Up to 3 replacement properties
- **Value Limit**: No limit on total value
- **Requirement**: Must acquire at least one of the identified properties

### 200% Rule
- **Limit**: Any number of properties
- **Value Limit**: Total fair market value cannot exceed 200% of relinquished property value
- **Requirement**: Must acquire at least one of the identified properties

### 95% Rule (Fallback)
- **Applied When**: Total identified value exceeds 200% of relinquished property value
- **Requirement**: Must acquire at least 95% of the total identified property value
- **Note**: This is the most restrictive rule and should be avoided if possible

## Database Schema

### Table: `identified_properties`

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGSERIAL | Primary key |
| `exchange_id` | BIGINT | FK to exchanges table |
| `property_id` | BIGINT | FK to properties table (optional) |
| `identification_type` | TEXT | 'written_form' or 'by_contract' |
| `property_type` | TEXT | 'standard_address', 'dst', or 'membership_interest' |
| `description` | TEXT | Property description |
| `status` | TEXT | 'identified', 'under_contract', 'acquired', 'cancelled' |
| `percentage` | NUMERIC(5,2) | Ownership percentage |
| `value` | NUMERIC(15,2) | Property value |
| `identification_date` | DATE | When property was identified |
| `is_parked` | BOOLEAN | Whether property is parked |
| `document_storage_path` | TEXT | Path to uploaded document |
| `metadata` | JSONB | Additional metadata |

### Table: `property_improvements`

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGSERIAL | Primary key |
| `identified_property_id` | BIGINT | FK to identified_properties |
| `description` | TEXT | Improvement description |
| `value` | NUMERIC(15,2) | Cost/value of improvement |

## Components

### PropertyIdentification
Main component that orchestrates the entire property identification system.

**Props:**
- `exchangeId`: number - The exchange ID
- `totalSalePropertyValue`: number - Total value of relinquished property

**Features:**
- Displays active rule (3 Property, 200%, or 95%)
- Shows compliance status
- Two sections: Written Identification Form and Identified by Contract
- Real-time rule calculation

### ExchangeRuleIndicator
Displays the currently active rule and compliance status.

**Props:**
- `ruleStatus`: ExchangeRuleStatus - Rule status object

**Displays:**
- Active rule name and description
- Compliance status
- Total identified properties count and value
- Warnings and violations
- Remaining capacity (for 200% rule)

### IdentifiedPropertiesTable
Table displaying identified properties with inline editing and improvements management.

**Features:**
- Inline editing of all fields
- Expandable rows showing improvements
- Add/remove improvements
- Delete properties
- Checkbox for "Parked" status
- Calculates total value (base + improvements)

### AddPropertyModal
Multi-step modal for adding new identified properties.

**Steps:**
1. **Selection Mode**: Choose between uploading document or digital selection
2. **Property Type**: Select Standard Address, DST, or 100% Membership Interest
3. **Property Details**: Select/create property and enter details

**Features:**
- Document upload support
- Property search and creation
- Custom fields for each property type
- Validation at each step

## Usage

### On Exchange Page

```tsx
import { PropertyIdentification } from "@/components/PropertyIdentification";

<PropertyIdentification
  exchangeId={exchangeId}
  totalSalePropertyValue={exchange.total_sale_property_value || 0}
/>
```

### Rule Calculation Logic

The system automatically determines which rule applies:

1. **0-3 properties**: 3 Property Rule applies
2. **4+ properties, total value ≤ 200% of sale**: 200% Rule applies
3. **Total value > 200% of sale**: 95% Rule applies (with violations shown)

## Identification Types

### Written Identification Form
- Formal written documentation
- Submitted to Qualified Intermediary
- Must be completed within 45 days
- Can list multiple options

### Identified by Contract
- Property already under contract
- Automatically qualifies as identification
- Shows serious intent to purchase
- More advanced stage than written form

## Property Types

### Standard Address
- Regular real estate with physical address
- Links to existing property in system
- Most common type

### DST (Delaware Statutory Trust)
- Fractional ownership interest
- No physical address required
- Description-based identification

### 100% Membership Interest
- Full ownership of LLC/entity
- Entity owns the property
- Special tax treatment

## Improvements

Properties can have multiple improvements that affect final value:
- **Description**: What the improvement is
- **Value**: Cost/value of the improvement
- **Total Property Value**: Base value + all improvements

Improvements are important because:
- They increase total property value
- Affect rule calculations (200% limit)
- Must be considered for 95% acquisition requirement

## Timeline Requirements

- **45 Days**: Identify replacement properties (after relinquished property close)
- **180 Days**: Complete acquisition of replacement property

These dates are tracked in the Exchange Information section:
- `relinquished_close_date`: When sale closed
- `day_45_date`: Deadline for identification
- `day_180_date`: Deadline for acquisition

## Warnings and Violations

The system provides real-time feedback:

### Warnings (Yellow)
- Approaching limits (e.g., 90% of 200% rule used)
- Moving from 3 Property to 200% rule
- Recommended actions

### Violations (Red)
- Exceeded 200% limit (triggering 95% rule)
- Non-compliance with rules
- Required actions

## Best Practices

1. **Start Early**: Identify properties as soon as possible within the 45-day window
2. **Use 3 Property Rule When Possible**: Simplest and most flexible
3. **Monitor 200% Rule Carefully**: Easy to exceed if not watching total value
4. **Avoid 95% Rule**: Very restrictive, requires purchasing almost everything identified
5. **Document Everything**: Upload identification documents for audit trail
6. **Track Improvements**: Include all planned improvements in property value
7. **Use "Parked" Flag**: Mark properties that are temporarily held

## API Examples

### Create Identified Property

```typescript
const { data, error } = await supabase
  .from("identified_properties")
  .insert({
    exchange_id: 123,
    identification_type: 'written_form',
    property_type: 'standard_address',
    property_id: 456,
    description: 'Main Street Property',
    value: 500000,
    percentage: 100,
    identification_date: '2025-01-15'
  });
```

### Add Improvement

```typescript
const { data, error } = await supabase
  .from("property_improvements")
  .insert({
    identified_property_id: 789,
    description: 'New roof',
    value: 25000
  });
```

### Query Properties with Improvements

```typescript
const { data, error } = await supabase
  .from("identified_properties")
  .select(`
    *,
    property:property_id (id, address),
    improvements:property_improvements (*)
  `)
  .eq("exchange_id", 123);
```

## Migration

Run migration `026_create_property_identification_system.sql` to create tables:

```bash
# Apply migration in Supabase Dashboard or use CLI
supabase db push
```

## Permissions

All authenticated users can:
- View identified properties
- Admins (workspace_owner, platform_super_admin, admin) can:
  - Create identified properties
  - Update identified properties
  - Delete identified properties
  - Manage improvements

## Notes

- Property identification is critical for 1031 exchange compliance
- IRS rules are strictly enforced
- System provides guidance but users should consult tax professionals
- All deadlines are based on the relinquished property close date
- Failed compliance can result in full tax liability

