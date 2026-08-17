import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { SummaryTab } from './SummaryTab';
import { FollowUpTab } from './FollowUpTab';
import { ChargesAndCreditsTab } from './ChargesAndCreditsTab';
import { LiquidationTab } from './LiquidationTab';
import { DocumentsHistoryTab } from './DocumentsHistoryTab';
import { TenantLiquidationDocModal } from '../TenantLiquidationDocModal';
import { OwnerLiquidationDocModal } from '../OwnerLiquidationDocModal';
import { FullCoverageCaseBanner } from '../FullCoverageCaseBanner';
import {
  ArrowLeft,
  LayoutDashboard,
  MessageSquare,
  DollarSign,
  FileCheck,
  FileText
} from 'lucide-react';

interface GuaranteeCaseDetailProps {
  caseId?: string;
}

type CaseTab = 'summary' | 'followUp' | 'financials' | 'liquidation' | 'archive';

export const GuaranteeCaseDetail: React.FC<GuaranteeCaseDetailProps> = ({ caseId: propCaseId }) => {
  const { cases, selectedCaseId, setSelectedCaseId, setActiveView, reopenGuaranteeCase, userRole } = useApp();

  const [activeTab, setActiveTab] = useState<CaseTab>('summary');
  const [isTenantDocOpen, setIsTenantDocOpen] = useState(false);
  const [isOwnerDocOpen, setIsOwnerDocOpen] = useState(false);

  const targetCaseId = propCaseId || selectedCaseId;
  const guaranteeCase = cases.find(c => c.id === targetCaseId);

  if (!guaranteeCase) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-4">
        <h3 className="font-bold text-slate-800">Caso no encontrado</h3>
        <button
          onClick={() => { setSelectedCaseId(null); setActiveView('guarantees'); }}
          className="px-4 py-2 bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer"
        >
          Volver a Casos
        </button>
      </div>
    );
  }

  const tabClass = (tab: CaseTab) => `px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
    activeTab === tab
      ? 'bg-slate-900 text-white shadow-xs'
      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
  }`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setSelectedCaseId(null); setActiveView('guarantees'); }}
            className="p-2 hover:bg-slate-100 rounded-xl text-slate-600 transition-colors cursor-pointer"
            title="Volver a la lista"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono font-black text-slate-900 text-lg">{guaranteeCase.id}</span>
              <span className="text-slate-400 font-light">|</span>
              <h2 className="font-bold text-slate-800 text-base">{guaranteeCase.propertyAddress}, {guaranteeCase.propertyUnit}</h2>

              {guaranteeCase.isClosed && (
                <span className="px-2.5 py-0.5 rounded-md bg-slate-800 text-white font-black text-[10px] uppercase tracking-wide">
                  CERRADO
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Arrendatario: <strong>{guaranteeCase.tenantName}</strong> | Propietario: <strong>{guaranteeCase.ownerName}</strong>
            </p>
          </div>
        </div>

        {guaranteeCase.isClosed && userRole === 'ADMINISTRADOR' && (
          <button
            onClick={() => reopenGuaranteeCase(guaranteeCase.id)}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-all"
          >
            Reabrir caso
          </button>
        )}
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200">
        <button onClick={() => setActiveTab('summary')} className={tabClass('summary')}>
          <LayoutDashboard className="w-4 h-4" />
          <span>Resumen</span>
        </button>

        <button onClick={() => setActiveTab('followUp')} className={tabClass('followUp')}>
          <MessageSquare className="w-4 h-4 text-emerald-500" />
          <span>Seguimiento ({guaranteeCase.followUps?.length || 0})</span>
        </button>

        <button onClick={() => setActiveTab('financials')} className={tabClass('financials')}>
          <DollarSign className="w-4 h-4" />
          <span>Cargos y abonos</span>
        </button>

        <button onClick={() => setActiveTab('liquidation')} className={tabClass('liquidation')}>
          <FileCheck className="w-4 h-4 text-emerald-500" />
          <span>Liquidación</span>
        </button>

        <button onClick={() => setActiveTab('archive')} className={tabClass('archive')}>
          <FileText className="w-4 h-4" />
          <span>Documentos e historial</span>
        </button>
      </div>

      {activeTab === 'summary' && <SummaryTab guaranteeCase={guaranteeCase} />}
      {activeTab === 'followUp' && <FollowUpTab guaranteeCase={guaranteeCase} />}
      {activeTab === 'financials' && <ChargesAndCreditsTab guaranteeCase={guaranteeCase} />}

      {activeTab === 'liquidation' && (
        <div className="space-y-5">
          <FullCoverageCaseBanner />
          <LiquidationTab
            guaranteeCase={guaranteeCase}
            onOpenTenantDoc={() => setIsTenantDocOpen(true)}
            onOpenOwnerDoc={() => setIsOwnerDocOpen(true)}
          />
        </div>
      )}

      {activeTab === 'archive' && <DocumentsHistoryTab guaranteeCase={guaranteeCase} />}

      {isTenantDocOpen && (
        <TenantLiquidationDocModal
          isOpen={isTenantDocOpen}
          guaranteeCase={guaranteeCase}
          onClose={() => setIsTenantDocOpen(false)}
        />
      )}

      {isOwnerDocOpen && (
        <OwnerLiquidationDocModal
          isOpen={isOwnerDocOpen}
          guaranteeCase={guaranteeCase}
          onClose={() => setIsOwnerDocOpen(false)}
        />
      )}
    </div>
  );
};