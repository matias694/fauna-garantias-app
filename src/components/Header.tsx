import React from 'react';
import { useApp } from '../context/AppContext';
import { Menu, Plus } from 'lucide-react';

interface HeaderProps {
  onOpenNewModal: () => void;
  onOpenMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenNewModal, onOpenMobileMenu }) => {
  const { activeView, userRole } = useApp();

  let title = 'Dashboard';
  if (activeView === 'guarantees' || activeView === 'case-detail') title = 'Garantías';
  if (activeView === 'receivables') title = 'Cuentas por cobrar';
  if (activeView === 'settings') title = 'Configuración';

  const subtitle = activeView === 'case-detail'
    ? 'Gestión de salida y liquidación'
    : activeView === 'receivables'
      ? 'Seguimiento de saldos pendientes de arrendatarios'
      : activeView === 'settings'
        ? 'Parámetros de trabajo de la aplicación'
        : 'Gestión diaria de garantías de arriendo';

  const showNewGuarantee = activeView === 'dashboard' || activeView === 'guarantees';

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-3 sm:px-6 py-3.5 sm:py-4 sticky top-0 z-20 shadow-2xs">
      <div className="flex items-center justify-between gap-2 sm:gap-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={onOpenMobileMenu}
            aria-label="Abrir menú"
            className="lg:hidden p-2.5 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl cursor-pointer shrink-0"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight leading-none truncate">{title}</h2>
            <p className="hidden sm:block text-xs text-slate-500 font-medium mt-1.5 truncate">{subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          <div className="hidden sm:flex items-center gap-2.5 px-3 py-2 bg-slate-50 rounded-xl border border-slate-200">
            <div className="w-8 h-8 rounded-lg bg-[#1E382B] text-white flex items-center justify-center font-bold text-xs shadow-2xs">
              FP
            </div>
            <div className="text-left leading-tight">
              <span className="block text-xs font-bold text-slate-800">Fauna</span>
              <span className="block text-[11px] text-slate-500 font-medium">
                {userRole === 'ADMINISTRADOR' ? 'Administrador' : userRole === 'ADMINISTRACION' ? 'Administración' : 'Operaciones'}
              </span>
            </div>
          </div>

          {showNewGuarantee && (
            <button
              onClick={onOpenNewModal}
              aria-label="Nueva garantía"
              className="bg-[#1E382B] hover:bg-[#14261d] text-white p-2.5 sm:px-4 sm:py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Nueva garantía</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
