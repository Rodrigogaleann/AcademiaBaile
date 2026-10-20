import { initFadeIn } from './ui/fadeIn.js';
import { magnet } from './ui/magnet.js';
import { initScrollEffects } from './ui/scrollEffects.js';

// ====== EDITAR ACÁ ======
const WHATSAPP = '549XXXXXXXXXX'; // código de país + área + número, sin signos
const MENSAJE = 'Hola! Quiero reservar una clase de prueba';
const INSTAGRAM = 'https://instagram.com/tu_academia';
const FACEBOOK = 'https://facebook.com/tu.academia';
const img = (n) => `assets/img/galeria-${n}.jpg`;

// CIFRAS DE EJEMPLO: reemplazar por las reales (la de estilos se calcula sola)
const STATS = [{ n: 500, s: '+', l: 'alumnos' }, { n: 8, s: '', l: 'años bailando' }];
const FILAS = [[1, 5, 3, 8, 2, 6, 4, 7], [7, 2, 8, 4, 6, 1, 3, 5]];

const ESTILOS_DEMO = [
  { nombre: 'Hip hop', descripcion: 'Energía, ritmo y actitud. Aprendé pasos, coreografías y freestyle.' },
  { nombre: 'Ballet', descripcion: 'Técnica, postura y elegancia para todos los niveles.' },
  { nombre: 'Jazz', descripcion: 'Movimiento expresivo que combina técnica clásica y ritmos modernos.' },
  { nombre: 'Salsa', descripcion: 'Baile en pareja para soltarte y pasarla bien desde la primera clase.' },
  { nombre: 'Reggaetón', descripcion: 'Coreografías actuales para bailar los temas del momento.' }
];
const CLASES = [
  { categoria: 'De 4 a 7 años', nombre: 'Mini bailarines', fotos: [3, 5, 8] },
  { categoria: 'De 8 a 15 años', nombre: 'Juveniles', fotos: [2, 7, 1] },
  { categoria: 'Desde 16 años', nombre: 'Adultos', fotos: [4, 6, 8] }
];
const I = {
  prof: '<svg viewBox="0 0 48 48"><circle cx="24" cy="16" r="9" class="d1"/><path d="M6 44c1-11 9-16 18-16s17 5 18 16z" class="d2"/></svg>',
  edades: '<svg viewBox="0 0 48 48"><circle cx="17" cy="24" r="13" class="d1"/><circle cx="32" cy="28" r="10" class="d2"/></svg>',
  prueba: '<svg viewBox="0 0 48 48"><path d="M4 12h40v8a4 4 0 0 0 0 8v8H4v-8a4 4 0 0 0 0-8z" class="d1"/><path d="M30 12v24" class="d3"/></svg>',
  estilo: '<svg viewBox="0 0 48 48"><circle cx="24" cy="12" r="8" class="d1"/><circle cx="11" cy="34" r="8" class="d2"/><circle cx="37" cy="34" r="8" class="d1"/></svg>'
};
const BENEFICIOS = [
  { i: 'prof', t: 'Profesores que te acompañan', d: 'Clases guiadas paso a paso, atentas a tu ritmo y a tu nivel.' },
  { i: 'edades', t: 'Para todas las edades', d: 'Grupos de chicos, jóvenes y adultos.' },
  { i: 'prueba', t: 'Probá antes de decidir', d: 'Reservá una clase de prueba y conocé la academia.' },
  { i: 'estilo', t: 'Un estilo para cada uno', d: 'Hip hop, ballet y más: elegí el que va con vos.' }
];
// RESEÑAS DE EJEMPLO: reemplazar por opiniones reales de tus alumnos antes de publicar
const TESTIMONIOS = [
  { n: 'Lucía M.', r: 'Alumna de hip hop', t: 'Llegué sin experiencia y a las pocas clases ya me sentía parte del grupo.' },
  { n: 'Marcos P.', r: 'Papá de una alumna', t: 'Mi hija espera la clase toda la semana. Los profesores tienen mucha paciencia.' },
  { n: 'Camila R.', r: 'Alumna de ballet', t: 'Me ayudaron a mejorar la técnica sin presión. Un lugar muy cálido.' }
];
const FAQ = [
  { q: '¿Puedo hacer una clase de prueba?', a: 'Sí. Escribinos por WhatsApp y coordinamos tu clase de prueba.' },
  { q: '¿Hace falta experiencia previa?', a: 'No. Hay grupos para cada nivel, desde principiantes.' },
  { q: '¿Desde qué edad se puede bailar?', a: 'Tenemos grupos para chicos, jóvenes y adultos. Consultanos por tu edad.' },
  { q: '¿Cuándo se paga la cuota?', a: 'La cuota se abona del 1 al 10 de cada mes. Pasada esa fecha se cobra un recargo del 15%.' },
  { q: '¿Cómo puedo pagar?', a: 'Por Mercado Pago (enviás el comprobante por WhatsApp) o en efectivo.' },
  { q: '¿Qué estilos puedo elegir?', a: 'Hip hop, ballet y más. Mirá la sección de estilos o consultanos.' }
];
// ========================

