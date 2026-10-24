const moneda = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 });

/** 12000 → "$ 12.000,00" · null → "—" */
export function formatearPrecio(n) {
  return n === null || n === undefined || n === '' ? '—' : moneda.format(Number(n));
}

/** "12.000,50" / "12000.5" / "" → número, null (vacío) o NaN (inválido). */
export function parsearPrecio(v) {
  const t = String(v ?? '').trim();
  if (!t) return null;
  const n = Number(t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t);
  return Number.isFinite(n) && n >= 0 ? n : NaN;
}
