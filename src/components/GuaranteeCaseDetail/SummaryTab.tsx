import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { GuaranteeCase, PreparationStatus } from '../../types';
import { formatCLP, formatDate, calculateDaysDifference } from '../../utils/formatters';
import { calculateGuaranteeFinances } from '../../utils/calculations';
import {
  Building,
  User,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Calendar,
  Lock,
  Wrench,
  Send,
  Banknote,
  Receipt
} from 'lucide-react';

interface SummaryTabProps {
  guaranteeCase: GuaranteeCase;
}

export const SummaryTab: React.FC<SummaryTabProps> = ({ guaranteeCase }) => {
  const { changePreparationStatus, updateGuaranteeCase, settings } = useApp();

  const [nextManagement, setNextManagement] = useState(guaranteeCase.nextManagement || '');
  const [nextDate, setNextDate] = useState(guaranteeCase.nextManagementDate || '');
  const [nextResp, setNextResp] = useState(guaranteeCase.nextManagementResponsible || guaranteeCase.responsible);

  const fin = calculateGuaranteeFinances(guaranteeCase, settings);
  const daysInProcess = calculateDaysDifference(guaranteeCase.receptionDate);
  const isOverdue = daysInProcess > 60;
  const isNearDeadline = daysInProcess >= 45 && daysInProcess <= 60;

  const handleSaveNextManagement = (e: React.FormEvent) => {
    e.preventDefault();
    updateGuaranteeCase(guaranteeCase.id, {
      nextManagement,
      nextManagementDate: nextDate,
      nextManagementResponsible: nextResp
    });
    alert('Próxima gestión actualizada correctamente.');
  };

  return (
    <div className="space-y-6">
      
      {/* SECTION 15: VISUALIZACIÓN RESUMIDA DEL CASO */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-md space-y-4">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* PREPARACIÓN */}
            <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Preparación (Trabajos Salida)</span>
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded font-black text-xs uppercase border ${
                  guaranteeCase.preparationStatus === 'LISTA'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                    : guaranteeCase.preparationStatus === 'REPARANDO'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                    : 'bg-slate-700 text-slate-300 border-slate-600'
                }`}>
                  [ {guaranteeCase.preparationStatus} ]
                </span>

                {guaranteeCase.preparationStatus === 'LISTA' && guaranteeCase.preparationReadyDate && (
                  <span className="text-[11px] text-emerald-400 font-mono font-semibold">
                    {guaranteeCase.preparationReadyDate}
                  </span>
                )}
              </div>
            </div>

            {/* LIQUIDACIÓN */}
            <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Liquidación (Estado)</span>
              <span className={`px-2.5 py-0.5 rounded font-bold text-xs uppercase border block w-fit ${
                guaranteeCase.liquidationStatus === 'EMITIDA'
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/50'
                  : guaranteeCase.liquidationStatus === 'LISTA'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/50'
              }`}>
                [ {guaranteeCase.liquidationStatus === 'EN_PREPARACION' ? 'EN PREPARACIÓN' : guaranteeCase.liquidationStatus} ]
              </span>
            </div>

            {/* BLOQUEADO POR */}
            <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Bloqueado Por</span>
              <span className={`px-2.5 py-0.5 rounded font-bold text-xs uppercase border block w-fit ${
                guaranteeCase.blockedBy !== 'SIN_BLOQUEO'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                  : 'bg-slate-700 text-slate-400 border-slate-600'
              }`}>
                {guaranteeCase.blockedBy.replace(/_/g, ' ')}
              </span>
            </div>

            {/* COMPLETADO BADGE */}
            {guaranteeCase.isCompleted && (
              <div className="bg-emerald-600 text-white p-3 rounded-xl font-black text-xs uppercase tracking-wide flex items-center gap-1.5 shadow-xs">
                <CheckCircle2 className="w-4 h-4" />
                <span>✓ CASO COMPLETADO</span>
              </div>
            )}
          </div>

          {/* DEADLINE DATES */}
          <div className="text-right text-xs text-slate-300 space-y-0.5">
            <div>Recepción: <strong className="text-white font-mono">{formatDate(guaranteeCase.receptionDate)}</strong></div>
            <div>Límite ({settings.maxLiquidationDays}d): <strong className="text-white font-mono">{formatDate(guaranteeCase.deadlineDate)}</strong></div>
            {isOverdue && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-300 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-800 mt-1">
                <AlertTriangle className="w-3 h-3" /> VENCIDO ({daysInProcess} días)
              </span>
            )}
          </div>
        </div>

        {/* PRÓXIMA GESTIÓN DISPLAY */}
        <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Próxima Gestión Registrada:</span>
            {guaranteeCase.nextManagement ? (
              <strong className="text-slate-100 text-sm block mt-0.5">{guaranteeCase.nextManagement}</strong>
            ) : (
              <span className="text-amber-400 font-bold flex items-center gap-1 mt-0.5">
                <AlertTriangle className="w-3.5 h-3.5" /> Sin próxima gestión programada
              </span>
            )}
          </div>

          {guaranteeCase.nextManagementDate && (
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block">Fecha / Responsable:</span>
              <span className="font-mono font-bold text-emerald-400">
                {guaranteeCase.nextManagementDate} ({guaranteeCase.nextManagementResponsible || guaranteeCase.responsible})
              </span>
            </div>
          )}
        </div>

      </div>

      {/* FINANCIAL SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase block mb-1">Monto Garantía Custodia</span>
          <span className="text-xl font-bold text-slate-900 font-mono">{formatCLP(fin.guaranteeAmount)}</span>
          <span className="text-[11px] text-slate-400 block mt-1">Plan contratado: <strong>{guaranteeCase.plan}</strong></span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase block mb-1">Total Cargos Registrados</span>
          <span className="text-xl font-bold text-rose-700 font-mono">{formatCLP(fin.totalCharges)}</span>
          <span className="text-[11px] text-slate-500 block mt-1">{guaranteeCase.charges.length} cargos asociados</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase block mb-1">Resultado Liquidación</span>
          {fin.isSurplus && (
            <div>
              <span className="text-xl font-bold text-emerald-700 font-mono">{formatCLP(fin.refundToTenant)}</span>
              <span className="text-[11px] text-emerald-600 block font-semibold mt-1">Devolución a Arrendatario</span>
            </div>
          )}
          {fin.isExact && (
            <div>
              <span className="text-xl font-bold text-slate-700 font-mono">$0</span>
              <span className="text-[11px] text-slate-500 block mt-1">Garantía Exacta</span>
            </div>
          )}
          {fin.isInsufficient && (
            <div>
              <span className="text-xl font-bold text-rose-700 font-mono">-{formatCLP(fin.tenantDeficit)}</span>
              <span className="text-[11px] text-rose-600 block font-semibold mt-1">Déficit (Por Cobrar)</span>
            </div>
          )}
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-600 uppercase block mb-1">Estado de Ejecución</span>
          <div className="text-xs space-y-1 mt-1 text-slate-700">
            <div>Devolución: <strong>{guaranteeCase.refund ? guaranteeCase.refund.status : 'N/A'}</strong></div>
            <div>Por Cobrar: <strong>{guaranteeCase.receivableStatus || 'N/A'}</strong></div>
          </div>
        </div>

      </div>

      {/* DETAILS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* PROPIEDAD */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
          <h4 className="font-bold text-xs uppercase text-slate-700 border-b border-slate-100 pb-2 flex items-center gap-1.5">
            <Building className="w-4 h-4 text-emerald-600" />
            Propiedad
          </h4>
          <div className="text-xs space-y-1.5 text-slate-700">
            <div><strong>Dirección:</strong> {guaranteeCase.propertyAddress}</div>
            <div><strong>Unidad:</strong> {guaranteeCase.propertyUnit || 'N/A'}</div>
            <div><strong>Comuna:</strong> {guaranteeCase.propertyComuna}</div>
            <div><strong>Canon Arriendo:</strong> <span className="font-mono font-bold text-slate-900">{formatCLP(guaranteeCase.monthlyRent)}</span></div>
          </div>
        </div>

        {/* ARRENDATARIO */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
          <h4 className="font-bold text-xs uppercase text-slate-700 border-b border-slate-100 pb-2 flex items-center gap-1.5">
            <User className="w-4 h-4 text-emerald-600" />
            Arrendatario Saliente
          </h4>
          <div className="text-xs space-y-1.5 text-slate-700">
            <div><strong>Nombre:</strong> {guaranteeCase.tenantName}</div>
            <div><strong>RUT:</strong> {guaranteeCase.tenantRut || 'N/A'}</div>
            <div><strong>Email:</strong> {guaranteeCase.tenantEmail || 'N/A'}</div>
            <div><strong>Teléfono:</strong> {guaranteeCase.tenantPhone || 'N/A'}</div>
          </div>
        </div>

        {/* PROPIETARIO */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
          <h4 className="font-bold text-xs uppercase text-slate-700 border-b border-slate-100 pb-2 flex items-center gap-1.5">
            <User className="w-4 h-4 text-slate-600" />
            Propietario
          </h4>
          <div className="text-xs space-y-1.5 text-slate-700">
            <div><strong>Nombre:</strong> {guaranteeCase.ownerName}</div>
            <div><strong>RUT:</strong> {guaranteeCase.ownerRut || 'N/A'}</div>
            <div><strong>Email:</strong> {guaranteeCase.ownerEmail || 'N/A'}</div>
            <div><strong>Teléfono:</strong> {guaranteeCase.ownerPhone || 'N/A'}</div>
          </div>
        </div>

      </div>

      {/* PRÓXIMA GESTIÓN EDITOR */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <h4 className="font-bold text-xs uppercase text-slate-700 flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-emerald-600" />
          Actualizar Próxima Gestión
        </h4>

        <form onSubmit={handleSaveNextManagement} className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          <div className="md:col-span-2">
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Detalle de Próxima Gestión *</label>
            <input
              type="text"
              required
              placeholder="Ej. Confirmar costo de pintura..."
              value={nextManagement}
              onChange={(e) => setNextManagement(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Fecha Programada</label>
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
              {settings.responsiblesList.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-4 text-right pt-2 border-t border-slate-100">
            <button
              type="submit"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold text-xs shadow-xs cursor-pointer"
            >
              Guardar Próxima Gestión
            </button>
          </div>
        </form>
      </div>

    </div>
  );
};
