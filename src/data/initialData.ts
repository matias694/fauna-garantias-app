import { GuaranteeCase, Receivable, SystemSettings, LiquidationRequirement } from '../types';

export const initialSettings: SystemSettings = {
  maxLiquidationDays: 60,
  alertDay: 45,
  faunaCompanyName: 'Fauna Propiedades SpA',
  faunaRut: '77.412.980-5',
  faunaAddress: 'Av. Providencia 2133, Of. 701, Providencia, Santiago',
  faunaEmail: 'contacto@faunapropiedades.cl',
  faunaPhone: '+56 9 6123 4567',
  chargeCategories: [
    'REPARACIONES',
    'PINTURA',
    'LIMPIEZA',
    'DAÑOS',
    'GASTOS_COMUNES',
    'AGUA',
    'ELECTRICIDAD',
    'GAS',
    'OTROS_SERVICIOS',
    'OTRO'
  ],
  repairCategories: [
    'PINTURA',
    'REPARACION',
    'LIMPIEZA',
    'DAÑO',
    'CERRAJERIA',
    'GASFITERIA',
    'ELECTRICIDAD',
    'OTRO'
  ],
  responsiblesList: [
    'Ejecutivo de Operaciones',
    'Gestor de Liquidaciones',
    'Coordinador de Obras',
    'Encargado de Finanzas',
    'Administrador de Sistema'
  ]
};

export const defaultRequirements: LiquidationRequirement[] = [
  { id: 'REQ-1', name: 'Presupuesto reparaciones', status: 'COMPLETO' },
  { id: 'REQ-2', name: 'Gastos comunes', status: 'COMPLETO' },
  { id: 'REQ-3', name: 'Agua', status: 'PENDIENTE' },
  { id: 'REQ-4', name: 'Electricidad', status: 'COMPLETO' },
  { id: 'REQ-5', name: 'Gas', status: 'NO_APLICA' }
];

