import { GuaranteeCase, LiquidationRequirement, Charge } from '../types';

const completeRequirements = (prefix: string): LiquidationRequirement[] => [
  { id: `${prefix}-REQ-1`, name: 'Presupuesto reparaciones', status: 'COMPLETO' },
  { id: `${prefix}-REQ-2`, name: 'Gastos comunes', status: 'COMPLETO' },
  { id: `${prefix}-REQ-3`, name: 'Agua', status: 'COMPLETO' },
  { id: `${prefix}-REQ-4`, name: 'Electricidad', status: 'COMPLETO' },
  { id: `${prefix}-REQ-5`, name: 'Gas', status: 'NO_APLICA' }
];

const damageCharge = (
  id: string,
  amount: number,
  description: string,
  status: 'PENDIENTE' | 'EN_EJECUCION' | 'TERMINADA' | 'CANCELADA' = 'TERMINADA'
): Charge => ({
  id,
  category: 'DAÑOS',
  description,
  amount,
  date: '13/08/2026',
  type: 'DAÑO_REPARACION',
  notes: 'Caso ficticio creado para pruebas de la versión vigente.',
  repairTracking: {
    provider: 'Proveedor Demo',
    providerPhone: '+56 9 0000 0000',
    providerEmail: 'demo@faunapropiedades.cl',
    responsible: 'Gestor de Liquidaciones',
    status,
    commitmentDate: '14/08/2026',
    notes: 'Seguimiento ficticio de prueba.'
  },
  documents: [],
  photos: []
});

const serviceCharge = (id: string, amount: number, description: string): Charge => ({
  id,
  category: 'GASTOS_COMUNES',
  description,
  amount,
  date: '13/08/2026',
  type: 'GASTO_COMUN',
  notes: 'Cuenta informada al propietario; Fauna no desembolsa este monto.',
  documents: [],
  photos: []
});

const baseCase = (
  id: string,
  address: string,
  unit: string,
  plan: GuaranteeCase['plan'],
  guaranteeAmount: number,
  monthlyRent: number
): GuaranteeCase => ({
  id,
  propertyAddress: address,
  propertyComuna: 'Providencia',
  propertyUnit: unit,
  ownerName: `Propietario ${id}`,
  ownerRut: '00.000.000-0',
  ownerEmail: `propietario.${id.toLowerCase()}@example.com`,
  ownerPhone: '+56 9 0000 0100',
  tenantName: `Arrendatario ${id}`,
  tenantRut: '00.000.000-0',
  tenantEmail: `arrendatario.${id.toLowerCase()}@example.com`,
  tenantPhone: '+56 9 0000 0200',
  monthlyRent,
  plan,
  contractStartDate: '01/08/2025',
  contractEndDate: '31/07/2026',
  guaranteeAmount,
  receptionDate: '13/08/2026',
  deadlineDate: '12/10/2026',
  alertDate: '27/09/2026',
  responsible: 'Gestor de Liquidaciones',
  initialNotes: '[DATASET_2026_08_13_V3] Caso ficticio limpio para QA.',
  preparationStatus: 'LISTA',
  preparationReadyDate: '13/08/2026',
  liquidationStatus: 'LISTA',
  requirements: completeRequirements(id),
  blockedBy: 'SIN_BLOQUEO',
  nextManagement: '',
  nextManagementDate: '',
  nextManagementResponsible: '',
  followUps: [],
  repairs: [],
  charges: [],
  attachments: [],
  movements: [
    {
      id: `${id}-MOV-GAR`,
      caseId: id,
      date: '13/08/2026',
      time: '12:00',
      type: 'GARANTIA',
      description: 'Garantía recibida en custodia',
      amount: guaranteeAmount,
      user: 'Gestor de Liquidaciones',
      reference: `${id}-GARANTIA`,
      observation: 'Movimiento ficticio de prueba.'
    }
  ],
  ownerContribution: 0,
  fullCoverageApplied: 0,
  faunaFinancing: 0,
  isCompleted: false,
  isClosed: false
});

