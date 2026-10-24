import { supabase } from '../supabaseClient.js';

export const BUCKET = 'certificados'; // bucket PRIVADO: el examen médico es un dato de salud
export const MAX_BYTES = 5 * 1024 * 1024;

/** Devuelve '' si el archivo sirve, o el motivo si no. */
export function validarArchivo(file) {
  if (!file) return '';
  if (!(file.type.startsWith('image/') || file.type === 'application/pdf')) return 'El examen médico debe ser una foto o un PDF.';
  if (file.size > MAX_BYTES) return 'El archivo supera los 5 MB.';
  return '';
}

/** Sube el archivo y devuelve la RUTA (se guarda en alumnos.certificado_medico_url). */
export async function subirCertificado(alumnoId, file) {
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
  const ruta = `${alumnoId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(ruta, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  return ruta;
}

/** Enlace temporal: para ver (10 min) o para descargar (1 min, con nombre de archivo). */
export async function urlFirmada(ruta, { descargar = false, nombre } = {}) {
  const { data, error } = await supabase.storage.from(BUCKET)
    .createSignedUrl(ruta, descargar ? 60 : 600, descargar ? { download: nombre || true } : undefined);
  if (error) throw error;
  return data.signedUrl;
}
