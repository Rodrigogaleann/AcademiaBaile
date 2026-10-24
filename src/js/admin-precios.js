import { requireSession, cerrarSesion } from './auth.js';
import { estilosService } from './services/estilos.service.js';
import { describirError } from './ui/errores.js';
import { formatearPrecio, parsearPrecio } from './ui/formato.js';

const $ = (s) => document.querySelector(s);
let estilos = [], editando = null;

function mostrarError(e) { console.error(e); $('#aviso').textContent = describirError(e); $('#aviso').hidden = false; }
function celda(txt, clase, etiqueta) {
  const td = document.createElement('td');
  td.textContent = txt || '—';
  if (clase) td.className = clase;
  if (etiqueta) td.dataset.label = etiqueta;
  return td;
}

function fila(e) {
  const tr = document.createElement('tr');
  const clase = celda(e.precio_clase == null ? 'Sin precio' : formatearPrecio(e.precio_clase), e.precio_clase == null ? 'sin-precio' : 'precio', 'Por clase');
  const mes = celda(e.precio_mensual == null ? 'Sin precio' : formatearPrecio(e.precio_mensual), e.precio_mensual == null ? 'sin-precio' : 'precio', 'Mensual');
  const acc = document.createElement('td'); acc.className = 'acciones';
  const b = document.createElement('button'); b.type = 'button'; b.className = 'btn-editar';
  b.innerHTML = '<svg class="ico"><use href="#i-edit"/></svg><span>Editar</span>';
  b.addEventListener('click', () => abrirForm(e));
  acc.append(b);
  tr.append(celda(e.nombre, 'col-nombre'), clase, mes, celda(e.dias_dictado, '', 'Días'), celda(e.horarios, '', 'Horarios'), acc);
  return tr;
}

async function cargar() {
  try {
    estilos = await estilosService.listar();
    $('#precios').replaceChildren(...estilos.map(fila));
    $('#vacio').textContent = 'No hay estilos activos. Creá uno en la sección Estilos.';
    $('#vacio').hidden = estilos.length > 0;
    $('#aviso').hidden = true;
  } catch (x) { mostrarError(x); }
}

function abrirForm(e) {
  editando = e;
  const f = $('#form-precio'); f.reset();
  $('#dlg-titulo').textContent = e.nombre;
  f.precio_clase.value = e.precio_clase ?? ''; f.precio_mensual.value = e.precio_mensual ?? '';
  f.dias_dictado.value = e.dias_dictado ?? ''; f.horarios.value = e.horarios ?? '';
  $('#form-error').hidden = true;
  $('#dlg-precio').showModal();
}

$('#form-precio').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const f = ev.target, err = $('#form-error'), btn = $('#guardar');
  const datos = { precio_clase: parsearPrecio(f.precio_clase.value), precio_mensual: parsearPrecio(f.precio_mensual.value),
    dias_dictado: f.dias_dictado.value.trim() || null, horarios: f.horarios.value.trim() || null };
  if (Number.isNaN(datos.precio_clase) || Number.isNaN(datos.precio_mensual)) {
    err.textContent = 'Los precios deben ser números positivos, por ejemplo 8000 o 8.000,50.'; err.hidden = false; return;
  }
  btn.disabled = true; err.hidden = true;
  try { await estilosService.actualizar(editando.id, datos); $('#dlg-precio').close(); await cargar(); }
  catch (x) { console.error(x); err.textContent = describirError(x); err.hidden = false; }
  finally { btn.disabled = false; }
});
document.querySelectorAll('[data-cerrar]').forEach((b) => b.addEventListener('click', () => b.closest('dialog').close()));

const session = await requireSession('login.html');
if (session) {
  $('#usuario').textContent = session.user.email;
  $('#salir').addEventListener('click', cerrarSesion);
  document.body.hidden = false;
  await cargar();
}
