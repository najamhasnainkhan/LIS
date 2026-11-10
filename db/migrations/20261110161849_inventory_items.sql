create table if not exists inventory_items (
  id serial primary key,
  name text not null,
  category text not null default 'reagent',
  unit text not null default 'pcs',
  quantity numeric not null default 0,
  min_stock numeric not null default 0,
  expiry_date date,
  lot_no text,
  supplier text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists inventory_items_name_idx on inventory_items (name);
