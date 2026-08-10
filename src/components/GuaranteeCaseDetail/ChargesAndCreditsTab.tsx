import React from 'react';
import { GuaranteeCase } from '../../types';
import { ChargesTab } from './ChargesTab';

interface ChargesAndCreditsTabProps {
  guaranteeCase: GuaranteeCase;
}

export const ChargesAndCreditsTab: React.FC<ChargesAndCreditsTabProps> = ({ guaranteeCase }) => {
  return <ChargesTab guaranteeCase={guaranteeCase} />;
};
