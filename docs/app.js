/* Mis Finanzas 1.1 — todo se guarda en este dispositivo (localStorage). */
'use strict';

const VERSION_APP = '1.1';
const $ = id => document.getElementById(id);

// Si el HTML guardado en caché es de la versión anterior, recargar una vez para traer la nueva.
if (!$('segMov')) {
  try {
    if (!sessionStorage.getItem('mf.recarga')) { sessionStorage.setItem('mf.recarga', '1'); location.reload(); }
  } catch (e) { /* sin sessionStorage */ }
  throw new Error('HTML desactualizado');
}

// ---------- Iconos (Lucide, copia local) ----------
const ICONOS = window.LUCIDE || {};
function ico(nombre, clase) {
  const cuerpo = ICONOS[nombre] || ICONOS['circle-dashed'] || '';
  return `<svg class="ico${clase ? ' ' + clase : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${cuerpo}</svg>`;
}
function pintarIconos(raiz) {
  raiz.querySelectorAll('i[data-i]').forEach(el => {
    const t = document.createElement('template');
    t.innerHTML = ico(el.dataset.i, el.className);
    el.replaceWith(t.content.firstChild);
  });
}

// ---------- Categorías ----------
const COLORES = ['#0f766e', '#2563eb', '#7c3aed', '#d97706', '#dc2626', '#0891b2', '#65a30d', '#db2777', '#ea580c', '#4f46e5', '#64748b', '#a16207'];
const ICONOS_CAT = ['utensils', 'shopping-cart', 'coffee', 'beer', 'bus', 'car', 'fuel', 'train-front', 'bike', 'plane',
  'house', 'sofa', 'lightbulb', 'zap', 'droplets', 'wifi', 'smartphone', 'tv', 'laptop', 'pill', 'stethoscope', 'heart-pulse',
  'dumbbell', 'book-open', 'graduation-cap', 'clapperboard', 'gamepad-2', 'music', 'shirt', 'scissors', 'gift', 'credit-card',
  'receipt', 'landmark', 'building-2', 'briefcase', 'coins', 'hand-coins', 'banknote', 'piggy-bank', 'wallet', 'tag', 'store',
  'percent', 'baby', 'dog', 'paw-print', 'wrench', 'sparkles', 'package', 'ellipsis', 'trending-up'];
