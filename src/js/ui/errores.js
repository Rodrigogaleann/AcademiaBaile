// Traduce errores de Supabase/PostgREST a mensajes que se entiendan en pantalla.
export function describirError(e) {
  const c = e?.code, m = e?.message ?? String(e), d = e?.details ? ` (${e.details})` : '';
  if (/bucket not found/i.test(m)) return 'Falta el bucket "certificados" en Storage: ejecutá sql/migracion-completa.sql en Supabase.';
  if (!c && /row-level security|not authorized|unauthorized|violates/i.test(m)) return 'Sin permiso para guardar el archivo (Storage): revisá las políticas del bucket "certificados".';
  const mapa = {
    '42501': 'Sin permiso (RLS): falta una política para usuarios "authenticated" en esta tabla (INSERT, UPDATE o SELECT).',
    '23502': `Falta un dato obligatorio en la base: ${m}${d}`,
    '23503': `Referencia inválida (por ejemplo un estilo que no existe): ${m}${d}`,
    '23505': /dni/i.test(m) ? 'Ese DNI ya está ingresado en el sistema.' : `Ya existe un registro con ese dato: ${m}${d}`,
    '42703': `Falta una columna en la base (¿ejecutaste sql/migracion-alumnos.sql?): ${m}`,
    '42P01': `Falta una tabla en la base (¿ejecutaste sql/migracion-alumnos.sql?): ${m}`,
    'PGRST200': 'Falta la tabla alumnos_estilos: ejecutá sql/migracion-alumnos.sql en Supabase.',
    '23514': `Valor no permitido por la base: ${m}${d}`,
    '22P02': `Formato inválido de un dato: ${m}${d}`,
    'PGRST116': 'No se encontró el registro (o no tenés permiso para verlo).'
  };
  return mapa[c] ?? `Error${c ? ` ${c}` : ''}: ${m}${d}`;
}
