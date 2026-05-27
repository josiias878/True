-- list_members: tracks who has joined a shared list via invite link
-- Run this in Supabase SQL editor

CREATE TABLE IF NOT EXISTS public.list_members (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  list_id      text NOT NULL,
  member_name  text NOT NULL,
  member_photo text DEFAULT '',
  member_emoji text DEFAULT '👤',
  joined_at    timestamptz DEFAULT now(),
  UNIQUE (list_id, member_name)
);

-- Enable Row Level Security
ALTER TABLE public.list_members ENABLE ROW LEVEL SECURITY;

-- Allow everyone to insert (guests join without auth)
CREATE POLICY "Anyone can join a list" ON public.list_members
  FOR INSERT WITH CHECK (true);

-- Allow reading members of a list (to show who's in the list)
CREATE POLICY "Anyone can read list members" ON public.list_members
  FOR SELECT USING (true);

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.list_members;
