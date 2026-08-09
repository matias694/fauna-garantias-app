import React, { createContext, useContext, useState, useEffect } from 'react';
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
import { addDaysToDate, formatDate } from '../utils/formatters';
import { calculateGuaranteeFinances, calculatePaymentDistribution } from '../utils/calculations';

export function isCaseCompleted(c: GuaranteeCase): boolean {
  if (c.liquidationStatus !== 'EMITIDA') return false;
  if (c.preparationStatus !== 'LISTA') return false;

  if (c.refund && c.refund.amount > 0 && c.refund.status !== 'TRANSFERIDA') {
    return false;
  }

  if (c.receivableStatus && c.receivableStatus !== 'PAGADA' && c.receivableStatus !== 'INCOBRABLE') {
    return false;
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
  recordTenantPayment: (receivableId: string, paymentAmount: number, notes: string) => void;

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
        const parsed = JSON.parse(saved);
        return parsed.map((c: GuaranteeCase) => ({
          ...c,
          isCompleted: isCaseCompleted(c)
        }));
      } catch (e) {
        console.error(e);
      }
    }
    return initialGuaranteeCases.map(c => ({
      ...c,
      isCompleted: isCaseCompleted(c)
    }));
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

  useEffect(() => {
    localStorage.setItem('fauna_guarantee_cases_v2', JSON.stringify(cases));
  }, [cases]);

  useEffect(() => {
    localStorage.setItem('fauna_receivables_v2', JSON.stringify(receivables));
  }, [receivables]);

  useEffect(() => {
    localStorage.setItem('fauna_settings_v2', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('fauna_audit_logs_v2', JSON.stringify(auditLogs));
  }, [auditLogs]);

  const logAudit = (caseId: string, action: string, detail: string) => {
    const newLog: AuditLog = {
      id: 'LOG-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      caseId,
      timestamp: new Date().toLocaleString('es-CL'),
      user: userRole,
      action,
      detail
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  const createGuaranteeCase = (
    caseData: Omit<GuaranteeCase, 'id' | 'deadlineDate' | 'alertDate' | 'repairs' | 'charges' | 'attachments' | 'movements' | 'ownerContribution' | 'fullCoverageApplied' | 'faunaFinancing' | 'requirements' | 'followUps' | 'isClosed'>
  ): GuaranteeCase => {
    const nextNumber = cases.length + 1;
    const formattedId = `GAR-${String(nextNumber).padStart(4, '0')}`;

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

    const newCase: GuaranteeCase = {
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
    };

    newCase.isCompleted = isCaseCompleted(newCase);

    setCases(prev => [newCase, ...prev]);
    logAudit(formattedId, 'Creación de Caso', `Caso ${formattedId} creado para propiedad ${caseData.propertyAddress}`);
    return newCase;
  };

  const updateGuaranteeCase = (caseId: string, updates: Partial<GuaranteeCase>) => {
    setCases(prev => prev.map(c => {
      if (c.id === caseId) {
        const updated = { ...c, ...updates };
        updated.isCompleted = isCaseCompleted(updated);
        return updated;
      }
      return c;
    }));
    logAudit(caseId, 'Actualización de Caso', `Actualizados datos del caso ${caseId}`);
  };

  const changePreparationStatus = (caseId: string, newStatus: PreparationStatus) => {
    const todayStr = formatDate(new Date().toISOString().split('T')[0]);
    setCases(prev => prev.map(c => {
      if (c.id === caseId) {
        const isNowReady = newStatus === 'LISTA';
        const readyDate = isNowReady ? todayStr : c.preparationReadyDate;
        const updated = {
          ...c,
          preparationStatus: newStatus,
          preparationReadyDate: readyDate
        };
        updated.isCompleted = isCaseCompleted(updated);
        return updated;
      }
      return c;
    }));

    logAudit(caseId, 'Preparación Actualizada', `${userRole} cambió Preparación de propiedad a ${newStatus}`);
  };

  const changeLiquidationStatus = (
    caseId: string,
    newStatus: LiquidationStatus,
    blockedBy: BlockedByReason = 'SIN_BLOQUEO',
    blockedNotes: string = ''
  ) => {
    setCases(prev => prev.map(c => {
      if (c.id === caseId) {
        const updated = {
          ...c,
          liquidationStatus: newStatus,
          blockedBy,
          blockedReasonNotes: blockedNotes
        };
        updated.isCompleted = isCaseCompleted(updated);
        return updated;
      }
      return c;
    }));

    logAudit(caseId, 'Estado Liquidación Cambiado', `${userRole} cambió Liquidación a ${newStatus} (Bloqueo: ${blockedBy})`);
  };

  const updateRequirementStatus = (caseId: string, requirementId: string, status: RequirementStatus, notes?: string) => {
    setCases(prev => prev.map(c => {
      if (c.id === caseId) {
        const updatedReqs = c.requirements.map(req => req.id === requirementId ? { ...req, status, notes: notes !== undefined ? notes : req.notes } : req);
        const allDone = updatedReqs.every(r => r.status === 'COMPLETO' || r.status === 'NO_APLICA');
        let newLiqStatus = c.liquidationStatus;

        if (allDone && c.liquidationStatus === 'EN_PREPARACION') {
          newLiqStatus = 'LISTA';
        } else if (!allDone && c.liquidationStatus === 'LISTA') {
          newLiqStatus = 'EN_PREPARACION';
        }

        const updated = {
          ...c,
          requirements: updatedReqs,
          liquidationStatus: newLiqStatus
        };
        updated.isCompleted = isCaseCompleted(updated);
        return updated;
      }
      return c;
    }));

    logAudit(caseId, 'Requisito Actualizado', `Requisito ${requirementId} marcado como ${status}`);
  };

  const addRequirement = (caseId: string, name: string) => {
    const newReq: LiquidationRequirement = {
      id: 'REQ-' + Date.now(),
      name,
      status: 'PENDIENTE'
    };

    setCases(prev => prev.map(c => {
      if (c.id === caseId) {
        const updatedReqs = [...c.requirements, newReq];
        const newLiqStatus = c.liquidationStatus === 'LISTA' ? 'EN_PREPARACION' : c.liquidationStatus;
        const updated = {
          ...c,
          requirements: updatedReqs,
          liquidationStatus: newLiqStatus
        };
        updated.isCompleted = isCaseCompleted(updated);
        return updated;
      }
      return c;
    }));

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
      createdAt: nowStr,
      nextManagement: data.nextManagement,
      nextManagementDate: data.nextManagementDate,
      nextManagementResponsible: data.nextManagementResponsible
    };

    setCases(prev => prev.map(c => {
      if (c.id === caseId) {
        const updated = {
          ...c,
          followUps: [newComment, ...c.followUps],
          nextManagement: data.nextManagement !== undefined ? data.nextManagement : c.nextManagement,
          nextManagementDate: data.nextManagementDate !== undefined ? data.nextManagementDate : c.nextManagementDate,
          nextManagementResponsible: data.nextManagementResponsible !== undefined ? data.nextManagementResponsible : c.nextManagementResponsible
        };
        updated.isCompleted = isCaseCompleted(updated);
        return updated;
      }
      return c;
    }));

    logAudit(caseId, 'Seguimiento Registrado', `Comentario [${data.area}] añadido por ${userRole}`);
  };

  const addExitRepair = (caseId: string, repairData: Omit<ExitRepair, 'id'>) => {
    const repairId = 'REP-' + Date.now();
    const newRepair: ExitRepair = {
      ...repairData,
      id: repairId
    };

    setCases(prev => prev.map(c => {
      if (c.id === caseId) {
        const newRepairs = [...c.repairs, newRepair];
        const allFinished = newRepairs.length > 0 && newRepairs.every(r => r.status === 'TERMINADA' || r.status === 'CANCELADA');
        const isNowReady = allFinished && c.preparationStatus !== 'LISTA';
        const readyDate = isNowReady ? formatDate(new Date().toISOString().split('T')[0]) : c.preparationReadyDate;

        const updated = {
          ...c,
          repairs: newRepairs,
          preparationStatus: allFinished ? ('LISTA' as PreparationStatus) : c.preparationStatus,
          preparationReadyDate: readyDate
        };
        updated.isCompleted = isCaseCompleted(updated);
        return updated;
      }
      return c;
    }));

    logAudit(caseId, 'Reparación Creada', `Reparación "${repairData.description}" registrada`);
  };

  const updateExitRepair = (caseId: string, repairId: string, updates: Partial<ExitRepair>) => {
    setCases(prev => prev.map(c => {
      if (c.id === caseId) {
        const updatedRepairs = c.repairs.map(r => r.id === repairId ? { ...r, ...updates } : r);
        const allFinished = updatedRepairs.length > 0 && updatedRepairs.every(r => r.status === 'TERMINADA' || r.status === 'CANCELADA');
        const isNowReady = allFinished && c.preparationStatus !== 'LISTA';
        const readyDate = isNowReady ? formatDate(new Date().toISOString().split('T')[0]) : c.preparationReadyDate;

        const updated = {
          ...c,
          repairs: updatedRepairs,
          preparationStatus: allFinished ? ('LISTA' as PreparationStatus) : c.preparationStatus,
          preparationReadyDate: readyDate
        };
        updated.isCompleted = isCaseCompleted(updated);
        return updated;
      }
      return c;
    }));

    logAudit(caseId, 'Reparación Actualizada', `Reparación ${repairId} actualizada`);
  };

  const deleteExitRepair = (caseId: string, repairId: string) => {
    setCases(prev => prev.map(c => {
      if (c.id === caseId) {
        const filteredRepairs = c.repairs.filter(r => r.id !== repairId);
        const updated = {
          ...c,
          repairs: filteredRepairs
        };
        updated.isCompleted = isCaseCompleted(updated);
        return updated;
      }
      return c;
    }));
    logAudit(caseId, 'Reparación Eliminada', `Reparación ${repairId} eliminada`);
  };

  const addCharge = (caseId: string, chargeData: Omit<Charge, 'id'>) => {
    const chargeId = 'CHG-' + Date.now();
    const newCharge: Charge = {
      ...chargeData,
      id: chargeId
    };

    const newMovement: FinancialMovement = {
      id: 'MOV-' + Date.now(),
      caseId,
      date: formatDate(chargeData.date || new Date().toISOString().split('T')[0]),
      time: new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
      type: 'CARGO',
      description: `Cargo: ${chargeData.description}`,
      amount: -chargeData.amount,
      user: userRole,
      reference: chargeId,
      observation: chargeData.notes || 'Cargo ingresado al caso'
    };

    setCases(prev => prev.map(c => {
      if (c.id === caseId) {
        const updated = {
          ...c,
          charges: [...c.charges, newCharge],
          movements: [...c.movements, newMovement]
        };
        updated.isCompleted = isCaseCompleted(updated);
        return updated;
      }
      return c;
    }));

    logAudit(caseId, 'Cargo Creado', `Cargo "${chargeData.description}" por $${chargeData.amount} añadido`);
  };

  const updateCharge = (caseId: string, chargeId: string, updates: Partial<Charge>) => {
    setCases(prev => prev.map(c => {
      if (c.id === caseId) {
        const updatedCharges = c.charges.map(ch => ch.id === chargeId ? { ...ch, ...updates } : ch);
        const updated = {
          ...c,
          charges: updatedCharges
        };
        updated.isCompleted = isCaseCompleted(updated);
        return updated;
      }
      return c;
    }));
    logAudit(caseId, 'Cargo Actualizado', `Cargo ${chargeId} actualizado`);
  };

  const deleteCharge = (caseId: string, chargeId: string) => {
    setCases(prev => prev.map(c => {
      if (c.id === caseId) {
        const updated = {
          ...c,
          charges: c.charges.filter(ch => ch.id !== chargeId)
        };
        updated.isCompleted = isCaseCompleted(updated);
        return updated;
      }
      return c;
    }));
    logAudit(caseId, 'Cargo Eliminado', `Cargo ${chargeId} eliminado`);
  };

  const addFinancialMovement = (caseId: string, movementData: Omit<FinancialMovement, 'id' | 'caseId'>) => {
    const movId = 'MOV-' + Date.now();
    const newMov: FinancialMovement = {
      ...movementData,
      id: movId,
      caseId
    };

    setCases(prev => prev.map(c => {
      if (c.id === caseId) {
        const updated = {
          ...c,
          movements: [...c.movements, newMov]
        };
        updated.isCompleted = isCaseCompleted(updated);
        return updated;
      }
      return c;
    }));

    logAudit(caseId, 'Movimiento Financiero', `Movimiento ${movementData.type}: ${movementData.description} ($${movementData.amount})`);
  };

  const addAttachment = (caseId: string, attachmentData: Omit<CaseAttachment, 'id'>) => {
    const attId = 'ATT-' + Date.now();
    const newAtt: CaseAttachment = {
      ...attachmentData,
      id: attId
    };

    setCases(prev => prev.map(c => {
      if (c.id === caseId) {
        const updated = {
          ...c,
          attachments: [...c.attachments, newAtt]
        };
        updated.isCompleted = isCaseCompleted(updated);
        return updated;
      }
      return c;
    }));

    logAudit(caseId, 'Documento Adjuntado', `Archivo ${attachmentData.name} adjuntado`);
  };

  const emitLiquidation = (caseId: string) => {
    const targetCase = cases.find(c => c.id === caseId);
    if (!targetCase) return;
    if (targetCase.liquidationStatus !== 'LISTA') return;

    const fin = calculateGuaranteeFinances(targetCase, settings);
    let refund = targetCase.refund;
    let recId = targetCase.receivableId;
    let recStatus = targetCase.receivableStatus;

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
        recId = rec.id;
        recStatus = rec.status;
      }
    }

    setCases(prev => prev.map(c => {
      if (c.id === caseId) {
        const updated = {
          ...c,
          liquidationStatus: 'EMITIDA' as LiquidationStatus,
          refund,
          receivableId: recId,
          receivableStatus: recStatus
        };
        updated.isCompleted = isCaseCompleted(updated);
        return updated;
      }
      return c;
    }));

    logAudit(caseId, 'Emisión de Liquidación', `Liquidación de garantía emitida formalmente por ${userRole}`);
  };

  const registerTenantRefund = (
    caseId: string,
    refundData: { date: string; voucherName?: string; destinationAccount?: string; notes?: string }
  ) => {
    const targetCase = cases.find(c => c.id === caseId);
    if (!targetCase || !targetCase.refund) return;

    const refundAmount = targetCase.refund.amount;

    const newMovement: FinancialMovement = {
      id: 'MOV-' + Date.now(),
      caseId,
      date: formatDate(refundData.date || new Date().toISOString().split('T')[0]),
      time: new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
      type: 'DEVOLUCION_ARRENDATARIO',
      description: `Devolución de garantía a arrendatario (${targetCase.tenantName})`,
      amount: -refundAmount,
      user: userRole,
      reference: refundData.voucherName || 'COMPROBANTE-DEV',
      observation: refundData.notes || 'Transferencia de saldo a favor efectuada'
    };

    setCases(prev => prev.map(c => {
      if (c.id === caseId && c.refund) {
        const updatedRefund: TenantRefund = {
          ...c.refund,
          status: 'TRANSFERIDA',
          date: refundData.date,
          voucherName: refundData.voucherName,
          destinationAccount: refundData.destinationAccount || c.refund.destinationAccount,
          notes: refundData.notes,
          user: userRole
        };

        const updated = {
          ...c,
          refund: updatedRefund,
          movements: [...c.movements, newMovement]
        };
        updated.isCompleted = isCaseCompleted(updated);
        return updated;
      }
      return c;
    }));

    logAudit(caseId, 'Devolución Transferida', `Registrada transferencia de $${refundAmount} a arrendatario`);
  };

  const createReceivableFromCase = (caseId: string): Receivable | null => {
    const targetCase = cases.find(c => c.id === caseId);
    if (!targetCase) return null;

    const existing = receivables.find(r => r.caseId === caseId);
    if (existing) return existing;

    const totalCharges = targetCase.charges.reduce((acc, curr) => acc + curr.amount, 0);
    const deficit = Math.max(0, totalCharges - targetCase.guaranteeAmount);

    if (deficit <= 0) return null;

    const newRecId = `REC-${String(receivables.length + 1).padStart(4, '0')}`;
    const today = formatDate(new Date().toISOString().split('T')[0]);

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
      faunaFinancingToRecover: targetCase.faunaFinancing || 0,
      status: 'PENDIENTE',
      createdDate: today,
      lastManagementDate: today,
      nextManagementDate: targetCase.nextManagementDate || today,
      nextManagement: targetCase.nextManagement || 'Gestionar cobro con arrendatario'
    };

    setReceivables(prev => [newReceivable, ...prev]);

    setCases(prev => prev.map(c => {
      if (c.id === caseId) {
        const updated = {
          ...c,
          receivableId: newRecId,
          receivableStatus: 'PENDIENTE' as Receivable['status']
        };
        updated.isCompleted = isCaseCompleted(updated);
        return updated;
      }
      return c;
    }));

    logAudit(caseId, 'Cuenta por Cobrar Creada', `Generada cuenta por cobrar ${newRecId} por $${deficit}`);
    return newReceivable;
  };

  const recordTenantPayment = (receivableId: string, paymentAmount: number, notes: string) => {
    const targetRec = receivables.find(r => r.id === receivableId);
    if (!targetRec || paymentAmount <= 0 || paymentAmount > targetRec.pendingBalance) return;

    const dist = calculatePaymentDistribution(
      paymentAmount,
      targetRec.ownerContributionToRecover,
      targetRec.faunaFinancingToRecover
    );

    const todayStr = formatDate(new Date().toISOString().split('T')[0]);
    const nowTimeStr = new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
    const newPending = Math.max(0, targetRec.pendingBalance - paymentAmount);
    const newRecStatus: Receivable['status'] = newPending <= 0 ? 'PAGADA' : 'PAGO_PARCIAL';

    setReceivables(prev => prev.map(r => {
      if (r.id === receivableId) {
        return {
          ...r,
          totalPaid: r.totalPaid + paymentAmount,
          pendingBalance: newPending,
          ownerContributionToRecover: dist.remainingOwnerContribution,
          faunaFinancingToRecover: dist.remainingFaunaFinancing,
          status: newRecStatus,
          lastManagementDate: todayStr
        };
      }
      return r;
    }));

    const caseId = targetRec.caseId;
    const movementsToAdd: FinancialMovement[] = [];

    movementsToAdd.push({
      id: 'MOV-' + Date.now() + '-1',
      caseId,
      date: todayStr,
      time: nowTimeStr,
      type: 'PAGO_ARRENDATARIO',
      description: `Pago abonado por arrendatario (${targetRec.tenantName})`,
      amount: paymentAmount,
      user: userRole,
      reference: receivableId,
      observation: notes || 'Abono a cuenta por cobrar'
    });

    if (dist.ownerRecovery > 0) {
      movementsToAdd.push({
        id: 'MOV-' + Date.now() + '-2',
        caseId,
        date: todayStr,
        time: nowTimeStr,
        type: 'RECUPERACION_PROPIETARIO',
        description: `Recuperación de aporte de propietario (${targetRec.ownerName})`,
        amount: dist.ownerRecovery,
        user: userRole,
        reference: `RECUP-PROP-${receivableId}`,
        observation: 'Distribución automática: prioridad propietario'
      });
    }

    if (dist.faunaRecovery > 0) {
      movementsToAdd.push({
        id: 'MOV-' + Date.now() + '-3',
        caseId,
        date: todayStr,
        time: nowTimeStr,
        type: 'RECUPERACION_FAUNA',
        description: 'Recuperación de financiamiento operativo Fauna',
        amount: dist.faunaRecovery,
        user: userRole,
        reference: `RECUP-FAUNA-${receivableId}`,
        observation: 'Distribución automática: prioridad Fauna después del propietario'
      });
    }

    if (dist.surplusPayment > 0) {
      movementsToAdd.push({
        id: 'MOV-' + Date.now() + '-4',
        caseId,
        date: todayStr,
        time: nowTimeStr,
        type: 'SALDO_PAGO_ARRENDATARIO',
        description: 'Saldo de pago aplicado a deuda del arrendatario',
        amount: dist.surplusPayment,
        user: userRole,
        reference: `SALDO-${receivableId}`,
        observation: 'Parte del pago que no corresponde a recuperar aporte propietario ni financiamiento Fauna'
      });
    }

    setCases(prev => prev.map(c => {
      if (c.id === caseId) {
        const newOwnerContrib = Math.max(0, c.ownerContribution - dist.ownerRecovery);
        const newFaunaFinancing = Math.max(0, c.faunaFinancing - dist.faunaRecovery);

        const updated = {
          ...c,
          ownerContribution: newOwnerContrib,
          faunaFinancing: newFaunaFinancing,
          movements: [...c.movements, ...movementsToAdd],
          receivableStatus: newRecStatus
        };
        updated.isCompleted = isCaseCompleted(updated);
        return updated;
      }
      return c;
    }));

    logAudit(
      caseId,
      'Pago de Arrendatario Registrado',
      `Pago de $${paymentAmount} registrado. Recuperación propietario: $${dist.ownerRecovery}, Recuperación Fauna: $${dist.faunaRecovery}`
    );
  };

  const closeGuaranteeCase = (caseId: string): { success: boolean; message: string } => {
    const targetCase = cases.find(c => c.id === caseId);
    if (!targetCase) return { success: false, message: 'Caso no encontrado.' };

    if (!isCaseCompleted(targetCase)) {
      const pending: string[] = [];
      if (targetCase.preparationStatus !== 'LISTA') pending.push('preparación física');
      if (targetCase.liquidationStatus !== 'EMITIDA') pending.push('liquidación emitida');
      if (targetCase.refund && targetCase.refund.amount > 0 && targetCase.refund.status !== 'TRANSFERIDA') pending.push('devolución al arrendatario');
      if (targetCase.receivableStatus && targetCase.receivableStatus !== 'PAGADA' && targetCase.receivableStatus !== 'INCOBRABLE') pending.push('cuenta por cobrar');

      return {
        success: false,
        message: `No se puede cerrar el caso todavía. Pendiente: ${pending.join(', ') || 'requisitos operativos del caso'}.`
      };
    }

    setCases(prev => prev.map(c => {
      if (c.id === caseId) {
        return {
          ...c,
          isClosed: true,
          closedAt: new Date().toLocaleString('es-CL'),
          closedBy: userRole,
          isCompleted: true
        };
      }
      return c;
    }));

    logAudit(caseId, 'Cierre de Caso', `Caso ${caseId} cerrado por ${userRole}`);
    return { success: true, message: 'Caso cerrado con éxito.' };
  };

  const reopenGuaranteeCase = (caseId: string) => {
    if (userRole !== 'ADMINISTRADOR') {
      alert('Solo un Administrador puede reabrir un caso cerrado.');
      return;
    }

    setCases(prev => prev.map(c => {
      if (c.id === caseId) {
        const updated = {
          ...c,
          isClosed: false
        };
        updated.isCompleted = isCaseCompleted(updated);
        return updated;
      }
      return c;
    }));

    logAudit(caseId, 'Reapertura de Caso', `Caso ${caseId} reabierto por Administrador`);
  };

  const updateSettings = (newSettings: SystemSettings) => {
    setSettings(newSettings);
    logAudit('SYSTEM', 'Configuración Actualizada', 'Parámetros del sistema modificados');
  };

  return (
    <AppContext.Provider
      value={{
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
        closeGuaranteeCase,
        reopenGuaranteeCase,
        updateSettings,
        logAudit
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
