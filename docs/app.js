/* Mis Finanzas 1.1.1 — todo se guarda en este dispositivo (localStorage).
   Ningún dato financiero se envía a servidores: no hay fetch, XHR ni servicios externos. */
'use strict';

const VERSION_APP = '1.1.1';
const $ = id => document.getElementById(id);

// Si el HTML guardado en caché es de una versión anterior, recargar una vez para traer la nueva.
if (!$('repChips') || !$('confFecha')) {
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
const esFecha = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && Number(s.slice(0, 4)) >= 1900 && Number(s.slice(0, 4)) <= 2200 && isoDe(aFecha(s)) === s;
const esMes = s => typeof s === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(s);
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
const mayus = s => s.replace(/^./, c => c.toUpperCase());
function fechaLarga(iso) {
  const hoy = hoyISO();
  if (iso === hoy) return 'Hoy';
  if (iso === sumarDias(hoy, -1)) return 'Ayer';
  if (iso === sumarDias(hoy, 1)) return 'Mañana';
  const [y, m, d] = iso.split('-').map(Number);
  const anio = String(y) !== hoy.slice(0, 4) ? ` de ${y}` : '';
  return `${DIAS[aFecha(iso).getDay()]} ${d} de ${MESES[m - 1]}${anio}`;
}
const fechaMedia = iso => { const [y, m, d] = iso.split('-').map(Number); return `${d} ${MESES_C[m - 1]} ${y}`; };
const fechaCorta = iso => { const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; };
const rangoTexto = (a, b) => a === b ? fechaMedia(a) : `${fechaMedia(a)} – ${fechaMedia(b)}`;

// ---------- Datos ----------
const CLAVE = 'misFinanzas.v1';             // misma clave de la versión 1.0: conserva los registros
const CLAVE_RESPALDO = 'misFinanzas.respaldoAuto';
const VERSION_DATOS = 3;
const AJUSTES_BASE = { tema: 'auto', ocultar: false, ocultarAlSalir: false, paleta: 'petroleo', confirmarRecurrentes: true, ultimaCopia: '' };
const CLAVES_PROHIBIDAS = ['__proto__', 'constructor', 'prototype'];
const estadoVacio = () => ({ version: VERSION_DATOS, movs: [], fijos: [], generados: {}, presupuestos: {}, saldoInicial: null, ajustes: Object.assign({}, AJUSTES_BASE), categorias: catsBase() });
const nuevoId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
let datos;

function validarSaldoInicial(s) {
  if (!s || typeof s !== 'object') return null;
  const monto = Math.round(Number(s.monto));
  if (!isFinite(monto) || Math.abs(monto) > 1e13 || !esFecha(s.fecha)) return null;
  return { monto, fecha: s.fecha };
}
// Completa cualquier dato de versiones anteriores (1.0 o 1.1 preliminar) sin perder registros.
function normalizar(d) {
  const r = Object.assign(estadoVacio(), d || {});
  const versionPrevia = d && Number(d.version) ? Number(d.version) : 1;
  r.movs = Array.isArray(r.movs) ? r.movs.filter(m => m && typeof m === 'object' && typeof m.fecha === 'string') : [];
  r.movs.forEach(m => { if (typeof m.monto !== 'number') m.monto = Number(m.monto) || 0; if (!m.id) m.id = nuevoId(); });
  r.fijos = Array.isArray(r.fijos) ? r.fijos.filter(f => f && typeof f === 'object') : [];
  if (!r.generados || typeof r.generados !== 'object' || Array.isArray(r.generados)) r.generados = {};
  if (!r.presupuestos || typeof r.presupuestos !== 'object' || Array.isArray(r.presupuestos)) r.presupuestos = {};
  CLAVES_PROHIBIDAS.forEach(k => { delete r.generados[k]; delete r.presupuestos[k]; });
  r.saldoInicial = validarSaldoInicial(r.saldoInicial);
  r.ajustes = Object.assign({}, AJUSTES_BASE, (d && d.ajustes && typeof d.ajustes === 'object') ? d.ajustes : {});
  if (!['petroleo', 'azul', 'morado'].includes(r.ajustes.paleta)) r.ajustes.paleta = 'petroleo';
  if (!['auto', 'claro', 'oscuro'].includes(r.ajustes.tema)) r.ajustes.tema = 'auto';
  const cats = r.categorias && typeof r.categorias === 'object' ? r.categorias : {};
  r.categorias = { gasto: [], ingreso: [] };
  for (const tipo of ['gasto', 'ingreso']) {
    const lista = Array.isArray(cats[tipo]) && cats[tipo].length ? cats[tipo] : catsBase()[tipo];
    const vistos = new Set();
    lista.forEach(c => {
      const nombre = c && typeof c.nombre === 'string' ? c.nombre.trim().replace(/\|/g, '').slice(0, 24) : '';
      if (!nombre || vistos.has(nombre)) return;
      vistos.add(nombre);
      r.categorias[tipo].push({ nombre, icono: ICONOS[c.icono] ? c.icono : 'tag', color: /^#[0-9a-f]{6}$/i.test(c.color) ? c.color : '#64748b' });
    });
  }
  // Categorías usadas en registros que no estén en la lista
  const asegurar = (tipo, nombre) => {
    if (!['gasto', 'ingreso'].includes(tipo) || !nombre || r.categorias[tipo].some(c => c.nombre === nombre)) return;
    const base = CATS_BASE[tipo].find(c => c[0] === nombre);
    r.categorias[tipo].push(base ? { nombre, icono: base[1], color: base[2] } : { nombre, icono: 'tag', color: COLORES[r.categorias[tipo].length % COLORES.length] });
  };
  r.movs.forEach(m => asegurar(m.tipo, m.cat));
  r.fijos.forEach(f => asegurar(f.tipo, f.cat));
  Object.keys(r.presupuestos).forEach(c => asegurar('gasto', c));
  // Un movimiento con fecha futura nunca puede figurar como realizado (migración de 1.0 y copias restauradas).
  { const hoy = hoyISO(); r.movs.forEach(m => { if (m.fecha > hoy) m.pendiente = true; }); }
  r.movs.forEach(m => { if (m.fijoMes !== undefined && !esMes(m.fijoMes)) delete m.fijoMes; });
  r.version = VERSION_DATOS;
  return r;
}
let errorCarga = false;
function cargar() {
  try {
    const t = localStorage.getItem(CLAVE);
    if (t) return normalizar(JSON.parse(t));
  } catch (e) {
    console.warn('No se pudieron leer los datos', e);
    errorCarga = true;
  }
  return normalizar(null);
}
function guardar() {
  if (errorCarga) { aviso('Los datos guardados no se pudieron leer. Para protegerlos no se sobrescribirán; restaure una copia de seguridad.', true); return false; }
  try { localStorage.setItem(CLAVE, JSON.stringify(datos)); return true; }
  catch (e) { aviso('No fue posible guardar los cambios en este dispositivo. Verifique el espacio disponible.', true); return false; }
}
// Aplica un cambio y lo guarda; si el almacenamiento falla, deshace el cambio y no informa éxito.
function transaccion(cambio) {
  const antes = JSON.stringify(datos);
  try { cambio(); } catch (e) { datos = JSON.parse(antes); throw e; }
  if (!guardar()) { datos = JSON.parse(antes); pintar(); return false; }
  return true;
}

// ---------- Dinero y privacidad ----------
const fmt = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const dinero = n => fmt.format(Math.round(n));
let privado = false;
const OCULTO = '$ ••••••';
const M = n => privado ? OCULTO : dinero(n);
const Mfirma = (n, tipo) => privado ? OCULTO : (tipo === 'ingreso' ? '+' : '−') + dinero(n);
const Mneto = n => privado ? OCULTO : (n < 0 ? '−' : '') + dinero(Math.abs(n));
const Mmas = n => privado ? OCULTO : '+' + dinero(n);
const Mmenos = n => privado ? OCULTO : '−' + dinero(n);
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
    input.value = n ? n.toLocaleString('es-CO') : (input.value.replace(/\D/g, '') === '0' ? '0' : '');
  });
}
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pct = (a, b) => b > 0 ? Math.round(a / b * 100) : 0;
const sinTildes = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// ---------- Recurrentes: se registran solos cada mes ----------
// Si el almacenamiento falla, se deshace todo lo generado para no mostrar registros que no quedaron guardados.
function generarFijos() {
  if (errorCarga) return false;
  const hoy = hoyISO(), mesHoy = mesDe(hoy), diaHoy = Number(hoy.slice(8));
  const antes = JSON.stringify(datos);
  let cambios = false;
  for (const f of datos.fijos) {
    if (!f.activo || !esMes(f.desde)) continue;
    for (let ym = f.desde, i = 0; ym <= mesHoy && i < 600; ym = sumarMes(ym, 1), i++) {
      const clave = `${f.id}|${ym}`;
      if (datos.generados[clave]) continue;
      const [y, m] = ym.split('-').map(Number);
      const dia = Math.min(f.dia, diasEnMes(y, m));
      if (ym === mesHoy && dia > diaHoy) continue; // todavía no llega
      const mov = { id: nuevoId(), tipo: f.tipo, monto: f.monto, cat: f.cat, fecha: `${ym}-${pad(dia)}`, nota: f.nombre, fijoId: f.id, fijoMes: ym };
      if (datos.ajustes.confirmarRecurrentes) mov.pendiente = true;
      datos.movs.push(mov);
      datos.generados[clave] = true;
      cambios = true;
    }
  }
  if (cambios && !guardar()) { datos = JSON.parse(antes); return false; }
  return true;
}
// Movimiento que generó un recurrente en un mes (aunque se haya confirmado con otra fecha).
const movDeFijo = (f, ym) => datos.movs.find(m => m.fijoId === f.id && (m.fijoMes || mesDe(m.fecha)) === ym);

// ---------- Saldos ----------
const valorNeto = m => m.tipo === 'ingreso' ? m.monto : -m.monto;
const cuentaEnSaldo = m => { const ini = datos.saldoInicial; return !ini || m.fecha >= ini.fecha; };
// Saldo realizado al inicio del día indicado (null si es anterior al saldo inicial registrado).
function saldoAl(iso) {
  const ini = datos.saldoInicial;
  if (ini && iso < ini.fecha) return null;
  let s = ini ? ini.monto : 0;
  for (const m of datos.movs) if (!m.pendiente && m.fecha < iso && cuentaEnSaldo(m)) s += valorNeto(m);
  return s;
}
// Saldo disponible: saldo inicial + todos los movimientos confirmados desde su fecha.
function saldoDisponible() {
  const ini = datos.saldoInicial;
  let s = ini ? ini.monto : 0;
  for (const m of datos.movs) if (!m.pendiente && cuentaEnSaldo(m)) s += valorNeto(m);
  return s;
}
// Recurrentes que aún no se han registrado, con fecha entre hoy y "hasta".
function recurrentesPorVenir(hasta) {
  const out = [];
  const hoyM = mesDe(hoyISO());
  for (let ym = hoyM, i = 0; ym <= mesDe(hasta) && i < 120; ym = sumarMes(ym, 1), i++) {
    const [y, m] = ym.split('-').map(Number);
    for (const f of datos.fijos) {
      if (!f.activo || !esMes(f.desde) || f.desde > ym || datos.generados[`${f.id}|${ym}`]) continue;
      const fecha = `${ym}-${pad(Math.min(f.dia, diasEnMes(y, m)))}`;
      if (fecha <= hasta) out.push({ tipo: f.tipo, monto: f.monto, fecha, nombre: f.nombre });
    }
  }
  return out;
}
// Saldo proyectado al final del día "hasta": disponible + pendientes y programados + recurrentes por venir.
function saldoProyectado(hasta) {
  const base = saldoDisponible();
  let ing = 0, gas = 0;
  for (const m of datos.movs) if (m.pendiente && m.fecha <= hasta && cuentaEnSaldo(m)) { if (m.tipo === 'ingreso') ing += m.monto; else gas += m.monto; }
  for (const r of recurrentesPorVenir(hasta)) { if (r.tipo === 'ingreso') ing += r.monto; else gas += r.monto; }
  return { base, ing, gas, valor: base + ing - gas };
}

