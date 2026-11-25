/* Mis Finanzas: todo se guarda en este dispositivo (localStorage). */
'use strict';

// ---------- Categorías ----------
const CATS = {
  gasto: [
    ['Comida', '🍔'], ['Mercado', '🛒'], ['Transporte', '🚌'], ['Hogar', '🏠'],
    ['Servicios', '💡'], ['Salud', '💊'], ['Educación', '📚'], ['Diversión', '🎬'],
    ['Ropa', '👕'], ['Deudas', '💳'], ['Suscripciones', '📺'], ['Otros', '📦']
  ],
  ingreso: [
    ['Salario', '💼'], ['Extra', '💰'], ['Ventas', '🏷️'], ['Regalo', '🎁'],
    ['Intereses', '🏦'], ['Otros', '📦']
  ]
};
const emojiDe = (tipo, cat) => (CATS[tipo].find(c => c[0] === cat) || ['', '📦'])[1];

// ---------- Datos ----------
const CLAVE = 'misFinanzas.v1';
const estadoVacio = () => ({ movs: [], fijos: [], generados: {}, presupuestos: {}, ajustes: { tema: 'auto', ocultar: false } });
let datos = cargar();

function cargar() {
  try {
    const t = localStorage.getItem(CLAVE);
    if (t) return Object.assign(estadoVacio(), JSON.parse(t));
  } catch (e) { console.warn('No se pudieron leer los datos', e); }
  return estadoVacio();
}
function guardar() {
  try { localStorage.setItem(CLAVE, JSON.stringify(datos)); }
  catch (e) { aviso('⚠️ No se pudo guardar'); }
}
const nuevoId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

// ---------- Fechas (siempre como texto AAAA-MM-DD, en hora local) ----------
const pad = n => String(n).padStart(2, '0');
const hoyISO = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const mesDe = iso => iso.slice(0, 7);
const diasEnMes = (y, m) => new Date(y, m, 0).getDate(); // m: 1-12
function sumarMes(ym, n) {
  let [y, m] = ym.split('-').map(Number);
  m += n; while (m > 12) { m -= 12; y++; } while (m < 1) { m += 12; y--; }
  return `${y}-${pad(m)}`;
}
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const nombreMes = ym => { const [y, m] = ym.split('-').map(Number); return `${MESES[m - 1]} ${y}`; };
function fechaLarga(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const dia = DIAS[new Date(y, m - 1, d).getDay()];
  if (iso === hoyISO()) return 'Hoy';
  return `${dia} ${d} de ${MESES[m - 1]}`;
}
const fechaCorta = iso => { const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; };

// ---------- Dinero ----------
const fmt = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const dinero = n => fmt.format(Math.round(n));
const soloDigitos = s => Number(String(s).replace(/\D/g, '')) || 0;
function formatearInput(input) {
  input.addEventListener('input', () => {
    const n = soloDigitos(input.value);
    input.value = n ? n.toLocaleString('es-CO') : '';
  });
}
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------- Fijos: se anotan solos cada mes ----------
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
      datos.movs.push({ id: nuevoId(), tipo: f.tipo, monto: f.monto, cat: f.cat, fecha: `${ym}-${pad(dia)}`, nota: f.nombre, fijoId: f.id });
      datos.generados[clave] = true;
      cambios = true;
    }
  }
  if (cambios) guardar();
}
function fijosPendientes(ym) {
  // Fijos de este mes que aún no se han anotado
  if (ym !== mesDe(hoyISO())) return [];
  return datos.fijos.filter(f => f.activo && f.desde <= ym && !datos.generados[`${f.id}|${ym}`]);
}

// ---------- Estado de la interfaz ----------
let mesVista = mesDe(hoyISO());
let vista = 'inicio';
let filtroTipo = 'todos';
const $ = id => document.getElementById(id);

function movsDelMes(ym) { return datos.movs.filter(m => mesDe(m.fecha) === ym); }
function totales(lista) {
  let ing = 0, gas = 0;
  for (const m of lista) m.tipo === 'ingreso' ? ing += m.monto : gas += m.monto;
  return { ing, gas, bal: ing - gas };
}
const ordenar = l => l.slice().sort((a, b) => b.fecha.localeCompare(a.fecha) || (b.id > a.id ? 1 : -1));

