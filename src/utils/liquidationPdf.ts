import { GuaranteeCase, SystemSettings, ChargeCategory } from '../types';
import {
  calculateFundingReadiness,
  calculateGuaranteeFinances,
  calculateOwnerLiquidationReconciliation
} from './calculations';
import { formatCLP, formatDate } from './formatters';

type RGB = [number, number, number];

type HeaderContext = {
  title: string;
  documentNumber: string;
  settings: SystemSettings;
};

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const LEFT = 48;
const RIGHT = 547;
const BOTTOM = 48;
const BRAND: RGB = [0.118, 0.22, 0.17];
const EMERALD: RGB = [0.05, 0.45, 0.31];
const SLATE: RGB = [0.18, 0.22, 0.27];
const MUTED: RGB = [0.38, 0.43, 0.49];
const AMBER: RGB = [0.65, 0.38, 0.03];

const normalizePdfText = (value: string) => value
  .replace(/[“”]/g, '"')
  .replace(/[‘’]/g, "'")
  .replace(/[–—]/g, '-')
  .replace(/•/g, '-')
  .replace(/…/g, '...')
  .replace(/\u00a0/g, ' ');

const winAnsiHex = (value: string) => {
  const normalized = normalizePdfText(String(value ?? ''));
  let hex = '';
  for (const char of normalized) {
    const code = char.codePointAt(0) || 32;
    const byte = code <= 255 ? code : 63;
    hex += byte.toString(16).padStart(2, '0').toUpperCase();
  }
  return `<${hex}>`;
};

const rgb = ([r, g, b]: RGB) => `${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)}`;

const textCommand = (
  text: string,
  x: number,
  y: number,
  size = 10,
  bold = false,
  color: RGB = SLATE
) => `${rgb(color)} rg BT /${bold ? 'F2' : 'F1'} ${size} Tf 1 0 0 1 ${x.toFixed(1)} ${y.toFixed(1)} Tm ${winAnsiHex(text)} Tj ET\n`;

const lineCommand = (x1: number, y1: number, x2: number, y2: number, width = 0.6, color: RGB = [0.82, 0.84, 0.87]) =>
  `${rgb(color)} RG ${width} w ${x1.toFixed(1)} ${y1.toFixed(1)} m ${x2.toFixed(1)} ${y2.toFixed(1)} l S\n`;

const rectCommand = (x: number, y: number, w: number, h: number, color: RGB) =>
  `${rgb(color)} rg ${x} ${y} ${w} ${h} re f\n`;

const wrapText = (text: string, maxWidth: number, fontSize: number) => {
  const maxChars = Math.max(8, Math.floor(maxWidth / (fontSize * 0.52)));
  const words = normalizePdfText(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';

  words.forEach(word => {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length <= maxChars) {
      line = candidate;
    } else {
      if (line) lines.push(line);
      if (word.length <= maxChars) {
        line = word;
      } else {
        let rest = word;
        while (rest.length > maxChars) {
          lines.push(rest.slice(0, maxChars));
          rest = rest.slice(maxChars);
        }
        line = rest;
      }
    }
  });

  if (line) lines.push(line);
  return lines.length ? lines : [''];
};

class PdfLayout {
  private pages: string[][] = [];
  private current: string[] = [];
  y = 0;

  constructor(private header: HeaderContext) {
    this.newPage();
  }

  private newPage() {
    this.current = [];
    this.pages.push(this.current);
    this.current.push(rectCommand(LEFT - 8, 758, RIGHT - LEFT + 16, 52, BRAND));
    this.current.push(textCommand('FAUNA PROPIEDADES', LEFT + 4, 786, 16, true, [1, 1, 1]));
    this.current.push(textCommand(this.header.settings.faunaAddress || '', LEFT + 4, 770, 8, false, [0.85, 0.92, 0.88]));
    this.current.push(textCommand(this.header.title, 345, 787, 10, true, [1, 1, 1]));
    this.current.push(textCommand(`N° ${this.header.documentNumber}`, 345, 773, 8, false, [0.85, 0.92, 0.88]));
    this.y = 735;
  }

