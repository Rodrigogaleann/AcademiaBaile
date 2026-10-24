import { requireSession, cerrarSesion } from './auth.js';
import { alumnosService } from './services/alumnos.service.js';
import { estilosService } from './services/estilos.service.js';
import { ESTADOS_PAGO, MODALIDADES_PAGO } from './constants.js';
import { enlaceWhatsApp, mensajePara, mensajePagoPendiente, mensajeBienvenida, normalizarCelular } from './modules/whatsapp.js';
import { describirError } from './ui/errores.js';
import { normalizarDni } from './ui/validar.js';
import { formatearPrecio } from './ui/formato.js';
import { subirCertificado, urlFirmada, validarArchivo } from './services/storage.service.js';

const $ = (s) => document.querySelector(s);
let alumnos = [], estilos = [], texto = '', filtro = 'todos', tab = 'todos', activoF = 'todos', editando = null;
let formEstilos = new Set(), nombresExtra = new Map(), dupActual = null;
const sel = new Set(); // ids tildados (solo alumnos activos)

function mostrarError(e) {
  console.error(e);
  const aviso = $('#aviso');
  aviso.textContent = describirError(e);
  aviso.hidden = false;
}
const ocultarError = () => ($('#aviso').hidden = true);
const ico = (id) => `<svg class="ico"><use href="#${id}"/></svg>`;
const el = (tag, cls, txt) => { const n = document.createElement(tag); if (cls) n.className = cls; if (txt !== undefined) n.textContent = txt; return n; };

let toastT;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('on');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 3800);
}

function pintarResumen() {
  const act = alumnos.filter((a) => a.activo);
  $('#r-total').textContent = act.length;
  Object.keys(ESTADOS_PAGO).forEach((k) => ($(`#r-${k}`).textContent = act.filter((a) => a.estado_pago === k).length));
}

const tieneEstilo = (a, id) => a.estilo_ids.some((x) => String(x) === String(id));

// Desplegable de estilos: "Todos" + un estilo por cada registro activo de estilos_baile
function pintarFiltroEstilo() {
  const base = alumnos.filter((a) => activoF === 'todos' || (activoF === 'activos') === a.activo);
  const selector = $('#filtro-estilo');
  selector.replaceChildren(
    new Option(`Todos los estilos (${base.length})`, 'todos'),
    ...estilos.map((e) => new Option(`${e.nombre} (${base.filter((a) => tieneEstilo(a, e.id)).length})`, String(e.id)))
  );
  selector.value = tab;
}

