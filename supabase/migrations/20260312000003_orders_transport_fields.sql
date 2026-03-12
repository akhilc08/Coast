-- supabase/migrations/010_orders_transport_fields.sql
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS delivery_address TEXT,
  ADD COLUMN IF NOT EXISTS delivery_zip TEXT,
  ADD COLUMN IF NOT EXISTS vehicle_price_cents INTEGER,
  ADD COLUMN IF NOT EXISTS transport_fee_cents INTEGER,
  ADD COLUMN IF NOT EXISTS transport_quote_tbd BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS transport_status TEXT NOT NULL DEFAULT 'not_requested',
  ADD COLUMN IF NOT EXISTS transport_dispatch_id TEXT;