  ensureSpace(height: number) {
    if (this.y - height < BOTTOM) this.newPage();
  }

  text(text: string, x = LEFT, size = 10, bold = false, color: RGB = SLATE, y = this.y) {
    this.current.push(textCommand(text, x, y, size, bold, color));
  }

  wrapped(text: string, x: number, maxWidth: number, size = 9, bold = false, color: RGB = SLATE, lineHeight = 12) {
    const lines = wrapText(text, maxWidth, size);
    this.ensureSpace(lines.length * lineHeight + 4);
    lines.forEach(line => {
      this.text(line, x, size, bold, color, this.y);
      this.y -= lineHeight;
    });
  }

  gap(amount = 10) {
    this.y -= amount;
  }

  rule() {
    this.current.push(lineCommand(LEFT, this.y, RIGHT, this.y));
    this.y -= 10;
  }

  section(title: string) {
    this.ensureSpace(26);
    this.text(title.toUpperCase(), LEFT, 10, true, BRAND);
    this.y -= 7;
    this.current.push(lineCommand(LEFT, this.y, RIGHT, this.y, 0.8, [0.75, 0.79, 0.77]));
    this.y -= 14;
  }

  labelValue(label: string, value: string, x: number, valueX: number, maxWidth = 210) {
    this.text(label, x, 8, true, MUTED);
    const lines = wrapText(value, maxWidth, 9);
    lines.slice(0, 2).forEach((line, index) => this.text(line, valueX, 9, index === 0, SLATE, this.y - index * 11));
  }

  addChargeRows(c: GuaranteeCase) {
    this.section('Detalle de cargos y abonos');
    this.ensureSpace(28);
    this.current.push(rectCommand(LEFT, this.y - 14, RIGHT - LEFT, 24, [0.94, 0.95, 0.96]));
    this.text('FECHA', LEFT + 6, 8, true, MUTED, this.y - 3);
    this.text('MOV.', 118, 8, true, MUTED, this.y - 3);
    this.text('CONCEPTO / DESCRIPCIÓN', 174, 8, true, MUTED, this.y - 3);
    this.text('MONTO', 486, 8, true, MUTED, this.y - 3);
    this.y -= 28;

    if (!c.charges.length) {
      this.wrapped('No se registraron cargos ni abonos para esta liquidación.', LEFT + 6, 470, 9, false, MUTED);
      this.gap(4);
      return;
    }

    c.charges.forEach(ch => {
      const descriptionLines = wrapText(`${categoryLabel(ch.category)} - ${ch.description}`, 285, 8.5).slice(0, 3);
      const rowHeight = Math.max(26, descriptionLines.length * 11 + 8);
      this.ensureSpace(rowHeight + 8);
      this.text(formatDate(ch.date), LEFT + 6, 8.5, false, MUTED, this.y);
      this.text(ch.amount < 0 ? 'Abono' : 'Cargo', 118, 8.5, true, ch.amount < 0 ? EMERALD : SLATE, this.y);
      descriptionLines.forEach((line, index) => this.text(line, 174, 8.5, index === 0, SLATE, this.y - index * 11));
      this.text(`${ch.amount < 0 ? '+' : '-'}${formatCLP(Math.abs(ch.amount))}`, 470, 8.5, true, ch.amount < 0 ? EMERALD : SLATE, this.y);
      this.y -= rowHeight;
      this.current.push(lineCommand(LEFT, this.y + 5, RIGHT, this.y + 5, 0.4, [0.88, 0.89, 0.91]));
    });
    this.gap(2);
  }

  totalRow(label: string, value: string, color: RGB = SLATE, bold = true) {
    this.ensureSpace(20);
    this.text(label, 285, 9, bold, MUTED);
    this.text(value, 470, 9.5, true, color);
    this.y -= 18;
  }

  resultBox(label: string, value: string, color: RGB) {
    this.ensureSpace(54);
    this.current.push(rectCommand(LEFT, this.y - 35, RIGHT - LEFT, 46, [0.96, 0.97, 0.97]));
    this.text(label.toUpperCase(), LEFT + 12, 9, true, MUTED, this.y - 4);
    this.text(value, LEFT + 12, 14, true, color, this.y - 23);
    this.y -= 58;
  }