function itemHTML(m) {
  const signo = m.tipo === 'ingreso' ? '+' : '−';
  const clase = m.tipo === 'ingreso' ? 'positivo' : '';
  const sub = [fechaLarga(m.fecha), m.nota].filter(Boolean).map(esc).join(' · ');
  return `<li class="item" data-id="${m.id}">
    <div class="emoji">${emojiDe(m.tipo, m.cat)}</div>
    <div class="info"><b>${esc(m.cat)}${m.fijoId ? '<span class="etiqueta-fijo">fijo</span>' : ''}</b><small>${sub}</small></div>
    <div class="valor privado ${clase}">${signo}${dinero(m.monto)}</div></li>`;
}

// ---------- Pintar cada vista ----------
function pintar() {
  $('mesActual').textContent = nombreMes(mesVista);
  $('mesSiguiente').disabled = mesVista >= mesDe(hoyISO());
  $('mesSiguiente').style.opacity = $('mesSiguiente').disabled ? .35 : 1;
  pintarInicio();
  if (vista === 'movimientos') pintarMovimientos();
  if (vista === 'graficas') pintarGraficas();
  if (vista === 'fijos') pintarFijos();
  if (vista === 'ajustes') pintarAjustes();
}

function pintarInicio() {
  const lista = movsDelMes(mesVista);
  const t = totales(lista);
  $('balanceMonto').textContent = dinero(t.bal);
  $('totalIngresos').textContent = dinero(t.ing);
  $('totalGastos').textContent = dinero(t.gas);
  $('balanceCard').classList.toggle('deficit', t.bal < 0);

  let estado;
  if (!lista.length) estado = 'Aún no hay movimientos este mes';
  else if (t.bal < 0) estado = `⚠️ Estás en déficit: gastaste ${dinero(-t.bal)} más de lo que entró`;
  else if (t.ing > 0 && t.gas / t.ing > .9) estado = '😬 Vas justo: casi gastas todo lo que entró';
  else estado = '✅ Vas bien: estás gastando menos de lo que ganas';
  $('estadoMes').textContent = estado;

  const pct = t.ing > 0 ? Math.round(t.gas / t.ing * 100) : (t.gas > 0 ? 100 : 0);
  $('barraGasto').style.width = Math.min(pct, 100) + '%';
  $('barraTexto').textContent = t.ing > 0 ? `Has gastado el ${pct}% de tus ingresos` : 'Registra un ingreso para ver el porcentaje';

  // Proyección
  const pend = fijosPendientes(mesVista);
  const pIng = pend.filter(f => f.tipo === 'ingreso').reduce((s, f) => s + f.monto, 0);
  const pGas = pend.filter(f => f.tipo === 'gasto').reduce((s, f) => s + f.monto, 0);
  $('proyeccionCard').hidden = mesVista !== mesDe(hoyISO());
  const proy = t.bal + pIng - pGas;
  $('proyeccion').textContent = dinero(proy);
  $('proyeccion').className = 'proyeccion privado ' + (proy < 0 ? 'negativo' : 'positivo');
  $('proyeccionDetalle').textContent = pend.length
    ? `Faltan por llegar ${dinero(pIng)} y por pagar ${dinero(pGas)} en fijos.`
    : 'No hay fijos pendientes este mes.';

  // Alertas de presupuesto
  const gastoCat = {};
  lista.filter(m => m.tipo === 'gasto').forEach(m => gastoCat[m.cat] = (gastoCat[m.cat] || 0) + m.monto);
  $('alertas').innerHTML = Object.entries(datos.presupuestos)
    .filter(([c, lim]) => lim > 0 && (gastoCat[c] || 0) >= lim * .8)
    .map(([c, lim]) => {
      const g = gastoCat[c] || 0, exc = g > lim;
      return `<div class="card alerta ${exc ? 'excedido' : ''}">
        <b>${emojiDe('gasto', c)} ${esc(c)}: ${exc ? 'te pasaste del presupuesto' : 'cerca del límite'}</b>
        <div class="sub privado" style="margin:2px 0 0">${dinero(g)} de ${dinero(lim)}</div>
        <div class="mini-barra"><div style="width:${Math.min(100, g / lim * 100)}%"></div></div></div>`;
    }).join('');

  const ult = ordenar(lista).slice(0, 5);
  $('ultimos').innerHTML = ult.length ? ult.map(itemHTML).join('') : '<li class="vacio">Toca el botón + para agregar tu primer gasto o ingreso.</li>';
}

