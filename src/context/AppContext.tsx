import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  GuaranteeCase,
  Receivable,
  SystemSettings,
  UserRole,
  AuditLog,
  ExitRepair,
  Charge,
  FinancialMovement,
  CaseAttachment,
  PreparationStatus,
  LiquidationStatus,
  BlockedByReason,
  LiquidationRequirement,
  RequirementStatus,
  FollowUpComment,
  FollowUpArea,
  TenantRefund
} from '../types';
import { initialGuaranteeCases, initialReceivables, initialSettings, defaultRequirements } from '../data/initialData';
import { addDaysToDate, formatCLP, formatDate, getLocalDateInputValue } from '../utils/formatters';
import {
  calculateFundingReadiness,
  calculateGuaranteeFinances,
  calculatePaymentDistribution,
  isChargeIncludedInLiquidation
} from '../utils/calculations';

const nextSequentialId = (prefix: string, ids: string[]) => {
  const max = ids.reduce((current, id) => {
    const match = id.match(new RegExp(`^${prefix}-(\\d+)$`));
    return match ? Math.max(current, Number(match[1])) : current;
  }, 0);
  return `${prefix}-${String(max + 1).padStart(4, '0')}`;
};

/**
 * Migración en memoria de la bitácora del prototipo:
 * - CARGO era una duplicación contable de charges[] y podía quedar desincronizado al editar.
 * - Los abonos sí representan dinero recibido y se conservan como movimiento real separado.
 */
const normalizeFinancialLedger = (c: GuaranteeCase): GuaranteeCase => {
  const chargeIds = new Set((c.charges || []).map(ch => ch.id));
  let movements = (c.movements || []).filter(m => !(m.type === 'CARGO' && chargeIds.has(m.reference)));

  (c.charges || []).filter(ch => ch.amount < 0).forEach(ch => {
    const existingIndex = movements.findIndex(m => m.type === 'ABONO_ARRENDATARIO' && m.reference === ch.id);
    const normalizedMovement: FinancialMovement = {
      id: existingIndex >= 0 ? movements[existingIndex].id : `MOV-MIG-ABONO-${ch.id}`,
      caseId: c.id,
      date: formatDate(ch.date),
      time: existingIndex >= 0 ? movements[existingIndex].time : '12:00',
      type: 'ABONO_ARRENDATARIO',
      description: `Abono previo del arrendatario: ${ch.description}`,
      amount: Math.abs(ch.amount),
      user: existingIndex >= 0 ? movements[existingIndex].user : 'Migración de sistema',
      reference: ch.id,
      observation: ch.notes || 'Abono proporcional registrado en cargos y abonos'
    };

    if (existingIndex >= 0) movements[existingIndex] = { ...movements[existingIndex], ...normalizedMovement };
    else movements = [...movements, normalizedMovement];
  });

  return { ...c, movements };
};


export const normalizeClosedOwnerPending = (c: GuaranteeCase): GuaranteeCase => {
  if (!c.isClosed || c.ownerPostClosePending || !c.ownerServiceDeferral) return c;

  const readiness = calculateFundingReadiness(c, initialSettings);
  if (readiness.ownerServicePending <= 0) return c;

  return {
    ...c,
    ownerPostClosePending: {
      amountAtTransfer: readiness.ownerServicePending,
      reason: c.ownerServiceDeferral.reason,
      nextReviewDate: c.ownerServiceDeferral.nextReviewDate,
      responsible: c.ownerServiceDeferral.responsible,
      transferredAt: c.ownerServiceDeferral.createdAt,
      transferredBy: c.closedBy || c.ownerServiceDeferral.createdBy,
      status: 'PENDIENTE'
    },
    ownerServiceDeferral: undefined
  };
};

export function isCaseCompleted(c: GuaranteeCase, settings: SystemSettings = initialSettings): boolean {
  if (c.liquidationStatus !== 'EMITIDA') return false;
  if (c.preparationStatus !== 'LISTA') return false;
  if (c.blockedBy !== 'SIN_BLOQUEO') return false;

  if (c.refund && c.refund.amount > 0 && c.refund.status !== 'TRANSFERIDA') return false;

  if (c.receivableStatus && c.receivableStatus !== 'PAGADA' && c.receivableStatus !== 'INCOBRABLE') {
    return false;
  }

  const readiness = calculateFundingReadiness(c, settings);
  if (readiness.ownerServicePending > 0) {
    if (c.isClosed) {
      if (!c.ownerPostClosePending || c.ownerPostClosePending.status !== 'PENDIENTE') return false;
    } else if (!c.ownerServiceDeferral) {
      return false;
    }
  }

  return true;
}

interface AppContextType {
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  activeView: 'dashboard' | 'guarantees' | 'receivables' | 'settings' | 'case-detail';
  setActiveView: (view: 'dashboard' | 'guarantees' | 'receivables' | 'settings' | 'case-detail') => void;
  selectedCaseId: string | null;
  setSelectedCaseId: (id: string | null) => void;

  cases: GuaranteeCase[];
  receivables: Receivable[];
  settings: SystemSettings;
  auditLogs: AuditLog[];

  createGuaranteeCase: (caseData: Omit<GuaranteeCase, 'id' | 'deadlineDate' | 'alertDate' | 'repairs' | 'charges' | 'attachments' | 'movements' | 'ownerContribution' | 'fullCoverageApplied' | 'faunaFinancing' | 'requirements' | 'followUps' | 'isClosed'>) => GuaranteeCase;
  updateGuaranteeCase: (caseId: string, updates: Partial<GuaranteeCase>) => void;

