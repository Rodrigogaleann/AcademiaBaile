import { requireSession, cerrarSesion } from './auth.js';
import { alumnosService } from './services/alumnos.service.js';
import { estilosService } from './services/estilos.service.js';
import { ESTADOS_PAGO } from './constants.js';
import { enlaceWhatsApp, mensajePara, mensajePagoPendiente, normalizarCelular } from './modules/whatsapp.js';
import { describirError } from './ui/errores.js';

const $ = (s) => document.querySelector(s);
let alumnos = [], estilos = [], texto = '', filtro = 'todos', tab = 'todos', activoF = 'todos', editando = null;
const sel = new Set(); // ids tildados (solo alumnos activos)

function mostrarError(e) {
  console.error(e);
  const aviso = $('#aviso');
  aviso.textContent = describirError(e);
  aviso.hidden = false;
}
const ocultarError = () => ($('#aviso').hidden = true);
const ico = (id) => `<svg class="ico"><use href="#${id}"/></svg>`;

function pintarResumen() {
  const act = alumnos.filter((a) => a.activo);
  $('#r-total').textContent = act.length;
  Object.keys(ESTADOS_PAGO).forEach((k) => ($(`#r-${k}`).textContent = act.filter((a) => a.estado_pago === k).length));
}

// Desplegable de estilos: "Todos" + un estilo por cada registro activo de estilos_baile
function pintarFiltroEstilo() {
  const base = alumnos.filter((a) => activoF === 'todos' || (activoF === 'activos') === a.activo);
  const selector = $('#filtro-estilo');
  selector.replaceChildren(
    new Option(`Todos los estilos (${base.length})`, 'todos'),
    ...estilos.map((e) => new Option(`${e.nombre} (${base.filter((a) => String(a.estilo_id) === String(e.id)).length})`, String(e.id)))
  );
  selector.value = tab;
}

function visibles() {
  const t = texto.toLowerCase();
  return alumnos.filter((a) =>
    (tab === 'todos' || String(a.estilo_id) === tab) &&
    (activoF === 'todos' || (activoF === 'activos') === a.activo) &&
    (filtro === 'todos' || a.estado_pago === filtro) &&
    `${a.nombre} ${a.apellido} ${a.celular ?? ''}`.toLowerCase().includes(t)
  ).sort((x, y) => Number(y.activo) - Number(x.activo)); // activos primero
}

// Barra de selección: "Tildar todos" solo considera alumnos activos
function actualizarSeleccion() {
  const sele = visibles().filter((a) => a.activo), n = sele.filter((a) => sel.has(a.id)).length, total = sel.size;
  const todos = $('#sel-todos');
  todos.checked = sele.length > 0 && n === sele.length;
  todos.indeterminate = n > 0 && n < sele.length;
  todos.disabled = sele.length === 0;
  $('#sel-cuenta').textContent = total ? `${total} seleccionado${total > 1 ? 's' : ''}` : '';
  $('#enviar-masivo').hidden = total === 0;
  $('#limpiar-sel').hidden = total === 0;
  document.querySelectorAll('#alumnos tr').forEach((tr) => tr.classList.toggle('sel', sel.has(tr.dataset.id)));
}

function celda(txt, clase, etiqueta) {
  const td = document.createElement('td');
  td.textContent = txt;
  if (clase) td.className = clase;
  if (etiqueta) td.dataset.label = etiqueta;
  return td;
}

async function cambiarActivo(a, input, valor) {
  input.disabled = true;
  try {
    if (valor) await alumnosService.reactivar(a.id); else await alumnosService.desactivar(a.id);
    a.activo = valor;
    if (!valor) sel.delete(a.id); // un alumno inactivo no recibe el mensaje de pago
    ocultarError(); render();
  } catch (e) { input.checked = !valor; input.disabled = false; mostrarError(e); }
}

