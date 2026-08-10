import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { SummaryTab } from './SummaryTab';
import { FollowUpTab } from './FollowUpTab';
import { ChargesAndCreditsTab } from './ChargesAndCreditsTab';
import { LiquidationTab } from './LiquidationTab';
import { DocumentsHistoryTab } from './DocumentsHistoryTab';
import { TenantLiquidationDocModal } from '../TenantLiquidationDocModal';
import { OwnerLiquidationDocModal } from '../OwnerLiquidationDocModal';
import {
  ArrowLeft,
  LayoutDashboard,
  MessageSquare,
  DollarSign,
  FileCheck,
  FileText,
  AlertTriangle,
  X,
  Lock
} from 'lucide-react';

interface GuaranteeCaseDetailProps {
  caseId?: string;
}

type CaseTab = 'summary' | 'followUp' | 'financials' | 'liquidation' | 'archive';

export const GuaranteeCaseDetail: React.FC<GuaranteeCaseDetailProps> = ({ caseId: propCaseId }) => {
  const { cases, selectedCaseId, setSelectedCaseId, setActiveView, closeGuaranteeCase, reopenGuaranteeCase, userRole } = useApp();

  const [activeTab, setActiveTab] = useState<CaseTab>('summary');

  const [isTenantDocOpen, setIsTenantDocOpen] = useState(false);
  const [isOwnerDocOpen, setIsOwnerDocOpen] = useState(false);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [closeErrorMessage, setCloseErrorMessage] = useState<string | null>(null);

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

  const handleConfirmClose = () => {
    setCloseErrorMessage(null);
    const res = closeGuaranteeCase(guaranteeCase.id);
    if (!res.success) {
      setCloseErrorMessage(res.message);
    } else {
      setIsCloseModalOpen(false);
    }
  };

  const pendingRepairs = guaranteeCase.repairs.filter(r => r.status !== 'TERMINADA' && r.status !== 'CANCELADA');

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
            <div className="flex items-center gap-2">
              <span className="font-mono font-black text-slate-900 text-lg">{guaranteeCase.id}</span>
              <span className="text-slate-400 font-light">|</span>
              <h2 className="font-bold text-slate-800 text-base">{guaranteeCase.propertyAddress}, {guaranteeCase.propertyUnit}</h2>

              {guaranteeCase.isCompleted && (
                <span className="px-2.5 py-0.5 rounded-md bg-emerald-600 text-white font-black text-[10px] uppercase tracking-wide">
                  ✓ CASO COMPLETADO
                </span>
              )}

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

        <div className="flex items-center gap-2">
          {!guaranteeCase.isClosed ? (
            <button
              onClick={() => { setCloseErrorMessage(null); setIsCloseModalOpen(true); }}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-950 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-all flex items-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Cerrar Caso</span>
            </button>
          ) : (
            userRole === 'ADMINISTRADOR' && (
              <button
                onClick={() => reopenGuaranteeCase(guaranteeCase.id)}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-all"
              >
                Reabrir Caso
              </button>
            )
          )}
        </div>
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
          <FileCheck className="w-4 h-4 text-purple-400" />
          <span>Liquidación</span>
        </button>

        <button onClick={() => setActiveTab('archive')} className={tabClass('archive')}>
          <FileText className="w-4 h-4" />
          <span>Documentos e historial</span>
        </button>
      </div>

      {activeTab === 'summary' && (
        <SummaryTab guaranteeCase={guaranteeCase} />
      )}

      {activeTab === 'followUp' && (
        <FollowUpTab guaranteeCase={guaranteeCase} />
      )}

      {activeTab === 'financials' && (
        <ChargesAndCreditsTab guaranteeCase={guaranteeCase} />
      )}

      {activeTab === 'liquidation' && (
        <LiquidationTab
          guaranteeCase={guaranteeCase}
          onOpenTenantDoc={() => setIsTenantDocOpen(true)}
          onOpenOwnerDoc={() => setIsOwnerDocOpen(true)}
        />
      )}

      {activeTab === 'archive' && (
        <DocumentsHistoryTab guaranteeCase={guaranteeCase} />
      )}

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

      {isCloseModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-slate-800 rounded-xl">
                  <Lock className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Cerrar Definitivamente Caso</h3>
                  <p className="text-xs text-slate-400 font-mono">{guaranteeCase.id}</p>
                </div>
              </div>
              <button
                onClick={() => setIsCloseModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1.5">
                <p className="text-slate-700">
                  <strong>Propiedad:</strong> {guaranteeCase.propertyAddress}, {guaranteeCase.propertyUnit}
                </p>
                <p className="text-slate-700">
                  <strong>Arrendatario:</strong> {guaranteeCase.tenantName}
                </p>
                <p className="text-slate-700">
                  <strong>Propietario:</strong> {guaranteeCase.ownerName}
                </p>
              </div>

              {pendingRepairs.length > 0 && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 flex items-start gap-3 text-xs text-rose-800">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold block mb-0.5">Reparaciones Pendientes ({pendingRepairs.length})</strong>
                    <p>No es posible cerrar el caso mientras existan trabajos pendientes o en ejecución. Revísalos en Cargos y abonos &gt; Reparaciones.</p>
                  </div>
                </div>
              )}

              {closeErrorMessage && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl text-xs font-medium">
                  {closeErrorMessage}
                </div>
              )}

              <p className="text-xs text-slate-600 leading-relaxed">
                Al cerrar el caso, este quedará marcado como <strong className="text-slate-900">CERRADO</strong> y archivado. Podrá reabrirlo posteriormente si cuenta con rol de Administrador.
              </p>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsCloseModalOpen(false)}
                className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={pendingRepairs.length > 0}
                onClick={handleConfirmClose}
                className={`px-5 py-2 font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 ${
                  pendingRepairs.length > 0
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    : 'bg-slate-900 hover:bg-slate-950 text-white cursor-pointer'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Confirmar Cierre</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
