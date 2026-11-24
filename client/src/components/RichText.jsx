import React, { useMemo } from 'react';

// Shows question / option / solution text written in the question editor.
// Old questions are plain text (shown with their line breaks); new ones are
// HTML. HTML is cleaned in the browser with a whitelist before it is shown,
// so nothing executable from a pasted document can run.
const TAGS = new Set(['b', 'strong', 'i', 'em', 'u', 's', 'strike', 'del', 'sub', 'sup', 'p', 'br', 'div', 'span', 'ul', 'ol', 'li',
  'blockquote', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th', 'caption', 'img', 'a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'font', 'hr', 'pre', 'code', 'small', 'big', 'mark', 'center']);
const ATTRS = new Set(['style', 'href', 'src', 'alt', 'title', 'colspan', 'rowspan', 'face', 'size', 'color', 'align', 'width', 'height', 'border', 'cellpadding', 'cellspacing']);
const STYLES = new Set(['color', 'background-color', 'font-family', 'font-size', 'font-weight', 'font-style', 'text-align', 'text-decoration',
  'text-decoration-line', 'width', 'height', 'max-width', 'border', 'border-collapse', 'padding', 'margin-left', 'vertical-align', 'line-height']);

export const looksLikeHtml = (v) => /<\/?[a-z][\s\S]*?>/i.test(String(v || ''));

export function sanitizeHtml(html) {
  if (typeof window === 'undefined' || !window.DOMParser) return '';
  const doc = new window.DOMParser().parseFromString(`<div>${String(html || '')}</div>`, 'text/html');
  const root = doc.body.firstChild;
  const clean = (node) => {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === 8) { child.remove(); return; } // comments
      if (child.nodeType !== 1) return;
      const tag = child.tagName.toLowerCase();
      if (!TAGS.has(tag)) {
        if (['script', 'style', 'iframe', 'object', 'embed', 'noscript', 'template', 'svg', 'math'].includes(tag)) { child.remove(); return; }
        clean(child);
        child.replaceWith(...child.childNodes); // keep the text, drop the tag
        return;
      }
      [...child.attributes].forEach((a) => {
        const name = a.name.toLowerCase();
        if (!ATTRS.has(name)) { child.removeAttribute(a.name); return; }
        if (name === 'href' && !/^(https?:|mailto:|#)/i.test(a.value.trim())) child.removeAttribute(a.name);
        if (name === 'src' && !/^(https:|data:image\/(png|jpe?g|gif|webp);)/i.test(a.value.trim())) child.removeAttribute(a.name);
        if (name === 'style') {
          const kept = a.value.split(';').map((d) => d.trim()).filter((d) => {
            const [prop, ...rest] = d.split(':');
            const val = rest.join(':');
            return prop && STYLES.has(prop.trim().toLowerCase()) && !/url\(|expression|javascript/i.test(val);
          });
          if (kept.length) child.setAttribute('style', kept.join('; '));
          else child.removeAttribute('style');
        }
      });
      if (tag === 'a') { child.setAttribute('target', '_blank'); child.setAttribute('rel', 'noopener noreferrer'); }
      if (tag === 'img') child.setAttribute('style', `${child.getAttribute('style') || ''}; max-width: 100%; height: auto`.replace(/^; /, ''));
      clean(child);
    });
  };
  clean(root);
  return root.innerHTML;
}

// Plain text of a question (search, previews, confirm dialogs)
export function htmlToText(v) {
  const s = String(v || '');
  if (!looksLikeHtml(s)) return s;
  if (typeof window === 'undefined' || !window.DOMParser) return s.replace(/<[^>]+>/g, ' ');
  const doc = new window.DOMParser().parseFromString(s.replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|li)>/gi, '\n'), 'text/html');
  return (doc.body.textContent || '').replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim();
}

export default function RichText({ html, className = '', as: Tag = 'div', style }) {
  const value = String(html || '');
  const isHtml = looksLikeHtml(value);
  const clean = useMemo(() => (isHtml ? sanitizeHtml(value) : ''), [value, isHtml]);
  if (!isHtml) return <Tag className={`whitespace-pre-line ${className}`} style={style}>{value}</Tag>;
  return <Tag className={`tf-rich ${className}`} style={style} dangerouslySetInnerHTML={{ __html: clean }} />;
}
