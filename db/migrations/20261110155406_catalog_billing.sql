create table if not exists test_categories (
  id serial primary key,
  name text not null unique
);
alter table tests add column if not exists category_id integer references test_categories(id);
create table if not exists panels (
  id serial primary key,
  code text not null unique,
  name text not null,
  active boolean not null default true
);
create table if not exists panel_tests (
  panel_id integer not null references panels(id) on delete cascade,
  test_id integer not null references tests(id) on delete cascade,
  primary key (panel_id, test_id)
);
create sequence if not exists invoice_seq start 1;
create table if not exists invoices (
  id serial primary key,
  invoice_no text not null unique,
  order_id integer not null unique references orders(id),
  subtotal_cents integer not null default 0,
  discount_cents integer not null default 0 check (discount_cents >= 0),
  total_cents integer not null default 0,
  created_by integer references users(id),
  created_at timestamptz not null default now()
);
create table if not exists payments (
  id serial primary key,
  invoice_id integer not null references invoices(id) on delete cascade,
  amount_cents integer not null check (amount_cents > 0),
  method text not null default 'cash',
  note text,
  created_by integer references users(id),
  created_at timestamptz not null default now()
);
create index if not exists payments_invoice_idx on payments (invoice_id);
