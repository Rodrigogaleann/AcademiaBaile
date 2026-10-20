import { supabase } from './supabaseClient.js';

const MENSAJES = {
  'Invalid login credentials': 'Email o contraseña incorrectos.',
  'Email not confirmed': 'Tenés que confirmar tu email antes de ingresar.'
};

/** Inicia sesión con email y contraseña. Devuelve la sesión o lanza un Error legible. */
export async function iniciarSesion(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(MENSAJES[error.message] ?? error.message);
  return data.session;
}

/** Cierra la sesión y vuelve al login. */
export async function cerrarSesion() {
  await supabase.auth.signOut();
  location.replace('login.html');
}

/** Guard de rutas: devuelve la sesión o redirige al login (y devuelve null). */
export async function requireSession(login = 'login.html') {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session) {
    location.replace(login);
    return null;
  }
  // Si la sesión se cierra en otra pestaña o el token deja de ser válido, volver al login
  supabase.auth.onAuthStateChange((evento) => {
    if (evento === 'SIGNED_OUT') location.replace(login);
  });
  return session;
}

/** Para el login: si ya hay sesión, ir directo al panel. */
export async function redirigirSiHaySesion(destino = 'dashboard.html') {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) location.replace(destino);
}
