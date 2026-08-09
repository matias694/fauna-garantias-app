/**
 * Utility functions for formatting CLP currency and DD/MM/AAAA dates
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

export function formatDate(dateString: string | undefined | null): string {
  if (!dateString) return '-';
  
  // If already in DD/MM/YYYY format
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
    return dateString;
  }

  try {
    const [year, month, day] = dateString.split('-');
    if (year && month && day) {
      return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
    }
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  } catch {
    return dateString;
  }
}

export function parseFormattedDateToInput(ddmmyyyy: string): string {
  if (!ddmmyyyy) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(ddmmyyyy)) return ddmmyyyy;
  const parts = ddmmyyyy.split('/');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  }
  return ddmmyyyy;
}

export function calculateDaysDifference(fromDateStr: string, toDateStr?: string): number {
  if (!fromDateStr) return 0;
  const fromParts = fromDateStr.includes('/') ? fromDateStr.split('/') : fromDateStr.split('-');
  let fromDate: Date;
  if (fromDateStr.includes('/')) {
    fromDate = new Date(parseInt(fromParts[2]), parseInt(fromParts[1]) - 1, parseInt(fromParts[0]));
  } else {
    fromDate = new Date(parseInt(fromParts[0]), parseInt(fromParts[1]) - 1, parseInt(fromParts[2]));
  }

  let toDate = new Date();
  if (toDateStr) {
    const toParts = toDateStr.includes('/') ? toDateStr.split('/') : toDateStr.split('-');
    if (toDateStr.includes('/')) {
      toDate = new Date(parseInt(toParts[2]), parseInt(toParts[1]) - 1, parseInt(toParts[0]));
    } else {
      toDate = new Date(parseInt(toParts[0]), parseInt(toParts[1]) - 1, parseInt(toParts[2]));
    }
  }

  const diffTime = toDate.getTime() - fromDate.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

export function addDaysToDate(dateStr: string, days: number): string {
  let d: Date;
  if (dateStr.includes('/')) {
    const parts = dateStr.split('/');
    d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
  } else if (dateStr.includes('-')) {
    const parts = dateStr.split('-');
    d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  } else {
    d = new Date();
  }

  d.setDate(d.getDate() + days);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}
