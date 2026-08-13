import React, { useLayoutEffect } from 'react';
import type { GuaranteeCase, Charge, AdministrationPlan, LiquidationRequirement } from '../types';

const RESET_MARKER = 'fauna_guarantees_demo_v4_reset_done';

const requirements = (id: string): LiquidationRequirement[] => [
  { id: `${id}-R1`, name: 'Presupuesto reparaciones', status: 'COMPLETO' },
  { id: `${id}-R2`, name: 'Gastos comunes', status: 'COMPLETO' },
  { id: `${id}-R3`, name: 'Agua', status: 'COMPLETO' },
  { id: `${id}-R4`, name: 'Electricidad', status: 'COMPLETO' },
  { id: `${id}-R5`, name: 'Gas', status: 'NO_APLICA' }
];

const damage = (id: string, amount: number, description: string): Charge => ({
  id,
  category: 'DAÑOS',
  description,
  amount,
  date: '13/08/2026',
  type: 'DAÑO_REPARACION',
  notes: 'Caso QA versión actual',
  repairTracking: {
    provider: 'Proveedor Demo',
    responsible: 'Coordinador de Obras',
    status: 'TERMINADA',
    commitmentDate: '13/08/2026'
  },
  documents: [],
  photos: []
});

const service = (id: string, amount: number, category: Charge['category'] = 'GASTOS_COMUNES'): Charge => ({
  id,
  category,
  description: category === 'GASTOS_COMUNES' ? 'Gastos comunes y servicios finales' : `Servicio final ${category.toLowerCase()}`,
  amount,
  date: '13/08/2026',
  type: category === 'GASTOS_COMUNES' ? 'GASTO_COMUN' : 'SERVICIO_CONSUMO',
  notes: 'Caso QA versión actual',
  documents: [],
  photos: []
});

const credit = (id: string, amount: number): Charge => ({
  id,
  category: 'GASTOS_COMUNES',
  description: 'Abono proporcional ya recibido del arrendatario',
  amount: -Math.abs(amount),
  date: '13/08/2026',
  type: 'GASTO_COMUN',
  notes: 'Abono QA',
  documents: [],
  photos: []
});

type CaseInput = {
  id: string;
  address: string;
  comuna: string;
  unit: string;
  plan: AdministrationPlan;
  guarantee: number;
  charges: Charge[];
  notes: string;
  preparation?: GuaranteeCase['preparationStatus'];
  liquidation?: GuaranteeCase['liquidationStatus'];
  reqs?: LiquidationRequirement[];
  nextManagement?: string;
};

const makeCase = (input: CaseInput): GuaranteeCase => ({
  id: input.id,
  propertyAddress: input.address,
  propertyComuna: input.comuna,
  propertyUnit: input.unit,
  ownerName: `Propietario ${input.id}`,
  ownerRut: '00.000.000-0',
  ownerEmail: `${input.id.toLowerCase()}-prop@example.com`,
  ownerPhone: '+56 9 0000 0000',
  tenantName: `Arrendatario ${input.id}`,
  tenantRut: '00.000.000-0',
  tenantEmail: `${input.id.toLowerCase()}-arr@example.com`,
  tenantPhone: '+56 9 1111 1111',
  monthlyRent: input.guarantee,
  plan: input.plan,
  contractStartDate: '01/08/2025',
  contractEndDate: '31/07/2026',
  guaranteeAmount: input.guarantee,
  receptionDate: '13/08/2026',
  deadlineDate: '12/10/2026',
  alertDate: '27/09/2026',
  responsible: 'Gestor de Liquidaciones',
  initialNotes: input.notes,
  preparationStatus: input.preparation || 'LISTA',
  preparationReadyDate: input.preparation === 'REPARANDO' ? undefined : '13/08/2026',
  liquidationStatus: input.liquidation || 'LISTA',
  requirements: input.reqs || requirements(input.id),
  blockedBy: 'SIN_BLOQUEO',
  nextManagement: input.nextManagement || '',
  nextManagementDate: input.nextManagement ? '14/08/2026' : '',
  nextManagementResponsible: input.nextManagement ? 'Gestor de Liquidaciones' : '',
  followUps: [],
  repairs: [],
  charges: input.charges,
  attachments: [],
  movements: [{
    id: `${input.id}-MOV-GAR`,
    caseId: input.id,
    date: '13/08/2026',
    time: '10:00',
    type: 'GARANTIA',
    description: 'Ingreso inicial de garantía en custodia',
    amount: input.guarantee,
    user: 'Gestor de Liquidaciones',
    reference: 'QA-V4',
    observation: 'Caso limpio creado para probar la versión actual'
  }],
  ownerContribution: 0,
  fullCoverageApplied: 0,
  faunaFinancing: 0,
  isCompleted: false,
  isClosed: false
});

