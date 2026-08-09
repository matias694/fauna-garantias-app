import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { GuaranteeCase } from '../../types';
import { formatCLP, formatDate, calculateDaysDifference } from '../../utils/formatters';
import { calculateGuaranteeFinances } from '../../utils/calculations';
import { Building, User, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

interface SummaryTabProps {
  guaranteeCase: GuaranteeCase;
}

export const SummaryTab: React.FC<SummaryTabProps> = ({ guaranteeCase }) => {
  const { updateGuaranteeCase, settings, receivables } = useApp();

  const [nextManagement, setNextManagement] = useState(guaranteeCase.nextManagement || '');
  const [nextDate, setNextDate] = useState(guaranteeCase.nextManagementDate || '');
  const [nextResp, setNextResp] = useState(guaranteeCase.nextManagementResponsible || guaranteeCase.responsible || '');

  useEffect(() => {
    setNextManagement(guaranteeCase.nextManagement || '');
    setNextDate(guaranteeCase.nextManagementDate || '');
    setNextResp(guaranteeCase.nextManagementResponsible || guaranteeCase.responsible || '');
  }, [guaranteeCase.id, guaranteeCase.nextManagement, guaranteeCase.nextManagementDate, guaranteeCase.nextManagementResponsible, guaranteeCase.responsible]);

  const fin = calculateGuaranteeFinances(guaranteeCase, settings);
  const receivable = receivables.find(r => r.caseId === guaranteeCase.id);
  const daysInProcess = calculateDaysDifference(guaranteeCase.receptionDate);
  const isOverdue = daysInProcess > settings.maxLiquidationDays;
  const isNearDeadline = daysInProcess >= settings.alertDay && !isOverdue;
  const shouldShowDeadlineAlert = !guaranteeCase.isCompleted && !guaranteeCase.isClosed && (isOverdue || isNearDeadline);
  const liquidationLabel = guaranteeCase.liquidationStatus === 'EN_PREPARACION'
    ? 'EN PREPARACIÓN'
    : guaranteeCase.liquidationStatus === 'EMITIDA'
      ? 'CONFIRMADA'
      : guaranteeCase.liquidationStatus;

  const handleSaveNextManagement = (e: React.FormEvent) => {
    e.preventDefault();
    updateGuaranteeCase(guaranteeCase.id, {
      nextManagement,
      nextManagementDate: nextDate,
      nextManagementResponsible: nextResp
    });
    alert('Próxima gestión actualizada correctamente.');
  };

  const resultLabel = fin.isSurplus
    ? `Devolver ${formatCLP(fin.refundToTenant)}`
    : fin.isInsufficient
      ? `Debe ${formatCLP(fin.tenantDeficit)}`
      : 'Sin saldo';

  const formatClosedAt = (value?: string) => {
    if (!value) return 'Fecha no registrada';

    const legacy = value.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4}),?\s*(\d{1,2}):(\d{2})(?::\d{2})?\s*([ap])\.?\s*m\.?$/i);
    if (legacy) {
      const [, day, month, year, rawHour, minute, period] = legacy;
      let hour = Number(rawHour);
      if (period.toLowerCase() === 'p' && hour < 12) hour += 12;
      if (period.toLowerCase() === 'a' && hour === 12) hour = 0;
      return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year} · ${String(hour).padStart(2, '0')}:${minute}`;
    }

    const simple = value.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(?:[ T,]+(\d{1,2}):(\d{2})(?::\d{2})?)?$/);
    if (simple) {
      const [, day, month, year, hour, minute] = simple;
      return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}${hour && minute ? ` · ${hour.padStart(2, '0')}:${minute}` : ''}`;
    }

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
    <div className="space-y-5">
      <section className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-md space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            <div className="bg-slate-800 px-3 py-2 rounded-xl border border-slate-700">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Preparación</span>
              <strong className={`text-xs ${guaranteeCase.preparationStatus === 'LISTA' ? 'text-emerald-300' : guaranteeCase.preparationStatus === 'REPARANDO' ? 'text-amber-300' : 'text-slate-200'}`}>
                {guaranteeCase.preparationStatus}
              </strong>
            </div>

            <div className="bg-slate-800 px-3 py-2 rounded-xl border border-slate-700">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Liquidación</span>
              <strong className={`text-xs ${guaranteeCase.liquidationStatus === 'EMITIDA' ? 'text-purple-300' : guaranteeCase.liquidationStatus === 'LISTA' ? 'text-emerald-300' : 'text-amber-300'}`}>
                {liquidationLabel}
              </strong>
            </div>

            <div className="bg-slate-800 px-3 py-2 rounded-xl border border-slate-700">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Resultado</span>
              <strong className={`text-xs ${fin.isSurplus ? 'text-emerald-300' : fin.isInsufficient ? 'text-rose-300' : 'text-slate-200'}`}>
                {resultLabel}
              </strong>
              {receivable && receivable.pendingBalance > 0 && (
                <span className="text-[10px] text-rose-200 block mt-0.5">
                  Saldo vigente: {formatCLP(receivable.pendingBalance)}
                </span>
              )}
            </div>

            {guaranteeCase.blockedBy !== 'SIN_BLOQUEO' && (
              <div className="bg-amber-950/60 px-3 py-2 rounded-xl border border-amber-700/70">
                <span className="text-[10px] uppercase font-bold text-amber-300 block">Bloqueado por</span>
                <strong className="text-xs text-amber-100">{guaranteeCase.blockedBy.replace(/_/g, ' ')}</strong>
                {guaranteeCase.blockedReasonNotes && (
                  <span className="text-[10px] text-amber-200 block mt-0.5 max-w-xs">{guaranteeCase.blockedReasonNotes}</span>
                )}
              </div>
            )}

            {guaranteeCase.isCompleted && (
              <div className="bg-emerald-600 px-3 py-2 rounded-xl font-black text-xs uppercase flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Caso completado
              </div>
            )}
          </div>

          <div className="text-xs text-slate-300 lg:text-right">
            <div>Recepción: <strong className="text-white">{formatDate(guaranteeCase.receptionDate)}</strong></div>
            <div>Límite: <strong className="text-white">{formatDate(guaranteeCase.deadlineDate)}</strong></div>
            {shouldShowDeadlineAlert && (
              <span className={`inline-flex items-center gap-1 mt-2 px-2 py-1 rounded border font-bold ${isOverdue ? 'bg-rose-950 text-rose-200 border-rose-800' : 'bg-amber-950 text-amber-200 border-amber-800'}`}>
                <AlertTriangle className="w-3 h-3" />
                {isOverdue ? `Vencido · ${daysInProcess} días` : `Alerta · ${daysInProcess} días`}
              </span>
            )}
          </div>
        </div>

        {guaranteeCase.isClosed ? (
          <div className="bg-emerald-950/40 p-3.5 rounded-xl border border-emerald-800/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] uppercase font-bold text-emerald-300 block">Caso cerrado</span>
              <strong className="text-sm text-white">Sin gestiones pendientes</strong>
            </div>
            <div className="sm:text-right text-xs">
              <span className="text-slate-400 block">Cierre / Responsable</span>
              <strong className="text-emerald-300">
                {formatClosedAt(guaranteeCase.closedAt)} · {guaranteeCase.closedBy || 'Sin responsable'}
              </strong>
            </div>
          </div>
        ) : (
          <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Próxima gestión</span>
              {guaranteeCase.nextManagement ? (
                <strong className="text-sm text-white">{guaranteeCase.nextManagement}</strong>
              ) : (
                <span className="text-amber-300 text-xs font-bold">Sin próxima gestión programada</span>
              )}
            </div>
            <div className="sm:text-right text-xs">
              <span className="text-slate-400 block">Fecha / Responsable</span>
              <strong className="text-emerald-300">
                {guaranteeCase.nextManagementDate || 'Sin fecha'} · {guaranteeCase.nextManagementResponsible || guaranteeCase.responsible || 'Sin responsable'}
              </strong>
            </div>
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase block">Garantía</span>
          <span className="text-xl font-black text-slate-900 font-mono">{formatCLP(fin.guaranteeAmount)}</span>
          <span className="text-[11px] text-slate-400 block">Plan {guaranteeCase.plan}</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase block">Cargos</span>
          <span className="text-xl font-black text-slate-900 font-mono">{formatCLP(fin.totalCharges)}</span>
          <span className="text-[11px] text-slate-400 block">{guaranteeCase.charges.length} cargos registrados</span>
        </div>

        <div className={`p-4 rounded-xl border shadow-xs ${fin.isSurplus ? 'bg-emerald-50 border-emerald-200' : fin.isInsufficient ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200'}`}>
          <span className="text-[10px] font-bold text-slate-500 uppercase block">Resultado liquidación</span>
          <span className={`text-lg font-black ${fin.isSurplus ? 'text-emerald-800' : fin.isInsufficient ? 'text-rose-800' : 'text-slate-800'}`}>
            {resultLabel}
          </span>
          {receivable && receivable.pendingBalance > 0 && (
            <span className="text-[11px] text-rose-700 font-bold block mt-1">
              Saldo actual por cobrar: {formatCLP(receivable.pendingBalance)}
            </span>
          )}
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase block">Ejecución</span>
          <div className="text-xs text-slate-700 mt-1 space-y-1">
            <div>Devolución: <strong>{guaranteeCase.refund?.status || 'No aplica'}</strong></div>
            <div>Por cobrar: <strong>{guaranteeCase.receivableStatus?.replace(/_/g, ' ') || 'No aplica'}</strong></div>
            {receivable && (
              <div>Saldo vigente: <strong className={receivable.pendingBalance > 0 ? 'text-rose-700' : 'text-emerald-700'}>{formatCLP(receivable.pendingBalance)}</strong></div>
            )}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <h4 className="font-bold text-xs uppercase text-slate-700 border-b border-slate-100 pb-2 flex items-center gap-1.5">
            <Building className="w-4 h-4 text-emerald-600" /> Propiedad
          </h4>
          <div className="text-xs space-y-1.5 text-slate-700 mt-2">
            <div><strong>Dirección:</strong> {guaranteeCase.propertyAddress}</div>
            <div><strong>Unidad:</strong> {guaranteeCase.propertyUnit || 'N/A'}</div>
            <div><strong>Comuna:</strong> {guaranteeCase.propertyComuna}</div>
            <div><strong>Arriendo:</strong> {formatCLP(guaranteeCase.monthlyRent)}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <h4 className="font-bold text-xs uppercase text-slate-700 border-b border-slate-100 pb-2 flex items-center gap-1.5">
            <User className="w-4 h-4 text-emerald-600" /> Arrendatario
          </h4>
          <div className="text-xs space-y-1.5 text-slate-700 mt-2">
            <div><strong>Nombre:</strong> {guaranteeCase.tenantName}</div>
            <div><strong>RUT:</strong> {guaranteeCase.tenantRut || 'N/A'}</div>
            <div><strong>Email:</strong> {guaranteeCase.tenantEmail || 'N/A'}</div>
            <div><strong>Teléfono:</strong> {guaranteeCase.tenantPhone || 'N/A'}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <h4 className="font-bold text-xs uppercase text-slate-700 border-b border-slate-100 pb-2 flex items-center gap-1.5">
            <User className="w-4 h-4 text-slate-500" /> Propietario
          </h4>
          <div className="text-xs space-y-1.5 text-slate-700 mt-2">
            <div><strong>Nombre:</strong> {guaranteeCase.ownerName}</div>
            <div><strong>RUT:</strong> {guaranteeCase.ownerRut || 'N/A'}</div>
            <div><strong>Email:</strong> {guaranteeCase.ownerEmail || 'N/A'}</div>
            <div><strong>Teléfono:</strong> {guaranteeCase.ownerPhone || 'N/A'}</div>
          </div>
        </div>
      </section>

      {!guaranteeCase.isClosed && (
        <section className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <h4 className="font-bold text-xs uppercase text-slate-700 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-emerald-600" /> Actualizar próxima gestión
          </h4>

          <form onSubmit={handleSaveNextManagement} className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
            <div className="md:col-span-2">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Acción *</label>
              <input
                type="text"
                required
                placeholder="Ej. Confirmar costo de pintura"
                value={nextManagement}
                onChange={(e) => setNextManagement(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Fecha</label>
              <input
                type="text"
                placeholder="DD/MM/AAAA"
                value={nextDate}
                onChange={(e) => setNextDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Responsable</label>
              <select
                value={nextResp}
                onChange={(e) => setNextResp(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs"
              >
                <option value="">Sin responsable</option>
                {settings.responsiblesList.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            <div className="md:col-span-4 text-right pt-2 border-t border-slate-100">
              <button type="submit" className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold text-xs shadow-xs cursor-pointer">
                Guardar próxima gestión
              </button>
            </div>
          </form>
        </section>
      )}
    </div>
  );
};