const CATS_BASE = {
  gasto: [
    ['Comida', 'utensils', '#d97706'], ['Mercado', 'shopping-cart', '#65a30d'], ['Transporte', 'bus', '#2563eb'],
    ['Hogar', 'house', '#0f766e'], ['Servicios', 'lightbulb', '#a16207'], ['Salud', 'pill', '#dc2626'],
    ['Educación', 'book-open', '#4f46e5'], ['Diversión', 'clapperboard', '#db2777'], ['Ropa', 'shirt', '#7c3aed'],
    ['Deudas', 'credit-card', '#ea580c'], ['Suscripciones', 'tv', '#0891b2'], ['Otros', 'package', '#64748b']
  ],
  ingreso: [
    ['Salario', 'briefcase', '#0f766e'], ['Extra', 'coins', '#d97706'], ['Ventas', 'tag', '#2563eb'],
    ['Regalo', 'gift', '#db2777'], ['Intereses', 'landmark', '#7c3aed'], ['Otros', 'package', '#64748b']
  ]
};
const catsBase = () => ({
  gasto: CATS_BASE.gasto.map(([nombre, icono, color]) => ({ nombre, icono, color })),
  ingreso: CATS_BASE.ingreso.map(([nombre, icono, color]) => ({ nombre, icono, color }))
});
const catsDe = tipo => datos.categorias[tipo] || [];
function infoCat(tipo, nombre) {
  return catsDe(tipo).find(c => c.nombre === nombre) || { nombre, icono: 'tag', color: '#64748b' };
}
function hexA(hex, a) {
  const n = parseInt(String(hex).replace('#', ''), 16);
  if (isNaN(n)) return `rgba(100,116,139,${a})`;
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
function catIco(tipo, nombre, clase) {
  const c = infoCat(tipo, nombre);
  return `<span class="cat-ico${clase ? ' ' + clase : ''}" style="--c:${c.color};--cs:${hexA(c.color, .13)}">${ico(c.icono)}</span>`;
}

// ---------- Datos ----------
const CLAVE = 'misFinanzas.v1';             // misma clave de la versión 1.0: conserva los registros
const CLAVE_RESPALDO = 'misFinanzas.respaldoAuto';
const AJUSTES_BASE = { tema: 'auto', ocultar: false, ocultarAlSalir: false, paleta: 'petroleo', confirmarRecurrentes: true, ultimaCopia: '' };
const estadoVacio = () => ({ version: 2, movs: [], fijos: [], generados: {}, presupuestos: {}, ajustes: Object.assign({}, AJUSTES_BASE), categorias: catsBase() });
let datos = cargar();

// Completa cualquier dato de versiones anteriores sin perder nada.
function normalizar(d) {
  const base = estadoVacio();
  const r = Object.assign(base, d || {});
  if (!Array.isArray(r.movs)) r.movs = [];
  if (!Array.isArray(r.fijos)) r.fijos = [];
  if (!r.generados || typeof r.generados !== 'object') r.generados = {};
  if (!r.presupuestos || typeof r.presupuestos !== 'object') r.presupuestos = {};
  r.ajustes = Object.assign({}, AJUSTES_BASE, (d && d.ajustes) || {});
  if (!['petroleo', 'azul', 'morado'].includes(r.ajustes.paleta)) r.ajustes.paleta = 'petroleo';
  if (!['auto', 'claro', 'oscuro'].includes(r.ajustes.tema)) r.ajustes.tema = 'auto';
  const cats = r.categorias && typeof r.categorias === 'object' ? r.categorias : {};
  r.categorias = { gasto: [], ingreso: [] };
  for (const tipo of ['gasto', 'ingreso']) {
    const lista = Array.isArray(cats[tipo]) && cats[tipo].length ? cats[tipo] : catsBase()[tipo];
    const vistos = new Set();
    lista.forEach(c => {
      const nombre = c && typeof c.nombre === 'string' ? c.nombre.trim().slice(0, 24) : '';
      if (!nombre || vistos.has(nombre)) return;
      vistos.add(nombre);
      r.categorias[tipo].push({ nombre, icono: ICONOS[c.icono] ? c.icono : 'tag', color: /^#[0-9a-f]{6}$/i.test(c.color) ? c.color : '#64748b' });
    });
  }
  // Categorías usadas en registros que no estén en la lista
  const asegurar = (tipo, nombre) => {
    if (!nombre || r.categorias[tipo].some(c => c.nombre === nombre)) return;
    const base = CATS_BASE[tipo].find(c => c[0] === nombre);
    r.categorias[tipo].push(base ? { nombre, icono: base[1], color: base[2] } : { nombre, icono: 'tag', color: COLORES[r.categorias[tipo].length % COLORES.length] });
  };
  r.movs.forEach(m => asegurar(m.tipo, m.cat));
  r.fijos.forEach(f => asegurar(f.tipo, f.cat));
  Object.keys(r.presupuestos).forEach(c => asegurar('gasto', c));
  r.version = 2;
  return r;
}
function cargar() {
  try {
    const t = localStorage.getItem(CLAVE);
    if (t) return normalizar(JSON.parse(t));
  } catch (e) { console.warn('No se pudieron leer los datos', e); }
  return normalizar(null);
}
function guardar() {
  try { localStorage.setItem(CLAVE, JSON.stringify(datos)); return true; }
  catch (e) { aviso('No fue posible guardar los cambios. Verifique el espacio disponible.'); return false; }
}
const nuevoId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

// ---------- Fechas (texto AAAA-MM-DD, hora local) ----------
const pad = n => String(n).padStart(2, '0');
const isoDe = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const aFecha = iso => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); };
const hoyISO = () => isoDe(new Date());
const mesDe = iso => iso.slice(0, 7);
const diasEnMes = (y, m) => new Date(y, m, 0).getDate(); // m: 1-12
const finMes = ym => { const [y, m] = ym.split('-').map(Number); return `${ym}-${pad(diasEnMes(y, m))}`; };
const sumarDias = (iso, n) => { const d = aFecha(iso); d.setDate(d.getDate() + n); return isoDe(d); };
const lunesDe = iso => { const d = aFecha(iso); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return isoDe(d); };
const esFecha = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && isoDe(aFecha(s)) === s;
function sumarMes(ym, n) {
  let [y, m] = ym.split('-').map(Number);
  m += n; while (m > 12) { m -= 12; y++; } while (m < 1) { m += 12; y--; }
  return `${y}-${pad(m)}`;
}
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const MESES_C = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const nombreMes = ym => { const [y, m] = ym.split('-').map(Number); return `${MESES[m - 1]} ${y}`; };
const mesCorto = ym => { const [y, m] = ym.split('-').map(Number); return `${MESES_C[m - 1]} ${y}`; };
function fechaLarga(iso) {
  const hoy = hoyISO();
  if (iso === hoy) return 'Hoy';
  if (iso === sumarDias(hoy, -1)) return 'Ayer';
  const [y, m, d] = iso.split('-').map(Number);
  const anio = String(y) !== hoy.slice(0, 4) ? ` de ${y}` : '';
  return `${DIAS[aFecha(iso).getDay()]} ${d} de ${MESES[m - 1]}${anio}`;
}
const fechaMedia = iso => { const [y, m, d] = iso.split('-').map(Number); return `${d} ${MESES_C[m - 1]} ${y}`; };
const fechaCorta = iso => { const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; };
const rangoTexto = (a, b) => a === b ? fechaMedia(a) : `${fechaMedia(a)} – ${fechaMedia(b)}`;

// ---------- Dinero y privacidad ----------
const fmt = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const dinero = n => fmt.format(Math.round(n));
let privado = false;
const OCULTO = '$ ••••••';
const M = n => privado ? OCULTO : dinero(n);
const Mfirma = (n, tipo) => privado ? OCULTO : (tipo === 'ingreso' ? '+' : '−') + dinero(n);
const Mneto = n => privado ? OCULTO : (n < 0 ? '−' : '') + dinero(Math.abs(n));
function compacto(n) {
  const a = Math.abs(n), s = n < 0 ? '−' : '+';
  if (a >= 1e6) return s + (a / 1e6).toLocaleString('es-CO', { maximumFractionDigits: 1 }) + 'M';
  if (a >= 1e3) return s + Math.round(a / 1e3) + 'k';
  return s + a;
}
const soloDigitos = s => Number(String(s).replace(/\D/g, '')) || 0;
function formatearInput(input) {
  input.addEventListener('input', () => {
    const n = soloDigitos(input.value);
    input.value = n ? n.toLocaleString('es-CO') : '';
  });
}
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pct = (a, b) => b > 0 ? Math.round(a / b * 100) : 0;

// ---------- Recurrentes: se registran solos cada mes ----------
function generarFijos() {
  const hoy = hoyISO(), mesHoy = mesDe(hoy), diaHoy = Number(hoy.slice(8));
  let cambios = false;
  for (const f of datos.fijos) {
    if (!f.activo) continue;
    for (let ym = f.desde; ym <= mesHoy; ym = sumarMes(ym, 1)) {
      const clave = `${f.id}|${ym}`;
      if (datos.generados[clave]) continue;
      const [y, m] = ym.split('-').map(Number);
      const dia = Math.min(f.dia, diasEnMes(y, m));
      if (ym === mesHoy && dia > diaHoy) continue; // todavía no llega
      const mov = { id: nuevoId(), tipo: f.tipo, monto: f.monto, cat: f.cat, fecha: `${ym}-${pad(dia)}`, nota: f.nombre, fijoId: f.id };
      if (datos.ajustes.confirmarRecurrentes) mov.pendiente = true;
      datos.movs.push(mov);
      datos.generados[clave] = true;
      cambios = true;
    }
  }
  if (cambios) guardar();
}
function fijosProgramados(ym) {
  // Recurrentes del mes actual que aún no se han registrado
  if (ym !== mesDe(hoyISO())) return [];
  return datos.fijos.filter(f => f.activo && f.desde <= ym && !datos.generados[`${f.id}|${ym}`]);
}
function confirmarMov(id) {
  const m = datos.movs.find(x => x.id === id);
  if (!m) return;
  delete m.pendiente;
  guardar(); pintar(); aviso('Movimiento confirmado');
}

// ---------- Estado de la interfaz ----------
let mesVista = mesDe(hoyISO());
let vista = 'inicio';
let panelMov = 'lista';
let diaSel = hoyISO();
const filtroInicial = () => ({ periodo: 'mes', fecha: hoyISO(), desde: '', hasta: '', semana: hoyISO(), quincena: 0, anio: Number(hoyISO().slice(0, 4)), tipo: 'todos', cat: '', estado: '', q: '', historial: true });
let filtro = filtroInicial();

const movsDelMes = ym => datos.movs.filter(m => mesDe(m.fecha) === ym);
function totales(lista) {
  let ing = 0, gas = 0;
  for (const m of lista) { if (m.pendiente) continue; if (m.tipo === 'ingreso') ing += m.monto; else gas += m.monto; }
  return { ing, gas, bal: ing - gas };
}
function totalesPendientes(lista) {
  let ing = 0, gas = 0, n = 0;
  for (const m of lista) { if (!m.pendiente) continue; n++; if (m.tipo === 'ingreso') ing += m.monto; else gas += m.monto; }
  return { ing, gas, n };
}
const ordenar = l => l.slice().sort((a, b) => b.fecha.localeCompare(a.fecha) || (b.id > a.id ? 1 : -1));

function itemHTML(m, o) {
  o = o || {};
  const etiqueta = m.fijoId ? (m.pendiente ? '<span class="etiqueta pen">Pendiente</span>' : '<span class="etiqueta rec">Recurrente</span>') : '';
  const sub = [o.sinFecha ? '' : fechaLarga(m.fecha), m.nota].filter(Boolean).map(esc).join(' · ');
  const clase = m.tipo === 'ingreso' && !m.pendiente ? 'positivo' : '';
  const confirmar = m.pendiente && o.confirmar ? `<button class="btn-confirmar" data-confirmar="${m.id}">Confirmar</button>` : '';
  return `<li class="item${m.pendiente ? ' pendiente' : ''}" data-id="${m.id}">
    ${catIco(m.tipo, m.cat)}
    <div class="info"><b>${esc(m.cat)}${etiqueta}</b><small>${sub || (m.tipo === 'ingreso' ? 'Ingreso' : 'Gasto')}</small></div>
    ${confirmar || `<div class="valor ${clase}">${Mfirma(m.monto, m.tipo)}</div>`}</li>`;
}
const vacioHTML = (txt, icono) => `<div class="vacio">${ico(icono || 'circle-dashed')}${txt}</div>`;

// ---------- Pintar ----------
const TITULOS = { inicio: 'Resumen', movimientos: 'Movimientos', graficas: 'Análisis', ajustes: 'Ajustes' };
function pintar() {
  $('tituloVista').textContent = TITULOS[vista];
  $('mesActual').textContent = mesCorto(mesVista);
  $('mesSiguiente').disabled = mesVista >= mesDe(hoyISO());
  const usaMes = vista === 'inicio' || vista === 'graficas' || vista === 'ajustes' ||
    (vista === 'movimientos' && (panelMov === 'calendario' || (panelMov === 'lista' && ['mes', 'quincena'].includes(filtro.periodo) && !(filtro.q.trim() && filtro.historial))));
  $('mesNav').hidden = !usaMes;
  pintarOjo();
  if (vista === 'inicio') pintarInicio();
  if (vista === 'movimientos') pintarMovimientos();
  if (vista === 'graficas') pintarGraficas();
  if (vista === 'ajustes') pintarAjustes();
}
function pintarOjo() {
  const b = $('btnOjo');
  b.innerHTML = ico(privado ? 'eye-off' : 'eye');
  b.setAttribute('aria-label', privado ? 'Mostrar montos' : 'Ocultar montos');
  b.setAttribute('aria-pressed', privado ? 'true' : 'false');
}

function pintarInicio() {
  const lista = movsDelMes(mesVista);
  const t = totales(lista);
  const conf = lista.filter(m => !m.pendiente);
  $('heroEtiqueta').textContent = `Balance de ${nombreMes(mesVista)}`;
  $('balanceMonto').textContent = Mneto(t.bal);
  $('totalIngresos').textContent = M(t.ing);
  $('totalGastos').textContent = M(t.gas);

  const p = t.ing > 0 ? pct(t.gas, t.ing) : (t.gas > 0 ? 100 : 0);
  let estado, pill, clasePill;
  if (!conf.length) { estado = 'Sin movimientos confirmados en este periodo.'; pill = 'Sin datos'; clasePill = ''; }
  else if (t.ing === 0) { estado = 'No hay ingresos registrados en el periodo.'; pill = 'Déficit'; clasePill = 'deficit'; }
  else if (t.bal < 0) { estado = `Los gastos superan los ingresos en ${M(-t.bal)}.`; pill = 'Déficit'; clasePill = 'deficit'; }
  else if (p > 90) { estado = `Margen ajustado: los gastos equivalen al ${p} % de los ingresos.`; pill = 'Margen ajustado'; clasePill = ''; }
  else { estado = `Los ingresos superan los gastos en ${M(t.bal)}.`; pill = 'Superávit'; clasePill = 'superavit'; }
  $('estadoMes').textContent = estado;
  $('estadoPill').textContent = pill;
  $('estadoPill').className = 'pill ' + clasePill;
  const barra = $('barraGasto');
  barra.style.width = Math.min(p, 100) + '%';
  barra.className = 'barra-relleno' + (p > 100 ? ' excedido' : p > 90 ? ' alto' : '');
  $('barraTexto').textContent = t.ing > 0 ? `Gasto sobre ingresos: ${p} %` : 'Registre un ingreso para calcular la relación gasto/ingreso.';

  // Proyección al cierre (solo mes en curso)
  const esMesActual = mesVista === mesDe(hoyISO());
  $('proyeccionCard').hidden = !esMesActual;
  if (esMesActual) {
    const tp = totalesPendientes(lista);
    const prog = fijosProgramados(mesVista);
    const prIng = prog.filter(f => f.tipo === 'ingreso').reduce((s, f) => s + f.monto, 0);
    const prGas = prog.filter(f => f.tipo === 'gasto').reduce((s, f) => s + f.monto, 0);
    const proy = t.bal + tp.ing - tp.gas + prIng - prGas;
    $('proyeccion').textContent = Mneto(proy);
    $('proyeccion').className = 'monto-md num ' + (proy < 0 ? 'negativo' : '');
    $('proyeccionDetalle').innerHTML = `
      <div><dt>Balance confirmado</dt><dd>${Mneto(t.bal)}</dd></div>
      <div><dt>Ingresos por recibir</dt><dd class="positivo">${privado ? OCULTO : '+' + dinero(tp.ing + prIng)}</dd></div>
      <div><dt>Pagos por realizar</dt><dd class="negativo">${privado ? OCULTO : '−' + dinero(tp.gas + prGas)}</dd></div>`;
  }

  // Pendientes de confirmación (todos los meses)
  const pend = ordenar(datos.movs.filter(m => m.pendiente));
  $('pendientesCard').hidden = !pend.length;
  $('pendientesCuenta').textContent = pend.length;
  $('pendientesLista').innerHTML = pend.slice(0, 6).map(m => itemHTML(m, { confirmar: true })).join('');

  // Alertas de presupuesto
  const gastoCat = {};
  conf.filter(m => m.tipo === 'gasto').forEach(m => gastoCat[m.cat] = (gastoCat[m.cat] || 0) + m.monto);
  $('alertas').innerHTML = Object.entries(datos.presupuestos)
    .filter(([c, lim]) => lim > 0 && (gastoCat[c] || 0) >= lim * .8)
    .map(([c, lim]) => {
      const g = gastoCat[c] || 0, exc = g > lim;
      return `<div class="card alerta ${exc ? 'excedido' : ''}">
        <span class="alerta-ico">${ico('triangle-alert')}</span>
        <div class="alerta-cuerpo"><b>${esc(c)}: ${exc ? 'presupuesto excedido' : `${pct(g, lim)} % del presupuesto utilizado`}</b>
        <div class="sub" style="margin:2px 0 0">${M(g)} de ${M(lim)}</div>
        <div class="mini-barra"><div style="width:${Math.min(100, g / lim * 100)}%"></div></div></div></div>`;
    }).join('');

  const ult = ordenar(lista).slice(0, 5);
  $('ultimos').innerHTML = ult.length ? ult.map(m => itemHTML(m)).join('')
    : `<li>${vacioHTML('Sin movimientos registrados en este periodo. Use el botón + para registrar uno.', 'wallet')}</li>`;
}

// ---------- Movimientos: filtros ----------
function rangoQuincena(ym, q) {
  return q === 2 ? { desde: `${ym}-16`, hasta: finMes(ym) } : { desde: `${ym}-01`, hasta: `${ym}-15` };
}
function quincenaActual() {
  if (filtro.quincena) return filtro.quincena;
  return mesVista === mesDe(hoyISO()) && Number(hoyISO().slice(8)) > 15 ? 2 : 1;
}
function rangoFiltro() {
  const f = filtro;
  switch (f.periodo) {
    case 'quincena': {
      const q = quincenaActual(), r = rangoQuincena(mesVista, q);
      return Object.assign(r, { etiqueta: `${q === 1 ? '1.ª' : '2.ª'} quincena de ${nombreMes(mesVista)}` });
    }
    case 'semana': {
      const desde = lunesDe(f.semana), hasta = sumarDias(desde, 6);
      return { desde, hasta, etiqueta: `Semana del ${rangoTexto(desde, hasta)}` };
    }
    case 'anio': return { desde: `${f.anio}-01-01`, hasta: `${f.anio}-12-31`, etiqueta: `Año ${f.anio}` };
    case 'fecha': return { desde: f.fecha, hasta: f.fecha, etiqueta: fechaLarga(f.fecha).replace(/^./, c => c.toUpperCase()) };
    case 'rango': {
      let a = f.desde || `${mesVista}-01`, b = f.hasta || finMes(mesVista);
      if (a > b) { const x = a; a = b; b = x; }
      return { desde: a, hasta: b, etiqueta: rangoTexto(a, b) };
    }
    case 'todo': return { desde: null, hasta: null, etiqueta: 'Todo el historial' };
    default: return { desde: `${mesVista}-01`, hasta: finMes(mesVista), etiqueta: nombreMes(mesVista).replace(/^./, c => c.toUpperCase()) };
  }
}
function aplicarFiltros(o) {
  o = o || {};
  const q = filtro.q.trim().toLowerCase();
  const enHistorial = q && filtro.historial;
  const r = enHistorial ? { desde: null, etiqueta: `Búsqueda «${filtro.q.trim()}» en todo el historial` } : rangoFiltro();
  let l = datos.movs;
  if (r.desde) l = l.filter(m => m.fecha >= r.desde && m.fecha <= r.hasta);
  if (filtro.tipo !== 'todos') l = l.filter(m => m.tipo === filtro.tipo);
  if (filtro.cat) { const [t, c] = filtro.cat.split('|'); l = l.filter(m => m.tipo === t && m.cat === c); }
  if (filtro.estado === 'pendiente') l = l.filter(m => m.pendiente);
  if (filtro.estado === 'confirmado') l = l.filter(m => !m.pendiente);
  if (q && !o.sinBusqueda) {
    const digitos = q.replace(/[.\s$]/g, '');
    const esNumero = /^\d+$/.test(digitos);
    l = l.filter(m => {
      const texto = `${m.cat} ${m.nota || ''} ${fechaCorta(m.fecha)} ${m.tipo}`.toLowerCase();
      return texto.includes(q) || (esNumero && String(m.monto).includes(digitos));
    });
  }
  return { lista: l, rango: r };
}
function descripcionFiltros() {
  const partes = [];
  if (filtro.tipo !== 'todos') partes.push(filtro.tipo === 'ingreso' ? 'Solo ingresos' : 'Solo gastos');
  if (filtro.cat) partes.push('Categoría: ' + filtro.cat.split('|')[1]);
  if (filtro.estado) partes.push(filtro.estado === 'pendiente' ? 'Solo pendientes' : 'Solo confirmados');
  if (filtro.q.trim()) partes.push(`Búsqueda: «${filtro.q.trim()}»`);
  return partes.join(' · ');
}
const hayFiltros = () => filtro.periodo !== 'mes' || filtro.tipo !== 'todos' || !!filtro.cat || !!filtro.estado;

function pintarCamposPeriodo() {
  const f = filtro, c = $('periodoCampos');
  document.querySelectorAll('#chipsPeriodo .chip').forEach(x => x.classList.toggle('activo', x.dataset.p === f.periodo));
  const hoy = hoyISO();
  let html = '';
  if (f.periodo === 'mes') html = `<label class="campo">Mes<input type="month" id="fMes" max="${mesDe(hoy)}" value="${mesVista}"></label>`;
  if (f.periodo === 'quincena') html = `<div class="segmento compacto" id="fQuincena"><button data-q="1">1 al 15</button><button data-q="2">16 a fin de mes</button></div>
      <label class="campo">Mes<input type="month" id="fMes" max="${mesDe(hoy)}" value="${mesVista}"></label>`;
  if (f.periodo === 'semana') html = `<label class="campo">Cualquier día de la semana<input type="date" id="fSemana" value="${f.semana}"></label>`;
  if (f.periodo === 'anio') {
    const anios = new Set([Number(hoy.slice(0, 4))]);
    datos.movs.forEach(m => anios.add(Number(m.fecha.slice(0, 4))));
    html = `<label class="campo">Año<select id="fAnio">${[...anios].sort((a, b) => b - a).map(a => `<option ${a === f.anio ? 'selected' : ''}>${a}</option>`).join('')}</select></label>`;
  }
  if (f.periodo === 'fecha') html = `<label class="campo">Fecha<input type="date" id="fFecha" value="${f.fecha}"></label>`;
  if (f.periodo === 'rango') html = `<div class="dos-campos"><label class="campo">Desde<input type="date" id="fDesde" value="${f.desde || mesVista + '-01'}"></label>
      <label class="campo">Hasta<input type="date" id="fHasta" value="${f.hasta || finMes(mesVista)}"></label></div>`;
  c.innerHTML = html;
  const on = (id, ev, fn) => { const el = $(id); if (el) el.addEventListener(ev, fn); };
  on('fMes', 'change', e => { if (/^\d{4}-\d{2}$/.test(e.target.value)) { mesVista = e.target.value > mesDe(hoyISO()) ? mesDe(hoyISO()) : e.target.value; pintar(); } });
  on('fSemana', 'change', e => { if (esFecha(e.target.value)) { filtro.semana = e.target.value; pintarMovimientos(); } });
  on('fAnio', 'change', e => { filtro.anio = Number(e.target.value); pintarMovimientos(); });
  on('fFecha', 'change', e => { if (esFecha(e.target.value)) { filtro.fecha = e.target.value; pintarMovimientos(); } });
  const rango = () => {
    const a = $('fDesde').value, b = $('fHasta').value;
    const malo = esFecha(a) && esFecha(b) && a > b;
    $('fHasta').classList.toggle('invalido', malo);
    if (malo) return aviso('La fecha final debe ser posterior a la inicial.');
    if (esFecha(a)) filtro.desde = a;
    if (esFecha(b)) filtro.hasta = b;
    pintarMovimientos();
  };
  on('fDesde', 'change', rango); on('fHasta', 'change', rango);
  const seg = $('fQuincena');
  if (seg) {
    seg.querySelectorAll('button').forEach(b => b.classList.toggle('activo', Number(b.dataset.q) === quincenaActual()));
    seg.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      filtro.quincena = Number(b.dataset.q);
      seg.querySelectorAll('button').forEach(x => x.classList.toggle('activo', x === b));
      pintarMovimientos();
    });
  }
}
function pintarSelectCategorias() {
  const opciones = tipo => catsDe(tipo).map(c => {
    const v = `${tipo}|${c.nombre}`;
    return `<option value="${esc(v)}" ${v === filtro.cat ? 'selected' : ''}>${esc(c.nombre)}</option>`;
  }).join('');
  $('filtroCat').innerHTML = `<option value="">Todas</option><optgroup label="Gastos">${opciones('gasto')}</optgroup><optgroup label="Ingresos">${opciones('ingreso')}</optgroup>`;
  $('filtroEstado').value = filtro.estado;
}

