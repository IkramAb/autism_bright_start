-- ============================================================================
-- ABA Connect — clients, pipeline history, documents, e-signatures
-- ----------------------------------------------------------------------------
-- PHI MINIMIZATION IS ENFORCED HERE. A client is identified ONLY by ref_code.
-- age_label is a coarse, admin-entered display string (e.g. "Age 8") — never a
-- date of birth. There is intentionally no column for client name, DOB, guardian
-- contact, diagnosis, or any clinical content. Documents store Drive links +
-- status metadata only. If you are tempted to add such a column: stop.
-- ============================================================================

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  ref_code text not null unique,          -- e.g. "0142" (rendered as "Client #0142")
  age_label text,                         -- coarse only, e.g. "Age 8" — never a DOB
  aba_status aba_status not null default 'unknown',
  referral_source referral_source,
  ma_status ma_status not null default 'unknown',
  assigned_bcba_id uuid references public.staff (id) on delete set null,
  current_stage_id uuid references public.pipeline_stages (id),
  status client_status not null default 'onboarding',
  corrections_requested boolean not null default false,

  -- Pipeline timer anchors (dates only; turnaround windows are computed in app).
  phone_screen_due_on date,
  cmde_submitted_on date,                 -- starts the 5-day CMDE window
  itp_submitted_on date,                  -- starts the 14-day ITP approval window
  itp_drafting_started_on date,           -- drives escalating ITP drafting reminders

  -- Referral auto-assignment: the admin who worked the referral is logged here.
  handled_by_admin_id uuid references public.admin_users (id) on delete set null,

  -- Google Drive folder for this client (links only; no files in this system).
  drive_folder_id text,
  drive_folder_url text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_clients_updated_at
  before update on public.clients
  for each row execute function public.set_updated_at();
create index idx_clients_stage on public.clients (current_stage_id);
create index idx_clients_status on public.clients (status);

-- Stage history log with timestamps.
create table public.client_stage_history (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  stage_id uuid not null references public.pipeline_stages (id),
  entered_at timestamptz not null default now(),
  changed_by uuid references public.admin_users (id) on delete set null,
  note text
);
create index idx_stage_history_client on public.client_stage_history (client_id);

-- Operational, PHI-free admin notes. The UI must remind admins to keep these
-- free of any identifying or clinical information.
create table public.client_notes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  body text not null,
  created_by uuid references public.admin_users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index idx_client_notes_client on public.client_notes (client_id);

-- Per-client document tracker. Status + Drive links + expiry only.
-- "Expiring soon" / "Up to date" / "Overdue" are DERIVED from expires_on and the
-- matching renewal_rule at read time — they are not stored as status values.
create table public.client_documents (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  doc_type client_doc_type not null,
  status client_doc_status not null default 'missing',
  uploaded_on date,
  expires_on date,
  drive_file_id text,
  drive_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, doc_type)
);
create trigger trg_client_documents_updated_at
  before update on public.client_documents
  for each row execute function public.set_updated_at();
create index idx_client_documents_client on public.client_documents (client_id);
create index idx_client_documents_expires on public.client_documents (expires_on);

-- E-signature requests (DocSeal). The recipient's email is supplied at send-time
-- and passed straight to the provider — it is intentionally NOT persisted here,
-- because guardian contact info is PHI.
create table public.esign_requests (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  document_type esign_doc_type not null,
  provider text not null default 'docseal',
  external_id text,
  status esign_status not null default 'not_sent',
  sent_at timestamptz,
  signed_at timestamptz,
  signed_drive_file_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_esign_requests_updated_at
  before update on public.esign_requests
  for each row execute function public.set_updated_at();
create index idx_esign_client on public.esign_requests (client_id);

-- Google Drive "Watch" channels for folder change detection (status sync).
create table public.drive_watch_channels (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients (id) on delete cascade,
  channel_id text not null unique,
  resource_id text not null,
  resource_uri text,
  expiration timestamptz,
  created_at timestamptz not null default now()
);
