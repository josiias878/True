-- shared_list_items: one shared shopping list, accessible by list_id (no auth required)
-- Run this in Supabase SQL editor

CREATE TABLE IF NOT EXISTS public.shared_list_items (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  list_id      text NOT NULL,
  product_id   text NOT NULL,
  product_name text NOT NULL,
  product_brand text DEFAULT '',
  product_emoji text DEFAULT '🛒',
  severity     text DEFAULT 'none',
  issue        text DEFAULT '',
  checked      boolean DEFAULT false,
  added_by     text DEFAULT '',
  added_at     timestamptz DEFAULT now(),
  UNIQUE (list_id, product_id)
);

ALTER TABLE public.shared_list_items ENABLE ROW LEVEL SECURITY;

-- Anyone can read, write, update, delete (no auth required — list_id acts as the access token)
CREATE POLICY "shared_list_items_select" ON public.shared_list_items FOR SELECT USING (true);
CREATE POLICY "shared_list_items_insert" ON public.shared_list_items FOR INSERT WITH CHECK (true);
CREATE POLICY "shared_list_items_update" ON public.shared_list_items FOR UPDATE USING (true);
CREATE POLICY "shared_list_items_delete" ON public.shared_list_items FOR DELETE USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.shared_list_items;