  changePreparationStatus: (caseId: string, newStatus: PreparationStatus) => void;
  changeLiquidationStatus: (caseId: string, newStatus: LiquidationStatus, blockedBy?: BlockedByReason, blockedNotes?: string) => void;

  updateRequirementStatus: (caseId: string, requirementId: string, status: RequirementStatus, notes?: string) => void;
  addRequirement: (caseId: string, name: string) => void;

  addFollowUpComment: (caseId: string, data: { comment: string; area: FollowUpArea; nextManagement?: string; nextManagementDate?: string; nextManagementResponsible?: string }) => void;

  addExitRepair: (caseId: string, repair: Omit<ExitRepair, 'id'>) => void;
  updateExitRepair: (caseId: string, repairId: string, updates: Partial<ExitRepair>) => void;
  deleteExitRepair: (caseId: string, repairId: string) => void;

  addCharge: (caseId: string, charge: Omit<Charge, 'id'>) => void;
  updateCharge: (caseId: string, chargeId: string, updates: Partial<Charge>) => void;
  deleteCharge: (caseId: string, chargeId: string) => void;

  addFinancialMovement: (caseId: string, movement: Omit<FinancialMovement, 'id' | 'caseId'>) => void;
  addAttachment: (caseId: string, attachment: Omit<CaseAttachment, 'id'>) => void;

  emitLiquidation: (caseId: string) => void;
  registerTenantRefund: (caseId: string, refundData: { date: string; voucherName?: string; destinationAccount?: string; notes?: string }) => void;

  createReceivableFromCase: (caseId: string) => Receivable | null;
  recordTenantPayment: (receivableId: string, paymentAmount: number, notes: string, paymentDate?: string) => void;
  markReceivableUncollectible: (receivableId: string, reason: string) => void;

  closeGuaranteeCase: (caseId: string) => { success: boolean; message: string };
  reopenGuaranteeCase: (caseId: string) => void;

