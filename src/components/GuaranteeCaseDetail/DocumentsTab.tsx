import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { GuaranteeCase } from '../../types';
import { formatDate } from '../../utils/formatters';
import { FileText, Paperclip, Upload, Download, Trash2, FileCheck } from 'lucide-react';

interface DocumentsTabProps {
  guaranteeCase: GuaranteeCase;
}

export const DocumentsTab: React.FC<DocumentsTabProps> = ({ guaranteeCase }) => {
  const { addAttachment } = useApp();

  const [name, setName] = useState('');
  const [type, setType] = useState<'PDF' | 'JPG' | 'PNG' | 'DOC'>('PDF');
  const [category, setCategory] = useState('Comprobante');

  const todayStr = new Date().toISOString().split('T')[0];

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    addAttachment(guaranteeCase.id, {
      name,
      type,
      date: formatDate(todayStr),
      url: '#',
      category
    });

    setName('');
    alert('Documento adjuntado exitosamente.');
  };

  return (
    <div className="space-y-6">
      
      {/* Upload Box */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
          <Paperclip className="w-4 h-4 text-emerald-600" />
          Adjuntar Nuevo Documento de Respaldo
        </h3>

        <form onSubmit={handleUpload} className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div className="sm:col-span-2">
            <label className="block font-semibold text-slate-700 mb-1">Nombre / Descripción del Documento *</label>
            <input
              type="text"
              required
              placeholder="Ej. boleta_gastos_comunes_junio.pdf, cotizacion_pintura.pdf..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Tipo Archivo</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs"
            >
              <option value="PDF">PDF</option>
              <option value="JPG">JPG (Fotografía)</option>
              <option value="PNG">PNG (Fotografía)</option>
              <option value="DOC">DOC / Documento</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Categoría Documento</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs"
            >
              <option value="Acta de Entrega">Acta de Entrega</option>
              <option value="Gastos Comunes">Gastos Comunes</option>
              <option value="Cuenta Servicios">Cuenta de Servicios</option>
              <option value="Cotización">Cotización Maestro</option>
              <option value="Factura">Factura / Boleta</option>
              <option value="Fotografía">Fotografía</option>
              <option value="Comprobante">Comprobante Pago</option>
            </select>
          </div>

          <div className="sm:col-span-4 text-right">
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer inline-flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" /> Adjuntar Archivo
            </button>
          </div>
        </form>
      </div>

      {/* Attachments List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-3">
        <h4 className="font-bold text-xs uppercase text-slate-700 tracking-wider">Documentos y Respaldos Vinculados ({guaranteeCase.attachments.length})</h4>

        {guaranteeCase.attachments.length === 0 ? (
          <div className="p-6 text-center text-slate-400 text-xs">
            No existen archivos adjuntos vinculados a este caso.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
            {guaranteeCase.attachments.map(att => (
              <div key={att.id} className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 overflow-hidden">
                  <FileText className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div className="truncate">
                    <p className="font-bold text-slate-800 text-xs truncate">{att.name}</p>
                    <span className="text-[10px] text-slate-500 font-medium block">{att.category || att.type} • {att.date}</span>
                  </div>
                </div>
                <a
                  href="#"
                  onClick={(e) => { e.preventDefault(); alert(`Simulando descarga de ${att.name}`); }}
                  className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-slate-200 rounded-lg shrink-0 cursor-pointer"
                  title="Descargar"
                >
                  <Download className="w-4 h-4" />
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