function pintarMovimientos() {
  document.querySelectorAll('#segMov button').forEach(b => b.classList.toggle('activo', b.dataset.panel === panelMov));
  document.querySelectorAll('#vista-movimientos .panel').forEach(p => p.classList.toggle('activo', p.id === 'panel-' + panelMov));
  if (panelMov === 'calendario') return pintarCalendario();
  if (panelMov === 'recurrentes') return pintarFijos();

  const fMes = $('fMes'); if (fMes && fMes.value !== mesVista) fMes.value = mesVista;
  $('filaHistorial').hidden = !filtro.q.trim();
  $('puntoFiltro').hidden = !hayFiltros();
  const { lista, rango } = aplicarFiltros();
  const t = totales(lista), tp = totalesPendientes(lista);
  $('resumenEtiqueta').textContent = rango.etiqueta;
  $('fIng').textContent = M(t.ing);
  $('fGas').textContent = M(t.gas);
  $('fBal').textContent = Mneto(t.bal);
  $('fBal').className = 'num ' + (t.bal < 0 ? 'negativo' : '');
  const notas = [`${lista.length} ${lista.length === 1 ? 'movimiento' : 'movimientos'}`];
  const d = descripcionFiltros(); if (d) notas.push(d);
  if (tp.n) notas.push(`${tp.n} pendiente${tp.n > 1 ? 's' : ''} sin incluir en los totales`);
  $('resumenNota').textContent = notas.join(' · ');

  const orden = ordenar(lista);
  if (!orden.length) { $('listaMovimientos').innerHTML = `<div class="card">${vacioHTML('No se encontraron movimientos con los filtros aplicados.', 'search')}</div>`; return; }
  const grupos = {};
  const MAX = 400;
  orden.slice(0, MAX).forEach(m => (grupos[m.fecha] = grupos[m.fecha] || []).push(m));
  $('listaMovimientos').innerHTML = Object.entries(grupos).map(([f, ms]) => {
    const td = totales(ms);
    return `<div class="dia-titulo"><span>${fechaLarga(f)}</span><span>${privado ? '' : (td.bal >= 0 ? '+' : '−') + dinero(Math.abs(td.bal))}</span></div>
      <div class="card lista-card"><ul class="lista">${ms.map(m => itemHTML(m, { sinFecha: true, confirmar: true })).join('')}</ul></div>`;
  }).join('') + (orden.length > MAX ? `<p class="sub" style="text-align:center">Se muestran los ${MAX} movimientos más recientes. Ajuste los filtros para acotar los resultados; los totales incluyen todos.</p>` : '');
}

// ---------- Calendario ----------
function pintarCalendario() {
  const [y, m] = mesVista.split('-').map(Number);
  const nDias = diasEnMes(y, m);
  const hoy = hoyISO();
  if (mesDe(diaSel) !== mesVista) diaSel = mesVista === mesDe(hoy) ? hoy : `${mesVista}-01`;
  const porDia = {};
  movsDelMes(mesVista).forEach(mv => (porDia[mv.fecha] = porDia[mv.fecha] || []).push(mv));
  const offset = (new Date(y, m - 1, 1).getDay() + 6) % 7;
  let html = '';
  for (let i = 0; i < offset; i++) html += '<div class="cal-dia vacio-dia"></div>';
  for (let d = 1; d <= nDias; d++) {
    const iso = `${mesVista}-${pad(d)}`;
    const ms = porDia[iso] || [];
    const t = totales(ms);
    const hayIng = ms.some(x => x.tipo === 'ingreso' && !x.pendiente), hayGas = ms.some(x => x.tipo === 'gasto' && !x.pendiente), hayPen = ms.some(x => x.pendiente);
    const clases = ['cal-dia', iso === hoy ? 'hoy' : '', iso === diaSel ? 'sel' : '', iso > hoy ? 'futuro' : ''].filter(Boolean).join(' ');
    const neto = (hayIng || hayGas) && !privado ? `<span class="cal-neto">${compacto(t.bal)}</span>` : '';
    html += `<button class="${clases}" data-dia="${iso}" aria-label="${fechaLarga(iso)}"><span class="n">${d}</span>
      <span class="cal-puntos">${hayIng ? '<i class="dot ing"></i>' : ''}${hayGas ? '<i class="dot gas"></i>' : ''}${hayPen ? '<i class="dot pen"></i>' : ''}</span>${neto}</button>`;
  }
  $('calGrid').innerHTML = html;

  const ms = ordenar(porDia[diaSel] || []);
  const t = totales(ms);
  const titulo = fechaLarga(diaSel);
  $('calDetalle').innerHTML = `<div class="cal-detalle-cabeza"><h3>${titulo === 'Hoy' || titulo === 'Ayer' ? titulo + ', ' + fechaMedia(diaSel) : titulo}</h3>
      <button class="icon-btn sm" id="calAgregar" aria-label="Registrar movimiento en este día">${ico('plus')}</button></div>
    <div class="kpis tres">
      <div><span>Ingresos</span><b class="num positivo">${M(t.ing)}</b></div>
      <div><span>Gastos</span><b class="num negativo">${M(t.gas)}</b></div>
      <div><span>Balance</span><b class="num ${t.bal < 0 ? 'negativo' : ''}">${Mneto(t.bal)}</b></div>
    </div>
    <ul class="lista" style="margin-top:6px">${ms.length ? ms.map(x => itemHTML(x, { sinFecha: true, confirmar: true })).join('') : `<li>${vacioHTML('Sin movimientos registrados en esta fecha.', 'calendar')}</li>`}</ul>`;
  $('calAgregar').onclick = () => abrirMov(null, diaSel);
}