function pintarMovimientos() {
  const q = $('buscar').value.trim().toLowerCase();
  let lista = movsDelMes(mesVista);
  if (filtroTipo !== 'todos') lista = lista.filter(m => m.tipo === filtroTipo);
  if (q) lista = lista.filter(m => (m.cat + ' ' + (m.nota || '')).toLowerCase().includes(q));
  lista = ordenar(lista);
  if (!lista.length) { $('listaMovimientos').innerHTML = '<div class="card vacio">No hay movimientos para mostrar.</div>'; return; }
  const grupos = {};
  lista.forEach(m => (grupos[m.fecha] = grupos[m.fecha] || []).push(m));
  $('listaMovimientos').innerHTML = Object.entries(grupos).map(([f, ms]) => {
    const t = totales(ms);
    return `<div class="dia-titulo"><span>${fechaLarga(f)}</span><span class="privado">${t.bal >= 0 ? '+' : '−'}${dinero(Math.abs(t.bal))}</span></div>
      <div class="card" style="padding:4px 16px"><ul class="lista">${ms.map(itemHTML).join('')}</ul></div>`;
  }).join('');
}

// ---------- Gráficas ----------
const graficas = {};
const PALETA = ['#0f766e', '#f59e0b', '#6366f1', '#ef4444', '#06b6d4', '#84cc16', '#ec4899', '#8b5cf6', '#f97316', '#14b8a6', '#64748b', '#a3a3a3'];
function colorVar(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }
function grafica(id, config) {
  if (typeof Chart === 'undefined') return;
  if (graficas[id]) graficas[id].destroy();
  Chart.defaults.color = colorVar('--sub');
  Chart.defaults.borderColor = colorVar('--borde');
  Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;
  graficas[id] = new Chart($(id), config);
}
const ejeDinero = { ticks: { callback: v => Math.abs(v) >= 1e6 ? (v / 1e6).toLocaleString('es-CO') + ' M' : Math.abs(v) >= 1e3 ? (v / 1e3).toLocaleString('es-CO') + ' mil' : v } };
const tooltipDinero = { callbacks: { label: c => `${c.dataset.label || c.label}: ${dinero(c.raw)}` } };

