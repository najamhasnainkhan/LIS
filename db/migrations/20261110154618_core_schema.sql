create table if not exists users (
  id serial primary key,
  email text not null unique,
  name text not null,
  password_hash text not null,
  role text not null check (role in ('admin','receptionist','technician','pathologist')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create sequence if not exists patient_seq start 1;
create table if not exists patients (
  id serial primary key,
  patient_code text not null unique,
  name text not null,
  dob date,
  gender text,
  phone text,
  email text,
  address text,
  created_by integer references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists patients_name_idx on patients (lower(name));
create table if not exists tests (
  id serial primary key,
  code text not null unique,
  name text not null,
  category text,
  price_cents integer not null default 0,
  unit text,
  reference_range text,
  active boolean not null default true
);
create table if not exists orders (
  id serial primary key,
  patient_id integer not null references patients(id),
  status text not null default 'pending',
  total_cents integer not null default 0,
  created_by integer references users(id),
  created_at timestamptz not null default now()
);
create table if not exists order_items (
  id serial primary key,
  order_id integer not null references orders(id) on delete cascade,
  test_id integer not null references tests(id),
  price_cents integer not null default 0
);
create table if not exists samples (
  id serial primary key,
  sample_code text not null unique,
  order_id integer not null references orders(id),
  sample_type text,
  status text not null default 'collected',
  collected_at timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists results (
  id serial primary key,
  order_item_id integer not null references order_items(id) on delete cascade,
  sample_id integer references samples(id),
  value text,
  flag text,
  status text not null default 'draft',
  entered_by integer references users(id),
  verified_by integer references users(id),
  updated_at timestamptz not null default now()
);
