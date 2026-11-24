import React, { useEffect, useRef, useState } from 'react';
import {
  Undo2, Redo2, RemoveFormatting, Link2, Unlink, Image as ImageIcon, Table, Minus, Omega, Maximize2, Minimize2, Code2,
  Bold, Italic, Underline, Strikethrough, Subscript, Superscript, ListOrdered, List, IndentDecrease, IndentIncrease, Quote,
  AlignLeft, AlignCenter, AlignRight, AlignJustify, Palette
} from 'lucide-react';
import { sanitizeHtml } from './RichText';

// Small rich-text editor for questions, options and solutions (CKEditor-style
// toolbar, no extra packages). Value in / onChange out is HTML. Pasted Word /
// web content is cleaned; images are shrunk in the browser (max 900 px, JPEG)
// and kept inside the question so they never expire like a storage link.
const SYMBOLS = ['±', '×', '÷', '°', 'µ', '≤', '≥', '≠', '≈', '∞', '√', 'π', 'Ω', 'α', 'β', 'γ', 'δ', 'Δ', 'λ', 'σ', '∑', '½', '¼', '¾', '²', '³', '→', '←', '↑', '↓', '•', '©', '®', '™', '₹', '€', '£', '§', '¶', '✓', '✗'];
const FONTS = ['Arial', 'Calibri', 'Georgia', 'Times New Roman', 'Verdana', 'Tahoma', 'Courier New', 'Noto Sans Tamil', 'Latha', 'Nirmala UI'];
const SIZES = [{ v: '2', l: 'Small' }, { v: '3', l: 'Normal' }, { v: '4', l: 'Large' }, { v: '5', l: 'X-Large' }, { v: '6', l: 'Huge' }];
const FORMATS = [{ v: 'p', l: 'Paragraph' }, { v: 'h2', l: 'Heading 1' }, { v: 'h3', l: 'Heading 2' }, { v: 'h4', l: 'Heading 3' }, { v: 'pre', l: 'Formatted' }];
const COLORS = ['#000000', '#475569', '#dc2626', '#ea580c', '#ca8a04', '#16a34a', '#0d9488', '#2563eb', '#7c3aed', '#db2777'];
const MAX_IMAGE_BYTES = 250 * 1024;

const isEmptyHtml = (html) => {
  const s = String(html || '').trim();
  if (!s) return true;
  if (/<img\b|<table\b|<hr\b/i.test(s)) return false;
  return !s.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, '').trim();
};