function pintarGraficas() {
  // 1. Últimos 6 meses
  const meses = [...Array(6)].map((_, i) => sumarMes(mesVista, i - 5));
  const t6 = meses.map(ym => totales(movsDelMes(ym)));
  grafica('gMeses', {
    type: 'bar',
    data: {
      labels: meses.map(ym => MESES[Number(ym.slice(5)) - 1].slice(0, 3)),
      datasets: [
        { label: 'Ingresos', data: t6.map(t => t.ing), backgroundColor: colorVar('--verde'), borderRadius: 6 },
        { label: 'Gastos', data: t6.map(t => t.gas), backgroundColor: colorVar('--rojo'), borderRadius: 6 }
      ]
    },
    options: { maintainAspectRatio: false, scales: { y: { beginAtZero: true, ...ejeDinero } }, plugins: { tooltip: tooltipDinero } }
  });

  // 2. Gastos por categoría
  const porCat = {};
  movsDelMes(mesVista).filter(m => m.tipo === 'gasto').forEach(m => porCat[m.cat] = (porCat[m.cat] || 0) + m.monto);
  const cats = Object.entries(porCat).sort((a, b) => b[1] - a[1]);
  const total = cats.reduce((s, c) => s + c[1], 0);
  grafica('gCategorias', {
    type: 'doughnut',
    data: { labels: cats.map(c => c[0]), datasets: [{ data: cats.map(c => c[1]), backgroundColor: PALETA, borderWidth: 2, borderColor: colorVar('--card') }] },
    options: { maintainAspectRatio: false, cutout: '62%', plugins: { legend: { position: 'right' }, tooltip: tooltipDinero } }
  });
  $('topCategorias').innerHTML = cats.length ? cats.map(([c, v]) =>
    `<li class="item"><div class="emoji">${emojiDe('gasto', c)}</div><div class="info"><b>${esc(c)}</b><small>${Math.round(v / total * 100)}% de tus gastos</small></div><div class="valor privado">${dinero(v)}</div></li>`
  ).join('') : '<li class="vacio">Sin gastos este mes.</li>';

  // 3. Saldo acumulado día a día
  const [y, m] = mesVista.split('-').map(Number);
  const ultimoDia = mesVista === mesDe(hoyISO()) ? Number(hoyISO().slice(8)) : diasEnMes(y, m);
  const porDia = Array(ultimoDia).fill(0);
  movsDelMes(mesVista).forEach(mv => {
    const d = Number(mv.fecha.slice(8));
    if (d <= ultimoDia) porDia[d - 1] += mv.tipo === 'ingreso' ? mv.monto : -mv.monto;
  });
  let acum = 0;
  const saldo = porDia.map(v => acum += v);
  grafica('gSaldo', {
    type: 'line',
    data: {
      labels: saldo.map((_, i) => i + 1),
      datasets: [{
        label: 'Saldo', data: saldo, tension: .3, pointRadius: 0, borderWidth: 3, fill: { target: 'origin', above: 'rgba(22,163,74,.15)', below: 'rgba(220,38,38,.18)' },
        segment: { borderColor: c => c.p1.parsed.y < 0 ? colorVar('--rojo') : colorVar('--verde') }
      }]
    },
    options: { maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { title: c => `Día ${c[0].label}`, label: c => dinero(c.raw) } } }, scales: { y: ejeDinero } }
  });
}

// ---------- Fijos ----------
function pintarFijos() {
  if (!datos.fijos.length) { $('listaFijos').innerHTML = '<div class="card vacio">Todavía no tienes fijos. Empieza por tu salario 💼</div>'; return; }
  const grupo = (tipo, titulo) => {
    const fs = datos.fijos.filter(f => f.tipo === tipo);
    if (!fs.length) return '';
    const total = fs.filter(f => f.activo).reduce((s, f) => s + f.monto, 0);
    return `<div class="dia-titulo"><span>${titulo}</span><span class="privado">${dinero(total)} / mes</span></div>
      <div class="card" style="padding:4px 16px"><ul class="lista">${fs.map(f => `
        <li class="item ${f.activo ? '' : 'fijo-pausado'}" data-fijo="${f.id}">
          <div class="emoji">${emojiDe(f.tipo, f.cat)}</div>
          <div class="info"><b>${esc(f.nombre)}</b><small>Día ${f.dia} de cada mes${f.activo ? '' : ' · en pausa'}</small></div>
          <div class="valor privado ${f.tipo === 'ingreso' ? 'positivo' : ''}">${dinero(f.monto)}</div></li>`).join('')}</ul></div>`;
  };
  const ing = datos.fijos.filter(f => f.activo && f.tipo === 'ingreso').reduce((s, f) => s + f.monto, 0);
  const gas = datos.fijos.filter(f => f.activo && f.tipo === 'gasto').reduce((s, f) => s + f.monto, 0);
  const libre = ing - gas;
  $('listaFijos').innerHTML = `<div class="card"><h3>Lo que te queda libre cada mes</h3>
      <div class="proyeccion privado ${libre < 0 ? 'negativo' : 'positivo'}">${dinero(libre)}</div>
      <p class="sub" style="margin:0">Ingresos fijos menos gastos fijos. Es lo que tienes para el día a día y para ahorrar.</p></div>`
    + grupo('ingreso', 'Ingresos fijos') + grupo('gasto', 'Gastos fijos');
}