// ---------- Recurrentes ----------
function estadoFijo(f) {
  const ym = mesDe(hoyISO());
  if (!f.activo) return '<span class="etiqueta pausa">En pausa</span>';
  if (datos.generados[`${f.id}|${ym}`]) {
    const mov = datos.movs.find(m => m.fijoId === f.id && mesDe(m.fecha) === ym);
    if (mov && mov.pendiente) return '<span class="etiqueta pen">Pendiente</span>';
    return '<span class="etiqueta ok">Confirmado</span>';
  }
  return '<span class="etiqueta prog">Programado</span>';
}
function pintarFijos() {
  const ing = datos.fijos.filter(f => f.activo && f.tipo === 'ingreso').reduce((s, f) => s + f.monto, 0);
  const gas = datos.fijos.filter(f => f.activo && f.tipo === 'gasto').reduce((s, f) => s + f.monto, 0);
  $('libreMensual').textContent = Mneto(ing - gas);
  $('libreMensual').className = 'monto-md num ' + (ing - gas < 0 ? 'negativo' : '');
  if (!datos.fijos.length) { $('listaFijos').innerHTML = `<div class="card">${vacioHTML('No hay movimientos recurrentes. Registre su salario, arriendo o servicios para proyectar el mes.', 'repeat')}</div>`; return; }
  const ym = mesDe(hoyISO());
  const grupo = (tipo, titulo) => {
    const fs = datos.fijos.filter(f => f.tipo === tipo).sort((a, b) => a.dia - b.dia);
    if (!fs.length) return '';
    const total = fs.filter(f => f.activo).reduce((s, f) => s + f.monto, 0);
    return `<div class="dia-titulo"><span>${titulo}</span><span>${privado ? '' : dinero(total) + ' / mes'}</span></div>
      <div class="card lista-card"><ul class="lista">${fs.map(f => {
        const mov = datos.movs.find(m => m.fijoId === f.id && mesDe(m.fecha) === ym && m.pendiente);
        const accion = mov ? `<button class="btn-confirmar" data-confirmar="${mov.id}">Confirmar</button>` : `<div class="valor ${tipo === 'ingreso' ? 'positivo' : ''}">${M(f.monto)}</div>`;
        return `<li class="item${f.activo ? '' : ' pendiente'}" data-fijo="${f.id}">
          ${catIco(f.tipo, f.cat)}
          <div class="info"><b>${esc(f.nombre)}${estadoFijo(f)}</b><small>Día ${f.dia} de cada mes · ${esc(f.cat)}</small></div>
          ${accion}</li>`;
      }).join('')}</ul></div>`;
  };
  $('listaFijos').innerHTML = grupo('ingreso', 'Ingresos recurrentes') + grupo('gasto', 'Gastos recurrentes');
}

// ---------- Gráficas ----------
const graficas = {};
function colorVar(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }
function grafica(id, config) {
  if (typeof Chart === 'undefined') return;
  if (graficas[id]) graficas[id].destroy();
  Chart.defaults.color = colorVar('--texto-2');
  Chart.defaults.borderColor = colorVar('--separador');
  Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;
  Chart.defaults.font.size = 11.5;
  graficas[id] = new Chart($(id), config);
}
const ejeDinero = () => ({
  border: { display: false }, grid: { color: colorVar('--separador') },
  ticks: { maxTicksLimit: 5, callback: v => privado ? '' : Math.abs(v) >= 1e6 ? (v / 1e6).toLocaleString('es-CO', { maximumFractionDigits: 1 }) + ' M' : Math.abs(v) >= 1e3 ? Math.round(v / 1e3).toLocaleString('es-CO') + ' mil' : v }
});
const tooltipBase = () => ({
  backgroundColor: colorVar('--texto'), titleColor: colorVar('--fondo'), bodyColor: colorVar('--fondo'),
  padding: 10, cornerRadius: 10, displayColors: true, boxPadding: 4, usePointStyle: true,
  callbacks: { label: c => ` ${c.dataset.label || c.label}: ${privado ? OCULTO : dinero(c.raw)}` }
});

function pintarGraficas() {
  const lista = movsDelMes(mesVista);
  const t = totales(lista);
  const anterior = totales(movsDelMes(sumarMes(mesVista, -1)));
  const [y, m] = mesVista.split('-').map(Number);
  const esActual = mesVista === mesDe(hoyISO());
  const diasTrans = esActual ? Number(hoyISO().slice(8)) : diasEnMes(y, m);

  // Indicadores
  const porCat = {};
  lista.filter(x => x.tipo === 'gasto' && !x.pendiente).forEach(x => porCat[x.cat] = (porCat[x.cat] || 0) + x.monto);
  const cats = Object.entries(porCat).sort((a, b) => b[1] - a[1]);
  const tasa = t.ing > 0 ? Math.round(t.bal / t.ing * 100) : null;
  const variacion = anterior.gas > 0 ? Math.round((t.gas - anterior.gas) / anterior.gas * 100) : null;
  $('kpisAnalisis').innerHTML = `
    <div class="kpi"><span>Tasa de ahorro</span><b class="${tasa !== null && tasa < 0 ? 'negativo' : ''}">${tasa === null ? '—' : tasa + ' %'}</b><small>Balance sobre ingresos</small></div>
    <div class="kpi"><span>Gasto diario promedio</span><b>${M(t.gas / Math.max(1, diasTrans))}</b><small>${diasTrans} días del periodo</small></div>
    <div class="kpi"><span>Principal categoría</span><b>${cats.length ? esc(cats[0][0]) : '—'}</b><small>${cats.length ? M(cats[0][1]) + ' · ' + pct(cats[0][1], t.gas) + ' %' : 'Sin gastos'}</small></div>
    <div class="kpi"><span>Gasto vs. mes anterior</span><b class="${variacion > 0 ? 'negativo' : variacion < 0 ? 'positivo' : ''}">${variacion === null ? '—' : (variacion > 0 ? '+' : '') + variacion + ' %'}</b><small>${mesCorto(sumarMes(mesVista, -1))}: ${M(anterior.gas)}</small></div>`;

  // 1. Últimos 6 meses
  const meses = [...Array(6)].map((_, i) => sumarMes(mesVista, i - 5));
  const t6 = meses.map(ym => totales(movsDelMes(ym)));
  grafica('gMeses', {
    data: {
      labels: meses.map(ym => MESES_C[Number(ym.slice(5)) - 1]),
      datasets: [
        { type: 'bar', label: 'Ingresos', data: t6.map(x => x.ing), backgroundColor: colorVar('--positivo'), borderRadius: 5, maxBarThickness: 18, order: 2 },
        { type: 'bar', label: 'Gastos', data: t6.map(x => x.gas), backgroundColor: colorVar('--negativo'), borderRadius: 5, maxBarThickness: 18, order: 2 },
        { type: 'line', label: 'Balance', data: t6.map(x => x.bal), borderColor: colorVar('--primario'), backgroundColor: colorVar('--primario'), borderWidth: 2, pointRadius: 3, tension: .3, order: 1 }
      ]
    },
    options: {
      maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
      scales: { x: { grid: { display: false }, border: { display: false } }, y: ejeDinero() },
      plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, pointStyle: 'circle', boxWidth: 7, boxHeight: 7, padding: 16 } }, tooltip: tooltipBase() }
    }
  });

  // 2. Distribución del gasto
  const total = t.gas;
  $('gCatPeriodo').textContent = nombreMes(mesVista);
  $('donaTotal').textContent = M(total);
  const colores = cats.map(([c]) => infoCat('gasto', c).color);
  grafica('gCategorias', {
    type: 'doughnut',
    data: { labels: cats.map(c => c[0]), datasets: [{ data: cats.length ? cats.map(c => c[1]) : [1], backgroundColor: cats.length ? colores : [colorVar('--superficie-2')], borderWidth: 2, borderColor: colorVar('--superficie'), hoverOffset: 4 }] },
    options: { maintainAspectRatio: false, cutout: '72%', plugins: { legend: { display: false }, tooltip: cats.length ? tooltipBase() : { enabled: false } } }
  });
  $('topCategorias').innerHTML = cats.length ? cats.map(([c, v]) => {
    const color = infoCat('gasto', c).color;
    return `<li class="item">${catIco('gasto', c)}<div class="info"><b>${esc(c)}</b>
      <div class="barra-cat"><div style="width:${pct(v, total)}%;background:${color}"></div></div></div>
      <div class="valor">${M(v)}<small>${pct(v, total)} %</small></div></li>`;
  }).join('') : `<li>${vacioHTML('Sin gastos confirmados en este periodo.', 'chart-pie')}</li>`;

  // 3. Saldo acumulado día a día
  const porDia = Array(diasTrans).fill(0);
  lista.forEach(mv => {
    if (mv.pendiente) return;
    const d = Number(mv.fecha.slice(8));
    if (d <= diasTrans) porDia[d - 1] += mv.tipo === 'ingreso' ? mv.monto : -mv.monto;
  });
  let acum = 0;
  const saldo = porDia.map(v => acum += v);
  const pos = colorVar('--positivo'), neg = colorVar('--negativo');
  grafica('gSaldo', {
    type: 'line',
    data: {
      labels: saldo.map((_, i) => i + 1),
      datasets: [{
        label: 'Saldo', data: saldo, tension: .25, pointRadius: 0, pointHoverRadius: 4, borderWidth: 2.25,
        fill: { target: 'origin', above: hexA(rgbAHex(pos), .12), below: hexA(rgbAHex(neg), .14) },
        segment: { borderColor: c => c.p1.parsed.y < 0 ? neg : pos }, borderColor: pos
      }]
    },
    options: {
      maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
      plugins: { legend: { display: false }, tooltip: Object.assign(tooltipBase(), { callbacks: { title: c => `Día ${c[0].label}`, label: c => ' ' + (privado ? OCULTO : dinero(c.raw)) } }) },
      scales: { x: { grid: { display: false }, border: { display: false }, ticks: { maxTicksLimit: 8 } }, y: ejeDinero() }
    }
  });
}
function rgbAHex(c) { // acepta #rrggbb
  return /^#[0-9a-f]{6}$/i.test(c) ? c : '#64748b';
}

