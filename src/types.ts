export type UserRole = 'ADMINISTRADOR' | 'ADMINISTRACION' | 'OPERACIONES';

export type PreparationStatus = 'PENDIENTE' | 'REPARANDO' | 'LISTA';

export type LiquidationStatus = 'EN_PREPARACION' | 'LISTA' | 'EMITIDA';

export type RequirementStatus = 'PENDIENTE' | 'COMPLETO' | 'NO_APLICA';

export interface LiquidationRequirement {
  id: string;
  name: string;
  status: RequirementStatus;
  notes?: string;
}

export type FollowUpArea = 'Garantia' | 'Reparacion' | 'General';

export interface FollowUpComment {
  id: string;
  caseId: string;
  comment: string;
  area: FollowUpArea;
  user: string;
  createdAt: string;
  nextManagement?: string;
  nextManagementDate?: string;
  nextManagementResponsible?: string;
}

export type RefundStatus = 'PENDIENTE' | 'TRANSFERIDA';

export interface TenantRefund {
  amount: number;
  status: RefundStatus;
  date?: string;
  voucherUrl?: string;
  voucherName?: string;
  destinationAccount?: string;
  notes?: string;
  user?: string;
}

export type BlockedByReason =
  | 'SIN_BLOQUEO'
  | 'PROPIETARIO'
  | 'ARRENDATARIO'
  | 'PROVEEDOR'
  | 'DOCUMENTO'
  | 'INFORMACION'
  | 'OTRO';

export type AdministrationPlan = 'ESTANDAR' | 'PLUS' | 'FULL';

export type RepairCategory =
  | 'PINTURA'
  | 'REPARACION'
  | 'LIMPIEZA'
  | 'DAÑO'
  | 'CERRAJERIA'
  | 'GASFITERIA'
  | 'ELECTRICIDAD'
  | 'OTRO';

export type RepairStatus = 'PENDIENTE' | 'EN_EJECUCION' | 'TERMINADA' | 'CANCELADA';

export interface ExitRepair {
  id: string;
  description: string;
  category: RepairCategory;
  responsible: string;
  provider: string;
  status: RepairStatus;
  detectionDate: string;
  commitmentDate: string;
  estimatedCost: number;
  finalCost: number;
  chargeToTenant: boolean;
  notes: string;
  photos: string[];
  documents: string[];
  linkedChargeId?: string;
}

export type ChargeCategory =
  | 'REPARACIONES'
  | 'PINTURA'
  | 'LIMPIEZA'
  | 'DAÑOS'
  | 'GASTOS_COMUNES'
  | 'AGUA'
  | 'ELECTRICIDAD'
  | 'GAS'
  | 'OTROS_SERVICIOS'
  | 'OTRO';

export type ChargeType = 'DAÑO_REPARACION' | 'SERVICIO_CONSUMO' | 'GASTO_COMUN' | 'OTRO';

export interface RepairTracking {
  provider: string;
  responsible: string;
  status: RepairStatus;
  commitmentDate: string;
  notes?: string;
}

export interface Charge {
  id: string;
  category: ChargeCategory;
  description: string;
  amount: number;
  date: string;
  type: ChargeType;
  notes: string;
  repairId?: string;
  repairTracking?: RepairTracking;
  documents: string[];
  photos: string[];
}

export type FinancialMovementType =
  | 'GARANTIA'
  | 'CARGO'
  | 'DEVOLUCION_ARRENDATARIO'
  | 'APORTE_PROPIETARIO'
  | 'COBERTURA_FULL'
  | 'FINANCIAMIENTO_FAUNA'
  | 'PAGO_ARRENDATARIO'
  | 'RECUPERACION_PROPIETARIO'
  | 'RECUPERACION_FAUNA'
  | 'SALDO_PAGO_ARRENDATARIO'
  | 'AJUSTE';

export interface FinancialMovement {
  id: string;
  caseId: string;
  date: string;
  time: string;
  type: FinancialMovementType;
  description: string;
  amount: number;
  user: string;
  reference: string;
  observation: string;
}

export type ReceivableStatus =
  | 'PENDIENTE'
  | 'PAGO_PARCIAL'
  | 'PAGADA'
  | 'INCOBRABLE';

export interface Receivable {
  id: string;
  caseId: string;
  tenantName: string;
  tenantRut: string;
  tenantPhone: string;
  tenantEmail: string;
  propertyAddress: string;
  ownerName: string;
  originalAmount: number;
  totalPaid: number;
  pendingBalance: number;
  ownerContributionToRecover: number;
  faunaFinancingToRecover: number;
  status: ReceivableStatus;
  createdDate: string;
  lastManagementDate: string;
  nextManagementDate: string;
  nextManagement: string;
}

export interface PaymentAllocation {
  id: string;
  receivableId: string;
  caseId: string;
  paymentDate: string;
  totalPaid: number;
  ownerRecovery: number;
  faunaRecovery: number;
  tenantRemainingDebt: number;
  notes: string;
  user: string;
}

export interface CaseAttachment {
  id: string;
  name: string;
  type: 'PDF' | 'JPG' | 'PNG' | 'DOC';
  date: string;
  url: string;
  category?: string;
}

export interface GuaranteeCase {
  id: string;
  propertyAddress: string;
  propertyComuna: string;
  propertyUnit: string;
  ownerName: string;
  ownerRut: string;
  ownerEmail: string;
  ownerPhone: string;
  tenantName: string;
  tenantRut: string;
  tenantEmail: string;
  tenantPhone: string;
  monthlyRent: number;
  plan: AdministrationPlan;
  contractStartDate: string;
  contractEndDate: string;
  guaranteeAmount: number;
  receptionDate: string;
  deadlineDate: string;
  alertDate: string;
  responsible: string;
  initialNotes: string;

  preparationStatus: PreparationStatus;
  preparationReadyDate?: string;

  liquidationStatus: LiquidationStatus;
  requirements: LiquidationRequirement[];

  blockedBy: BlockedByReason;
  blockedReasonNotes?: string;

  nextManagement: string;
  nextManagementDate: string;
  nextManagementResponsible: string;

  followUps: FollowUpComment[];
  refund?: TenantRefund;
  receivableId?: string;
  receivableStatus?: ReceivableStatus;

  repairs: ExitRepair[];
  charges: Charge[];
  attachments: CaseAttachment[];
  movements: FinancialMovement[];

  ownerContribution: number;
  fullCoverageApplied: number;
  faunaFinancing: number;

  isCompleted?: boolean;
  isClosed?: boolean;
  closedAt?: string;
  closedBy?: string;
}

export interface AuditLog {
  id: string;
  caseId: string;
  timestamp: string;
  user: string;
  action: string;
  detail: string;
}

export interface SystemSettings {
  maxLiquidationDays: number;
  alertDay: number;
  fullCoverageLimitMode: 'FIXED' | 'MONTHLY_RENT';
  fullCoverageFixedLimit: number;
  fullCoverageRentMultiplier: number;
  faunaCompanyName: string;
  faunaRut: string;
  faunaAddress: string;
  faunaEmail: string;
  faunaPhone: string;
  chargeCategories: ChargeCategory[];
  repairCategories: RepairCategory[];
  responsiblesList: string[];
}