/**
 * Utility functions for formatting CLP currency and DD/MM/AAAA dates.
 */

export function formatCLP(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '$0';
  }
  const isNegative = amount < 0;
  const absAmount = Math.abs(Math.round(amount));
  const formatted = absAmount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return isNegative ? `-$${formatted}` : `$${formatted}`;
}

/** Fecha calendario local en formato YYYY-MM-DD para inputs HTML.
 * Evita usar toISOString(), que convierte a UTC y puede adelantar/atrasar un día.
 */
export function getLocalDateInputValue(date: Date = new Date()): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Interpreta fechas de calendario sin pasar YYYY-MM-DD por UTC.
 * Los timestamps completos conservan su instante real.
 */
export function parseLocalDate(dateString: string | undefined | null): Date | null {
  if (!dateString) return null;

  const cl = dateString.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (cl) {
    const [, day, month, year] = cl;
    const d = new Date(Number(year), Number(month) - 1, Number(day));
    return isNaN(d.getTime()) ? null : d;
  }

  const input = dateString.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (input) {
    const [, year, month, day] = input;
    const d = new Date(Number(year), Number(month) - 1, Number(day));
    return isNaN(d.getTime()) ? null : d;
  }

  const parsed = new Date(dateString);
  return isNaN(parsed.getTime()) ? null : parsed;
}

export function formatDate(dateString: string | undefined | null): string {
  if (!dateString) return '-';

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) return dateString;

  const isoDate = dateString.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|T)/);
  if (isoDate) {
    const [, year, month, day] = isoDate;
    return `${day}/${month}/${year}`;
  }

  const d = parseLocalDate(dateString);
  if (!d) return dateString;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export function parseFormattedDateToInput(ddmmyyyy: string): string {
  if (!ddmmyyyy) return '';
  if (/^\d{4}-\d{2}-\d{2}(?:$|T)/.test(ddmmyyyy)) return ddmmyyyy.slice(0, 10);
  const parts = ddmmyyyy.split('/');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  }
  return ddmmyyyy;
}

export function calculateDaysDifference(fromDateStr: string, toDateStr?: string): number {
  const fromDate = parseLocalDate(fromDateStr);
  if (!fromDate) return 0;
  const toDate = toDateStr ? parseLocalDate(toDateStr) : new Date();
  if (!toDate) return 0;

  const diffTime = toDate.getTime() - fromDate.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

export function addDaysToDate(dateStr: string, days: number): string {
  const parsed = parseLocalDate(dateStr);
  const d = parsed ? new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()) : new Date();

  d.setDate(d.getDate() + days);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}
