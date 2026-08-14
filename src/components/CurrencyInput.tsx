import React from 'react';

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange' | 'min' | 'max'> {
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  allowNegative?: boolean;
}

const formatInteger = (value: number) => new Intl.NumberFormat('es-CL', {
  maximumFractionDigits: 0
}).format(Math.abs(Math.trunc(value)));

/**
 * Input monetario visual para CLP.
 * Mantiene números puros en el estado de negocio, pero muestra separadores de miles
 * mientras el usuario escribe: 100000 -> 100.000.
 */
export const CurrencyInput: React.FC<CurrencyInputProps> = ({
  value,
  onValueChange,
  min,
  max,
  allowNegative = false,
  inputMode = 'numeric',
  ...props
}) => {
  const safeValue = Number.isFinite(value) ? Math.trunc(value) : 0;
  const displayValue = safeValue === 0
    ? ''
    : `${safeValue < 0 ? '-' : ''}${formatInteger(safeValue)}`;

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value;
    const wantsNegative = allowNegative && raw.trim().startsWith('-');
    const digits = raw.replace(/\D/g, '');

    if (!digits) {
      onValueChange(0);
      return;
    }

    let next = Number(digits);
    if (wantsNegative) next *= -1;

    if (typeof min === 'number') next = Math.max(min, next);
    if (typeof max === 'number') next = Math.min(max, next);

    onValueChange(next);
  };

  return (
    <input
      {...props}
      type="text"
      inputMode={inputMode}
      value={displayValue}
      onChange={handleChange}
    />
  );
};
