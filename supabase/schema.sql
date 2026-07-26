-- Remi MVP schema (V1 core scope)
-- Run in the Supabase SQL editor or via the Supabase CLI.

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid references auth.users(id) on delete cascade,
  full_name text,
  date_of_birth date,
  phone text,
  language text default 'en',
  consent_health_data boolean default false,
  consent_terms boolean default false,
  hospital_id text, -- optional, never required
  created_at timestamptz default now()
);

create table if not exists symptom_episodes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  description text,
  urgency text check (urgency in ('normal','monitor','urgent')),
  doctor_recommended boolean default false,
  outcome text, -- filled in after post-visit follow-up
  photo_path text, -- storage path in the 'symptom-photos' bucket, if any
  body_location text, -- confirmed location tag only, never a visual description
  created_at timestamptz default now()
);

-- Run this once via the Supabase dashboard (Storage > New bucket),
-- or via the CLI: keep it PRIVATE, not public, since these are
-- symptom photos. Signed URLs (created in symptom-media.service.ts)
-- are how the app reads them back.
-- Bucket name: symptom-photos

create table if not exists medications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  name text not null,
  dose text,
  frequency text,
  time_of_day text,
  source text default 'manual', -- 'manual' | 'ocr'
  prescription_image_url text,
  created_at timestamptz default now()
);

create table if not exists medication_logs (
  id uuid primary key default gen_random_uuid(),
  medication_id uuid references medications(id) on delete cascade,
  taken_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists vitals_readings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  systolic int,
  diastolic int,
  glucose numeric,
  tier text check (tier in ('normal','monitor','urgent')),
  created_at timestamptz default now()
);

create table if not exists lab_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  test_type text,
  file_url text,
  extracted_summary text,
  created_at timestamptz default now()
);

create table if not exists allergies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  substance text not null
);

create table if not exists emergency_info (
  user_id uuid primary key references users(id) on delete cascade,
  blood_type text,
  allergies_text text,
  medications_text text,
  emergency_contact_name text,
  emergency_contact_phone text
);

create table if not exists access_logs (
  id uuid primary key default gen_random_uuid(),
  resource text not null,
  action text not null,
  actor text not null, -- 'admin' for now; expand to per-person once not solo
  created_at timestamptz default now()
);

create table if not exists sample_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  sample_type text check (sample_type in ('urine','stool')),
  photo_path text, -- storage path in the 'sample-photos' bucket (PRIVATE)
  description text, -- encrypted (see EncryptionService)
  danger_sign_detected boolean default false,
  created_at timestamptz default now()
);
alter table sample_photos enable row level security;
create policy "Users can manage own sample photos" on sample_photos
  for all using (user_id in (select id from users where auth_user_id = auth.uid()));

create table if not exists lifestyle_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  entry_type text check (entry_type in ('sleep','activity','weight','substance_use')),
  data jsonb, -- shape varies by entry_type (hours/quality, activityType/minutes, weightKg/heightCm/bmi, substance)
  note text, -- encrypted; used for substance_use free-text notes
  created_at timestamptz default now()
);
alter table lifestyle_entries enable row level security;
create policy "Users can manage own lifestyle entries" on lifestyle_entries
  for all using (user_id in (select id from users where auth_user_id = auth.uid()));

create table if not exists cycle_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  start_date date not null,
  end_date date,
  flow text, -- 'light' | 'medium' | 'heavy'
  symptoms text, -- encrypted
  created_at timestamptz default now()
);
alter table cycle_entries enable row level security;
create policy "Users can manage own cycle entries" on cycle_entries
  for all using (user_id in (select id from users where auth_user_id = auth.uid()));

create table if not exists menopause_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  hot_flashes boolean default false,
  mood_note text, -- encrypted
  sleep_disruption boolean default false,
  created_at timestamptz default now()
);
alter table menopause_entries enable row level security;
create policy "Users can manage own menopause entries" on menopause_entries
  for all using (user_id in (select id from users where auth_user_id = auth.uid()));

create table if not exists tracked_conditions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  condition text not null, -- 'sickle_cell' | 'hiv_art_adherence' | 'asthma' | 'kidney' | 'cholesterol' | 'thyroid'
  enabled boolean default true,
  created_at timestamptz default now(),
  unique (user_id, condition)
);
alter table tracked_conditions enable row level security;
create policy "Users can manage own tracked conditions" on tracked_conditions
  for all using (user_id in (select id from users where auth_user_id = auth.uid()));

create table if not exists pain_crises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  severity int check (severity between 1 and 10),
  trigger_note text, -- encrypted
  location text,
  tier text check (tier in ('normal','urgent')),
  created_at timestamptz default now()
);
alter table pain_crises enable row level security;
create policy "Users can manage own pain crises" on pain_crises
  for all using (user_id in (select id from users where auth_user_id = auth.uid()));

create table if not exists imaging_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  kind text check (kind in ('report_text','scan_image')),
  scan_type text, -- e.g. 'CT', 'MRI', 'X-ray', 'Ultrasound' (user-labeled)
  photo_path text, -- storage path in the 'imaging-files' bucket (PRIVATE)
  explanation text, -- encrypted; NULL for kind='scan_image' since those are never interpreted
  created_at timestamptz default now()
);
alter table imaging_records enable row level security;
create policy "Users can manage own imaging records" on imaging_records
  for all using (user_id in (select id from users where auth_user_id = auth.uid()));

-- Bucket name: imaging-files (PRIVATE)

-- Bucket name: sample-photos (PRIVATE, same as symptom-photos)

-- Row-level security: every table scoped so a user can only ever
-- read/write their own rows. Enforced at the database layer, not
-- just in application code.
alter table users enable row level security;
alter table symptom_episodes enable row level security;
alter table medications enable row level security;
alter table medication_logs enable row level security;
alter table vitals_readings enable row level security;
alter table lab_reports enable row level security;
alter table allergies enable row level security;
alter table emergency_info enable row level security;

create policy "Users can view own row" on users
  for select using (auth.uid() = auth_user_id);

create policy "Users can manage own symptom episodes" on symptom_episodes
  for all using (user_id in (select id from users where auth_user_id = auth.uid()));

create policy "Users can manage own medications" on medications
  for all using (user_id in (select id from users where auth_user_id = auth.uid()));

create policy "Users can manage own vitals" on vitals_readings
  for all using (user_id in (select id from users where auth_user_id = auth.uid()));

create policy "Users can manage own lab reports" on lab_reports
  for all using (user_id in (select id from users where auth_user_id = auth.uid()));

create policy "Users can manage own allergies" on allergies
  for all using (user_id in (select id from users where auth_user_id = auth.uid()));

create policy "Users can manage own emergency info" on emergency_info
  for all using (user_id in (select id from users where auth_user_id = auth.uid()));
