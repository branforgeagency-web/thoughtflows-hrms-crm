import React, { useEffect, useMemo, useRef, useState } from 'react';
import { parse as parsePptx } from 'pptxtojson';
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Download,
  Lock,
  PanelLeft,
  FileText,
  StickyNote,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { fetchTrainingMaterialBuffer, trainingMaterialFileUrl } from '../services/api';
import { getStorageFileUrl } from '../services/amplifyStorage';

// Files at or under this size are downloaded whole and rendered locally (PPTX
// slide parsing needs the bytes in memory). Anything larger is streamed from
// the S3 bucket instead, so a 200 MB deck or class video never has to be pulled
// into a single ArrayBuffer in the browser.
const STREAM_MIN_BYTES = 12 * 1024 * 1024;
const VIDEO_EXTS = new Set(['mp4', 'mov', 'webm', 'mkv', 'm4v']);
const AUDIO_EXTS = new Set(['mp3', 'm4a', 'wav', 'aac', 'ogg', 'opus']);
const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif']);

// Best available direct link to the stored object. The presigned URL saved on
// the material row has a fixed lifetime, so re-sign from the S3 key when we can
// and only fall back to the saved URL / the API redirect.
async function resolveDirectUrl(material) {
  if (material?.storageKey) {
    try {
      const fresh = await getStorageFileUrl(material.storageKey, { expiresIn: 3600 });
      if (fresh) return fresh;
    } catch (err) {
      console.warn('Could not re-sign S3 URL, falling back to stored link:', err);
    }
  }
  if (material?.storageUrl) return material.storageUrl;
  if (material?._id) return trainingMaterialFileUrl(material._id);
  return '';
}

// Convert pptxtojson Fill object into CSS background properties
function fillToCss(fill) {
  if (!fill) return {};
  if (fill.type === 'color' && fill.value) {
    return { backgroundColor: fill.value };
  }
  if (fill.type === 'gradient' && fill.value?.colors?.length) {
    const stops = fill.value.colors
      .map((c) => `${c.color}${c.pos !== undefined ? ` ${c.pos}` : ''}`)
      .join(', ');
    const deg = typeof fill.value.rot === 'number' ? `${fill.value.rot}deg` : '180deg';
    if (fill.value.path === 'circle') {
      return { backgroundImage: `radial-gradient(circle, ${stops})` };
    }
    return { backgroundImage: `linear-gradient(${deg}, ${stops})` };
  }
  if (fill.type === 'image' && (fill.value?.blob || fill.value?.base64)) {
    return {
      backgroundImage: `url("${fill.value.blob || fill.value.base64}")`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      opacity: typeof fill.value.opacity === 'number' ? fill.value.opacity : 1
    };
  }
  if (fill.type === 'pattern' && fill.value) {
    return { backgroundColor: fill.value.backgroundColor || fill.value.foregroundColor || 'transparent' };
  }
  return {};
}

// Strip unsafe tags/handlers and disable outbound links in view-only slide HTML
function sanitizeSlideHtml(html = '') {
  if (!html) return '';
  return String(html)
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript:/gi, '');
}

// Best-effort readable text extraction from legacy binary .ppt (OLE2) files
function extractLegacyPptText(buffer) {
  try {
    const bytes = new Uint8Array(buffer);
    const chunks = [];
    // Scan UTF-16LE runs (PowerPoint 97-2003 stores most slide text as UTF-16LE TextCharsAtom)
    let current = [];
    for (let i = 0; i + 1 < bytes.length; i += 2) {
      const code = bytes[i] | (bytes[i + 1] << 8);
      if ((code >= 32 && code <= 126) || code === 10 || code === 13 || code === 9) {
        current.push(String.fromCharCode(code));
      } else {
        if (current.length >= 6) {
          const text = current.join('').replace(/\s+/g, ' ').trim();
          if (/[a-zA-Z]{3,}/.test(text)) chunks.push(text);
        }
        current = [];
      }
    }
    if (current.length >= 6) {
      const text = current.join('').replace(/\s+/g, ' ').trim();
      if (/[a-zA-Z]{3,}/.test(text)) chunks.push(text);
    }
    // Also scan ASCII runs (TextBytesAtom) if UTF-16LE yielded very little
    if (chunks.length < 3) {
      let ascii = [];
      for (let i = 0; i < bytes.length; i++) {
        const b = bytes[i];
        if ((b >= 32 && b <= 126) || b === 10 || b === 13) {
          ascii.push(String.fromCharCode(b));
        } else {
          if (ascii.length >= 8) {
            const text = ascii.join('').replace(/\s+/g, ' ').trim();
            if (/[a-zA-Z]{4,}/.test(text) && !/^(Root Entry|PowerPoint Document|SummaryInformation|Current User)$/i.test(text)) {
              chunks.push(text);
            }
          }
          ascii = [];
        }
      }
    }
    // Deduplicate adjacent identical strings
    return Array.from(new Set(chunks)).slice(0, 120);
  } catch (_) {
    return [];
  }
}

