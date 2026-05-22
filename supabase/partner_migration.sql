-- TRUE Partner Platform Migration
-- Run this in the Supabase SQL editor

CREATE TABLE IF NOT EXISTS partner_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name text NOT NULL,
  contact_email text NOT NULL,
  website text,
  description text,
  logo_url text,
  tier text DEFAULT 'basic',
  verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS partner_products (
  id serial PRIMARY KEY,
  partner_id uuid REFERENCES partner_profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  category text,
  tags text[],
  image_url text,
  shop_url text,
  price_hint text,
  barcode text,
  certifications text[],        -- z.B. ['bio-eu', 'fairtrade']
  cert_numbers text,            -- z.B. "DE-ÖKO-006, FLO-12345"
  quality_claim text,           -- Qualitäts-Versprechen (ungeprüft bis verified=true)
  verified boolean DEFAULT false,  -- TRUE-Verifikationsstatus
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Add new columns to existing table if already exists
ALTER TABLE partner_products ADD COLUMN IF NOT EXISTS certifications text[];
ALTER TABLE partner_products ADD COLUMN IF NOT EXISTS cert_numbers text;
ALTER TABLE partner_products ADD COLUMN IF NOT EXISTS quality_claim text;
ALTER TABLE partner_products ADD COLUMN IF NOT EXISTS verified boolean DEFAULT false;
ALTER TABLE partner_products ADD COLUMN IF NOT EXISTS verified_by text;        -- 'auto', 'admin', or null
ALTER TABLE partner_products ADD COLUMN IF NOT EXISTS review_notes text;       -- Ablehnungsgrund / Admin-Notiz
ALTER TABLE partner_products ADD COLUMN IF NOT EXISTS needs_review boolean DEFAULT true;  -- in der Queue?
ALTER TABLE partner_products ADD COLUMN IF NOT EXISTS off_data jsonb;          -- OpenFoodFacts Rohdaten (Cache)

CREATE TABLE IF NOT EXISTS partner_events (
  id serial PRIMARY KEY,
  partner_id uuid REFERENCES partner_profiles(id),
  product_id int REFERENCES partner_products(id),
  event_type text NOT NULL,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE partner_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_events ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist (idempotent setup)
DROP POLICY IF EXISTS "partner_own"                ON partner_profiles;
DROP POLICY IF EXISTS "partner_products_own"       ON partner_products;
DROP POLICY IF EXISTS "partner_products_public"    ON partner_products;
DROP POLICY IF EXISTS "partner_events_own"         ON partner_events;
DROP POLICY IF EXISTS "partner_events_public_insert" ON partner_events;

-- partner_profiles
CREATE POLICY "partner_profiles_select_own" ON partner_profiles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "partner_profiles_insert_own" ON partner_profiles FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "partner_profiles_update_own" ON partner_profiles FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "partner_profiles_delete_own" ON partner_profiles FOR DELETE USING (user_id = auth.uid());

-- partner_products
CREATE POLICY "partner_products_select_own"    ON partner_products FOR SELECT USING (partner_id IN (SELECT id FROM partner_profiles WHERE user_id = auth.uid()));
CREATE POLICY "partner_products_select_public" ON partner_products FOR SELECT USING (active = true AND verified = true);
CREATE POLICY "partner_products_insert_own"    ON partner_products FOR INSERT WITH CHECK (partner_id IN (SELECT id FROM partner_profiles WHERE user_id = auth.uid()));
CREATE POLICY "partner_products_update_own"    ON partner_products FOR UPDATE USING (partner_id IN (SELECT id FROM partner_profiles WHERE user_id = auth.uid())) WITH CHECK (partner_id IN (SELECT id FROM partner_profiles WHERE user_id = auth.uid()));
CREATE POLICY "partner_products_delete_own"    ON partner_products FOR DELETE USING (partner_id IN (SELECT id FROM partner_profiles WHERE user_id = auth.uid()));

-- partner_events
CREATE POLICY "partner_events_select_own"      ON partner_events FOR SELECT USING (partner_id IN (SELECT id FROM partner_profiles WHERE user_id = auth.uid()));
CREATE POLICY "partner_events_insert_public"   ON partner_events FOR INSERT WITH CHECK (true);
