import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';

// Grouped, collapsible sidebar menu for the Head / Manager / TL dashboard.
// sections: [{ id, title, items: [{ id, label, icon, count?, alert?, hidden? }] }]
//   count → small grey total;  alert → coloured "needs action" badge (only when > 0)
const STORE_KEY = 'tf_head_nav_collapsed';

export default function HeadSidebarNav({ sections, activeTab, onSelect }) {
  const [collapsed, setCollapsed] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); } catch (_) { return {}; }
  });
  const [q, setQ] = useState('');

  useEffect(() => {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(collapsed)); } catch (_) {}
  }, [collapsed]);

  const visible = useMemo(() => sections
    .map((s) => ({ ...s, items: s.items.filter((i) => !i.hidden) }))
    .filter((s) => s.items.length), [sections]);

  const ql = q.trim().toLowerCase();
  const results = ql ? visible.flatMap((s) => s.items.filter((i) => i.label.toLowerCase().includes(ql) || s.title.toLowerCase().includes(ql))) : null;

  return (
    <div className="flex-1 overflow-y-auto px-3 py-2 text-[13px] scrollbar-thin scrollbar-thumb-slate-800">
      <div className="relative mb-3">
        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5d7d85]" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search menu"
          className="w-full pl-8 pr-7 py-2 rounded-lg bg-[#0b1b24] border border-[#1b3446] text-[12px] text-slate-200 placeholder-[#5d7d85] focus:outline-none focus:border-[#00897b]"
        />
        {q && (
          <button type="button" onClick={() => setQ('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#5d7d85] hover:text-white cursor-pointer" aria-label="Clear search">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {results ? (
        <div className="space-y-0.5">
          {results.length === 0 && <div className="px-3 py-4 text-[12px] text-[#5d7d85]">No menu item matches “{q}”.</div>}
          {results.map((item) => <Item key={item.id} item={item} active={activeTab === item.id} onClick={() => { onSelect(item.id); setQ(''); }} />)}
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((s) => {
            const hasActive = s.items.some((i) => i.id === activeTab);
            const isOpen = hasActive || !collapsed[s.id];
            const pending = s.items.reduce((n, i) => n + (Number(i.alert) > 0 ? Number(i.alert) : 0), 0);
            return (
              <div key={s.id}>
                <button
                  type="button"
                  onClick={() => !hasActive && setCollapsed((c) => ({ ...c, [s.id]: !c[s.id] }))}
                  className={`w-full flex items-center justify-between px-3 py-1 text-[10.5px] font-bold tracking-[0.08em] uppercase ${hasActive ? 'text-[#7fb3ba] cursor-default' : 'text-[#5d7d85] hover:text-[#9fc3c8] cursor-pointer'}`}
                  title={hasActive ? undefined : isOpen ? 'Collapse' : 'Expand'}
                >
                  <span>{s.title}</span>
                  <span className="flex items-center gap-1.5">
                    {!isOpen && pending > 0 && <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-slate-900 text-[10px] font-black flex items-center justify-center normal-case tracking-normal">{pending}</span>}
                    {!hasActive && <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? '' : '-rotate-90'}`} />}
                  </span>
                </button>
                {isOpen && (
                  <div className="mt-1 space-y-0.5">
                    {s.items.map((item) => <Item key={item.id} item={item} active={activeTab === item.id} onClick={() => onSelect(item.id)} />)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Item({ item, active, onClick }) {
  const Icon = item.icon;
  const alert = Number(item.alert) > 0 ? Number(item.alert) : 0;
  const tone = item.alertTone === 'rose' ? 'bg-rose-500 text-white' : 'bg-amber-500 text-slate-900';
  return (
    <button
      type="button"
      onClick={onClick}
      title={item.hint || item.label}
      className={`group w-full flex items-center gap-3 pl-3 pr-2.5 py-2 rounded-lg text-left transition-colors cursor-pointer ${
        active ? 'bg-[#00897b] text-white shadow-sm shadow-[#00897b]/30' : 'text-[#a9c4c9] hover:text-white hover:bg-[#152a36]'
      }`}
    >
      {Icon && <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-white' : 'text-[#6f959c] group-hover:text-[#b9d6da]'}`} />}
      <span className="flex-1 min-w-0 truncate font-medium">{item.label}</span>
      {alert > 0 ? (
        <span className={`min-w-[20px] h-5 px-1.5 rounded-full text-[10.5px] font-black flex items-center justify-center ${active ? 'bg-white text-[#00695c]' : tone}`}>{alert}</span>
      ) : item.count !== undefined && item.count !== null && item.count !== '' ? (
        <span className={`text-[11px] font-semibold tabular-nums ${active ? 'text-white/80' : 'text-[#5d7d85]'}`}>{item.count}</span>
      ) : null}
    </button>
  );
}