  build() {
    return buildPdf(this.pages.map(commands => commands.join('')));
  }
}

const categoryLabel = (category: ChargeCategory) => {
  if (['REPARACIONES', 'PINTURA', 'LIMPIEZA', 'DAÑOS'].includes(category)) return 'Daño / reparación';
  if (category === 'GASTOS_COMUNES') return 'Gastos comunes';
  if (category === 'AGUA') return 'Agua';
  if (category === 'ELECTRICIDAD') return 'Electricidad';
  if (category === 'GAS') return 'Gas';
  if (category === 'OTROS_SERVICIOS') return 'Otros servicios';
  return 'Otro';
};

const buildPdf = (streams: string[]) => {
  const objects: string[] = [];
  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
  objects[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';

  const pageRefs: number[] = [];
  let nextObject = 5;
  streams.forEach(stream => {
    const pageObject = nextObject++;
    const contentObject = nextObject++;
    pageRefs.push(pageObject);
    objects[pageObject] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObject} 0 R >>`;
    objects[contentObject] = `<< /Length ${stream.length} >>\nstream\n${stream}endstream`;
  });

  objects[2] = `<< /Type /Pages /Kids [${pageRefs.map(ref => `${ref} 0 R`).join(' ')}] /Count ${pageRefs.length} >>`;

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  for (let i = 1; i < objects.length; i += 1) {
    offsets[i] = pdf.length;
    pdf += `${i} 0 obj\n${objects[i]}\nendobj\n`;
  }

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i < objects.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return pdf;
};

const addCaseIdentity = (pdf: PdfLayout, c: GuaranteeCase, personLabel: string, personName: string, personRut: string, extra: string) => {
  pdf.section('Antecedentes');
  pdf.labelValue(personLabel, personName, LEFT, 130, 170);
  pdf.labelValue('RUT', personRut || 'N/A', 320, 365, 160);
  pdf.y -= 20;
  pdf.labelValue('Propiedad', `${c.propertyAddress}, ${c.propertyUnit}`, LEFT, 130, 170);
  pdf.labelValue('Comuna', c.propertyComuna, 320, 365, 160);
  pdf.y -= 20;
  pdf.labelValue('Recepción propiedad', formatDate(c.receptionDate), LEFT, 130, 170);
  pdf.labelValue('Referencia', extra, 320, 365, 160);
  pdf.y -= 26;
};

export const buildTenantLiquidationPdf = (c: GuaranteeCase, settings: SystemSettings) => {
  const fin = calculateGuaranteeFinances(c, settings);
  const pdf = new PdfLayout({
    title: 'LIQUIDACIÓN DE GARANTÍA',
    documentNumber: `LIQ-AR-${c.id}`,
    settings
  });

  addCaseIdentity(pdf, c, 'Arrendatario', c.tenantName, c.tenantRut, c.tenantEmail || 'Sin email');
  pdf.addChargeRows(c);
  pdf.rule();
  pdf.totalRow('Total cargos y abonos', `-${formatCLP(fin.totalCharges)}`);
  pdf.totalRow('Garantía recibida en custodia', `+${formatCLP(fin.guaranteeAmount)}`, EMERALD);
  pdf.rule();

  const result = fin.isSurplus
    ? `${formatCLP(fin.refundToTenant)} A DEVOLVER`
    : fin.isExact
      ? '$0 - SIN SALDO'
      : `${formatCLP(fin.tenantDeficit)} PENDIENTE DE PAGO`;
  pdf.resultBox('Resultado liquidación', result, fin.isInsufficient ? AMBER : EMERALD);

  pdf.wrapped(
    fin.isSurplus
      ? 'El monto indicado corresponde al saldo a favor del arrendatario después de aplicar los cargos y abonos de la liquidación.'
      : fin.isExact
        ? 'La garantía cubre exactamente los cargos y abonos registrados; no existe saldo pendiente ni devolución.'
        : 'El monto indicado corresponde al saldo que excede la garantía y permanece pendiente de pago del arrendatario.',
    LEFT,
    RIGHT - LEFT,
    8.5,
    false,
    MUTED
  );

  return pdf.build();
};

export const buildOwnerLiquidationPdf = (c: GuaranteeCase, settings: SystemSettings) => {
  const fin = calculateGuaranteeFinances(c, settings);
  const readiness = calculateFundingReadiness(c, settings);
  const owner = calculateOwnerLiquidationReconciliation(c, settings);
  const ownerPending = owner.ownerRepairPending + owner.ownerServicePending;
  const ownerFullBenefit = fin.faunaFinancingRequired;
  const pdf = new PdfLayout({
    title: 'LIQUIDACIÓN DE GARANTÍA',
    documentNumber: `LIQ-PROP-${c.id}`,
    settings
  });

  addCaseIdentity(pdf, c, 'Propietario', c.ownerName, c.ownerRut, `Plan ${c.plan}`);
  pdf.addChargeRows(c);
  pdf.rule();
  pdf.totalRow('Total cargos y abonos', `-${formatCLP(fin.totalCharges)}`);
  pdf.totalRow('Garantía disponible del contrato', `+${formatCLP(fin.guaranteeAmount)}`, EMERALD);
  if (c.plan === 'FULL' && ownerFullBenefit > 0) {
    pdf.totalRow('Beneficio Plan Full', `+${formatCLP(ownerFullBenefit)}`, EMERALD);
  }
  if (owner.ownerContributionApplied > 0) {
    pdf.totalRow('Fondos pagados/provisionados por propietario', `+${formatCLP(owner.ownerContributionApplied)}`, [0.12, 0.34, 0.66]);
  }
  if (readiness.ownerServiceSettledFromTenant > 0) {
    pdf.totalRow('Pago posterior arrendatario aplicado a servicios', `+${formatCLP(readiness.ownerServiceSettledFromTenant)}`, EMERALD);
  }
  pdf.rule();
  pdf.resultBox(
    'Resultado propietario',
    ownerPending > 0 ? `${formatCLP(ownerPending)} PENDIENTE` : '$0 - SIN SALDO PENDIENTE',
    ownerPending > 0 ? AMBER : EMERALD
  );

  if (ownerPending > 0) {
    const detail = [
      owner.ownerRepairPending > 0 ? `${formatCLP(owner.ownerRepairPending)} en reparaciones` : '',
      owner.ownerServicePending > 0 ? `${formatCLP(owner.ownerServicePending)} en gastos comunes/servicios` : ''
    ].filter(Boolean).join(' y ');
    pdf.wrapped(`Detalle del saldo pendiente del propietario: ${detail}.`, LEFT, RIGHT - LEFT, 8.5, false, MUTED);
    pdf.gap(6);
  }

  if (c.plan === 'FULL' && ownerFullBenefit > 0) {
    pdf.section('Beneficio Plan Full aplicado');
    pdf.wrapped(
      `El Plan Full cubrió ${formatCLP(ownerFullBenefit)} en daños y reparaciones. ${ownerPending > 0 ? `Saldo pendiente del propietario: ${formatCLP(ownerPending)}.` : 'No queda saldo pendiente por pagar.'}`,
      LEFT,
      RIGHT - LEFT,
      8.5,
      false,
      BRAND
    );
  }

  return pdf.build();
};

const downloadPdf = (pdf: string, filename: string) => {
  if (typeof document === 'undefined') return;
  const blob = new Blob([pdf], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const downloadTenantLiquidationPdf = (c: GuaranteeCase, settings: SystemSettings) =>
  downloadPdf(buildTenantLiquidationPdf(c, settings), `Liquidacion_arrendatario_${c.id}.pdf`);

export const downloadOwnerLiquidationPdf = (c: GuaranteeCase, settings: SystemSettings) =>
  downloadPdf(buildOwnerLiquidationPdf(c, settings), `Liquidacion_propietario_${c.id}.pdf`);