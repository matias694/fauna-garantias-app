import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { GuaranteeCase } from '../../types';
import { formatCLP, formatDate, calculateDaysDifference, parseFormattedDateToInput, addDaysToDate } from '../../utils/formatters';
import { calculateFundingReadiness, calculateGuaranteeFinances } from '../../utils/calculations';
import { getSettlementState } from '../../utils/settlementState';
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Edit3 } from 'lucide-react';

interface SummaryTabProps {
  guaranteeCase: GuaranteeCase;
}

export const SummaryTab: React.FC<SummaryTabProps> = ({ guaranteeCase }) => {
  const { addFollowUpComment, settings, receivables } = useApp();

  const [nextManagement, setNextManagement] = useState(guaranteeCase.nextManagement || '');
  const [nextDate, setNextDate] = useState(parseFormattedDateToInput(guaranteeCase.nextManagementDate || ''));
  const [nextResp, setNextResp] = useState(guaranteeCase.nextManagementResponsible || guaranteeCase.responsible || '');
  const [editingNextManagement, setEditingNextManagement] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    setNextManagement(guaranteeCase.nextManagement || '');
    setNextDate(parseFormattedDateToInput(guaranteeCase.nextManagementDate || ''));
    setNextResp(guaranteeCase.nextManagementResponsible || guaranteeCase.responsible || '');
    if (guaranteeCase.isCompleted || guaranteeCase.isClosed) setEditingNextManagement(false);
  }, [guaranteeCase.id, guaranteeCase.nextManagement, guaranteeCase.nextManagementDate, guaranteeCase.nextManagementResponsible, guaranteeCase.responsible, guaranteeCase.isCompleted, guaranteeCase.isClosed]);

  const fin = calculateGuaranteeFinances(guaranteeCase, settings);
  const readiness = calculateFundingReadiness(guaranteeCase, settings);
  const receivable = receivables.find(r => r.caseId === guaranteeCase.id);
  const settlement = getSettlementState(guaranteeCase, receivable, settings);
  const daysInProcess = calculateDaysDifference(guaranteeCase.receptionDate);
  const currentDeadlineDate = addDaysToDate(guaranteeCase.receptionDate, settings.maxLiquidationDays);
  const isOverdue = daysInProcess > settings.maxLiquidationDays;
  const isNearDeadline = daysInProcess >= settings.alertDay && !isOverdue;
  const shouldShowDeadlineAlert = !guaranteeCase.isCompleted && !guaranteeCase.isClosed && (isOverdue || isNearDeadline);
  const isConfirmed = guaranteeCase.liquidationStatus === 'EMITIDA';

  const stageLabel = guaranteeCase.isClosed
    ? 'Caso cerrado'
    : guaranteeCase.isCompleted
      ? 'Listo para cerrar'
      : isConfirmed
        ? 'Liquidación confirmada'
        : guaranteeCase.liquidationStatus === 'LISTA'
          ? 'Lista para confirmar liquidación'
          : guaranteeCase.preparationStatus === 'REPARANDO'
            ? 'Reparaciones en curso'
            : guaranteeCase.preparationStatus === 'PENDIENTE'
              ? 'Preparando salida'
              : 'Completando antecedentes de liquidación';

  const projectedResultLabel = fin.isSurplus
    ? `Devolver ${formatCLP(fin.refundToTenant)}`
    : fin.isInsufficient
      ? `Debe ${formatCLP(fin.tenantDeficit)}`
      : 'Sin saldo';

  const resultLabel = !isConfirmed
    ? projectedResultLabel
    : settlement.kind === 'RECEIVABLE_PAID'
      ? 'Cobranza pagada'
      : settlement.kind === 'RECEIVABLE_UNCOLLECTIBLE'
        ? `Incobrable ${formatCLP(settlement.pendingAmount)}`
        : settlement.kind === 'RECEIVABLE_PENDING' || settlement.kind === 'RECEIVABLE_PARTIAL'
          ? `Saldo por cobrar ${formatCLP(settlement.pendingAmount)}`
          : settlement.kind === 'REFUND_TRANSFERRED'
            ? 'Devolución transferida'
            : settlement.kind === 'REFUND_PENDING'
              ? `Devolver ${formatCLP(settlement.pendingAmount)}`
              : 'Sin saldo';

  const resultColorClass = !isConfirmed
    ? fin.isSurplus
      ? 'text-emerald-700'
      : fin.isInsufficient
        ? 'text-rose-700'
        : 'text-slate-800'
    : settlement.kind === 'RECEIVABLE_PAID' || settlement.kind === 'REFUND_TRANSFERRED' || settlement.kind === 'NO_BALANCE'
      ? 'text-emerald-700'
      : settlement.kind === 'RECEIVABLE_UNCOLLECTIBLE'
        ? 'text-slate-700'
        : settlement.kind === 'RECEIVABLE_PENDING' || settlement.kind === 'RECEIVABLE_PARTIAL'
          ? 'text-rose-700'
          : 'text-emerald-700';

  const handleSaveNextManagement = (e: React.FormEvent) => {
    e.preventDefault();
    if (guaranteeCase.isCompleted || guaranteeCase.isClosed) return;

    const oldManagement = guaranteeCase.nextManagement || '';
    const oldDate = parseFormattedDateToInput(guaranteeCase.nextManagementDate || '');
    const oldResp = guaranteeCase.nextManagementResponsible || guaranteeCase.responsible || '';
    const changes: string[] = [];

    if (oldManagement !== nextManagement) changes.push(`Gestión: “${oldManagement || 'Sin gestión'}” → “${nextManagement}”`);
    if (oldDate !== nextDate) changes.push(`Fecha: ${oldDate ? formatDate(oldDate) : 'Sin fecha'} → ${nextDate ? formatDate(nextDate) : 'Sin fecha'}`);
    if (oldResp !== nextResp) changes.push(`Responsable: ${oldResp || 'Sin responsable'} → ${nextResp || 'Sin responsable'}`);

    if (changes.length > 0) {
      addFollowUpComment(guaranteeCase.id, {
        comment: `Próxima gestión actualizada desde Resumen:\n${changes.join('\n')}`,
        area: 'General',
        nextManagement,
        nextManagementDate: nextDate,
        nextManagementResponsible: nextResp
      });
    }

    setEditingNextManagement(false);
  };

  const formatClosedAt = (value?: string) => {
    if (!value) return 'Fecha no registrada';
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      const day = String(parsed.getDate()).padStart(2, '0');
      const month = String(parsed.getMonth() + 1).padStart(2, '0');
      const year = parsed.getFullYear();
      const hour = String(parsed.getHours()).padStart(2, '0');
      const minute = String(parsed.getMinutes()).padStart(2, '0');
      return `${day}/${month}/${year} · ${hour}:${minute}`;
    }
    return value;
  };

  return (
    <div className="space-y-4">
      <section className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            <div className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-[9px] uppercase font-bold text-slate-400 mr-1.5">Etapa actual</span>
              <strong className={`text-[11px] ${isConfirmed || guaranteeCase.isCompleted ? 'text-emerald-700' : guaranteeCase.liquidationStatus === 'LISTA' ? 'text-purple-700' : 'text-slate-700'}`}>
                {stageLabel}
              </strong>
            </div>

            {guaranteeCase.blockedBy !== 'SIN_BLOQUEO' && (
              <div className="px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-800">
                <strong>Bloqueado:</strong> {guaranteeCase.blockedBy.replace(/_/g, ' ')}
              </div>
            )}

            {guaranteeCase.isCompleted && !guaranteeCase.isClosed && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                <CheckCircle2 className="w-3.5 h-3.5" /> Caso completado
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 text-[11px] text-slate-500">
            <span>Recepción <strong className="text-slate-700">{formatDate(guaranteeCase.receptionDate)}</strong></span>
            <span>Límite <strong className="text-slate-700">{formatDate(currentDeadlineDate)}</strong></span>
            {shouldShowDeadlineAlert && (
              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg font-bold ${isOverdue ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>
                <AlertTriangle className="w-3 h-3" /> {isOverdue ? `Vencido · ${daysInProcess} días` : `Alerta · ${daysInProcess} días`}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
          <div className="p-4">
            <span className="text-[9px] font-bold text-slate-400 uppercase block">Garantía</span>
            <strong className="text-lg font-black text-slate-900 font-mono">{formatCLP(fin.guaranteeAmount)}</strong>
            <span className="text-[10px] text-slate-400 block">Plan {guaranteeCase.plan}</span>
          </div>

          <div className="p-4">
            <span className="text-[9px] font-bold text-slate-400 uppercase block">Neto cargos y abonos</span>
            <strong className="text-lg font-black text-slate-900 font-mono">{formatCLP(fin.totalCharges)}</strong>
            <span className="text-[10px] text-slate-400 block">{guaranteeCase.charges.length} movimientos</span>
          </div>

          <div className="p-4">
            <span className="text-[9px] font-bold text-slate-400 uppercase block">{isConfirmed ? 'Estado actual' : 'Resultado proyectado'}</span>
            <strong className={`text-lg font-black ${resultColorClass}`}>{resultLabel}</strong>
            {(settlement.kind === 'RECEIVABLE_PENDING' || settlement.kind === 'RECEIVABLE_PARTIAL') && (
              <span className="text-[10px] text-rose-600 font-bold block">Pagado {formatCLP(settlement.paidAmount)} · saldo {formatCLP(settlement.pendingAmount)}</span>
            )}
            {settlement.kind === 'RECEIVABLE_PAID' && (
              <span className="text-[10px] text-emerald-700 font-bold block">Pagado {formatCLP(settlement.paidAmount)} · saldo $0</span>
            )}
            {settlement.kind === 'RECEIVABLE_UNCOLLECTIBLE' && (
              <span className="text-[10px] text-slate-500 font-bold block">Pagado {formatCLP(settlement.paidAmount)} · saldo dado por incobrable {formatCLP(settlement.pendingAmount)}</span>
            )}
          </div>
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4">
        {guaranteeCase.isClosed ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-[9px] uppercase font-bold text-slate-400 block">Caso cerrado</span>
              {readiness.ownerServicePending > 0 && guaranteeCase.ownerPostClosePending ? (
                <>
                  <strong className="text-sm text-sky-800">Garantía cerrada · seguimiento posterior propietario {formatCLP(readiness.ownerServicePending)}</strong>
                  <span className="text-[10px] text-slate-500 block">No bloquea el contrato · revisar {formatDate(guaranteeCase.ownerPostClosePending.nextReviewDate)} · {guaranteeCase.ownerPostClosePending.responsible}</span>
                </>
              ) : (
                <strong className="text-sm text-slate-800">Sin gestiones pendientes de garantía</strong>
              )}
            </div>
            <span className="text-[11px] text-slate-500">{formatClosedAt(guaranteeCase.closedAt)} · {guaranteeCase.closedBy || 'Sin responsable'}</span>
          </div>
        ) : editingNextManagement ? (
          <form onSubmit={handleSaveNextManagement} className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
            <div className="md:col-span-2">
              <label className="block text-[10px] font-semibold text-slate-500 mb-1">Próxima gestión</label>
              <input type="text" required value={nextManagement} onChange={(e) => setNextManagement(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-1">Fecha</label>
              <input type="date" value={nextDate} onChange={(e) => setNextDate(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-1">Responsable</label>
              <select value={nextResp} onChange={(e) => setNextResp(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs">
                <option value="">Sin responsable</option>
                {settings.responsiblesList.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="md:col-span-4 flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setEditingNextManagement(false)} className="px-3 py-2 border border-slate-300 rounded-lg text-slate-600 font-bold cursor-pointer">Cancelar</button>
              <button type="submit" className="px-4 py-2 bg-slate-900 text-white rounded-lg font-bold cursor-pointer">Guardar</button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="text-[9px] uppercase font-bold text-slate-400 block">Próxima gestión</span>
              <strong className="text-sm text-slate-800 block truncate">{guaranteeCase.nextManagement || 'Sin próxima gestión programada'}</strong>
              <span className="text-[10px] text-slate-500">{guaranteeCase.nextManagementDate ? formatDate(guaranteeCase.nextManagementDate) : 'Sin fecha'} · {guaranteeCase.nextManagementResponsible || guaranteeCase.responsible || 'Sin responsable'}</span>
            </div>
            {!guaranteeCase.isCompleted && (
              <button type="button" onClick={() => setEditingNextManagement(true)} className="shrink-0 px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-[11px] font-bold inline-flex items-center gap-1.5 cursor-pointer">
                <Edit3 className="w-3.5 h-3.5" /> Editar
              </button>
            )}
          </div>
        )}
      </section>

      <section className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <button type="button" onClick={() => setShowDetails(prev => !prev)} className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 cursor-pointer">
          <div>
            <span className="text-xs font-bold text-slate-700">Datos del caso</span>
            <span className="text-[10px] text-slate-400 block">Propiedad, arrendatario y propietario</span>
          </div>
          {showDetails ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {showDetails && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border-t border-slate-100 divide-y md:divide-y-0 md:divide-x divide-slate-100 text-xs">
            <div className="p-4 space-y-1 text-slate-600">
              <strong className="text-slate-800 block mb-2">Propiedad</strong>
              <div>{guaranteeCase.propertyAddress}, {guaranteeCase.propertyUnit}</div>
              <div>{guaranteeCase.propertyComuna}</div>
              <div>Arriendo {formatCLP(guaranteeCase.monthlyRent)}</div>
            </div>
            <div className="p-4 space-y-1 text-slate-600">
              <strong className="text-slate-800 block mb-2">Arrendatario</strong>
              <div>{guaranteeCase.tenantName}</div>
              <div>{guaranteeCase.tenantRut || 'RUT no registrado'}</div>
              <div>{guaranteeCase.tenantEmail || 'Email no registrado'}</div>
              <div>{guaranteeCase.tenantPhone || 'Teléfono no registrado'}</div>
            </div>
            <div className="p-4 space-y-1 text-slate-600">
              <strong className="text-slate-800 block mb-2">Propietario</strong>
              <div>{guaranteeCase.ownerName}</div>
              <div>{guaranteeCase.ownerRut || 'RUT no registrado'}</div>
              <div>{guaranteeCase.ownerEmail || 'Email no registrado'}</div>
              <div>{guaranteeCase.ownerPhone || 'Teléfono no registrado'}</div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
