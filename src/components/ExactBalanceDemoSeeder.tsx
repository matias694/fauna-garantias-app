import React, { useEffect } from 'react';

const RESET_MARKER = 'fauna_guarantees_demo_v3_reset_done';

/**
 * Reset transitorio para QA:
 * elimina casos, cuentas por cobrar y bitácora guardados por versiones anteriores
 * y recarga una sola vez para que AppProvider tome los 7 casos limpios actuales.
 */
export const DemoDataV3Reset: React.FC = () => {
  useEffect(() => {
    if (localStorage.getItem(RESET_MARKER) === '1') return;

    localStorage.removeItem('fauna_guarantee_cases_v2');
    localStorage.removeItem('fauna_receivables_v2');
    localStorage.removeItem('fauna_audit_logs_v2');
    localStorage.setItem(RESET_MARKER, '1');
    window.location.reload();
  }, []);

  return null;
};