// ---------- Estado de la interfaz ----------
let mesVista = mesDe(hoyISO());
let vista = 'inicio';
let panelMov = 'lista';
let diaSel = hoyISO();
const periodoInicial = () => ({ periodo: 'mes', fecha: hoyISO(), desde: '', hasta: '', semana: hoyISO(), quincena: 0, anio: Number(hoyISO().slice(0, 4)) });
const filtroInicial = () => Object.assign(periodoInicial(), { tipo: 'todos', cat: '', estado: '', q: '', historial: false });
let filtro = filtroInicial();
let rep = Object.assign(periodoInicial(), { periodo: 'mes' });

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
const estadoTexto = m => !m.pendiente ? 'Realizado' : m.fecha > hoyISO() ? 'Programado' : 'Pendiente';

function itemHTML(m, o) {
  o = o || {};
  let etiqueta = '';
  if (m.pendiente) etiqueta = m.fecha > hoyISO() ? '<span class="etiqueta prog-fut">Programado</span>' : '<span class="etiqueta pen">Pendiente</span>';
  else if (m.fijoId) etiqueta = '<span class="etiqueta rec">Recurrente</span>';
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
function busquedaGlobal() { return !!filtro.q.trim() && filtro.historial; }
function pintar() {
  $('tituloVista').textContent = TITULOS[vista];
  $('mesActual').textContent = mesCorto(mesVista);
  const usaMes = vista === 'inicio' || vista === 'graficas' || vista === 'ajustes' ||
    (vista === 'movimientos' && (panelMov === 'calendario' || (panelMov === 'lista' && ['mes', 'quincena'].includes(filtro.periodo) && !busquedaGlobal())));
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
  const hoy = hoyISO(), mesHoy = mesDe(hoy);
  const ini = datos.saldoInicial;

  // Saldo disponible (acumulado de todos los meses) y proyectado al cierre del mes en curso
  const disp = saldoDisponible();
  $('saldoDisponible').textContent = Mneto(disp);
  $('saldoPill').hidden = disp >= 0;
  $('saldoPill').className = 'pill negativo';
  $('saldoNota').textContent = ini
    ? `Saldo inicial de ${M(ini.monto)} al ${fechaMedia(ini.fecha)} más los movimientos realizados desde esa fecha.`
    : 'Sin saldo inicial: se calcula con todos los movimientos realizados registrados.';
  $('btnDefinirSaldo').hidden = !!ini;
  const proyHero = saldoProyectado(finMes(mesHoy));
  $('heroProyEt').textContent = `Proyectado al ${Number(finMes(mesHoy).slice(8))} ${MESES_C[Number(mesHoy.slice(5)) - 1]}`;
  $('saldoProyectadoHero').textContent = Mneto(proyHero.valor);

  // Mes consultado
  const lista = movsDelMes(mesVista);
  const t = totales(lista);
  const conf = lista.filter(m => !m.pendiente);
  $('heroBalEt').textContent = `Balance de ${MESES_C[Number(mesVista.slice(5)) - 1]}`;
  $('balanceMonto').textContent = Mneto(t.bal);
  $('mesCardTitulo').textContent = mayus(nombreMes(mesVista));

  const inicioMes = `${mesVista}-01`, finM = finMes(mesVista), esFuturo = mesVista > mesHoy;
  let iniMes = saldoAl(inicioMes), iniEt = 'Saldo inicial del mes', notaIni = '';
  if (iniMes === null && ini && mesDe(ini.fecha) === mesVista) { iniMes = ini.monto; iniEt = `Saldo inicial (${fechaMedia(ini.fecha)})`; notaIni = 'Los movimientos anteriores a la fecha del saldo inicial no modifican el saldo.'; }
  const finSaldo = iniMes === null ? null : saldoAl(sumarDias(finM, 1));
  const finEt = mesVista === mesHoy ? 'Saldo actual' : esFuturo ? 'Saldo final (realizado)' : 'Saldo final del mes';
  const fila = (dt, dd, clase) => `<div${clase ? ` class="${clase}"` : ''}><dt>${dt}</dt><dd>${dd}</dd></div>`;
  $('mesDesglose').innerHTML =
    fila(iniEt, iniMes === null ? '—' : Mneto(iniMes)) +
    `<div><dt>Ingresos realizados</dt><dd class="positivo">${Mmas(t.ing)}</dd></div>` +
    `<div><dt>Gastos realizados</dt><dd class="negativo">${Mmenos(t.gas)}</dd></div>` +
    fila('Balance mensual', Mneto(t.bal), 'total') +
    fila(finEt, finSaldo === null ? '—' : Mneto(finSaldo));

  const p = t.ing > 0 ? pct(t.gas, t.ing) : (t.gas > 0 ? 100 : 0);
  let estado, pill, clasePill;
  if (!conf.length) { estado = esFuturo ? 'Mes futuro: consulte el saldo proyectado.' : 'Sin movimientos realizados en este periodo.'; pill = 'Sin datos'; clasePill = ''; }
  else if (t.ing === 0) { estado = 'No hay ingresos realizados en el periodo.'; pill = 'Déficit'; clasePill = 'deficit'; }
  else if (t.bal < 0) { estado = `Los gastos superan los ingresos en ${M(-t.bal)}.`; pill = 'Déficit'; clasePill = 'deficit'; }
  else if (p > 90) { estado = `Margen ajustado: los gastos equivalen al ${p} % de los ingresos.`; pill = 'Margen ajustado'; clasePill = 'ajustado'; }
  else { estado = `Los ingresos superan los gastos en ${M(t.bal)}.`; pill = 'Superávit'; clasePill = 'superavit'; }
  $('estadoMes').textContent = [estado, notaIni].filter(Boolean).join(' ');
  $('estadoPill').textContent = pill;
  $('estadoPill').className = 'pill-sm ' + clasePill;
  const barra = $('barraGasto');
  barra.style.width = Math.min(p, 100) + '%';
  barra.className = 'barra-relleno' + (p > 100 ? ' excedido' : p > 90 ? ' alto' : '');
  $('barraTexto').textContent = t.ing > 0 ? `Gasto sobre ingresos: ${p} %` : 'Registre un ingreso para calcular la relación gasto/ingreso.';

  // Saldo proyectado al cierre del mes consultado (mes en curso o futuro)
  $('proyeccionCard').hidden = mesVista < mesHoy;
  if (mesVista >= mesHoy) {
    const pr = saldoProyectado(finM);
    $('proyeccionTitulo').textContent = `Saldo proyectado al ${fechaMedia(finM)}`;
    $('proyeccion').textContent = Mneto(pr.valor);
    $('proyeccion').className = 'monto-md num ' + (pr.valor < 0 ? 'negativo' : '');
    $('proyeccionDetalle').innerHTML =
      fila('Saldo disponible hoy', Mneto(pr.base)) +
      `<div><dt>Ingresos pendientes y programados</dt><dd class="positivo">${Mmas(pr.ing)}</dd></div>` +
      `<div><dt>Pagos pendientes y programados</dt><dd class="negativo">${Mmenos(pr.gas)}</dd></div>` +
      fila('Saldo proyectado', Mneto(pr.valor), 'total');
  }

  // Pendientes y programados (todos los meses)
  const pend = datos.movs.filter(m => m.pendiente).sort((a, b) => a.fecha.localeCompare(b.fecha));
  $('pendientesCard').hidden = !pend.length;
  $('pendientesCuenta').textContent = pend.length;
  $('pendientesLista').innerHTML = pend.slice(0, 6).map(m => itemHTML(m, { confirmar: true })).join('');
  $('btnVerPendientes').hidden = pend.length <= 6;

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

// ---------- Periodos (filtros y reportes) ----------
const PERIODOS = [['mes', 'Mes'], ['quincena', 'Quincena'], ['semana', 'Semana'], ['anio', 'Año'], ['fecha', 'Fecha exacta'], ['rango', 'Rango'], ['todo', 'Todo']];
function rangoQuincena(ym, q) {
  return q === 2 ? { desde: `${ym}-16`, hasta: finMes(ym) } : { desde: `${ym}-01`, hasta: `${ym}-15` };
}
function quincenaDe(f) {
  if (f.quincena) return f.quincena;
  return mesVista === mesDe(hoyISO()) && Number(hoyISO().slice(8)) > 15 ? 2 : 1;
}
function rangoDe(f) {
  switch (f.periodo) {
    case 'quincena': {
      const q = quincenaDe(f), r = rangoQuincena(mesVista, q);
      return Object.assign(r, { etiqueta: `${q === 1 ? '1.ª' : '2.ª'} quincena de ${nombreMes(mesVista)}` });
    }
    case 'semana': {
      const desde = lunesDe(f.semana), hasta = sumarDias(desde, 6);
      return { desde, hasta, etiqueta: `Semana del ${rangoTexto(desde, hasta)}` };
    }
    case 'anio': return { desde: `${f.anio}-01-01`, hasta: `${f.anio}-12-31`, etiqueta: `Año ${f.anio}` };
    case 'fecha': return { desde: f.fecha, hasta: f.fecha, etiqueta: mayus(fechaLarga(f.fecha)) + (fechaLarga(f.fecha).length < 8 ? `, ${fechaMedia(f.fecha)}` : '') };
    case 'rango': {
      let a = f.desde || `${mesVista}-01`, b = f.hasta || finMes(mesVista);
      if (a > b) { const x = a; a = b; b = x; }
      return { desde: a, hasta: b, etiqueta: rangoTexto(a, b) };
    }
    case 'todo': return { desde: null, hasta: null, etiqueta: 'Todo el historial' };
    default: return { desde: `${mesVista}-01`, hasta: finMes(mesVista), etiqueta: mayus(nombreMes(mesVista)) };
  }
}
// Dibuja los campos del periodo elegido dentro de "cont" y avisa los cambios con alCambiar().
function pintarCamposPeriodo(cont, f, alCambiar) {
  const hoy = hoyISO();
  let html = '';
  if (f.periodo === 'mes') html = `<label class="campo">Mes<input type="month" data-c="mes" value="${mesVista}"></label>`;
  if (f.periodo === 'quincena') html = `<div class="segmento compacto" data-c="quincena"><button data-q="1">1 al 15</button><button data-q="2">16 a fin de mes</button></div>
      <label class="campo">Mes<input type="month" data-c="mes" value="${mesVista}"></label>`;
  if (f.periodo === 'semana') html = `<label class="campo">Cualquier día de la semana<input type="date" data-c="semana" value="${f.semana}"></label>`;
  if (f.periodo === 'anio') {
    const anios = new Set([Number(hoy.slice(0, 4)), f.anio]);
    datos.movs.forEach(m => anios.add(Number(m.fecha.slice(0, 4))));
    html = `<label class="campo">Año<select data-c="anio">${[...anios].sort((a, b) => b - a).map(a => `<option ${a === f.anio ? 'selected' : ''}>${a}</option>`).join('')}</select></label>`;
  }
  if (f.periodo === 'fecha') html = `<label class="campo">Fecha<input type="date" data-c="fecha" value="${f.fecha}"></label>`;
  if (f.periodo === 'rango') html = `<div class="dos-campos"><label class="campo">Desde<input type="date" data-c="desde" value="${f.desde || mesVista + '-01'}"></label>
      <label class="campo">Hasta<input type="date" data-c="hasta" value="${f.hasta || finMes(mesVista)}"></label></div>`;
  cont.innerHTML = html;
  const campo = n => cont.querySelector(`[data-c="${n}"]`);
  const on = (n, fn) => { const el = campo(n); if (el) el.addEventListener('change', fn); };
  on('mes', e => { if (esMes(e.target.value)) { mesVista = e.target.value; pintar(); } });
  on('semana', e => { if (esFecha(e.target.value)) { f.semana = e.target.value; alCambiar(); } });
  on('anio', e => { f.anio = Number(e.target.value); alCambiar(); });
  on('fecha', e => { if (esFecha(e.target.value)) { f.fecha = e.target.value; alCambiar(); } });
  const rango = () => {
    const a = campo('desde').value, b = campo('hasta').value;
    const malo = esFecha(a) && esFecha(b) && a > b;
    campo('hasta').classList.toggle('invalido', malo);
    if (malo) return aviso('La fecha final debe ser igual o posterior a la inicial.');
    if (esFecha(a)) f.desde = a;
    if (esFecha(b)) f.hasta = b;
    alCambiar();
  };
  on('desde', rango); on('hasta', rango);
  const seg = campo('quincena');
  if (seg) {
    seg.querySelectorAll('button').forEach(b => b.classList.toggle('activo', Number(b.dataset.q) === quincenaDe(f)));
    seg.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      f.quincena = Number(b.dataset.q);
      seg.querySelectorAll('button').forEach(x => x.classList.toggle('activo', x === b));
      alCambiar();
    });
  }
}
function sincronizarMes(cont) { cont.querySelectorAll('[data-c="mes"]').forEach(el => { if (el.value !== mesVista) el.value = mesVista; }); }

