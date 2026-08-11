import React, { useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { LiquidationRequirement, LiquidationStatus } from '../types';
import { calculateFundingReadiness, calculateGuaranteeFinances } from '../utils/calculations';
import { formatCLP } from '../utils/formatters';

const OWNER_PROVISION_REQ_ID = 'REQ-FUND-OWNER';
const LEGACY_FULL_COVERAGE_REQ_ID = 'REQ-FUND-FULL';

/**
 * Antes de confirmar, solo una diferencia de DAÑOS/REPARACIONES a cargo del propietario
 * exige provisión efectiva. Los gastos comunes y servicios que queden sin fondos no
 * bloquean la liquidación: permanecen como obligación vigente del propietario.
 *
 * Plan Full mantiene su beneficio contractual sobre daños, pero faunaFinancing guarda
 * el desembolso NETO que Fauna debe sostener después de compensar cualquier excedente
 * del abono proporcional del arrendatario.
 */
export const FundingRequirementsSync: React.FC = () => {
  const { cases, settings, updateGuaranteeCase } = useApp();

  useEffect(() => {
    cases.forEach(c => {
      if (c.isClosed || c.liquidationStatus === 'EMITIDA') return;

      const fin = calculateGuaranteeFinances(c, settings);
      const regularRequirements = (c.requirements || []).filter(
        r => r.id !== OWNER_PROVISION_REQ_ID && r.id !== LEGACY_FULL_COVERAGE_REQ_ID
      );
      const regularRequirementsDone = regularRequirements.length > 0 && regularRequirements.every(
        r => r.status === 'COMPLETO' || r.status === 'NO_APLICA'
      );

      // Full no exige una acción manual adicional. Una vez listos los antecedentes,
      // el sistema registra solo el financiamiento neto que Fauna realmente debe sostener.
      const desiredFaunaFinancing = c.plan === 'FULL' && regularRequirementsDone
        ? fin.faunaFinancingRequired
        : 0;
      const financingChanged = (c.faunaFinancing || 0) !== desiredFaunaFinancing;

      const projectedCase = financingChanged
        ? { ...c, faunaFinancing: desiredFaunaFinancing }
        : c;
      const readiness = calculateFundingReadiness(projectedCase, settings);
      const fundingRequirements: LiquidationRequirement[] = [];

      // Solo las reparaciones sin cobertura son requisito BLOQUEANTE.
      if (readiness.ownerRepairRequired > 0) {
        fundingRequirements.push({
          id: OWNER_PROVISION_REQ_ID,
          name: `Provisión para reparaciones del propietario (${formatCLP(readiness.ownerRepairRequired)})`,
          status: readiness.ownerRepairPendingProvision === 0 ? 'COMPLETO' : 'PENDIENTE',
          notes: readiness.ownerRepairPendingProvision === 0
            ? 'Fondos para reparaciones efectivamente recibidos.'
            : 'Si el propietario no provisiona esta diferencia, debe ajustarse el alcance de las reparaciones al presupuesto disponible.'
        });
      }

      // Un saldo de GC/servicios del propietario no se agrega al checklist bloqueante.
      // Puede quedar vigente después de confirmar la liquidación.
      const nextRequirements = [...regularRequirements, ...fundingRequirements];
      const allDone = nextRequirements.length > 0 && nextRequirements.every(
        r => r.status === 'COMPLETO' || r.status === 'NO_APLICA'
      );
      const nextStatus: LiquidationStatus = allDone ? 'LISTA' : 'EN_PREPARACION';

      const requirementsChanged = JSON.stringify(nextRequirements) !== JSON.stringify(c.requirements || []);
      const statusChanged = c.liquidationStatus !== nextStatus;

      if (!financingChanged && !requirementsChanged && !statusChanged) return;

      updateGuaranteeCase(c.id, {
        faunaFinancing: desiredFaunaFinancing,
        requirements: nextRequirements,
        liquidationStatus: nextStatus
      });
    });
  }, [cases, settings, updateGuaranteeCase]);

  return null;
};
