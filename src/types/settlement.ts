export interface SettlementSeller {
  id: string;
  transaction_id: number;
  seller_id: number;
  tax_seller_id: number | null;
  current_exchange_id: number | null;
  balance: number | null;
  closing_cost: number | null;
  debt_payoff: number | null;
  funds_to_exchange: number | null;
  funds_to_exchanger: number | null;
  sale_price: number | null;
  date_writing_instructions: string | null;
  created_at: string;
  updated_at: string;
}

export interface SettlementBuyer {
  id: string;
  transaction_id: number;
  buyer_id: number;
  tax_buyer_id: number | null;
  selected_exchange_id: number | null;
  closing_cost: number | null;
  deposit_from_exchange: number | null;
  deposit_from_exchanger: number | null;
  funds_from_exchange: number | null;
  loan_amount: number | null;
  replacement_of_deposit: number | null;
  sale_price: number | null;
  created_at: string;
  updated_at: string;
}

export interface WireInstruction {
  id: string;
  transaction_id: number;
  settlement_seller_id: string | null;
  settlement_buyer_id: string | null;
  who_called: string | null;
  who_spoke_to: string | null;
  date_writing_instructions: string | null;
  user_id: string | null;
  file_path: string | null;
  created_at: string;
  updated_at: string;
}

