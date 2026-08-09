import React, { useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { calculateGuaranteeFinances } from '../utils/calculations';

/**
 * Before a Plan Full liquidation is emitted, derives the funding split from
 * the deterministic financial calculation. Once the receivable exists, the
 * values are no longer recalculated so later recoveries can reduce them.
 */
export const FullCoverageSync: React.FC = () => {
  const { cases, settings, updateGuaranteeCase } = useApp();

  useEffect(() => {
    cases.forEach(c => {
      if (c.plan !== 'FULL' || c.isClosed || c.liquidationStatus === 'EMITIDA' || c.receivableId) return;

      const fin = calculateGuaranteeFinances(c, settings);
      const expectedCoverage = fin.isInsufficient ? fin.fullCoverageApplied : 0;
      const expectedOwnerContribution = fin.isInsufficient ? Math.max(0, fin.tenantDeficit - expectedCoverage) : 0;
      const expectedFaunaFinancing = expectedCoverage;

      if (
        c.fullCoverageApplied === expectedCoverage &&
        c.ownerContribution === expectedOwnerContribution &&
        c.faunaFinancing === expectedFaunaFinancing
      ) return;

      updateGuaranteeCase(c.id, {
        fullCoverageApplied: expectedCoverage,
        ownerContribution: expectedOwnerContribution,
        faunaFinancing: expectedFaunaFinancing
      });
    });
  }, [cases, settings, updateGuaranteeCase]);

  return null;
};