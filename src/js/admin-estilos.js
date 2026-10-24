import { requireSession, cerrarSesion } from './auth.js';
import { estilosService } from './services/estilos.service.js';
import { alumnosService } from './services/alumnos.service.js';
import { describirError } from './ui/errores.js';
import { formatearPrecio, parsearPrecio } from './ui/formato.js';

const $ = (s) => document.querySelector(s);
let estilos = [], texto = '', editando = null, aBajar = null;

function mostrarError(e) { console.error(e); $('#aviso').textContent = describirError(e); $('#aviso').hidden = false; }
const ico = (id) => `<svg class="ico"><use href="#${id}"/></svg>`;

function celda(txt, clase, etiqueta) {
  const td = document.createElement('td');
  td.textContent = txt || '—';
  if (clase) td.className = clase;
  if (etiqueta) td.dataset.label = etiqueta;
  return td;
}

async function cambiarActivo(e, input, valor) {
  input.disabled = true;
  try {
    if (valor) await estilosService.reactivar(e.id); else await estilosService.desactivar(e.id);
    e.activo = valor; $('#aviso').hidden = true; render();
  } catch (x) { input.checked = !valor; input.disabled = false; mostrarError(x); }
}

function fila(e) {
  const tr = document.createElement('tr');
  if (!e.activo) tr.className = 'inactivo';
  const dh = [e.dias_dictado, e.horarios].filter(Boolean).join(' · ');
  const pr = (e.precio_clase != null || e.precio_mensual != null) ? `Clase ${formatearPrecio(e.precio_clase)} · Mes ${formatearPrecio(e.precio_mensual)}` : '';
  tr.append(celda(e.nombre, 'col-nombre'), celda(e.descripcion, '', 'Descripción'), celda(dh, '', 'Días y horarios'), celda(pr, '', 'Precios'));

  const tdAct = document.createElement('td'); tdAct.className = 'col-activo'; tdAct.dataset.label = 'Activo';
  const sw = document.createElement('label'); sw.className = 'switch';
  const inp = document.createElement('input');
  inp.type = 'checkbox'; inp.checked = e.activo; inp.setAttribute('role', 'switch');
  inp.setAttribute('aria-label', `${e.nombre}: ${e.activo ? 'activo' : 'inactivo'}`);
  inp.addEventListener('change', () => cambiarActivo(e, inp, inp.checked));
  sw.append(inp, document.createElement('span')); tdAct.append(sw);

  const acc = document.createElement('td'); acc.className = 'acciones';
  const ed = document.createElement('button'); ed.type = 'button'; ed.className = 'icono'; ed.title = e.activo ? 'Editar' : 'Activalo para editar'; ed.innerHTML = ico('i-edit');
  ed.addEventListener('click', () => abrirForm(e));
  const del = document.createElement('button'); del.type = 'button'; del.className = 'icono icono--del'; del.title = 'Dar de baja'; del.innerHTML = ico('i-trash');
  del.disabled = !e.activo;
  del.addEventListener('click', async () => {
    aBajar = e; $('#baja-nombre').textContent = e.nombre; $('#baja-alumnos').textContent = '';
    $('#dlg-baja').showModal();
    try { // aviso: cuántos alumnos activos tiene ese estilo
      const n = (await alumnosService.listarPorEstilo(e.id)).length;
      if (n) $('#baja-alumnos').textContent = `Tiene ${n} alumno${n > 1 ? 's' : ''} activo${n > 1 ? 's' : ''}, que seguirán en la lista general.`;
    } catch { /* el aviso es opcional */ }
  });
  acc.append(ed, del);
  tr.append(tdAct, acc);
  return tr;
}

function render() {
  const t = texto.toLowerCase();
  const lista = estilos.filter((e) => `${e.nombre} ${e.descripcion ?? ''}`.toLowerCase().includes(t))
    .sort((a, b) => Number(b.activo) - Number(a.activo));
  $('#estilos').replaceChildren(...lista.map(fila));
  $('#vacio').hidden = lista.length > 0;
}

async function cargar() {
  try {
    estilos = await estilosService.listar({ incluirInactivos: true });
    $('#vacio').textContent = estilos.length ? 'Ningún estilo coincide con la búsqueda.' : 'No hay estilos cargados. Si ya los cargaste, revisá las políticas RLS.';
    $('#aviso').hidden = true; render();
  } catch (x) { mostrarError(x); }
}

function abrirForm(e = null) {
  editando = e;
  const f = $('#form-estilo'); f.reset();
  $('#dlg-titulo').textContent = e ? 'Editar estilo' : 'Nuevo estilo';
  if (e) {
    f.nombre.value = e.nombre; f.descripcion.value = e.descripcion ?? '';
    f.precio_clase.value = e.precio_clase ?? ''; f.precio_mensual.value = e.precio_mensual ?? '';
    f.dias_dictado.value = e.dias_dictado ?? ''; f.horarios.value = e.horarios ?? '';
  }
  $('#form-error').hidden = true;
  $('#dlg-estilo').showModal();
}

$('#form-estilo').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const f = ev.target, btn = $('#guardar'), err = $('#form-error');
  const datos = { nombre: f.nombre.value.trim(), descripcion: f.descripcion.value.trim() || null,
    precio_clase: parsearPrecio(f.precio_clase.value), precio_mensual: parsearPrecio(f.precio_mensual.value),
    dias_dictado: f.dias_dictado.value.trim() || null, horarios: f.horarios.value.trim() || null };
  const falla = (t) => { err.textContent = t; err.hidden = false; };
  if (!datos.nombre) return falla('Completá el nombre del estilo.');
  if (Number.isNaN(datos.precio_clase) || Number.isNaN(datos.precio_mensual)) return falla('Los precios deben ser números positivos, por ejemplo 8000 o 8.000,50.');
  btn.disabled = true; err.hidden = true;
  try {
    if (editando) await estilosService.actualizar(editando.id, datos); else await estilosService.crear(datos);
    $('#dlg-estilo').close(); await cargar();
  } catch (x) { console.error(x); falla(describirError(x)); }
  finally { btn.disabled = false; }
});

$('#confirmar-baja').addEventListener('click', async () => {
  try { await estilosService.desactivar(aBajar.id); $('#dlg-baja').close(); await cargar(); }
  catch (x) { $('#dlg-baja').close(); mostrarError(x); }
});
document.querySelectorAll('[data-cerrar]').forEach((b) => b.addEventListener('click', () => b.closest('dialog').close()));
$('#nuevo').addEventListener('click', () => abrirForm());
$('#buscar').addEventListener('input', (e) => { texto = e.target.value; render(); });

const session = await requireSession('login.html');
if (session) {
  $('#usuario').textContent = session.user.email;
  $('#salir').addEventListener('click', cerrarSesion);
  document.body.hidden = false;
  await cargar();
}