// ---------- Ajustes ----------
let pdfPreset = 'mes';
function rangoPdf() {
  const hoy = hoyISO();
  switch (pdfPreset) {
    case 'quincena': { const q = mesVista === mesDe(hoy) && Number(hoy.slice(8)) > 15 ? 2 : 1; const r = rangoQuincena(mesVista, q); r.etiqueta = `${q === 1 ? '1.ª' : '2.ª'} quincena de ${nombreMes(mesVista)}`; return r; }
    case 'anio': { const a = mesVista.slice(0, 4); return { desde: `${a}-01-01`, hasta: `${a}-12-31`, etiqueta: `Año ${a}` }; }
    case 'filtros': {
      const { lista, rango } = aplicarFiltros();
      let desde = rango.desde, hasta = rango.hasta;
      if (!desde) {
        const fechas = lista.map(m => m.fecha).sort();
        desde = fechas[0] || hoy; hasta = fechas[fechas.length - 1] || hoy;
      }
      return { desde, hasta, etiqueta: rango.etiqueta, lista, filtros: descripcionFiltros() };
    }
    case 'personalizado': { const a = $('pdfDesde').value, b = $('pdfHasta').value; return { desde: a, hasta: b, etiqueta: esFecha(a) && esFecha(b) ? rangoTexto(a, b) : '' }; }
    default: return { desde: `${mesVista}-01`, hasta: finMes(mesVista), etiqueta: nombreMes(mesVista).replace(/^./, c => c.toUpperCase()) };
  }
}
function pintarPdfCampos() {
  document.querySelectorAll('#pdfPresets .chip').forEach(c => c.classList.toggle('activo', c.dataset.pp === pdfPreset));
  const r = rangoPdf();
  if (pdfPreset !== 'personalizado') { $('pdfDesde').value = r.desde; $('pdfHasta').value = r.hasta; }
  $('pdfDesde').disabled = $('pdfHasta').disabled = pdfPreset === 'filtros';
  $('pdfHasta').min = $('pdfDesde').value || '';
  const valido = esFecha(r.desde) && esFecha(r.hasta) && r.desde <= r.hasta;
  $('pdfHasta').classList.toggle('invalido', !valido && !!$('pdfHasta').value);
  if (!valido) { $('pdfResumen').textContent = 'Revise el periodo: la fecha final debe ser igual o posterior a la inicial.'; return; }
  const lista = r.lista || datos.movs.filter(m => m.fecha >= r.desde && m.fecha <= r.hasta);
  $('pdfResumen').textContent = `${r.etiqueta} · ${lista.length} ${lista.length === 1 ? 'movimiento' : 'movimientos'}${r.filtros ? ' · ' + r.filtros : ''}`;
}
function pintarAjustes() {
  document.querySelectorAll('#temaSeg button').forEach(c => c.classList.toggle('activo', c.dataset.tema === datos.ajustes.tema));
  document.querySelectorAll('#paletas button').forEach(c => c.classList.toggle('activo', c.dataset.paleta === datos.ajustes.paleta));
  $('ocultarAlAbrir').checked = !!datos.ajustes.ocultar;
  $('ocultarAlSalir').checked = !!datos.ajustes.ocultarAlSalir;
  $('confirmarRecurrentes').checked = !!datos.ajustes.confirmarRecurrentes;
  $('cuentaCategorias').textContent = catsDe('gasto').length + catsDe('ingreso').length;
  $('cuentaPresupuestos').textContent = Object.values(datos.presupuestos).filter(v => v > 0).length || '';
  $('cuentaRecurrentes').textContent = datos.fijos.length || '';
  $('ultimaCopia').textContent = datos.ajustes.ultimaCopia ? `Última copia: ${fechaMedia(datos.ajustes.ultimaCopia)}` : 'Aún no se ha exportado ninguna copia';
  const resp = leerRespaldoAuto();
  $('btnDeshacerRestauracion').hidden = !resp;
  if (resp) $('infoRespaldoAuto').textContent = `Datos previos guardados el ${fechaMedia(resp.fecha.slice(0, 10))}`;
  pintarPdfCampos();
}
const PALETA_HEX = { petroleo: '#0f766e', azul: '#1d4ed8', morado: '#6d28d9' };
function aplicarTema() {
  const t = datos.ajustes.tema, root = document.documentElement;
  if (t === 'claro') root.dataset.theme = 'light';
  else if (t === 'oscuro') root.dataset.theme = 'dark';
  else delete root.dataset.theme;
  root.dataset.palette = datos.ajustes.paleta;
  requestAnimationFrame(() => { $('metaTema').setAttribute('content', colorVar('--fondo') || '#f5f6f7'); });
}

// ---------- Navegación ----------
function irA(v) {
  vista = v;
  document.querySelectorAll('.vista').forEach(s => s.classList.toggle('activa', s.id === 'vista-' + v));
  document.querySelectorAll('.tabbar .tab').forEach(t => t.classList.toggle('activa', t.dataset.ir === v));
  window.scrollTo(0, 0);
  pintar();
}

// ---------- Hojas (formularios) ----------
const pila = [];
function abrirHoja(id) {
  const h = $(id);
  if (pila.includes(h)) return;
  h.classList.toggle('encima', pila.length > 0);
  pila.push(h);
  $('fondo').classList.add('visible');
  h.classList.add('visible');
  h.scrollTop = 0;
}
function cerrarHoja() {
  const h = pila.pop();
  if (!h) return;
  h.classList.remove('visible');
  if (!pila.length) $('fondo').classList.remove('visible');
  if (document.activeElement) document.activeElement.blur();
}
function pintarCats(contenedor, tipo, seleccion) {
  contenedor.innerHTML = catsDe(tipo).map(c => `<button type="button" class="cat ${c.nombre === seleccion ? 'activo' : ''}" data-cat="${esc(c.nombre)}">${catIco(tipo, c.nombre)}<span>${esc(c.nombre)}</span></button>`).join('');
}
function catElegida(contenedor) { const b = contenedor.querySelector('.cat.activo'); return b ? b.dataset.cat : null; }
function usarSegmento(seg, alCambiar) {
  seg.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    seg.querySelectorAll('button').forEach(x => x.classList.toggle('activo', x === b));
    alCambiar(b.dataset.tipo);
  });
}
const tipoDe = seg => seg.querySelector('.activo').dataset.tipo;
function ponerTipo(seg, tipo) { seg.querySelectorAll('button').forEach(x => x.classList.toggle('activo', x.dataset.tipo === tipo)); }

// Movimiento
let editandoMov = null;
function abrirMov(mov, fecha) {
  editandoMov = mov || null;
  const tipo = mov ? mov.tipo : 'gasto';
  $('hojaMovTitulo').textContent = mov ? 'Editar movimiento' : 'Nuevo movimiento';
  ponerTipo($('segTipo'), tipo);
  $('movMonto').value = mov ? mov.monto.toLocaleString('es-CO') : '';
  pintarCats($('movCats'), tipo, mov ? mov.cat : null);
  const hoy = hoyISO();
  $('movFecha').value = mov ? mov.fecha : (fecha || (mesVista === mesDe(hoy) ? hoy : mesVista + '-01'));
  $('movNota').value = mov ? (mov.nota || '') : '';
  $('movRepetir').checked = false;
  $('filaRepetir').hidden = !!mov;
  $('movEliminar').hidden = !mov;
  $('movConfirmar').hidden = !(mov && mov.pendiente);
  $('movEstadoBanner').hidden = !(mov && mov.pendiente);
  abrirHoja('hojaMov');
  if (!mov) setTimeout(() => $('movMonto').focus(), 280);
}
function guardarMov() {
  const monto = soloDigitos($('movMonto').value);
  const tipo = tipoDe($('segTipo'));
  const cat = catElegida($('movCats'));
  const fecha = $('movFecha').value;
  const nota = $('movNota').value.trim();
  if (!monto) return aviso('Ingrese el valor del movimiento.');
  if (monto > 1e13) return aviso('El valor ingresado no es válido.');
  if (!cat) return aviso('Seleccione una categoría.');
  if (!esFecha(fecha)) return aviso('Seleccione una fecha válida.');
  if (editandoMov) {
    Object.assign(editandoMov, { tipo, monto, cat, fecha, nota });
    aviso('Cambios guardados');
  } else {
    const mov = { id: nuevoId(), tipo, monto, cat, fecha, nota };
    if ($('movRepetir').checked) {
      const f = { id: nuevoId(), tipo, nombre: nota || cat, monto, cat, dia: Number(fecha.slice(8)), activo: true, desde: mesDe(fecha) };
      datos.fijos.push(f);
      datos.generados[`${f.id}|${mesDe(fecha)}`] = true;
      mov.fijoId = f.id;
      if (!nota) mov.nota = f.nombre;
    }
    datos.movs.push(mov);
    aviso(tipo === 'gasto' ? 'Gasto registrado' : 'Ingreso registrado');
  }
  guardar(); generarFijos();
  if (mesDe(fecha) <= mesDe(hoyISO())) mesVista = mesDe(fecha);
  if (panelMov === 'calendario') diaSel = fecha;
  cerrarHoja(); pintar();
}
function eliminarMov() {
  if (!editandoMov || !confirm('¿Eliminar este movimiento? Esta acción no se puede deshacer.')) return;
  datos.movs = datos.movs.filter(m => m !== editandoMov);
  guardar(); cerrarHoja(); pintar(); aviso('Movimiento eliminado');
}

// Recurrente
let editandoFijo = null;
function abrirFijo(f) {
  editandoFijo = f || null;
  const tipo = f ? f.tipo : 'gasto';
  $('hojaFijoTitulo').textContent = f ? 'Editar recurrente' : 'Nuevo recurrente';
  ponerTipo($('segTipoFijo'), tipo);
  $('fijoNombre').value = f ? f.nombre : '';
  $('fijoMonto').value = f ? f.monto.toLocaleString('es-CO') : '';
  pintarCats($('fijoCats'), tipo, f ? f.cat : null);
  $('fijoDia').value = f ? f.dia : Number(hoyISO().slice(8));
  $('fijoActivo').checked = f ? !!f.activo : true;
  $('filaFijoActivo').hidden = !f;
  $('fijoEliminar').hidden = !f;
  abrirHoja('hojaFijo');
}
function guardarFijo() {
  const tipo = tipoDe($('segTipoFijo'));
  const nombre = $('fijoNombre').value.trim();
  const monto = soloDigitos($('fijoMonto').value);
  const cat = catElegida($('fijoCats'));
  const dia = Math.min(31, Math.max(1, parseInt($('fijoDia').value, 10) || 1));
  if (!nombre) return aviso('Ingrese un nombre para el recurrente.');
  if (!monto) return aviso('Ingrese el valor del movimiento.');
  if (!cat) return aviso('Seleccione una categoría.');
  if (editandoFijo) {
    const reactivar = !editandoFijo.activo && $('fijoActivo').checked;
    Object.assign(editandoFijo, { tipo, nombre, monto, cat, dia, activo: $('fijoActivo').checked });
    // Al reactivar, no generar los meses que estuvo en pausa
    if (reactivar) editandoFijo.desde = editandoFijo.desde > mesDe(hoyISO()) ? editandoFijo.desde : mesDe(hoyISO());
    aviso('Recurrente actualizado. Los cambios aplican desde el próximo registro.');
  } else {
    datos.fijos.push({ id: nuevoId(), tipo, nombre, monto, cat, dia, activo: true, desde: mesDe(hoyISO()) });
    aviso(dia <= Number(hoyISO().slice(8)) ? 'Recurrente creado y registrado en el mes actual' : `Se registrará automáticamente el día ${dia}`);
  }
  guardar(); generarFijos(); cerrarHoja(); pintar();
}
function eliminarFijo() {
  if (!editandoFijo) return;
  if (!confirm(`¿Eliminar «${editandoFijo.nombre}»? Los movimientos ya registrados se conservan.`)) return;
  const id = editandoFijo.id;
  datos.fijos = datos.fijos.filter(f => f.id !== id);
  datos.movs.forEach(m => { if (m.fijoId === id) delete m.fijoId; });
  guardar(); cerrarHoja(); pintar(); aviso('Recurrente eliminado');
}