export const freshCases: GuaranteeCase[] = [
  makeCase({
    id: 'GAR-0001',
    address: 'Los Leones 1450', comuna: 'Providencia', unit: 'Depto 402', plan: 'ESTANDAR', guarantee: 520000,
    preparation: 'REPARANDO', liquidation: 'EN_PREPARACION',
    reqs: [
      { id: 'GAR-0001-R1', name: 'Presupuesto reparaciones', status: 'COMPLETO' },
      { id: 'GAR-0001-R2', name: 'Gastos comunes', status: 'COMPLETO' },
      { id: 'GAR-0001-R3', name: 'Agua', status: 'PENDIENTE' },
      { id: 'GAR-0001-R4', name: 'Electricidad', status: 'COMPLETO' },
      { id: 'GAR-0001-R5', name: 'Gas', status: 'NO_APLICA' }
    ],
    charges: [damage('GAR-0001-C1', 180000, 'Pintura dormitorio')],
    notes: 'QA 1 · Caso en preparación con antecedente y reparación pendientes.',
    nextManagement: 'Recibir cuenta final de agua y terminar pintura'
  }),
  makeCase({
    id: 'GAR-0002',
    address: 'Pedro de Valdivia 980', comuna: 'Providencia', unit: 'Depto 705', plan: 'PLUS', guarantee: 600000,
    charges: [damage('GAR-0002-C1', 150000, 'Reparación muro'), service('GAR-0002-C2', 100000)],
    notes: 'QA 2 · Saldo a favor del arrendatario; confirmar y luego registrar devolución.'
  }),
  makeCase({
    id: 'GAR-0003',
    address: 'Martín de Zamora 4100', comuna: 'Las Condes', unit: 'Depto 1204', plan: 'FULL', guarantee: 400000,
    charges: [damage('GAR-0003-C1', 750000, 'Daños cubiertos por garantía + Plan Full'), service('GAR-0003-C2', 200000)],
    notes: 'QA 3 · Plan Full: reparaciones cubiertas; $200.000 de servicios a cargo del propietario sin seguimiento.'
  }),
  makeCase({
    id: 'GAR-0004',
    address: 'Irarrázaval 3250', comuna: 'Ñuñoa', unit: 'Depto 809', plan: 'ESTANDAR', guarantee: 400000,
    charges: [damage('GAR-0004-C1', 550000, 'Daños superiores a garantía')],
    notes: 'QA 4 · Estándar: faltan $150.000 para reparaciones y debe bloquear confirmación hasta financiar.'
  }),
  makeCase({
    id: 'GAR-0005',
    address: 'Eliecer Parada 2050', comuna: 'Providencia', unit: 'Depto 301', plan: 'FULL', guarantee: 400000,
    charges: [damage('GAR-0005-C1', 950000, 'Daños que superan garantía + cobertura Full'), service('GAR-0005-C2', 100000, 'AGUA')],
    notes: 'QA 5 · Full fuera de cobertura: faltan $150.000 para reparar; agua queda a cargo del propietario.'
  }),
  makeCase({
    id: 'GAR-0006',
    address: 'Chesterton 7600', comuna: 'Las Condes', unit: 'Casa 12', plan: 'FULL', guarantee: 500000,
    charges: [damage('GAR-0006-C1', 700000, 'Daños de salida'), service('GAR-0006-C2', 150000), credit('GAR-0006-C3', 100000)],
    notes: 'QA 6 · Abono previo del arrendatario: debe imputarse primero a gastos comunes/servicios.'
  }),
  makeCase({
    id: 'GAR-0007',
    address: 'Simón Bolívar 4450', comuna: 'Ñuñoa', unit: 'Depto 506', plan: 'PLUS', guarantee: 500000,
    charges: [damage('GAR-0007-C1', 350000, 'Pintura y reparación'), service('GAR-0007-C2', 150000)],
    notes: 'QA 7 · Saldo exacto: cargos iguales a garantía, sin devolución ni cuenta por cobrar.'
  })
];

/**
 * Migración de datos QA v4.
 * useLayoutEffect evita que los useEffect de persistencia del AppProvider vuelvan a
 * escribir los casos antiguos antes de la recarga.
 */
export const DemoDataV3Reset: React.FC = () => {
  useLayoutEffect(() => {
    if (localStorage.getItem(RESET_MARKER) === '1') return;

    localStorage.setItem('fauna_guarantee_cases_v2', JSON.stringify(freshCases));
    localStorage.setItem('fauna_receivables_v2', JSON.stringify([]));
    localStorage.setItem('fauna_audit_logs_v2', JSON.stringify([]));
    localStorage.setItem(RESET_MARKER, '1');
    window.location.reload();
  }, []);

  return null;
};