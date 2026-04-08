create table blocked_slots (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete cascade not null,
  date date not null,
  slot_time time not null,
  created_at timestamptz default now()
);

-- Estetään duplikaatit samalle yritykselle, päivälle ja kellonajalle
create unique index blocked_slots_uniq on blocked_slots (business_id, date, slot_time);

alter table blocked_slots enable row level security;

create policy "owner manages blocked slots" on blocked_slots for all
  using (business_id in (select id from businesses where user_id = auth.uid()));