// ---------- Categorías personalizadas ----------
let tipoCats = 'gasto';
let editandoCat = null; // { tipo, nombreOriginal | null }
let catTemp = { nombre: '', icono: 'tag', color: COLORES[0] };
const usosCat = (tipo, nombre) => datos.movs.filter(m => m.tipo === tipo && m.cat === nombre).length + datos.fijos.filter(f => f.tipo === tipo && f.cat === nombre).length;
function pintarAdminCats() {
  ponerTipo($('segTipoCats'), tipoCats);
  const lista = catsDe(tipoCats);
  $('listaCategorias').innerHTML = lista.map((c, i) => {
    const n = usosCat(tipoCats, c.nombre);
    return `<li class="item" data-cat-i="${i}">${catIco(tipoCats, c.nombre)}
      <div class="info"><b>${esc(c.nombre)}</b><small>${n ? n + (n === 1 ? ' registro' : ' registros') : 'Sin registros'}</small></div>
      <div class="orden"><button data-mover="-1" aria-label="Subir" ${i === 0 ? 'disabled' : ''}>${ico('chevron-up')}</button><button data-mover="1" aria-label="Bajar" ${i === lista.length - 1 ? 'disabled' : ''}>${ico('chevron-down')}</button></div>
      <button class="btn-editar" data-editar-cat aria-label="Editar">${ico('pencil')}</button></li>`;
  }).join('');
}
function abrirCategoria(tipo, cat) {
  editandoCat = { tipo, original: cat ? cat.nombre : null };
  catTemp = cat ? { nombre: cat.nombre, icono: cat.icono, color: cat.color } : { nombre: '', icono: 'tag', color: COLORES[catsDe(tipo).length % COLORES.length] };
  $('hojaCategoriaTitulo').textContent = cat ? 'Editar categoría' : `Nueva categoría de ${tipo === 'gasto' ? 'gasto' : 'ingreso'}`;
  $('catNombre').value = catTemp.nombre;
  $('catEliminar').hidden = !cat;
  $('catColores').innerHTML = COLORES.map(c => `<button type="button" data-color="${c}" style="--c:${c}" aria-label="Color ${c}"></button>`).join('');
  $('catIconos').innerHTML = ICONOS_CAT.filter(n => ICONOS[n]).map(n => `<button type="button" data-icono="${n}" aria-label="${n}">${ico(n)}</button>`).join('');
  pintarCatTemp();
  abrirHoja('hojaCategoria');
}
function pintarCatTemp() {
  $('catPreview').style.setProperty('--c', catTemp.color);
  $('catPreview').style.setProperty('--cs', hexA(catTemp.color, .13));
  $('catPreview').innerHTML = ico(catTemp.icono);
  $('catColores').querySelectorAll('button').forEach(b => b.classList.toggle('activo', b.dataset.color === catTemp.color));
  $('catIconos').querySelectorAll('button').forEach(b => b.classList.toggle('activo', b.dataset.icono === catTemp.icono));
}
function renombrarCat(tipo, viejo, nuevo) {
  datos.movs.forEach(m => { if (m.tipo === tipo && m.cat === viejo) m.cat = nuevo; });
  datos.fijos.forEach(f => { if (f.tipo === tipo && f.cat === viejo) f.cat = nuevo; });
  if (tipo === 'gasto' && datos.presupuestos[viejo] !== undefined) {
    datos.presupuestos[nuevo] = datos.presupuestos[viejo];
    delete datos.presupuestos[viejo];
  }
  if (filtro.cat === `${tipo}|${viejo}`) filtro.cat = nuevo ? `${tipo}|${nuevo}` : '';
}
function guardarCategoria() {
  const { tipo, original } = editandoCat;
  const nombre = $('catNombre').value.trim().replace(/\|/g, '').slice(0, 24);
  if (!nombre) return aviso('Ingrese un nombre para la categoría.');
  const lista = catsDe(tipo);
  if (lista.some(c => c.nombre.toLowerCase() === nombre.toLowerCase() && c.nombre !== original)) return aviso('Ya existe una categoría con ese nombre.');
  if (original) {
    const c = lista.find(x => x.nombre === original);
    Object.assign(c, { nombre, icono: catTemp.icono, color: catTemp.color });
    if (original !== nombre) renombrarCat(tipo, original, nombre);
    aviso('Categoría actualizada');
  } else {
    lista.push({ nombre, icono: catTemp.icono, color: catTemp.color });
    aviso('Categoría creada');
  }
  guardar(); cerrarHoja(); pintarAdminCats(); pintar();
}
function eliminarCategoria() {
  const { tipo, original } = editandoCat;
  const lista = catsDe(tipo);
  if (lista.length <= 1) return aviso('Debe existir al menos una categoría.');
  const n = usosCat(tipo, original);
  let destino = 'Otros';
  if (original === 'Otros') destino = lista.find(c => c.nombre !== 'Otros').nombre;
  const msg = n ? `Los ${n} registros de «${original}» se reasignarán a «${destino}». ¿Eliminar la categoría?` : `¿Eliminar la categoría «${original}»?`;
  if (!confirm(msg)) return;
  datos.categorias[tipo] = lista.filter(c => c.nombre !== original);
  if (n) {
    if (!datos.categorias[tipo].some(c => c.nombre === destino)) datos.categorias[tipo].push({ nombre: 'Otros', icono: 'package', color: '#64748b' });
    datos.movs.forEach(m => { if (m.tipo === tipo && m.cat === original) m.cat = destino; });
    datos.fijos.forEach(f => { if (f.tipo === tipo && f.cat === original) f.cat = destino; });
  }
  if (tipo === 'gasto') delete datos.presupuestos[original];
  if (filtro.cat === `${tipo}|${original}`) filtro.cat = '';
  guardar(); cerrarHoja(); pintarAdminCats(); pintar(); aviso('Categoría eliminada');
}

// ---------- Presupuestos ----------
function abrirPresupuestos() {
  $('listaPresupuestos').innerHTML = catsDe('gasto').map(c => `
    <div class="presupuesto-fila">${catIco('gasto', c.nombre)}<span class="nombre">${esc(c.nombre)}</span>
    <input type="text" inputmode="numeric" placeholder="Sin límite" data-pres="${esc(c.nombre)}" value="${datos.presupuestos[c.nombre] ? datos.presupuestos[c.nombre].toLocaleString('es-CO') : ''}" aria-label="Presupuesto de ${esc(c.nombre)}"></div>`).join('');
  $('listaPresupuestos').querySelectorAll('input').forEach(inp => {
    formatearInput(inp);
    inp.addEventListener('change', () => {
      const v = soloDigitos(inp.value);
      if (v) datos.presupuestos[inp.dataset.pres] = v; else delete datos.presupuestos[inp.dataset.pres];
      guardar(); aviso('Presupuesto guardado');
    });
  });
  abrirHoja('hojaPresupuestos');
}

