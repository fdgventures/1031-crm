export type AccountingEntryType = 
  | 'sale_proceeds'
  | 'purchase_funds'
  | 'fees'
  | 'earnest_money'
  | 'wire_in'
  | 'wire_out'
  | 'manual';

export interface AccountingEntry {
  id: number;
  date: string;
  credit: number;
  debit: number;
  description: string | null;
  entry_type: AccountingEntryType;
  from_exchange_id: number | null;
  to_exchange_id: number | null;
  transaction_id: number | null;
  task_id: number | null;
  settlement_seller_id: string | null;
  settlement_buyer_id: string | null;
  settlement_type: 'seller' | 'buyer' | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  
  // Relations
  from_exchange?: {
    id: number;
    exchange_number: string;
  };
  to_exchange?: {
    id: number;
    exchange_number: string;
  };
  transaction?: {
    id: number;
    transaction_number: string;
  };
  task?: {
    id: number;
    title: string;
    status: string;
  };
}

export interface AccountingEntryInsert {
  date?: string;
  credit?: number;
  debit?: number;
  description?: string | null;
  entry_type: AccountingEntryType;
  from_exchange_id?: number | null;
  to_exchange_id?: number | null;
  transaction_id?: number | null;
  task_id?: number | null;
  settlement_seller_id?: string | null;
  settlement_buyer_id?: string | null;
  settlement_type?: 'seller' | 'buyer' | null;
  metadata?: Record<string, unknown>;
  created_by?: string | null;
}

export interface AccountingEntryUpdate {
  date?: string;
  credit?: number;
  debit?: number;
  description?: string | null;
  from_exchange_id?: number | null;
  to_exchange_id?: number | null;
  task_id?: number | null;
}