// ---------- Movimientos: filtros ----------
function aplicarFiltros() {
  const q = sinTildes(filtro.q.trim());
  const global = busquedaGlobal();
  const rp = rangoDe(filtro);
  const r = global ? { desde: null, hasta: null, etiqueta: 'Todo el historial' } : rp;
  let l = datos.movs;
  if (r.desde) l = l.filter(m => m.fecha >= r.desde && m.fecha <= r.hasta);
  if (filtro.tipo !== 'todos') l = l.filter(m => m.tipo === filtro.tipo);
  if (filtro.cat) { const i = filtro.cat.indexOf('|'), t = filtro.cat.slice(0, i), c = filtro.cat.slice(i + 1); l = l.filter(m => m.tipo === t && m.cat === c); }
  if (filtro.estado === 'pendiente') l = l.filter(m => m.pendiente);
  if (filtro.estado === 'confirmado') l = l.filter(m => !m.pendiente);
  if (q) {
    const digitos = q.replace(/[.\s$,]/g, '');
    const esNumero = /^\d+$/.test(digitos);
    l = l.filter(m => {
      const texto = sinTildes(`${m.cat} ${m.nota || ''} ${fechaCorta(m.fecha)} ${m.tipo} ${estadoTexto(m)}`);
      return texto.includes(q) || (esNumero && String(m.monto).includes(digitos));
    });
  }
  const etiqueta = q ? `Búsqueda «${filtro.q.trim()}» · ${r.etiqueta}` : r.etiqueta;
  return { lista: l, rango: Object.assign({}, r, { etiqueta }) };
}
function descripcionFiltros() {
  const partes = [];
  if (filtro.tipo !== 'todos') partes.push(filtro.tipo === 'ingreso' ? 'Solo ingresos' : 'Solo gastos');
  if (filtro.cat) partes.push('Categoría: ' + filtro.cat.slice(filtro.cat.indexOf('|') + 1));
  if (filtro.estado) partes.push(filtro.estado === 'pendiente' ? 'Pendientes y programados' : 'Solo realizados');
  if (filtro.q.trim()) partes.push(`Búsqueda: «${filtro.q.trim()}»` + (filtro.historial ? ' en todo el historial' : ''));
  return partes.join(' · ');
}
const hayFiltros = () => filtro.periodo !== 'mes' || filtro.tipo !== 'todos' || !!filtro.cat || !!filtro.estado;

function pintarFiltroPeriodo() {
  $('chipsPeriodo').querySelectorAll('.chip').forEach(x => x.classList.toggle('activo', x.dataset.p === filtro.periodo));
  pintarCamposPeriodo($('periodoCampos'), filtro, pintar);
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

  sincronizarMes($('periodoCampos'));
  const global = busquedaGlobal();
  $('filaHistorial').hidden = !filtro.q.trim();
  $('buscarHistorial').checked = filtro.historial;
  $('periodoIgnorado').hidden = !global;
  $('chipsPeriodo').parentElement.classList.toggle('inactivo', global);
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
  if (tp.n) notas.push(`${tp.n} pendiente${tp.n > 1 ? 's' : ''} o programado${tp.n > 1 ? 's' : ''} sin incluir en los totales`);
  $('resumenNota').textContent = notas.join(' · ');

  const orden = ordenar(lista);
  if (!orden.length) { $('listaMovimientos').innerHTML = `<div class="card">${vacioHTML('No se encontraron movimientos con los filtros aplicados.', 'search')}</div>`; return; }
  const grupos = {};
  const MAX = 400;
  orden.slice(0, MAX).forEach(m => (grupos[m.fecha] = grupos[m.fecha] || []).push(m));
  $('listaMovimientos').innerHTML = Object.entries(grupos).map(([f, ms]) => {
    const td = totales(ms);
    const neto = ms.every(m => m.pendiente) ? 'Por confirmar' : (td.bal >= 0 ? '+' : '−') + dinero(Math.abs(td.bal));
    return `<div class="dia-titulo"><span>${fechaLarga(f)}</span><span>${privado ? '' : neto}</span></div>
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
  const t = totales(ms), tp = totalesPendientes(ms);
  const titulo = fechaLarga(diaSel);
  $('calDetalle').innerHTML = `<div class="cal-detalle-cabeza"><h3>${titulo.length < 8 ? titulo + ', ' + fechaMedia(diaSel) : titulo}</h3>
      <button class="icon-btn sm" id="calAgregar" aria-label="Registrar movimiento en este día">${ico('plus')}</button></div>
    <div class="kpis tres">
      <div><span>Ingresos</span><b class="num positivo">${M(t.ing)}</b></div>
      <div><span>Gastos</span><b class="num negativo">${M(t.gas)}</b></div>
      <div><span>Balance del día</span><b class="num ${t.bal < 0 ? 'negativo' : ''}">${Mneto(t.bal)}</b></div>
    </div>
    ${tp.n ? `<p class="sub-xs" style="margin:8px 0 0">${tp.n} pendiente${tp.n > 1 ? 's' : ''} o programado${tp.n > 1 ? 's' : ''} por ${M(tp.ing + tp.gas)} no incluido${tp.n > 1 ? 's' : ''} en los totales.</p>` : ''}
    <ul class="lista" style="margin-top:6px">${ms.length ? ms.map(x => itemHTML(x, { sinFecha: true, confirmar: true })).join('') : `<li>${vacioHTML('Sin movimientos registrados en esta fecha.', 'calendar')}</li>`}</ul>`;
  $('calAgregar').onclick = () => abrirMov(null, diaSel);
}

// ---------- Recurrentes ----------
function estadoFijo(f) {
  const ym = mesDe(hoyISO());
  if (!f.activo) return '<span class="etiqueta pausa">En pausa</span>';
  if (datos.generados[`${f.id}|${ym}`]) {
    const mov = movDeFijo(f, ym);
    if (!mov) return '<span class="etiqueta pausa">Cancelado</span>';
    if (mov.pendiente) return '<span class="etiqueta pen">Pendiente</span>';
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
        const mov = movDeFijo(f, ym); const movPend = mov && mov.pendiente ? mov : null;
        const accion = movPend ? `<button class="btn-confirmar" data-confirmar="${movPend.id}">Confirmar</button>` : `<div class="valor ${tipo === 'ingreso' ? 'positivo' : ''}">${M(f.monto)}</div>`;
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
const hexValido = c => /^#[0-9a-f]{6}$/i.test(c) ? c : '#64748b';
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
  const hoy = hoyISO(), mesHoy = mesDe(hoy);
  const diasTrans = mesVista === mesHoy ? Number(hoy.slice(8)) : mesVista > mesHoy ? 0 : diasEnMes(y, m);

  // Indicadores
  const porCat = {};
  lista.filter(x => x.tipo === 'gasto' && !x.pendiente).forEach(x => porCat[x.cat] = (porCat[x.cat] || 0) + x.monto);
  const cats = Object.entries(porCat).sort((a, b) => b[1] - a[1]);
  const tasa = t.ing > 0 ? Math.round(t.bal / t.ing * 100) : null;
  const variacion = anterior.gas > 0 ? Math.round((t.gas - anterior.gas) / anterior.gas * 100) : null;
  $('kpisAnalisis').innerHTML = `
    <div class="kpi"><span>Tasa de ahorro</span><b class="${tasa !== null && tasa < 0 ? 'negativo' : ''}">${tasa === null ? '—' : tasa + ' %'}</b><small>Balance sobre ingresos</small></div>
    <div class="kpi"><span>Gasto diario promedio</span><b>${diasTrans ? M(t.gas / diasTrans) : '—'}</b><small>${diasTrans} días del periodo</small></div>
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
  }).join('') : `<li>${vacioHTML('Sin gastos realizados en este periodo.', 'chart-pie')}</li>`;

  // 3. Saldo disponible día a día (realizado) y proyectado (línea punteada)
  const n = diasEnMes(y, m);
  const real = [], proy = [];
  for (let d = 1; d <= n; d++) {
    const iso = `${mesVista}-${pad(d)}`;
    if (iso <= hoy) { real.push(saldoAl(sumarDias(iso, 1))); proy.push(iso === hoy ? real[real.length - 1] : null); }
    else { real.push(null); proy.push(saldoProyectado(iso).valor); }
  }
  const pos = hexValido(colorVar('--positivo')), neg = hexValido(colorVar('--negativo')), acento = colorVar('--primario');
  $('gSaldoNota').textContent = datos.saldoInicial && datos.saldoInicial.fecha > finMes(mesVista)
    ? 'Este mes es anterior a la fecha del saldo inicial; no hay saldo registrado.'
    : 'Los tramos bajo cero indican saldo negativo. La línea punteada corresponde al saldo proyectado.';
  grafica('gSaldo', {
    type: 'line',
    data: {
      labels: real.map((_, i) => i + 1),
      datasets: [
        {
          label: 'Saldo disponible', data: real, tension: .25, pointRadius: 0, pointHoverRadius: 4, borderWidth: 2.25, spanGaps: false,
          fill: { target: 'origin', above: hexA(pos, .12), below: hexA(neg, .14) },
          segment: { borderColor: c => c.p1.parsed.y < 0 ? neg : pos }, borderColor: pos
        },
        { label: 'Saldo proyectado', data: proy, tension: .25, pointRadius: 0, pointHoverRadius: 4, borderWidth: 2, borderDash: [5, 4], borderColor: acento, fill: false }
      ]
    },
    options: {
      maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
      plugins: { legend: { display: false }, tooltip: Object.assign(tooltipBase(), { filter: c => c.raw !== null, callbacks: { title: c => `Día ${c[0].label}`, label: c => ` ${c.dataset.label}: ${privado ? OCULTO : dinero(c.raw)}` } }) },
      scales: { x: { grid: { display: false }, border: { display: false }, ticks: { maxTicksLimit: 8 } }, y: ejeDinero() }
    }
  });
}