function fila(a) {
  const tr = document.createElement('tr');
  tr.dataset.id = a.id;
  if (!a.activo) tr.className = 'inactivo';

  const tdCheck = document.createElement('td'); tdCheck.className = 'col-check';
  const cb = document.createElement('input');
  cb.type = 'checkbox'; cb.checked = sel.has(a.id); cb.disabled = !a.activo;
  cb.setAttribute('aria-label', `Seleccionar a ${a.nombre} ${a.apellido}`);
  cb.addEventListener('change', () => { cb.checked ? sel.add(a.id) : sel.delete(a.id); actualizarSeleccion(); });
  tdCheck.append(cb);

  tr.append(tdCheck, celda(`${a.apellido}, ${a.nombre}`, 'col-nombre'), celda(a.celular ?? '—', '', 'Celular'), celda(a.estilo?.nombre ?? '—', '', 'Estilo'));

  const pagos = document.createElement('td'); pagos.className = 'estados';
  Object.entries(ESTADOS_PAGO).forEach(([k, { label, color }]) => {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = label; b.style.setProperty('--c', color);
    b.className = 'pill' + (a.estado_pago === k ? ' pill--on' : '');
    b.addEventListener('click', async () => {
      if (a.estado_pago === k) return;
      try { await alumnosService.cambiarEstadoPago(a.id, k); a.estado_pago = k; ocultarError(); render(); }
      catch (e) { mostrarError(e); }
    });
    pagos.append(b);
  });

  // Switch activo / inactivo
  const tdAct = document.createElement('td'); tdAct.className = 'col-activo'; tdAct.dataset.label = 'Activo';
  const sw = document.createElement('label'); sw.className = 'switch';
  const inp = document.createElement('input');
  inp.type = 'checkbox'; inp.checked = a.activo; inp.setAttribute('role', 'switch');
  inp.setAttribute('aria-label', `${a.nombre} ${a.apellido}: ${a.activo ? 'activo' : 'inactivo'}`);
  inp.addEventListener('change', () => cambiarActivo(a, inp, inp.checked));
  sw.append(inp, document.createElement('span')); tdAct.append(sw);

  const acc = document.createElement('td'); acc.className = 'acciones';
  const url = a.activo ? enlaceWhatsApp(a.celular, mensajePara(a)) : '';
  const wa = document.createElement(url ? 'a' : 'span');
  wa.className = 'icono icono--wa' + (url ? '' : ' icono--off'); wa.innerHTML = ico('i-wa');
  wa.title = url ? 'Enviar WhatsApp' : (a.activo ? 'Sin celular válido' : 'Alumno inactivo');
  if (url) { wa.href = url; wa.target = '_blank'; wa.rel = 'noopener'; }
  const ed = document.createElement('button'); ed.type = 'button'; ed.className = 'icono'; ed.title = 'Editar'; ed.innerHTML = ico('i-edit');
  ed.addEventListener('click', () => abrirForm(a));
  acc.append(wa, ed);

  tr.append(pagos, tdAct, acc);
  return tr;
}

function render() {
  const lista = visibles();
  $('#alumnos').replaceChildren(...lista.map(fila));
  $('#vacio').hidden = lista.length > 0;
  pintarResumen(); pintarFiltroEstilo(); actualizarSeleccion();
}

async function cargar() {
  try {
    // Se traen también los inactivos para poder volver a activarlos con el switch
    [alumnos, estilos] = await Promise.all([alumnosService.listar({ incluirInactivos: true }), estilosService.listar()]);
    const activos = new Set(alumnos.filter((a) => a.activo).map((a) => a.id));
    [...sel].forEach((id) => !activos.has(id) && sel.delete(id));
    if (tab !== 'todos' && !estilos.some((e) => String(e.id) === tab)) tab = 'todos';
    // Con RLS, un SELECT sin permiso no da error: devuelve lista vacía
    $('#vacio').textContent = alumnos.length ? 'Ningún alumno coincide con los filtros.' : 'No hay alumnos. Si ya cargaste alumnos, revisá las políticas RLS.';
    $('#f-estilo').replaceChildren(new Option('Sin estilo', ''), ...estilos.map((e) => new Option(e.nombre, e.id)));
    ocultarError(); render();
  } catch (e) { mostrarError(e); }
}

// ---- Selección masiva ----
$('#sel-todos').addEventListener('change', (e) => {
  visibles().filter((a) => a.activo).forEach((a) => (e.target.checked ? sel.add(a.id) : sel.delete(a.id)));
  document.querySelectorAll('#alumnos input[type=checkbox]:not(:disabled)').forEach((c) => {
    if (c.closest('td').classList.contains('col-check')) c.checked = e.target.checked;
  });
  actualizarSeleccion();
});
$('#limpiar-sel').addEventListener('click', () => { sel.clear(); render(); });