export const initialGuaranteeCases: GuaranteeCase[] = [
  {
    id: 'GAR-0001',
    propertyAddress: 'Av. Italia 1420',
    propertyComuna: 'Providencia',
    propertyUnit: 'Depto 504',
    ownerName: 'Roberto Silva Gancedo',
    ownerRut: '11.845.221-3',
    ownerEmail: 'roberto.silva@email.com',
    ownerPhone: '+56 9 9123 8877',
    tenantName: 'Camila Valenzuela Ríos',
    tenantRut: '18.452.102-K',
    tenantEmail: 'camila.valenzuela@email.com',
    tenantPhone: '+56 9 8443 1122',
    monthlyRent: 550000,
    plan: 'FULL',
    contractStartDate: '01/07/2024',
    contractEndDate: '30/06/2026',
    guaranteeAmount: 550000,
    receptionDate: '01/07/2026',
    deadlineDate: '30/08/2026',
    alertDate: '15/08/2026',
    responsible: 'Ejecutivo de Operaciones',
    initialNotes: 'Recepción de propiedad efectuada. Pintura de living requiere retoques por orificios de cuadros y limpieza profunda.',
    
    preparationStatus: 'REPARANDO',
    liquidationStatus: 'EN_PREPARACION',
    requirements: [
      { id: 'REQ-101', name: 'Presupuesto reparaciones', status: 'COMPLETO' },
      { id: 'REQ-102', name: 'Gastos comunes', status: 'COMPLETO' },
      { id: 'REQ-103', name: 'Agua', status: 'PENDIENTE', notes: 'Esperando lectura de boleta de corte' },
      { id: 'REQ-104', name: 'Electricidad', status: 'COMPLETO' },
      { id: 'REQ-105', name: 'Gas', status: 'NO_APLICA' }
    ],
    blockedBy: 'SIN_BLOQUEO',
    
    nextManagement: 'Verificar lectura final de agua y término de pintura',
    nextManagementDate: '10/08/2026',
    nextManagementResponsible: 'Ejecutivo de Operaciones',
    
    followUps: [
      {
        id: 'FOL-001',
        caseId: 'GAR-0001',
        comment: 'Maestro confirma que la pintura estará terminada mañana por la tarde.',
        area: 'Reparacion',
        user: 'Ejecutivo de Operaciones',
        createdAt: '09/08/2026 10:35',
        nextManagement: 'Confirmar término de trabajos.',
        nextManagementDate: '10/08/2026',
        nextManagementResponsible: 'Ejecutivo de Operaciones'
      },
      {
        id: 'FOL-002',
        caseId: 'GAR-0001',
        comment: 'Falta recibir el valor final de cuenta de agua proporcional.',
        area: 'Garantia',
        user: 'Gestor de Liquidaciones',
        createdAt: '09/08/2026 15:20'
      }
    ],

    repairs: [
      {
        id: 'REP-001',
        description: 'Pintura living y dormitorio principal',
        category: 'PINTURA',
        responsible: 'Coordinador de Obras',
        provider: 'Pinturas y Acabados Express',
        status: 'EN_EJECUCION',
        detectionDate: '02/07/2026',
        commitmentDate: '12/08/2026',
        estimatedCost: 220000,
        finalCost: 240000,
        chargeToTenant: true,
        notes: 'Requiere 2 manos de pasta muro en tabique living.',
        photos: [],
        documents: [],
        linkedChargeId: 'CHG-001'
      },
      {
        id: 'REP-002',
        description: 'Cambio de chapa de entrada por desgaste/fuerza',
        category: 'CERRAJERIA',
        responsible: 'Coordinador de Obras',
        provider: 'Cerrajería Segura SpA',
        status: 'TERMINADA',
        detectionDate: '01/07/2026',
        commitmentDate: '05/07/2026',
        estimatedCost: 45000,
        finalCost: 45000,
        chargeToTenant: true,
        notes: 'Chapa reemplazada exitosamente.',
        photos: [],
        documents: [],
        linkedChargeId: 'CHG-002'
      },
      {
        id: 'REP-003',
        description: 'Limpieza profunda de cocina y baños post entrega',
        category: 'LIMPIEZA',
        responsible: 'Coordinador de Obras',
        provider: 'Aseo Pro Santiago',
        status: 'TERMINADA',
        detectionDate: '01/07/2026',
        commitmentDate: '04/07/2026',
        estimatedCost: 80000,
        finalCost: 80000,
        chargeToTenant: true,
        notes: 'Aseo entregado conforme.',
        photos: [],
        documents: [],
        linkedChargeId: 'CHG-003'
      }
    ],
    charges: [
      {
        id: 'CHG-001',
        category: 'PINTURA',
        description: 'Reparación y pintura de living y dormitorio',
        amount: 240000,
        date: '02/07/2026',
        type: 'DAÑO_REPARACION',
        notes: 'Reparación orificios y pintura muro principal',
        repairId: 'REP-001',
        documents: ['cotizacion_pintura.pdf'],
        photos: []
      },
      {
        id: 'CHG-002',
        category: 'REPARACIONES',
        description: 'Reemplazo chapa acceso principal',
        amount: 45000,
        date: '02/07/2026',
        type: 'DAÑO_REPARACION',
        notes: 'Chapa dañada por arrendatario',
        repairId: 'REP-002',
        documents: [],
        photos: []
      },
      {
        id: 'CHG-003',
        category: 'LIMPIEZA',
        description: 'Limpieza terminal entrega propiedad',
        amount: 80000,
        date: '02/07/2026',
        type: 'DAÑO_REPARACION',
        notes: 'Limpieza desengrasante cocina y sarro baños',
        repairId: 'REP-003',
        documents: [],
        photos: []
      },
      {
        id: 'CHG-004',
        category: 'GASTOS_COMUNES',
        description: 'Cuota de gastos comunes mes de junio pendiente',
        amount: 180000,
        date: '05/07/2026',
        type: 'GASTO_COMUN',
        notes: 'Comprobante de administración edificio adjunto',
        documents: ['boleta_ggcc_juno.pdf'],
        photos: []
      }
    ],
    attachments: [
      {
        id: 'ATT-101',
        name: 'acta_recepcion_italia.pdf',
        type: 'PDF',
        date: '01/07/2026',
        url: '#',
        category: 'Acta de Entrega'
      }
    ],
    movements: [
      {
        id: 'MOV-101',
        caseId: 'GAR-0001',
        date: '01/07/2026',
        time: '10:30',
        type: 'GARANTIA',
        description: 'Garantía recibida en custodia de contrato',
        amount: 550000,
        user: 'Matías Ugarte',
        reference: 'CONTRATO-2024-88',
        observation: 'Monto ingresado en UF/CLP según contrato'
      },
      {
        id: 'MOV-102',
        caseId: 'GAR-0001',
        date: '02/07/2026',
        time: '14:15',
        type: 'CARGO',
        description: 'Cargo por reparaciones y pintura',
        amount: -365000,
        user: 'Diego Morales',
        reference: 'REPARACIONES-SALIDA',
        observation: 'Suma de pintura, chapa y aseo'
      }
    ],
    ownerContribution: 0,
    fullCoverageApplied: 0,
    faunaFinancing: 0,
    isCompleted: false,
    isClosed: false
  },
  {
    id: 'GAR-0002',
    propertyAddress: 'Carlos Antúnez 1980',
    propertyComuna: 'Providencia',
    propertyUnit: 'Depto 1102',
    ownerName: 'María Paz Undurraga Ross',
    ownerRut: '12.334.991-8',
    ownerEmail: 'mpaz.undurraga@email.com',
    ownerPhone: '+56 9 9888 7766',
    tenantName: 'Ignacio Morales Sepúlveda',
    tenantRut: '16.782.339-3',
    tenantEmail: 'ignacio.morales@email.com',
    tenantPhone: '+56 9 7711 2233',
    monthlyRent: 700000,
    plan: 'ESTANDAR',
    contractStartDate: '15/06/2024',
    contractEndDate: '14/06/2026',
    guaranteeAmount: 700000,
    receptionDate: '15/06/2026',
    deadlineDate: '14/08/2026',
    alertDate: '30/07/2026',
    responsible: 'Gestor de Liquidaciones',
    initialNotes: 'Piso parquet con daño por humedad. Muro con hongos.',
    
    preparationStatus: 'LISTA',
    preparationReadyDate: '28/06/2026',
    liquidationStatus: 'EMITIDA',
    requirements: [
      { id: 'REQ-201', name: 'Presupuesto reparaciones', status: 'COMPLETO' },
      { id: 'REQ-202', name: 'Gastos comunes', status: 'COMPLETO' },
      { id: 'REQ-203', name: 'Agua', status: 'COMPLETO' },
      { id: 'REQ-204', name: 'Electricidad', status: 'COMPLETO' },
      { id: 'REQ-205', name: 'Gas', status: 'COMPLETO' }
    ],
    blockedBy: 'ARRENDATARIO',
    blockedReasonNotes: 'Arrendatario solicitó pago en 2 cuotas del saldo de $350.000',
    
    nextManagement: 'Contactar a arrendatario para seguimiento de cuota 1 ($150.000)',
    nextManagementDate: '09/08/2026',
    nextManagementResponsible: 'Encargado de Finanzas',
    
    followUps: [
      {
        id: 'FOL-010',
        caseId: 'GAR-0002',
        comment: 'Liquidación emitida formalmente y enviada al arrendatario.',
        area: 'Garantia',
        user: 'Gestor de Liquidaciones',
        createdAt: '28/06/2026 11:00'
      },
      {
        id: 'FOL-011',
        caseId: 'GAR-0002',
        comment: 'Arrendatario acepta déficit de $350.000 y se genera cuenta por cobrar REC-0001.',
        area: 'Garantia',
        user: 'Encargado de Finanzas',
        createdAt: '28/06/2026 15:30',
        nextManagement: 'Cobrar primera cuota de $150.000',
        nextManagementDate: '09/08/2026',
        nextManagementResponsible: 'Encargado de Finanzas'
      }
    ],

    receivableId: 'REC-0001',
    receivableStatus: 'PAGO_PARCIAL',

    repairs: [
      {
        id: 'REP-201',
        description: 'Pulido y vitrificado de parquet sector living',
        category: 'REPARACION',
        responsible: 'Coordinador de Obras',
        provider: 'Pisos Santiago SpA',
        status: 'TERMINADA',
        detectionDate: '16/06/2026',
        commitmentDate: '25/06/2026',
        estimatedCost: 450000,
        finalCost: 450000,
        chargeToTenant: true,
        notes: 'Trabajo terminado con éxito.',
        photos: [],
        documents: []
      },
      {
        id: 'REP-202',
        description: 'Reparación muro y tratamiento antihongos',
        category: 'REPARACION',
        responsible: 'Coordinador de Obras',
        provider: 'Construcciones M&M',
        status: 'TERMINADA',
        detectionDate: '16/06/2026',
        commitmentDate: '28/06/2026',
        estimatedCost: 250000,
        finalCost: 250000,
        chargeToTenant: true,
        notes: 'Muro reparado y pintado.',
        photos: [],
        documents: []
      }
    ],
    charges: [
      {
        id: 'CHG-201',
        category: 'REPARACIONES',
        description: 'Pulido y vitrificado de parquet por daño de agua',
        amount: 450000,
        date: '16/06/2026',
        type: 'DAÑO_REPARACION',
        notes: 'Daño imputable a descuido de arrendatario',
        repairId: 'REP-201',
        documents: [],
        photos: []
      },
      {
        id: 'CHG-202',
        category: 'DAÑOS',
        description: 'Tratamiento de muro dañado por humedad',
        amount: 250000,
        date: '16/06/2026',
        type: 'DAÑO_REPARACION',
        notes: 'Muro dañado',
        repairId: 'REP-202',
        documents: [],
        photos: []
      },
      {
        id: 'CHG-203',
        category: 'AGUA',
        description: 'Cuentas de agua y luz pendientes de pago',
        amount: 180000,
        date: '20/06/2026',
        type: 'SERVICIO_CONSUMO',
        notes: 'Aviso de corte emitido',
        documents: [],
        photos: []
      },
      {
        id: 'CHG-204',
        category: 'GASTOS_COMUNES',
        description: 'Gastos comunes mayo y junio',
        amount: 170000,
        date: '22/06/2026',
        type: 'GASTO_COMUN',
        notes: 'Deuda registrada en administración',
        documents: [],
        photos: []
      }
    ],
    attachments: [
      {
        id: 'ATT-201',
        name: 'presupuesto_pisos.pdf',
        type: 'PDF',
        date: '17/06/2026',
        url: '#',
        category: 'Cotización'
      }
    ],
    movements: [
      {
        id: 'MOV-201',
        caseId: 'GAR-0002',
        date: '15/06/2026',
        time: '09:00',
        type: 'GARANTIA',
        description: 'Garantía recibida en depósito',
        amount: 700000,
        user: 'Matías Ugarte',
        reference: 'CONTRATO-2024-12',
        observation: 'Monto total depositado'
      },
      {
        id: 'MOV-202',
        caseId: 'GAR-0002',
        date: '28/06/2026',
        time: '12:00',
        type: 'APORTE_PROPIETARIO',
        description: 'Aporte de propietaria Sra. María Paz Undurraga',
        amount: 100000,
        user: 'Constanza Silva',
        reference: 'TRANSFERENCIA-MPAZ',
        observation: 'Aporte adelantado para pago directo a maestro de pisos'
      },
      {
        id: 'MOV-203',
        caseId: 'GAR-0002',
        date: '28/06/2026',
        time: '12:05',
        type: 'FINANCIAMIENTO_FAUNA',
        description: 'Financiamiento operativo Fauna para cubrir término de trabajos',
        amount: 250000,
        user: 'Matías Ugarte',
        reference: 'FAUNA-FINAN-002',
        observation: 'Financiamiento interno a recuperar con cobro a arrendatario'
      }
    ],
    ownerContribution: 100000,
    fullCoverageApplied: 0,
    faunaFinancing: 250000,
    isCompleted: false,
    isClosed: false
  },
  {
    id: 'GAR-0003',
    propertyAddress: 'Pedro de Valdivia 890',
    propertyComuna: 'Ñuñoa',
    propertyUnit: 'Depto 302',
    ownerName: 'Gonzalo Fernández Vial',
    ownerRut: '10.998.442-1',
    ownerEmail: 'gfernandez@email.com',
    ownerPhone: '+56 9 8811 0099',
    tenantName: 'Felipe Soto Alarcón',
    tenantRut: '19.123.884-1',
    tenantEmail: 'felipe.soto@email.com',
    tenantPhone: '+56 9 6655 4433',
    monthlyRent: 480000,
    plan: 'PLUS',
    contractStartDate: '20/07/2025',
    contractEndDate: '19/07/2026',
    guaranteeAmount: 480000,
    receptionDate: '20/07/2026',
    deadlineDate: '18/09/2026',
    alertDate: '03/09/2026',
    responsible: 'Gestor de Liquidaciones',
    initialNotes: 'Propiedad entregada en muy buen estado general. Pequeños detalles de pintura y cuenta de gas.',
    
    preparationStatus: 'LISTA',
    preparationReadyDate: '25/07/2026',
    liquidationStatus: 'EMITIDA',
    requirements: [
      { id: 'REQ-301', name: 'Presupuesto reparaciones', status: 'COMPLETO' },
      { id: 'REQ-302', name: 'Gastos comunes', status: 'COMPLETO' },
      { id: 'REQ-303', name: 'Agua', status: 'COMPLETO' },
      { id: 'REQ-304', name: 'Electricidad', status: 'COMPLETO' },
      { id: 'REQ-305', name: 'Gas', status: 'COMPLETO' }
    ],
    blockedBy: 'SIN_BLOQUEO',
    
    nextManagement: 'Realizar transferencia de devolución por $285.000',
    nextManagementDate: '11/08/2026',
    nextManagementResponsible: 'Gestor de Liquidaciones',

    refund: {
      amount: 285000,
      status: 'PENDIENTE',
      destinationAccount: 'Banco de Chile - Cuenta Vista 00-123-45678 - Felipe Soto',
      notes: 'Transferencia programada tras aprobación de liquidación'
    },
    
    followUps: [
      {
        id: 'FOL-020',
        caseId: 'GAR-0003',
        comment: 'Liquidación emitida con saldo a favor del arrendatario de $285.000.',
        area: 'Garantia',
        user: 'Gestor de Liquidaciones',
        createdAt: '26/07/2026 09:15',
        nextManagement: 'Realizar transferencia de devolución $285.000',
        nextManagementDate: '11/08/2026',
        nextManagementResponsible: 'Gestor de Liquidaciones'
      }
    ],

    repairs: [
      {
        id: 'REP-301',
        description: 'Retoque pintura pasillo',
        category: 'PINTURA',
        responsible: 'Coordinador de Obras',
        provider: 'Pintor Don José',
        status: 'TERMINADA',
        detectionDate: '21/07/2026',
        commitmentDate: '25/07/2026',
        estimatedCost: 150000,
        finalCost: 150000,
        chargeToTenant: true,
        notes: 'Pintura entregada impecable.',
        photos: [],
        documents: []
      }
    ],
    charges: [
      {
        id: 'CHG-301',
        category: 'PINTURA',
        description: 'Retoque de pintura en pasillo',
        amount: 150000,
        date: '21/07/2026',
        type: 'DAÑO_REPARACION',
        notes: 'Muro rayado',
        documents: [],
        photos: []
      },
      {
        id: 'CHG-302',
        category: 'GAS',
        description: 'Cuenta de gas metrogas proporcional salida',
        amount: 45000,
        date: '22/07/2026',
        type: 'SERVICIO_CONSUMO',
        notes: 'Boleta adjunta',
        documents: [],
        photos: []
      }
    ],
    attachments: [],
    movements: [
      {
        id: 'MOV-301',
        caseId: 'GAR-0003',
        date: '20/07/2026',
        time: '11:00',
        type: 'GARANTIA',
        description: 'Garantía inicial ingresada',
        amount: 480000,
        user: 'Constanza Silva',
        reference: 'CONTRATO-2025-09',
        observation: 'Depósito registrado'
      }
    ],
    ownerContribution: 0,
    fullCoverageApplied: 0,
    faunaFinancing: 0,
    isCompleted: false,
    isClosed: false
  },
  {
    id: 'GAR-0004',
    propertyAddress: 'Pocuro 2450',
    propertyComuna: 'Providencia',
    propertyUnit: 'Depto 701',
    ownerName: 'Fernando Larraín Matte',
    ownerRut: '9.882.112-5',
    ownerEmail: 'flarrain@email.com',
    ownerPhone: '+56 9 7700 8811',
    tenantName: 'Valentina Rojas Castro',
    tenantRut: '17.654.321-9',
    tenantEmail: 'v.rojas@email.com',
    tenantPhone: '+56 9 5544 3322',
    monthlyRent: 850000,
    plan: 'FULL',
    contractStartDate: '05/08/2024',
    contractEndDate: '04/08/2026',
    guaranteeAmount: 850000,
    receptionDate: '05/08/2026',
    deadlineDate: '04/10/2026',
    alertDate: '19/09/2026',
    responsible: 'Ejecutivo de Operaciones',
    initialNotes: 'Filtración activa en calefón y piso de cocina levantado.',
    
    preparationStatus: 'PENDIENTE',
    liquidationStatus: 'EN_PREPARACION',
    requirements: [
      { id: 'REQ-401', name: 'Presupuesto reparaciones', status: 'PENDIENTE', notes: 'Cotización calefón' },
      { id: 'REQ-402', name: 'Gastos comunes', status: 'PENDIENTE' },
      { id: 'REQ-403', name: 'Agua', status: 'PENDIENTE' },
      { id: 'REQ-404', name: 'Electricidad', status: 'COMPLETO' },
      { id: 'REQ-405', name: 'Gas', status: 'PENDIENTE' }
    ],
    blockedBy: 'PROPIETARIO',
    blockedReasonNotes: 'Esperando aprobación de propietario para cambiar calefón completo',
    
    nextManagement: 'Llamar a propietario para cotización calefón',
    nextManagementDate: '09/08/2026',
    nextManagementResponsible: 'Ejecutivo de Operaciones',

    followUps: [
      {
        id: 'FOL-030',
        caseId: 'GAR-0004',
        comment: 'Se solicita al propietario autorización para sustituir calefón dañado.',
        area: 'General',
        user: 'Ejecutivo de Operaciones',
        createdAt: '06/08/2026 14:00',
        nextManagement: 'Solicitar confirmación a propietario.',
        nextManagementDate: '09/08/2026',
        nextManagementResponsible: 'Ejecutivo de Operaciones'
      }
    ],

    repairs: [
      {
        id: 'REP-401',
        description: 'Gasfitería y evaluación calefón',
        category: 'GASFITERIA',
        responsible: 'Coordinador de Obras',
        provider: 'Gasfitería Express',
        status: 'PENDIENTE',
        detectionDate: '05/08/2026',
        commitmentDate: '15/08/2026',
        estimatedCost: 350000,
        finalCost: 0,
        chargeToTenant: false,
        notes: 'Desgaste natural de serpentín de calefón.',
        photos: [],
        documents: []
      }
    ],
    charges: [],
    attachments: [],
    movements: [
      {
        id: 'MOV-401',
        caseId: 'GAR-0004',
        date: '05/08/2026',
        time: '16:00',
        type: 'GARANTIA',
        description: 'Garantía recibida contrato Pocuro',
        amount: 850000,
        user: 'Diego Morales',
        reference: 'CONTRATO-701',
        observation: 'Fondo en custodia'
      }
    ],
    ownerContribution: 0,
    fullCoverageApplied: 0,
    faunaFinancing: 0,
    isCompleted: false,
    isClosed: false
  }
];

export const initialReceivables: Receivable[] = [
  {
    id: 'REC-0001',
    caseId: 'GAR-0002',
    tenantName: 'Ignacio Morales Sepúlveda',
    tenantRut: '16.782.339-3',
    tenantPhone: '+56 9 7711 2233',
    tenantEmail: 'ignacio.morales@email.com',
    propertyAddress: 'Carlos Antúnez 1980, Depto 1102, Providencia',
    ownerName: 'María Paz Undurraga Ross',
    originalAmount: 350000,
    totalPaid: 150000,
    pendingBalance: 200000,
    ownerContributionToRecover: 0, // Originally 100.000, fully recovered
    faunaFinancingToRecover: 200000, // Originally 250.000, 50.000 recovered
    status: 'PAGO_PARCIAL',
    createdDate: '28/06/2026',
    lastManagementDate: '02/08/2026',
    nextManagementDate: '09/08/2026',
    nextManagement: 'Verificar transferencia de cuota 2 ($200.000)'
  }
];