function visibles() {
  const t = texto.toLowerCase();
  return alumnos.filter((a) =>
    (tab === 'todos' || tieneEstilo(a, tab)) &&
    (activoF === 'todos' || (activoF === 'activos') === a.activo) &&
    (filtro === 'todos' || a.estado_pago === filtro) &&
    `${a.nombre} ${a.apellido} ${a.dni ?? ''} ${a.celular ?? ''}`.toLowerCase().includes(t)
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
  const td = el('td', clase, txt);
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
  const tr = el('tr', a.activo ? '' : 'inactivo');
  tr.dataset.id = a.id;

  const tdCheck = el('td', 'col-check');
  const cb = el('input'); cb.type = 'checkbox'; cb.checked = sel.has(a.id); cb.disabled = !a.activo;
  cb.setAttribute('aria-label', `Seleccionar a ${a.nombre} ${a.apellido}`);
  cb.addEventListener('change', () => { cb.checked ? sel.add(a.id) : sel.delete(a.id); actualizarSeleccion(); });
  tdCheck.append(cb);

  const tdN = el('td', 'col-nombre');
  const nl = el('button', 'nombre-link', `${a.apellido}, ${a.nombre}`);
  nl.type = 'button'; nl.title = 'Ver ficha del alumno'; nl.addEventListener('click', () => abrirFicha(a));
  tdN.append(nl, el('small', 'dni', `${a.dni ? `DNI ${a.dni}` : 'Sin DNI'} · ${MODALIDADES_PAGO[a.modalidad_pago]?.label ?? 'Mensual'}`));

  const tdE = el('td'); tdE.dataset.label = 'Estilos';
  if (a.estilos.length) a.estilos.forEach((e) => tdE.append(el('span', 'tag', e.nombre))); else tdE.textContent = '—';

  tr.append(tdCheck, tdN, celda(a.celular ?? '—', '', 'Celular'), tdE);

  const pagos = el('td', 'estados');
  Object.entries(ESTADOS_PAGO).forEach(([k, { label, color }]) => {
    const b = el('button', 'pill' + (a.estado_pago === k ? ' pill--on' : ''), label);
    b.type = 'button'; b.style.setProperty('--c', color);
    b.addEventListener('click', async () => {
      if (a.estado_pago === k) return;
      try { await alumnosService.cambiarEstadoPago(a.id, k); a.estado_pago = k; ocultarError(); render(); }
      catch (e) { mostrarError(e); }
    });
    pagos.append(b);
  });

  const tdAct = el('td', 'col-activo'); tdAct.dataset.label = 'Activo';
  const sw = el('label', 'switch'), inp = el('input');
  inp.type = 'checkbox'; inp.checked = a.activo; inp.setAttribute('role', 'switch');
  inp.setAttribute('aria-label', `${a.nombre} ${a.apellido}: ${a.activo ? 'activo' : 'inactivo'}`);
  inp.addEventListener('change', () => cambiarActivo(a, inp, inp.checked));
  sw.append(inp, el('span')); tdAct.append(sw);

  // Acciones: WhatsApp + botón "Editar" (disponible para TODOS los alumnos, activos o inactivos)
  const acc = el('td', 'acciones');
  const url = a.activo ? enlaceWhatsApp(a.celular, mensajePara(a)) : '';
  const wa = el(url ? 'a' : 'span', 'icono icono--wa' + (url ? '' : ' icono--off'));
  wa.innerHTML = ico('i-wa');
  wa.title = url ? 'Enviar WhatsApp' : (a.activo ? 'Sin celular válido' : 'Alumno inactivo');
  if (url) { wa.href = url; wa.target = '_blank'; wa.rel = 'noopener'; }
  const ed = el('button', 'btn-editar'); ed.type = 'button';
  ed.innerHTML = `${ico('i-edit')}<span>Editar</span>`; ed.title = 'Editar datos del alumno';
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
    // Se traen también los inactivos para poder volver a activarlos o editarlos
    [alumnos, estilos] = await Promise.all([alumnosService.listar({ incluirInactivos: true }), estilosService.listar()]);
    const activos = new Set(alumnos.filter((a) => a.activo).map((a) => a.id));
    [...sel].forEach((id) => !activos.has(id) && sel.delete(id));
    if (tab !== 'todos' && !estilos.some((e) => String(e.id) === tab)) tab = 'todos';
    // Con RLS, un SELECT sin permiso no da error: devuelve lista vacía
    $('#vacio').textContent = alumnos.length ? 'Ningún alumno coincide con los filtros.' : 'No hay alumnos. Si ya cargaste alumnos, revisá las políticas RLS.';
    ocultarError(); render();
  } catch (e) { mostrarError(e); }
}