// ---------- Ajustes ----------
function pintarAjustes() {
  document.querySelectorAll('#temaChips .chip').forEach(c => c.classList.toggle('activo', c.dataset.tema === datos.ajustes.tema));
  $('ocultarAlAbrir').checked = !!datos.ajustes.ocultar;
  if (!$('pdfDesde').value) {
    $('pdfDesde').value = mesVista + '-01';
    const [y, m] = mesVista.split('-').map(Number);
    $('pdfHasta').value = mesVista === mesDe(hoyISO()) ? hoyISO() : `${mesVista}-${diasEnMes(y, m)}`;
  }
  if (!$('listaPresupuestos').children.length) {
    $('listaPresupuestos').innerHTML = CATS.gasto.map(([c, e]) => `
      <div class="presupuesto-fila"><span>${e} ${c}</span>
      <input type="text" inputmode="numeric" placeholder="Sin límite" data-pres="${c}" value="${datos.presupuestos[c] ? datos.presupuestos[c].toLocaleString('es-CO') : ''}"></div>`).join('');
    $('listaPresupuestos').querySelectorAll('input').forEach(inp => {
      formatearInput(inp);
      inp.addEventListener('change', () => {
        const v = soloDigitos(inp.value);
        if (v) datos.presupuestos[inp.dataset.pres] = v; else delete datos.presupuestos[inp.dataset.pres];
        guardar(); aviso('Presupuesto guardado');
      });
    });
  }
}
function aplicarTema() {
  const t = datos.ajustes.tema;
  if (t === 'claro') document.documentElement.dataset.theme = 'light';
  else if (t === 'oscuro') document.documentElement.dataset.theme = 'dark';
  else delete document.documentElement.dataset.theme;
}

// ---------- Navegación ----------
function irA(v) {
  vista = v;
  document.querySelectorAll('.vista').forEach(s => s.classList.toggle('activa', s.id === 'vista-' + v));
  document.querySelectorAll('.tabbar .tab').forEach(t => t.classList.toggle('activa', t.dataset.ir === v));
  $('fab').style.display = v === 'ajustes' ? 'none' : '';
  window.scrollTo(0, 0);
  pintar();
}

// ---------- Hojas (formularios) ----------
let hojaAbierta = null;
function abrirHoja(id) {
  hojaAbierta = $(id);
  $('fondo').classList.add('visible');
  hojaAbierta.classList.add('visible');
}
function cerrarHoja() {
  if (!hojaAbierta) return;
  hojaAbierta.classList.remove('visible');
  $('fondo').classList.remove('visible');
  hojaAbierta = null;
  document.activeElement && document.activeElement.blur();
}
function pintarCats(contenedor, tipo, seleccion) {
  contenedor.innerHTML = CATS[tipo].map(([c, e]) => `<button type="button" class="cat ${c === seleccion ? 'activo' : ''}" data-cat="${c}"><span>${e}</span>${c}</button>`).join('');
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
function abrirMov(mov) {
  editandoMov = mov || null;
  const tipo = mov ? mov.tipo : 'gasto';
  $('hojaMovTitulo').textContent = mov ? 'Editar movimiento' : 'Nuevo movimiento';
  ponerTipo($('segTipo'), tipo);
  $('movMonto').value = mov ? mov.monto.toLocaleString('es-CO') : '';
  pintarCats($('movCats'), tipo, mov ? mov.cat : null);
  const hoy = hoyISO();
  $('movFecha').value = mov ? mov.fecha : (mesVista === mesDe(hoy) ? hoy : mesVista + '-01');
  $('movNota').value = mov ? (mov.nota || '') : '';
  $('movRepetir').checked = false;
  $('filaRepetir').hidden = !!mov;
  $('movEliminar').hidden = !mov;
  abrirHoja('hojaMov');
  if (!mov) setTimeout(() => $('movMonto').focus(), 260);
}
function guardarMov() {
  const monto = soloDigitos($('movMonto').value);
  const tipo = tipoDe($('segTipo'));
  const cat = catElegida($('movCats'));
  const fecha = $('movFecha').value;
  const nota = $('movNota').value.trim();
  if (!monto) return aviso('Escribe el valor');
  if (!cat) return aviso('Elige una categoría');
  if (!fecha) return aviso('Elige la fecha');
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
    aviso(tipo === 'gasto' ? 'Gasto agregado' : 'Ingreso agregado');
  }
  guardar(); generarFijos();
  mesVista = mesDe(fecha) <= mesDe(hoyISO()) ? mesDe(fecha) : mesVista;
  cerrarHoja(); pintar();
}
function eliminarMov() {
  if (!editandoMov || !confirm('¿Eliminar este movimiento?')) return;
  datos.movs = datos.movs.filter(m => m !== editandoMov);
  guardar(); cerrarHoja(); pintar(); aviso('Eliminado');
}