export const buildFreshDemoCases = (): GuaranteeCase[] => {
  const c1 = baseCase('GAR-0001', 'Av. Pedro de Valdivia 1450', 'Depto 704', 'FULL', 400000, 450000);
  c1.initialNotes += ' Escenario 1: Plan Full, reparaciones cubiertas y $200.000 de servicios a cargo del propietario que solo se informan.';
  c1.charges = [
    damageCharge('GAR-0001-CHG-1', 750000, 'Daños y reparaciones de salida'),
    serviceCharge('GAR-0001-CHG-2', 200000, 'Gastos comunes y servicios finales')
  ];

  const c2 = baseCase('GAR-0002', 'Los Leones 980', 'Depto 1203', 'ESTANDAR', 600000, 600000);
  c2.initialNotes += ' Escenario 2: garantía suficiente y devolución al arrendatario.';
  c2.charges = [
    damageCharge('GAR-0002-CHG-1', 150000, 'Pintura puntual y aseo'),
    serviceCharge('GAR-0002-CHG-2', 100000, 'Gastos comunes finales')
  ];

  const c3 = baseCase('GAR-0003', 'Holanda 410', 'Depto 506', 'PLUS', 500000, 500000);
  c3.initialNotes += ' Escenario 3: cargos exactamente iguales a la garantía.';
  c3.charges = [
    damageCharge('GAR-0003-CHG-1', 300000, 'Reparaciones de salida'),
    serviceCharge('GAR-0003-CHG-2', 200000, 'Servicios finales')
  ];

  const c4 = baseCase('GAR-0004', 'Marchant Pereira 2210', 'Depto 304', 'ESTANDAR', 500000, 520000);
  c4.initialNotes += ' Escenario 4: garantía insuficiente para reparaciones; requiere $250.000 efectivos del propietario antes de confirmar.';
  c4.charges = [damageCharge('GAR-0004-CHG-1', 750000, 'Daños superiores a la garantía')];

  const c5 = baseCase('GAR-0005', 'Ricardo Lyon 860', 'Depto 902', 'FULL', 400000, 480000);
  c5.initialNotes += ' Escenario 5: daños superan garantía + Plan Full; propietario debe cubrir $150.000 para reparar y además hay $150.000 de servicios solo informativos.';
  c5.charges = [
    damageCharge('GAR-0005-CHG-1', 950000, 'Daños superiores a garantía y cobertura Full'),
    serviceCharge('GAR-0005-CHG-2', 150000, 'Gastos comunes y servicios finales')
  ];

  const c6 = baseCase('GAR-0006', 'Antonio Varas 1320', 'Depto 808', 'PLUS', 450000, 470000);
  c6.initialNotes += ' Escenario 6: antecedentes incompletos; debe completar agua antes de confirmar.';
  c6.liquidationStatus = 'EN_PREPARACION';
  c6.requirements = completeRequirements('GAR-0006').map(r => r.name === 'Agua' ? { ...r, status: 'PENDIENTE' as const, notes: 'Falta lectura final.' } : r);
  c6.charges = [
    damageCharge('GAR-0006-CHG-1', 200000, 'Reparación menor'),
    serviceCharge('GAR-0006-CHG-2', 100000, 'Gastos comunes finales')
  ];
  c6.nextManagement = 'Obtener lectura final de agua';
  c6.nextManagementDate = '14/08/2026';
  c6.nextManagementResponsible = 'Gestor de Liquidaciones';

  const c7 = baseCase('GAR-0007', 'Suecia 2150', 'Depto 1105', 'FULL', 550000, 580000);
  c7.initialNotes += ' Escenario 7: reparación aún en ejecución; la liquidación no puede confirmarse hasta terminarla.';
  c7.preparationStatus = 'REPARANDO';
  c7.preparationReadyDate = undefined;
  c7.charges = [
    damageCharge('GAR-0007-CHG-1', 350000, 'Reparación en ejecución', 'EN_EJECUCION'),
    serviceCharge('GAR-0007-CHG-2', 80000, 'Servicios finales')
  ];
  c7.nextManagement = 'Confirmar término de reparación';
  c7.nextManagementDate = '14/08/2026';
  c7.nextManagementResponsible = 'Gestor de Liquidaciones';

  return [c1, c2, c3, c4, c5, c6, c7];
};

export const FRESH_DEMO_DATASET_VERSION = '2026-08-13-v3';
