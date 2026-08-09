import React, { useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { calculateGuaranteeFinances } from '../utils/calculations';

/**
 * Antes de emitir una liquidación Full solo sincroniza la cobertura aplicable.
 * No registra aporte propietario ni financiamiento Fauna: esos campos representan
 * dinero efectivamente aportado/desembolsado y deben nacer de un movimiento real.
 */
export const FullCoverageSync: React.FC = () => {
  const { cases, settings, updateGuaranteeCase } = useApp();

  useEffect(() => {
    cases.forEach(c => {
      if (c.plan !== 'FULL' || c.isClosed || c.liquidationStatus === 'EMITIDA' || c.receivableId) return;

      const fin = calculateGuaranteeFinances(c, settings);
      const expectedCoverage = fin.isInsufficient ? fin.fullCoverageApplied : 0;

      if (c.fullCoverageApplied === expectedCoverage) return;

      updateGuaranteeCase(c.id, {
        fullCoverageApplied: expectedCoverage
      });
    });
  }, [cases, settings, updateGuaranteeCase]);

  return null;
};
