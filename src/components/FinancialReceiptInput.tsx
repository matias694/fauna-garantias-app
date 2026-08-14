import React, { useRef, useState } from 'react';
import { FileText, Image, Paperclip, Trash2, Upload } from 'lucide-react';
import { validateFinancialReceiptFile } from '../services/financialReceiptStorage';

interface FinancialReceiptInputProps {
  file: File | null;
  onFileChange: (file: File | null) => void;
  required?: boolean;
  label?: string;
  disabled?: boolean;
}

export const FinancialReceiptInput: React.FC<FinancialReceiptInputProps> = ({
  file,
  onFileChange,
  required = true,
  label = 'Comprobante de pago',
  disabled = false
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');

  const handleFile = (nextFile?: File) => {
    if (!nextFile) return;
    const validationError = validateFinancialReceiptFile(nextFile);
    if (validationError) {
      setError(validationError);
      onFileChange(null);
      if (inputRef.current) inputRef.current.value = '';
      return;
    }
    setError('');
    onFileChange(nextFile);
  };

  const clear = () => {
    setError('');
    onFileChange(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div>
      <label className="block font-semibold text-slate-700 mb-1">{label}{required ? ' *' : ''}</label>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,image/jpeg,image/png,image/webp"
        required={required && !file}
        disabled={disabled}
        onChange={(event) => handleFile(event.target.files?.[0])}
        className="sr-only"
      />

      {file ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5">
          <div className="flex items-center gap-2 min-w-0">
            {file.type === 'application/pdf'
              ? <FileText className="w-4 h-4 text-emerald-700 shrink-0" />
              : <Image className="w-4 h-4 text-emerald-700 shrink-0" />}
            <div className="min-w-0">
              <strong className="block text-[11px] text-emerald-950 truncate">{file.name}</strong>
              <span className="text-[10px] text-emerald-700">{Math.max(1, Math.round(file.size / 1024))} KB</span>
            </div>
          </div>
          {!disabled && (
            <button type="button" onClick={clear} className="p-1.5 text-rose-600 hover:bg-white rounded-lg" aria-label="Quitar comprobante">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className="w-full rounded-xl border border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 px-4 py-4 text-left flex items-center gap-3 disabled:opacity-60"
        >
          <div className="p-2 bg-white border border-slate-200 rounded-lg text-emerald-700">
            <Upload className="w-4 h-4" />
          </div>
          <div>
            <strong className="text-xs text-slate-800 block">Adjuntar comprobante</strong>
            <span className="text-[10px] text-slate-500">PDF, JPG, PNG o WEBP · máximo 10 MB</span>
          </div>
        </button>
      )}

      {error && <p className="text-[10px] font-semibold text-rose-700 mt-1">{error}</p>}
      {!error && !file && required && (
        <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
          <Paperclip className="w-3 h-3" /> Obligatorio para confirmar el movimiento.
        </p>
      )}
    </div>
  );
};