// Fijo
let editandoFijo = null;
function abrirFijo(f) {
  editandoFijo = f || null;
  const tipo = f ? f.tipo : 'gasto';
  $('hojaFijoTitulo').textContent = f ? 'Editar fijo' : 'Nuevo fijo';
  ponerTipo($('segTipoFijo'), tipo);
  $('fijoNombre').value = f ? f.nombre : '';
  $('fijoMonto').value = f ? f.monto.toLocaleString('es-CO') : '';
  pintarCats($('fijoCats'), tipo, f ? f.cat : null);
  $('fijoDia').value = f ? f.dia : Number(hoyISO().slice(8));
  $('fijoEliminar').hidden = !f;
  $('fijoEliminar').textContent = 'Eliminar';
  abrirHoja('hojaFijo');
}
function guardarFijo() {
  const tipo = tipoDe($('segTipoFijo'));
  const nombre = $('fijoNombre').value.trim();
  const monto = soloDigitos($('fijoMonto').value);
  const cat = catElegida($('fijoCats'));
  const dia = Math.min(31, Math.max(1, parseInt($('fijoDia').value, 10) || 1));
  if (!nombre) return aviso('Ponle un nombre');
  if (!monto) return aviso('Escribe el valor');
  if (!cat) return aviso('Elige una categoría');
  if (editandoFijo) {
    Object.assign(editandoFijo, { tipo, nombre, monto, cat, dia });
    aviso('Fijo actualizado (aplica desde el próximo registro)');
  } else {
    datos.fijos.push({ id: nuevoId(), tipo, nombre, monto, cat, dia, activo: true, desde: mesDe(hoyISO()) });
    aviso(dia <= Number(hoyISO().slice(8)) ? 'Fijo creado y anotado en este mes' : `Se anotará solo el día ${dia}`);
  }
  guardar(); generarFijos(); cerrarHoja(); pintar();
}
function eliminarFijo() {
  if (!editandoFijo) return;
  if (!confirm(`¿Eliminar "${editandoFijo.nombre}"? Los movimientos que ya se anotaron se conservan.`)) return;
  const id = editandoFijo.id;
  datos.fijos = datos.fijos.filter(f => f.id !== id);
  datos.movs.forEach(m => { if (m.fijoId === id) delete m.fijoId; });
  guardar(); cerrarHoja(); pintar(); aviso('Fijo eliminado');
}

