import { supabase } from '../supabaseClient.js';
import { createService, unwrap } from './base.service.js';

const base = createService('profesores', {
  select: 'id, nombre, apellido, dni, celular, email, activo, created_at',
  orderBy: 'apellido',
  ascending: true
});

export const profesoresService = {
  ...base,

  /** Busca un profesor activo por DNI. */
  async buscarPorDni(dni) {
    return unwrap(
      await supabase.from('profesores').select(base.select).eq('dni', dni).eq('activo', true).maybeSingle()
    );
  }
};