// ---------- Extracto PDF ----------
function hexARgb(hex) { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
const pdfTexto = s => String(s).replace(/−/g, '-').replace(/[«»]/g, '"').replace(/•/g, '*').replace(/[^\x00-\xFF–—‘’“”…]/g, '');
async function generarPDF(o) {
  if (!window.jspdf || !window.jspdf.jsPDF) return aviso('No fue posible cargar el generador de PDF.');
  const { desde, hasta } = o;
  if (!esFecha(desde) || !esFecha(hasta) || desde > hasta) return aviso('Revise el periodo: la fecha final debe ser igual o posterior a la inicial.');
  const lista = (o.lista || datos.movs.filter(m => m.fecha >= desde && m.fecha <= hasta)).slice()
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || (a.id > b.id ? 1 : -1));
  const conf = lista.filter(m => !m.pendiente);
  const t = totales(conf), tp = totalesPendientes(lista);
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight(), X = 44;
  const acento = hexARgb(PALETA_HEX[datos.ajustes.paleta] || PALETA_HEX.petroleo);
  const tinta = [16, 24, 32], gris = [86, 97, 108], grisClaro = [139, 148, 157], linea = [226, 230, 234], caja = [245, 246, 247];
  const verde = [21, 128, 61], rojo = [190, 30, 30];
  const T = pdfTexto;
  const ahora = new Date();
  const emision = `${fechaCorta(isoDe(ahora))} ${pad(ahora.getHours())}:${pad(ahora.getMinutes())}`;

  // Encabezado
  doc.setFillColor(...acento); doc.rect(0, 0, W, 5, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...acento);
  doc.text('MIS FINANZAS', X, 42);
  doc.setFontSize(20); doc.setTextColor(...tinta);
  doc.text('Extracto de movimientos', X, 66);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...grisClaro);
  doc.text('PERIODO', W - X, 36, { align: 'right' });
  doc.text('FECHA DE EMISIÓN', W - X, 62, { align: 'right' });
  doc.setFontSize(10); doc.setTextColor(...tinta);
  doc.text(T(`${fechaCorta(desde)} - ${fechaCorta(hasta)}`), W - X, 49, { align: 'right' });
  doc.text(emision, W - X, 75, { align: 'right' });
  doc.setDrawColor(...linea); doc.setLineWidth(.75); doc.line(X, 90, W - X, 90);
  let y = 108;
  doc.setFontSize(9); doc.setTextColor(...gris);
  const desc = [o.etiqueta ? 'Consulta: ' + o.etiqueta : '', o.filtros ? 'Filtros: ' + o.filtros : ''].filter(Boolean).join('   |   ');
  if (desc) { doc.text(doc.splitTextToSize(T(desc), W - 2 * X), X, y); y += 18; }

  // Resumen en cajas
  const tasa = t.ing > 0 ? Math.round(t.bal / t.ing * 100) + ' %' : 'N/D';
  const cajas = [['Ingresos', dinero(t.ing), verde], ['Gastos', dinero(t.gas), rojo], ['Balance neto', (t.bal < 0 ? '-' : '') + dinero(Math.abs(t.bal)), t.bal < 0 ? rojo : tinta], ['Tasa de ahorro', tasa, tinta]];
  const gap = 8, ancho = (W - 2 * X - gap * 3) / 4;
  cajas.forEach(([n, v, c], i) => {
    const x = X + i * (ancho + gap);
    doc.setFillColor(...caja); doc.roundedRect(x, y, ancho, 54, 6, 6, 'F');
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...gris); doc.text(n, x + 11, y + 19);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12.5); doc.setTextColor(...c); doc.text(T(v), x + 11, y + 39);
  });
  y += 54 + 20;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(...tinta);
  let obs = t.bal < 0
    ? `Resultado del periodo: déficit de ${dinero(-t.bal)}. Los gastos superaron a los ingresos.`
    : `Resultado del periodo: superávit de ${dinero(t.bal)}.`;
  obs += ` Se incluyen ${conf.length} movimientos confirmados.`;
  if (tp.n) obs += ` ${tp.n} movimiento(s) recurrente(s) pendiente(s) de confirmación (ingresos ${dinero(tp.ing)}, gastos ${dinero(tp.gas)}) no se suman a los totales.`;
  const lineas = doc.splitTextToSize(T(obs), W - 2 * X);
  doc.text(lineas, X, y); y += lineas.length * 12 + 14;

  const estilos = {
    theme: 'plain', margin: { left: X, right: X, top: 50, bottom: 50 },
    styles: { font: 'helvetica', fontSize: 8.5, textColor: tinta, cellPadding: { top: 5, bottom: 5, left: 6, right: 6 }, overflow: 'linebreak' },
    headStyles: { fillColor: caja, textColor: gris, fontStyle: 'bold', fontSize: 8 },
    footStyles: { fillColor: caja, textColor: tinta, fontStyle: 'bold' },
    didDrawCell: d => { if (d.section === 'body') { doc.setDrawColor(...linea); doc.setLineWidth(.5); doc.line(d.cell.x, d.cell.y + d.cell.height, d.cell.x + d.cell.width, d.cell.y + d.cell.height); } }
  };
  const seccion = titulo => {
    if (y > H - 130) { doc.addPage(); y = 56; }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...tinta);
    doc.text(T(titulo), X, y); y += 8;
  };

  // Resumen por categoría
  const porCat = {};
  conf.forEach(m => { const k = m.tipo + '|' + m.cat; porCat[k] = porCat[k] || { tipo: m.tipo, cat: m.cat, n: 0, v: 0 }; porCat[k].n++; porCat[k].v += m.monto; });
  const filasCat = Object.values(porCat).sort((a, b) => (a.tipo === b.tipo ? b.v - a.v : a.tipo === 'gasto' ? -1 : 1));
  if (filasCat.length) {
    seccion('Resumen por categoría');
    doc.autoTable(Object.assign({}, estilos, {
      startY: y,
      head: [['Categoría', 'Tipo', 'Movimientos', 'Total', 'Participación']],
      body: filasCat.map(r => [T(r.cat), r.tipo === 'gasto' ? 'Gasto' : 'Ingreso', String(r.n), dinero(r.v), pct(r.v, r.tipo === 'gasto' ? t.gas : t.ing) + ' %']),
      columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right', cellWidth: 110 } },
      didParseCell: d => { if (d.section === 'head' && d.column.index >= 2) d.cell.styles.halign = 'right'; },
      didDrawCell: d => {
        estilos.didDrawCell(d);
        if (d.section === 'body' && d.column.index === 4) {
          const r = filasCat[d.row.index], p = pct(r.v, r.tipo === 'gasto' ? t.gas : t.ing) / 100;
          const bx = d.cell.x + 6, by = d.cell.y + d.cell.height / 2 - 2, bw = 52;
          doc.setFillColor(...linea); doc.rect(bx, by, bw, 4, 'F');
          doc.setFillColor(...(r.tipo === 'gasto' ? acento : verde)); doc.rect(bx, by, Math.max(.5, bw * Math.min(1, p)), 4, 'F');
        }
      }
    }));
    y = doc.lastAutoTable.finalY + 24;
  }

  // Resumen mensual (si abarca más de un mes)
  if (mesDe(desde) !== mesDe(hasta)) {
    const filasMes = [];
    for (let ym = mesDe(desde); ym <= mesDe(hasta); ym = sumarMes(ym, 1)) {
      const tm = totales(conf.filter(m => mesDe(m.fecha) === ym));
      if (tm.ing || tm.gas) filasMes.push([nombreMes(ym).replace(/^./, c => c.toUpperCase()), dinero(tm.ing), dinero(tm.gas), (tm.bal < 0 ? '-' : '') + dinero(Math.abs(tm.bal))]);
    }
    if (filasMes.length > 1) {
      seccion('Resumen mensual');
      doc.autoTable(Object.assign({}, estilos, {
        startY: y, head: [['Mes', 'Ingresos', 'Gastos', 'Balance']], body: filasMes.map(f => f.map(T)),
        columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
        didParseCell: d => { if (d.section === 'head' && d.column.index >= 1) d.cell.styles.halign = 'right'; if (d.section === 'body' && d.column.index === 3 && String(d.cell.raw).startsWith('-')) d.cell.styles.textColor = rojo; }
      }));
      y = doc.lastAutoTable.finalY + 24;
    }
  }

  // Detalle con saldo acumulado
  seccion('Detalle de movimientos');
  let saldo = 0;
  const filas = lista.map(m => {
    if (!m.pendiente) saldo += m.tipo === 'ingreso' ? m.monto : -m.monto;
    return [fechaCorta(m.fecha), T(m.nota || m.cat), T(m.cat), m.pendiente ? 'Pendiente' : 'Confirmado',
      m.tipo === 'ingreso' ? dinero(m.monto) : '', m.tipo === 'gasto' ? dinero(m.monto) : '',
      m.pendiente ? '' : (saldo < 0 ? '-' : '') + dinero(Math.abs(saldo))];
  });
  doc.autoTable(Object.assign({}, estilos, {
    startY: y,
    head: [['Fecha', 'Descripción', 'Categoría', 'Estado', 'Ingreso', 'Gasto', 'Saldo']],
    body: filas.length ? filas : [['', 'Sin movimientos en el periodo consultado', '', '', '', '', '']],
    foot: filas.length ? [['', 'Totales', '', '', dinero(t.ing), dinero(t.gas), (t.bal < 0 ? '-' : '') + dinero(Math.abs(t.bal))]] : undefined,
    showFoot: 'lastPage',
    columnStyles: { 0: { cellWidth: 54 }, 3: { cellWidth: 56 }, 4: { halign: 'right', cellWidth: 68 }, 5: { halign: 'right', cellWidth: 68 }, 6: { halign: 'right', cellWidth: 72 } },
    didParseCell: d => {
      if (d.section === 'head' && d.column.index >= 4) d.cell.styles.halign = 'right';
      if (d.section === 'foot' && d.column.index >= 4) d.cell.styles.halign = 'right';
      if (d.section !== 'body' || !filas.length) return;
      const m = lista[d.row.index];
      if (m.pendiente) { d.cell.styles.textColor = grisClaro; d.cell.styles.fontStyle = 'italic'; }
      else if (d.column.index === 4) d.cell.styles.textColor = verde;
      else if (d.column.index === 5) d.cell.styles.textColor = rojo;
      else if (d.column.index === 6 && String(d.cell.raw).startsWith('-')) d.cell.styles.textColor = rojo;
    }
  }));

  // Pie de página
  const paginas = doc.getNumberOfPages();
  for (let i = 1; i <= paginas; i++) {
    doc.setPage(i);
    doc.setDrawColor(...linea); doc.setLineWidth(.5); doc.line(X, H - 36, W - X, H - 36);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...grisClaro);
    doc.text(T('Mis Finanzas · Reporte generado en el dispositivo. Documento informativo, sin validez como certificado bancario.'), X, H - 22);
    doc.text(`Página ${i} de ${paginas}`, W - X, H - 22, { align: 'right' });
  }

  const nombre = `extracto-${desde}-a-${hasta}.pdf`;
  const blob = doc.output('blob');
  let archivo = null;
  try { archivo = new File([blob], nombre, { type: 'application/pdf' }); } catch (e) { /* navegador antiguo */ }
  if (archivo && navigator.canShare && navigator.canShare({ files: [archivo] })) {
    try { await navigator.share({ files: [archivo], title: 'Extracto de movimientos' }); return; }
    catch (e) { if (e.name === 'AbortError') return; }
  }
  doc.save(nombre);
}

// ---------- Copia de seguridad ----------
async function exportar() {
  const nombre = `mis-finanzas-copia-${hoyISO()}.json`;
  const contenido = Object.assign({ app: 'Mis Finanzas', formato: 2, versionApp: VERSION_APP, exportado: new Date().toISOString() }, datos);
  const archivo = new File([JSON.stringify(contenido, null, 2)], nombre, { type: 'application/json' });
  const marcar = () => { datos.ajustes.ultimaCopia = hoyISO(); guardar(); pintarAjustes(); };
  if (navigator.canShare && navigator.canShare({ files: [archivo] })) {
    try { await navigator.share({ files: [archivo] }); marcar(); return; } catch (e) { if (e.name === 'AbortError') return; }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(archivo); a.download = nombre; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  marcar();
}
// Revisa una copia (1.0 o 1.1) registro por registro y descarta lo que esté dañado.
function validarCopia(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) throw new Error('El archivo no contiene una copia de Mis Finanzas.');
  const fuente = obj.datos && Array.isArray(obj.datos.movs) ? obj.datos : obj;
  if (!Array.isArray(fuente.movs)) throw new Error('El archivo no contiene una copia de Mis Finanzas.');
  let descartados = 0;
  const ids = new Set();
  const movs = [];
  for (const m of fuente.movs) {
    const monto = typeof m?.monto === 'string' ? soloDigitos(m.monto) : Math.round(Number(m?.monto));
    if (!m || !['gasto', 'ingreso'].includes(m.tipo) || !isFinite(monto) || monto <= 0 || monto > 1e13 || !esFecha(m.fecha)) { descartados++; continue; }
    let id = typeof m.id === 'string' && m.id ? m.id : nuevoId();
    if (ids.has(id)) id = nuevoId();
    ids.add(id);
    const mov = { id, tipo: m.tipo, monto, cat: typeof m.cat === 'string' && m.cat.trim() ? m.cat.trim().slice(0, 24) : 'Otros', fecha: m.fecha, nota: typeof m.nota === 'string' ? m.nota.slice(0, 200) : '' };
    if (typeof m.fijoId === 'string') mov.fijoId = m.fijoId;
    if (m.pendiente === true) mov.pendiente = true;
    movs.push(mov);
  }
  if (fuente.movs.length && !movs.length) throw new Error('Ningún movimiento de la copia es válido.');
  const fijos = [];
  for (const f of Array.isArray(fuente.fijos) ? fuente.fijos : []) {
    const monto = Math.round(Number(f?.monto));
    if (!f || !['gasto', 'ingreso'].includes(f.tipo) || !isFinite(monto) || monto <= 0) { descartados++; continue; }
    fijos.push({
      id: typeof f.id === 'string' && f.id ? f.id : nuevoId(), tipo: f.tipo,
      nombre: typeof f.nombre === 'string' && f.nombre.trim() ? f.nombre.trim().slice(0, 40) : 'Recurrente', monto,
      cat: typeof f.cat === 'string' && f.cat.trim() ? f.cat.trim().slice(0, 24) : 'Otros',
      dia: Math.min(31, Math.max(1, parseInt(f.dia, 10) || 1)), activo: f.activo !== false,
      desde: /^\d{4}-\d{2}$/.test(f.desde) ? f.desde : mesDe(hoyISO())
    });
  }
  const generados = {};
  if (fuente.generados && typeof fuente.generados === 'object') Object.keys(fuente.generados).forEach(k => { if (fuente.generados[k]) generados[k] = true; });
  const presupuestos = {};
  if (fuente.presupuestos && typeof fuente.presupuestos === 'object') Object.entries(fuente.presupuestos).forEach(([k, v]) => { const n = Math.round(Number(v)); if (n > 0) presupuestos[k] = n; });
  const ajustes = {};
  if (fuente.ajustes && typeof fuente.ajustes === 'object') Object.keys(AJUSTES_BASE).forEach(k => { if (k in fuente.ajustes) ajustes[k] = fuente.ajustes[k]; });
  const d = normalizar({ movs, fijos, generados, presupuestos, ajustes, categorias: fuente.categorias });
  const fechas = movs.map(m => m.fecha).sort();
  return { datos: d, descartados, desde: fechas[0], hasta: fechas[fechas.length - 1], exportado: typeof obj.exportado === 'string' ? obj.exportado.slice(0, 10) : '' };
}
function leerRespaldoAuto() {
  try { const r = JSON.parse(localStorage.getItem(CLAVE_RESPALDO) || 'null'); return r && r.datos && r.fecha ? r : null; } catch (e) { return null; }
}
function importar(file) {
  if (file.size > 15 * 1024 * 1024) return aviso('El archivo es demasiado grande para ser una copia de Mis Finanzas.');
  const lector = new FileReader();
  lector.onerror = () => aviso('No fue posible leer el archivo.');
  lector.onload = () => {
    let r;
    try { r = validarCopia(JSON.parse(lector.result)); }
    catch (e) { return aviso(e instanceof SyntaxError ? 'El archivo no es una copia válida (formato JSON dañado).' : e.message); }
    const d = r.datos;
    const lineas = [
      'Contenido de la copia' + (r.exportado && esFecha(r.exportado) ? ` del ${fechaMedia(r.exportado)}` : '') + ':',
      `• ${d.movs.length} movimientos` + (r.desde ? ` (${fechaMedia(r.desde)} – ${fechaMedia(r.hasta)})` : ''),
      `• ${d.fijos.length} recurrentes`,
      r.descartados ? `• ${r.descartados} registros dañados se omitirán` : '',
      '',
      `Se reemplazarán los ${datos.movs.length} movimientos actuales. Se guardará un respaldo automático para poder deshacer la restauración.`,
      '¿Desea continuar?'
    ].filter((l, i) => l || i === 4);
    if (!confirm(lineas.join('\n'))) return;
    try { localStorage.setItem(CLAVE_RESPALDO, JSON.stringify({ fecha: new Date().toISOString(), datos })); }
    catch (e) { if (!confirm('No hay espacio para guardar el respaldo automático. ¿Restaurar de todas formas?')) return; }
    datos = d;
    guardar(); generarFijos(); aplicarTema(); pintar();
    aviso(`Copia restaurada: ${d.movs.length} movimientos`);
  };
  lector.readAsText(file);
}
function deshacerRestauracion() {
  const r = leerRespaldoAuto();
  if (!r) return;
  if (!confirm(`¿Volver a los datos que había antes de la última restauración (${r.datos.movs ? r.datos.movs.length : 0} movimientos)?`)) return;
  datos = normalizar(r.datos);
  guardar();
  try { localStorage.removeItem(CLAVE_RESPALDO); } catch (e) { /* ignorar */ }
  aplicarTema(); pintar(); aviso('Restauración deshecha');
}

