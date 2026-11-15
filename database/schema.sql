create table if not exists public.patients (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz not null default now()
);

-- Patient profile. Pseudonymous on purpose: a display name is optional and
-- should be a first name or nickname. No health data is stored here yet.
alter table public.patients
    add column if not exists display_name text check (display_name is null or char_length(display_name) <= 60),
    add column if not exists household_size integer not null default 1 check (household_size between 1 and 20),
    add column if not exists enrollment_status text not null default 'active' check (enrollment_status in ('active', 'pending', 'expired'));

create table if not exists public.products (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    sku text unique,
    category text,
    unit text not null default 'each',
    calories_per_serving numeric(8, 2) not null default 0 check (calories_per_serving >= 0),
    sodium_mg numeric(8, 2) not null default 0 check (sodium_mg >= 0),
    active boolean not null default true,
    created_at timestamptz not null default now()
);

alter table public.products
    add column if not exists calories_per_serving numeric(8, 2) not null default 0 check (calories_per_serving >= 0),
    add column if not exists sodium_mg numeric(8, 2) not null default 0 check (sodium_mg >= 0);

create table if not exists public.inventory (
    id uuid primary key default gen_random_uuid(),
    product_id uuid not null unique references public.products(id) on delete cascade,
    quantity numeric(12, 2) not null default 0 check (quantity >= 0),
    reorder_level numeric(12, 2) not null default 0 check (reorder_level >= 0),
    updated_at timestamptz not null default now()
);

create or replace function public.create_inventory_for_product()
returns trigger
language plpgsql
set search_path = public
as $$
begin
    insert into public.inventory (product_id)
    values (new.id)
    on conflict (product_id) do nothing;
    return new;
end;
$$;

drop trigger if exists products_create_inventory on public.products;
create trigger products_create_inventory
after insert on public.products
for each row execute function public.create_inventory_for_product();

insert into public.inventory (product_id)
select id from public.products
on conflict (product_id) do nothing;

create or replace function public.set_inventory_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists inventory_set_updated_at on public.inventory;
create trigger inventory_set_updated_at
before update on public.inventory
for each row execute function public.set_inventory_updated_at();

-- ---------------------------------------------------------------------------
-- Accounts and sessions
--
-- accounts.role decides what a signed-in person may do:
--   admin   -> manages patients, products and inventory (patient_id is null)
--   patient -> sees only their own profile and the available groceries
--
-- accounts.patient_id is the trusted link from a login to one patient record.
-- The checkout system should read it from the server-side session, never from
-- anything the browser sends, so a patient can only ever check out as themselves.
--
-- Passwords are stored only as scrypt hashes. Session tokens are stored only as
-- SHA-256 hashes, so a database leak does not hand out working sign-ins.
-- ---------------------------------------------------------------------------
create table if not exists public.accounts (
    id uuid primary key default gen_random_uuid(),
    username text not null,
    password_hash text not null,
    role text not null check (role in ('admin', 'patient')),
    patient_id uuid unique references public.patients(id) on delete cascade,
    must_change_password boolean not null default false,
    active boolean not null default true,
    failed_logins integer not null default 0,
    locked_until timestamptz,
    last_login_at timestamptz,
    created_at timestamptz not null default now(),
    constraint accounts_username_format check (username ~ '^[a-z0-9._-]{3,32}$'),
    constraint accounts_role_patient_link check (
        (role = 'patient' and patient_id is not null)
        or (role = 'admin' and patient_id is null)
    )
);

create unique index if not exists accounts_username_key on public.accounts (username);

create table if not exists public.sessions (
    token_hash text primary key,
    account_id uuid not null references public.accounts(id) on delete cascade,
    created_at timestamptz not null default now(),
    expires_at timestamptz not null
);

create index if not exists sessions_account_idx on public.sessions (account_id);
create index if not exists sessions_expires_idx on public.sessions (expires_at);

alter table public.patients enable row level security;
alter table public.products enable row level security;
alter table public.inventory enable row level security;
alter table public.accounts enable row level security;
alter table public.sessions enable row level security;

-- Defense in depth: even if a policy is added by mistake later, the public
-- (publishable/anon) key can never read password hashes or sessions. The Node
-- server uses the secret key, which is unaffected by these revokes.
revoke all on table public.accounts from anon, authenticated;
revoke all on table public.sessions from anon, authenticated;
