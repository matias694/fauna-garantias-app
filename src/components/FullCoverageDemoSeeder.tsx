import React, { useEffect } from 'react';
import { useApp } from '../context/AppContext';

const EXACT_MARKER = '[DEMO_SALDO_EXACTO]';
const FULL_MARKER = '[DEMO_FULL_COBERTURA]';

/**
 * Adds a clearly fictitious Plan Full case after the exact-balance demo exists.
 * Waiting for the first demo prevents both seeders from generating the same GAR id.
 * Remove prototype seeders when the app moves to a real backend/database.
 */
export const FullCoverageDemoSeeder: React.FC = () => {
  const { cases, createGuaranteeCase, updateGuaranteeCase } = useApp();

  useEffect(() => {
    if (!cases.some(c => c.initialNotes?.includes(EXACT_MARKER))) return;
    if (cases.some(c => c.initialNotes?.includes(FULL_MARKER))) return;

    const created = createGuaranteeCase({
      propertyAddress: 'Caso Demo Plan Full',
      propertyComuna: 'Providencia',
      propertyUnit: 'Depto 600',
      ownerName: 'Propietario Demo Full',
      ownerRut: '00.000.000-0',
      ownerEmail: 'propietario.full@example.com',
      ownerPhone: '+56 9 0000 0600',
      tenantName: 'Arrendatario Demo Full',
      tenantRut: '00.000.000-0',
      tenantEmail: 'arrendatario.full@example.com',
      tenantPhone: '+56 9 0000 0601',
      monthlyRent: 450000,
      plan: 'FULL',
      contractStartDate: '01/08/2025',
      contractEndDate: '31/07/2026',
      guaranteeAmount: 400000,
      receptionDate: '09/08/2026',
      responsible: 'Gestor de Liquidaciones',
      initialNotes: `${FULL_MARKER} Caso ficticio para validar cobertura Full equivalente a la garantía y aplicada solo a daños.`,
      preparationStatus: 'PENDIENTE',
      liquidationStatus: 'EN_PREPARACION',
      blockedBy: 'SIN_BLOQUEO',
      nextManagement: 'Provisionar fondos o ajustar reparaciones',
      nextManagementDate: '09/08/2026',
      nextManagementResponsible: 'Gestor de Liquidaciones'
    });

    updateGuaranteeCase(created.id, {
      preparationStatus: 'LISTA',
      preparationReadyDate: '09/08/2026',
      liquidationStatus: 'LISTA',
      requirements: [
        { id: `${created.id}-REQ-1`, name: 'Presupuesto reparaciones', status: 'COMPLETO' },
        { id: `${created.id}-REQ-2`, name: 'Gastos comunes', status: 'COMPLETO' },
        { id: `${created.id}-REQ-3`, name: 'Agua', status: 'COMPLETO' },
        { id: `${created.id}-REQ-4`, name: 'Electricidad', status: 'COMPLETO' },
        { id: `${created.id}-REQ-5`, name: 'Gas', status: 'NO_APLICA' }
      ],
      charges: [
        {
          id: `${created.id}-CHG-1`,
          category: 'DAÑOS',
          description: 'Daños ficticios cubiertos por regla Full',
          amount: 800000,
          date: '09/08/2026',
          type: 'DAÑO_REPARACION',
          notes: 'Dato ficticio para prueba: daños totales $800.000.',
          documents: [],
          photos: []
        },
        {
          id: `${created.id}-CHG-2`,
          category: 'GASTOS_COMUNES',
          description: 'Servicios ficticios no cubiertos por Plan Full',
          amount: 100000,
          date: '09/08/2026',
          type: 'GASTO_COMUN',
          notes: 'Dato ficticio para prueba: servicios $100.000.',
          documents: [],
          photos: []
        }
      ],
      // La cobertura Full se recalcula automáticamente según daños/reparaciones.
      // En este caso alcanza el máximo de $400.000 y queda una provisión de $100.000.
      ownerContribution: 0,
      fullCoverageApplied: 400000,
      faunaFinancing: 0,
      nextManagement: 'Provisionar $100.000 o ajustar reparaciones',
      nextManagementDate: '09/08/2026',
      nextManagementResponsible: 'Gestor de Liquidaciones'
    });
  }, [cases, createGuaranteeCase, updateGuaranteeCase]);

  return null;
};
