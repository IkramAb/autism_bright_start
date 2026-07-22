-- ============================================================================
-- ABA Connect — staff directory & onboarding (HR data, full detail allowed)
-- Staff do NOT get system accounts. These rows are managed by admins only.
-- File uploads (certs, HR docs) live in Google Drive — store links, never bytes.
-- ============================================================================

create table public.staff (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  role text not null,                 -- display role, e.g. "RBT", "BCBA / QSP"
  role_type text,                     -- coarse grouping, e.g. "rbt", "bcba"
  email text,
  phone text,
  hired_on date,
  status staff_status not null default 'onboarding',
  background_study_number text,
  bcba_cert_number text,
  avatar_initials text,
  avatar_bg text,                     -- token name for initials chip background
  avatar_color text,
  notes text,
  drive_folder_id text,
  drive_folder_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_staff_updated_at
  before update on public.staff
  for each row execute function public.set_updated_at();

-- Per-staff onboarding checklist items (snapshot of template at assignment time).
create table public.staff_onboarding_items (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.staff (id) on delete cascade,
  template_item_id uuid references public.staff_checklist_template (id) on delete set null,
  label text not null,
  checklist_group staff_checklist_group not null,
  sort_order int not null default 0,
  done boolean not null default false,
  completed_on date,
  due_on date,
  locked boolean not null default false,
  lock_reason text,
  blocked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_staff_onboarding_updated_at
  before update on public.staff_onboarding_items
  for each row execute function public.set_updated_at();
create index idx_staff_onboarding_staff on public.staff_onboarding_items (staff_id);

-- The 7 required trainings tracked per staff (Training Tracker = flat all-staff view).
create table public.staff_trainings (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.staff (id) on delete cascade,
  name text not null,
  status training_status not null default 'pending',
  due_on date,
  completed_on date,
  cert_drive_file_id text,
  cert_drive_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_staff_trainings_updated_at
  before update on public.staff_trainings
  for each row execute function public.set_updated_at();
create index idx_staff_trainings_staff on public.staff_trainings (staff_id);

-- Pairing training is global/one-time for the whole org (not per staff).
create table public.global_training_status (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,           -- e.g. 'pairing_training'
  name text not null,
  completed boolean not null default false,
  completed_on date,
  completed_by uuid references public.admin_users (id),
  updated_at timestamptz not null default now()
);
create trigger trg_global_training_updated_at
  before update on public.global_training_status
  for each row execute function public.set_updated_at();

-- Background study steps (3 steps + the logged study number).
create table public.staff_background_checks (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.staff (id) on delete cascade,
  step background_step not null,
  status background_status not null default 'pending',
  completed_on date,
  note text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (staff_id, step)
);
create trigger trg_staff_bg_updated_at
  before update on public.staff_background_checks
  for each row execute function public.set_updated_at();

-- HR documents (offer letter, I-9, W-4, certs). Drive links + status only.
create table public.staff_documents (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.staff (id) on delete cascade,
  name text not null,
  status staff_doc_status not null default 'missing',
  submitted_on date,
  drive_file_id text,
  drive_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_staff_documents_updated_at
  before update on public.staff_documents
  for each row execute function public.set_updated_at();
create index idx_staff_documents_staff on public.staff_documents (staff_id);
