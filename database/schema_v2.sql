-- Run in the Supabase SQL Editor AFTER schema.sql. Safe to run again.
-- Adds macronutrients and a warehouse bin location (aisle-shelf-bin) to products.
alter table public.products
    add column if not exists protein_g numeric(7, 2) not null default 0 check (protein_g >= 0),
    add column if not exists carbs_g numeric(7, 2) not null default 0 check (carbs_g >= 0),
    add column if not exists sugar_g numeric(7, 2) not null default 0 check (sugar_g >= 0),
    add column if not exists sat_fat_g numeric(7, 2) not null default 0 check (sat_fat_g >= 0),
    add column if not exists potassium_mg numeric(8, 2) not null default 0 check (potassium_mg >= 0),
    add column if not exists bin_location text;
