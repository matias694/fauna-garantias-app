import React from 'react';
import { GuaranteeCase } from '../../types';
import { FileText, Paperclip, Download, Info } from 'lucide-react';

interface DocumentsTabProps {
  guaranteeCase: GuaranteeCase;
}

export const DocumentsTab: React.FC<DocumentsTabProps> = ({ guaranteeCase }) => {
  return (
    <div className="space-y-6">
      <div className="bg-sky-50 border border-sky-200 rounded-2xl p-4 flex items-start gap-3 text-xs text-sky-950">
        <Info className="w-4 h-4 mt-0.5 shrink-0 text-sky-700" />
        <div>
          <strong className="block text-sm">Adjuntos persistentes pendientes de almacenamiento</strong>
          <p className="mt-1 leading-relaxed">
            Esta versión no simula cargas de archivos. La subida y descarga real de inventarios, cotizaciones, comprobantes y facturas se habilitará al conectar el almacenamiento del backend.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-3">
        <h4 className="font-bold text-xs uppercase text-slate-700 tracking-wider flex items-center gap-2">
          <Paperclip className="w-4 h-4 text-emerald-600" />
          Documentos vinculados ({guaranteeCase.attachments.length})
        </h4>

        {guaranteeCase.attachments.length === 0 ? (
          <div className="p-6 text-center text-slate-400 text-xs">No existen archivos adjuntos persistentes vinculados a este caso.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
            {guaranteeCase.attachments.map(att => {
              const hasRealUrl = Boolean(att.url && att.url !== '#');
              return (
                <div key={att.id} className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <FileText className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div className="truncate">
                      <p className="font-bold text-slate-800 text-xs truncate">{att.name}</p>
                      <span className="text-[10px] text-slate-500 font-medium block">{att.category || 'Sin categoría'} • {att.date}</span>
                      {!hasRealUrl && <span className="text-[9px] text-amber-700 font-bold block mt-0.5">Referencia histórica · archivo no disponible</span>}
                    </div>
                  </div>
                  {hasRealUrl && (
                    <a
                      href={att.url}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-slate-200 rounded-lg shrink-0 cursor-pointer"
                      title="Descargar"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
