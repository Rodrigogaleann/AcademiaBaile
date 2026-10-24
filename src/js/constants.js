// Estados de pago permitidos (deben coincidir con el CHECK/enum de la BD).
export const ESTADOS_PAGO = Object.freeze({
  pendiente: { label: 'Pendiente', color: '#F59E0B' }, // naranja
  abonado:   { label: 'Abonado',   color: '#22C55E' }, // verde
  deuda:     { label: 'Adeudado',     color: '#EF4444' }  // rojo
});

export const ESTADOS_PAGO_VALIDOS = Object.keys(ESTADOS_PAGO);

// Modalidad de pago del alumno (debe coincidir con el CHECK de la base)
export const MODALIDADES_PAGO = Object.freeze({
  mensual:   { label: 'Mensual' },
  por_clase: { label: 'Por clase / día' }
});
