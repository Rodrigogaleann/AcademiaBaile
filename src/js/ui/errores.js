// Traduce errores de Supabase/PostgREST a mensajes que se entiendan en pantalla.
export function describirError(e) {
  const c = e?.code, m = e?.message ?? String(e), d = e?.details ? ` (${e.details})` : '';
  const mapa = {
    '42501': 'Sin permiso (RLS): falta una política para usuarios "authenticated" en esta tabla (INSERT, UPDATE o SELECT).',
    '23502': `Falta un dato obligatorio en la base: ${m}${d}`,
    '23503': `Referencia inválida (por ejemplo un estilo que no existe): ${m}${d}`,
    '23505': `Ya existe un registro con ese dato: ${m}${d}`,
    '23514': `Valor no permitido por la base: ${m}${d}`,
    '22P02': `Formato inválido de un dato: ${m}${d}`,
    'PGRST116': 'No se encontró el registro (o no tenés permiso para verlo).'
  };
  return mapa[c] ?? `Error${c ? ` ${c}` : ''}: ${m}${d}`;
}
