import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';

/**
 * SearchableSelect
 * 
 * Props:
 * - value: string (currently selected value)
 * - onChange: (val: string) => void
 * - placeholder: string
 * - groups: Array<{ group: string, title: string, options: string[] }>
 * - options: string[] (if flat list without groups)
 * - disabled: boolean
 * - className: string
 */
export default function SearchableSelect({
  value,
  onChange,
  placeholder = '— Select option —',
  searchPlaceholder = 'Type to search...',
  groups = null,
  options = null,
  allowCustom = false,
  disabled = false,
  className = ''
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Focus search input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearch('');
    }
  }, [isOpen]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Filtered groups / options
  const q = search.trim().toLowerCase();

  const filteredGroups = useMemo(() => {
    if (!groups) return null;
    if (!q) return groups;
    return groups
      .map((grp) => ({
        ...grp,
        options: grp.options.filter((opt) => opt.toLowerCase().includes(q))
      }))
      .filter((grp) => grp.options.length > 0);
  }, [groups, q]);

  const filteredOptions = useMemo(() => {
    if (!options) return null;
    if (!q) return options;
    return options.filter((opt) => opt.toLowerCase().includes(q));
  }, [options, q]);

  const totalResults = useMemo(() => {
    if (filteredGroups) {
      return filteredGroups.reduce((acc, g) => acc + g.options.length, 0);
    }
    if (filteredOptions) {
      return filteredOptions.length;
    }
    return 0;
  }, [filteredGroups, filteredOptions]);

  const handleSelect = (val) => {
    onChange?.(val);
    setIsOpen(false);
    setSearch('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange?.('');
  };

  return (
    <div className={`relative ${isOpen ? 'z-40' : 'z-10'}`} ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full bg-slate-50/70 hover:bg-slate-50 focus:bg-white border text-left rounded-xl px-3.5 py-2.5 text-xs sm:text-sm outline-none transition-all font-sans cursor-pointer flex items-center justify-between gap-2 ${
          isOpen ? 'border-[#0e6977] ring-2 ring-[#0e6977]/15 bg-white' : 'border-slate-200'
        } ${disabled ? 'opacity-60 cursor-not-allowed' : ''} ${className}`}
      >
        <span className={`truncate ${value ? 'text-slate-900 font-medium' : 'text-slate-400'}`}>
          {value || placeholder}
        </span>
        <div className="flex items-center gap-1.5 flex-shrink-0 text-slate-400">
          {value && !disabled && (
            <span
              onClick={handleClear}
              title="Clear selection"
              className="hover:text-slate-700 hover:bg-slate-200/60 p-0.5 rounded cursor-pointer transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180 text-[#0e6977]' : ''}`} />
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-72 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
          {/* Search Box Header */}
          <div className="p-2 border-b border-slate-100 bg-slate-50/90 flex items-center gap-2 sticky top-0 z-10">
            <Search className="w-4 h-4 text-slate-400 ml-1 flex-shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-[#0e6977] focus:ring-1 focus:ring-[#0e6977]/20 transition-all font-sans"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Results List */}
          <div className="overflow-y-auto p-1.5 space-y-1 divide-y divide-slate-100/60">
            {allowCustom && search.trim() && (
              <div className="pb-1.5">
                <button
                  type="button"
                  onClick={() => handleSelect(search.trim())}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span className="truncate">+ Use custom: "{search.trim()}"</span>
                  <span className="text-[10px] font-mono text-teal-600 bg-white/80 px-1.5 py-0.5 rounded border border-teal-200">Custom</span>
                </button>
              </div>
            )}
            {totalResults === 0 ? (
              <div className="p-5 text-center text-xs text-slate-400">
                No standard options found for <strong className="text-slate-600 font-semibold">"{search}"</strong>
              </div>
            ) : filteredGroups ? (
              filteredGroups.map((grp) => (
                <div key={grp.group} className="pt-1.5 first:pt-0">
                  <div className="px-2.5 py-1 text-[10px] font-mono font-bold tracking-wider text-slate-400 uppercase">
                    {grp.title} ({grp.options.length})
                  </div>
                  <div className="space-y-0.5">
                    {grp.options.map((opt) => {
                      const isSelected = value === opt;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => handleSelect(opt)}
                          className={`w-full text-left px-3 py-2 rounded-lg text-xs sm:text-sm flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-teal-50 text-[#0e6977] font-semibold'
                              : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                          }`}
                        >
                          <span className="truncate">{opt}</span>
                          {isSelected && <Check className="w-4 h-4 text-[#0e6977] flex-shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            ) : (
              filteredOptions?.map((opt) => {
                const isSelected = value === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => handleSelect(opt)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs sm:text-sm flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-teal-50 text-[#0e6977] font-semibold'
                        : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <span className="truncate">{opt}</span>
                    {isSelected && <Check className="w-4 h-4 text-[#0e6977] flex-shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
