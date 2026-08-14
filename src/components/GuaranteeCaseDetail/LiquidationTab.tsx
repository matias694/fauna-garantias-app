import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { GuaranteeCase, BlockedByReason, RequirementStatus } from '../../types';
import { formatCLP, getLocalDateInputValue } from '../../utils/formatters';
import { calculateFundingReadiness, calculateGuaranteeFinances, canConfirmGuaranteeLiquidation } from '../../utils/calculations';
import { getSettlementState } from '../../utils/settlementState';
import { FinancialTransactionFields } from '../FinancialTransactionFields';
import { registerFinancialReceiptLink, uploadFinancialReceipt } from '../../services/financialReceiptStorage';
import { CheckCircle2, AlertTriangle, FileText, Plus, Banknote, Lock, Clock3, X } from 'lucide-react';

interface LiquidationTabProps {
  guaranteeCase: GuaranteeCase;
  onOpenTenantDoc: () => void;
  onOpenOwnerDoc: () => void;
}

export const LiquidationTab: React.FC<LiquidationTabProps> = ({ guaranteeCase, onOpenTenantDoc, onOpenOwnerDoc }) => {
  const {
    changeLiquidationStatus,
    updateRequirementStatus,
    addRequirement,
    emitLiquidation,
    registerTenantRefund,
    settings,
    receivables
  } = useApp();

  const [newReqName, setNewReqName] = useState('');
  const [showAddReq, setShowAddReq] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [refundDate, setRefundDate] = useState(getLocalDateInputValue());
  const [refundReceiptFile, setRefundReceiptFile] = useState<File | null>(null);
  const [refundAccount, setRefundAccount] = useState(guaranteeCase.refund?.destinationAccount || '');
  const [refundNotes, setRefundNotes] = useState('');
  const [refundError, setRefundError] = useState('');
  const [refundSaving, setRefundSaving] = useState(false);

  const fin = calculateGuaranteeFinances(guaranteeCase, settings);
  const readiness = calculateFundingReadiness(guaranteeCase, settings);
  const receivable = receivables.find(r => r.caseId === guaranteeCase.id);
  const settlement = getSettlementState(guaranteeCase, receivable, settings);
  const isConfirmed = guaranteeCase.liquidationStatus === 'EMITIDA';
  const checklistReady = guaranteeCase.liquidationStatus === 'LISTA';
  const preparationReady = guaranteeCase.preparationStatus === 'LISTA';
  const hasManualBlock = guaranteeCase.blockedBy !== 'SIN_BLOQUEO';
  const canConfirm = canConfirmGuaranteeLiquidation(guaranteeCase, settings);

  const originalRefund = guaranteeCase.liquidationSnapshot?.financials.refundToTenant ?? fin.refundToTenant;
  const originalDeficit = guaranteeCase.liquidationSnapshot?.financials.tenantDeficit ?? fin.tenantDeficit;
  const originalIsSurplus = originalRefund > 0;
  const originalIsInsufficient = originalDeficit > 0;
  const originalIsExact = !originalIsSurplus && !originalIsInsufficient;

  const stageLabel = isConfirmed
    ? 'Confirmada'
    : checklistReady && !preparationReady
      ? 'Lista · reparaciones pendientes'
      : checklistReady && hasManualBlock
        ? 'Lista con bloqueo'
        : checklistReady && !readiness.readyToConfirm
          ? 'Lista · faltan fondos para reparar'
          : checklistReady
            ? 'Lista para confirmar'
            : 'En preparación';

  const projectedResult = fin.isSurplus
    ? `Devolver ${formatCLP(fin.refundToTenant)}`
    : fin.isInsufficient
      ? `Arrendatario debe ${formatCLP(fin.tenantDeficit)}`
      : 'Sin saldo';

  const currentActionLabel = settlement.kind === 'RECEIVABLE_PAID'
    ? 'Cobranza finalizada'
    : settlement.kind === 'RECEIVABLE_UNCOLLECTIBLE'
      ? 'Cobranza cerrada como incobrable'
      : settlement.kind === 'RECEIVABLE_PENDING' || settlement.kind === 'RECEIVABLE_PARTIAL'
        ? `Saldo por cobrar ${formatCLP(settlement.pendingAmount)}`
        : settlement.kind === 'REFUND_TRANSFERRED'
          ? 'Devolución transferida'
          : settlement.kind === 'REFUND_PENDING'
            ? `Devolver ${formatCLP(settlement.pendingAmount)}`
            : 'Sin acción financiera pendiente';

  const handleAddRequirement = (e: React.FormEvent) => {
    e.preventDefault();
    if (isConfirmed || !newReqName.trim()) return;
    addRequirement(guaranteeCase.id, newReqName.trim());
    setNewReqName('');
    setShowAddReq(false);
  };

  const handleBlockedByChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value as BlockedByReason;
    changeLiquidationStatus(guaranteeCase.id, guaranteeCase.liquidationStatus, val, '');
  };

  const handleConfirmLiquidation = () => {
    if (!canConfirm) return;
    setShowConfirmModal(true);
  };

  const confirmLiquidation = () => {
    if (!canConfirm) return;
    emitLiquidation(guaranteeCase.id);
    setShowConfirmModal(false);
  };

  const openRefundModal = () => {
    setRefundDate(getLocalDateInputValue());
    setRefundReceiptFile(null);
    setRefundAccount(guaranteeCase.refund?.destinationAccount === 'Pendiente de registrar por usuario' ? '' : (guaranteeCase.refund?.destinationAccount || ''));
    setRefundNotes('');
    setRefundError('');
    setRefundSaving(false);
    setIsRefundModalOpen(true);
  };

  const handleRegisterRefundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRefundError('');

    if (!refundDate) {
      setRefundError('Selecciona la fecha real de la devolución.');
      return;
    }
    if (!refundAccount.trim()) {
      setRefundError('Ingresa la cuenta destino de la devolución.');
      return;
    }
    if (!refundReceiptFile) {
      setRefundError('Adjunta el comprobante antes de confirmar la devolución.');
      return;
    }

    setRefundSaving(true);
    try {
      const receipt = await uploadFinancialReceipt(refundReceiptFile, {
        caseId: guaranteeCase.id,
        movementKind: 'DEVOLUCION_ARRENDATARIO'
      });

      registerTenantRefund(guaranteeCase.id, {
        date: refundDate,
        voucherName: receipt.fileName,
        destinationAccount: refundAccount.trim(),
        notes: refundNotes.trim()
      });

      registerFinancialReceiptLink({
        caseId: guaranteeCase.id,
        movementKind: 'DEVOLUCION_ARRENDATARIO',
        amount: originalRefund,
        paymentDate: refundDate,
        relatedEntityId: guaranteeCase.id,
        receipt,
        notes: [
          `Cuenta destino: ${refundAccount.trim()}`,
          refundNotes.trim()
        ].filter(Boolean).join(' · ')
      });

      setIsRefundModalOpen(false);
    } catch (error) {
      setRefundError(error instanceof Error ? error.message : 'No se pudo guardar el comprobante.');
    } finally {
      setRefundSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <section className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[9px] uppercase font-bold text-slate-400 block">Estado de la liquidación</span>
            <strong className={`text-sm ${isConfirmed ? 'text-purple-700' : canConfirm ? 'text-emerald-700' : 'text-amber-700'}`}>{stageLabel}</strong>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-[10px] font-semibold text-slate-500">Bloqueado por</label>
            <select
              value={guaranteeCase.blockedBy}
              onChange={handleBlockedByChange}
              disabled={guaranteeCase.isClosed}
              className={`border rounded-lg p-1.5 text-xs font-bold ${
                guaranteeCase.blockedBy !== 'SIN_BLOQUEO'
                  ? 'bg-amber-50 text-amber-900 border-amber-300'
                  : 'bg-slate-50 text-slate-700 border-slate-300'
              }`}
            >
              <option value="SIN_BLOQUEO">Sin bloqueo</option>
              <option value="PROPIETARIO">Propietario</option>
              <option value="ARRENDATARIO">Arrendatario</option>
              <option value="PROVEEDOR">Proveedor</option>
              <option value="DOCUMENTO">Documento</option>
              <option value="INFORMACION">Información</option>
              <option value="OTRO">Otro</option>
            </select>
          </div>
        </div>
      </section>

      <section className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Checklist de liquidación
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Completa o marca como no aplicables los antecedentes necesarios antes de confirmar.</p>
          </div>

          {!isConfirmed && (
            <button onClick={() => setShowAddReq(true)} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-lg inline-flex items-center gap-1 cursor-pointer">
              <Plus className="w-3.5 h-3.5" /> Agregar requisito
            </button>
          )}
        </div>

        {isConfirmed && (
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-xs text-purple-900 flex items-start gap-2.5">
            <Lock className="w-4 h-4 mt-0.5 shrink-0 text-purple-700" />
            <span><strong>Liquidación confirmada.</strong> El checklist, los cargos/abonos y el resultado original quedaron congelados en el documento emitido.</span>
          </div>
        )}

        {showAddReq && !isConfirmed && (
          <form onSubmit={handleAddRequirement} className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex gap-2 text-xs">
            <input type="text" required placeholder="Nombre del nuevo requisito" value={newReqName} onChange={(e) => setNewReqName(e.target.value)} className="flex-1 bg-white border border-slate-300 rounded-lg p-2" />
            <button type="submit" className="px-4 py-2 bg-emerald-700 text-white font-bold rounded-lg cursor-pointer">Guardar</button>
            <button type="button" onClick={() => setShowAddReq(false)} className="px-3 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg cursor-pointer">Cancelar</button>
          </form>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {guaranteeCase.requirements.map(req => (
            <div key={req.id} className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-xs text-slate-900">{req.name}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border ${
                  req.status === 'COMPLETO'
                    ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                    : req.status === 'NO_APLICA'
                      ? 'bg-slate-200 text-slate-700 border-slate-300'
                      : 'bg-amber-100 text-amber-900 border-amber-300'
                }`}>
                  {req.status === 'NO_APLICA' ? 'NO APLICA' : req.status}
                </span>
              </div>

              <div className="flex items-center gap-1.5 pt-1">
                {(['PENDIENTE', 'COMPLETO', 'NO_APLICA'] as RequirementStatus[]).map(st => (
                  <button
                    key={st}
                    onClick={() => !isConfirmed && updateRequirementStatus(guaranteeCase.id, req.id, st)}
                    disabled={isConfirmed}
                    className={`flex-1 py-1 rounded text-[10px] font-bold border ${
                      isConfirmed
                        ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                        : req.status === st
                          ? 'bg-slate-900 text-white border-slate-900 cursor-pointer'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100 cursor-pointer'
                    }`}
                  >
                    {st === 'NO_APLICA' ? 'N/A' : st}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="pt-3 border-t border-slate-100 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div className="min-w-0">
            {!checklistReady && !isConfirmed && (
              <span className="text-xs text-amber-800 font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" /> Completa los antecedentes pendientes para poder confirmar.
              </span>
            )}
            {checklistReady && !preparationReady && !isConfirmed && (
              <span className="text-xs text-amber-800 font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" /> Finaliza o cancela las reparaciones pendientes antes de confirmar la liquidación.
              </span>
            )}
            {checklistReady && preparationReady && hasManualBlock && !isConfirmed && (
              <span className="text-xs text-amber-800 font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" /> El caso está bloqueado por {guaranteeCase.blockedBy.toLowerCase()}. Debe quedar “Sin bloqueo” antes de confirmar.
              </span>
            )}
            {checklistReady && preparationReady && !hasManualBlock && !readiness.readyToConfirm && !isConfirmed && (
              <span className="text-xs text-amber-800 font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" /> Faltan {formatCLP(readiness.ownerRepairPendingProvision)} del propietario para financiar reparaciones antes de confirmar.
              </span>
            )}
            {canConfirm && !isConfirmed && (
              <div>
                <span className="text-xs text-emerald-800 font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Lista para confirmar
                </span>
                <span className="text-[11px] text-slate-500 block mt-0.5">Resultado al confirmar: <strong className="text-slate-800">{projectedResult}</strong></span>
              </div>
            )}
            {isConfirmed && (
              <span className="text-xs text-purple-900 font-bold flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-purple-600" /> Resultado definitivo confirmado
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button onClick={onOpenTenantDoc} className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl inline-flex items-center gap-1.5 cursor-pointer">
              <FileText className="w-4 h-4 text-emerald-600" /> Documento arrendatario
            </button>
            <button onClick={onOpenOwnerDoc} className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl inline-flex items-center gap-1.5 cursor-pointer">
              <FileText className="w-4 h-4 text-blue-600" /> Documento propietario
            </button>
            {!isConfirmed && (
              <button
                onClick={handleConfirmLiquidation}
                disabled={!canConfirm}
                className={`px-5 py-2 rounded-xl font-bold text-xs shadow-xs inline-flex items-center gap-2 ${
                  canConfirm ? 'bg-purple-700 hover:bg-purple-800 text-white cursor-pointer' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <Lock className="w-4 h-4" /> Confirmar liquidación
              </button>
            )}
          </div>
        </div>
      </section>

      {isConfirmed && (
        <section className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div>
            <span className="text-[9px] uppercase font-bold text-slate-400 block">Acción posterior</span>
            <strong className="text-sm text-slate-900">{currentActionLabel}</strong>
          </div>

          {originalIsSurplus && (
            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <strong className="text-xs text-emerald-900 block">
                  {settlement.kind === 'REFUND_TRANSFERRED'
                    ? `Devolución transferida: ${formatCLP(originalRefund)}`
                    : `Devolución al arrendatario: ${formatCLP(originalRefund)}`}
                </strong>
                <span className="text-[11px] text-emerald-800">Estado: {guaranteeCase.refund?.status || 'PENDIENTE'}</span>
              </div>
              {guaranteeCase.refund?.status !== 'TRANSFERIDA' && (
                <button onClick={openRefundModal} className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl inline-flex items-center gap-2 cursor-pointer">
                  <Banknote className="w-4 h-4" /> Registrar devolución
                </button>
              )}
            </div>
          )}

          {originalIsExact && (
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs text-slate-700 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> No hay devolución ni cuenta por cobrar.
            </div>
          )}

          {originalIsInsufficient && settlement.kind === 'RECEIVABLE_PAID' && (
            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <strong className="text-xs text-emerald-950 block">Cobranza finalizada</strong>
                <span className="text-[11px] text-emerald-900 block">Deuda original: {formatCLP(settlement.originalAmount)} · Pagado: {formatCLP(settlement.paidAmount)} · Saldo: $0.</span>
              </div>
            </div>
          )}

          {originalIsInsufficient && (settlement.kind === 'RECEIVABLE_PENDING' || settlement.kind === 'RECEIVABLE_PARTIAL') && (
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-2.5">
              <Clock3 className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <strong className="text-xs text-amber-950 block">Saldo por cobrar: {formatCLP(settlement.pendingAmount)}</strong>
                <span className="text-[11px] text-amber-900 block">Deuda original: {formatCLP(settlement.originalAmount)} · Pagado: {formatCLP(settlement.paidAmount)}.</span>
                <span className="text-[11px] text-amber-900 block">La cobranza y los pagos se gestionan desde Por cobrar.</span>
              </div>
            </div>
          )}

          {originalIsInsufficient && settlement.kind === 'RECEIVABLE_UNCOLLECTIBLE' && (
            <div className="bg-slate-50 border border-slate-300 p-4 rounded-xl flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-slate-600 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <strong className="text-xs text-slate-900 block">Cobranza cerrada como incobrable</strong>
                <span className="text-[11px] text-slate-700 block">Deuda original: {formatCLP(settlement.originalAmount)} · Pagado: {formatCLP(settlement.paidAmount)} · Saldo incobrable: {formatCLP(settlement.pendingAmount)}.</span>
              </div>
            </div>
          )}
        </section>
      )}

      {showConfirmModal && canConfirm && !isConfirmed && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-purple-700 rounded-xl"><Lock className="w-4 h-4" /></div>
                <div>
                  <h3 className="font-bold text-sm">Confirmar liquidación</h3>
                  <p className="text-[11px] text-slate-300">{guaranteeCase.id} · resultado definitivo</p>
                </div>
              </div>
              <button type="button" onClick={() => setShowConfirmModal(false)} className="p-1.5 text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Resultado</span>
                <strong className="text-base text-slate-900 block mt-1">{projectedResult}</strong>
              </div>
              <p className="text-slate-600 leading-relaxed">
                Al confirmar, la liquidación quedará emitida y sus montos no podrán modificarse.
              </p>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button type="button" onClick={() => setShowConfirmModal(false)} className="px-4 py-2 border border-slate-300 text-slate-700 font-bold rounded-xl cursor-pointer">Cancelar</button>
              <button type="button" onClick={confirmLiquidation} className="px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl cursor-pointer inline-flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" /> Confirmar liquidación
              </button>
            </div>
          </div>
        </div>
      )}

      {isRefundModalOpen && isConfirmed && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full shadow-xl overflow-hidden max-h-[92vh] overflow-y-auto">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between sticky top-0 z-10">
              <div>
                <h3 className="font-bold text-sm">Registrar devolución</h3>
                <p className="text-[11px] text-slate-300 mt-0.5">Devolución de garantía al arrendatario</p>
              </div>
              <button type="button" onClick={() => setIsRefundModalOpen(false)} className="p-1.5 text-slate-400 hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handleRegisterRefundSubmit} className="p-5 space-y-4 text-xs">
              <FinancialTransactionFields
                amount={originalRefund}
                amountReadOnly
                date={refundDate}
                onDateChange={setRefundDate}
                receiptFile={refundReceiptFile}
                onReceiptFileChange={setRefundReceiptFile}
                notes={refundNotes}
                onNotesChange={setRefundNotes}
                receiptLabel="Comprobante de transferencia"
              >
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Cuenta destino *</label>
                  <input
                    type="text"
                    required
                    value={refundAccount}
                    onChange={(e) => setRefundAccount(e.target.value)}
                    placeholder="Banco · tipo de cuenta · número · titular"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5"
                  />
                </div>
              </FinancialTransactionFields>

              {refundError && <p className="text-[11px] font-semibold text-rose-700">{refundError}</p>}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button type="button" disabled={refundSaving} onClick={() => setIsRefundModalOpen(false)} className="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer disabled:opacity-60">Cancelar</button>
                <button type="submit" disabled={refundSaving} className="px-4 py-2 bg-emerald-700 disabled:bg-emerald-400 text-white font-bold rounded-xl cursor-pointer">
                  {refundSaving ? 'Guardando…' : 'Confirmar devolución'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
