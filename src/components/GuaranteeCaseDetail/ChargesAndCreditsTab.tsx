import React from 'react';
import { GuaranteeCase } from '../../types';
import { ChargesTab } from './ChargesTab';
import { RepairsTab } from './RepairsTab';
import { ChevronDown, Wrench } from 'lucide-react';

interface ChargesAndCreditsTabProps {
  guaranteeCase: GuaranteeCase;
}

export const ChargesAndCreditsTab: React.FC<ChargesAndCreditsTabProps> = ({ guaranteeCase }) => {
  return (
    <div className="space-y-5">
      <ChargesTab guaranteeCase={guaranteeCase} />

      <details className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden group">
        <summary className="p-4 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50 list-none">
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-slate-500" />
            <div>
              <strong className="text-xs text-slate-800 block">Gestión de reparaciones ({guaranteeCase.repairs.length})</strong>
              <span className="text-[10px] text-slate-400">Proveedor, estado y avance operativo de los trabajos de salida</span>
            </div>
          </div>
          <ChevronDown className="w-4 h-4 text-slate-400 transition-transform group-open:rotate-180" />
        </summary>
        <div className="border-t border-slate-100 p-4 bg-slate-50/40">
          <RepairsTab guaranteeCase={guaranteeCase} />
        </div>
      </details>
    </div>
  );
};
