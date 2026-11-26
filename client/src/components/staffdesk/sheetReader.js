// Reads an attendance sheet in the browser into a grid of cell strings.
//   .xlsx (Excel / Google Sheets download) — read with the browser's own unzip
//   .csv / .tsv / .txt, or text pasted from Excel / Google Sheets
// Old .xls files are not supported: open them and "Save as" .xlsx or CSV.

const pad = (n) => String(n).padStart(2, '0');

export function parseDelimited(text) {
  const src = String(text || '').replace(/^﻿/, '');
  const firstLine = src.split(/\r?\n/, 1)[0] || '';
  const delim = firstLine.includes('\t') ? '\t' : (firstLine.split(';').length > firstLine.split(',').length ? ';' : ',');
  const rows = [];
  let row = [], cell = '', q = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (q) {
      if (ch === '"' && src[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') q = false;
      else cell += ch;
    } else if (ch === '"' && cell === '') q = true;
    else if (ch === delim) { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

// ---- minimal .xlsx reader ----------------------------------------------------
async function unzip(buf) {
  const dv = new DataView(buf);
  let eocd = -1;
  for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 70000); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error('This is not a valid .xlsx file.');
  const count = dv.getUint16(eocd + 10, true);
  let p = dv.getUint32(eocd + 16, true);
  const dec = new TextDecoder();
  const files = new Map();
  for (let n = 0; n < count; n++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const method = dv.getUint16(p + 10, true), size = dv.getUint32(p + 20, true);
    const nameLen = dv.getUint16(p + 28, true), extraLen = dv.getUint16(p + 30, true), commentLen = dv.getUint16(p + 32, true);
    const local = dv.getUint32(p + 42, true);
    const name = dec.decode(new Uint8Array(buf, p + 46, nameLen));
    files.set(name, { method, size, local });
    p += 46 + nameLen + extraLen + commentLen;
  }
  const read = async (name) => {
    const f = files.get(name);
    if (!f) return null;
    const start = f.local + 30 + dv.getUint16(f.local + 26, true) + dv.getUint16(f.local + 28, true);
    const bytes = new Uint8Array(buf, start, f.size);
    if (f.method === 0) return dec.decode(bytes);
    if (typeof DecompressionStream === 'undefined') throw new Error('This browser cannot open .xlsx files. Use Chrome / Edge, or save the sheet as CSV.');
    const out = await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer();
    return dec.decode(out);
  };
  return { names: [...files.keys()], read };
}

const xml = (s) => new DOMParser().parseFromString(s, 'application/xml');
const colIndex = (ref) => { let n = 0; for (const ch of ref.replace(/\d+/g, '')) n = n * 26 + (ch.charCodeAt(0) - 64); return n - 1; };

// Excel stores dates / times as numbers: 0.375 = 09:00, 46327 = a date
function numberCell(v) {
  const x = Number(v);
  if (!Number.isFinite(x)) return String(v);
  if (x >= 0 && x < 1) { const m = Math.round(x * 1440); return `${pad(Math.floor(m / 60) % 24)}:${pad(m % 60)}`; }
  if (x > 20000 && x < 80000) { const d = new Date(Date.UTC(1899, 11, 30) + Math.floor(x) * 86400000); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`; }
  return String(v);
}

async function readXlsx(buf) {
  const zip = await unzip(buf);
  const wb = xml(await zip.read('xl/workbook.xml') || '<x/>');
  const rels = xml(await zip.read('xl/_rels/workbook.xml.rels') || '<x/>');
  const relTarget = new Map([...rels.getElementsByTagName('Relationship')].map((r) => [r.getAttribute('Id'), r.getAttribute('Target')]));
  const sstXml = await zip.read('xl/sharedStrings.xml');
  const shared = sstXml ? [...xml(sstXml).getElementsByTagName('si')].map((si) => [...si.getElementsByTagName('t')].filter((t) => t.parentNode.nodeName !== 'rPh').map((t) => t.textContent).join('')) : [];
  const sheets = [];
  for (const sh of wb.getElementsByTagName('sheet')) {
    const rid = sh.getAttribute('r:id') || sh.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
    let target = relTarget.get(rid) || '';
    target = target.startsWith('/') ? target.slice(1) : `xl/${target}`;
    const sx = await zip.read(target);
    if (!sx) continue;
    const grid = [];
    for (const row of xml(sx).getElementsByTagName('row')) {
      const r = Number(row.getAttribute('r')) - 1;
      const cells = grid[r] || (grid[r] = []);
      for (const c of row.getElementsByTagName('c')) {
        const i = colIndex(c.getAttribute('r') || '');
        const t = c.getAttribute('t');
        const v = c.getElementsByTagName('v')[0]?.textContent ?? '';
        let val = '';
        if (t === 's') val = shared[Number(v)] ?? '';
        else if (t === 'inlineStr') val = [...c.getElementsByTagName('t')].map((x) => x.textContent).join('');
        else if (t === 'str' || t === 'b' || t === 'e') val = v;
        else if (v !== '') val = numberCell(v);
        cells[i] = val;
      }
    }
    sheets.push({ name: sh.getAttribute('name') || `Sheet ${sheets.length + 1}`, grid: Array.from(grid, (r) => Array.from(r || [], (c) => c ?? '')) });
  }
  if (!sheets.length) throw new Error('No sheets found in this file.');
  return sheets;
}

// File → [{ name, grid }]
export async function readSheetFile(file) {
  const name = file.name.toLowerCase();
  if (name.endsWith('.xls')) throw new Error('Old .xls files are not supported. Open it in Excel and "Save as" .xlsx (or CSV), then upload again.');
  if (name.endsWith('.xlsx') || name.endsWith('.xlsm')) return readXlsx(await file.arrayBuffer());
  return [{ name: file.name, grid: parseDelimited(await file.text()) }];
}

// Trim empty trailing rows / columns so the upload stays small
export function compactGrid(grid) {
  const rows = grid.map((r) => r.map((c) => String(c ?? '')));
  while (rows.length && rows[rows.length - 1].every((c) => !c.trim())) rows.pop();
  const width = rows.reduce((w, r) => { let k = r.length; while (k && !r[k - 1].trim()) k--; return Math.max(w, k); }, 0);
  return rows.map((r) => r.slice(0, width));
}