  updateSettings: (newSettings: SystemSettings) => void;
  logAudit: (caseId: string, action: string, detail: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userRole, setUserRole] = useState<UserRole>('ADMINISTRADOR');
  const [activeView, setActiveView] = useState<'dashboard' | 'guarantees' | 'receivables' | 'settings' | 'case-detail'>('dashboard');
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);

  const [cases, setCases] = useState<GuaranteeCase[]>(() => {
    const saved = localStorage.getItem('fauna_guarantee_cases_v2');
    if (saved) {
      try {
        return JSON.parse(saved).map((raw: GuaranteeCase) => {
          const c = normalizeClosedOwnerPending(normalizeFinancialLedger(raw));
          return { ...c, isCompleted: isCaseCompleted(c) };
        });
      } catch (e) {
        console.error(e);
      }
    }
    return initialGuaranteeCases.map(raw => {
      const c = normalizeClosedOwnerPending(normalizeFinancialLedger(raw));
      return { ...c, isCompleted: isCaseCompleted(c) };
    });
  });

  const [receivables, setReceivables] = useState<Receivable[]>(() => {
    const saved = localStorage.getItem('fauna_receivables_v2');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return initialReceivables;
  });

  const [settings, setSettings] = useState<SystemSettings>(() => {
    const saved = localStorage.getItem('fauna_settings_v2');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return initialSettings;
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    const saved = localStorage.getItem('fauna_audit_logs_v2');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return [];
  });

  useEffect(() => localStorage.setItem('fauna_guarantee_cases_v2', JSON.stringify(cases)), [cases]);
  useEffect(() => localStorage.setItem('fauna_receivables_v2', JSON.stringify(receivables)), [receivables]);
  useEffect(() => localStorage.setItem('fauna_settings_v2', JSON.stringify(settings)), [settings]);
  useEffect(() => localStorage.setItem('fauna_audit_logs_v2', JSON.stringify(auditLogs)), [auditLogs]);

  const withCompletion = (c: GuaranteeCase): GuaranteeCase => ({ ...c, isCompleted: isCaseCompleted(c, settings) });

  const logAudit = (caseId: string, action: string, detail: string) => {
    const newLog: AuditLog = {
      id: 'LOG-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      caseId,
      timestamp: new Date().toLocaleString('es-CL'),
      user: userRole,
      actorRole: userRole,
      action,
      detail
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  const createGuaranteeCase = (
    caseData: Omit<GuaranteeCase, 'id' | 'deadlineDate' | 'alertDate' | 'repairs' | 'charges' | 'attachments' | 'movements' | 'ownerContribution' | 'fullCoverageApplied' | 'faunaFinancing' | 'requirements' | 'followUps' | 'isClosed'>
  ): GuaranteeCase => {
    const formattedId = nextSequentialId('GAR', cases.map(c => c.id));
    const deadlineDate = addDaysToDate(caseData.receptionDate, settings.maxLiquidationDays || 60);
    const alertDate = addDaysToDate(caseData.receptionDate, settings.alertDay || 45);

    const initialMovement: FinancialMovement = {
      id: 'MOV-' + Date.now(),
      caseId: formattedId,
      date: formatDate(caseData.receptionDate),
      time: new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
      type: 'GARANTIA',
      description: 'Ingreso inicial de garantía en custodia',
      amount: caseData.guaranteeAmount,
      user: caseData.responsible || userRole,
      reference: 'CREACION-CASO',
      observation: caseData.initialNotes || 'Garantía registrada al recibir propiedad'
    };

    const newCase = withCompletion({
      ...caseData,
      id: formattedId,
      deadlineDate,
      alertDate,
      preparationStatus: 'PENDIENTE',
      liquidationStatus: 'EN_PREPARACION',
      requirements: defaultRequirements.map(r => ({ ...r, status: 'PENDIENTE' as RequirementStatus })),
      blockedBy: 'SIN_BLOQUEO',
      followUps: [],
      repairs: [],
      charges: [],
      attachments: [],
      movements: [initialMovement],
      ownerContribution: 0,
      fullCoverageApplied: 0,
      faunaFinancing: 0,
      isClosed: false
    });

    setCases(prev => [newCase, ...prev]);
    logAudit(formattedId, 'Creación de Caso', `Caso ${formattedId} creado para propiedad ${caseData.propertyAddress}`);
    return newCase;
  };

  const updateGuaranteeCase = (caseId: string, updates: Partial<GuaranteeCase>) => {
    setCases(prev => prev.map(c => c.id === caseId ? withCompletion({ ...c, ...updates }) : c));
    logAudit(caseId, 'Actualización de Caso', `Actualizados datos del caso ${caseId}`);
  };

  const changePreparationStatus = (caseId: string, newStatus: PreparationStatus) => {
    const todayStr = formatDate(getLocalDateInputValue());
    setCases(prev => prev.map(c => {
      if (c.id !== caseId) return c;
      return withCompletion({
        ...c,
        preparationStatus: newStatus,
        preparationReadyDate: newStatus === 'LISTA' ? todayStr : c.preparationReadyDate
      });
    }));
    logAudit(caseId, 'Preparación Actualizada', `${userRole} cambió Preparación de propiedad a ${newStatus}`);
  };

  const changeLiquidationStatus = (
    caseId: string,
    newStatus: LiquidationStatus,
    blockedBy: BlockedByReason = 'SIN_BLOQUEO',
    blockedNotes = ''
  ) => {
    setCases(prev => prev.map(c => c.id === caseId ? withCompletion({
      ...c,
      liquidationStatus: newStatus,
      blockedBy,
      blockedReasonNotes: blockedNotes
    }) : c));
    logAudit(caseId, 'Estado Liquidación Cambiado', `${userRole} cambió Liquidación a ${newStatus} (Bloqueo: ${blockedBy})`);
  };

  const updateRequirementStatus = (caseId: string, requirementId: string, status: RequirementStatus, notes?: string) => {
    setCases(prev => prev.map(c => {
      if (c.id !== caseId) return c;
      const updatedReqs = c.requirements.map(req => req.id === requirementId
        ? { ...req, status, notes: notes !== undefined ? notes : req.notes }
        : req
      );
      const allDone = updatedReqs.every(r => r.status === 'COMPLETO' || r.status === 'NO_APLICA');
      const liquidationStatus = allDone && c.liquidationStatus === 'EN_PREPARACION'
        ? 'LISTA'
        : !allDone && c.liquidationStatus === 'LISTA'
          ? 'EN_PREPARACION'
          : c.liquidationStatus;
      return withCompletion({ ...c, requirements: updatedReqs, liquidationStatus });
    }));
    logAudit(caseId, 'Requisito Actualizado', `Requisito ${requirementId} marcado como ${status}`);
  };

  const addRequirement = (caseId: string, name: string) => {
    const newReq: LiquidationRequirement = { id: 'REQ-' + Date.now(), name, status: 'PENDIENTE' };
    setCases(prev => prev.map(c => c.id === caseId ? withCompletion({
      ...c,
      requirements: [...c.requirements, newReq],
      liquidationStatus: c.liquidationStatus === 'LISTA' ? 'EN_PREPARACION' : c.liquidationStatus
    }) : c));
    logAudit(caseId, 'Requisito Añadido', `Nuevo requisito de liquidación: "${name}"`);
  };

  const addFollowUpComment = (
    caseId: string,
    data: { comment: string; area: FollowUpArea; nextManagement?: string; nextManagementDate?: string; nextManagementResponsible?: string }
  ) => {
    const nowStr = new Date().toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const newComment: FollowUpComment = {
      id: 'FOL-' + Date.now(),
      caseId,
      comment: data.comment,
      area: data.area,
      user: userRole,
      userRole,
      createdAt: nowStr,
      nextManagement: data.nextManagement,
      nextManagementDate: data.nextManagementDate,
      nextManagementResponsible: data.nextManagementResponsible
    };

    setCases(prev => prev.map(c => c.id === caseId ? withCompletion({
      ...c,
      followUps: [newComment, ...c.followUps],
      nextManagement: data.nextManagement !== undefined ? data.nextManagement : c.nextManagement,
      nextManagementDate: data.nextManagementDate !== undefined ? data.nextManagementDate : c.nextManagementDate,
      nextManagementResponsible: data.nextManagementResponsible !== undefined ? data.nextManagementResponsible : c.nextManagementResponsible
    }) : c));

    logAudit(caseId, 'Seguimiento Registrado', `Comentario [${data.area}] añadido por ${userRole}`);
  };

  const addExitRepair = (caseId: string, repairData: Omit<ExitRepair, 'id'>) => {
    const newRepair: ExitRepair = { ...repairData, id: 'REP-' + Date.now() };
    setCases(prev => prev.map(c => {
      if (c.id !== caseId) return c;
      const repairs = [...c.repairs, newRepair];
      const allFinished = repairs.length > 0 && repairs.every(r => r.status === 'TERMINADA' || r.status === 'CANCELADA');
      return withCompletion({
        ...c,
        repairs,
        preparationStatus: allFinished ? 'LISTA' : c.preparationStatus,
        preparationReadyDate: allFinished && c.preparationStatus !== 'LISTA'
          ? formatDate(getLocalDateInputValue())
          : c.preparationReadyDate
      });
    }));
    logAudit(caseId, 'Reparación Creada', `Reparación "${repairData.description}" registrada`);
  };

  const updateExitRepair = (caseId: string, repairId: string, updates: Partial<ExitRepair>) => {
    setCases(prev => prev.map(c => {
      if (c.id !== caseId) return c;
      const repairs = c.repairs.map(r => r.id === repairId ? { ...r, ...updates } : r);
      const allFinished = repairs.length > 0 && repairs.every(r => r.status === 'TERMINADA' || r.status === 'CANCELADA');
      return withCompletion({
        ...c,
        repairs,
        preparationStatus: allFinished ? 'LISTA' : c.preparationStatus,
        preparationReadyDate: allFinished && c.preparationStatus !== 'LISTA'
          ? formatDate(getLocalDateInputValue())
          : c.preparationReadyDate
      });
    }));
    logAudit(caseId, 'Reparación Actualizada', `Reparación ${repairId} actualizada`);
  };

  const deleteExitRepair = (caseId: string, repairId: string) => {
    setCases(prev => prev.map(c => c.id === caseId ? withCompletion({ ...c, repairs: c.repairs.filter(r => r.id !== repairId) }) : c));
    logAudit(caseId, 'Reparación Eliminada', `Reparación ${repairId} eliminada`);
  };

  const buildTenantCreditMovement = (caseId: string, charge: Charge, movementId?: string): FinancialMovement => ({
    id: movementId || `MOV-ABONO-${Date.now()}`,
    caseId,
    date: formatDate(charge.date || getLocalDateInputValue()),
    time: new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
    type: 'ABONO_ARRENDATARIO',
    description: `Abono previo del arrendatario: ${charge.description}`,
    amount: Math.abs(charge.amount),
    user: userRole,
    reference: charge.id,
    observation: charge.notes || 'Abono proporcional registrado en cargos y abonos'
  });

  const addCharge = (caseId: string, chargeData: Omit<Charge, 'id'>) => {
    const targetCase = cases.find(c => c.id === caseId);
    if (!targetCase || targetCase.isClosed || targetCase.liquidationStatus === 'EMITIDA') return;

    const chargeId = 'CHG-' + Date.now();
    const newCharge: Charge = { ...chargeData, id: chargeId };
    const creditMovement = newCharge.amount < 0 ? buildTenantCreditMovement(caseId, newCharge) : null;

    setCases(prev => prev.map(c => c.id === caseId ? withCompletion({
      ...c,
      charges: [...c.charges, newCharge],
      movements: creditMovement ? [...c.movements, creditMovement] : c.movements
    }) : c));
  };

  const updateCharge = (caseId: string, chargeId: string, updates: Partial<Charge>) => {
    const targetCase = cases.find(c => c.id === caseId);
    const oldCharge = targetCase?.charges.find(ch => ch.id === chargeId);
    if (!targetCase || !oldCharge || targetCase.isClosed || targetCase.liquidationStatus === 'EMITIDA') return;

    const updatedCharge: Charge = { ...oldCharge, ...updates };

    setCases(prev => prev.map(c => {
      if (c.id !== caseId) return c;
      let movements = c.movements.filter(m => !(m.type === 'CARGO' && m.reference === chargeId));
      const existingCredit = movements.find(m => m.type === 'ABONO_ARRENDATARIO' && m.reference === chargeId);
      movements = movements.filter(m => !(m.type === 'ABONO_ARRENDATARIO' && m.reference === chargeId));
      if (updatedCharge.amount < 0) {
        movements = [...movements, buildTenantCreditMovement(caseId, updatedCharge, existingCredit?.id)];
      }
      return withCompletion({
        ...c,
        charges: c.charges.map(ch => ch.id === chargeId ? updatedCharge : ch),
        movements
      });
    }));
  };

  const deleteCharge = (caseId: string, chargeId: string) => {
    const targetCase = cases.find(c => c.id === caseId);
    if (!targetCase || targetCase.isClosed || targetCase.liquidationStatus === 'EMITIDA') return;
    setCases(prev => prev.map(c => c.id === caseId ? withCompletion({
      ...c,
      charges: c.charges.filter(ch => ch.id !== chargeId),
      movements: c.movements.filter(m => !((m.type === 'CARGO' || m.type === 'ABONO_ARRENDATARIO') && m.reference === chargeId))
    }) : c));
    logAudit(caseId, 'Cargo/Abono Eliminado', `Movimiento ${chargeId} eliminado antes de confirmar la liquidación`);
  };

  const addFinancialMovement = (caseId: string, movementData: Omit<FinancialMovement, 'id' | 'caseId'>) => {
    let normalized = { ...movementData };

    // Compatibilidad con el formulario actual: convierte el destino/modalidad textual en datos estructurados.
    if (normalized.type === 'APORTE_PROPIETARIO') {
      const hayReparacion = /reparacion/i.test(`${normalized.description} ${normalized.observation}`);
      const pagoDirecto = /pagado directamente|fauna no recibió/i.test(`${normalized.description} ${normalized.observation}`);
      normalized = {
        ...normalized,
        ownerPaymentPurpose: normalized.ownerPaymentPurpose || (hayReparacion ? 'REPARACIONES' : 'SERVICIOS'),
        ownerPaymentMode: normalized.ownerPaymentMode || (pagoDirecto ? 'PAGADO_DIRECTO' : 'TRANSFERIDO_FAUNA')
      };
    }

    const newMovement: FinancialMovement = { ...normalized, id: 'MOV-' + Date.now(), caseId };
    setCases(prev => prev.map(c => c.id === caseId ? withCompletion({ ...c, movements: [...c.movements, newMovement] }) : c));
    logAudit(caseId, 'Movimiento Financiero', `Movimiento ${normalized.type}: ${normalized.description} ($${normalized.amount})`);
  };

  const addAttachment = (caseId: string, attachmentData: Omit<CaseAttachment, 'id'>) => {
    const attachment: CaseAttachment = { ...attachmentData, id: 'ATT-' + Date.now() };
    setCases(prev => prev.map(c => c.id === caseId ? withCompletion({ ...c, attachments: [...c.attachments, attachment] }) : c));
    logAudit(caseId, 'Documento Adjuntado', `Archivo ${attachmentData.name} adjuntado`);
  };

  const createReceivableFromCase = (caseId: string): Receivable | null => {
    const targetCase = cases.find(c => c.id === caseId);
    if (!targetCase) return null;

    const existing = receivables.find(r => r.caseId === caseId);
    if (existing) return existing;

    const fin = calculateGuaranteeFinances(targetCase, settings);
    const deficit = fin.tenantReceivableAmount;
    if (deficit <= 0) return null;

    const newRecId = nextSequentialId('REC', receivables.map(r => r.id));
    const today = formatDate(getLocalDateInputValue());
    const newReceivable: Receivable = {
      id: newRecId,
      caseId,
      tenantName: targetCase.tenantName,
      tenantRut: targetCase.tenantRut,
      tenantPhone: targetCase.tenantPhone,
      tenantEmail: targetCase.tenantEmail,
      propertyAddress: `${targetCase.propertyAddress}, ${targetCase.propertyUnit}, ${targetCase.propertyComuna}`,
      ownerName: targetCase.ownerName,
      originalAmount: deficit,
      totalPaid: 0,
      pendingBalance: deficit,
      ownerContributionToRecover: targetCase.ownerContribution || 0,
      faunaFinancingToRecover: fin.faunaFinancingRequired,
      status: 'PENDIENTE',
      createdDate: today,
      lastManagementDate: today,
      nextManagementDate: targetCase.nextManagementDate || today,
      nextManagement: targetCase.nextManagement || 'Gestionar cobro con arrendatario'
    };

    setReceivables(prev => [newReceivable, ...prev]);
    setCases(prev => prev.map(c => c.id === caseId ? withCompletion({
      ...c,
      receivableId: newRecId,
      receivableStatus: 'PENDIENTE'
    }) : c));

    logAudit(caseId, 'Cuenta por Cobrar Creada', `Generada cuenta por cobrar ${newRecId} por $${deficit}`);
    return newReceivable;
  };

  const emitLiquidation = (caseId: string) => {
    const targetCase = cases.find(c => c.id === caseId);
    if (!targetCase || targetCase.liquidationStatus !== 'LISTA' || targetCase.blockedBy !== 'SIN_BLOQUEO') return;

    const fin = calculateGuaranteeFinances(targetCase, settings);
    const readiness = calculateFundingReadiness(targetCase, settings);
    if (!readiness.readyToConfirm) return;

    let refund = targetCase.refund;
    let receivableId = targetCase.receivableId;
    let receivableStatus = targetCase.receivableStatus;

    if (fin.isSurplus) {
      refund = {
        amount: fin.refundToTenant,
        status: 'PENDIENTE',
        destinationAccount: 'Pendiente de registrar por usuario',
        notes: 'Monto a devolver al arrendatario'
      };
    } else if (fin.isInsufficient) {
      const rec = createReceivableFromCase(caseId);
      if (rec) {
        receivableId = rec.id;
        receivableStatus = rec.status;
      }
    }

    const issuedAt = new Date().toISOString();
    const issuedDate = formatDate(getLocalDateInputValue());
    const snapshot = {
      calculationVersion: '2026-08-v2' as const,
      issuedAt,
      issuedDate,
      tenantDocumentNumber: `LIQ-AR-${targetCase.id}`,
      ownerDocumentNumber: `LIQ-PROP-${targetCase.id}`,
      faunaCompanyName: settings.faunaCompanyName,
      faunaRut: settings.faunaRut,
      faunaAddress: settings.faunaAddress,
      propertyAddress: targetCase.propertyAddress,
      propertyComuna: targetCase.propertyComuna,
      propertyUnit: targetCase.propertyUnit,
      receptionDate: targetCase.receptionDate,
      plan: targetCase.plan,
      ownerName: targetCase.ownerName,
      ownerRut: targetCase.ownerRut,
      tenantName: targetCase.tenantName,
      tenantRut: targetCase.tenantRut,
      tenantEmail: targetCase.tenantEmail,
      charges: targetCase.charges.filter(isChargeIncludedInLiquidation).map(ch => ({
        ...ch,
        documents: [...(ch.documents || [])],
        photos: [...(ch.photos || [])],
        repairTracking: ch.repairTracking ? { ...ch.repairTracking } : undefined
      })),
      financials: {
        guaranteeAmount: fin.guaranteeAmount,
        grossCharges: fin.grossCharges,
        tenantCredits: fin.tenantCredits,
        totalCharges: fin.totalCharges,
        tenantDeficit: fin.tenantDeficit,
        refundToTenant: fin.refundToTenant,
        fullCoverageApplied: fin.fullCoverageApplied,
        faunaFinancingRequired: fin.faunaFinancingRequired,
        ownerRepairFundingRequired: fin.ownerRepairFundingRequired,
        ownerServiceObligation: fin.ownerServiceObligation,
        ownerRepairPendingAtIssue: readiness.ownerRepairPendingProvision,
        ownerServicePendingAtIssue: readiness.ownerServicePending,
        ownerContributionAppliedAtIssue: readiness.ownerRepairFundedTotal + readiness.ownerServiceFundedTotal
      }
    };

    const financingMovement: FinancialMovement | null = fin.faunaFinancingRequired > 0 ? {
      id: `MOV-FULL-${Date.now()}`,
      caseId,
      date: issuedDate,
      time: new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
      type: 'FINANCIAMIENTO_FAUNA',
      description: 'Cobertura Plan Full desembolsada al confirmar liquidación',
      amount: fin.faunaFinancingRequired,
      user: userRole,
      reference: `FULL-${targetCase.id}`,
      observation: `Beneficio contractual bruto ${fin.fullCoverageApplied}; exposición neta Fauna ${fin.faunaFinancingRequired}`
    } : null;

    setCases(prev => prev.map(c => c.id === caseId ? withCompletion({
      ...c,
      liquidationStatus: 'EMITIDA',
      liquidationSnapshot: snapshot,
      refund,
      receivableId,
      receivableStatus,
      fullCoverageApplied: fin.fullCoverageApplied,
      faunaFinancing: fin.faunaFinancingRequired,
      movements: financingMovement ? [...c.movements, financingMovement] : c.movements
    }) : c));

    logAudit(caseId, 'Emisión de Liquidación', `Liquidación confirmada y congelada con versión de cálculo ${snapshot.calculationVersion}`);
  };

  const registerTenantRefund = (
    caseId: string,
    refundData: { date: string; voucherName?: string; destinationAccount?: string; notes?: string }
  ) => {
    const targetCase = cases.find(c => c.id === caseId);
    if (!targetCase?.refund) return;

    const refundAmount = targetCase.refund.amount;
    const movement: FinancialMovement = {
      id: 'MOV-' + Date.now(),
      caseId,
      date: formatDate(refundData.date || getLocalDateInputValue()),
      time: new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
      type: 'DEVOLUCION_ARRENDATARIO',
      description: `Devolución de garantía a arrendatario (${targetCase.tenantName})`,
      amount: -refundAmount,
      user: userRole,
      reference: refundData.voucherName || 'COMPROBANTE-DEV',
      observation: refundData.notes || 'Transferencia de saldo a favor efectuada'
    };

    setCases(prev => prev.map(c => {
      if (c.id !== caseId || !c.refund) return c;
      const updatedRefund: TenantRefund = {
        ...c.refund,
        status: 'TRANSFERIDA',
        date: refundData.date,
        voucherName: refundData.voucherName,
        destinationAccount: refundData.destinationAccount || c.refund.destinationAccount,
        notes: refundData.notes,
        user: userRole
      };
      return withCompletion({ ...c, refund: updatedRefund, movements: [...c.movements, movement] });
    }));

    logAudit(caseId, 'Devolución Transferida', `Registrada transferencia de $${refundAmount} a arrendatario`);
  };

  const recordTenantPayment = (receivableId: string, paymentAmount: number, notes: string, paymentDate?: string) => {
    const targetRec = receivables.find(r => r.id === receivableId);
    if (!targetRec || paymentAmount <= 0 || paymentAmount > targetRec.pendingBalance) return;

    const targetCase = cases.find(c => c.id === targetRec.caseId);
    const ownerToRecover = targetCase ? Math.max(0, targetCase.ownerContribution || 0) : targetRec.ownerContributionToRecover;
    const faunaToRecover = targetCase ? Math.max(0, targetCase.faunaFinancing || 0) : targetRec.faunaFinancingToRecover;
    const dist = calculatePaymentDistribution(paymentAmount, ownerToRecover, faunaToRecover);

    const dateStr = formatDate(paymentDate || getLocalDateInputValue());
    const timeStr = new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
    const newPending = Math.max(0, targetRec.pendingBalance - paymentAmount);
    const newStatus: Receivable['status'] = newPending <= 0 ? 'PAGADA' : 'PAGO_PARCIAL';

    setReceivables(prev => prev.map(r => r.id === receivableId ? {
      ...r,
      totalPaid: r.totalPaid + paymentAmount,
      pendingBalance: newPending,
      ownerContributionToRecover: dist.remainingOwnerContribution,
      faunaFinancingToRecover: dist.remainingFaunaFinancing,
      status: newStatus,
      lastManagementDate: dateStr
    } : r));

    const caseId = targetRec.caseId;
    const movements: FinancialMovement[] = [{
      id: 'MOV-' + Date.now() + '-1',
      caseId,
      date: dateStr,
      time: timeStr,
      type: 'PAGO_ARRENDATARIO',
      description: `Pago abonado por arrendatario (${targetRec.tenantName})`,
      amount: paymentAmount,
      user: userRole,
      reference: receivableId,
      observation: notes || 'Abono a cuenta por cobrar'
    }];

    if (dist.ownerRecovery > 0) movements.push({
      id: 'MOV-' + Date.now() + '-2',
      caseId,
      date: dateStr,
      time: timeStr,
      type: 'RECUPERACION_PROPIETARIO',
      description: `Recuperación de monto asumido por propietario (${targetRec.ownerName})`,
      amount: dist.ownerRecovery,
      user: userRole,
      reference: `RECUP-PROP-${receivableId}`,
      observation: 'Distribución automática: prioridad propietario'
    });

    if (dist.faunaRecovery > 0) movements.push({
      id: 'MOV-' + Date.now() + '-3',
      caseId,
      date: dateStr,
      time: timeStr,
      type: 'RECUPERACION_FAUNA',
      description: 'Recuperación de financiamiento operativo Fauna',
      amount: dist.faunaRecovery,
      user: userRole,
      reference: `RECUP-FAUNA-${receivableId}`,
      observation: 'Distribución automática: prioridad Fauna después del propietario'
    });

    if (dist.surplusPayment > 0) movements.push({
      id: 'MOV-' + Date.now() + '-4',
      caseId,
      date: dateStr,
      time: timeStr,
      type: 'SALDO_PAGO_ARRENDATARIO',
      description: 'Saldo de pago aplicado a deuda del arrendatario',
      amount: dist.surplusPayment,
      user: userRole,
      reference: `SALDO-${receivableId}`,
      observation: 'Parte del pago que no corresponde a recuperar monto del propietario ni financiamiento Fauna'
    });

    setCases(prev => prev.map(c => c.id === caseId ? withCompletion({
      ...c,
      ownerContribution: Math.max(0, (c.ownerContribution || 0) - dist.ownerRecovery),
      faunaFinancing: Math.max(0, (c.faunaFinancing || 0) - dist.faunaRecovery),
      movements: [...c.movements, ...movements],
      receivableStatus: newStatus
    }) : c));

    logAudit(
      caseId,
      'Pago de Arrendatario Registrado',
      `Pago de $${paymentAmount} registrado. Recuperación propietario: $${dist.ownerRecovery}, Recuperación Fauna: $${dist.faunaRecovery}`
    );
  };

  const markReceivableUncollectible = (receivableId: string, reason: string) => {
    const targetRec = receivables.find(r => r.id === receivableId);
    if (!targetRec || !reason.trim() || targetRec.status === 'PAGADA' || targetRec.status === 'INCOBRABLE') return;

    const targetCase = cases.find(c => c.id === targetRec.caseId);
    const today = formatDate(getLocalDateInputValue());
    const time = new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
    const ownerWriteOff = targetCase
      ? Math.max(0, targetCase.ownerContribution || 0)
      : Math.max(0, targetRec.ownerContributionToRecover || 0);
    const faunaWriteOff = targetCase
      ? Math.max(0, targetCase.faunaFinancing || 0)
      : Math.max(0, targetRec.faunaFinancingToRecover || 0);

    const writeOffMovements: FinancialMovement[] = [];
    if (ownerWriteOff > 0) writeOffMovements.push({
      id: `MOV-CAST-PROP-${Date.now()}`,
      caseId: targetRec.caseId,
      date: today,
      time,
      type: 'CASTIGO_PROPIETARIO',
      description: 'Monto asumido por propietario no recuperado por cobranza incobrable',
      amount: ownerWriteOff,
      user: userRole,
      reference: `CASTIGO-${receivableId}`,
      observation: reason.trim()
    });
    if (faunaWriteOff > 0) writeOffMovements.push({
      id: `MOV-CAST-FAUNA-${Date.now()}`,
      caseId: targetRec.caseId,
      date: today,
      time,
      type: 'CASTIGO_FAUNA',
      description: 'Financiamiento Fauna no recuperado por cobranza incobrable',
      amount: faunaWriteOff,
      user: userRole,
      reference: `CASTIGO-${receivableId}`,
      observation: reason.trim()
    });

    setReceivables(prev => prev.map(r => r.id === receivableId ? {
      ...r,
      status: 'INCOBRABLE',
      lastManagementDate: today,
      nextManagement: '',
      nextManagementDate: '',
      ownerContributionToRecover: 0,
      faunaFinancingToRecover: 0,
      uncollectibleReason: reason.trim(),
      uncollectibleDate: today,
      uncollectibleUser: userRole
    } : r));

    setCases(prev => prev.map(c => c.id === targetRec.caseId ? withCompletion({
      ...c,
      receivableStatus: 'INCOBRABLE',
      ownerContribution: 0,
      faunaFinancing: 0,
      nextManagement: '',
      nextManagementDate: '',
      movements: [...c.movements, ...writeOffMovements]
    }) : c));

    logAudit(
      targetRec.caseId,
      'Cuenta por Cobrar Marcada Incobrable',
      `${targetRec.id} · saldo ${targetRec.pendingBalance} · castigo propietario $${ownerWriteOff} · castigo Fauna $${faunaWriteOff} · motivo: ${reason.trim()}`
    );
  };

  const closeGuaranteeCase = (caseId: string): { success: boolean; message: string } => {
    const targetCase = cases.find(c => c.id === caseId);
    if (!targetCase) return { success: false, message: 'Caso no encontrado.' };

    if (!isCaseCompleted(targetCase, settings)) {
      const pending: string[] = [];
      if (targetCase.blockedBy !== 'SIN_BLOQUEO') pending.push(`bloqueo por ${targetCase.blockedBy.toLowerCase()}`);
      if (targetCase.preparationStatus !== 'LISTA') pending.push('preparación física');
      if (targetCase.liquidationStatus !== 'EMITIDA') pending.push('liquidación emitida');
      if (targetCase.refund && targetCase.refund.amount > 0 && targetCase.refund.status !== 'TRANSFERIDA') pending.push('devolución al arrendatario');
      if (targetCase.receivableStatus && targetCase.receivableStatus !== 'PAGADA' && targetCase.receivableStatus !== 'INCOBRABLE') pending.push('cuenta por cobrar');
      if (calculateFundingReadiness(targetCase, settings).ownerServicePending > 0 && !targetCase.ownerServiceDeferral) pending.push('gastos comunes/servicios pendientes del propietario sin acuerdo de diferimiento');
      return { success: false, message: `No se puede cerrar el caso todavía. Pendiente: ${pending.join(', ') || 'requisitos operativos del caso'}.` };
    }

    const readinessAtClose = calculateFundingReadiness(targetCase, settings);
    const pendingToTransfer = readinessAtClose.ownerServicePending;
    const existingPostClosePending = targetCase.ownerPostClosePending;
    const postClosePending = pendingToTransfer > 0 && targetCase.ownerServiceDeferral
      ? {
          amountAtTransfer: existingPostClosePending?.amountAtTransfer || pendingToTransfer,
          reason: targetCase.ownerServiceDeferral.reason,
          nextReviewDate: targetCase.ownerServiceDeferral.nextReviewDate,
          responsible: targetCase.ownerServiceDeferral.responsible,
          transferredAt: existingPostClosePending?.transferredAt || new Date().toISOString(),
          transferredBy: existingPostClosePending?.transferredBy || userRole,
          status: 'PENDIENTE' as const
        }
      : existingPostClosePending;

    setCases(prev => prev.map(c => c.id === caseId ? {
      ...c,
      isClosed: true,
      closedAt: new Date().toLocaleString('es-CL'),
      closedBy: userRole,
      isCompleted: true,
      ownerPostClosePending: postClosePending,
      ownerServiceDeferral: postClosePending ? undefined : c.ownerServiceDeferral,
      nextManagement: '',
      nextManagementDate: '',
      nextManagementResponsible: ''
    } : c));

    if (postClosePending && pendingToTransfer > 0) {
      logAudit(
        caseId,
        'Pendiente propietario traspasado',
        `${formatDate(postClosePending.nextReviewDate)} · ${postClosePending.responsible} · saldo ${pendingToTransfer} trasladado a seguimiento posterior para permitir cierre de garantía/contrato`
      );
    }
    logAudit(caseId, 'Cierre de Caso', `Caso ${caseId} cerrado por ${userRole}`);
    return {
      success: true,
      message: postClosePending && pendingToTransfer > 0
        ? 'Garantía cerrada. El pendiente del propietario quedó traspasado a seguimiento posterior.'
        : 'Caso cerrado con éxito.'
    };
  };

  const reopenGuaranteeCase = (caseId: string) => {
    if (userRole !== 'ADMINISTRADOR') return;
    const targetCase = cases.find(c => c.id === caseId);
    if (!targetCase) return;

    const readiness = calculateFundingReadiness(targetCase, settings);
    const pendingPostClose = targetCase.ownerPostClosePending?.status === 'PENDIENTE'
      && readiness.ownerServicePending > 0
      ? targetCase.ownerPostClosePending
      : undefined;

    setCases(prev => prev.map(c => c.id === caseId ? withCompletion({
      ...c,
      isClosed: false,
      ownerServiceDeferral: pendingPostClose ? {
        amountAtDeferral: readiness.ownerServicePending,
        reason: pendingPostClose.reason,
        nextReviewDate: pendingPostClose.nextReviewDate,
        responsible: pendingPostClose.responsible,
        createdAt: pendingPostClose.transferredAt,
        createdBy: pendingPostClose.transferredBy
      } : c.ownerServiceDeferral,
      ownerPostClosePending: pendingPostClose ? undefined : c.ownerPostClosePending,
      nextManagement: pendingPostClose ? `Revisar pendiente propietario de ${formatCLP(readiness.ownerServicePending)}` : c.nextManagement,
      nextManagementDate: pendingPostClose ? pendingPostClose.nextReviewDate : c.nextManagementDate,
      nextManagementResponsible: pendingPostClose ? pendingPostClose.responsible : c.nextManagementResponsible
    }) : c));

    if (pendingPostClose) {
      logAudit(caseId, 'Seguimiento posterior reincorporado', 'El pendiente del propietario volvió al flujo activo al reabrir la garantía.');
    }
    logAudit(caseId, 'Reapertura de Caso', `Caso ${caseId} reabierto por Administrador`);
  };

  const updateSettings = (newSettings: SystemSettings) => {
    setSettings(newSettings);
    logAudit('SYSTEM', 'Configuración Actualizada', 'Parámetros del sistema modificados');
  };

  return (
    <AppContext.Provider value={{
      userRole,
      setUserRole,
      activeView,
      setActiveView,
      selectedCaseId,
      setSelectedCaseId,
      cases,
      receivables,
      settings,
      auditLogs,
      createGuaranteeCase,
      updateGuaranteeCase,
      changePreparationStatus,
      changeLiquidationStatus,
      updateRequirementStatus,
      addRequirement,
      addFollowUpComment,
      addExitRepair,
      updateExitRepair,
      deleteExitRepair,
      addCharge,
      updateCharge,
      deleteCharge,
      addFinancialMovement,
      addAttachment,
      emitLiquidation,
      registerTenantRefund,
      createReceivableFromCase,
      recordTenantPayment,
      markReceivableUncollectible,
      closeGuaranteeCase,
      reopenGuaranteeCase,
      updateSettings,
      logAudit
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
