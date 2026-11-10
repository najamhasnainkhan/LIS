create table if not exists audit_logs (
  id bigserial primary key,
  user_id integer,
  user_name text,
  action text not null,
  entity text not null,
  entity_id text,
  detail text,
  created_at timestamptz not null default now()
);
create index if not exists audit_logs_created_idx on audit_logs (created_at desc);
