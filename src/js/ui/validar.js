/** DNI argentino: solo números, 7 u 8 dígitos. Devuelve '' si no es válido. */
export function normalizarDni(valor) {
  const d = String(valor ?? '').replace(/\D/g, '');
  return /^\d{7,8}$/.test(d) ? d : '';
}
