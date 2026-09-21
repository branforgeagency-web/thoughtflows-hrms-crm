import React, { useEffect, useState } from 'react';
import { X, Users, Building, ShieldCheck, PhoneCall, GraduationCap, Award, Briefcase, Server, PieChart, HeartHandshake } from 'lucide-react';
import axios from 'axios';

const ICON_MAP = {
  PhoneCall,
  GraduationCap,
  HeartHandshake,
  Award,
  Briefcase,
  Users,
  Server,
  PieChart
};

export default function DepartmentsModal({ isOpen, onClose, theme = 'classic' }) {
  const isClay = theme === 'clay';
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    axios.get('/api/departments')
      .then(res => {
        setDepartments(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.warn('API error, using local data', err);
        setLoading(false);
      });
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-md transition-all animate-fadeIn">
      <div 
        className={`relative w-full max-w-4xl max-h-[88vh] flex flex-col bg-[#073c3b]/95 border border-teal-400/30 overflow-hidden ${
          isClay 
            ? 'rounded-[32px] shadow-[20px_30px_60px_rgba(0,0,0,0.5),inset_2px_2px_4px_rgba(255,255,255,0.2),inset_-3px_-3px_6px_rgba(0,0,0,0.4)]' 
            : 'rounded-2xl shadow-2xl shadow-teal-950/80'
        }`}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-teal-400/20 bg-teal-950/40">
          <div className="flex items-center gap-3">
            <div className={`px-2.5 py-1 rounded-xl shadow-sm border border-white/60 ${isClay ? 'clay-card' : 'bg-white'}`}>
              <img src="/thoughtflows-logo.png" alt="Thoughtflows" className="h-6 w-auto object-contain" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white mt-0.5">Eight Dedicated Departments</h2>
              <p className="text-[11px] text-teal-200/80">Coordinating across 12 branches nationwide</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-teal-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {loading ? (
            <div className="py-16 text-center text-teal-300">Loading departments...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {departments.map((dept) => {
                const IconComponent = ICON_MAP[dept.icon] || Users;
                return (
                  <div
                    key={dept.id || dept.code}
                    className={`p-4 rounded-2xl transition-all duration-200 group flex items-start gap-4 ${
                      isClay
                        ? 'bg-white/[0.07] hover:bg-white/[0.12] border border-white/15 shadow-[inset_1.5px_1.5px_3px_rgba(255,255,255,0.18),inset_-2px_-2px_4px_rgba(0,0,0,0.25),0_6px_16px_rgba(0,0,0,0.18)] hover:-translate-y-1'
                        : 'bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-teal-400/40'
                    }`}
                  >
                    <div 
                      className={`p-3 rounded-2xl bg-teal-900/60 border border-teal-500/30 text-teal-300 group-hover:scale-105 transition-transform ${
                        isClay ? 'clay-squircle' : ''
                      }`}
                      style={{ color: dept.color }}
                    >
                      <IconComponent className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-white group-hover:text-teal-200 transition-colors">
                          {dept.name}
                        </h3>
                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                          isClay
                            ? 'clay-pill bg-teal-500/20 text-teal-200 border-teal-400/30'
                            : 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                        }`}>
                          {dept.code}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1 line-clamp-2">
                        {dept.description}
                      </p>
                      <div className="flex items-center gap-4 mt-3 text-[11px] text-teal-200/80">
                        <span>Lead: <strong className="text-white font-medium">{dept.head}</strong></span>
                        <span>•</span>
                        <span>{dept.memberCount} Team Members</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-teal-500/20 bg-teal-950/40 flex items-center justify-between text-xs text-teal-200/70">
          <span>Synced with HRMS & CRM Engine</span>
          <button
            onClick={onClose}
            className={`px-5 py-2 text-xs font-bold text-white transition-all ${
              isClay
                ? 'clay-btn clay-btn-primary'
                : 'rounded-lg bg-teal-600 hover:bg-teal-500'
            }`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
