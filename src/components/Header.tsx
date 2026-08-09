import React from 'react';
import { useApp } from '../context/AppContext';
import { Plus, MapPin, Search, Bell, User, Sparkles } from 'lucide-react';

interface HeaderProps {
  onOpenNewModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenNewModal }) => {
  const { activeView, selectedCaseId, userRole } = useApp();

  let title = 'Dashboard';
  if (activeView === 'guarantees') title = 'Gestión de Garantías';
  if (activeView === 'receivables') title = 'Cuentas Por Cobrar';
  if (activeView === 'settings') title = 'Configuración del Sistema';
  if (activeView === 'case-detail') title = `Ficha de Caso (${selectedCaseId || ''})`;

  return (
    <header className="bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-6 py-3.5 sticky top-0 z-20 shadow-2xs">
      <div className="flex items-center justify-between gap-4 max-w-7xl mx-auto">
        
        {/* Left Title & Location Indicator */}
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight leading-none">{title}</h2>
            <p className="text-[11px] text-slate-500 font-medium mt-1">
              Garantías, reparaciones y finiquitos de arriendo
            </p>
          </div>

          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-slate-100/80 rounded-2xl text-xs text-slate-600 font-medium border border-slate-200/60">
            <MapPin className="w-3.5 h-3.5 text-[#1E382B]" />
            <span>Santiago, Chile</span>
          </div>
        </div>

        {/* Center Search Pill */}
        <div className="hidden md:flex flex-1 max-w-md items-center bg-slate-100/90 hover:bg-slate-100 transition-colors rounded-2xl px-3.5 py-2 border border-slate-200/60 text-xs text-slate-500 focus-within:ring-2 focus-within:ring-[#1E382B]/30 focus-within:bg-white">
          <Search className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" />
          <input
            type="text"
            placeholder="Buscar por propiedad, arrendatario, RUT o ID de caso..."
            className="bg-transparent border-none outline-none w-full text-slate-800 placeholder:text-slate-400 text-xs font-medium"
          />
        </div>

        {/* Right Actions & User Profile */}
        <div className="flex items-center gap-3 shrink-0">
          
          <button className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-2xl transition-colors cursor-pointer relative">
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white"></span>
          </button>

          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 bg-slate-100/80 rounded-2xl border border-slate-200/60">
            <div className="w-7 h-7 rounded-xl bg-[#1E382B] text-white flex items-center justify-center font-bold text-xs shadow-2xs">
              FP
            </div>
            <div className="text-left leading-tight pr-1">
              <span className="block text-xs font-bold text-slate-800">Fauna Admin</span>
              <span className="block text-[10px] text-slate-500 font-medium">{userRole}</span>
            </div>
          </div>

          <button
            onClick={onOpenNewModal}
            className="bg-[#1E382B] hover:bg-[#14261d] text-white px-4 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-2 shadow-sm transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>Nueva Garantía</span>
          </button>

        </div>

      </div>
    </header>
  );
};
