import { supabase } from '../supabaseClient.js';
import { createService, unwrap } from './base.service.js';
import { ESTADOS_PAGO_VALIDOS } from '../constants.js';

// Trae también el estilo de baile (join por estilo_id).
const SELECT = 'id, nombre, apellido, celular, estilo_id, estado_pago, activo, created_at, estilo:estilos_baile(id, nombre)';

const base = createService('alumnos', {
  select: SELECT,
  orderBy: 'apellido',
  ascending: true
});

function validarEstado(estado) {
  if (!ESTADOS_PAGO_VALIDOS.includes(estado)) {
    throw new Error(`estado_pago inválido: "${estado}". Valores permitidos: ${ESTADOS_PAGO_VALIDOS.join(', ')}`);
  }
}

export const alumnosService = {
  ...base,

  /** Crea un alumno validando el estado de pago (por defecto 'pendiente'). */
  async crear(datos) {
    const estado = datos.estado_pago ?? 'pendiente';
    validarEstado(estado);
    return base.crear({ ...datos, estado_pago: estado });
  },

  async actualizar(id, cambios) {
    if (cambios.estado_pago !== undefined) validarEstado(cambios.estado_pago);
    return base.actualizar(id, cambios);
  },

  /** Cambio rápido de estado de pago: 'pendiente' | 'abonado' | 'deuda'. */
  async cambiarEstadoPago(id, estado) {
    validarEstado(estado);
    return base.actualizar(id, { estado_pago: estado });
  },

  /** Alumnos activos de un estilo. */
  async listarPorEstilo(estiloId) {
    return unwrap(
      await supabase.from('alumnos').select(SELECT).eq('activo', true).eq('estilo_id', estiloId).order('apellido')
    );
  },

  /** Alumnos activos filtrados por estado de pago. */
  async listarPorEstadoPago(estado) {
    validarEstado(estado);
    return unwrap(
      await supabase.from('alumnos').select(SELECT).eq('activo', true).eq('estado_pago', estado).order('apellido')
    );
  },

  /** Alumnos activos con celular cargado (base para los recordatorios de WhatsApp). */
  async listarParaRecordatorio() {
    return unwrap(
      await supabase
        .from('alumnos')
        .select('id, nombre, apellido, celular')
        .eq('activo', true)
        .not('celular', 'is', null)
        .neq('celular', '')
        .order('apellido')
    );
  }
};
