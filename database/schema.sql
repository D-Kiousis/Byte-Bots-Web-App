create table if not exists public.patients (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz not null default now()
);

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

alter table public.patients enable row level security;
alter table public.products enable row level security;
alter table public.inventory enable row level security;
