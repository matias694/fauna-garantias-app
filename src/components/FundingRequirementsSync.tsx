import React, { useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { LiquidationRequirement, LiquidationStatus } from '../types';
import { calculateFundingReadiness, calculateGuaranteeFinances } from '../utils/calculations';
import { formatCLP } from '../utils/formatters';

const OWNER_PROVISION_REQ_ID = 'REQ-FUND-OWNER';
const LEGACY_FULL_COVERAGE_REQ_ID = 'REQ-FUND-FULL';

/**
 * La única acción financiera que debe resolver el usuario antes de confirmar es
 * una eventual provisión del propietario. La cobertura Plan Full se calcula y
 * asigna automáticamente según los daños/reparaciones registrados, hasta el límite
 * del plan. Si cambia el presupuesto antes de confirmar, la cobertura se recalcula.
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

      // Full no exige una acción manual adicional: una vez listos los antecedentes,
      // el sistema reserva/aplica solo la cobertura que corresponde al presupuesto actual.
      const desiredFullCoverage = c.plan === 'FULL' && regularRequirementsDone
        ? fin.fullCoverageApplied
        : 0;
      const coverageChanged = (c.faunaFinancing || 0) !== desiredFullCoverage;

      const projectedCase = coverageChanged
        ? { ...c, faunaFinancing: desiredFullCoverage }
        : c;
      const readiness = calculateFundingReadiness(projectedCase, settings);
      const fundingRequirements: LiquidationRequirement[] = [];

      if (fin.isInsufficient && readiness.ownerRequired > 0) {
        fundingRequirements.push({
          id: OWNER_PROVISION_REQ_ID,
          name: `Provisión de fondos del propietario (${formatCLP(readiness.ownerRequired)})`,
          status: readiness.ownerPendingProvision === 0 ? 'COMPLETO' : 'PENDIENTE',
          notes: readiness.ownerPendingProvision === 0
            ? 'Fondos efectivamente recibidos.'
            : 'Si el propietario no provisiona, ajustar reparaciones/cargos al presupuesto disponible.'
        });
      }

      const nextRequirements = [...regularRequirements, ...fundingRequirements];
      const allDone = nextRequirements.length > 0 && nextRequirements.every(
        r => r.status === 'COMPLETO' || r.status === 'NO_APLICA'
      );
      const nextStatus: LiquidationStatus = allDone ? 'LISTA' : 'EN_PREPARACION';

      const requirementsChanged = JSON.stringify(nextRequirements) !== JSON.stringify(c.requirements || []);
      const statusChanged = c.liquidationStatus !== nextStatus;

      if (!coverageChanged && !requirementsChanged && !statusChanged) return;

      updateGuaranteeCase(c.id, {
        faunaFinancing: desiredFullCoverage,
        requirements: nextRequirements,
        liquidationStatus: nextStatus
      });
    });
  }, [cases, settings, updateGuaranteeCase]);

  return null;
};
