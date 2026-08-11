import assert from 'node:assert/strict';
import type { GuaranteeCase, SystemSettings } from '../types';
import { buildOwnerLiquidationPdf, buildTenantLiquidationPdf } from '../utils/liquidationPdf';

const settings = {
  faunaAddress: 'Santiago, Chile',
  faunaRut: '76.000.000-0'
} as SystemSettings;

const baseCase = {
  id: 'GAR-PDF-TEST',
  propertyAddress: 'Providencia 1234',
  propertyUnit: 'Depto 101',
  propertyComuna: 'Providencia',
  tenantName: 'Arrendatario Prueba',
  tenantRut: '11.111.111-1',
  tenantEmail: 'arrendatario@example.com',
  ownerName: 'Propietario Prueba',
  ownerRut: '22.222.222-2',
  plan: 'FULL',
  guaranteeAmount: 550000,
  receptionDate: '10/08/2026',
  charges: [
    {
      id: 'CHG-1',
      category: 'REPARACIONES',
      description: 'Pintura y reparación dormitorio',
      amount: 700000,
      date: '10/08/2026',
      type: 'DAÑO_REPARACION',
      notes: '',
      documents: [],
      photos: []
    },
    {
      id: 'CHG-2',
      category: 'GASTOS_COMUNES',
      description: 'Gastos comunes y servicios',
      amount: 135000,
      date: '10/08/2026',
      type: 'GASTO_COMUN',
      notes: '',
      documents: [],
      photos: []
    }
  ],
  movements: [],
  ownerContribution: 0,
  fullCoverageApplied: 150000,
  faunaFinancing: 150000
} as GuaranteeCase;

const tenantPdf = buildTenantLiquidationPdf(baseCase, settings);
const ownerPdf = buildOwnerLiquidationPdf(baseCase, settings);

for (const pdf of [tenantPdf, ownerPdf]) {
  assert.ok(pdf.startsWith('%PDF-1.4\n'));
  assert.ok(pdf.includes('/Type /Catalog'));
  assert.ok(pdf.includes('/Type /Page'));
  assert.ok(pdf.endsWith('%%EOF'));
  assert.ok(pdf.length > 1500);
}

assert.notEqual(tenantPdf, ownerPdf);
console.log('✓ PDFs de liquidación generados como archivos PDF válidos');
