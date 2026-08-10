import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { CaseAttachment, GuaranteeCase } from '../../types';
import { formatDate } from '../../utils/formatters';
import { FileText, Paperclip, Upload, Download } from 'lucide-react';

interface DocumentsTabProps {
  guaranteeCase: GuaranteeCase;
}

const inferFileType = (name: string): CaseAttachment['type'] => {
  const extension = name.split('.').pop()?.toLowerCase();
  if (extension === 'jpg' || extension === 'jpeg') return 'JPG';
  if (extension === 'png') return 'PNG';
  if (extension === 'doc' || extension === 'docx') return 'DOC';
  return 'PDF';
};

export const DocumentsTab: React.FC<DocumentsTabProps> = ({ guaranteeCase }) => {
  const { addAttachment } = useApp();

  const [name, setName] = useState('');
  const [category, setCategory] = useState('Comprobante');
  const todayStr = new Date().toISOString().split('T')[0];

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    addAttachment(guaranteeCase.id, {
      name: name.trim(),
      type: inferFileType(name),
      date: formatDate(todayStr),
      url: '#',
      category
    });

    setName('');
    alert('Documento adjuntado exitosamente.');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
          <Paperclip className="w-4 h-4 text-emerald-600" />
          Adjuntar documento
        </h3>

        <form onSubmit={handleUpload} className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="sm:col-span-2">
            <label className="block font-semibold text-slate-700 mb-1">Nombre o descripción *</label>
            <input
              type="text"
              required
              placeholder="Ej. cotizacion_pintura.pdf"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs"
            />
            <span className="text-[10px] text-slate-400 block mt-1">El formato del archivo se identifica automáticamente.</span>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Categoría</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs">
              <option value="Inventario / Acta">Inventario / Acta</option>
              <option value="Presupuesto / Cotización">Presupuesto / Cotización</option>
              <option value="Gastos comunes / Servicios">Gastos comunes / Servicios</option>
              <option value="Factura / Boleta">Factura / Boleta</option>
              <option value="Comprobante">Comprobante de pago</option>
              <option value="Liquidación">Liquidación</option>
              <option value="Comunicación">Comunicación</option>
              <option value="Otro">Otro</option>
            </select>
          </div>

          <div className="sm:col-span-3 text-right">
            <button type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer inline-flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5" /> Adjuntar archivo
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-3">
        <h4 className="font-bold text-xs uppercase text-slate-700 tracking-wider">Documentos vinculados ({guaranteeCase.attachments.length})</h4>

        {guaranteeCase.attachments.length === 0 ? (
          <div className="p-6 text-center text-slate-400 text-xs">No existen archivos adjuntos vinculados a este caso.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
            {guaranteeCase.attachments.map(att => (
              <div key={att.id} className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 overflow-hidden">
                  <FileText className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div className="truncate">
                    <p className="font-bold text-slate-800 text-xs truncate">{att.name}</p>
                    <span className="text-[10px] text-slate-500 font-medium block">{att.category || 'Sin categoría'} • {att.date}</span>
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
