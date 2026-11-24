// Reads .xlsx / .csv / .tsv files in the browser without extra packages.
// Returns { rows: string[][] } — first row is usually the header.
// .xlsx is a zip of XML files: we read the zip directory, inflate the parts we
// need with the browser's DecompressionStream and pull cell text out of the
// first worksheet. Fast enough for 20,000+ rows.

const td = new TextDecoder('utf-8');

async function inflateRaw(bytes) {
  if (typeof DecompressionStream === 'undefined') throw new Error('This browser cannot open .xlsx files — save the sheet as CSV and upload that instead.');
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function unzip(buffer, wanted) {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  let eocd = -1;
  for (let i = buffer.byteLength - 22; i >= Math.max(0, buffer.byteLength - 70000); i -= 1) {
    if (view.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('This does not look like an Excel (.xlsx) file.');
  const count = view.getUint16(eocd + 10, true);
  let p = view.getUint32(eocd + 16, true);
  const out = {};
  for (let n = 0; n < count; n += 1) {
    if (view.getUint32(p, true) !== 0x02014b50) break;
    const method = view.getUint16(p + 10, true);
    const compSize = view.getUint32(p + 20, true);
    const nameLen = view.getUint16(p + 28, true);
    const extraLen = view.getUint16(p + 30, true);
    const commentLen = view.getUint16(p + 32, true);
    const localOff = view.getUint32(p + 42, true);
    const name = td.decode(bytes.subarray(p + 46, p + 46 + nameLen));
    p += 46 + nameLen + extraLen + commentLen;
    if (!wanted(name)) continue;
    const lNameLen = view.getUint16(localOff + 26, true);
    const lExtraLen = view.getUint16(localOff + 28, true);
    const start = localOff + 30 + lNameLen + lExtraLen;
    const data = bytes.subarray(start, start + compSize);
    if (method === 0) out[name] = td.decode(data);
    else if (method === 8) out[name] = td.decode(await inflateRaw(data));
  }
  return out;
}

const decodeXml = (s) => s
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
  .replace(/&amp;/g, '&');
const textOf = (xml) => {
  let t = '';
  xml.replace(/<t\b[^>]*>([\s\S]*?)<\/t>/g, (_, x) => { t += x; return ''; });
  return decodeXml(t);
};
const colIndex = (ref) => {
  const letters = String(ref || '').replace(/[^A-Z]/gi, '').toUpperCase();
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
};

async function readXlsx(file) {
  const buffer = await file.arrayBuffer();
  const parts = await unzip(buffer, (n) => n === 'xl/workbook.xml' || n === 'xl/_rels/workbook.xml.rels' || n === 'xl/sharedStrings.xml' || /^xl\/worksheets\/sheet\d+\.xml$/.test(n));
  // first sheet in workbook order
  let sheetPath = '';
  const firstSheet = /<sheet\b[^>]*r:id="([^"]+)"/.exec(parts['xl/workbook.xml'] || '');
  if (firstSheet) {
    const rel = new RegExp(`<Relationship\\b[^>]*Id="${firstSheet[1]}"[^>]*Target="([^"]+)"`).exec(parts['xl/_rels/workbook.xml.rels'] || '')
      || new RegExp(`<Relationship\\b[^>]*Target="([^"]+)"[^>]*Id="${firstSheet[1]}"`).exec(parts['xl/_rels/workbook.xml.rels'] || '');
    if (rel) sheetPath = rel[1].startsWith('/') ? rel[1].slice(1) : `xl/${rel[1].replace(/^\.\//, '')}`;
  }
  const sheetXml = parts[sheetPath] || parts['xl/worksheets/sheet1.xml'] || Object.entries(parts).find(([k]) => /worksheets\/sheet\d+\.xml$/.test(k))?.[1];
  if (!sheetXml) throw new Error('No worksheet found in this Excel file.');
  const shared = [];
  (parts['xl/sharedStrings.xml'] || '').replace(/<si\b[^>]*>([\s\S]*?)<\/si>/g, (_, x) => { shared.push(textOf(x)); return ''; });

  const rows = [];
  const rowRe = /<row\b([^>]*)>([\s\S]*?)<\/row>/g;
  const cellRe = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
  let m;
  while ((m = rowRe.exec(sheetXml))) {
    const row = [];
    let c;
    let auto = 0;
    cellRe.lastIndex = 0;
    while ((c = cellRe.exec(m[2]))) {
      const attrs = c[1] || '';
      const inner = c[2] || '';
      const ref = /\br="([A-Z]+)\d+"/i.exec(attrs);
      const idx = ref ? colIndex(ref[1]) : auto;
      auto = idx + 1;
      const type = (/\bt="([^"]+)"/.exec(attrs) || [])[1] || 'n';
      const v = (/<v>([\s\S]*?)<\/v>/.exec(inner) || [])[1];
      let val = '';
      if (type === 's') val = shared[Number(v)] ?? '';
      else if (type === 'inlineStr') val = textOf(inner);
      else if (type === 'b') val = v === '1' ? 'TRUE' : 'FALSE';
      else val = v != null ? decodeXml(v) : '';
      row[idx] = val;
    }
    for (let i = 0; i < row.length; i += 1) if (row[i] == null) row[i] = '';
    // keep the real sheet row number (r="12") so error reports match Excel
    const rNum = Number((/\br="(\d+)"/.exec(m[1]) || [])[1]) || rows.length + 1;
    while (rows.length < rNum - 1) rows.push([]);
    rows[rNum - 1] = row;
  }
  return rows;
}

export function parseCsv(text) {
  const src = String(text || '').replace(/^﻿/, '');
  const firstLine = src.split(/\r?\n/, 1)[0] || '';
  const delim = [',', '\t', ';'].map((d) => [d, firstLine.split(d).length]).sort((a, b) => b[1] - a[1])[0][0];
  const rows = [];
  let row = [];
  let field = '';
  let inQ = false;
  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];
    if (inQ) {
      if (ch === '"') {
        if (src[i + 1] === '"') { field += '"'; i += 1; } else inQ = false;
      } else field += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === delim) { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i += 1;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += ch;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows; // blank rows kept so row numbers match the sheet (they are skipped later)
}

export async function readSpreadsheet(file) {
  if (/\.xlsx$/i.test(file.name)) return { rows: await readXlsx(file) };
  if (/\.xls$/i.test(file.name)) throw new Error('Old .xls files are not supported — in Excel use File → Save As → Excel Workbook (.xlsx) or CSV.');
  return { rows: parseCsv(await file.text()) };
}
