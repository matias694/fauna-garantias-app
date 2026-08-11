import React from 'react';
import { useApp } from '../context/AppContext';
import { UserRole } from '../types';
import { FaunaIsotipo } from './FaunaBrand';
import {
  LayoutDashboard,
  ShieldCheck,
  Receipt,
  Settings as SettingsIcon,
  ChevronRight,
  UserCheck,
  Building2,
  Sparkles
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { activeView, setActiveView, setSelectedCaseId, userRole, setUserRole, cases, receivables } = useApp();

  const pendingGuarantees = cases.filter(c => !c.isClosed).length;
  const pendingReceivables = receivables.filter(r => r.pendingBalance > 0 && (r.status === 'PENDIENTE' || r.status === 'PAGO_PARCIAL')).length;

  const handleNav = (view: 'dashboard' | 'guarantees' | 'receivables' | 'settings') => {
    setSelectedCaseId(null);
    setActiveView(view);
  };

  return (
    <aside className="w-64 bg-white text-slate-700 flex flex-col justify-between h-screen sticky top-0 border-r border-slate-200/80 shadow-xs select-none z-30">
      <div>
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#1E382B] text-white flex items-center justify-center p-2 shadow-md shadow-[#1E382B]/20 shrink-0">
            <FaunaIsotipo className="w-full h-full text-white" color="#FFFFFF" />
          </div>
          <div>
            <div className="flex items-center gap-1">
              <span className="font-extrabold text-base tracking-tight text-slate-900 leading-none">FAUNA</span>
              <span className="bg-[#1E382B] text-emerald-300 font-bold text-[9px] px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                GARANTÍAS
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium tracking-wider uppercase mt-1">
              Fauna Propiedades SpA
            </p>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="p-3.5 space-y-1.5">
          <button
            onClick={() => handleNav('dashboard')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
              activeView === 'dashboard'
                ? 'bg-[#1E382B] text-white shadow-md shadow-[#1E382B]/20'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <LayoutDashboard className={`w-4 h-4 ${activeView === 'dashboard' ? 'text-emerald-400' : 'text-slate-400'}`} />
              <span>Dashboard</span>
            </div>
            {activeView === 'dashboard' && <ChevronRight className="w-4 h-4 opacity-70" />}
          </button>

          <button
            onClick={() => handleNav('guarantees')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
              activeView === 'guarantees' || activeView === 'case-detail'
                ? 'bg-[#1E382B] text-white shadow-md shadow-[#1E382B]/20'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <ShieldCheck className={`w-4 h-4 ${activeView === 'guarantees' || activeView === 'case-detail' ? 'text-emerald-400' : 'text-slate-400'}`} />
              <span>Garantías</span>
            </div>
            {pendingGuarantees > 0 && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                activeView === 'guarantees' || activeView === 'case-detail'
                  ? 'bg-emerald-800 text-emerald-200'
                  : 'bg-emerald-100 text-emerald-800'
              }`}>
                {pendingGuarantees}
              </span>
            )}
          </button>

          <button
            onClick={() => handleNav('receivables')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
              activeView === 'receivables'
                ? 'bg-[#1E382B] text-white shadow-md shadow-[#1E382B]/20'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <Receipt className={`w-4 h-4 ${activeView === 'receivables' ? 'text-emerald-400' : 'text-slate-400'}`} />
              <span>Por cobrar</span>
            </div>
            {pendingReceivables > 0 && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                activeView === 'receivables' ? 'bg-amber-800 text-amber-200' : 'bg-amber-100 text-amber-800'
              }`}>
                {pendingReceivables}
              </span>
            )}
          </button>

          {userRole === 'ADMINISTRADOR' && (
            <button
              onClick={() => handleNav('settings')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                activeView === 'settings'
                  ? 'bg-[#1E382B] text-white shadow-md shadow-[#1E382B]/20'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <SettingsIcon className={`w-4 h-4 ${activeView === 'settings' ? 'text-emerald-400' : 'text-slate-400'}`} />
                <span>Configuración</span>
              </div>
            </button>
          )}
        </nav>
      </div>

      {/* Footer Role Switcher & System Info Card */}
      <div className="p-4 border-t border-slate-100 space-y-3">
        {/* Soft Plan/Role Card */}
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200/70 p-3.5 rounded-2xl">
          <div className="flex items-center gap-2 text-xs font-bold text-[#1E382B] mb-1.5">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>Sistema Operativo</span>
          </div>
          <p className="text-[11px] text-slate-600 leading-tight mb-2.5">
            Gestión de salidas y liquidación de garantías de arriendo.
          </p>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Rol Activo
            </label>
            <select
              value={userRole}
              onChange={(e) => setUserRole(e.target.value as UserRole)}
              className="w-full bg-white border border-slate-200 text-slate-800 text-xs font-bold rounded-xl p-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer shadow-2xs"
            >
              <option value="ADMINISTRADOR">Administrador</option>
              <option value="ADMINISTRACION">Administración</option>
              <option value="OPERACIONES">Operaciones</option>
            </select>
          </div>
        </div>

        <div className="text-[11px] text-slate-400 font-medium flex justify-between items-center px-1">
          <span>Fauna v1.0</span>
          <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-[10px]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>En línea</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
