import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { GuaranteeCase, BlockedByReason, RequirementStatus } from '../../types';
import { formatCLP, formatDate } from '../../utils/formatters';
import { calculateGuaranteeFinances } from '../../utils/calculations';
import {
  Calculator,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Receipt,
  Plus,
  Send,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  Banknote,
  Upload,
  UserCheck
} from 'lucide-react';

interface LiquidationTabProps {
  guaranteeCase: GuaranteeCase;
  onOpenTenantDoc: () => void;
  onOpenOwnerDoc: () => void;
}

export const LiquidationTab: React.FC<LiquidationTabProps> = ({
  guaranteeCase,
  onOpenTenantDoc,
  onOpenOwnerDoc
}) => {
  const {
    changeLiquidationStatus,
    updateRequirementStatus,
    addRequirement,
    emitLiquidation,
    registerTenantRefund,
    createReceivableFromCase,
    closeGuaranteeCase,
    reopenGuaranteeCase,
    settings,
    userRole
  } = useApp();

  const [newReqName, setNewReqName] = useState('');
  const [showAddReq, setShowAddReq] = useState(false);
  const [blockedNotes, setBlockedNotes] = useState(guaranteeCase.blockedReasonNotes || '');

  // Refund transfer modal state
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [refundDate, setRefundDate] = useState(formatDate(new Date().toISOString().split('T')[0]));
  const [refundVoucher, setRefundVoucher] = useState('');
  const [refundAccount, setRefundAccount] = useState(guaranteeCase.refund?.destinationAccount || '');
  const [refundNotes, setRefundNotes] = useState('');

  const fin = calculateGuaranteeFinances(guaranteeCase, settings);

  const handleAddRequirement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReqName.trim()) return;
    addRequirement(guaranteeCase.id, newReqName.trim());
    setNewReqName('');
    setShowAddReq(false);
  };

  const handleBlockedByChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value as BlockedByReason;
    changeLiquidationStatus(guaranteeCase.id, guaranteeCase.liquidationStatus, val, blockedNotes);
  };

  const handleSaveBlockedNotes = () => {
    changeLiquidationStatus(guaranteeCase.id, guaranteeCase.liquidationStatus, guaranteeCase.blockedBy, blockedNotes);
    alert('Motivo de bloqueo actualizado.');
  };

  const handleEmitLiquidation = () => {
    emitLiquidation(guaranteeCase.id);
    alert('Liquidación emitida exitosamente.');
  };

  const handleRegisterRefundSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    registerTenantRefund(guaranteeCase.id, {
      date: refundDate,
      voucherName: refundVoucher,
      destinationAccount: refundAccount,
      notes: refundNotes
    });
    setIsRefundModalOpen(false);
    alert('Transferencia de devolución registrada exitosamente y agregada a movimientos financieros.');
  };

  const allReqsComplete = guaranteeCase.requirements.length > 0 && guaranteeCase.requirements.every(r => r.status === 'COMPLETO' || r.status === 'NO_APLICA');

  return (
    <div className="space-y-6">
      
      {/* HEADER STATUS BAR */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-400 block">ESTADO LIQUIDACIÓN DE GARANTÍA</span>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wide border ${
                guaranteeCase.liquidationStatus === 'EMITIDA'
                  ? 'bg-purple-100 text-purple-900 border-purple-300'
                  : guaranteeCase.liquidationStatus === 'LISTA'
                  ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                  : 'bg-amber-100 text-amber-900 border-amber-300'
              }`}>
                [ {guaranteeCase.liquidationStatus === 'EN_PREPARACION' ? 'EN PREPARACIÓN' : guaranteeCase.liquidationStatus} ]
              </span>

              {guaranteeCase.isCompleted && (
                <span className="px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wide bg-emerald-600 text-white shadow-xs">
                  ✓ CASO COMPLETADO
                </span>
              )}
            </div>
          </div>

          {/* BLOQUEADO POR */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">Bloqueado por</label>
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
                <option value="SIN_BLOQUEO">Sin Bloqueo</option>
                <option value="PROPIETARIO">Propietario</option>
                <option value="ARRENDATARIO">Arrendatario</option>
                <option value="PROVEEDOR">Proveedor</option>
                <option value="DOCUMENTO">Documento</option>
                <option value="INFORMACION">Información</option>
                <option value="OTRO">Otro</option>
              </select>
            </div>
          </div>
        </div>

        {guaranteeCase.blockedBy !== 'SIN_BLOQUEO' && (
          <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl space-y-2 text-xs">
            <label className="block font-bold text-amber-900">Motivo de Bloqueo:</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={blockedNotes}
                onChange={(e) => setBlockedNotes(e.target.value)}
                placeholder="Indica qué está impidiendo avanzar..."
                className="flex-1 bg-white border border-amber-300 rounded-lg p-2 text-xs"
              />
              <button
                onClick={handleSaveBlockedNotes}
                className="px-3 py-1.5 bg-amber-800 hover:bg-amber-900 text-white font-bold rounded-lg cursor-pointer"
              >
                Guardar Motivo
              </button>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 7: CHECKLIST DE REQUISITOS PARA LIQUIDAR */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wide flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Requisitos para Liquidar
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Todos los requisitos deben estar en "Completo" o "No aplica" para que la liquidación pase a <strong>LISTA</strong>.
            </p>
          </div>

          <button
            onClick={() => setShowAddReq(true)}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-lg inline-flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Agregar Requisito</span>
          </button>
        </div>

        {/* ADD REQ FORM */}
        {showAddReq && (
          <form onSubmit={handleAddRequirement} className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex gap-2 text-xs">
            <input
              type="text"
              required
              placeholder="Nombre del nuevo requisito (Ej. Certificado Dicom)..."
              value={newReqName}
              onChange={(e) => setNewReqName(e.target.value)}
              className="flex-1 bg-white border border-slate-300 rounded-lg p-2"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-700 text-white font-bold rounded-lg cursor-pointer"
            >
              Guardar
            </button>
            <button
              type="button"
              onClick={() => setShowAddReq(false)}
              className="px-3 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg cursor-pointer"
            >
              Cancelar
            </button>
          </form>
        )}

        {/* REQUIREMENTS LIST */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {guaranteeCase.requirements.map((req) => (
            <div key={req.id} className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
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

              {/* SELECT STATUS */}
              <div className="flex items-center gap-1.5 pt-1">
                {(['PENDIENTE', 'COMPLETO', 'NO_APLICA'] as RequirementStatus[]).map((st) => (
                  <button
                    key={st}
                    onClick={() => updateRequirementStatus(guaranteeCase.id, req.id, st)}
                    className={`flex-1 py-1 rounded text-[10px] font-bold border cursor-pointer transition-all ${
                      req.status === st
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {st === 'NO_APLICA' ? 'N/A' : st}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* EMISSION ACTIONS */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div>
            {guaranteeCase.liquidationStatus === 'EN_PREPARACION' && (
              <span className="text-xs text-amber-800 font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Falta completar al menos 1 requisito para dejar la liquidación en <strong>LISTA</strong>.
              </span>
            )}
            {guaranteeCase.liquidationStatus === 'LISTA' && (
              <span className="text-xs text-emerald-800 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Todos los antecedentes listos. La liquidación se puede revisar y emitir.
              </span>
            )}
            {guaranteeCase.liquidationStatus === 'EMITIDA' && (
              <span className="text-xs text-purple-900 font-bold flex items-center gap-1.5">
                <Send className="w-4 h-4 text-purple-600" />
                Liquidación emitida al arrendatario.
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenTenantDoc}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl inline-flex items-center gap-1.5 cursor-pointer"
            >
              <FileText className="w-4 h-4 text-emerald-600" />
              <span>Ver Documento Arrendatario</span>
            </button>

            <button
              onClick={onOpenOwnerDoc}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl inline-flex items-center gap-1.5 cursor-pointer"
            >
              <FileText className="w-4 h-4 text-blue-600" />
              <span>Ver Documento Propietario</span>
            </button>

            {guaranteeCase.liquidationStatus !== 'EMITIDA' && (
              <button
                onClick={handleEmitLiquidation}
                disabled={guaranteeCase.liquidationStatus !== 'LISTA'}
                className={`px-5 py-2 rounded-xl font-bold text-xs shadow-xs inline-flex items-center gap-2 transition-all cursor-pointer ${
                  guaranteeCase.liquidationStatus === 'LISTA'
                    ? 'bg-purple-700 hover:bg-purple-800 text-white'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <Send className="w-4 h-4" />
                <span>EMITIR LIQUIDACIÓN DEFINITIVA</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* RESULTADO Y PROCESOS FINANCIEROS (DEVOLUCIÓN O POR COBRAR) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-sm text-slate-900 uppercase">Resultado de la Liquidación</h3>
            <p className="text-xs text-slate-500">Monto garantía ({formatCLP(fin.guaranteeAmount)}) vs Total Cargos ({formatCLP(fin.totalCharges)})</p>
          </div>
          <span className="text-xs font-mono font-bold px-3 py-1 rounded-lg bg-slate-100 text-slate-800">
            {fin.isSurplus ? 'SOBRANTE' : fin.isInsufficient ? 'DÉFICIT' : 'EXACTO'}
          </span>
        </div>

        {/* RESULT BOX */}
        {fin.isSurplus && (
          <div className="bg-emerald-50 border border-emerald-300 p-4 rounded-2xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold uppercase text-emerald-800 block">A. Dinero a Devolver al Arrendatario</span>
                <span className="text-2xl font-black font-mono text-emerald-900">{formatCLP(fin.refundToTenant)}</span>
              </div>

              <div className="text-right">
                <span className="text-xs text-emerald-800 block font-semibold">Estado Devolución:</span>
                <span className={`px-3 py-1 rounded-lg font-black text-xs uppercase border inline-block mt-0.5 ${
                  guaranteeCase.refund?.status === 'TRANSFERIDA'
                    ? 'bg-emerald-600 text-white border-emerald-700'
                    : 'bg-amber-100 text-amber-900 border-amber-300'
                }`}>
                  [ {guaranteeCase.refund?.status || 'PENDIENTE'} ]
                </span>
              </div>
            </div>

            {/* DETAILS & TRANSFER ACTION */}
            {guaranteeCase.refund?.status === 'TRANSFERIDA' ? (
              <div className="bg-white p-3 rounded-xl border border-emerald-200 text-xs space-y-1 text-slate-800">
                <div><strong>Fecha Transferencia:</strong> {guaranteeCase.refund.date}</div>
                <div><strong>Comprobante:</strong> {guaranteeCase.refund.voucherName || 'Registrado'}</div>
                <div><strong>Cuenta Destino:</strong> {guaranteeCase.refund.destinationAccount || 'N/A'}</div>
                <div><strong>Registrado por:</strong> {guaranteeCase.refund.user || 'Usuario'}</div>
              </div>
            ) : (
              <div className="pt-2 border-t border-emerald-200 flex justify-end">
                <button
                  onClick={() => setIsRefundModalOpen(true)}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs inline-flex items-center gap-2 cursor-pointer"
                >
                  <Banknote className="w-4 h-4" />
                  <span>Registrar Transferencia de Devolución</span>
                </button>
              </div>
            )}
          </div>
        )}

        {fin.isExact && (
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-center space-y-1">
            <h4 className="font-bold text-sm text-slate-800">B. Saldo $0</h4>
            <p className="text-xs text-slate-600">La garantía cubre exactamente el total de los cargos. No hay devoluciones ni cobros pendientes.</p>
          </div>
        )}

        {fin.isInsufficient && (
          <div className="bg-amber-50 border border-amber-300 p-4 rounded-2xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold uppercase text-amber-800 block">C. Dinero que el Arrendatario Debe Pagar (Déficit)</span>
                <span className="text-2xl font-black font-mono text-amber-950">{formatCLP(fin.tenantDeficit)}</span>
              </div>

              <div className="text-right">
                <span className="text-xs text-amber-800 block font-semibold">Cuenta por Cobrar:</span>
                <span className="px-3 py-1 rounded-lg font-black text-xs uppercase bg-amber-200 text-amber-900 border border-amber-400 inline-block mt-0.5">
                  [ {guaranteeCase.receivableStatus || 'PENDIENTE'} ]
                </span>
              </div>
            </div>

            <p className="text-xs text-amber-900">
              La gestión de cobranza y la recepción de pagos posteriores se realizan desde el módulo <strong>"Por Cobrar"</strong>.
            </p>
          </div>
        )}
      </div>

      {/* REFUND TRANSFER MODAL */}
      {isRefundModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="font-bold text-base text-slate-900 border-b border-slate-100 pb-2">
              Registrar Transferencia de Devolución
            </h3>

            <form onSubmit={handleRegisterRefundSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Monto a Transferir</label>
                <input
                  type="text"
                  disabled
                  value={formatCLP(fin.refundToTenant)}
                  className="w-full bg-slate-100 border border-slate-200 rounded-lg p-2 font-bold font-mono text-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Fecha de Transferencia *</label>
                <input
                  type="text"
                  required
                  placeholder="DD/MM/AAAA"
                  value={refundDate}
                  onChange={(e) => setRefundDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Cuenta Destino</label>
                <input
                  type="text"
                  placeholder="Banco / Tipo Cuenta / Número / Titular"
                  value={refundAccount}
                  onChange={(e) => setRefundAccount(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Referencia / N° Comprobante</label>
                <input
                  type="text"
                  placeholder="Ej. TEF-12345678"
                  value={refundVoucher}
                  onChange={(e) => setRefundVoucher(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Observaciones</label>
                <textarea
                  rows={2}
                  placeholder="Notas adicionales..."
                  value={refundNotes}
                  onChange={(e) => setRefundNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRefundModalOpen(false)}
                  className="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-700 text-white font-bold rounded-xl cursor-pointer"
                >
                  Confirmar Transferencia
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