// ---------- Aviso ----------
let tAviso;
function aviso(txt) {
  const a = $('aviso'); a.textContent = txt; a.classList.add('visible');
  clearTimeout(tAviso); tAviso = setTimeout(() => a.classList.remove('visible'), 2600);
}

// ---------- Eventos ----------
function iniciar() {
  pintarIconos(document);
  aplicarTema();
  privado = !!datos.ajustes.ocultar;
  generarFijos();

  document.querySelectorAll('[data-ir]').forEach(b => b.addEventListener('click', () => irA(b.dataset.ir)));
  $('mesAnterior').onclick = () => { mesVista = sumarMes(mesVista, -1); pintar(); };
  $('mesSiguiente').onclick = () => { if (mesVista < mesDe(hoyISO())) { mesVista = sumarMes(mesVista, 1); pintar(); } };
  $('mesActual').onclick = () => { mesVista = mesDe(hoyISO()); diaSel = hoyISO(); pintar(); };
  $('btnOjo').onclick = () => { privado = !privado; pintar(); };

  $('fab').onclick = () => abrirMov(null, vista === 'movimientos' && panelMov === 'calendario' ? diaSel : null);
  $('fondo').onclick = cerrarHoja;
  document.querySelectorAll('[data-cerrar]').forEach(b => b.onclick = cerrarHoja);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') cerrarHoja(); });

  // Toques en listas: confirmar, editar movimiento o recurrente, elegir día
  document.body.addEventListener('click', e => {
    const conf = e.target.closest('[data-confirmar]');
    if (conf) { e.stopPropagation(); return confirmarMov(conf.dataset.confirmar); }
    const dia = e.target.closest('[data-dia]');
    if (dia) { diaSel = dia.dataset.dia; return pintarCalendario(); }
    if (e.target.closest('#listaCategorias')) return;
    const li = e.target.closest('.item[data-id]');
    if (li) { const m = datos.movs.find(x => x.id === li.dataset.id); if (m) abrirMov(m); return; }
    const lf = e.target.closest('.item[data-fijo]');
    if (lf) { const f = datos.fijos.find(x => x.id === lf.dataset.fijo); if (f) abrirFijo(f); }
  });

  formatearInput($('movMonto'));
  formatearInput($('fijoMonto'));
  usarSegmento($('segTipo'), t => pintarCats($('movCats'), t, null));
  usarSegmento($('segTipoFijo'), t => pintarCats($('fijoCats'), t, null));
  [$('movCats'), $('fijoCats')].forEach(c => c.addEventListener('click', e => {
    const b = e.target.closest('.cat'); if (!b) return;
    c.querySelectorAll('.cat').forEach(x => x.classList.toggle('activo', x === b));
  }));
  $('movGuardar').onclick = guardarMov;
  $('movEliminar').onclick = eliminarMov;
  $('movConfirmar').onclick = () => { if (editandoMov) { const id = editandoMov.id; cerrarHoja(); confirmarMov(id); } };
  $('fijoGuardar').onclick = guardarFijo;
  $('fijoEliminar').onclick = eliminarFijo;
  $('btnNuevoFijo').onclick = () => abrirFijo();

  // Movimientos: paneles y filtros
  $('segMov').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    panelMov = b.dataset.panel; pintar();
  });
  $('buscar').addEventListener('input', e => { filtro.q = e.target.value; pintar(); });
  $('buscarHistorial').onchange = e => { filtro.historial = e.target.checked; pintar(); };
  $('btnFiltros').onclick = () => {
    const abierto = $('panelFiltros').hidden;
    $('panelFiltros').hidden = !abierto;
    $('btnFiltros').setAttribute('aria-expanded', abierto ? 'true' : 'false');
    if (abierto) { pintarCamposPeriodo(); pintarSelectCategorias(); }
  };
  $('chipsPeriodo').addEventListener('click', e => {
    const b = e.target.closest('.chip'); if (!b) return;
    filtro.periodo = b.dataset.p;
    pintarCamposPeriodo(); pintar();
  });
  $('filtroTipo').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    filtro.tipo = b.dataset.f;
    $('filtroTipo').querySelectorAll('button').forEach(x => x.classList.toggle('activo', x === b));
    pintarMovimientos();
  });
  $('filtroCat').onchange = e => { filtro.cat = e.target.value; pintarMovimientos(); };
  $('filtroEstado').onchange = e => { filtro.estado = e.target.value; pintarMovimientos(); };
  $('btnLimpiarFiltros').onclick = () => {
    const q = filtro.q, h = filtro.historial;
    filtro = filtroInicial(); filtro.q = q; filtro.historial = h;
    $('filtroTipo').querySelectorAll('button').forEach(x => x.classList.toggle('activo', x.dataset.f === 'todos'));
    pintarCamposPeriodo(); pintarSelectCategorias(); pintar();
  };
  $('btnPdfFiltro').onclick = () => {
    pdfPreset = 'filtros';
    const r = rangoPdf();
    generarPDF(r);
  };

  // Ajustes
  $('temaSeg').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    datos.ajustes.tema = b.dataset.tema; guardar(); aplicarTema(); pintar();
  });
  $('paletas').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    datos.ajustes.paleta = b.dataset.paleta; guardar(); aplicarTema(); pintar();
  });
  $('ocultarAlAbrir').onchange = e => { datos.ajustes.ocultar = e.target.checked; guardar(); };
  $('ocultarAlSalir').onchange = e => { datos.ajustes.ocultarAlSalir = e.target.checked; guardar(); };
  $('confirmarRecurrentes').onchange = e => { datos.ajustes.confirmarRecurrentes = e.target.checked; guardar(); };
  $('btnCategorias').onclick = () => { pintarAdminCats(); abrirHoja('hojaCategorias'); };
  $('btnPresupuestos').onclick = abrirPresupuestos;
  $('btnIrRecurrentes').onclick = () => { panelMov = 'recurrentes'; irA('movimientos'); };
  $('pdfPresets').addEventListener('click', e => {
    const b = e.target.closest('.chip'); if (!b) return;
    pdfPreset = b.dataset.pp; pintarPdfCampos();
  });
  ['pdfDesde', 'pdfHasta'].forEach(id => $(id).addEventListener('change', () => { pdfPreset = 'personalizado'; pintarPdfCampos(); }));
  $('btnPdf').onclick = () => generarPDF(rangoPdf());
  $('btnExportar').onclick = exportar;
  $('archivoImportar').onchange = e => { if (e.target.files[0]) importar(e.target.files[0]); e.target.value = ''; };
  $('btnDeshacerRestauracion').onclick = deshacerRestauracion;
  $('btnBorrarTodo').onclick = () => {
    if (!confirm('¿Eliminar todos los movimientos, recurrentes, categorías y ajustes de este dispositivo?')) return;
    if (!confirm('Confirmación final: esta acción no se puede deshacer. Se recomienda exportar una copia antes.')) return;
    datos = estadoVacio(); guardar(); aplicarTema(); pintar(); aviso('Datos eliminados');
  };

  // Categorías
  usarSegmento($('segTipoCats'), t => { tipoCats = t; pintarAdminCats(); });
  $('listaCategorias').addEventListener('click', e => {
    const li = e.target.closest('[data-cat-i]'); if (!li) return;
    const i = Number(li.dataset.catI), lista = catsDe(tipoCats);
    const mover = e.target.closest('[data-mover]');
    if (mover) {
      const j = i + Number(mover.dataset.mover);
      if (j < 0 || j >= lista.length) return;
      const x = lista[i]; lista[i] = lista[j]; lista[j] = x;
      guardar(); pintarAdminCats(); return;
    }
    abrirCategoria(tipoCats, lista[i]);
  });
  $('btnNuevaCategoria').onclick = () => abrirCategoria(tipoCats, null);
  $('catColores').addEventListener('click', e => { const b = e.target.closest('[data-color]'); if (b) { catTemp.color = b.dataset.color; pintarCatTemp(); } });
  $('catIconos').addEventListener('click', e => { const b = e.target.closest('[data-icono]'); if (b) { catTemp.icono = b.dataset.icono; pintarCatTemp(); } });
  $('catGuardar').onclick = guardarCategoria;
  $('catEliminar').onclick = eliminarCategoria;

  // Al volver a la app: registrar recurrentes del nuevo día. Al salir: ocultar montos si se pidió.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { if (datos.ajustes.ocultarAlSalir) { privado = true; pintar(); } return; }
    generarFijos(); pintar();
  });
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => { aplicarTema(); pintar(); });

  pintar();
  try { sessionStorage.removeItem('mf.recarga'); } catch (e) { /* ignorar */ }

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).catch(() => {});
  }
}
iniciar();