const $ = (s) => document.querySelector(s);
const el = (tag, cls, txt) => { const n = document.createElement(tag); if (cls) n.className = cls; if (txt !== undefined) n.textContent = txt; return n; };
const foto = (n, cls) => Object.assign(el('img', cls), { src: img(n), alt: '', loading: 'lazy' });
const fade = (n, delay = 0) => { n.dataset.fade = ''; n.dataset.delay = delay; return n; };

// Enlaces: WhatsApp y redes
const wa = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(MENSAJE)}`;
document.querySelectorAll('[data-wa]').forEach((a) => (a.href = wa));
document.querySelectorAll('[data-ig]').forEach((a) => (a.href = INSTAGRAM));
document.querySelectorAll('[data-fb]').forEach((a) => (a.href = FACEBOOK));
$('#anio').textContent = new Date().getFullYear();

// Nav: transparente → sólida
const nav = $('#nav');
const navScroll = () => nav.classList.toggle('nav--solid', scrollY > 40);
addEventListener('scroll', navScroll, { passive: true }); navScroll();

// Menú móvil
const toggle = $('#nav-toggle');
const cerrarMenu = () => { nav.classList.remove('nav--abierto'); toggle.setAttribute('aria-expanded', 'false'); };
toggle.addEventListener('click', () => {
  const abierto = nav.classList.toggle('nav--abierto');
  toggle.setAttribute('aria-expanded', abierto);
  toggle.setAttribute('aria-label', abierto ? 'Cerrar menú' : 'Abrir menú');
});
document.querySelectorAll('.nav__links a:not(.red)').forEach((a) => a.addEventListener('click', cerrarMenu));
addEventListener('resize', () => innerWidth > 760 && cerrarMenu());

// Video del hero en loop. En celular vertical prueba primero hero-vertical.mp4 y, si no existe, usa hero.mp4.
const video = $('#heroVideo'), page = $('.page');
const fuentes = matchMedia('(max-width: 760px)').matches
  ? ['assets/video/hero-vertical.mp4', 'assets/video/hero.mp4'] : ['assets/video/hero.mp4'];
let fuente = 0;
function probarFuente() {
  if (fuente >= fuentes.length) { // ninguna cargó: volver a la foto
    page.classList.remove('con-video');
    document.querySelector('img.hero__img').hidden = false;
    video.remove();
    return;
  }
  video.src = fuentes[fuente++];
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) video.play().catch(() => {});
}
video.addEventListener('error', probarFuente);
probarFuente();
if (matchMedia('(prefers-reduced-motion: reduce)').matches) { video.removeAttribute('autoplay'); video.pause(); }

// Marquee (cada fila triplicada)
document.querySelectorAll('.marquee__row').forEach((row, i) => {
  for (let k = 0; k < 3; k++) FILAS[i].forEach((n) => row.append(foto(n, 'tile')));
});

// Beneficios (bento)
BENEFICIOS.forEach((b, i) => {
  const c = el('article', 'bn'); fade(c, i * 0.1);
  const ico = el('div', 'bn__ico'); ico.innerHTML = I[b.i]; ico.setAttribute('aria-hidden', 'true');
  const box = el('div'); box.append(el('h3', '', b.t), el('p', '', b.d));
  c.append(ico, box); $('#bento').append(c);
});

// Testimonios
const estrella = '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M10 1l2.6 5.6 6.1.7-4.5 4.2 1.2 6L10 14.5 4.6 17.5l1.2-6L1.300 7.300l6.100-.7z"/></svg>';
TESTIMONIOS.forEach((t, i) => {
  const c = el('figure', 'testi'); fade(c, i * 0.12);
  const st = el('div', 'estrellas'); st.innerHTML = estrella.repeat(5); st.setAttribute('aria-label', '5 de 5 estrellas');
  const au = el('figcaption', 'testi__autor');
  const info = el('div'); info.append(el('div', 'testi__nombre', t.n), el('div', 'testi__rol', t.r));
  au.append(el('span', 'avatar', t.n[0]), info);
  c.append(st, el('blockquote', 'testi__txt', t.t), au); $('#testis').append(c);
});

// FAQ (acordeón accesible)
FAQ.forEach((f, i) => {
  const it = el('div', 'faq__item'); fade(it, i * 0.06);
  const q = el('button', 'faq__q', f.q); q.type = 'button';
  q.setAttribute('aria-expanded', 'false'); q.id = `q${i}`; q.setAttribute('aria-controls', `a${i}`);
  const a = el('div', 'faq__a'); a.id = `a${i}`; a.setAttribute('role', 'region'); a.setAttribute('aria-labelledby', q.id);
  const w = el('div'); w.append(el('p', '', f.a)); a.append(w);
  q.addEventListener('click', () => q.setAttribute('aria-expanded', q.getAttribute('aria-expanded') !== 'true'));
  it.append(q, a); $('#faq-lista').append(it);
});

// Clases apiladas
CLASES.forEach((c, i) => {
  const item = el('div', 'stack__item'), sticky = el('div', 'stack__sticky'), card = el('article', 'card');
  card.style.top = `${i * 28}px`;
  const top = el('div', 'card__top'), id = el('div', 'card__id'), datos = el('div');
  datos.append(el('p', 'card__cat', c.categoria), el('h3', 'card__name', c.nombre));
  id.append(el('span', 'num', String(i + 1).padStart(2, '0')), datos);
  const btn = el('a', 'btn-ghost', 'Reservar clase'); btn.href = wa; btn.target = '_blank'; btn.rel = 'noopener';
  top.append(id, btn);
  const grid = el('div', 'card__grid'), c1 = el('div', 'card__col card__col--izq'), c2 = el('div', 'card__col card__col--der');
  c1.append(foto(c.fotos[0], 'card__img card__img--a'), foto(c.fotos[1], 'card__img card__img--b'));
  c2.append(foto(c.fotos[2], 'card__img card__img--tall'));
  grid.append(c1, c2); card.append(top, grid); sticky.append(card); item.append(sticky); $('.stack').append(item);
});

// Cifras animadas (count-up)
function contar(node, destino, sufijo) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) { node.textContent = destino + sufijo; return; }
  const t0 = performance.now(), dur = 1600;
  const paso = (t) => {
    const p = Math.min(1, (t - t0) / dur);
    node.textContent = Math.round(destino * (1 - Math.pow(1 - p, 3))) + (p === 1 ? sufijo : '');
    if (p < 1) requestAnimationFrame(paso);
  };
  requestAnimationFrame(paso);
}
function pintarStats(estilos) {
  const cont = $('#stats'); cont.replaceChildren();
  [...STATS, { n: estilos, s: '', l: 'estilos de baile' }].forEach((s) => {
    const d = el('div'), n = el('span', 'stat__n', '0');
    d.append(n, el('span', 'stat__l', s.l)); cont.append(d);
    setTimeout(() => contar(n, s.n, s.s), 900);
  });
}

// Estilos: Supabase (estilos_baile activos) con respaldo de ejemplo
async function cargarEstilos() {
  try {
    const { SUPABASE_URL } = await import('./config.js');
    if (!SUPABASE_URL || SUPABASE_URL.includes('TU-PROYECTO')) return ESTILOS_DEMO;
    const { estilosService } = await import('./services/estilos.service.js');
    const data = await estilosService.listar();
    return data.length ? data : ESTILOS_DEMO;
  } catch { return ESTILOS_DEMO; }
}

initFadeIn();
magnet($('.hero__stage'), { padding: 150, strength: 18 });
document.querySelectorAll('.hero__actions .btn, .btn-contact').forEach((b) => magnet(b, { padding: 80, strength: 4 }));
initScrollEffects();

const estilos = await cargarEstilos();
pintarStats(estilos.length);
const lista = $('.estilos__lista');
estilos.forEach((e, i) => {
  const li = el('li', 'estilo'); fade(li, i * 0.1);
  const txt = el('div'); txt.append(el('h3', 'estilo__nombre', e.nombre));
  if (e.descripcion) txt.append(el('p', 'estilo__desc', e.descripcion));
  li.append(el('span', 'num', String(i + 1).padStart(2, '0')), txt); lista.append(li);
});
initFadeIn(lista);
