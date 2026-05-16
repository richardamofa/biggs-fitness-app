/*
 SUPABASE SQL — run this in Supabase SQL editor first

create table if not exists coaches (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    title text,
    bio text,
    tags text[] default '{}',
    rating numeric default 5.0,
    reviews int default 0,
    price text default 'GH₵ 100',
    period text default '/month',
    emoji text default '💪',
    whatsapp text,
    email text,
    phone text,
    active boolean default true,
    created_at timestamptz default now()
);

-- RLS
alter table coaches enable row level security;

-- anyone can read active coaches (for the public coaches page)
create policy "coaches_public_read" on coaches
    for select using (active = true);

-- only authenticated users with admin role can do everything
-- (we handle admin check in JS with ADMIN_IDS array)
create policy "coaches_admin_all" on coaches
    for all using (auth.uid() is not null);

-- seed with existing coaches data (optional — run once)
insert into coaches (name, title, bio, tags, rating, reviews, price, emoji, whatsapp, email, phone) values
('Kwame Asante',  'Strength & Conditioning Coach', '6 years helping clients build serious strength from home or gym.', ARRAY['muscle gain','beginner'],       4.9, 84, 'GH₵ 120', '💪', '233XXXXXXXXX', 'kwame@biggsfitness.com', '+233 XX XXX XXXX'),
('Ama Serwaa',    'Fat Loss & HIIT Specialist',    'Certified personal trainer focused on sustainable fat loss.',    ARRAY['weight loss','endurance'],      4.8, 61, 'GH₵ 100', '🔥', '233XXXXXXXXX', 'ama@biggsfitness.com',   '+233 XX XXX XXXX'),
('Kofi Mensah',   'Endurance & Cardio Coach',      'Former marathon runner turned coach.',                           ARRAY['endurance'],                    4.7, 45, 'GH₵ 90',  '🏃', '233XXXXXXXXX', 'kofi@biggsfitness.com',  '+233 XX XXX XXXX'),
('Abena Osei',    'Beginner & Lifestyle Coach',    'Passionate about helping complete beginners build confidence.',  ARRAY['beginner','weight loss'],       5.0, 38, 'GH₵ 80',  '🌱', '233XXXXXXXXX', 'abena@biggsfitness.com', '+233 XX XXX XXXX'),
('Yaw Darko',     'Muscle & Hypertrophy Coach',    'Bodybuilding competitor with 8 years of coaching.',             ARRAY['muscle gain'],                  4.9, 72, 'GH₵ 140', '🏋️', '233XXXXXXXXX', 'yaw@biggsfitness.com',   '+233 XX XXX XXXX'),
('Efua Boateng',  'Holistic Fitness & Wellness',   'Combines strength, mobility and mindset coaching.',             ARRAY['beginner','endurance'],         4.8, 53, 'GH₵ 110', '🧘', '233XXXXXXXXX', 'efua@biggsfitness.com',  '+233 XX XXX XXXX');
 *