import React, { useRef } from 'react';
import { useApp } from '../context/AppContext';
import { GuaranteeCase } from '../types';
import { formatCLP, formatDate } from '../utils/formatters';
import { calculateGuaranteeFinances } from '../utils/calculations';
import { printElementAsPdf } from '../utils/printElementAsPdf';
import { FaunaIsotipo } from './FaunaBrand';
import { X, Download, FileText } from 'lucide-react';

interface TenantLiquidationDocModalProps {
  isOpen?: boolean;
  onClose: () => void;
  guaranteeCase: GuaranteeCase;
}

export const TenantLiquidationDocModal: React.FC<TenantLiquidationDocModalProps> = ({
  isOpen = true,
  onClose,
  guaranteeCase
}) => {
  const { settings } = useApp();
  const documentRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const liveFin = calculateGuaranteeFinances(guaranteeCase, settings);
  const snapshot = guaranteeCase.liquidationSnapshot;
  const isDraft = guaranteeCase.liquidationStatus !== 'EMITIDA' || !snapshot;
  const charges = snapshot?.charges || guaranteeCase.charges;
  const issueDate = snapshot?.issuedDate || formatDate(new Date().toISOString().split('T')[0]);
  const documentNumber = snapshot?.tenantDocumentNumber || `LIQ-AR-${guaranteeCase.id}`;

  const guaranteeAmount = snapshot?.financials.guaranteeAmount ?? liveFin.guaranteeAmount;
  const totalCharges = snapshot?.financials.totalCharges ?? liveFin.totalCharges;
  const refundToTenant = snapshot?.financials.refundToTenant ?? liveFin.refundToTenant;
  const tenantDeficit = snapshot?.financials.tenantDeficit ?? liveFin.tenantDeficit;
  const rawBalance = guaranteeAmount - totalCharges;
  const isSurplus = rawBalance > 0;
  const isExact = rawBalance === 0;
  const isInsufficient = rawBalance < 0;

  const tenantName = snapshot?.tenantName || guaranteeCase.tenantName;
  const tenantRut = snapshot?.tenantRut || guaranteeCase.tenantRut;
  const tenantEmail = snapshot?.tenantEmail || guaranteeCase.tenantEmail;
  const propertyAddress = snapshot?.propertyAddress || guaranteeCase.propertyAddress;
  const propertyUnit = snapshot?.propertyUnit || guaranteeCase.propertyUnit;
  const propertyComuna = snapshot?.propertyComuna || guaranteeCase.propertyComuna;
  const receptionDate = snapshot?.receptionDate || guaranteeCase.receptionDate;

  const handleDownload = () => printElementAsPdf(
    documentRef.current,
    `Liquidacion_arrendatario_${guaranteeCase.id}`
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-[794px] w-full my-6 overflow-hidden border border-slate-200 flex flex-col max-h-[95vh]">
        <div className="bg-[#1E382B] text-white p-4 flex items-center justify-between border-b border-emerald-900 print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm">Vista Previa: Liquidación de Garantía - Arrendatario</h3>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleDownload} className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs">
              <Download className="w-4 h-4" /> Guardar PDF
            </button>
            <button onClick={onClose} className="p-1 text-slate-300 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
          </div>
        </div>

        <div ref={documentRef} className="p-8 space-y-6 overflow-y-auto font-sans text-slate-800 text-xs bg-white">
          {isDraft && (
            <div className="border-2 border-dashed border-amber-300 bg-amber-50 text-amber-900 rounded-xl px-4 py-2 text-center text-xs font-extrabold tracking-[0.2em] uppercase">
              BORRADOR · NO EMITIDO
            </div>
          )}

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
              <span className="text-xs uppercase font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200 block w-fit ml-auto mb-1">LIQUIDACIÓN DE GARANTÍA</span>
              <p className="text-slate-500 font-mono text-[11px]">N° Documento: <strong>{documentNumber}</strong></p>
              <p className="text-slate-500 text-[11px]">Fecha Emisión: <strong>{isDraft ? 'Pendiente de confirmar' : issueDate}</strong></p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Datos del Arrendatario</span>
              <strong className="text-slate-900 text-sm block">{tenantName}</strong>
              <p className="text-slate-600">RUT: {tenantRut || 'N/A'}</p>
              <p className="text-slate-600">Email: {tenantEmail || 'N/A'}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Propiedad Arrendada</span>
              <strong className="text-slate-900 text-sm block">{propertyAddress}, {propertyUnit}</strong>
              <p className="text-slate-600">Comuna: {propertyComuna}</p>
              <p className="text-slate-600">Fecha Recepción Propiedad: {formatDate(receptionDate)}</p>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 text-sm uppercase tracking-wider border-b border-slate-200 pb-1">Detalle de cargos y abonos</h4>

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
                {charges.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-slate-500 italic">No se registraron cargos ni abonos para esta liquidación.</td>
                  </tr>
                ) : charges.map((ch, idx) => {
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
              <tfoot className="border-t-2 border-slate-300 bg-slate-50">
                <tr className="border-b border-slate-200">
                  <td colSpan={3} className="p-2.5 text-right text-slate-600 font-semibold">Total cargos y abonos</td>
                  <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                    {totalCharges < 0 ? '+' : '-'}{formatCLP(Math.abs(totalCharges))}
                  </td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td colSpan={3} className="p-2.5 text-right text-slate-600">Garantía recibida en custodia</td>
                  <td className="p-2.5 text-right font-mono font-bold text-emerald-700">+{formatCLP(guaranteeAmount)}</td>
                </tr>
                <tr className="bg-white border-t-2 border-slate-300">
                  <td colSpan={3} className="p-3 text-right text-sm font-extrabold text-slate-900">RESULTADO LIQUIDACIÓN</td>
                  <td className={`p-3 text-right font-mono text-base font-black ${isInsufficient ? 'text-amber-700' : 'text-emerald-700'}`}>
                    {isSurplus && `${formatCLP(refundToTenant)} A DEVOLVER`}
                    {isExact && '$0'}
                    {isInsufficient && `${formatCLP(tenantDeficit)} PENDIENTE`}
                  </td>
                </tr>
                <tr className="bg-white">
                  <td colSpan={4} className="px-3 pb-3 text-right text-[10px] text-slate-500">
                    {isSurplus && 'Saldo a favor del arrendatario'}
                    {isExact && 'Liquidación sin saldo pendiente'}
                    {isInsufficient && 'Saldo pendiente de pago del arrendatario'}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