function SlideElement({ el }) {
  if (!el) return null;

  const transformParts = [];
  if (el.rotate) transformParts.push(`rotate(${el.rotate}deg)`);
  if (el.isFlipH) transformParts.push('scaleX(-1)');
  if (el.isFlipV) transformParts.push('scaleY(-1)');
  const transform = transformParts.length ? transformParts.join(' ') : undefined;

  const baseStyle = {
    position: 'absolute',
    left: `${el.left || 0}pt`,
    top: `${el.top || 0}pt`,
    width: `${el.width || 0}pt`,
    height: `${el.height || 0}pt`,
    transform,
    transformOrigin: 'center center',
    boxSizing: 'border-box'
  };

  if (el.type === 'group' || el.type === 'diagram') {
    const children = [...(el.elements || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
    return (
      <div style={baseStyle}>
        {children.map((child, idx) => (
          <SlideElement key={child.id || idx} el={child} />
        ))}
      </div>
    );
  }

  if (el.type === 'image') {
    const src = el.base64 || el.blob || '';
    if (!src) return null;
    const borderStyle = el.borderWidth
      ? `${el.borderWidth}pt ${el.borderType || 'solid'} ${el.borderColor || '#cbd5e1'}`
      : undefined;
    return (
      <div style={{ ...baseStyle, overflow: 'hidden', border: borderStyle }}>
        <img
          src={src}
          alt=""
          draggable={false}
          className="w-full h-full object-fill pointer-events-none select-none"
        />
      </div>
    );
  }

  if (el.type === 'math') {
    return (
      <div style={{ ...baseStyle, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {el.picBase64 ? (
          <img src={el.picBase64} alt={el.text || ''} draggable={false} className="max-w-full max-h-full pointer-events-none" />
        ) : (
          <span className="text-xs font-mono text-slate-800">{el.text || el.latex || ''}</span>
        )}
      </div>
    );
  }

  if (el.type === 'table') {
    const rows = el.data || [];
    const colWidths = el.colWidths || [];
    const totalColW = colWidths.reduce((s, w) => s + (w || 0), 0) || 1;
    return (
      <div style={{ ...baseStyle, overflow: 'hidden' }}>
        <table className="w-full h-full border-collapse table-fixed">
          <tbody>
            {rows.map((row, rIdx) => (
              <tr key={rIdx} style={{ height: el.rowHeights?.[rIdx] ? `${el.rowHeights[rIdx]}pt` : undefined }}>
                {row.map((cell, cIdx) => {
                  if (cell.vMerge === 1 || cell.hMerge === 1) return null;
                  const b = cell.borders || {};
                  const borderCss = (side) =>
                    side && side.borderWidth
                      ? `${side.borderWidth}pt ${side.borderType || 'solid'} ${side.borderColor || '#cbd5e1'}`
                      : '0.5pt solid #cbd5e1';
                  return (
                    <td
                      key={cIdx}
                      rowSpan={cell.rowSpan || 1}
                      colSpan={cell.colSpan || 1}
                      style={{
                        width: colWidths[cIdx] ? `${(colWidths[cIdx] / totalColW) * 100}%` : undefined,
                        backgroundColor: cell.fillColor || 'transparent',
                        color: cell.fontColor || '#0f172a',
                        fontWeight: cell.fontBold ? 700 : 400,
                        verticalAlign: cell.vAlign === 'mid' ? 'middle' : cell.vAlign === 'down' ? 'bottom' : 'top',
                        borderTop: borderCss(b.top),
                        borderBottom: borderCss(b.bottom),
                        borderLeft: borderCss(b.left),
                        borderRight: borderCss(b.right),
                        padding: '3pt 5pt',
                        fontSize: '10pt',
                        lineHeight: 1.25,
                        wordBreak: 'break-word'
                      }}
                      dangerouslySetInnerHTML={{ __html: sanitizeSlideHtml(cell.text || '') }}
                    />
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (el.type === 'chart') {
    const series = Array.isArray(el.data) ? el.data : [];
    return (
      <div
        style={{
          ...baseStyle,
          backgroundColor: 'rgba(248, 250, 252, 0.92)',
          border: '1pt solid #e2e8f0',
          borderRadius: '6pt',
          padding: '8pt',
          overflow: 'hidden'
        }}
      >
        <div className="text-[9pt] font-bold text-slate-600 uppercase tracking-wider mb-1">
          Chart ({el.chartType || 'Data'})
        </div>
        <div className="space-y-1 text-[8.5pt] text-slate-700 overflow-hidden">
          {series.slice(0, 4).map((s, idx) => (
            <div key={idx} className="truncate">
              <span className="font-bold">{s.key || `Series ${idx + 1}`}: </span>
              <span>
                {(s.values || [])
                  .slice(0, 5)
                  .map((v) => `${v.x}: ${v.y}`)
                  .join(' · ')}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 'text' or 'shape'
  const fillStyle = fillToCss(el.fill);
  const borderCss = el.borderWidth
    ? `${el.borderWidth}pt ${el.borderType || 'solid'} ${el.borderColor || '#334155'}`
    : undefined;
  const shadowCss = el.shadow
    ? `${el.shadow.h || 0}pt ${el.shadow.v || 0}pt ${el.shadow.blur || 4}pt ${el.shadow.color || 'rgba(0,0,0,0.2)'}`
    : undefined;
  const inset = el.textInset || { l: 6, t: 4, r: 6, b: 4 };
  const vJustify =
    el.vAlign === 'mid' ? 'center' : el.vAlign === 'down' ? 'flex-end' : 'flex-start';

  // Custom SVG shape or connector line
  if (el.type === 'shape' && el.path) {
    const vb = el.pathViewBox || { x: 0, y: 0, width: el.width || 100, height: el.height || 100 };
    const svgFill = el.strokeOnly
      ? 'none'
      : el.fill?.type === 'color' && el.fill?.value
        ? el.fill.value
        : 'none';
    const svgStroke = el.borderColor || (el.strokeOnly ? '#334155' : 'none');
    const svgStrokeWidth = el.borderWidth || (el.strokeOnly ? 1.5 : 0);

    return (
      <div style={baseStyle}>
        <svg
          viewBox={`${vb.x || 0} ${vb.y || 0} ${vb.width || 100} ${vb.height || 100}`}
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full overflow-visible pointer-events-none"
        >
          <path
            d={el.path}
            fill={svgFill}
            stroke={svgStroke}
            strokeWidth={svgStrokeWidth}
            strokeDasharray={el.borderStrokeDasharray || undefined}
          />
        </svg>
        {el.content && (
          <div
            className="relative w-full h-full flex flex-col overflow-hidden"
            style={{
              justifyContent: vJustify,
              padding: `${inset.t || 4}pt ${inset.r || 6}pt ${inset.b || 4}pt ${inset.l || 6}pt`,
              wordBreak: 'break-word'
            }}
            dangerouslySetInnerHTML={{ __html: sanitizeSlideHtml(el.content) }}
          />
        )}
      </div>
    );
  }

  const radius =
    el.shapType === 'ellipse'
      ? '50%'
      : el.shapType === 'roundRect'
        ? '8pt'
        : undefined;

  return (
    <div
      style={{
        ...baseStyle,
        ...fillStyle,
        border: borderCss,
        boxShadow: shadowCss,
        borderRadius: radius,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: vJustify,
        padding: `${inset.t || 4}pt ${inset.r || 6}pt ${inset.b || 4}pt ${inset.l || 6}pt`,
        overflow: 'hidden',
        wordBreak: 'break-word',
        writingMode: el.isVertical ? 'vertical-rl' : undefined
      }}
    >
      {el.content && (
        <div
          className="pptx-text-content w-full"
          dangerouslySetInnerHTML={{ __html: sanitizeSlideHtml(el.content) }}
        />
      )}
    </div>
  );
}

function SlideCanvas({ slide, size, scale = 1 }) {
  const widthPt = size?.width || 960;
  const heightPt = size?.height || 540;
  const bgCss = fillToCss(slide?.fill);

  const allElements = useMemo(() => {
    const layout = (slide?.layoutElements || []).map((e, i) => ({ ...e, _z: i }));
    const main = (slide?.elements || []).map((e, i) => ({ ...e, _z: 1000 + i }));
    return [...layout, ...main].sort((a, b) => (a.order ?? a._z) - (b.order ?? b._z));
  }, [slide]);

  return (
    <div
      style={{
        width: `calc(${widthPt}pt * ${scale})`,
        height: `calc(${heightPt}pt * ${scale})`,
        position: 'relative',
        flexShrink: 0
      }}
    >
      <div
        className="select-none shadow-2xl overflow-hidden bg-white"
        style={{
          width: `${widthPt}pt`,
          height: `${heightPt}pt`,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          position: 'relative',
          ...bgCss
        }}
      >
        {allElements.map((el, idx) => (
          <SlideElement key={el.id || idx} el={el} />
        ))}
      </div>
    </div>
  );
}

export default function LmsMaterialViewer({ material, canDownload = false, onClose }) {
  const [loading, setLoading] = useState(true);
  const [loadingText, setLoadingText] = useState('Loading presentation in LMS viewer…');
  const [error, setError] = useState('');
  const [viewerMode, setViewerMode] = useState(''); // 'pptx' | 'legacy_ppt' | 'pdf' | 'image' | 'unsupported'
  const [deck, setDeck] = useState(null); // { slides, size }
  const [legacyLines, setLegacyLines] = useState([]);
  const [blobUrl, setBlobUrl] = useState('');
  const [slideIndex, setSlideIndex] = useState(0);
  const [zoomFactor, setZoomFactor] = useState(1);
  const [showThumbs, setShowThumbs] = useState(true);
  const [showNotes, setShowNotes] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [stageSize, setStageSize] = useState({ width: 800, height: 500 });

  const containerRef = useRef(null);
  const stageRef = useRef(null);

  const ext = String(material?.fileName || '').split('.').pop()?.toLowerCase() || '';
  const mime = String(material?.mimeType || '').toLowerCase();

  // Load material bytes via authenticated API request
  useEffect(() => {
    if (!material?._id) return undefined;
    let cancelled = false;
    let createdUrl = '';

    setLoading(true);
    setError('');
    setDeck(null);
    setLegacyLines([]);
    setBlobUrl('');
    setSlideIndex(0);
    setZoomFactor(1);

    (async () => {
      try {
        const sizeBytes = Number(material?.fileSize) || 0;
        const isVideo = VIDEO_EXTS.has(ext) || mime.startsWith('video/');
        const isAudio = AUDIO_EXTS.has(ext) || mime.startsWith('audio/');
        const isPdf = ext === 'pdf' || mime === 'application/pdf';
        const isImg = mime.startsWith('image/') || IMAGE_EXTS.has(ext);

        // Video & Audio: always stream directly from storage
        if (isVideo || isAudio) {
          const direct = await resolveDirectUrl(material);
          if (cancelled) return;
          if (!direct) {
            setError('This media file has no accessible storage link.');
            return;
          }
          setBlobUrl(direct);
          if (isVideo) setViewerMode('video');
          else setViewerMode('audio');
          return;
        }

        // PDF & Images: stream directly when large
        if ((isPdf || isImg) && sizeBytes > STREAM_MIN_BYTES) {
          const direct = await resolveDirectUrl(material);
          if (cancelled) return;
          if (!direct) {
            setError('This file has no accessible storage link.');
            return;
          }
          setBlobUrl(direct);
          if (isPdf) setViewerMode('pdf');
          else setViewerMode('image');
          return;
        }

        // Presentations (PPTX, PPT) & other inline materials: fetch bytes and parse
        let buffer;
        const direct = await resolveDirectUrl(material);
        if (cancelled) return;

        if (direct && (direct.startsWith('http://') || direct.startsWith('https://')) && !direct.includes('/api/')) {
          setLoadingText(
            sizeBytes > 10 * 1024 * 1024
              ? `Downloading presentation (${(sizeBytes / (1024 * 1024)).toFixed(1)} MB)…`
              : 'Loading presentation…'
          );
          const res = await fetch(direct);
          if (!res.ok) throw new Error(`Storage returned ${res.status}: ${res.statusText}`);

          const total = Number(res.headers.get('content-length')) || sizeBytes;
          const reader = res.body?.getReader();
          if (reader && total > 0) {
            const chunks = [];
            let loaded = 0;
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              if (cancelled) return;
              chunks.push(value);
              loaded += value.length;
              const pct = Math.round((loaded / total) * 100);
              const mbLoaded = (loaded / (1024 * 1024)).toFixed(1);
              const mbTotal = (total / (1024 * 1024)).toFixed(1);
              setLoadingText(`Downloading presentation: ${pct}% (${mbLoaded} of ${mbTotal} MB)…`);
            }
            const allBytes = new Uint8Array(loaded);
            let pos = 0;
            for (const chunk of chunks) {
              allBytes.set(chunk, pos);
              pos += chunk.length;
            }
            buffer = allBytes.buffer;
          } else {
            buffer = await res.arrayBuffer();
          }
        } else {
          setLoadingText('Loading file from server…');
          buffer = await fetchTrainingMaterialBuffer(material._id);
        }

        if (cancelled) return;
        setLoadingText('Rendering presentation slides…');

        const bytes = new Uint8Array(buffer);
        const isZip = bytes.length >= 2 && bytes[0] === 0x50 && bytes[1] === 0x4b; // PK
        const isOle2 = bytes.length >= 4 && bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0;
        const isPdfMagic = bytes.length >= 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;

        if (ext === 'pptx' || (isZip && (ext === 'ppt' || mime.includes('presentation')))) {
          try {
            const parsed = await parsePptx(buffer, {
              imageMode: 'blob',
              videoMode: 'none',
              audioMode: 'none'
            });
            if (cancelled) return;
            if (!parsed?.slides?.length) {
              setError('This presentation has no readable slides.');
            } else {
              setDeck(parsed);
              setViewerMode('pptx');
            }
          } catch (parseErr) {
            console.warn('PPTX visual parse error, falling back to text outline:', parseErr);
            const lines = extractLegacyPptText(buffer);
            if (lines.length > 0) {
              setLegacyLines(lines);
              setViewerMode('legacy_ppt');
            } else {
              throw new Error('Could not parse presentation slides. The file may be password protected or corrupted.');
            }
          }
        } else if (ext === 'ppt' || isOle2) {
          const lines = extractLegacyPptText(buffer);
          setLegacyLines(lines);
          setViewerMode('legacy_ppt');
        } else if (ext === 'pdf' || mime === 'application/pdf' || isPdfMagic) {
          const url = URL.createObjectURL(new Blob([buffer], { type: 'application/pdf' }));
          createdUrl = url;
          setBlobUrl(url);
          setViewerMode('pdf');
        } else if (mime.startsWith('image/') || IMAGE_EXTS.has(ext)) {
          const url = URL.createObjectURL(new Blob([buffer], { type: material.mimeType || 'image/png' }));
          createdUrl = url;
          setBlobUrl(url);
          setViewerMode('image');
        } else {
          setViewerMode('unsupported');
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.response?.data?.error || err?.message || 'Unable to load presentation.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [material?._id, ext, mime]);

  // Track stage container size for responsive PPTX scaling
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return undefined;
    const update = () => {
      setStageSize({ width: el.clientWidth, height: el.clientHeight });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [viewerMode, showThumbs, showNotes, isFullscreen]);

  // Keyboard navigation + save/print block for view-only users
  useEffect(() => {
    const onKeyDown = (e) => {
      if (!canDownload && (e.ctrlKey || e.metaKey) && ['s', 'p'].includes(e.key.toLowerCase())) {
        e.preventDefault();
        return;
      }
      if (viewerMode === 'pptx' && deck?.slides?.length) {
        if (['ArrowRight', 'ArrowDown', 'PageDown'].includes(e.key)) {
          e.preventDefault();
          setSlideIndex((i) => Math.min(deck.slides.length - 1, i + 1));
        } else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(e.key)) {
          e.preventDefault();
          setSlideIndex((i) => Math.max(0, i - 1));
        }
      }
      if (e.key === 'Escape' && !document.fullscreenElement) {
        onClose?.();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [canDownload, viewerMode, deck, onClose]);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement && containerRef.current) {
        await containerRef.current.requestFullscreen();
      } else if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch (_) {}
  };

  // Compute responsive scale in px/pt (1pt = 1.3333px)
  const slideWidthPx = (deck?.size?.width || 960) * (96 / 72);
  const slideHeightPx = (deck?.size?.height || 540) * (96 / 72);
  const availW = Math.max(240, stageSize.width - 48);
  const availH = Math.max(180, stageSize.height - 48);
  const fitScale = Math.min(availW / slideWidthPx, availH / slideHeightPx, 1.5);
  const effectiveScale = Math.max(0.2, fitScale * zoomFactor);

  const currentSlide = deck?.slides?.[slideIndex] || null;
  const totalSlides = deck?.slides?.length || 0;

  return (
    <div
      ref={containerRef}
      onContextMenu={!canDownload ? (e) => e.preventDefault() : undefined}
      className="fixed inset-0 z-[95] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-fadeIn"
    >
      <div className="bg-[#0f172a] rounded-2xl w-full max-w-7xl h-[92vh] shadow-2xl border border-slate-700/80 flex flex-col overflow-hidden text-white">
        {/* Top LMS Viewer Bar */}
        <div className="px-4 py-3 bg-[#09131c] border-b border-slate-800 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-black uppercase tracking-wider shrink-0">
              {material?.fileFormat || ext.toUpperCase() || 'FILE'}
            </span>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-white truncate">{material?.title}</h3>
              <p className="text-[11px] text-slate-400 truncate">
                {[material?.category, material?.uploadedBy ? `Uploaded by ${material.uploadedBy}` : null].filter(Boolean).join(' · ')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {!canDownload && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal-500/15 border border-teal-500/30 text-teal-300 text-[11px] font-semibold">
                <Lock className="w-3 h-3" />
                <span>View-Only · Download Disabled</span>
              </span>
            )}

            {viewerMode === 'pptx' && totalSlides > 0 && (
              <>
                <button
                  type="button"
                  onClick={() => setShowThumbs((v) => !v)}
                  className={`p-2 rounded-xl border text-xs cursor-pointer transition-colors ${showThumbs ? 'bg-teal-600/30 border-teal-500/50 text-teal-200' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'}`}
                  title="Toggle Slide Thumbnails"
                >
                  <PanelLeft className="w-4 h-4" />
                </button>
                <div className="flex items-center bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setZoomFactor((z) => Math.max(0.5, Number((z - 0.15).toFixed(2))))}
                    className="p-2 hover:bg-slate-700 text-slate-300 cursor-pointer"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoomFactor(1)}
                    className="px-2 text-[11px] font-bold text-slate-200 hover:bg-slate-700 cursor-pointer"
                    title="Reset Zoom"
                  >
                    {Math.round(zoomFactor * 100)}%
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoomFactor((z) => Math.min(2, Number((z + 0.15).toFixed(2))))}
                    className="p-2 hover:bg-slate-700 text-slate-300 cursor-pointer"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                </div>
                {currentSlide?.note && (
                  <button
                    type="button"
                    onClick={() => setShowNotes((v) => !v)}
                    className={`px-2.5 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1 cursor-pointer ${showNotes ? 'bg-amber-500/20 border-amber-500/40 text-amber-200' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'}`}
                    title="Toggle Speaker Notes"
                  >
                    <StickyNote className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Notes</span>
                  </button>
                )}
              </>
            )}

            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 cursor-pointer"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen View'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {canDownload && (
              <a
                href={trainingMaterialFileUrl(material._id, true)}
                className="px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-1.5"
                title="Download Material"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Download</span>
              </a>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-rose-600 border border-slate-700 text-slate-200 cursor-pointer transition-colors"
              title="Close Viewer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Viewer Body */}
        <div className="flex-1 min-h-0 flex bg-[#111c2d] relative">
          {loading && (
            <div className="m-auto flex flex-col items-center gap-3 text-slate-300">
              <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
              <p className="text-xs font-semibold">{loadingText || 'Loading presentation in LMS viewer…'}</p>
            </div>
          )}

          {!loading && error && (
            <div className="m-auto max-w-md text-center p-6 rounded-2xl bg-slate-900 border border-rose-500/30 space-y-2">
              <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
              <h4 className="text-sm font-bold text-white">Could not open presentation</h4>
              <p className="text-xs text-slate-400">{error}</p>
            </div>
          )}

          {!loading && !error && viewerMode === 'pptx' && deck && (
            <>
              {/* Slide Thumbnails Rail */}
              {showThumbs && (
                <aside className="hidden md:flex w-52 shrink-0 bg-[#0b1523] border-r border-slate-800 flex-col overflow-y-auto p-3 space-y-2.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
                    Slides ({totalSlides})
                  </div>
                  {deck.slides.map((s, idx) => {
                    const thumbScale = Math.min(168 / slideWidthPx, 100 / slideHeightPx);
                    const active = idx === slideIndex;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSlideIndex(idx)}
                        className={`w-full text-left rounded-xl p-1.5 border transition-all cursor-pointer ${
                          active
                            ? 'bg-teal-500/15 border-teal-400 ring-1 ring-teal-400/50'
                            : 'bg-slate-900/60 border-slate-800 hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-300 mb-1 px-0.5">
                          <span>Slide {idx + 1}</span>
                        </div>
                        <div className="overflow-hidden rounded-lg border border-slate-700/70 bg-white flex items-center justify-center pointer-events-none">
                          <SlideCanvas slide={s} size={deck.size} scale={thumbScale} />
                        </div>
                      </button>
                    );
                  })}
                </aside>
              )}

              {/* Main Slide Stage */}
              <div className="flex-1 min-w-0 flex flex-col">
                <div
                  ref={stageRef}
                  className="flex-1 min-h-0 overflow-auto flex items-center justify-center p-4 sm:p-6 bg-[#131f33]"
                >
                  {currentSlide && (
                    <div className="rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/10">
                      <SlideCanvas slide={currentSlide} size={deck.size} scale={effectiveScale} />
                    </div>
                  )}
                </div>

                {showNotes && currentSlide?.note && (
                  <div className="px-5 py-3 bg-[#0b1523] border-t border-slate-800 max-h-28 overflow-y-auto">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-amber-300 mb-1">Speaker Notes</div>
                    <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">{currentSlide.note}</p>
                  </div>
                )}

                {/* Slide Controls Footer */}
                <div className="px-4 py-2.5 bg-[#09131c] border-t border-slate-800 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setSlideIndex((i) => Math.max(0, i - 1))}
                    disabled={slideIndex === 0}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Previous</span>
                  </button>

                  <div className="flex items-center gap-3 text-xs font-semibold text-slate-300">
                    <span>
                      Slide <strong className="text-white">{slideIndex + 1}</strong> of <strong className="text-white">{totalSlides}</strong>
                    </span>
                    <div className="hidden sm:flex items-center gap-1 max-w-xs overflow-x-auto">
                      {deck.slides.map((_, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setSlideIndex(i)}
                          className={`h-1.5 rounded-full transition-all cursor-pointer ${i === slideIndex ? 'w-5 bg-teal-400' : 'w-1.5 bg-slate-600 hover:bg-slate-400'}`}
                          title={`Go to slide ${i + 1}`}
                        />
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSlideIndex((i) => Math.min(totalSlides - 1, i + 1))}
                    disabled={slideIndex >= totalSlides - 1}
                    className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-40 text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          )}

          {!loading && !error && viewerMode === 'legacy_ppt' && (
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-3xl mx-auto space-y-4">
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
                  <div>
                    <div className="font-bold text-amber-100">Legacy .PPT format (Text Outline View)</div>
                    <p className="mt-0.5 text-amber-200/80">
                      This file uses the older PowerPoint 97–2003 (.ppt) binary format. Below is the extracted slide text. Ask your Head of Department or Manager to upload as <strong>.pptx</strong> for full visual slide graphics.
                    </p>
                  </div>
                </div>
                {legacyLines.length > 0 ? (
                  <div className="bg-white text-slate-800 rounded-2xl p-6 space-y-3 shadow-xl select-none">
                    {legacyLines.map((line, i) => (
                      <p key={i} className="text-sm leading-relaxed border-b border-slate-100 pb-2 last:border-0">
                        {line}
                      </p>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center text-xs text-slate-400">
                    No extractable text found in this legacy .ppt file. Please upload a .pptx file for visual preview.
                  </div>
                )}
              </div>
            </div>
          )}

          {!loading && !error && viewerMode === 'pdf' && blobUrl && (
            <div className="w-full h-full bg-slate-900 relative">
              <iframe
                title={material?.title || 'PDF Viewer'}
                src={canDownload ? blobUrl : `${blobUrl}#toolbar=0&navpanes=0&scrollbar=1`}
                className="w-full h-full border-0"
              />
            </div>
          )}

          {!loading && !error && viewerMode === 'image' && blobUrl && (
            <div className="w-full h-full overflow-auto flex items-center justify-center p-6 bg-slate-950">
              <img
                src={blobUrl}
                alt={material?.title || 'Material'}
                draggable={false}
                onContextMenu={!canDownload ? (e) => e.preventDefault() : undefined}
                className="max-w-full max-h-full object-contain rounded-xl shadow-2xl select-none"
              />
            </div>
          )}

          {!loading && !error && viewerMode === 'video' && blobUrl && (
            <div className="w-full h-full flex items-center justify-center bg-black p-2 sm:p-4">
              <video
                src={blobUrl}
                controls
                controlsList={canDownload ? undefined : 'nodownload'}
                disablePictureInPicture={!canDownload}
                onContextMenu={!canDownload ? (e) => e.preventDefault() : undefined}
                className="max-w-full max-h-full rounded-xl shadow-2xl"
              >
                <track kind="captions" />
              </video>
            </div>
          )}

          {!loading && !error && viewerMode === 'audio' && blobUrl && (
            <div className="m-auto w-full max-w-xl p-6 rounded-2xl bg-slate-900 border border-slate-700 space-y-4 text-center">
              <h4 className="text-sm font-bold text-white">{material?.title || 'Recording'}</h4>
              <audio
                src={blobUrl}
                controls
                controlsList={canDownload ? undefined : 'nodownload'}
                onContextMenu={!canDownload ? (e) => e.preventDefault() : undefined}
                className="w-full"
              />
            </div>
          )}

          {!loading && !error && viewerMode === 'too_large' && (
            <div className="m-auto max-w-md text-center p-6 rounded-2xl bg-slate-900 border border-slate-700 space-y-3">
              <FileText className="w-10 h-10 text-teal-400 mx-auto" />
              <h4 className="text-sm font-bold text-white">
                Too large for inline preview
                {material?.fileSize
                  ? ` (${(Number(material.fileSize) / (1024 * 1024)).toFixed(1)} MB)`
                  : ''}
              </h4>
              <p className="text-xs text-slate-400">
                {canDownload
                  ? 'This file is stored in the academy S3 bucket. Rendering a .' +
                    ext +
                    ' this size inside the browser is not reliable — use the Download button above to open it in its own application.'
                  : 'This file is stored in the academy S3 bucket, but it is too large to render inside the LMS viewer and downloads are disabled for your role. Ask your Head of Department or Manager to upload a smaller .pptx or .pdf version for in-dashboard viewing.'}
              </p>
            </div>
          )}

          {!loading && !error && viewerMode === 'unsupported' && (
            <div className="m-auto max-w-md text-center p-6 rounded-2xl bg-slate-900 border border-slate-700 space-y-3">
              <FileText className="w-10 h-10 text-teal-400 mx-auto" />
              <h4 className="text-sm font-bold text-white">Preview not supported for .{ext}</h4>
              <p className="text-xs text-slate-400">
                {canDownload
                  ? 'Inline slide preview supports PPTX, PDF, and image files. You can download this file using the button above.'
                  : 'Inline LMS viewing supports PPTX, PDF, and image files. Downloads are disabled for your role — ask your Head of Department or Manager to upload this as a .pptx or .pdf.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
