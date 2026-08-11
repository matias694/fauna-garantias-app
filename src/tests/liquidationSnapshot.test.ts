import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { GuaranteeCase, SystemSettings } from '../types';
import { getSettlementState } from '../utils/settlementState';

const settings = {
  maxLiquidationDays: 60,
  alertDay: 45,
  faunaCompanyName: 'Fauna',
  faunaRut: '00.000.000-0',
  faunaAddress: 'Santiago',
  faunaEmail: 'demo@example.com',
  faunaPhone: '+56 9 0000 0000',
  chargeCategories: [],
  repairCategories: [],
  responsiblesList: []
} as SystemSettings;

const baseCase = {
  id: 'GAR-SNAPSHOT',
  propertyAddress: 'Providencia 100',
  propertyComuna: 'Providencia',
  propertyUnit: 'Depto 1',
  ownerName: 'Propietario',
  ownerRut: '1-9',
  ownerEmail: '',
  ownerPhone: '',
  tenantName: 'Arrendatario',
  tenantRut: '2-7',
  tenantEmail: '',
  tenantPhone: '',
  monthlyRent: 400000,
  plan: 'ESTANDAR',
  contractStartDate: '01/01/2025',
  contractEndDate: '01/01/2026',
  guaranteeAmount: 400000,
  receptionDate: '11/08/2026',
  deadlineDate: '10/10/2026',
  alertDate: '25/09/2026',
  responsible: 'Usuario',
  initialNotes: '',
  preparationStatus: 'LISTA',
  liquidationStatus: 'EMITIDA',
  requirements: [],
  blockedBy: 'SIN_BLOQUEO',
  nextManagement: '',
  nextManagementDate: '',
  nextManagementResponsible: '',
  followUps: [],
  repairs: [],
  attachments: [],
  movements: [],
  ownerContribution: 0,
  fullCoverageApplied: 0,
  faunaFinancing: 0,
  charges: [
    {
      id: 'CHG-ACTUAL',
      category: 'REPARACIONES',
      description: 'Cargo que simula una fórmula/dato vigente distinto',
      amount: 900000,
      date: '11/08/2026',
      type: 'DAÑO_REPARACION',
      notes: '',
      documents: [],
      photos: []
    }
  ],
  liquidationSnapshot: {
    calculationVersion: '2026-08-v1',
    issuedAt: '2026-08-11T20:00:00.000Z',
    issuedDate: '11/08/2026',
    tenantDocumentNumber: 'LIQ-AR-GAR-SNAPSHOT',
    ownerDocumentNumber: 'LIQ-PROP-GAR-SNAPSHOT',
    propertyAddress: 'Providencia 100',
    propertyComuna: 'Providencia',
    propertyUnit: 'Depto 1',
    receptionDate: '11/08/2026',
    plan: 'ESTANDAR',
    ownerName: 'Propietario',
    ownerRut: '1-9',
    tenantName: 'Arrendatario',
    tenantRut: '2-7',
    tenantEmail: '',
    charges: [],
    financials: {
      guaranteeAmount: 400000,
      grossCharges: 500000,
      tenantCredits: 0,
      totalCharges: 500000,
      tenantDeficit: 100000,
      refundToTenant: 0,
      fullCoverageApplied: 0,
      faunaFinancingRequired: 0,
      ownerRepairFundingRequired: 100000,
      ownerServiceObligation: 0,
      ownerRepairPendingAtIssue: 0,
      ownerServicePendingAtIssue: 0,
      ownerContributionAppliedAtIssue: 100000
    }
  },
  receivableStatus: 'PENDIENTE'
} as GuaranteeCase;

const settlement = getSettlementState(baseCase, undefined, settings);
assert.equal(settlement.kind, 'RECEIVABLE_PENDING');
assert.equal(settlement.originalAmount, 100000);
assert.equal(settlement.pendingAmount, 100000);
assert.equal(settlement.projectedAmount, 100000);

const tenantDocSource = readFileSync(new URL('../components/TenantLiquidationDocModal.tsx', import.meta.url), 'utf8');
const ownerDocSource = readFileSync(new URL('../components/OwnerLiquidationDocModal.tsx', import.meta.url), 'utf8');
const printSource = readFileSync(new URL('../utils/printElementAsPdf.ts', import.meta.url), 'utf8');

for (const source of [tenantDocSource, ownerDocSource]) {
  assert.match(source, /liquidationSnapshot/);
  assert.match(source, /printElementAsPdf/);
  assert.doesNotMatch(source, /buildTenantLiquidationPdf|buildOwnerLiquidationPdf/);
}
assert.match(printSource, /@page \{ size: A4; margin: 0; \}/);

console.log('✓ Snapshot de liquidación y fuente única de documento validados');
