import React from 'react';
import { useApp } from '../context/AppContext';
import { GuaranteeCase } from '../types';
import { formatCLP, formatDate } from '../utils/formatters';
import { calculateGuaranteeFinances } from '../utils/calculations';
import { FaunaIsotipo } from './FaunaBrand';
import { X, Printer, FileText } from 'lucide-react';

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
  const todayStr = formatDate(new Date().toISOString().split('T')[0]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full my-6 overflow-hidden border border-slate-200 flex flex-col max-h-[95vh]">
        
        {/* Controls Header */}
        <div className="bg-[#1E382B] text-white p-4 flex items-center justify-between border-b border-emerald-900 print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm">Vista Previa: Informe de Estado y Liquidación de Salida - Propietario</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Printer className="w-4 h-4" /> Imprimir / Guardar PDF
            </button>
            <button onClick={onClose} className="p-1 text-slate-300 hover:text-white cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PRINTABLE DOCUMENT BODY */}
        <div className="p-8 space-y-6 overflow-y-auto font-sans text-slate-800 text-xs bg-white print:p-0 print:overflow-visible">
          
          {/* Header */}
          <div className="flex items-start justify-between border-b border-slate-200 pb-6">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#1E382B] text-white flex items-center justify-center p-2">
                  <FaunaIsotipo className="w-full h-full text-white" color="#FFFFFF" />
                </div>
                <div>
                  <h1 className="font-extrabold text-xl tracking-tight text-[#1E382B]">FAUNA PROPIEDADES</h1>
                  <p className="text-[11px] text-slate-500 font-medium">{settings.faunaAddress} • RUT: {settings.faunaRut}</p>
                </div>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs uppercase font-bold text-blue-900 bg-blue-50 px-2.5 py-1 rounded border border-blue-200 block w-fit ml-auto mb-1">
                INFORME LIQUIDACIÓN PROPIETARIO
              </span>
              <p className="text-slate-500 font-mono text-[11px]">N° Documento: <strong>LIQ-PROP-{guaranteeCase.id}</strong></p>
              <p className="text-slate-500 text-[11px]">Fecha Emisión: <strong>{todayStr}</strong></p>
            </div>
          </div>

          {/* Owner & Property Info */}
          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Propietario Mandante</span>
              <strong className="text-slate-900 text-sm block">{guaranteeCase.ownerName}</strong>
              <p className="text-slate-600">RUT: {guaranteeCase.ownerRut || 'N/A'}</p>
              <p className="text-slate-600">Plan Contratado: <strong>Plan {guaranteeCase.plan}</strong></p>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Propiedad Arrendada</span>
              <strong className="text-slate-900 text-sm block">{guaranteeCase.propertyAddress}, {guaranteeCase.propertyUnit}</strong>
              <p className="text-slate-600">Comuna: {guaranteeCase.propertyComuna}</p>
              <p className="text-slate-600">Arrendatario Saliente: {guaranteeCase.tenantName}</p>
            </div>
          </div>

          {/* Relevant Repairs Executed */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 text-sm uppercase tracking-wider border-b border-slate-200 pb-1">
              Reparaciones y Acondicionamiento de Salida Ejecutados
            </h4>

            {guaranteeCase.repairs.length === 0 ? (
              <p className="text-slate-500 italic">No fue necesario ejecutar reparaciones de salida.</p>
            ) : (
              <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">Trabajo Ejecutado</th>
                    <th className="p-2.5">Categoría</th>
                    <th className="p-2.5 text-right">Costo Final ($ CLP)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {guaranteeCase.repairs.map(rep => (
                    <tr key={rep.id}>
                      <td className="p-2.5 font-medium text-slate-800">{rep.description}</td>
                      <td className="p-2.5 text-slate-600">{rep.category}</td>
                      <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                        {formatCLP(rep.finalCost || rep.estimatedCost)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Financial Summary */}
          <div className="bg-slate-900 text-white p-5 rounded-xl space-y-3 shadow-sm">
            <h4 className="font-bold text-xs uppercase text-slate-300 border-b border-slate-700 pb-2">
              Resumen Liquidación de Garantía
            </h4>

            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-300">Garantía Disponible del Contrato:</span>
              <strong className="font-mono text-sm text-white">{formatCLP(fin.guaranteeAmount)}</strong>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-300">(-) Total Cargos / Reparaciones Cubiertas:</span>
              <strong className="font-mono text-sm text-rose-300">-{formatCLP(fin.totalCharges)}</strong>
            </div>

            {guaranteeCase.plan === 'FULL' && fin.fullCoverageApplied > 0 && (
              <div className="flex justify-between items-center text-xs text-purple-300 pt-1">
                <span>(+) Cobertura Servicios Plan Full (Aporte Servicio Fauna):</span>
                <strong className="font-mono text-sm">+{formatCLP(fin.fullCoverageApplied)}</strong>
              </div>
            )}

            {guaranteeCase.ownerContribution > 0 && (
              <div className="flex justify-between items-center text-xs text-blue-300 pt-1">
                <span>(+) Aporte Adelantado por Propietario:</span>
                <strong className="font-mono text-sm">+{formatCLP(guaranteeCase.ownerContribution)}</strong>
              </div>
            )}

            <div className="border-t border-slate-700 pt-3 flex justify-between items-center text-sm font-bold">
              <span>RESULTADO FINAL PROPIETARIO:</span>
              <span className="font-mono text-emerald-400 text-lg">$0 (Gastos Cubiertos Conforme)</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
