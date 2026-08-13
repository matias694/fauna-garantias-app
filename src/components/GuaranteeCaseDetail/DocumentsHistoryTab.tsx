import React, { useState } from 'react';
import { GuaranteeCase } from '../../types';
import { DocumentsTab } from './DocumentsTab';
import { HistoryTab } from './HistoryTab';
import { FinancialTracePanel } from './FinancialTracePanel';
import { FileText, History } from 'lucide-react';

interface DocumentsHistoryTabProps {
  guaranteeCase: GuaranteeCase;
}

export const DocumentsHistoryTab: React.FC<DocumentsHistoryTabProps> = ({ guaranteeCase }) => {
  const [section, setSection] = useState<'documents' | 'history'>('documents');

  return (
    <div className="space-y-5">
      <div className="bg-white border border-slate-200 rounded-2xl p-2 inline-flex gap-1 shadow-xs">
        <button
          type="button"
          onClick={() => setSection('documents')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-2 transition-all cursor-pointer ${
            section === 'documents' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-4 h-4" />
          Documentos ({guaranteeCase.attachments.length})
        </button>
        <button
          type="button"
          onClick={() => setSection('history')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-2 transition-all cursor-pointer ${
            section === 'history' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <History className="w-4 h-4" />
          Historial
        </button>
      </div>

      {section === 'documents' ? (
        <DocumentsTab guaranteeCase={guaranteeCase} />
      ) : (
        <div className="space-y-5">
          <FinancialTracePanel guaranteeCase={guaranteeCase} />
          <HistoryTab guaranteeCase={guaranteeCase} />
        </div>
      )}
    </div>
  );
};
