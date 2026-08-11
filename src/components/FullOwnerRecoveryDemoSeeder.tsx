import React, { useEffect } from 'react';
import { useApp } from '../context/AppContext';

const FULL_BASE_MARKER = '[DEMO_FULL_COBERTURA]';
const RECOVERY_MARKER = '[DEMO_FULL_RECUPERACIONES]';

/**
 * Caso visible para recorrer manualmente el flujo completo:
 * propietario aporta para reparaciones/servicios, se confirma la liquidación,
 * nace la cuenta por cobrar y luego se valida la recuperación propietario -> Fauna.
 *
 * Se elimina junto con los demás seeders cuando exista backend real.
 */
export const FullOwnerRecoveryDemoSeeder: React.FC = () => {
  const { cases, createGuaranteeCase, updateGuaranteeCase } = useApp();

  useEffect(() => {
    if (!cases.some(c => c.initialNotes?.includes(FULL_BASE_MARKER))) return;
    if (cases.some(c => c.initialNotes?.includes(RECOVERY_MARKER))) return;

    const created = createGuaranteeCase({
      propertyAddress: 'Caso Demo Full Recuperaciones',
      propertyComuna: 'Providencia',
      propertyUnit: 'Depto 700',
      ownerName: 'Propietario Demo Recuperaciones',
      ownerRut: '00.000.000-0',
      ownerEmail: 'propietario.recuperaciones@example.com',
      ownerPhone: '+56 9 0000 0700',
      tenantName: 'Arrendatario Demo Recuperaciones',
      tenantRut: '00.000.000-0',
      tenantEmail: 'arrendatario.recuperaciones@example.com',
      tenantPhone: '+56 9 0000 0701',
      monthlyRent: 400000,
      plan: 'FULL',
      contractStartDate: '01/08/2025',
      contractEndDate: '31/07/2026',
      guaranteeAmount: 400000,
      receptionDate: '11/08/2026',
      responsible: 'Gestor de Liquidaciones',
      initialNotes: `${RECOVERY_MARKER} Caso ficticio para probar aporte/pago directo del propietario y recuperación posterior desde Por cobrar.`,
      preparationStatus: 'PENDIENTE',
      liquidationStatus: 'EN_PREPARACION',
      blockedBy: 'SIN_BLOQUEO',
      nextManagement: 'Registrar fondos del propietario necesarios para reparaciones',
      nextManagementDate: '11/08/2026',
      nextManagementResponsible: 'Gestor de Liquidaciones'
    });

    updateGuaranteeCase(created.id, {
      preparationStatus: 'LISTA',
      preparationReadyDate: '11/08/2026',
      requirements: [
        { id: `${created.id}-REQ-1`, name: 'Presupuesto reparaciones', status: 'COMPLETO' },
        { id: `${created.id}-REQ-2`, name: 'Gastos comunes', status: 'COMPLETO' },
        { id: `${created.id}-REQ-3`, name: 'Agua', status: 'COMPLETO' },
        { id: `${created.id}-REQ-4`, name: 'Electricidad', status: 'COMPLETO' },
        { id: `${created.id}-REQ-5`, name: 'Gas', status: 'NO_APLICA' }
      ],
      charges: [
        {
          id: `${created.id}-CHG-DANOS`,
          category: 'DAÑOS',
          description: 'Daños demo superiores a garantía + cobertura Full',
          amount: 950000,
          date: '11/08/2026',
          type: 'DAÑO_REPARACION',
          notes: 'Caso ficticio: garantía $400.000 + Full $400.000; propietario debe aportar $150.000 para completar reparaciones.',
          documents: [],
          photos: []
        },
        {
          id: `${created.id}-CHG-SERVICIOS`,
          category: 'GASTOS_COMUNES',
          description: 'Gastos comunes y servicios finales demo',
          amount: 200000,
          date: '11/08/2026',
          type: 'GASTO_COMUN',
          notes: 'Caso ficticio: $200.000 quedan como obligación de servicios del propietario hasta que los pague o se cubran posteriormente.',
          documents: [],
          photos: []
        }
      ],
      ownerContribution: 0,
      fullCoverageApplied: 400000,
      faunaFinancing: 0,
      nextManagement: 'Registrar $150.000 del propietario para completar reparaciones',
      nextManagementDate: '11/08/2026',
      nextManagementResponsible: 'Gestor de Liquidaciones'
    });
  }, [cases, createGuaranteeCase, updateGuaranteeCase]);

  return null;
};