// ---------- Ajustes ----------
function rangoReporte() {
  const hoy = hoyISO();
  if (rep.periodo === 'filtros') {
    const { lista, rango } = aplicarFiltros();
    let desde = rango.desde, hasta = rango.hasta;
    if (!desde) { const f = lista.map(m => m.fecha).sort(); desde = f[0] || hoy; hasta = f[f.length - 1] || hoy; }
    return { desde, hasta, etiqueta: rango.etiqueta, lista, filtros: descripcionFiltros() };
  }
  const r = rangoDe(rep);
  if (!r.desde) {
    const f = datos.movs.map(m => m.fecha).concat(datos.saldoInicial ? [datos.saldoInicial.fecha] : []).sort();
    r.desde = f[0] || hoy; r.hasta = f[f.length - 1] && f[f.length - 1] > hoy ? f[f.length - 1] : hoy;
  }
  return r;
}
function pintarReportes() {
  $('repChips').innerHTML = PERIODOS.concat([['filtros', 'Filtros actuales']]).map(([k, n]) => `<button class="chip ${k === rep.periodo ? 'activo' : ''}" data-p="${k}">${n}</button>`).join('');
  if (rep.periodo === 'filtros') $('repCampos').innerHTML = '';
  else pintarCamposPeriodo($('repCampos'), rep, pintarResumenReporte);
  pintarResumenReporte();
}
function pintarResumenReporte() {
  const r = rangoReporte();
  const lista = r.lista || datos.movs.filter(m => m.fecha >= r.desde && m.fecha <= r.hasta);
  $('pdfResumen').textContent = `${r.etiqueta} · ${rangoTexto(r.desde, r.hasta)} · ${lista.length} ${lista.length === 1 ? 'movimiento' : 'movimientos'}${r.filtros ? ' · ' + r.filtros : ''}`;
}
function pintarAjustes() {
  document.querySelectorAll('#temaSeg button').forEach(c => c.classList.toggle('activo', c.dataset.tema === datos.ajustes.tema));
  document.querySelectorAll('#paletas button').forEach(c => c.classList.toggle('activo', c.dataset.paleta === datos.ajustes.paleta));
  $('ocultarAlAbrir').checked = !!datos.ajustes.ocultar;
  $('ocultarAlSalir').checked = !!datos.ajustes.ocultarAlSalir;
  $('confirmarRecurrentes').checked = !!datos.ajustes.confirmarRecurrentes;
  const ini = datos.saldoInicial;
  $('saldoInicialInfo').textContent = ini ? `${privado ? OCULTO : Mneto(ini.monto)} al ${fechaMedia(ini.fecha)}` : 'Sin definir';
  $('cuentaCategorias').textContent = catsDe('gasto').length + catsDe('ingreso').length;
  $('cuentaPresupuestos').textContent = Object.values(datos.presupuestos).filter(v => v > 0).length || '';
  $('cuentaRecurrentes').textContent = datos.fijos.length || '';
  $('ultimaCopia').textContent = datos.ajustes.ultimaCopia ? `Última copia: ${fechaMedia(datos.ajustes.ultimaCopia)}` : 'Aún no se ha exportado ninguna copia';
  const resp = leerRespaldoAuto();
  $('btnDeshacerRestauracion').hidden = !resp;
  if (resp) $('infoRespaldoAuto').textContent = `Datos previos guardados el ${fechaMedia(resp.fecha.slice(0, 10))}`;
  pintarReportes();
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
function actualizarNotaFutura() {
  const f = $('movFecha').value;
  $('movFuturoNota').hidden = !(esFecha(f) && f > hoyISO() && !(editandoMov && editandoMov.pendiente));
}
function abrirMov(mov, fecha) {
  editandoMov = mov || null;
  const tipo = mov ? mov.tipo : 'gasto';
  $('hojaMovTitulo').textContent = mov ? (mov.pendiente ? (mov.fecha > hoyISO() ? 'Movimiento programado' : 'Movimiento pendiente') : 'Editar movimiento') : 'Nuevo movimiento';
  ponerTipo($('segTipo'), tipo);
  $('movMonto').value = mov ? mov.monto.toLocaleString('es-CO') : '';
  pintarCats($('movCats'), tipo, mov ? mov.cat : null);
  const hoy = hoyISO();
  $('movFecha').value = mov ? mov.fecha : (fecha || (mesVista === mesDe(hoy) ? hoy : mesVista + '-01'));
  $('movNota').value = mov ? (mov.nota || '') : '';
  $('movRepetir').checked = false;
  $('filaRepetir').hidden = !!mov;
  const pend = !!(mov && mov.pendiente);
  $('movEliminar').hidden = !mov;
  $('movEliminar').textContent = pend ? 'Cancelar movimiento' : 'Eliminar';
  $('movAccionesPend').hidden = !pend;
  $('movEstadoBanner').hidden = !pend;
  if (pend) $('movEstadoTexto').textContent = mov.fecha > hoy
    ? `Programado para el ${fechaMedia(mov.fecha)}. No afecta el saldo disponible hasta confirmarlo.`
    : 'Pendiente de confirmación. No afecta el saldo disponible hasta confirmarlo.';
  abrirHoja('hojaMov');
  actualizarNotaFutura();
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
  const futuro = fecha > hoyISO();
  let mensaje;
  const ok = transaccion(() => {
    if (editandoMov) {
      const m = datos.movs.find(x => x.id === editandoMov.id);
      const fechaAntes = m.fecha;
      Object.assign(m, { tipo, monto, cat, fecha, nota });
      if (futuro) m.pendiente = true; // una fecha futura nunca puede estar realizada
      mensaje = m.pendiente && fecha !== fechaAntes ? `Movimiento reprogramado para el ${fechaMedia(fecha)}` : 'Cambios guardados';
    } else {
      const mov = { id: nuevoId(), tipo, monto, cat, fecha, nota };
      if (futuro) mov.pendiente = true;
      if ($('movRepetir').checked) {
        const f = { id: nuevoId(), tipo, nombre: nota || cat, monto, cat, dia: Number(fecha.slice(8)), activo: true, desde: mesDe(fecha) };
        datos.fijos.push(f);
        datos.generados[`${f.id}|${mesDe(fecha)}`] = true;
        mov.fijoId = f.id; mov.fijoMes = mesDe(fecha);
        if (!nota) mov.nota = f.nombre;
      }
      datos.movs.push(mov);
      mensaje = futuro ? `${tipo === 'gasto' ? 'Gasto' : 'Ingreso'} programado para el ${fechaMedia(fecha)}` : (tipo === 'gasto' ? 'Gasto registrado' : 'Ingreso registrado');
    }
  });
  if (!ok) return;
  generarFijos();
  mesVista = mesDe(fecha);
  if (panelMov === 'calendario') diaSel = fecha;
  cerrarHoja(); pintar(); aviso(mensaje);
}
function eliminarMov() {
  if (!editandoMov) return;
  const pend = editandoMov.pendiente;
  if (!confirm(pend ? '¿Cancelar este movimiento pendiente? Se eliminará y no se incluirá en las proyecciones.' : '¿Eliminar este movimiento? Esta acción no se puede deshacer.')) return;
  const id = editandoMov.id;
  if (!transaccion(() => { datos.movs = datos.movs.filter(m => m.id !== id); })) return;
  cerrarHoja(); pintar(); aviso(pend ? 'Movimiento cancelado' : 'Movimiento eliminado');
}
// Confirmar un pendiente: el usuario elige la fecha real de pago o recepción (hoy por defecto, nunca futura).
let confirmandoId = null;
function confirmarMov(id) {
  const m = datos.movs.find(x => x.id === id);
  if (!m || !m.pendiente) return;
  confirmandoId = id;
  const hoy = hoyISO();
  $('confDetalle').textContent = `${m.tipo === 'ingreso' ? 'Ingreso' : 'Gasto'} de ${M(m.monto)} · ${m.cat}${m.nota && m.nota !== m.cat ? ' · ' + m.nota : ''}. ` +
    (m.fecha > hoy ? `Programado para el ${fechaMedia(m.fecha)}.` : `Fecha prevista: ${fechaMedia(m.fecha)}.`);
  $('confFecha').max = hoy;
  $('confFecha').value = hoy;
  avisoConfirmar();
  abrirHoja('hojaConfirmar');
}
function avisoConfirmar() {
  const f = $('confFecha').value, hoy = hoyISO();
  const ini = datos.saldoInicial;
  let txt = 'Se registrará como realizado y afectará el saldo disponible desde esta fecha.';
  if (esFecha(f) && f > hoy) txt = 'La fecha real no puede ser posterior a hoy. Para cambiar la fecha prevista, use Reprogramar.';
  else if (esFecha(f) && ini && f < ini.fecha) txt = `Esta fecha es anterior al saldo inicial (${fechaMedia(ini.fecha)}); el movimiento aparecerá en el historial, pero no modificará el saldo disponible.`;
  $('confAviso').textContent = txt;
}
function guardarConfirmacion() {
  const id = confirmandoId;
  const f = $('confFecha').value;
  if (!esFecha(f)) return aviso('Seleccione una fecha válida.');
  if (f > hoyISO()) return aviso('La fecha real no puede ser posterior a hoy.');
  if (!transaccion(() => { const x = datos.movs.find(y => y.id === id); if (!x) throw new Error('Movimiento no encontrado'); delete x.pendiente; x.fecha = f; })) return;
  confirmandoId = null;
  cerrarHoja(); pintar(); aviso(`Movimiento confirmado el ${fechaMedia(f)}`);
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
  let mensaje;
  const ok = transaccion(() => {
    if (editandoFijo) {
      const f = datos.fijos.find(x => x.id === editandoFijo.id);
      const reactivar = !f.activo && $('fijoActivo').checked;
      Object.assign(f, { tipo, nombre, monto, cat, dia, activo: $('fijoActivo').checked });
      // Al reactivar, no generar los meses que estuvo en pausa
      if (reactivar && f.desde < mesDe(hoyISO())) f.desde = mesDe(hoyISO());
      mensaje = 'Recurrente actualizado. Los cambios aplican desde el próximo registro.';
    } else {
      datos.fijos.push({ id: nuevoId(), tipo, nombre, monto, cat, dia, activo: true, desde: mesDe(hoyISO()) });
      mensaje = dia <= Number(hoyISO().slice(8)) ? 'Recurrente creado y registrado en el mes actual' : `Se registrará automáticamente el día ${dia}`;
    }
  });
  if (!ok) return;
  generarFijos(); cerrarHoja(); pintar(); aviso(mensaje);
}
function eliminarFijo() {
  if (!editandoFijo) return;
  if (!confirm(`¿Eliminar «${editandoFijo.nombre}»? Los movimientos ya registrados se conservan.`)) return;
  const id = editandoFijo.id;
  const ok = transaccion(() => {
    datos.fijos = datos.fijos.filter(f => f.id !== id);
    datos.movs.forEach(m => { if (m.fijoId === id) { delete m.fijoId; delete m.fijoMes; } });
  });
  if (!ok) return;
  cerrarHoja(); pintar(); aviso('Recurrente eliminado');
}

// ---------- Saldo inicial ----------
function abrirSaldo() {
  const ini = datos.saldoInicial;
  ponerTipo($('segSigno'), ini && ini.monto < 0 ? 'neg' : 'pos');
  $('saldoMonto').value = ini ? Math.abs(ini.monto).toLocaleString('es-CO') : '';
  $('saldoFecha').value = ini ? ini.fecha : hoyISO();
  $('saldoEliminar').hidden = !ini;
  avisoSaldo();
  abrirHoja('hojaSaldo');
}
function avisoSaldo() {
  const f = $('saldoFecha').value;
  if (!esFecha(f)) { $('saldoAviso').textContent = ''; return; }
  const antes = datos.movs.filter(m => !m.pendiente && m.fecha < f).length;
  $('saldoAviso').textContent = antes
    ? `${antes} movimiento${antes > 1 ? 's' : ''} realizado${antes > 1 ? 's' : ''} con fecha anterior al ${fechaMedia(f)} no modificará${antes > 1 ? 'n' : ''} el saldo, porque ya está${antes > 1 ? 'n' : ''} reflejado${antes > 1 ? 's' : ''} en este valor. Seguirá${antes > 1 ? 'n' : ''} apareciendo en el historial y en los balances mensuales.`
    : 'Todos los movimientos realizados registrados se sumarán o restarán a este saldo.';
}
function guardarSaldo() {
  const texto = $('saldoMonto').value.trim(), fecha = $('saldoFecha').value;
  if (!texto) return aviso('Ingrese el valor del saldo inicial (puede ser 0).');
  if (!esFecha(fecha)) return aviso('Seleccione una fecha válida.');
  if (fecha > hoyISO()) return aviso('La fecha del saldo inicial no puede ser futura.');
  const monto = soloDigitos(texto) * (tipoDe($('segSigno')) === 'neg' ? -1 : 1);
  if (Math.abs(monto) > 1e13) return aviso('El valor ingresado no es válido.');
  if (!transaccion(() => { datos.saldoInicial = { monto, fecha }; })) return;
  cerrarHoja(); pintar(); aviso('Saldo inicial guardado');
}
function quitarSaldo() {
  if (!confirm('¿Quitar el saldo inicial? El saldo disponible se calculará solo con los movimientos registrados.')) return;
  if (!transaccion(() => { datos.saldoInicial = null; })) return;
  cerrarHoja(); pintar(); aviso('Saldo inicial eliminado');
}

// ---------- Categorías personalizadas ----------
let tipoCats = 'gasto';
let editandoCat = null; // { tipo, original | null }
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
}
function guardarCategoria() {
  const { tipo, original } = editandoCat;
  const nombre = $('catNombre').value.trim().replace(/\|/g, '').slice(0, 24);
  if (!nombre) return aviso('Ingrese un nombre para la categoría.');
  if (CLAVES_PROHIBIDAS.includes(nombre)) return aviso('Ese nombre no está permitido.');
  if (catsDe(tipo).some(c => c.nombre.toLowerCase() === nombre.toLowerCase() && c.nombre !== original)) return aviso('Ya existe una categoría con ese nombre.');
  const ok = transaccion(() => {
    const lista = datos.categorias[tipo];
    if (original) {
      const c = lista.find(x => x.nombre === original);
      Object.assign(c, { nombre, icono: catTemp.icono, color: catTemp.color });
      if (original !== nombre) renombrarCat(tipo, original, nombre);
    } else {
      lista.push({ nombre, icono: catTemp.icono, color: catTemp.color });
    }
  });
  if (!ok) return;
  if (original && original !== nombre && filtro.cat === `${tipo}|${original}`) filtro.cat = `${tipo}|${nombre}`;
  cerrarHoja(); pintarAdminCats(); pintar(); aviso(original ? 'Categoría actualizada' : 'Categoría creada');
}
function eliminarCategoria() {
  const { tipo, original } = editandoCat;
  const lista = catsDe(tipo);
  if (lista.length <= 1) return aviso('Debe existir al menos una categoría.');
  const n = usosCat(tipo, original);
  const destino = original === 'Otros' ? lista.find(c => c.nombre !== 'Otros').nombre : 'Otros';
  const msg = n ? `Los ${n} registros de «${original}» se reasignarán a «${destino}». ¿Eliminar la categoría?` : `¿Eliminar la categoría «${original}»?`;
  if (!confirm(msg)) return;
  const ok = transaccion(() => {
    datos.categorias[tipo] = datos.categorias[tipo].filter(c => c.nombre !== original);
    if (n) {
      if (!datos.categorias[tipo].some(c => c.nombre === destino)) datos.categorias[tipo].push({ nombre: 'Otros', icono: 'package', color: '#64748b' });
      datos.movs.forEach(m => { if (m.tipo === tipo && m.cat === original) m.cat = destino; });
      datos.fijos.forEach(f => { if (f.tipo === tipo && f.cat === original) f.cat = destino; });
    }
    if (tipo === 'gasto') delete datos.presupuestos[original];
  });
  if (!ok) return;
  if (filtro.cat === `${tipo}|${original}`) filtro.cat = '';
  cerrarHoja(); pintarAdminCats(); pintar(); aviso('Categoría eliminada');
}
function moverCategoria(i, j) {
  const lista = catsDe(tipoCats);
  if (j < 0 || j >= lista.length) return;
  if (!transaccion(() => { const l = datos.categorias[tipoCats]; const x = l[i]; l[i] = l[j]; l[j] = x; })) return;
  pintarAdminCats();
}