// ---- Envío masivo de "pago pendiente" (uno por clic; solo alumnos activos) ----
let cola = [];
function pintarEnvio() {
  const hechos = cola.filter((c) => c.enviado).length;
  $('#envio-prog').textContent = `Enviados ${hechos} de ${cola.filter((c) => c.url).length}`;
  $('#envio-sig').disabled = !cola.some((c) => c.url && !c.enviado);
  $('#envio-lista').replaceChildren(...cola.map((c) => {
    const li = document.createElement('li');
    const info = document.createElement('div');
    info.textContent = `${c.alumno.apellido}, ${c.alumno.nombre}`;
    const sm = document.createElement('small');
    sm.textContent = c.url ? c.alumno.celular : (c.alumno.celular ? `Número inválido: ${c.alumno.celular} (revisalo)` : 'Sin celular cargado');
    info.append(sm); li.append(info);
    if (c.enviado) { const ok = document.createElement('span'); ok.className = 'ok'; ok.textContent = '✓ Abierto'; li.append(ok); }
    else if (c.url) {
      const a = document.createElement('a');
      a.className = 'boton boton--wa'; a.textContent = 'Enviar'; a.href = c.url; a.target = '_blank'; a.rel = 'noopener';
      a.addEventListener('click', () => { c.enviado = true; setTimeout(pintarEnvio, 0); });
      li.append(a);
    }
    return li;
  }));
}
$('#enviar-masivo').addEventListener('click', () => {
  cola = alumnos.filter((a) => a.activo && sel.has(a.id)).map((alumno) => ({
    alumno, url: enlaceWhatsApp(alumno.celular, mensajePagoPendiente(alumno)), enviado: false }));
  pintarEnvio();
  $('#dlg-envio').showModal();
});
$('#envio-sig').addEventListener('click', () => {
  const c = cola.find((x) => x.url && !x.enviado);
  if (!c) return;
  window.open(c.url, '_blank', 'noopener');
  c.enviado = true; pintarEnvio();
});

// ---- Alta / edición ----
function abrirForm(a = null) {
  editando = a;
  const f = $('#form-alumno'); f.reset();
  $('#dlg-titulo').textContent = a ? 'Editar alumno' : 'Nuevo alumno';
  if (a) {
    f.nombre.value = a.nombre; f.apellido.value = a.apellido; f.celular.value = a.celular ?? '';
    f.estilo_id.value = a.estilo_id ?? ''; f.estado_pago.value = a.estado_pago;
  } else if (tab !== 'todos') f.estilo_id.value = tab; // el alta toma el estilo de la solapa abierta
  $('#form-error').hidden = true;
  $('#dlg-alumno').showModal();
}

$('#form-alumno').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target, btn = $('#guardar'), err = $('#form-error');
  const datos = { nombre: f.nombre.value.trim(), apellido: f.apellido.value.trim(), celular: f.celular.value.trim() || null,
    estilo_id: f.estilo_id.value || null, estado_pago: f.estado_pago.value };
  const falla = (t) => { err.textContent = t; err.hidden = false; };
  if (!datos.nombre || !datos.apellido) return falla('Completá nombre y apellido.');
  if (datos.celular && !normalizarCelular(datos.celular)) return falla('El celular no es válido. Usá código de área y sin el 15, por ejemplo 11 2345 6789.');
  btn.disabled = true; err.hidden = true;
  try {
    if (editando) await alumnosService.actualizar(editando.id, datos); else await alumnosService.crear(datos);
    $('#dlg-alumno').close(); await cargar();
  } catch (x) { console.error(x); falla(describirError(x)); }
  finally { btn.disabled = false; }
});

document.querySelectorAll('[data-cerrar]').forEach((b) => b.addEventListener('click', () => b.closest('dialog').close()));
$('#nuevo').addEventListener('click', () => abrirForm());
$('#buscar').addEventListener('input', (e) => { texto = e.target.value; render(); });
$('#filtro-estilo').addEventListener('change', (e) => { tab = e.target.value; render(); });
$('#f-activo').addEventListener('change', (e) => { activoF = e.target.value; render(); });
$('#filtros').addEventListener('click', (e) => {
  const b = e.target.closest('[data-f]'); if (!b) return;
  filtro = b.dataset.f;
  document.querySelectorAll('#filtros [data-f]').forEach((x) => x.classList.toggle('on', x === b));
  render();
});

// Guard: el body arranca oculto hasta confirmar la sesión
const session = await requireSession('login.html');
if (session) {
  $('#usuario').textContent = session.user.email;
  $('#salir').addEventListener('click', cerrarSesion);
  document.body.hidden = false;
  await cargar();
}
