-- Add final_settlement_statement_file field to transactions table
alter table transactions
add column if not exists final_settlement_statement_file text;

-- Create settlement_sellers table
create table if not exists settlement_sellers (
  id uuid primary key default gen_random_uuid(),
  transaction_id bigint not null references transactions(id) on delete cascade,
  seller_id bigint not null references transaction_sellers(id) on delete cascade,
  tax_seller_id bigint references tax_accounts(id) on delete set null,
  current_exchange_id bigint references exchanges(id) on delete set null,
  
  -- Financial fields
  balance numeric(12, 2),
  closing_cost numeric(12, 2),
  debt_payoff numeric(12, 2),
  funds_to_exchange numeric(12, 2),
  funds_to_exchanger numeric(12, 2),
  sale_price numeric(12, 2),
  
  -- Date field
  date_writing_instructions date,
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  unique (transaction_id, seller_id)
);

-- Create settlement_buyers table
create table if not exists settlement_buyers (
  id uuid primary key default gen_random_uuid(),
  transaction_id bigint not null references transactions(id) on delete cascade,
  buyer_id bigint not null references transaction_buyers(id) on delete cascade,
  tax_buyer_id bigint references tax_accounts(id) on delete set null,
  selected_exchange_id bigint references exchanges(id) on delete set null,
  
  -- Financial fields
  closing_cost numeric(12, 2),
  deposit_from_exchange numeric(12, 2),
  deposit_from_exchanger numeric(12, 2),
  funds_from_exchange numeric(12, 2),
  loan_amount numeric(12, 2),
  replacement_of_deposit numeric(12, 2),
  sale_price numeric(12, 2),
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  unique (transaction_id, buyer_id, selected_exchange_id)
);

-- Create wire_instructions table
create table if not exists wire_instructions (
  id uuid primary key default gen_random_uuid(),
  transaction_id bigint not null references transactions(id) on delete cascade,
  settlement_seller_id uuid references settlement_sellers(id) on delete cascade,
  settlement_buyer_id uuid references settlement_buyers(id) on delete cascade,
  
  -- Wire instruction fields
  who_called text,
  who_spoke_to text,
  date_writing_instructions date,
  user_id uuid references auth.users(id) on delete set null,
  file_path text,
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  -- Either settlement_seller_id or settlement_buyer_id must be set
  constraint wire_instructions_entity_check check (
    (settlement_seller_id is not null and settlement_buyer_id is null) or
    (settlement_seller_id is null and settlement_buyer_id is not null)
  )
);

-- Create indexes
create index if not exists settlement_sellers_transaction_idx on settlement_sellers(transaction_id);
create index if not exists settlement_sellers_seller_idx on settlement_sellers(seller_id);
create index if not exists settlement_sellers_tax_seller_idx on settlement_sellers(tax_seller_id);
create index if not exists settlement_sellers_exchange_idx on settlement_sellers(current_exchange_id);

create index if not exists settlement_buyers_transaction_idx on settlement_buyers(transaction_id);
create index if not exists settlement_buyers_buyer_idx on settlement_buyers(buyer_id);
create index if not exists settlement_buyers_tax_buyer_idx on settlement_buyers(tax_buyer_id);
create index if not exists settlement_buyers_exchange_idx on settlement_buyers(selected_exchange_id);

create index if not exists wire_instructions_transaction_idx on wire_instructions(transaction_id);
create index if not exists wire_instructions_seller_idx on wire_instructions(settlement_seller_id);
create index if not exists wire_instructions_buyer_idx on wire_instructions(settlement_buyer_id);
create index if not exists wire_instructions_user_idx on wire_instructions(user_id);

-- Create update timestamp triggers
create or replace function update_settlement_sellers_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create or replace function update_settlement_buyers_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create or replace function update_wire_instructions_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger settlement_sellers_touch_updated_at
before update on settlement_sellers
for each row execute function update_settlement_sellers_timestamp();

create trigger settlement_buyers_touch_updated_at
before update on settlement_buyers
for each row execute function update_settlement_buyers_timestamp();

create trigger wire_instructions_touch_updated_at
before update on wire_instructions
for each row execute function update_wire_instructions_timestamp();

-- Enable RLS
alter table settlement_sellers enable row level security;
alter table settlement_buyers enable row level security;
alter table wire_instructions enable row level security;

-- RLS Policies for settlement_sellers
create policy "Users can view settlement_sellers"
  on settlement_sellers for select
  using (true);

create policy "Users can insert settlement_sellers"
  on settlement_sellers for insert
  with check (true);

create policy "Users can update settlement_sellers"
  on settlement_sellers for update
  using (true);

create policy "Users can delete settlement_sellers"
  on settlement_sellers for delete
  using (true);

-- RLS Policies for settlement_buyers
create policy "Users can view settlement_buyers"
  on settlement_buyers for select
  using (true);

create policy "Users can insert settlement_buyers"
  on settlement_buyers for insert
  with check (true);

create policy "Users can update settlement_buyers"
  on settlement_buyers for update
  using (true);

create policy "Users can delete settlement_buyers"
  on settlement_buyers for delete
  using (true);

-- RLS Policies for wire_instructions
create policy "Users can view wire_instructions"
  on wire_instructions for select
  using (true);

create policy "Users can insert wire_instructions"
  on wire_instructions for insert
  with check (true);

create policy "Users can update wire_instructions"
  on wire_instructions for update
  using (true);

create policy "Users can delete wire_instructions"
  on wire_instructions for delete
  using (true);

