-- ═══════════════════════════════════════════════════════════════════════════
-- TRUE App — Supabase Schema
-- Ausführen im Supabase SQL Editor: https://supabase.com/dashboard
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Profiles ──────────────────────────────────────────────────────────────
create table if not exists profiles (
  id           uuid primary key references auth.users on delete cascade,
  vorname      text not null default '',
  avatar       text not null default '🧑',
  bio          text not null default '',
  stadt        text not null default '',
  telefon      text not null default '',
  supermarkets text[] not null default '{}',
  preferences  text[] not null default '{}',
  push_token   text,
  created_at   timestamptz not null default now()
);
alter table profiles enable row level security;
create policy "Users can read own profile"   on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id) values (new.id);
  return new;
end;
$$ language plpgsql security definer;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ── 2. Posts ─────────────────────────────────────────────────────────────────
create table if not exists posts (
  id            bigint generated always as identity primary key,
  user_id       uuid references auth.users on delete set null,
  author_name   text not null default 'Anonym',
  author_avatar text not null default '🧑',
  type          text not null default 'user',  -- user | bot | eva | positive
  tag           text not null default 'Einkaufstipp',
  tag_color     text not null default '#00e87a',
  title         text,
  text          text not null,
  img_url       text,
  source        text,
  likes         int not null default 0,
  created_at    timestamptz not null default now()
);
alter table posts enable row level security;
create policy "Anyone can read posts"         on posts for select using (true);
create policy "Authenticated users can post"  on posts for insert with check (auth.uid() is not null);
create policy "Users can update own posts"    on posts for update using (auth.uid() = user_id);
create policy "Users can delete own posts"    on posts for delete using (auth.uid() = user_id);

-- Storage bucket for post images
-- Supabase Dashboard → Storage → New Bucket → "post-images" → Public

-- ── 3. Comments ──────────────────────────────────────────────────────────────
create table if not exists comments (
  id            bigint generated always as identity primary key,
  post_id       bigint not null references posts on delete cascade,
  user_id       uuid references auth.users on delete set null,
  author_name   text not null default 'Anonym',
  text          text not null,
  created_at    timestamptz not null default now()
);
alter table comments enable row level security;
create policy "Anyone can read comments"         on comments for select using (true);
create policy "Authenticated users can comment"  on comments for insert with check (auth.uid() is not null);
create policy "Users can delete own comments"    on comments for delete using (auth.uid() = user_id);

-- ── 4. Post Likes (for tracking who liked) ────────────────────────────────────
create table if not exists post_likes (
  post_id    bigint not null references posts on delete cascade,
  user_id    uuid not null references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
alter table post_likes enable row level security;
create policy "Anyone can see likes"   on post_likes for select using (true);
create policy "Users can like/unlike"  on post_likes for insert with check (auth.uid() = user_id);
create policy "Users can remove like"  on post_likes for delete using (auth.uid() = user_id);

-- Auto-update likes count
create or replace function update_post_likes_count()
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    update posts set likes = likes + 1 where id = new.post_id;
  elsif TG_OP = 'DELETE' then
    update posts set likes = likes - 1 where id = old.post_id;
  end if;
  return null;
end;
$$ language plpgsql;
create trigger post_likes_count_trigger
  after insert or delete on post_likes
  for each row execute procedure update_post_likes_count();

-- ── 5. Saved Posts ────────────────────────────────────────────────────────────
create table if not exists saved_posts (
  user_id    uuid not null references auth.users on delete cascade,
  post_id    bigint not null references posts on delete cascade,
  saved_at   timestamptz not null default now(),
  primary key (user_id, post_id)
);
alter table saved_posts enable row level security;
create policy "Users see own saved posts" on saved_posts for select using (auth.uid() = user_id);
create policy "Users can save posts"      on saved_posts for insert with check (auth.uid() = user_id);
create policy "Users can unsave posts"    on saved_posts for delete using (auth.uid() = user_id);

-- ── 6. Shopping Lists (shared) ───────────────────────────────────────────────
create table if not exists shopping_lists (
  id         text primary key,  -- nanoid, shared in URL
  owner_id   uuid references auth.users on delete cascade,
  name       text not null default 'Meine Einkaufsliste',
  created_at timestamptz not null default now()
);
alter table shopping_lists enable row level security;
create policy "Anyone with ID can read list" on shopping_lists for select using (true);
create policy "Owner can manage list"        on shopping_lists for all using (auth.uid() = owner_id);

create table if not exists list_items (
  id             text primary key,
  list_id        text not null references shopping_lists on delete cascade,
  product_id     text not null,
  product_name   text not null,
  product_brand  text not null default '',
  product_emoji  text not null default '🛒',
  severity       text not null default 'none',
  issue          text not null default '—',
  checked        boolean not null default false,
  added_at       timestamptz not null default now()
);
alter table list_items enable row level security;
create policy "Anyone with list ID can read items" on list_items for select using (true);
create policy "List owner can manage items"        on list_items for all using (
  exists (select 1 from shopping_lists where id = list_id and owner_id = auth.uid())
);

create table if not exists list_comments (
  id           text primary key,
  list_id      text not null references shopping_lists on delete cascade,
  item_id      text not null,
  user_id      uuid references auth.users on delete set null,
  author_name  text not null default 'Anonym',
  text         text not null,
  created_at   timestamptz not null default now()
);
alter table list_comments enable row level security;
create policy "Anyone with list ID can read comments"  on list_comments for select using (true);
create policy "Authenticated users can comment on list" on list_comments for insert with check (auth.uid() is not null);

-- ── 7. Support Messages ───────────────────────────────────────────────────────
create table if not exists support_messages (
  id          bigint generated always as identity primary key,
  user_id     uuid references auth.users on delete set null,
  user_name   text not null default 'Anonym',
  text        text not null,
  direction   text not null default 'user',  -- 'user' | 'support'
  created_at  timestamptz not null default now()
);
alter table support_messages enable row level security;
create policy "Users see own messages"     on support_messages for select using (auth.uid() = user_id);
create policy "Users can send messages"    on support_messages for insert with check (auth.uid() = user_id);
-- Admin access needs service_role key

-- ── 8. Realtime ───────────────────────────────────────────────────────────────
-- Enable Realtime for live updates:
-- Supabase Dashboard → Database → Replication → Enable für: posts, comments, list_items, list_comments

-- ── 9. Storage Buckets ────────────────────────────────────────────────────────
-- post-images   → Public, 5MB max, images only
-- profile-images → Public, 2MB max, images only

-- ── STORAGE POLICY (after creating bucket "post-images") ──────────────────────
-- create policy "Public read" on storage.objects for select using (bucket_id = 'post-images');
-- create policy "Auth upload"  on storage.objects for insert with check (bucket_id = 'post-images' and auth.uid() is not null);