// ---- Selección masiva ----
$('#sel-todos').addEventListener('change', (e) => {
  visibles().filter((a) => a.activo).forEach((a) => (e.target.checked ? sel.add(a.id) : sel.delete(a.id)));
  document.querySelectorAll('#alumnos td.col-check input:not(:disabled)').forEach((c) => (c.checked = e.target.checked));
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
    const li = el('li'), info = el('div', '', `${c.alumno.apellido}, ${c.alumno.nombre}`);
    info.append(el('small', '', c.url ? c.alumno.celular : (c.alumno.celular ? `Número inválido: ${c.alumno.celular} (revisalo)` : 'Sin celular cargado')));
    li.append(info);
    if (c.enviado) li.append(el('span', 'ok', '✓ Abierto'));
    else if (c.url) {
      const a = el('a', 'boton boton--wa', 'Enviar'); a.href = c.url; a.target = '_blank'; a.rel = 'noopener';
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

// ---- Alta / edición: estilos múltiples ----
const nombreEstilo = (id) => estilos.find((e) => String(e.id) === id)?.nombre ?? nombresExtra.get(id) ?? 'Estilo';

function pintarChipsEstilos() {
  const box = $('#chips-estilos');
  box.replaceChildren(...[...formEstilos].map((id) => {
    const c = el('span', 'chip-e', nombreEstilo(id)), x = el('button', '', '×');
    x.type = 'button'; x.setAttribute('aria-label', `Quitar ${nombreEstilo(id)}`);
    x.addEventListener('click', () => { formEstilos.delete(id); pintarChipsEstilos(); pintarDup(); });
    c.append(x); return c;
  }));
  if (!formEstilos.size) box.append(el('span', 'chips-vacio', 'Sin estilos asignados'));
  const libres = estilos.filter((e) => !formEstilos.has(String(e.id)));
  const s = $('#f-estilo-add');
  s.replaceChildren(new Option(formEstilos.size ? 'Agregar otro estilo…' : 'Elegí un estilo…', ''), ...libres.map((e) => new Option(e.nombre, String(e.id))));
  s.disabled = libres.length === 0;
}
$('#f-estilo-add').addEventListener('change', (e) => {
  if (e.target.value) { formEstilos.add(e.target.value); pintarChipsEstilos(); pintarDup(); }
});

// ---- DNI repetido: avisa, muestra al alumno y ofrece acciones ----
function resetFiltros() {
  tab = 'todos'; activoF = 'todos'; filtro = 'todos';
  $('#f-activo').value = 'todos';
  document.querySelectorAll('#filtros [data-f]').forEach((x) => x.classList.toggle('on', x.dataset.f === 'todos'));
}

function verEnLista(a) {
  $('#dlg-alumno').close();
  resetFiltros();
  texto = a.dni || a.apellido; $('#buscar').value = texto;
  render();
  const tr = document.querySelector(`#alumnos tr[data-id="${a.id}"]`);
  if (tr) { tr.scrollIntoView({ behavior: 'smooth', block: 'center' }); tr.classList.add('resaltar'); setTimeout(() => tr.classList.remove('resaltar'), 2800); }
}

function pintarDup() {
  const box = $('#dup');
  if (!dupActual) { box.hidden = true; return; }
  const a = dupActual;
  const btn = (txt, fn) => { const b = el('button', 'boton boton--sec', txt); b.type = 'button'; b.addEventListener('click', fn); return b; };
  const acc = el('div', 'dup__acc');
  acc.append(btn('Ver en la lista', () => verEnLista(a)), btn('Editar datos', () => abrirForm(a)));
  const nuevos = [...formEstilos].filter((id) => !a.estilo_ids.map(String).includes(id));
  if (!editando && nuevos.length) {
    const b = btn(`Agregar ${nuevos.map(nombreEstilo).join(', ')} a este alumno`, async () => {
      try {
        await alumnosService.agregarEstilos(a.id, nuevos);
        $('#dlg-alumno').close(); await cargar();
        toast(`✓ Estilo agregado a ${a.nombre} ${a.apellido}`); verEnLista(a);
      } catch (e) { $('#form-error').textContent = describirError(e); $('#form-error').hidden = false; }
    });
    b.classList.remove('boton--sec'); acc.append(b);
  }
  if (!a.activo) acc.append(btn('Reactivar alumno', async () => {
    try { await alumnosService.reactivar(a.id); await cargar(); toast(`✓ ${a.nombre} ${a.apellido} reactivado`); verEnLista(a); }
    catch (e) { mostrarError(e); }
  }));
  box.replaceChildren(
    el('strong', '', 'Este DNI ya está ingresado en el sistema'),
    el('p', '', `${a.apellido}, ${a.nombre} · DNI ${a.dni} · ${a.celular ?? 'sin celular'} · ${a.estilos.map((e) => e.nombre).join(', ') || 'sin estilos'} · ${ESTADOS_PAGO[a.estado_pago]?.label ?? a.estado_pago} · ${a.activo ? 'Activo' : 'Inactivo'}`),
    acc);
  box.hidden = false;
}

async function buscarDuplicado(dni) {
  if (!dni) { dupActual = null; pintarDup(); return null; }
  const a = await alumnosService.buscarPorDni(dni);
  dupActual = a && (!editando || String(a.id) !== String(editando.id)) ? a : null;
  pintarDup();
  return dupActual;
}
$('#form-alumno').dni.addEventListener('change', async (e) => {
  try { await buscarDuplicado(normalizarDni(e.target.value)); } catch (x) { console.error(x); }
});

function abrirForm(a = null) {
  editando = a; dupActual = null;
  const f = $('#form-alumno'); f.reset();
  formEstilos = new Set(a ? a.estilo_ids.map(String) : (tab !== 'todos' ? [tab] : []));
  nombresExtra = new Map(a ? a.estilos.map((e) => [String(e.id), e.nombre]) : []);
  if (a) { f.nombre.value = a.nombre; f.apellido.value = a.apellido; f.dni.value = a.dni ?? ''; f.celular.value = a.celular ?? ''; f.estado_pago.value = a.estado_pago; f.modalidad_pago.value = a.modalidad_pago ?? 'mensual'; }
  $('#cert-actual').textContent = a?.certificado_medico_url ? 'Ya hay un examen médico cargado. Si elegís otro archivo, lo reemplaza.' : 'Todavía no hay examen médico cargado.';
  $('#dlg-titulo').textContent = a ? 'Editar alumno' : 'Nuevo alumno';
  $('#fila-bienvenida').hidden = !!a; f.bienvenida.checked = true;
  $('#form-error').hidden = true;
  pintarChipsEstilos(); pintarDup();
  if (!$('#dlg-alumno').open) $('#dlg-alumno').showModal();
}

// ---- Cartel de éxito + bienvenida por WhatsApp ----
function exito(alumno, ventana, avisoCert = '') {
  const url = enlaceWhatsApp(alumno.celular, mensajeBienvenida(alumno, alumno.estilos.map((e) => e.nombre)));
  let abierta = false;
  if (ventana && url) { try { ventana.location.href = url; abierta = true; } catch { /* la cerraron */ } }
  else if (ventana) ventana.close();
  $('#exito-nombre').textContent = `${alumno.nombre} ${alumno.apellido}`;
  $('#exito-wa').hidden = !url; $('#exito-wa').href = url || '#';
  $('#exito-nota').textContent = !url
    ? 'No se envió la bienvenida: el alumno no tiene un celular válido cargado.'
    : abierta ? 'Se abrió WhatsApp con el mensaje de bienvenida: solo falta apretar enviar. Si no se abrió, usá el botón.'
      : 'Tocá el botón para abrir WhatsApp con el mensaje de bienvenida.';
  if (avisoCert) $('#exito-nota').textContent += ` ⚠ El alumno se guardó, pero no se pudo subir el examen médico: ${avisoCert}`;
  $('#dlg-exito').showModal();
}

$('#form-alumno').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target, btn = $('#guardar'), err = $('#form-error');
  const falla = (t) => { err.textContent = t; err.hidden = false; };
  const dni = normalizarDni(f.dni.value);
  const datos = { nombre: f.nombre.value.trim(), apellido: f.apellido.value.trim(), dni: dni || null,
    celular: f.celular.value.trim() || null, estado_pago: f.estado_pago.value, modalidad_pago: f.modalidad_pago.value };
  if (!datos.nombre || !datos.apellido) return falla('Completá nombre y apellido.');
  if (f.dni.value.trim() && !dni) return falla('El DNI no es válido: usá 7 u 8 números, sin puntos.');
  if (!editando && !dni) return falla('Ingresá el DNI del alumno (7 u 8 números).');
  if (datos.celular && !normalizarCelular(datos.celular)) return falla('El celular no es válido. Usá código de área y sin el 15, por ejemplo 11 2345 6789.');

  const archivo = f.certificado.files[0], errArchivo = validarArchivo(archivo);
  if (errArchivo) return falla(errArchivo);

  // Abrimos la pestaña de WhatsApp ahora (dentro del clic) para que el navegador no la bloquee
  let ventana = null;
  if (!editando && f.bienvenida.checked && datos.celular) {
    ventana = window.open('', '_blank');
    if (ventana) { ventana.opener = null; ventana.document.title = 'WhatsApp'; ventana.document.body.textContent = 'Abriendo WhatsApp…'; }
  }
  btn.disabled = true; err.hidden = true;
  try {
    if (await buscarDuplicado(dni)) { ventana?.close(); return falla('Este DNI ya está ingresado en el sistema. Mirá los datos del alumno arriba.'); }
    const estilo_ids = [...formEstilos];
    let alumno = editando
      ? await alumnosService.editar(editando.id, { ...datos, estilo_ids })
      : await alumnosService.crear({ ...datos, estilo_ids });
    let avisoCert = '';
    if (archivo) { // el examen se sube a Storage y se guarda su ruta en el alumno
      try {
        const ruta = await subirCertificado(alumno.id, archivo);
        alumno = await alumnosService.editar(alumno.id, { certificado_medico_url: ruta });
      } catch (x) { console.error(x); avisoCert = describirError(x); }
    }
    const eraEdicion = !!editando;
    $('#dlg-alumno').close(); await cargar();
    if (eraEdicion) {
      toast(avisoCert ? '⚠ Datos guardados, pero el examen no se subió' : '✓ Datos actualizados');
      if (avisoCert) { $('#aviso').textContent = avisoCert; $('#aviso').hidden = false; }
    } else exito(alumno, ventana, avisoCert);
  } catch (x) { ventana?.close(); console.error(x); falla(describirError(x)); }
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

// ---- Ficha del alumno: pago, datos y examen médico (ver y descargar) ----
let fichaAlumno = null;

function valorEstimado(a) {
  const mios = a.estilos.map((x) => estilos.find((e) => String(e.id) === String(x.id))).filter(Boolean);
  if (!mios.length) return '—';
  if (a.modalidad_pago === 'por_clase') return mios.map((e) => `${e.nombre}: ${formatearPrecio(e.precio_clase)} por clase`).join(' · ');
  const total = mios.reduce((s, e) => s + (Number(e.precio_mensual) || 0), 0);
  return total ? `${formatearPrecio(total)} por mes` : 'Sin precio cargado';
}

async function pintarCertificado(a) {
  const box = $('#ficha-cert'), dl = $('#ficha-descargar'), ruta = a.certificado_medico_url;
  dl.hidden = true; box.replaceChildren();
  if (!ruta) { box.append(el('p', 'ficha__vacio', 'Todavía no hay examen médico cargado.')); return; }
  dl.hidden = false;
  box.append(el('p', 'ficha__vacio', 'Cargando examen médico…'));
  try {
    const url = await urlFirmada(ruta);
    box.replaceChildren();
    if (/\.pdf$/i.test(ruta)) {
      const f = el('iframe', 'ficha__pdf'); f.src = url; f.title = 'Examen médico (PDF)';
      const l = el('a', 'ficha__abrir', 'Abrir el PDF en una pestaña nueva'); l.href = url; l.target = '_blank'; l.rel = 'noopener';
      box.append(f, l);
    } else {
      const i = el('img', 'ficha__img'); i.src = url; i.alt = `Examen médico de ${a.nombre} ${a.apellido}`; box.append(i);
    }
  } catch (e) { box.replaceChildren(el('p', 'error', describirError(e))); }
}

async function abrirFicha(a) {
  fichaAlumno = a;
  const est = ESTADOS_PAGO[a.estado_pago] ?? { label: a.estado_pago, color: '#999' };
  $('#ficha-ini').textContent = `${a.nombre[0] ?? ''}${a.apellido[0] ?? ''}`;
  $('#ficha-nombre').textContent = `${a.nombre} ${a.apellido}`;
  const b = $('#ficha-estado'); b.textContent = est.label; b.style.setProperty('--c', est.color);
  const datos = [['DNI', a.dni ?? '—'], ['Celular', a.celular ?? '—'], ['Modalidad', MODALIDADES_PAGO[a.modalidad_pago]?.label ?? 'Mensual'],
    ['Estilos', a.estilos.map((e) => e.nombre).join(', ') || '—'], ['Valor', valorEstimado(a)], ['Situación', a.activo ? 'Activo' : 'Inactivo']];
  $('#ficha-datos').replaceChildren(...datos.flatMap(([k, v]) => [el('dt', '', k), el('dd', '', v)]));
  if (!$('#dlg-ficha').open) $('#dlg-ficha').showModal();
  await pintarCertificado(a);
}

$('#ficha-editar').addEventListener('click', () => { const a = fichaAlumno; $('#dlg-ficha').close(); abrirForm(a); });
$('#ficha-descargar').addEventListener('click', async (ev) => {
  const btn = ev.currentTarget, a = fichaAlumno, ruta = a.certificado_medico_url;
  btn.disabled = true;
  try {
    const ext = ruta.split('.').pop() || 'bin';
    const url = await urlFirmada(ruta, { descargar: true, nombre: `examen-medico-${a.apellido}-${a.nombre}.${ext}`.replace(/\s+/g, '-') });
    const l = document.createElement('a'); l.href = url; document.body.append(l); l.click(); l.remove();
  } catch (e) { toast(`No se pudo descargar: ${describirError(e)}`); }
  finally { btn.disabled = false; }
});

// Guard: el body arranca oculto hasta confirmar la sesión
const session = await requireSession('login.html');
if (session) {
  $('#usuario').textContent = session.user.email;
  $('#salir').addEventListener('click', cerrarSesion);
  document.body.hidden = false;
  await cargar();
}
