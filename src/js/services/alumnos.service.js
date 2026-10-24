import { supabase } from '../supabaseClient.js';
import { createService, unwrap } from './base.service.js';
import { ESTADOS_PAGO_VALIDOS, MODALIDADES_PAGO } from '../constants.js';

// Un alumno puede tener varios estilos (tabla alumnos_estilos, con baja lógica)
const SELECT = 'id, nombre, apellido, dni, celular, estado_pago, modalidad_pago, certificado_medico_url, activo, created_at, alumnos_estilos(estilo_id, activo, estilo:estilos_baile(id, nombre))';

const base = createService('alumnos', { select: SELECT, orderBy: 'apellido', ascending: true });

function validarEstado(estado) {
  if (!ESTADOS_PAGO_VALIDOS.includes(estado)) {
    throw new Error(`estado_pago inválido: "${estado}". Valores permitidos: ${ESTADOS_PAGO_VALIDOS.join(', ')}`);
  }
}

function validarModalidad(m) {
  if (!(m in MODALIDADES_PAGO)) throw new Error(`modalidad_pago inválida: "${m}". Valores permitidos: ${Object.keys(MODALIDADES_PAGO).join(', ')}`);
}

/** Agrega a.estilos (solo los activos) y a.estilo_ids para trabajar cómodo en el panel. */
function aplanar(a) {
  if (!a) return a;
  const estilos = (a.alumnos_estilos ?? []).filter((r) => r.activo && r.estilo).map((r) => r.estilo);
  return { ...a, estilos, estilo_ids: estilos.map((e) => e.id) };
}

/** Deja al alumno exactamente con `ids` como estilos activos (altas, bajas lógicas y reactivaciones). */
async function sincronizarEstilos(alumnoId, ids) {
  const quiero = new Set(ids.map(String));
  const filas = unwrap(await supabase.from('alumnos_estilos').select('estilo_id, activo').eq('alumno_id', alumnoId));
  const actuales = new Set(filas.filter((f) => f.activo).map((f) => String(f.estilo_id)));
  const quitar = [...actuales].filter((id) => !quiero.has(id));
  const agregar = [...quiero].filter((id) => !actuales.has(id));
  if (quitar.length) {
    unwrap(await supabase.from('alumnos_estilos').update({ activo: false }).eq('alumno_id', alumnoId).in('estilo_id', quitar));
  }
  if (agregar.length) {
    unwrap(await supabase.from('alumnos_estilos').upsert(
      agregar.map((estilo_id) => ({ alumno_id: alumnoId, estilo_id, activo: true })),
      { onConflict: 'alumno_id,estilo_id' }));
  }
}

async function leer(id) {
  return aplanar(unwrap(await supabase.from('alumnos').select(SELECT).eq('id', id).maybeSingle()));
}

export const alumnosService = {
  ...base,
  sincronizarEstilos,
  leer, // sin filtrar por activo

  async listar(opts) { return (await base.listar(opts)).map(aplanar); },

  /** Busca por DNI incluyendo alumnos inactivos (null si no existe). */
  async buscarPorDni(dni) {
    return aplanar(unwrap(await supabase.from('alumnos').select(SELECT).eq('dni', dni).maybeSingle()));
  },

  /** Alta: datos + estilo_ids (lista). Devuelve el alumno completo. */
  async crear({ estilo_ids = [], ...datos }) {
    const estado = datos.estado_pago ?? 'pendiente';
    validarEstado(estado);
    const modalidad = datos.modalidad_pago ?? 'mensual';
    validarModalidad(modalidad);
    const { id, activo, created_at, ...limpio } = datos;
    const fila = unwrap(await supabase.from('alumnos').insert({ ...limpio, estado_pago: estado, modalidad_pago: modalidad, activo: true }).select('id').single());
    if (estilo_ids.length) await sincronizarEstilos(fila.id, estilo_ids);
    return leer(fila.id);
  },

  /** Edita datos y estilos de CUALQUIER alumno (activo o no). No toca `activo`. */
  async editar(id, { estilo_ids, ...cambios }) {
    if (cambios.estado_pago !== undefined) validarEstado(cambios.estado_pago);
    if (cambios.modalidad_pago !== undefined) validarModalidad(cambios.modalidad_pago);
    const { id: _i, activo, created_at, estilos, alumnos_estilos, ...limpio } = cambios;
    unwrap(await supabase.from('alumnos').update(limpio).eq('id', id));
    if (estilo_ids) await sincronizarEstilos(id, estilo_ids);
    return leer(id);
  },

  /** Suma estilos al alumno sin quitarle los que ya tiene. */
  async agregarEstilos(id, nuevos) {
    const a = await leer(id);
    await sincronizarEstilos(id, [...a.estilo_ids, ...nuevos]);
    return leer(id);
  },

  /** Cambio rápido de estado de pago: 'pendiente' | 'abonado' | 'deuda'. */
  async cambiarEstadoPago(id, estado) {
    validarEstado(estado);
    return base.actualizar(id, { estado_pago: estado });
  },

  /** Alumnos activos de un estilo (para avisos en la pantalla de estilos). */
  async listarPorEstilo(estiloId) {
    return unwrap(await supabase.from('alumnos_estilos')
      .select('alumno_id, alumnos!inner(activo)')
      .eq('estilo_id', estiloId).eq('activo', true).eq('alumnos.activo', true));
  },

  /** Alumnos activos con celular cargado (base para recordatorios). */
  async listarParaRecordatorio() {
    return unwrap(await supabase.from('alumnos').select('id, nombre, apellido, celular')
      .eq('activo', true).not('celular', 'is', null).neq('celular', '').order('apellido'));
  }
};
