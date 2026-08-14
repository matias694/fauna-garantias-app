import React from 'react';
import { CurrencyInput } from './CurrencyInput';
import { FinancialReceiptInput } from './FinancialReceiptInput';

interface FinancialTransactionFieldsProps {
  amount: number;
  onAmountChange?: (value: number) => void;
  amountReadOnly?: boolean;
  amountMin?: number;
  amountMax?: number;
  date: string;
  onDateChange: (value: string) => void;
  receiptFile: File | null;
  onReceiptFileChange: (file: File | null) => void;
  notes: string;
  onNotesChange: (value: string) => void;
  receiptLabel?: string;
  children?: React.ReactNode;
}

export const FinancialTransactionFields: React.FC<FinancialTransactionFieldsProps> = ({
  amount,
  onAmountChange,
  amountReadOnly = false,
  amountMin = 1,
  amountMax,
  date,
  onDateChange,
  receiptFile,
  onReceiptFileChange,
  notes,
  onNotesChange,
  receiptLabel = 'Comprobante de pago',
  children
}) => (
  <>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <label className="block font-semibold text-slate-700 mb-1">Monto *</label>
        {amountReadOnly ? (
          <CurrencyInput
            value={amount}
            onValueChange={() => undefined}
            disabled
            className="w-full bg-slate-100 border border-slate-200 rounded-lg p-2.5 font-bold font-mono text-slate-800"
          />
        ) : (
          <CurrencyInput
            value={amount}
            onValueChange={onAmountChange || (() => undefined)}
            min={amountMin}
            max={amountMax}
            required
            className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 font-bold font-mono text-slate-800"
          />
        )}
      </div>
      <div>
        <label className="block font-semibold text-slate-700 mb-1">Fecha real del movimiento *</label>
        <input
          type="date"
          required
          value={date}
          onChange={(event) => onDateChange(event.target.value)}
          className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5"
        />
      </div>
    </div>

    {children}

    <FinancialReceiptInput
      file={receiptFile}
      onFileChange={onReceiptFileChange}
      required
      label={receiptLabel}
    />

    <div>
      <label className="block font-semibold text-slate-700 mb-1">Observaciones</label>
      <textarea
        rows={2}
        value={notes}
        onChange={(event) => onNotesChange(event.target.value)}
        placeholder="Información adicional del movimiento..."
        className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5"
      />
    </div>
  </>
);
