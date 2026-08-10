import React from 'react';
import { useApp } from '../context/AppContext';
import { GuaranteeCase } from '../types';
import { formatCLP, formatDate } from '../utils/formatters';
import {
  calculateGuaranteeFinances,
  calculateOwnerLiquidationReconciliation
} from '../utils/calculations';
import { FaunaIsotipo } from './FaunaBrand';
import { X, Printer, FileText, ShieldCheck } from 'lucide-react';

interface OwnerLiquidationDocModalProps {
  isOpen?: boolean;
  onClose: () => void;
  guaranteeCase: GuaranteeCase;
}

export const OwnerLiquidationDocModal: React.FC<OwnerLiquidationDocModalProps> = ({
  isOpen = true,
  onClose,
  guaranteeCase
}) => {
  const { settings } = useApp();

  if (!isOpen) return null;

  const fin = calculateGuaranteeFinances(guaranteeCase, settings);
  const ownerSettlement = calculateOwnerLiquidationReconciliation(guaranteeCase, settings);
  const todayStr = formatDate(new Date().toISOString().split('T')[0]);
  const ownerTotalPending = ownerSettlement.ownerRepairPending + ownerSettlement.ownerServicePending;
  const hasFullBenefit = guaranteeCase.plan === 'FULL' && fin.fullCoverageApplied > 0;

  const handlePrint = () => window.print();

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full my-6 overflow-hidden border border-slate-200 flex flex-col max-h-[95vh]">
        <div className="bg-[#1E382B] text-white p-4 flex items-center justify-between border-b border-emerald-900 print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm">Vista Previa: Liquidación de Garantía - Propietario</h3>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handlePrint} className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs">
              <Printer className="w-4 h-4" /> Imprimir / Guardar PDF
            </button>
            <button onClick={onClose} className="p-1 text-slate-300 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
          </div>
        </div>

        <div className="p-8 space-y-6 overflow-y-auto font-sans text-slate-800 text-xs bg-white print:p-0 print:overflow-visible">
          <div className="flex items-start justify-between border-b border-slate-200 pb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#1E382B] text-white flex items-center justify-center p-2">
                <FaunaIsotipo className="w-full h-full text-white" color="#FFFFFF" />
              </div>
              <div>
                <h1 className="font-extrabold text-xl tracking-tight text-[#1E382B]">FAUNA PROPIEDADES</h1>
                <p className="text-[11px] text-slate-500 font-medium">{settings.faunaAddress} • RUT: {settings.faunaRut}</p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs uppercase font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200 block w-fit ml-auto mb-1">LIQUIDACIÓN DE GARANTÍA · PROPIETARIO</span>
              <p className="text-slate-500 font-mono text-[11px]">N° Documento: <strong>LIQ-PROP-{guaranteeCase.id}</strong></p>
              <p className="text-slate-500 text-[11px]">Fecha Emisión: <strong>{todayStr}</strong></p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Datos del Propietario</span>
              <strong className="text-slate-900 text-sm block">{guaranteeCase.ownerName}</strong>
              <p className="text-slate-600">RUT: {guaranteeCase.ownerRut || 'N/A'}</p>
              <p className="text-slate-600">Plan contratado: <strong>Plan {guaranteeCase.plan}</strong></p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Propiedad Arrendada</span>
              <strong className="text-slate-900 text-sm block">{guaranteeCase.propertyAddress}, {guaranteeCase.propertyUnit}</strong>
              <p className="text-slate-600">Comuna: {guaranteeCase.propertyComuna}</p>
              <p className="text-slate-600">Arrendatario saliente: {guaranteeCase.tenantName}</p>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 text-sm uppercase tracking-wider border-b border-slate-200 pb-1">Detalle de cargos y abonos</h4>

            {guaranteeCase.charges.length === 0 ? (
              <p className="text-slate-500 italic">No se registraron cargos ni abonos para esta liquidación.</p>
            ) : (
              <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">N° / Fecha</th>
                    <th className="p-2.5">Movimiento</th>
                    <th className="p-2.5">Concepto / Descripción</th>
                    <th className="p-2.5 text-right">Monto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {guaranteeCase.charges.map((ch, idx) => {
                    const isCredit = ch.amount < 0;
                    return (
                      <tr key={ch.id}>
                        <td className="p-2.5 font-mono text-slate-500 text-[11px]">{idx + 1} • {formatDate(ch.date)}</td>
                        <td className={`p-2.5 font-bold ${isCredit ? 'text-emerald-700' : 'text-rose-700'}`}>{isCredit ? 'Abono' : 'Cargo'}</td>
                        <td className="p-2.5 text-slate-800"><strong>{ch.category.replace(/_/g, ' ')}</strong><br />{ch.description}</td>
                        <td className={`p-2.5 text-right font-mono font-bold ${isCredit ? 'text-emerald-700' : 'text-slate-900'}`}>
                          {isCredit ? '+' : '-'}{formatCLP(Math.abs(ch.amount))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div className="bg-slate-900 text-white p-5 rounded-xl space-y-3 shadow-sm">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-300">Garantía disponible del contrato:</span>
              <strong className="font-mono text-sm text-white">{formatCLP(fin.guaranteeAmount)}</strong>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-300">(-) Neto de cargos y abonos:</span>
              <strong className="font-mono text-sm text-rose-300">-{formatCLP(fin.totalCharges)}</strong>
            </div>

            {hasFullBenefit && (
              <div className="flex justify-between items-center text-xs text-purple-300">
                <span>(+) Cobertura Plan Full aplicada a daños:</span>
                <strong className="font-mono text-sm">+{formatCLP(fin.fullCoverageApplied)}</strong>
              </div>
            )}

            {ownerSettlement.refundToTenant > 0 && (
              <div className="flex justify-between items-center text-xs text-emerald-200">
                <span>Saldo de garantía a devolver al arrendatario:</span>
                <strong className="font-mono text-sm">{formatCLP(ownerSettlement.refundToTenant)}</strong>
              </div>
            )}

            {ownerSettlement.ownerContributionRequired > 0 && (
              <div className="border-t border-slate-700 pt-3 space-y-1.5">
                <div className="flex justify-between items-center text-xs text-amber-200">
                  <span>Diferencia total a cargo del propietario:</span>
                  <strong className="font-mono text-sm">{formatCLP(ownerSettlement.ownerContributionRequired)}</strong>
                </div>
                <div className="text-right text-[10px] text-slate-400">
                  {ownerSettlement.ownerRepairFundingRequired > 0 && (
                    <span>{formatCLP(ownerSettlement.ownerRepairFundingRequired)} reparaciones</span>
                  )}
                  {ownerSettlement.ownerRepairFundingRequired > 0 && ownerSettlement.ownerServiceObligation > 0 && <span> · </span>}
                  {ownerSettlement.ownerServiceObligation > 0 && (
                    <span>{formatCLP(ownerSettlement.ownerServiceObligation)} gastos comunes/servicios</span>
                  )}
                </div>
              </div>
            )}

            {ownerSettlement.ownerContributionApplied > 0 && (
              <div className="flex justify-between items-center text-xs text-blue-300">
                <span>(-) Fondos ya pagados/provisionados por el propietario:</span>
                <strong className="font-mono text-sm">-{formatCLP(ownerSettlement.ownerContributionApplied)}</strong>
              </div>
            )}

            <div className="border-t border-slate-700 pt-3 flex justify-between items-center text-sm font-bold gap-4">
              <span>SALDO FINAL PROPIETARIO:</span>
              {ownerTotalPending > 0 ? (
                <span className="font-mono text-amber-300 text-right text-lg">{formatCLP(ownerTotalPending)} PENDIENTE</span>
              ) : (
                <span className="font-mono text-emerald-400 text-lg">$0</span>
              )}
            </div>

            {ownerTotalPending > 0 && (
              <div className="text-right text-[10px] text-slate-300">
                {ownerSettlement.ownerRepairPending > 0 && <span>{formatCLP(ownerSettlement.ownerRepairPending)} reparaciones</span>}
                {ownerSettlement.ownerRepairPending > 0 && ownerSettlement.ownerServicePending > 0 && <span> · </span>}
                {ownerSettlement.ownerServicePending > 0 && <span>{formatCLP(ownerSettlement.ownerServicePending)} gastos comunes/servicios</span>}
              </div>
            )}
          </div>

          {hasFullBenefit && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex items-start gap-3 text-emerald-950">
              <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <span className="block text-[10px] font-extrabold uppercase tracking-wider text-emerald-700">Beneficio Plan Full aplicado</span>
                <p className="text-xs leading-relaxed mt-0.5">
                  La cobertura aplicada redujo en igual monto la diferencia que habría debido asumir el propietario por daños y reparaciones. El Plan Full no cubre gastos comunes ni servicios.
                </p>
              </div>
            </div>
          )}

          <p className="text-[10px] text-slate-500 leading-relaxed">
            Este documento refleja la liquidación del contrato y sus cargos, abonos y coberturas aplicadas. Los respaldos asociados se conservan en el expediente del caso.
          </p>
        </div>
      </div>
    </div>
  );
};