// ---------- PDF ----------
async function generarPDF() {
  if (!window.jspdf) return aviso('No se pudo cargar el generador de PDF');
  const desde = $('pdfDesde').value, hasta = $('pdfHasta').value;
  if (!desde || !hasta || desde > hasta) return aviso('Revisa las fechas');
  const lista = datos.movs.filter(m => m.fecha >= desde && m.fecha <= hasta).sort((a, b) => a.fecha.localeCompare(b.fecha));
  const t = totales(lista);
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const W = doc.internal.pageSize.getWidth();
  const verde = [15, 118, 110], rojo = [185, 28, 28];

  doc.setFillColor(...verde); doc.rect(0, 0, W, 90, 'F');
  doc.setTextColor(255); doc.setFont('helvetica', 'bold'); doc.setFontSize(22);
  doc.text('Extracto de movimientos', 40, 45);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(11);
  doc.text(`Del ${fechaCorta(desde)} al ${fechaCorta(hasta)}`, 40, 68);
  doc.text(`Generado el ${fechaCorta(hoyISO())}`, W - 40, 68, { align: 'right' });

  // Resumen
  const cajas = [['Ingresos', t.ing, [22, 163, 74]], ['Gastos', t.gas, rojo], ['Balance', t.bal, t.bal < 0 ? rojo : verde]];
  const anchoCaja = (W - 80 - 20) / 3;
  cajas.forEach(([n, v, c], i) => {
    const x = 40 + i * (anchoCaja + 10);
    doc.setDrawColor(220); doc.setFillColor(248, 250, 251); doc.roundedRect(x, 110, anchoCaja, 60, 8, 8, 'FD');
    doc.setTextColor(100); doc.setFontSize(10); doc.text(n, x + 12, 130);
    doc.setTextColor(...c); doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.text(dinero(v), x + 12, 155);
    doc.setFont('helvetica', 'normal');
  });
  doc.setTextColor(60); doc.setFontSize(11);
  doc.text(t.bal < 0 ? `En este periodo gastaste ${dinero(-t.bal)} más de lo que ingresó (déficit).`
    : `En este periodo te sobraron ${dinero(t.bal)} (superávit).`, 40, 192);

  // Gastos por categoría
  const porCat = {};
  lista.filter(m => m.tipo === 'gasto').forEach(m => porCat[m.cat] = (porCat[m.cat] || 0) + m.monto);
  const filasCat = Object.entries(porCat).sort((a, b) => b[1] - a[1]).map(([c, v]) => [c, dinero(v), t.gas ? Math.round(v / t.gas * 100) + '%' : '']);
  let y = 210;
  if (filasCat.length) {
    doc.autoTable({
      startY: y, head: [['Categoría de gasto', 'Total', '%']], body: filasCat,
      theme: 'grid', headStyles: { fillColor: verde }, styles: { fontSize: 10 },
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } }, margin: { left: 40, right: 40 }
    });
    y = doc.lastAutoTable.finalY + 20;
  }

  // Detalle
  doc.autoTable({
    startY: y,
    head: [['Fecha', 'Tipo', 'Categoría', 'Nota', 'Valor']],
    body: lista.length ? lista.map(m => [fechaCorta(m.fecha), m.tipo === 'ingreso' ? 'Ingreso' : 'Gasto', m.cat, m.nota || '', (m.tipo === 'ingreso' ? '+' : '-') + dinero(m.monto)])
      : [['', '', 'Sin movimientos en este periodo', '', '']],
    theme: 'striped', headStyles: { fillColor: verde }, styles: { fontSize: 9 },
    columnStyles: { 4: { halign: 'right' } }, margin: { left: 40, right: 40 },
    didParseCell: d => { if (d.section === 'body' && d.column.index === 4) d.cell.styles.textColor = String(d.cell.raw).startsWith('+') ? [22, 163, 74] : rojo; }
  });

  const paginas = doc.getNumberOfPages();
  for (let i = 1; i <= paginas; i++) {
    doc.setPage(i); doc.setFontSize(9); doc.setTextColor(150);
    doc.text(`Mis Finanzas · página ${i} de ${paginas}`, W / 2, doc.internal.pageSize.getHeight() - 20, { align: 'center' });
  }

  const nombre = `extracto-${desde}-a-${hasta}.pdf`;
  const blob = doc.output('blob');
  const archivo = new File([blob], nombre, { type: 'application/pdf' });
  if (navigator.canShare && navigator.canShare({ files: [archivo] })) {
    try { await navigator.share({ files: [archivo], title: 'Extracto' }); return; }
    catch (e) { if (e.name === 'AbortError') return; }
  }
  doc.save(nombre);
}

