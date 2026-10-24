export const MENSAJE_RECORDATORIO = 'Recuerden que la cuota es del 1 al 10, pasado esa fecha se cobra un recargo del 15%.';

/**
 * Normaliza un celular argentino al formato de WhatsApp (549 + área + número, 10 dígitos locales).
 * Acepta: 11-5759-7489, 011 15 5759-7489, +54 9 11 5759 7489, etc. Devuelve '' si no es válido.
 */
export function normalizarCelular(celular) {
  let d = String(celular ?? '').replace(/\D/g, '').replace(/^00/, '');
  if (d.startsWith('54') && d.length > 10) d = d.slice(2);
  if (d.startsWith('9') && d.length === 11) d = d.slice(1);
  d = d.replace(/^0+/, '');
  if (d.length === 12) { // sacar el "15" que va después del código de área
    for (const a of [2, 3, 4]) {
      if (d.slice(a, a + 2) === '15') { d = d.slice(0, a) + d.slice(a + 2); break; }
    }
  }
  if (d.startsWith('15')) return ''; // empieza con 15: falta el código de área
  return d.length === 10 ? `549${d}` : '';
}

export function enlaceWhatsApp(celular, mensaje) {
  const n = normalizarCelular(celular);
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(mensaje)}` : '';
}

const porClase = (a) => a.modalidad_pago === 'por_clase';
const COBRO = 'Podés abonar por Mercado Pago (enviá el comprobante por acá) o en efectivo.';

/** Mensaje personalizado según estado de pago y modalidad (mensual / por clase). */
export function mensajePara(a) {
  const n = a.nombre;
  if (a.estado_pago === 'abonado') return `Hola ${n}! Gracias por tu pago, ¡nos vemos en clase!`;
  if (porClase(a)) return `Hola ${n}! Te escribimos de la academia: tenés clases pendientes de pago. ${COBRO} ¡Gracias!`;
  if (a.estado_pago === 'deuda') return `Hola ${n}! Te escribimos de la academia: figura una cuota adeudada. Recordá que pasado el día 10 se cobra un recargo del 15%. ${COBRO}`;
  return `Hola ${n}! Te recordamos que la cuota es del 1 al 10. Pasada esa fecha se cobra un recargo del 15%.`;
}

/** Para el envío masivo de "pago pendiente" desde el panel. */
export function mensajePagoPendiente(a) {
  if (porClase(a)) return `Hola ${a.nombre}! Te escribimos de la academia: tenés clases pendientes de pago. ${COBRO} ¡Gracias!`;
  return `Hola ${a.nombre}! Te escribimos de la academia: tenés el pago de la cuota pendiente. Recordá que es del 1 al 10 y, pasada esa fecha, se cobra un recargo del 15%. ${COBRO} ¡Gracias!`;
}

/** Bienvenida al dar de alta un alumno. `estilos` = lista de nombres. */
export function mensajeBienvenida(a, estilos = []) {
  const e = estilos.length ? ` Quedaste anotado/a en ${estilos.join(', ')}.` : '';
  const pago = porClase(a)
    ? 'Las clases se abonan el mismo día, en efectivo o por Mercado Pago.'
    : 'Recordá que la cuota se abona del 1 al 10 (pasada esa fecha hay un recargo del 15%) por Mercado Pago o en efectivo.';
  return `¡Hola ${a.nombre}! Te damos la bienvenida a la academia.${e} ${pago} ¡Cualquier consulta escribinos por acá!`;
}

/** Para el día 1 de cada mes: un enlace por alumno con celular. */
export function enlacesRecordatorio(alumnos) {
  return alumnos
    .map((alumno) => ({ alumno, url: enlaceWhatsApp(alumno.celular, MENSAJE_RECORDATORIO) }))
    .filter((x) => x.url);
}
