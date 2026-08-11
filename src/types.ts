export type UserRole = 'ADMINISTRADOR' | 'ADMINISTRACION' | 'OPERACIONES';

export interface SystemUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
}

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
  userId?: string;
  userName?: string;
  userEmail?: string;
  userRole?: UserRole;
  createdAt: string;
  nextManagement?: string;
  nextManagementDate?: string;
  nextManagementResponsible?: string;
  nextManagementResponsibleUserId?: string;
  originalComment?: string;
  originalArea?: FollowUpArea;
  editedAt?: string;
  editedBy?: string;
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
  userId?: string;
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
  responsibleUserId?: string;
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
  providerPhone?: string;
  providerEmail?: string;
  responsible: string;
  responsibleUserId?: string;
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

export type OwnerPaymentPurpose = 'REPARACIONES' | 'SERVICIOS';
export type OwnerPaymentMode = 'TRANSFERIDO_FAUNA' | 'PAGADO_DIRECTO';

export type FinancialMovementType =
  | 'GARANTIA'
  | 'CARGO'
  | 'ABONO_ARRENDATARIO'
  | 'DEVOLUCION_ARRENDATARIO'
  | 'APORTE_PROPIETARIO'
  | 'COBERTURA_FULL'
  | 'FINANCIAMIENTO_FAUNA'
  | 'PAGO_ARRENDATARIO'
  | 'RECUPERACION_PROPIETARIO'
  | 'RECUPERACION_FAUNA'
  | 'SALDO_PAGO_ARRENDATARIO'
  | 'CASTIGO_PROPIETARIO'
  | 'CASTIGO_FAUNA'
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
  userId?: string;
  reference: string;
  observation: string;
  ownerPaymentPurpose?: OwnerPaymentPurpose;
  ownerPaymentMode?: OwnerPaymentMode;
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
  uncollectibleReason?: string;
  uncollectibleDate?: string;
  uncollectibleUser?: string;
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
  userId?: string;
}

export interface CaseAttachment {
  id: string;
  name: string;
  type: 'PDF' | 'JPG' | 'PNG' | 'DOC';
  date: string;
  url: string;
  category?: string;
}

export interface LiquidationSnapshotFinancials {
  guaranteeAmount: number;
  grossCharges: number;
  tenantCredits: number;
  totalCharges: number;
  tenantDeficit: number;
  refundToTenant: number;
  fullCoverageApplied: number;
  faunaFinancingRequired: number;
  ownerRepairFundingRequired: number;
  ownerServiceObligation: number;
  ownerRepairPendingAtIssue: number;
  ownerServicePendingAtIssue: number;
  ownerContributionAppliedAtIssue: number;
}

export interface LiquidationSnapshot {
  calculationVersion: '2026-08-v1';
  issuedAt: string;
  issuedDate: string;
  tenantDocumentNumber: string;
  ownerDocumentNumber: string;
  propertyAddress: string;
  propertyComuna: string;
  propertyUnit: string;
  receptionDate: string;
  plan: AdministrationPlan;
  ownerName: string;
  ownerRut: string;
  tenantName: string;
  tenantRut: string;
  tenantEmail: string;
  charges: Charge[];
  financials: LiquidationSnapshotFinancials;
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
  responsibleUserId?: string;
  initialNotes: string;

  preparationStatus: PreparationStatus;
  preparationReadyDate?: string;

  liquidationStatus: LiquidationStatus;
  requirements: LiquidationRequirement[];
  liquidationSnapshot?: LiquidationSnapshot;

  blockedBy: BlockedByReason;
  blockedReasonNotes?: string;

  nextManagement: string;
  nextManagementDate: string;
  nextManagementResponsible: string;
  nextManagementResponsibleUserId?: string;

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
  closedByUserId?: string;
}

export interface AuditLog {
  id: string;
  caseId: string;
  timestamp: string;
  user: string;
  actorUserId?: string;
  actorName?: string;
  actorEmail?: string;
  actorRole?: UserRole;
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
  users?: SystemUser[];
}