// ---------- Presupuestos ----------
function abrirPresupuestos() {
  $('listaPresupuestos').innerHTML = catsDe('gasto').map(c => `
    <div class="presupuesto-fila">${catIco('gasto', c.nombre)}<span class="nombre">${esc(c.nombre)}</span>
    <input type="text" inputmode="numeric" placeholder="Sin límite" data-pres="${esc(c.nombre)}" value="${datos.presupuestos[c.nombre] ? datos.presupuestos[c.nombre].toLocaleString('es-CO') : ''}" aria-label="Presupuesto de ${esc(c.nombre)}"></div>`).join('');
  $('listaPresupuestos').querySelectorAll('input').forEach(inp => {
    formatearInput(inp);
    inp.addEventListener('change', () => {
      const v = soloDigitos(inp.value), c = inp.dataset.pres;
      if (CLAVES_PROHIBIDAS.includes(c)) return;
      if (transaccion(() => { if (v) datos.presupuestos[c] = v; else delete datos.presupuestos[c]; })) aviso('Presupuesto guardado');
    });
  });
  abrirHoja('hojaPresupuestos');
}

// ---------- Datos comunes para reportes ----------
function datosReporte(r) {
  const lista = (r.lista || datos.movs.filter(m => m.fecha >= r.desde && m.fecha <= r.hasta)).slice()
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || (a.id > b.id ? 1 : -1));
  const conf = lista.filter(m => !m.pendiente);
  const filtrado = !!r.filtros;
  // Con filtros (categoría, tipo, búsqueda) el saldo de la cuenta no aplica a la selección.
  const saldoIni = filtrado ? null : saldoAl(r.desde);
  const saldoFin = filtrado || saldoIni === null ? null : saldoAl(sumarDias(r.hasta, 1));
  return { lista, conf, t: totales(conf), tp: totalesPendientes(lista), saldoIni, saldoFin };
}
async function compartirArchivo(blob, nombre, tipo, titulo) {
  let archivo = null;
  try { archivo = new File([blob], nombre, { type: tipo }); } catch (e) { /* navegador antiguo */ }
  if (archivo && navigator.canShare && navigator.canShare({ files: [archivo] })) {
    try { await navigator.share({ files: [archivo], title: titulo }); return true; }
    catch (e) { if (e.name === 'AbortError') return false; }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = nombre; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  return true;
}

// ---------- Extracto PDF ----------
function hexARgb(hex) { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
const pdfTexto = s => String(s).replace(/−/g, '-').replace(/[«»]/g, '"').replace(/•/g, '*').replace(/[^\x00-\xFF–—‘’“”…]/g, '');
async function generarPDF(o) {
  if (!window.jspdf || !window.jspdf.jsPDF) return aviso('No fue posible cargar el generador de PDF.');
  const { desde, hasta } = o;
  if (!esFecha(desde) || !esFecha(hasta) || desde > hasta) return aviso('Revise el periodo: la fecha final debe ser igual o posterior a la inicial.');
  const { lista, conf, t, tp, saldoIni, saldoFin } = datosReporte(o);
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight(), X = 44;
  const acento = hexARgb(PALETA_HEX[datos.ajustes.paleta] || PALETA_HEX.petroleo);
  const tinta = [16, 24, 32], gris = [86, 97, 108], grisClaro = [139, 148, 157], linea = [226, 230, 234], caja = [245, 246, 247];
  const verde = [21, 128, 61], rojo = [190, 30, 30];
  const T = pdfTexto, neto = v => (v < 0 ? '-' : '') + dinero(Math.abs(v));
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
  if (desc) { const l = doc.splitTextToSize(T(desc), W - 2 * X); doc.text(l, X, y); y += l.length * 11 + 8; }

  // Resumen en cajas
  const tasa = t.ing > 0 ? Math.round(t.bal / t.ing * 100) + ' %' : 'N/D';
  const cajas = [
    ['Saldo inicial', saldoIni === null ? 'N/D' : neto(saldoIni), saldoIni < 0 ? rojo : tinta],
    ['Ingresos', dinero(t.ing), verde], ['Gastos', dinero(t.gas), rojo],
    ['Balance del periodo', neto(t.bal), t.bal < 0 ? rojo : tinta],
    ['Saldo final', saldoFin === null ? 'N/D' : neto(saldoFin), saldoFin < 0 ? rojo : tinta]
  ];
  const gap = 7, ancho = (W - 2 * X - gap * 4) / 5;
  cajas.forEach(([n, v, c], i) => {
    const x = X + i * (ancho + gap);
    doc.setFillColor(...caja); doc.roundedRect(x, y, ancho, 52, 6, 6, 'F');
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...gris); doc.text(T(n), x + 9, y + 18);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...c); doc.text(T(v), x + 9, y + 37);
  });
  y += 52 + 20;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(...tinta);
  let obs = t.bal < 0
    ? `Resultado del periodo: déficit de ${dinero(-t.bal)}. Los gastos superaron a los ingresos.`
    : `Resultado del periodo: superávit de ${dinero(t.bal)}.`;
  obs += ` Tasa de ahorro: ${tasa}. Se incluyen ${conf.length} movimientos realizados.`;
  if (saldoIni === null) obs += o.filtros ? ' El saldo de la cuenta no se calcula cuando se aplican filtros de categoría, tipo o búsqueda.' : ' El periodo inicia antes del saldo inicial registrado, por lo que no se informa saldo.';
  if (tp.n) obs += ` ${tp.n} movimiento(s) pendiente(s) o programado(s) (ingresos ${dinero(tp.ing)}, gastos ${dinero(tp.gas)}) no se suman a los totales ni al saldo.`;
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
    for (let ym = mesDe(desde), i = 0; ym <= mesDe(hasta) && i < 1200; ym = sumarMes(ym, 1), i++) {
      const tm = totales(conf.filter(m => mesDe(m.fecha) === ym));
      if (tm.ing || tm.gas) filasMes.push([mayus(nombreMes(ym)), dinero(tm.ing), dinero(tm.gas), neto(tm.bal)]);
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

  // Detalle con saldo
  seccion('Detalle de movimientos');
  let saldo = saldoIni === null ? 0 : saldoIni;
  const filas = lista.map(m => {
    if (!m.pendiente && (saldoIni === null || cuentaEnSaldo(m))) saldo += valorNeto(m);
    return [fechaCorta(m.fecha), T(m.nota || m.cat), T(m.cat), estadoTexto(m),
      m.tipo === 'ingreso' ? dinero(m.monto) : '', m.tipo === 'gasto' ? dinero(m.monto) : '',
      m.pendiente ? '' : neto(saldo)];
  });
  doc.autoTable(Object.assign({}, estilos, {
    startY: y,
    head: [['Fecha', 'Descripción', 'Categoría', 'Estado', 'Ingreso', 'Gasto', saldoIni === null ? 'Acumulado' : 'Saldo']],
    body: filas.length ? filas : [['', 'Sin movimientos en el periodo consultado', '', '', '', '', '']],
    foot: filas.length ? [['', 'Totales realizados', '', '', dinero(t.ing), dinero(t.gas), neto(t.bal)]] : undefined,
    showFoot: 'lastPage',
    columnStyles: { 0: { cellWidth: 54 }, 3: { cellWidth: 60 }, 4: { halign: 'right', cellWidth: 66 }, 5: { halign: 'right', cellWidth: 66 }, 6: { halign: 'right', cellWidth: 72 } },
    didParseCell: d => {
      if ((d.section === 'head' || d.section === 'foot') && d.column.index >= 4) d.cell.styles.halign = 'right';
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
  await compartirArchivo(doc.output('blob'), `extracto-${desde}-a-${hasta}.pdf`, 'application/pdf', 'Extracto de movimientos');
}

// ---------- Reporte en Excel (.xlsx) ----------
async function generarExcel(o) {
  if (!window.XLSXLite) return aviso('No fue posible cargar el generador de Excel.');
  const { desde, hasta } = o;
  if (!esFecha(desde) || !esFecha(hasta) || desde > hasta) return aviso('Revise el periodo: la fecha final debe ser igual o posterior a la inicial.');
  const X = window.XLSXLite, S = X.estilos;
  const { lista, conf, t, tp, saldoIni, saldoFin } = datosReporte(o);
  const ahora = new Date();
  const emision = `${fechaCorta(isoDe(ahora))} ${pad(ahora.getHours())}:${pad(ahora.getMinutes())}`;
  const cabecera = (titulo, n) => [
    [{ v: titulo, s: S.titulo }],
    [{ v: `Periodo: ${fechaCorta(desde)} - ${fechaCorta(hasta)} · ${o.etiqueta || ''}${o.filtros ? ' · Filtros: ' + o.filtros : ''}`, s: S.subtitulo }],
    [{ v: `Mis Finanzas · Emitido el ${emision} · Valores en pesos colombianos (COP)`, s: S.subtitulo }],
    []
  ].map(f => f.concat(Array(Math.max(0, n - f.length)).fill(null)));
  const enc = (cols, derecha) => cols.map((c, i) => ({ v: c, s: derecha && derecha.includes(i) ? S.encabezadoDerecha : S.encabezado }));
  const L = X.colLetra;

  // 1. Resumen financiero
  const rRes = cabecera('Resumen financiero', 2);
  rRes.push(enc(['Concepto', 'Valor (COP)'], [1]));
  const filaIni = rRes.length + 1;
  rRes.push([{ v: 'Saldo inicial del periodo', s: S.texto }, saldoIni === null ? { v: 'No disponible', s: S.textoTenue } : { v: saldoIni, s: S.moneda }]);
  const fIng = rRes.length + 1; rRes.push([{ v: 'Ingresos realizados', s: S.texto }, { v: t.ing, s: S.moneda }]);
  const fGas = rRes.length + 1; rRes.push([{ v: 'Gastos realizados', s: S.texto }, { v: t.gas, s: S.moneda }]);
  const fBal = rRes.length + 1; rRes.push([{ v: 'Balance del periodo', s: S.totalEtiqueta }, { f: `B${fIng}-B${fGas}`, v: t.bal, s: S.totalMoneda }]);
  rRes.push([{ v: 'Saldo final del periodo', s: S.texto }, saldoFin === null ? { v: 'No disponible', s: S.textoTenue } : { f: `B${filaIni}+B${fBal}`, v: saldoFin, s: S.monedaDestacada }]);
  rRes.push([{ v: 'Tasa de ahorro', s: S.texto }, t.ing > 0 ? { f: `IF(B${fIng}=0,0,B${fBal}/B${fIng})`, v: t.bal / t.ing, s: S.porcentaje } : { v: 'N/D', s: S.textoTenue }]);
  rRes.push([{ v: 'Movimientos realizados', s: S.texto }, { v: conf.length, s: S.entero }]);
  rRes.push([]);
  rRes.push(enc(['Pendientes y programados (no incluidos)', 'Valor (COP)'], [1]));
  rRes.push([{ v: 'Cantidad', s: S.texto }, { v: tp.n, s: S.entero }]);
  rRes.push([{ v: 'Ingresos pendientes y programados', s: S.texto }, { v: tp.ing, s: S.moneda }]);
  rRes.push([{ v: 'Gastos pendientes y programados', s: S.texto }, { v: tp.gas, s: S.moneda }]);
  rRes.push([]);
  rRes.push(enc(['Situación de la cuenta a la fecha de emisión', 'Valor (COP)'], [1]));
  const hoy = hoyISO(), proy = saldoProyectado(finMes(mesDe(hoy)));
  rRes.push([{ v: 'Saldo disponible', s: S.texto }, { v: saldoDisponible(), s: S.monedaDestacada }]);
  rRes.push([{ v: `Saldo proyectado al ${fechaCorta(finMes(mesDe(hoy)))}`, s: S.texto }, { v: proy.valor, s: S.moneda }]);
  rRes.push([{ v: datos.saldoInicial ? `Saldo inicial registrado el ${fechaCorta(datos.saldoInicial.fecha)}` : 'Saldo inicial', s: S.texto }, datos.saldoInicial ? { v: datos.saldoInicial.monto, s: S.moneda } : { v: 'Sin definir', s: S.textoTenue }]);
  if (saldoIni === null) { rRes.push([]); rRes.push([{ v: o.filtros ? 'El saldo no se calcula cuando se aplican filtros de categoría, tipo o búsqueda.' : 'El periodo inicia antes del saldo inicial registrado; no se informa saldo del periodo.', s: S.subtitulo }]); }

  // 2. Movimientos
  const rMov = cabecera('Movimientos', 9);
  rMov.push(enc(['Fecha', 'Tipo', 'Categoría', 'Descripción', 'Estado', 'Ingreso', 'Gasto', 'Valor neto', 'Recurrente'], [5, 6, 7]));
  const iniMov = rMov.length + 1;
  lista.forEach(m => {
    const p = !!m.pendiente;
    const st = (a, b) => p ? a : b;
    rMov.push([
      { v: m.fecha, t: 'd', s: st(S.fechaTenue, S.fecha) }, { v: m.tipo === 'ingreso' ? 'Ingreso' : 'Gasto', s: st(S.textoTenue, S.texto) },
      { v: m.cat, s: st(S.textoTenue, S.texto) }, { v: m.nota || '', s: st(S.textoTenue, S.texto) }, { v: estadoTexto(m), s: st(S.textoTenue, S.texto) },
      m.tipo === 'ingreso' ? { v: m.monto, s: st(S.monedaTenue, S.moneda) } : { v: null, s: S.texto },
      m.tipo === 'gasto' ? { v: m.monto, s: st(S.monedaTenue, S.moneda) } : { v: null, s: S.texto },
      { v: valorNeto(m), s: st(S.monedaTenue, S.moneda) }, { v: m.fijoId ? 'Sí' : 'No', s: st(S.textoTenue, S.texto) }
    ]);
  });
  const finMov = Math.max(iniMov, rMov.length);
  const sumaSi = (col, estado) => `SUMIFS(${col}${iniMov}:${col}${finMov},$E$${iniMov}:$E$${finMov},"${estado}")`;
  const filtroMov = { desde: iniMov - 2, hasta: finMov - 1, columnas: 9 };
  rMov.push([]);
  rMov.push([{ v: 'Total realizado', s: S.totalEtiqueta }, { v: null, s: S.totalEtiqueta }, { v: null, s: S.totalEtiqueta }, { v: null, s: S.totalEtiqueta }, { v: null, s: S.totalEtiqueta },
    { f: sumaSi('F', 'Realizado'), v: t.ing, s: S.totalMoneda }, { f: sumaSi('G', 'Realizado'), v: t.gas, s: S.totalMoneda }, { f: sumaSi('H', 'Realizado'), v: t.bal, s: S.totalMoneda }, { v: null, s: S.totalEtiqueta }]);
  rMov.push([{ v: 'Total pendiente y programado', s: S.texto }, null, null, null, null,
    { f: `${sumaSi('F', 'Pendiente')}+${sumaSi('F', 'Programado')}`, v: tp.ing, s: S.moneda }, { f: `${sumaSi('G', 'Pendiente')}+${sumaSi('G', 'Programado')}`, v: tp.gas, s: S.moneda }, { f: `${sumaSi('H', 'Pendiente')}+${sumaSi('H', 'Programado')}`, v: tp.ing - tp.gas, s: S.moneda }, null]);

  // 3. Gastos por categoría
  const rCat = cabecera('Gastos por categoría', 5);
  rCat.push(enc(['Categoría', 'Movimientos', 'Total (COP)', 'Participación', 'Presupuesto mensual'], [1, 2, 3, 4]));
  const porCat = {};
  conf.filter(m => m.tipo === 'gasto').forEach(m => { porCat[m.cat] = porCat[m.cat] || { n: 0, v: 0 }; porCat[m.cat].n++; porCat[m.cat].v += m.monto; });
  const cats = Object.entries(porCat).sort((a, b) => b[1].v - a[1].v);
  const iniCat = rCat.length + 1, finCat = iniCat + Math.max(cats.length, 1) - 1;
  cats.forEach(([c, x], i) => rCat.push([{ v: c, s: S.texto }, { v: x.n, s: S.entero }, { v: x.v, s: S.moneda },
    { f: `IF($C$${finCat + 1}=0,0,C${iniCat + i}/$C$${finCat + 1})`, v: t.gas ? x.v / t.gas : 0, s: S.porcentaje },
    datos.presupuestos[c] ? { v: datos.presupuestos[c], s: S.moneda } : { v: 'Sin límite', s: S.textoTenue }]));
  if (!cats.length) rCat.push([{ v: 'Sin gastos realizados en el periodo', s: S.textoTenue }]);
  rCat.push([{ v: 'Total', s: S.totalEtiqueta }, { f: `SUM(B${iniCat}:B${finCat})`, v: cats.reduce((s, c) => s + c[1].n, 0), s: S.totalEntero },
    { f: `SUM(C${iniCat}:C${finCat})`, v: t.gas, s: S.totalMoneda }, { v: cats.length ? 1 : 0, f: cats.length ? `SUM(D${iniCat}:D${finCat})` : undefined, s: S.totalPorcentaje }, { v: null, s: S.totalEtiqueta }]);

  // 4. Histórico mensual
  const rHis = cabecera('Histórico mensual', 7);
  rHis.push(enc(['Mes', 'Saldo inicial', 'Ingresos', 'Gastos', 'Balance', 'Saldo final', 'Tasa de ahorro'], [1, 2, 3, 4, 5, 6]));
  const iniHis = rHis.length + 1;
  let nHis = 0;
  for (let ym = mesDe(desde), i = 0; ym <= mesDe(hasta) && i < 1200; ym = sumarMes(ym, 1), i++) {
    const a = ym === mesDe(desde) ? desde : `${ym}-01`, b = ym === mesDe(hasta) ? hasta : finMes(ym);
    const tm = totales(conf.filter(m => m.fecha >= a && m.fecha <= b));
    const si = o.filtros ? null : saldoAl(a), sf = si === null ? null : saldoAl(sumarDias(b, 1));
    const f = iniHis + nHis;
    rHis.push([{ v: mayus(nombreMes(ym)), s: S.texto }, si === null ? { v: 'N/D', s: S.textoTenue } : { v: si, s: S.moneda },
      { v: tm.ing, s: S.moneda }, { v: tm.gas, s: S.moneda }, { f: `C${f}-D${f}`, v: tm.bal, s: S.moneda },
      sf === null ? { v: 'N/D', s: S.textoTenue } : { v: sf, s: S.moneda }, { f: `IF(C${f}=0,"",E${f}/C${f})`, v: tm.ing ? tm.bal / tm.ing : '', s: S.porcentaje }]);
    nHis++;
  }
  const finHis = iniHis + nHis - 1;
  rHis.push([{ v: 'Total', s: S.totalEtiqueta }, { v: null, s: S.totalEtiqueta }, { f: `SUM(C${iniHis}:C${finHis})`, v: t.ing, s: S.totalMoneda }, { f: `SUM(D${iniHis}:D${finHis})`, v: t.gas, s: S.totalMoneda },
    { f: `SUM(E${iniHis}:E${finHis})`, v: t.bal, s: S.totalMoneda }, { v: null, s: S.totalEtiqueta }, { f: `IF(C${finHis + 1}=0,"",E${finHis + 1}/C${finHis + 1})`, v: t.ing ? t.bal / t.ing : '', s: S.totalPorcentaje }]);

  // 5. Presupuestos (por mes del periodo)
  const rPre = cabecera('Presupuestos', 7);
  rPre.push(enc(['Mes', 'Categoría', 'Presupuesto', 'Gastado', 'Disponible', '% utilizado', 'Estado'], [2, 3, 4, 5]));
  const iniPre = rPre.length + 1;
  const pres = Object.entries(datos.presupuestos).filter(([, v]) => v > 0);
  if (pres.length) {
    for (let ym = mesDe(desde), i = 0; ym <= mesDe(hasta) && i < 1200; ym = sumarMes(ym, 1), i++) {
      pres.forEach(([c, lim]) => {
        const g = conf.filter(m => m.tipo === 'gasto' && m.cat === c && mesDe(m.fecha) === ym).reduce((s, m) => s + m.monto, 0);
        const f = rPre.length + 1;
        rPre.push([{ v: mayus(nombreMes(ym)), s: S.texto }, { v: c, s: S.texto }, { v: lim, s: S.moneda }, { v: g, s: S.moneda },
          { f: `C${f}-D${f}`, v: lim - g, s: S.moneda }, { f: `IF(C${f}=0,0,D${f}/C${f})`, v: g / lim, s: S.porcentaje },
          { v: g > lim ? 'Excedido' : g >= lim * .8 ? 'En alerta (80 %)' : 'Dentro del límite', s: S.texto }]);
      });
    }
    rPre.push([]);
    rPre.push([{ v: 'Nota: todos los meses se comparan con los límites vigentes hoy. La aplicación aún no guarda un historial de presupuestos por mes, por lo que un mes anterior no refleja el límite que tenía en ese momento.', s: S.textoTenue }]);
  } else rPre.push([{ v: 'No hay presupuestos definidos. Configúrelos en Ajustes > Presupuestos mensuales.', s: S.textoTenue }]);

  // 6. Recurrentes
  const rRec = cabecera('Recurrentes', 8);
  rRec.push(enc(['Nombre', 'Tipo', 'Categoría', 'Día del mes', 'Valor mensual', 'Estado', 'Vigente desde', 'Estado en el mes actual'], [3, 4]));
  const iniRec = rRec.length + 1;
  const ymHoy = mesDe(hoy);
  datos.fijos.slice().sort((a, b) => a.tipo.localeCompare(b.tipo) || a.dia - b.dia).forEach(f => {
    const mov = movDeFijo(f, ymHoy);
    const estMes = !f.activo ? 'En pausa' : !datos.generados[`${f.id}|${ymHoy}`] ? 'Programado'
      : !mov ? 'Cancelado en el mes' : mov.pendiente ? 'Pendiente de confirmación' : 'Confirmado';
    rRec.push([{ v: f.nombre, s: S.texto }, { v: f.tipo === 'ingreso' ? 'Ingreso' : 'Gasto', s: S.texto }, { v: f.cat, s: S.texto }, { v: f.dia, s: S.entero },
      { v: f.monto, s: S.moneda }, { v: f.activo ? 'Activo' : 'En pausa', s: S.texto }, { v: esMes(f.desde) ? mayus(nombreMes(f.desde)) : '', s: S.texto }, { v: estMes, s: S.texto }]);
  });
  const finRec = Math.max(iniRec, rRec.length);
  if (!datos.fijos.length) rRec.push([{ v: 'No hay movimientos recurrentes registrados.', s: S.textoTenue }]);
  rRec.push([]);
  const sumRec = tipo => `SUMIFS(E${iniRec}:E${finRec},B${iniRec}:B${finRec},"${tipo}",F${iniRec}:F${finRec},"Activo")`;
  const rIng = datos.fijos.filter(f => f.activo && f.tipo === 'ingreso').reduce((s, f) => s + f.monto, 0);
  const rGas = datos.fijos.filter(f => f.activo && f.tipo === 'gasto').reduce((s, f) => s + f.monto, 0);
  const fr = rRec.length + 1;
  rRec.push([{ v: 'Ingresos recurrentes activos', s: S.texto }, null, null, null, { f: sumRec('Ingreso'), v: rIng, s: S.moneda }]);
  rRec.push([{ v: 'Gastos recurrentes activos', s: S.texto }, null, null, null, { f: sumRec('Gasto'), v: rGas, s: S.moneda }]);
  rRec.push([{ v: 'Disponible mensual', s: S.totalEtiqueta }, { v: null, s: S.totalEtiqueta }, { v: null, s: S.totalEtiqueta }, { v: null, s: S.totalEtiqueta }, { f: `E${fr}-E${fr + 1}`, v: rIng - rGas, s: S.totalMoneda }]);

  const hoja = (nombre, filas, columnas, filaEnc, ultima, nCols) => ({
    nombre, filas, columnas, congelar: filaEnc, combinar: [`A1:${L(nCols - 1)}1`, `A2:${L(nCols - 1)}2`, `A3:${L(nCols - 1)}3`],
    filtro: ultima >= filaEnc ? { desde: filaEnc - 1, hasta: ultima - 1, columnas: nCols } : null, altos: { [filaEnc - 1]: 22 }
  });
  const blob = X.libro({
    titulo: 'Mis Finanzas - Reporte financiero', acento: PALETA_HEX[datos.ajustes.paleta] || PALETA_HEX.petroleo,
    hojas: [
      { nombre: 'Resumen', filas: rRes, columnas: [44, 22], combinar: ['A1:B1', 'A2:B2', 'A3:B3'], altos: { 4: 22 } },
      Object.assign(hoja('Movimientos', rMov, [12, 10, 18, 34, 13, 15, 15, 15, 11], 5, finMov, 9), { filtro: lista.length ? filtroMov : null }),
      hoja('Gastos por categoría', rCat, [24, 14, 18, 14, 20], 5, cats.length ? finCat : 0, 5),
      hoja('Histórico mensual', rHis, [20, 17, 17, 17, 17, 17, 15], 5, finHis, 7),
      hoja('Presupuestos', rPre, [18, 22, 16, 16, 16, 13, 18], 5, pres.length ? rPre.length : 0, 7),
      hoja('Recurrentes', rRec, [26, 10, 18, 12, 17, 11, 16, 24], 5, datos.fijos.length ? finRec : 0, 8)
    ]
  });
  await compartirArchivo(blob, `reporte-${desde}-a-${hasta}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Reporte financiero');
}

// ---------- Copia de seguridad ----------
async function exportar() {
  const nombre = `mis-finanzas-copia-${hoyISO()}.json`;
  const contenido = Object.assign({ app: 'Mis Finanzas', formato: VERSION_DATOS, versionApp: VERSION_APP, exportado: new Date().toISOString() }, datos);
  const blob = new Blob([JSON.stringify(contenido, null, 2)], { type: 'application/json' });
  const ok = await compartirArchivo(blob, nombre, 'application/json', 'Copia de seguridad');
  if (ok && transaccion(() => { datos.ajustes.ultimaCopia = hoyISO(); })) pintarAjustes();
}
// Revisa una copia (1.0 o 1.1) registro por registro y descarta lo que esté dañado.
function validarCopia(obj) {
  const NO = 'El archivo no contiene una copia de Mis Finanzas.';
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) throw new Error(NO);
  if (obj.app !== undefined && obj.app !== 'Mis Finanzas') throw new Error(NO);
  const fuente = obj.datos && typeof obj.datos === 'object' && Array.isArray(obj.datos.movs) ? obj.datos : obj;
  if (!Array.isArray(fuente.movs)) throw new Error(NO);
  if (fuente.movs.length > 500000) throw new Error('La copia supera el tamaño admitido.');
  if (Number(obj.formato) > VERSION_DATOS) throw new Error('La copia proviene de una versión más reciente de la aplicación. Actualice la app antes de restaurarla.');
  const texto = v => typeof v === 'string' ? v : (typeof v === 'number' ? String(v) : '');
  let descartados = 0, futurosCorregidos = 0;
  const hoy = hoyISO();

  const fijos = [], idsFijos = new Set();
  for (const f of Array.isArray(fuente.fijos) ? fuente.fijos : []) {
    const monto = Math.round(Number(f && f.monto));
    if (!f || typeof f !== 'object' || !['gasto', 'ingreso'].includes(f.tipo) || !isFinite(monto) || monto <= 0 || monto > 1e13) { descartados++; continue; }
    let id = texto(f.id).slice(0, 40) || nuevoId();
    if (idsFijos.has(id)) id = nuevoId();
    idsFijos.add(id);
    fijos.push({
      id, tipo: f.tipo,
      nombre: texto(f.nombre).trim().slice(0, 40) || 'Recurrente', monto,
      cat: texto(f.cat).trim().replace(/\|/g, '').slice(0, 24) || 'Otros',
      dia: Math.min(31, Math.max(1, parseInt(f.dia, 10) || 1)), activo: f.activo !== false,
      desde: esMes(f.desde) ? f.desde : mesDe(hoyISO())
    });
  }
  const ids = new Set(), movs = [];
  for (const m of fuente.movs) {
    const monto = m && typeof m.monto === 'string' ? soloDigitos(m.monto) : Math.round(Number(m && m.monto));
    if (!m || typeof m !== 'object' || !['gasto', 'ingreso'].includes(m.tipo) || !isFinite(monto) || monto <= 0 || monto > 1e13 || !esFecha(m.fecha)) { descartados++; continue; }
    let id = texto(m.id).slice(0, 40) || nuevoId();
    if (ids.has(id)) id = nuevoId();
    ids.add(id);
    const mov = { id, tipo: m.tipo, monto, cat: texto(m.cat).trim().replace(/\|/g, '').slice(0, 24) || 'Otros', fecha: m.fecha, nota: texto(m.nota).slice(0, 200) };
    if (typeof m.fijoId === 'string' && idsFijos.has(m.fijoId)) { mov.fijoId = m.fijoId; if (esMes(m.fijoMes)) mov.fijoMes = m.fijoMes; }
    if (m.pendiente === true) mov.pendiente = true;
    else if (m.fecha > hoy) { mov.pendiente = true; futurosCorregidos++; } // una fecha futura nunca queda confirmada
    movs.push(mov);
  }
  if (fuente.movs.length && !movs.length) throw new Error('Ningún movimiento de la copia es válido.');
  const generados = {};
  if (fuente.generados && typeof fuente.generados === 'object') Object.keys(fuente.generados).forEach(k => {
    if (fuente.generados[k] && /^[^|]{1,40}\|\d{4}-(0[1-9]|1[0-2])$/.test(k) && !CLAVES_PROHIBIDAS.includes(k)) generados[k] = true;
  });
  const presupuestos = {};
  if (fuente.presupuestos && typeof fuente.presupuestos === 'object') Object.keys(fuente.presupuestos).forEach(k => {
    const n = Math.round(Number(fuente.presupuestos[k]));
    if (!CLAVES_PROHIBIDAS.includes(k) && k.length <= 24 && n > 0 && n <= 1e13) presupuestos[k] = n;
  });
  const ajustes = {};
  if (fuente.ajustes && typeof fuente.ajustes === 'object') Object.keys(AJUSTES_BASE).forEach(k => {
    if (k in fuente.ajustes && typeof fuente.ajustes[k] === typeof AJUSTES_BASE[k]) ajustes[k] = fuente.ajustes[k];
  });
  if (fuente.saldoInicial && !validarSaldoInicial(fuente.saldoInicial)) descartados++;
  const d = normalizar({ version: Number(fuente.version) || 1, movs, fijos, generados, presupuestos, ajustes, categorias: fuente.categorias, saldoInicial: fuente.saldoInicial });
  const fechas = movs.map(m => m.fecha).sort();
  return { datos: d, descartados, futurosCorregidos, desde: fechas[0], hasta: fechas[fechas.length - 1], exportado: typeof obj.exportado === 'string' ? obj.exportado.slice(0, 10) : '' };
}
function leerRespaldoAuto() {
  try { const r = JSON.parse(localStorage.getItem(CLAVE_RESPALDO) || 'null'); return r && r.datos && typeof r.fecha === 'string' ? r : null; } catch (e) { return null; }
}
function importar(file) {
  if (file.size > 25 * 1024 * 1024) return aviso('El archivo es demasiado grande para ser una copia de Mis Finanzas.');
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
      d.saldoInicial ? `• Saldo inicial de ${dinero(d.saldoInicial.monto)} al ${fechaMedia(d.saldoInicial.fecha)}` : '• Sin saldo inicial',
      r.descartados ? `• ${r.descartados} registros dañados se omitirán` : '',
      r.futurosCorregidos ? `• ${r.futurosCorregidos} movimiento${r.futurosCorregidos > 1 ? 's' : ''} con fecha futura quedará${r.futurosCorregidos > 1 ? 'n' : ''} como programado${r.futurosCorregidos > 1 ? 's' : ''}, sin afectar el saldo` : '',
      '',
      `Se reemplazarán los ${datos.movs.length} movimientos actuales. Se guardará un respaldo automático para poder deshacer la restauración.`,
      '¿Desea continuar?'
    ].filter((l, i) => l || i === 6);
    if (!confirm(lineas.join('\n'))) return;
    try { localStorage.setItem(CLAVE_RESPALDO, JSON.stringify({ fecha: new Date().toISOString(), datos })); }
    catch (e) { if (!confirm('No hay espacio para guardar el respaldo automático. ¿Restaurar de todas formas?')) return; }
    const anteriores = datos;
    datos = d;
    errorCarga = false;
    if (!guardar()) { datos = anteriores; pintar(); return; }
    generarFijos(); aplicarTema(); pintar();
    aviso(`Copia restaurada: ${d.movs.length} movimientos`);
  };
  lector.readAsText(file);
}
function deshacerRestauracion() {
  const r = leerRespaldoAuto();
  if (!r) return;
  if (!confirm(`¿Volver a los datos que había antes de la última restauración (${Array.isArray(r.datos.movs) ? r.datos.movs.length : 0} movimientos)?`)) return;
  const anteriores = datos;
  datos = normalizar(r.datos);
  if (!guardar()) { datos = anteriores; pintar(); return; }
  try { localStorage.removeItem(CLAVE_RESPALDO); } catch (e) { /* ignorar */ }
  aplicarTema(); pintar(); aviso('Restauración deshecha');
}

// ---------- Aviso ----------
let tAviso, tError, avisoError = false;
function aviso(txt, esError) {
  // Un mensaje de error no se reemplaza por otro mensaje durante unos segundos
  if (!esError && avisoError) return;
  if (esError) { avisoError = true; clearTimeout(tError); tError = setTimeout(() => { avisoError = false; }, 3500); }
  const a = $('aviso'); a.textContent = txt; a.classList.add('visible');
  a.classList.toggle('error', !!esError);
  clearTimeout(tAviso); tAviso = setTimeout(() => a.classList.remove('visible'), esError ? 4500 : 2600);
}

// ---------- Eventos ----------
function iniciar() {
  datos = cargar();
  pintarIconos(document);
  aplicarTema();
  privado = !!datos.ajustes.ocultar;
  if (errorCarga) aviso('No fue posible leer los datos guardados. Restaure una copia de seguridad.', true);
  else { guardar(); generarFijos(); } // guarda la migración de versiones anteriores

  document.querySelectorAll('[data-ir]').forEach(b => b.addEventListener('click', () => irA(b.dataset.ir)));
  $('mesAnterior').onclick = () => { mesVista = sumarMes(mesVista, -1); pintar(); };
  $('mesSiguiente').onclick = () => { mesVista = sumarMes(mesVista, 1); pintar(); };
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
  formatearInput($('saldoMonto'));
  usarSegmento($('segTipo'), t => pintarCats($('movCats'), t, null));
  usarSegmento($('segTipoFijo'), t => pintarCats($('fijoCats'), t, null));
  usarSegmento($('segSigno'), () => {});
  [$('movCats'), $('fijoCats')].forEach(c => c.addEventListener('click', e => {
    const b = e.target.closest('.cat'); if (!b) return;
    c.querySelectorAll('.cat').forEach(x => x.classList.toggle('activo', x === b));
  }));
  $('movFecha').addEventListener('change', actualizarNotaFutura);
  $('movGuardar').onclick = guardarMov;
  $('movEliminar').onclick = eliminarMov;
  $('movConfirmar').onclick = () => { if (editandoMov) { const id = editandoMov.id; cerrarHoja(); confirmarMov(id); } };
  $('movReprogramar').onclick = () => {
    const f = $('movFecha');
    f.focus();
    try { if (f.showPicker) f.showPicker(); } catch (e) { /* Safari antiguo: basta con el foco */ }
    aviso('Elija la nueva fecha y toque Guardar.');
  };
  $('fijoGuardar').onclick = guardarFijo;
  $('fijoEliminar').onclick = eliminarFijo;
  $('btnNuevoFijo').onclick = () => abrirFijo();
  $('btnDefinirSaldo').onclick = abrirSaldo;
  $('btnSaldoInicial').onclick = abrirSaldo;
  $('saldoFecha').addEventListener('change', avisoSaldo);
  $('confFecha').addEventListener('change', avisoConfirmar);
  $('confGuardar').onclick = guardarConfirmacion;
  $('saldoGuardar').onclick = guardarSaldo;
  $('saldoEliminar').onclick = quitarSaldo;
  $('btnVerPendientes').onclick = () => {
    filtro = filtroInicial(); filtro.periodo = 'todo'; filtro.estado = 'pendiente';
    panelMov = 'lista'; $('buscar').value = '';
    $('filtroTipo').querySelectorAll('button').forEach(x => x.classList.toggle('activo', x.dataset.f === 'todos'));
    pintarFiltroPeriodo(); pintarSelectCategorias(); irA('movimientos');
  };

  // Movimientos: paneles y filtros
  $('segMov').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    panelMov = b.dataset.panel; pintar();
  });
  $('buscar').addEventListener('input', e => {
    // La búsqueda respeta el periodo elegido; solo busca en todo el historial si el usuario lo marca.
    filtro.q = e.target.value;
    pintar();
  });
  $('buscarHistorial').onchange = e => { filtro.historial = e.target.checked; pintar(); };
  $('btnFiltros').onclick = () => {
    const abierto = $('panelFiltros').hidden;
    $('panelFiltros').hidden = !abierto;
    $('btnFiltros').setAttribute('aria-expanded', abierto ? 'true' : 'false');
    if (abierto) { pintarFiltroPeriodo(); pintarSelectCategorias(); }
  };
  $('chipsPeriodo').addEventListener('click', e => {
    const b = e.target.closest('.chip'); if (!b) return;
    filtro.periodo = b.dataset.p;
    pintarFiltroPeriodo(); pintar();
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
    const q = filtro.q;
    filtro = filtroInicial(); filtro.q = q;
    $('filtroTipo').querySelectorAll('button').forEach(x => x.classList.toggle('activo', x.dataset.f === 'todos'));
    pintarFiltroPeriodo(); pintarSelectCategorias(); pintar();
  };
  $('btnPdfFiltro').onclick = () => {
    const { lista, rango } = aplicarFiltros();
    let desde = rango.desde, hasta = rango.hasta;
    if (!desde) { const f = lista.map(m => m.fecha).sort(); desde = f[0] || hoyISO(); hasta = f[f.length - 1] || hoyISO(); }
    generarPDF({ desde, hasta, etiqueta: rango.etiqueta, lista, filtros: descripcionFiltros() });
  };

  // Ajustes
  $('temaSeg').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (transaccion(() => { datos.ajustes.tema = b.dataset.tema; })) { aplicarTema(); pintar(); }
  });
  $('paletas').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (transaccion(() => { datos.ajustes.paleta = b.dataset.paleta; })) { aplicarTema(); pintar(); }
  });
  const interruptor = (id, clave) => { $(id).onchange = e => { if (!transaccion(() => { datos.ajustes[clave] = e.target.checked; })) e.target.checked = !e.target.checked; }; };
  interruptor('ocultarAlAbrir', 'ocultar');
  interruptor('ocultarAlSalir', 'ocultarAlSalir');
  interruptor('confirmarRecurrentes', 'confirmarRecurrentes');
  $('btnCategorias').onclick = () => { pintarAdminCats(); abrirHoja('hojaCategorias'); };
  $('btnPresupuestos').onclick = abrirPresupuestos;
  $('btnIrRecurrentes').onclick = () => { panelMov = 'recurrentes'; irA('movimientos'); };
  $('repChips').addEventListener('click', e => {
    const b = e.target.closest('.chip'); if (!b) return;
    rep.periodo = b.dataset.p; pintarReportes();
  });
  $('btnPdf').onclick = () => generarPDF(rangoReporte());
  $('btnExcel').onclick = () => generarExcel(rangoReporte());
  $('btnExportar').onclick = exportar;
  $('archivoImportar').onchange = e => { if (e.target.files[0]) importar(e.target.files[0]); e.target.value = ''; };
  $('btnDeshacerRestauracion').onclick = deshacerRestauracion;
  $('btnBorrarTodo').onclick = () => {
    if (!confirm('¿Eliminar todos los movimientos, recurrentes, categorías, saldo inicial y ajustes de este dispositivo?')) return;
    if (!confirm('Confirmación final: esta acción no se puede deshacer. Se recomienda exportar una copia antes.')) return;
    const anteriores = datos;
    datos = estadoVacio(); errorCarga = false;
    if (!guardar()) { datos = anteriores; return; }
    aplicarTema(); pintar(); aviso('Datos eliminados');
  };

  // Categorías
  usarSegmento($('segTipoCats'), t => { tipoCats = t; pintarAdminCats(); });
  $('listaCategorias').addEventListener('click', e => {
    const li = e.target.closest('[data-cat-i]'); if (!li) return;
    const i = Number(li.dataset.catI);
    const mover = e.target.closest('[data-mover]');
    if (mover) return moverCategoria(i, i + Number(mover.dataset.mover));
    abrirCategoria(tipoCats, catsDe(tipoCats)[i]);
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
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const alCambiarTema = () => { aplicarTema(); pintar(); };
  if (mq.addEventListener) mq.addEventListener('change', alCambiarTema); else if (mq.addListener) mq.addListener(alCambiarTema);

  pintar();
  try { sessionStorage.removeItem('mf.recarga'); } catch (e) { /* ignorar */ }

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).catch(() => {});
  }
}
iniciar();
