/* XLSX Lite — generador mínimo de archivos Excel (.xlsx, Office Open XML) para Mis Finanzas.
   Funciona sin internet y sin dependencias: arma el XML y lo empaqueta en un ZIP sin compresión.
   Soporta: varias hojas, estilos predefinidos, fechas reales, formato moneda COP, fórmulas,
   autofiltro, paneles inmovilizados, anchos de columna y celdas combinadas. Licencia MIT. */
(function (global) {
  'use strict';

  // ---------- CRC32 y ZIP (método "store") ----------
  const TABLA = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
    return t;
  })();
  function crc32(bytes) {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < bytes.length; i++) c = TABLA[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }
  const utf8 = s => new TextEncoder().encode(s);
  function zip(archivos) {
    const partes = [], central = [];
    let offset = 0;
    const ahora = new Date();
    const dosTime = (ahora.getHours() << 11) | (ahora.getMinutes() << 5) | (ahora.getSeconds() >> 1);
    const dosDate = ((ahora.getFullYear() - 1980) << 9) | ((ahora.getMonth() + 1) << 5) | ahora.getDate();
    for (const a of archivos) {
      const nombre = utf8(a.nombre), datos = utf8(a.contenido), crc = crc32(datos);
      const loc = new DataView(new ArrayBuffer(30));
      loc.setUint32(0, 0x04034b50, true); loc.setUint16(4, 20, true); loc.setUint16(6, 0x0800, true);
      loc.setUint16(8, 0, true); loc.setUint16(10, dosTime, true); loc.setUint16(12, dosDate, true);
      loc.setUint32(14, crc, true); loc.setUint32(18, datos.length, true); loc.setUint32(22, datos.length, true);
      loc.setUint16(26, nombre.length, true); loc.setUint16(28, 0, true);
      partes.push(new Uint8Array(loc.buffer), nombre, datos);
      const cen = new DataView(new ArrayBuffer(46));
      cen.setUint32(0, 0x02014b50, true); cen.setUint16(4, 20, true); cen.setUint16(6, 20, true); cen.setUint16(8, 0x0800, true);
      cen.setUint16(10, 0, true); cen.setUint16(12, dosTime, true); cen.setUint16(14, dosDate, true);
      cen.setUint32(16, crc, true); cen.setUint32(20, datos.length, true); cen.setUint32(24, datos.length, true);
      cen.setUint16(28, nombre.length, true); cen.setUint16(30, 0, true); cen.setUint16(32, 0, true);
      cen.setUint16(34, 0, true); cen.setUint16(36, 0, true); cen.setUint32(38, 0, true); cen.setUint32(42, offset, true);
      central.push(new Uint8Array(cen.buffer), nombre);
      offset += 30 + nombre.length + datos.length;
    }
    const tamCentral = central.reduce((s, p) => s + p.length, 0);
    const fin = new DataView(new ArrayBuffer(22));
    fin.setUint32(0, 0x06054b50, true); fin.setUint16(8, archivos.length, true); fin.setUint16(10, archivos.length, true);
    fin.setUint32(12, tamCentral, true); fin.setUint32(16, offset, true);
    return new Blob([...partes, ...central, new Uint8Array(fin.buffer)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }

  // ---------- Utilidades ----------
  const escXml = s => String(s).replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]))
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
  function colLetra(n) { let s = ''; n++; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; }
  const ref = (f, c) => colLetra(c) + (f + 1);
  // Fecha ISO (AAAA-MM-DD) → número de serie de Excel
  function serialFecha(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    return (Date.UTC(y, m - 1, d) - Date.UTC(1899, 11, 30)) / 86400000;
  }

  // ---------- Estilos ----------
  // Índices de estilo disponibles para las celdas (propiedad s)
  const E = {
    normal: 0, titulo: 1, subtitulo: 2, encabezado: 3, texto: 4, moneda: 5, fecha: 6, porcentaje: 7,
    totalEtiqueta: 8, totalMoneda: 9, etiqueta: 10, monedaDestacada: 11, entero: 12,
    textoTenue: 13, monedaTenue: 14, fechaTenue: 15, totalEntero: 16, totalPorcentaje: 17, encabezadoDerecha: 18, seccion: 19
  };
  function estilosXml(acento) {
    const a = 'FF' + (acento || '0F766E').replace('#', '').toUpperCase();
    const fmtMoneda = '"$" #,##0;[Red]-"$" #,##0';
    // fuentes: 0 normal, 1 título, 2 gris, 3 encabezado blanco negrita, 4 negrita, 5 gris itálica, 6 sección
    const fuentes = [
      '<font><sz val="11"/><color rgb="FF101820"/><name val="Calibri"/><family val="2"/></font>',
      `<font><b/><sz val="16"/><color rgb="FF101820"/><name val="Calibri"/><family val="2"/></font>`,
      '<font><sz val="10"/><color rgb="FF56616C"/><name val="Calibri"/><family val="2"/></font>',
      '<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/></font>',
      '<font><b/><sz val="11"/><color rgb="FF101820"/><name val="Calibri"/><family val="2"/></font>',
      '<font><i/><sz val="11"/><color rgb="FF8B949D"/><name val="Calibri"/><family val="2"/></font>',
      `<font><b/><sz val="12"/><color rgb="${a}"/><name val="Calibri"/><family val="2"/></font>`
    ];
    const rellenos = [
      '<fill><patternFill patternType="none"/></fill>', '<fill><patternFill patternType="gray125"/></fill>',
      `<fill><patternFill patternType="solid"><fgColor rgb="${a}"/><bgColor indexed="64"/></patternFill></fill>`,
      '<fill><patternFill patternType="solid"><fgColor rgb="FFF2F4F6"/><bgColor indexed="64"/></patternFill></fill>'
    ];
    const bordes = [
      '<border><left/><right/><top/><bottom/><diagonal/></border>',
      '<border><left/><right/><top/><bottom style="thin"><color rgb="FFE3E7EB"/></bottom><diagonal/></border>',
      '<border><left/><right/><top style="thin"><color rgb="FF101820"/></top><bottom style="thin"><color rgb="FF101820"/></bottom><diagonal/></border>'
    ];
    // xf: numFmt, font, fill, border, alineación
    const xf = (n, f, fi, b, al) => `<xf numFmtId="${n}" fontId="${f}" fillId="${fi}" borderId="${b}" xfId="0"${n ? ' applyNumberFormat="1"' : ''}${f ? ' applyFont="1"' : ''}${fi ? ' applyFill="1"' : ''}${b ? ' applyBorder="1"' : ''}${al ? ` applyAlignment="1"><alignment ${al}/></xf>` : '/>'}`;
    const xfs = [
      xf(0, 0, 0, 0),                                   // normal
      xf(0, 1, 0, 0),                                   // titulo
      xf(0, 2, 0, 0),                                   // subtitulo
      xf(0, 3, 2, 0, 'vertical="center" wrapText="1"'), // encabezado
      xf(0, 0, 0, 1),                                   // texto
      xf(164, 0, 0, 1),                                 // moneda
      xf(165, 0, 0, 1, 'horizontal="left"'),            // fecha
      xf(10, 0, 0, 1),                                  // porcentaje
      xf(0, 4, 3, 2),                                   // totalEtiqueta
      xf(164, 4, 3, 2),                                 // totalMoneda
      xf(0, 2, 0, 1),                                   // etiqueta
      xf(164, 4, 0, 1),                                 // monedaDestacada
      xf(3, 0, 0, 1),                                   // entero
      xf(0, 5, 0, 1),                                   // textoTenue
      xf(164, 5, 0, 1),                                 // monedaTenue
      xf(165, 5, 0, 1, 'horizontal="left"'),            // fechaTenue
      xf(3, 4, 3, 2),                                   // totalEntero
      xf(10, 4, 3, 2),                                  // totalPorcentaje
      xf(0, 3, 2, 0, 'horizontal="right" vertical="center" wrapText="1"'), // encabezadoDerecha
      xf(0, 6, 0, 0)                                    // seccion
    ];
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="2"><numFmt numFmtId="164" formatCode="${escXml(fmtMoneda)}"/><numFmt numFmtId="165" formatCode="dd/mm/yyyy"/></numFmts>
<fonts count="${fuentes.length}">${fuentes.join('')}</fonts>
<fills count="${rellenos.length}">${rellenos.join('')}</fills>
<borders count="${bordes.length}">${bordes.join('')}</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="${xfs.length}">${xfs.join('')}</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;
  }

  // ---------- Libro ----------
  /* libro({ acento, hojas: [{ nombre, columnas: [ancho...], filas: [[celda...]], filtro: {fila, desde, hasta, columnas}, congelar: n, combinar: ['A1:F1'] }] })
     celda: null | 'texto' | número | { v, s, t: 'd' (fecha ISO) | 'n' | 's', f: 'FÓRMULA' } */
  function libro(op) {
    const compartidos = [], indice = new Map();
    const sst = s => { s = String(s); if (!indice.has(s)) { indice.set(s, compartidos.length); compartidos.push(s); } return indice.get(s); };
    const nombresUsados = new Set();
    const hojas = op.hojas.map((h, i) => {
      let nombre = String(h.nombre || 'Hoja ' + (i + 1)).replace(/[\\/?*[\]:]/g, ' ').slice(0, 31).trim() || 'Hoja ' + (i + 1);
      while (nombresUsados.has(nombre.toLowerCase())) nombre = nombre.slice(0, 28) + ' ' + (i + 1);
      nombresUsados.add(nombre.toLowerCase());
      return Object.assign({}, h, { nombre });
    });
    const definidos = [];
    const xmlHojas = hojas.map((h, ih) => {
      const filas = h.filas.map((fila, f) => {
        const celdas = (fila || []).map((c, col) => {
          if (c === null || c === undefined || c === '') return '';
          const o = typeof c === 'object' ? c : { v: c };
          const r = ref(f, col), s = o.s !== undefined ? ` s="${o.s}"` : '';
          if (o.f) {
            const v = typeof o.v === 'number' && isFinite(o.v) ? `<v>${o.v}</v>` : '';
            return `<c r="${r}"${s}><f>${escXml(o.f)}</f>${v}</c>`;
          }
          if (o.t === 'd' && typeof o.v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(o.v)) return `<c r="${r}"${s}><v>${serialFecha(o.v)}</v></c>`;
          if (typeof o.v === 'number' && isFinite(o.v)) return `<c r="${r}"${s}><v>${o.v}</v></c>`;
          if (o.v === null || o.v === undefined) return `<c r="${r}"${s}/>`;
          return `<c r="${r}"${s} t="s"><v>${sst(o.v)}</v></c>`;
        }).join('');
        const alto = h.altos && h.altos[f] ? ` ht="${h.altos[f]}" customHeight="1"` : '';
        return `<row r="${f + 1}"${alto}>${celdas}</row>`;
      }).join('');
      const nCols = Math.max(1, ...h.filas.map(x => (x || []).length));
      const cols = (h.columnas || []).map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('');
      const pane = h.congelar ? `<pane ySplit="${h.congelar}" topLeftCell="A${h.congelar + 1}" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A${h.congelar + 1}" sqref="A${h.congelar + 1}"/>` : '';
      let filtro = '';
      if (h.filtro && h.filtro.hasta >= h.filtro.desde) {
        const rango = `${ref(h.filtro.desde, 0)}:${ref(h.filtro.hasta, (h.filtro.columnas || nCols) - 1)}`;
        filtro = `<autoFilter ref="${rango}"/>`;
        const abs = rango.replace(/([A-Z]+)(\d+)/g, '$$$1$$$2');
        definidos.push(`<definedName name="_xlnm._FilterDatabase" localSheetId="${ih}" hidden="1">'${escXml(h.nombre.replace(/'/g, "''"))}'!${abs}</definedName>`);
      }
      const comb = h.combinar && h.combinar.length ? `<mergeCells count="${h.combinar.length}">${h.combinar.map(m => `<mergeCell ref="${m}"/>`).join('')}</mergeCells>` : '';
      return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheetViews><sheetView workbookViewId="0" showGridLines="0"${ih === 0 ? ' tabSelected="1"' : ''}>${pane}</sheetView></sheetViews>
<sheetFormatPr defaultRowHeight="16"/>${cols ? `<cols>${cols}</cols>` : ''}
<sheetData>${filas}</sheetData>${filtro}${comb}
<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/>
<pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0"/>
</worksheet>`;
    });

    const archivos = [
      { nombre: '[Content_Types].xml', contenido: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
${hojas.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('\n')}
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>
<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>` },
      { nombre: '_rels/.rels', contenido: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>` },
      { nombre: 'docProps/core.xml', contenido: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
<dc:title>${escXml(op.titulo || 'Reporte')}</dc:title><dc:creator>Mis Finanzas</dc:creator>
<dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString().replace(/\.\d+Z$/, 'Z')}</dcterms:created>
</cp:coreProperties>` },
      { nombre: 'docProps/app.xml', contenido: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>Mis Finanzas</Application></Properties>` },
      { nombre: 'xl/workbook.xml', contenido: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<bookViews><workbookView activeTab="0"/></bookViews>
<sheets>${hojas.map((h, i) => `<sheet name="${escXml(h.nombre)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets>
${definidos.length ? `<definedNames>${definidos.join('')}</definedNames>` : ''}
<calcPr calcId="191029" fullCalcOnLoad="1"/>
</workbook>` },
      { nombre: 'xl/_rels/workbook.xml.rels', contenido: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${hojas.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('\n')}
<Relationship Id="rId${hojas.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
<Relationship Id="rId${hojas.length + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>
</Relationships>` },
      { nombre: 'xl/styles.xml', contenido: estilosXml(op.acento) },
      ...xmlHojas.map((x, i) => ({ nombre: `xl/worksheets/sheet${i + 1}.xml`, contenido: x }))
    ];
    archivos.push({ nombre: 'xl/sharedStrings.xml', contenido: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${compartidos.length}" uniqueCount="${compartidos.length}">${compartidos.map(s => `<si><t xml:space="preserve">${escXml(s)}</t></si>`).join('')}</sst>` });
    return zip(archivos);
  }

  global.XLSXLite = { libro, estilos: E, ref, colLetra, serialFecha };
})(window);
