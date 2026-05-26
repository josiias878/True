-- Social Media Posts Tabelle
-- Führe dieses SQL im Supabase Dashboard aus: SQL Editor → New Query → Paste → Run

create table if not exists social_posts (
  id            serial primary key,
  platform      text not null,          -- 'instagram' | 'linkedin' | 'reddit'
  status        text not null default 'draft', -- 'draft' | 'scheduled' | 'posted' | 'failed'
  content       text not null,          -- Post-Text
  image_url     text,                   -- URL zum Bild
  post_type     text default 'general', -- 'feature' | 'fact' | 'tip' | 'partner' | 'general'
  platform_post_id text,               -- ID des Posts auf der Plattform (nach Veröffentlichung)
  platform_url  text,                   -- Direktlink zum Post
  scheduled_at  timestamptz,            -- Wann soll gepostet werden?
  posted_at     timestamptz,            -- Wann wurde gepostet?
  error_msg     text,                   -- Fehlermeldung falls fehlgeschlagen
  analytics     jsonb default '{}',     -- { likes, comments, shares, reach, impressions }
  analytics_updated_at timestamptz,
  created_by    text default 'admin',
  created_at    timestamptz default now()
);

-- Index für Dashboard-Abfragen
create index if not exists social_posts_status_idx on social_posts(status);
create index if not exists social_posts_platform_idx on social_posts(platform);
create index if not exists social_posts_created_at_idx on social_posts(created_at desc);

-- RLS: Nur Service Role hat Zugriff (Admin-Only)
alter table social_posts enable row level security;
create policy "Service role only" on social_posts
  using (true)
  with check (true);
