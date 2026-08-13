import React, { useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';

const DEMO_MARKER = '[DEMO_SALDO_EXACTO]';

/**
 * Adds one clearly fictitious exact-balance case to the prototype without
 * resetting the user's current local test state. Remove this seeder when the
 * prototype moves to the real backend/database.
 */
export const ExactBalanceDemoSeeder: React.FC = () => {
  const { cases, createGuaranteeCase, updateGuaranteeCase, addCharge } = useApp();
  const seeded = useRef(false);

  useEffect(() => {
    if (seeded.current) return;

    if (cases.some(c => c.initialNotes?.includes(DEMO_MARKER))) {
      seeded.current = true;
      return;
    }

    seeded.current = true;

    const created = createGuaranteeCase({
      propertyAddress: 'Caso Demo Saldo Exacto',
      propertyComuna: 'Providencia',
      propertyUnit: 'Depto 500',
      ownerName: 'Propietario Demo Exacto',
      ownerRut: '00.000.000-0',
      ownerEmail: 'propietario.exacto@example.com',
      ownerPhone: '+56 9 0000 0500',
      tenantName: 'Arrendatario Demo Exacto',
      tenantRut: '00.000.000-0',
      tenantEmail: 'arrendatario.exacto@example.com',
      tenantPhone: '+56 9 0000 0501',
      monthlyRent: 500000,
      plan: 'ESTANDAR',
      contractStartDate: '01/08/2025',
      contractEndDate: '31/07/2026',
      guaranteeAmount: 500000,
      receptionDate: '09/08/2026',
      responsible: 'Gestor de Liquidaciones',
      initialNotes: `${DEMO_MARKER} Caso ficticio para validar una liquidación donde la garantía cubre exactamente todos los cargos.`,
      preparationStatus: 'PENDIENTE',
      liquidationStatus: 'EN_PREPARACION',
      blockedBy: 'SIN_BLOQUEO',
      nextManagement: 'Emitir liquidación definitiva',
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
      nextManagement: 'Emitir liquidación definitiva',
      nextManagementDate: '09/08/2026',
      nextManagementResponsible: 'Gestor de Liquidaciones'
    });

    addCharge(created.id, {
      category: 'REPARACIONES',
      description: 'Cargo total ficticio para prueba de saldo exacto',
      amount: 500000,
      date: '09/08/2026',
      type: 'DAÑO_REPARACION',
      notes: 'Dato ficticio: el total de cargos coincide exactamente con la garantía.',
      repairTracking: {
        provider: 'Maestro Demo Exacto',
        providerPhone: '+56 9 0000 0590',
        providerEmail: 'maestro.exacto@example.com',
        responsible: 'Gestor de Liquidaciones',
        status: 'TERMINADA',
        commitmentDate: '09/08/2026',
        notes: 'Dato ficticio para mantener coherencia del caso demo.'
      },
      documents: [],
      photos: []
    });
  }, [cases, createGuaranteeCase, updateGuaranteeCase, addCharge]);

  return null;
};