// Resize + compress an image file to a data URL
export function compressImage(file, maxSide = 900) {
  return new Promise((resolve, reject) => {
    if (!file || !/^image\//.test(file.type)) { reject(new Error('Choose an image file (PNG, JPG, GIF, WEBP).')); return; }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the image.'));
    reader.onload = () => {
      const img = new window.Image();
      img.onerror = () => reject(new Error('Could not open the image.'));
      img.onload = () => {
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        let q = 0.82;
        let url = canvas.toDataURL('image/jpeg', q);
        while (url.length * 0.75 > MAX_IMAGE_BYTES && q > 0.4) { q -= 0.12; url = canvas.toDataURL('image/jpeg', q); }
        if (url.length * 0.75 > MAX_IMAGE_BYTES) { reject(new Error('This image is too large even after shrinking. Crop it and try again.')); return; }
        resolve(url);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function Btn({ title, onClick, active, children }) {
  return (
    <button type="button" title={title} onMouseDown={(e) => e.preventDefault()} onClick={onClick}
      className={`p-1 rounded text-slate-600 hover:bg-slate-200 ${active ? 'bg-slate-200 text-slate-900' : ''}`}>
      {children}
    </button>
  );
}
const Sep = () => <span className="w-px h-4 bg-slate-300 mx-0.5" />;

export default function RichEditor({ value, onChange, minHeight = 110, placeholder = '', fontFamily = '' }) {
  const ref = useRef(null);
  const lastHtml = useRef(null);
  const savedRange = useRef(null);
  const fileRef = useRef(null);
  const [source, setSource] = useState(false);
  const [max, setMax] = useState(false);
  const [popup, setPopup] = useState(''); // symbols | colors
  const [err, setErr] = useState('');

  // Load outside value changes (open another question, Save & add another)
  useEffect(() => {
    if (source || !ref.current) return;
    const v = String(value || '');
    if (v !== lastHtml.current) {
      ref.current.innerHTML = v && !/<[a-z][\s\S]*>/i.test(v) ? v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\n/g, '<br>') : sanitizeHtml(v);
      lastHtml.current = v;
    }
  }, [value, source]);

  const emit = () => {
    const html = ref.current ? ref.current.innerHTML : '';
    const out = isEmptyHtml(html) ? '' : html;
    lastHtml.current = out;
    onChange?.(out);
  };
  const saveSel = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount && ref.current?.contains(sel.anchorNode)) savedRange.current = sel.getRangeAt(0).cloneRange();
  };
  const restoreSel = () => {
    ref.current?.focus();
    const sel = window.getSelection();
    if (savedRange.current && sel) { sel.removeAllRanges(); sel.addRange(savedRange.current); }
  };
  const exec = (cmd, arg = null) => {
    if (source) return;
    ref.current?.focus();
    document.execCommand(cmd, false, arg);
    emit();
  };
  const insertHtml = (html) => { restoreSel(); document.execCommand('insertHTML', false, html); emit(); };

  const addImageFile = async (file) => {
    setErr('');
    try {
      const url = await compressImage(file);
      insertHtml(`<img src="${url}" alt="">`);
    } catch (e) {
      setErr(e.message);
    }
  };
  const onPaste = (e) => {
    const files = [...(e.clipboardData?.files || [])].filter((f) => /^image\//.test(f.type));
    if (files.length) { e.preventDefault(); saveSel(); files.forEach(addImageFile); return; }
    const html = e.clipboardData?.getData('text/html');
    if (html) {
      e.preventDefault();
      // Word adds lots of markup: keep the formatting, drop classes / comments / scripts
      document.execCommand('insertHTML', false, sanitizeHtml(html.replace(/<!--[\s\S]*?-->/g, '')));
      emit();
    }
  };
  const addLink = () => {
    saveSel();
    const url = window.prompt('Link address (https://…)', 'https://');
    if (!url || !/^(https?:|mailto:)/i.test(url.trim())) return;
    restoreSel();
    exec('createLink', url.trim());
  };
  const addTable = () => {
    saveSel();
    const spec = window.prompt('Table size — rows x columns', '3x3');
    const m = String(spec || '').match(/(\d+)\s*[x×*,]\s*(\d+)/i);
    if (!m) return;
    const rows = Math.min(20, Number(m[1]) || 1);
    const cols = Math.min(10, Number(m[2]) || 1);
    const cell = '<td style="border: 1px solid #94a3b8; padding: 4px 8px">&nbsp;</td>';
    insertHtml(`<table style="border-collapse: collapse; width: 100%">${Array.from({ length: rows }, () => `<tr>${cell.repeat(cols)}</tr>`).join('')}</table><p><br></p>`);
  };
  const toggleSource = () => {
    if (source) {
      setSource(false); // effect reloads the edited HTML into the editor
      lastHtml.current = null;
    } else {
      emit();
      setSource(true);
    }
  };

  const wrapCls = max ? 'fixed inset-0 z-[70] bg-white flex flex-col' : 'border border-slate-300 rounded';
  const sel = 'text-[11px] bg-transparent border-l border-slate-300 pl-1 pr-0.5 py-0.5 text-slate-600 focus:outline-none';
  return (
    <div className={wrapCls}>
      <div className="bg-slate-50 border-b border-slate-300 px-1.5 py-1 space-y-1 relative">
        <div className="flex flex-wrap items-center gap-0.5">
          <Btn title="Undo" onClick={() => exec('undo')}><Undo2 className="w-3.5 h-3.5" /></Btn>
          <Btn title="Redo" onClick={() => exec('redo')}><Redo2 className="w-3.5 h-3.5" /></Btn>
          <Sep />
          <Btn title="Remove format" onClick={() => exec('removeFormat')}><RemoveFormatting className="w-3.5 h-3.5" /></Btn>
          <Btn title="Link" onClick={addLink}><Link2 className="w-3.5 h-3.5" /></Btn>
          <Btn title="Remove link" onClick={() => exec('unlink')}><Unlink className="w-3.5 h-3.5" /></Btn>
          <Sep />
          <Btn title="Image (upload, or paste a screenshot)" onClick={() => { saveSel(); fileRef.current?.click(); }}><ImageIcon className="w-3.5 h-3.5" /></Btn>
          <Btn title="Table" onClick={addTable}><Table className="w-3.5 h-3.5" /></Btn>
          <Btn title="Horizontal line" onClick={() => exec('insertHorizontalRule')}><Minus className="w-3.5 h-3.5" /></Btn>
          <Btn title="Special character" active={popup === 'symbols'} onClick={() => { saveSel(); setPopup(popup === 'symbols' ? '' : 'symbols'); }}><Omega className="w-3.5 h-3.5" /></Btn>
          <Btn title="Text colour" active={popup === 'colors'} onClick={() => { saveSel(); setPopup(popup === 'colors' ? '' : 'colors'); }}><Palette className="w-3.5 h-3.5" /></Btn>
          <Sep />
          <Btn title={max ? 'Exit full screen' : 'Full screen'} onClick={() => setMax(!max)}>{max ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}</Btn>
          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={toggleSource}
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] ${source ? 'bg-slate-200 text-slate-900' : 'text-slate-600 hover:bg-slate-200'}`}>
            <Code2 className="w-3.5 h-3.5" />Source
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-0.5">
          <Btn title="Bold" onClick={() => exec('bold')}><Bold className="w-3.5 h-3.5" /></Btn>
          <Btn title="Italic" onClick={() => exec('italic')}><Italic className="w-3.5 h-3.5" /></Btn>
          <Btn title="Underline" onClick={() => exec('underline')}><Underline className="w-3.5 h-3.5" /></Btn>
          <Btn title="Strike" onClick={() => exec('strikeThrough')}><Strikethrough className="w-3.5 h-3.5" /></Btn>
          <Btn title="Subscript" onClick={() => exec('subscript')}><Subscript className="w-3.5 h-3.5" /></Btn>
          <Btn title="Superscript" onClick={() => exec('superscript')}><Superscript className="w-3.5 h-3.5" /></Btn>
          <Sep />
          <Btn title="Numbered list" onClick={() => exec('insertOrderedList')}><ListOrdered className="w-3.5 h-3.5" /></Btn>
          <Btn title="Bulleted list" onClick={() => exec('insertUnorderedList')}><List className="w-3.5 h-3.5" /></Btn>
          <Btn title="Decrease indent" onClick={() => exec('outdent')}><IndentDecrease className="w-3.5 h-3.5" /></Btn>
          <Btn title="Increase indent" onClick={() => exec('indent')}><IndentIncrease className="w-3.5 h-3.5" /></Btn>
          <Btn title="Quote" onClick={() => exec('formatBlock', 'blockquote')}><Quote className="w-3.5 h-3.5" /></Btn>
          <Sep />
          <Btn title="Align left" onClick={() => exec('justifyLeft')}><AlignLeft className="w-3.5 h-3.5" /></Btn>
          <Btn title="Centre" onClick={() => exec('justifyCenter')}><AlignCenter className="w-3.5 h-3.5" /></Btn>
          <Btn title="Align right" onClick={() => exec('justifyRight')}><AlignRight className="w-3.5 h-3.5" /></Btn>
          <Btn title="Justify" onClick={() => exec('justifyFull')}><AlignJustify className="w-3.5 h-3.5" /></Btn>
          <select className={sel} value="" onMouseDown={saveSel} onChange={(e) => { restoreSel(); exec('formatBlock', e.target.value); }}>
            <option value="" disabled>Format</option>
            {FORMATS.map((f) => <option key={f.v} value={f.v}>{f.l}</option>)}
          </select>
          <select className={sel} value="" onMouseDown={saveSel} onChange={(e) => { restoreSel(); exec('fontName', e.target.value); }}>
            <option value="" disabled>Font</option>
            {FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
          <select className={sel} value="" onMouseDown={saveSel} onChange={(e) => { restoreSel(); exec('fontSize', e.target.value); }}>
            <option value="" disabled>Size</option>
            {SIZES.map((f) => <option key={f.v} value={f.v}>{f.l}</option>)}
          </select>
        </div>
        {popup === 'symbols' && (
          <div className="absolute z-20 left-2 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg p-2 grid grid-cols-10 gap-1 w-80">
            {SYMBOLS.map((c) => (
              <button key={c} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { setPopup(''); insertHtml(c); }}
                className="w-7 h-7 rounded border border-slate-200 hover:bg-sky-50 text-sm">{c}</button>
            ))}
          </div>
        )}
        {popup === 'colors' && (
          <div className="absolute z-20 left-24 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg p-2 flex gap-1">
            {COLORS.map((c) => (
              <button key={c} type="button" title={c} onMouseDown={(e) => e.preventDefault()} onClick={() => { setPopup(''); restoreSel(); exec('foreColor', c); }}
                className="w-6 h-6 rounded border border-slate-300" style={{ background: c }} />
            ))}
          </div>
        )}
      </div>
      {source ? (
        <textarea value={value || ''} onChange={(e) => { lastHtml.current = null; onChange?.(e.target.value); }}
          className={`w-full p-3 font-mono text-xs focus:outline-none ${max ? 'flex-1' : ''}`} style={{ minHeight }} />
      ) : (
        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          data-placeholder={placeholder}
          onInput={emit}
          onBlur={() => { saveSel(); emit(); }}
          onKeyUp={saveSel}
          onMouseUp={saveSel}
          onPaste={onPaste}
          className={`tf-rich tf-editor p-3 text-sm text-slate-900 focus:outline-none overflow-auto ${max ? 'flex-1' : ''}`}
          style={{ minHeight, fontFamily: fontFamily || undefined }}
        />
      )}
      {err && <div className="px-3 py-1.5 text-xs text-rose-600 bg-rose-50 border-t border-rose-200">{err}</div>}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) addImageFile(f); }} />
    </div>
  );
}
