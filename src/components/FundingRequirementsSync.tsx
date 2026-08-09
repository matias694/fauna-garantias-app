import React, { useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { LiquidationRequirement, LiquidationStatus } from '../types';
import { calculateFundingReadiness, calculateGuaranteeFinances } from '../utils/calculations';
import { formatCLP } from '../utils/formatters';

const OWNER_PROVISION_REQ_ID = 'REQ-FUND-OWNER';
const FULL_COVERAGE_REQ_ID = 'REQ-FUND-FULL';

/**
 * Convierte los fondos necesarios en requisitos reales de la liquidación.
 * Así una liquidación no pasa a LISTA solo por tener documentos completos:
 * si necesita dinero del propietario, la provisión debe haberse recibido;
 * y si existe cobertura Full, su ejecución efectiva debe estar registrada.
 *
 * Si el propietario no provisiona y se reducen las reparaciones/cargos, el cálculo
 * baja automáticamente y el requisito desaparece o se ajusta al nuevo monto.
 */
export const FundingRequirementsSync: React.FC = () => {
  const { cases, settings, updateGuaranteeCase } = useApp();

  useEffect(() => {
    cases.forEach(c => {
      if (c.isClosed || c.liquidationStatus === 'EMITIDA') return;

      const fin = calculateGuaranteeFinances(c, settings);
      const readiness = calculateFundingReadiness(c, settings);
      const regularRequirements = (c.requirements || []).filter(
        r => r.id !== OWNER_PROVISION_REQ_ID && r.id !== FULL_COVERAGE_REQ_ID
      );
      const fundingRequirements: LiquidationRequirement[] = [];

      if (fin.isInsufficient && readiness.ownerRequired > 0) {
        fundingRequirements.push({
          id: OWNER_PROVISION_REQ_ID,
          name: `Provisión de fondos del propietario (${formatCLP(readiness.ownerRequired)})`,
          status: readiness.ownerPendingProvision === 0 ? 'COMPLETO' : 'PENDIENTE',
          notes: readiness.ownerPendingProvision === 0
            ? 'Fondos efectivamente recibidos.'
            : 'No ejecutar gastos que excedan el presupuesto disponible. Si no se provisionan los fondos, ajustar reparaciones/cargos.'
        });
      }

      if (fin.isInsufficient && c.plan === 'FULL' && readiness.fullCoverageRequired > 0) {
        fundingRequirements.push({
          id: FULL_COVERAGE_REQ_ID,
          name: `Ejecución cobertura Plan Full (${formatCLP(readiness.fullCoverageRequired)})`,
          status: readiness.fullCoveragePendingExecution === 0 ? 'COMPLETO' : 'PENDIENTE',
          notes: readiness.fullCoveragePendingExecution === 0
            ? 'Cobertura efectivamente ejecutada por Fauna.'
            : 'Registrar solo cuando el desembolso de la cobertura haya ocurrido efectivamente.'
        });
      }

      const nextRequirements = [...regularRequirements, ...fundingRequirements];
      const allDone = nextRequirements.length > 0 && nextRequirements.every(
        r => r.status === 'COMPLETO' || r.status === 'NO_APLICA'
      );
      const nextStatus: LiquidationStatus = allDone ? 'LISTA' : 'EN_PREPARACION';

      const requirementsChanged = JSON.stringify(nextRequirements) !== JSON.stringify(c.requirements || []);
      const statusChanged = c.liquidationStatus !== nextStatus;

      if (!requirementsChanged && !statusChanged) return;

      updateGuaranteeCase(c.id, {
        requirements: nextRequirements,
        liquidationStatus: nextStatus
      });
    });
  }, [cases, settings, updateGuaranteeCase]);

  return null;
};
