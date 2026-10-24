-- =====================================================================
-- Migración completa: DNI, varios estilos, modalidad de pago, precios y examen médico
-- Ejecutar UNA VEZ en Supabase → SQL Editor. Es seguro volver a correrla.
-- No borra datos. Las bajas siguen siendo lógicas (activo = false).
-- =====================================================================

-- 1) DNI del alumno (texto, solo números). Único cuando está cargado.
alter table public.alumnos add column if not exists dni text;
create unique index if not exists alumnos_dni_uidx on public.alumnos (dni) where dni is not null;

-- 2) Estilos por alumno (un alumno puede estar en varios estilos).
--    Los tipos de alumno_id / estilo_id se copian de tus tablas (bigint o uuid).
do $$
declare t_alumno text; t_estilo text;
begin
  select format_type(atttypid, atttypmod) into t_alumno
    from pg_attribute where attrelid = 'public.alumnos'::regclass and attname = 'id';
  select format_type(atttypid, atttypmod) into t_estilo
    from pg_attribute where attrelid = 'public.estilos_baile'::regclass and attname = 'id';
  execute format('create table if not exists public.alumnos_estilos (
    id bigint generated always as identity primary key,
    alumno_id %s not null references public.alumnos(id),
    estilo_id %s not null references public.estilos_baile(id),
    activo boolean not null default true,
    created_at timestamptz not null default now(),
    unique (alumno_id, estilo_id))', t_alumno, t_estilo);
end $$;

-- 3) Pasar el estilo que ya tenía cada alumno a la tabla nueva
insert into public.alumnos_estilos (alumno_id, estilo_id)
select id, estilo_id from public.alumnos where estilo_id is not null
on conflict (alumno_id, estilo_id) do nothing;

-- 4) RLS: solo usuarios autenticados; sin política de DELETE (baja lógica)
alter table public.alumnos_estilos enable row level security;
drop policy if exists "auth_select" on public.alumnos_estilos;
drop policy if exists "auth_insert" on public.alumnos_estilos;
drop policy if exists "auth_update" on public.alumnos_estilos;
create policy "auth_select" on public.alumnos_estilos for select to authenticated using (true);
create policy "auth_insert" on public.alumnos_estilos for insert to authenticated with check (true);
create policy "auth_update" on public.alumnos_estilos for update to authenticated using (true) with check (true);


-- 5) Modalidad de pago del alumno: mensual o por clase/día (se puede cambiar cuando quieran)
alter table public.alumnos add column if not exists modalidad_pago text not null default 'mensual';
alter table public.alumnos drop constraint if exists alumnos_modalidad_pago_check;
alter table public.alumnos add constraint alumnos_modalidad_pago_check check (modalidad_pago in ('mensual', 'por_clase'));

-- 6) Precios, días y horarios de cada estilo
alter table public.estilos_baile add column if not exists precio_clase numeric(10,2) check (precio_clase is null or precio_clase >= 0);
alter table public.estilos_baile add column if not exists precio_mensual numeric(10,2) check (precio_mensual is null or precio_mensual >= 0);
alter table public.estilos_baile add column if not exists dias_dictado text;
alter table public.estilos_baile add column if not exists horarios text;

-- 7) Examen médico: acá se guarda la RUTA del archivo dentro del bucket privado "certificados"
alter table public.alumnos add column if not exists certificado_medico_url text;

-- 8) Supabase Storage: bucket PRIVADO (son datos de salud). Se ven con enlaces firmados temporales.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('certificados', 'certificados', false, 5242880,
        array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'])
on conflict (id) do update set public = false, file_size_limit = 5242880,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "certificados_select" on storage.objects;
drop policy if exists "certificados_insert" on storage.objects;
drop policy if exists "certificados_update" on storage.objects;
create policy "certificados_select" on storage.objects for select to authenticated using (bucket_id = 'certificados');
create policy "certificados_insert" on storage.objects for insert to authenticated with check (bucket_id = 'certificados');
create policy "certificados_update" on storage.objects for update to authenticated using (bucket_id = 'certificados') with check (bucket_id = 'certificados');
-- Sin política de DELETE: los archivos no se pueden borrar desde el panel.

-- La columna vieja alumnos.estilo_id queda sin usar (podés borrarla más adelante).
