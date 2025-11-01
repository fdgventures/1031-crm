create table if not exists document_repositories (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id text not null,
  created_at timestamptz not null default now(),
  unique (entity_type, entity_id)
);

create table if not exists document_folders (
  id uuid primary key default gen_random_uuid(),
  repository_id uuid not null references document_repositories(id) on delete cascade,
  parent_id uuid references document_folders(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists document_files (
  id uuid primary key default gen_random_uuid(),
  folder_id uuid not null references document_folders(id) on delete cascade,
  name text not null,
  storage_path text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists document_folders_repository_idx on document_folders(repository_id);
create index if not exists document_folders_parent_idx on document_folders(parent_id);
create index if not exists document_files_folder_idx on document_files(folder_id);

create or replace function update_document_folder_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create or replace function update_document_file_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger document_folders_touch_updated_at
before update on document_folders
for each row execute function update_document_folder_timestamp();

create trigger document_files_touch_updated_at
before update on document_files
for each row execute function update_document_file_timestamp();
