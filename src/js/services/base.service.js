import { supabase } from '../supabaseClient.js';

/** Devuelve `data` o lanza el error de Supabase. */
export function unwrap({ data, error }) {
  if (error) throw error;
  return data;
}

/**
 * Fábrica de servicios CRUD con borrado lógico.
 * - Las lecturas filtran activo = true (salvo que se pida lo contrario).
 * - No existe método de DELETE físico: `desactivar` hace UPDATE activo = false.
 */
export function createService(table, { select = '*', orderBy = 'created_at', ascending = false } = {}) {
  return {
    table,
    select,

    /** Lista registros. Por defecto solo activos. */
    async listar({ incluirInactivos = false } = {}) {
      let query = supabase.from(table).select(select).order(orderBy, { ascending });
      if (!incluirInactivos) query = query.eq('activo', true);
      return unwrap(await query);
    },

    /** Obtiene un registro activo por id (null si no existe o está dado de baja). */
    async obtener(id) {
      return unwrap(
        await supabase.from(table).select(select).eq('id', id).eq('activo', true).maybeSingle()
      );
    },

    /** Crea un registro (siempre nace activo). */
    async crear(datos) {
      const { id, activo, created_at, ...limpio } = datos;
      return unwrap(
        await supabase.from(table).insert({ ...limpio, activo: true }).select(select).single()
      );
    },

    /** Actualiza campos de un registro activo. No permite tocar id/activo desde acá. */
    async actualizar(id, cambios) {
      const { id: _id, activo, created_at, ...limpio } = cambios;
      return unwrap(
        await supabase.from(table).update(limpio).eq('id', id).eq('activo', true).select(select).single()
      );
    },

    /** Baja lógica: activo = false. */
    async desactivar(id) {
      return unwrap(
        await supabase.from(table).update({ activo: false }).eq('id', id).select(select).single()
      );
    },

    /** Deshace una baja lógica. */
    async reactivar(id) {
      return unwrap(
        await supabase.from(table).update({ activo: true }).eq('id', id).select(select).single()
      );
    }
  };
}