// ---------- Copia de seguridad ----------
async function exportar() {
  const nombre = `mis-finanzas-copia-${hoyISO()}.json`;
  const archivo = new File([JSON.stringify(datos, null, 2)], nombre, { type: 'application/json' });
  if (navigator.canShare && navigator.canShare({ files: [archivo] })) {
    try { await navigator.share({ files: [archivo] }); return; } catch (e) { if (e.name === 'AbortError') return; }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(archivo); a.download = nombre; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
function importar(file) {
  const lector = new FileReader();
  lector.onload = () => {
    try {
      const d = JSON.parse(lector.result);
      if (!Array.isArray(d.movs)) throw new Error('formato');
      if (!confirm(`La copia tiene ${d.movs.length} movimientos. ¿Reemplazar los datos actuales?`)) return;
      datos = Object.assign(estadoVacio(), d);
      guardar(); aplicarTema(); $('listaPresupuestos').innerHTML = ''; pintar(); aviso('Copia restaurada');
    } catch (e) { aviso('Ese archivo no es una copia válida'); }
  };
  lector.readAsText(file);
}

// ---------- Aviso ----------
let tAviso;
function aviso(txt) {
  const a = $('aviso'); a.textContent = txt; a.classList.add('visible');
  clearTimeout(tAviso); tAviso = setTimeout(() => a.classList.remove('visible'), 2200);
}

// ---------- Eventos ----------
function iniciar() {
  aplicarTema();
  if (datos.ajustes.ocultar) document.body.classList.add('oculto');
  generarFijos();

  document.querySelectorAll('[data-ir]').forEach(b => b.addEventListener('click', () => irA(b.dataset.ir)));
  $('mesAnterior').onclick = () => { mesVista = sumarMes(mesVista, -1); pintar(); };
  $('mesSiguiente').onclick = () => { if (mesVista < mesDe(hoyISO())) { mesVista = sumarMes(mesVista, 1); pintar(); } };
  $('btnOjo').onclick = () => document.body.classList.toggle('oculto');

  $('fab').onclick = () => vista === 'fijos' ? abrirFijo() : abrirMov();
  $('fondo').onclick = cerrarHoja;
  document.querySelectorAll('[data-cerrar]').forEach(b => b.onclick = cerrarHoja);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') cerrarHoja(); });

  // Tocar un movimiento lo abre para editar
  document.body.addEventListener('click', e => {
    const li = e.target.closest('.item[data-id]');
    if (li) { const m = datos.movs.find(x => x.id === li.dataset.id); if (m) abrirMov(m); }
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
  $('fijoGuardar').onclick = guardarFijo;
  $('fijoEliminar').onclick = eliminarFijo;
  $('btnNuevoFijo').onclick = () => abrirFijo();

  $('buscar').addEventListener('input', pintarMovimientos);
  $('filtroTipo').addEventListener('click', e => {
    const b = e.target.closest('.chip'); if (!b) return;
    filtroTipo = b.dataset.f;
    $('filtroTipo').querySelectorAll('.chip').forEach(x => x.classList.toggle('activo', x === b));
    pintarMovimientos();
  });

  $('temaChips').addEventListener('click', e => {
    const b = e.target.closest('.chip'); if (!b) return;
    datos.ajustes.tema = b.dataset.tema; guardar(); aplicarTema(); pintar();
  });
  $('ocultarAlAbrir').onchange = e => { datos.ajustes.ocultar = e.target.checked; guardar(); };
  $('btnPdf').onclick = generarPDF;
  $('btnExportar').onclick = exportar;
  $('archivoImportar').onchange = e => { if (e.target.files[0]) importar(e.target.files[0]); e.target.value = ''; };
  $('btnBorrarTodo').onclick = () => {
    if (!confirm('¿Seguro? Se borrarán TODOS tus movimientos y fijos de este celular.')) return;
    if (!confirm('Última confirmación: esto no se puede deshacer.')) return;
    datos = estadoVacio(); guardar(); aplicarTema(); $('listaPresupuestos').innerHTML = ''; pintar(); aviso('Datos borrados');
  };

  // Si la app queda abierta y cambia el día, anotar fijos nuevos
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { generarFijos(); pintar(); } });
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (vista === 'graficas') pintarGraficas(); });

  pintar();

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}
iniciar();
