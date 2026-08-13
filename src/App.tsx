import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { GuaranteesList } from './components/GuaranteesList';
import { GuaranteeCaseDetail } from './components/GuaranteeCaseDetail/GuaranteeCaseDetail';
import { ReceivablesList } from './components/ReceivablesList';
import { SettingsView } from './components/SettingsView';
import { NewGuaranteeModal } from './components/NewGuaranteeModal';
import { LegacyReceivableReconciler } from './components/LegacyReceivableReconciler';
import { CompletedCaseSync } from './components/CompletedCaseSync';
import { freshCases } from './components/ExactBalanceDemoSeeder';

const QA_V5_MARKER = 'fauna_guarantees_demo_v5_seeded';

/**
 * QA v5: sembrado sincrónico ANTES de montar AppProvider.
 * Esto evita que el provider alcance a leer/regrabar los cuatro fixtures antiguos
 * antes de que el reset se ejecute.
 */
const ensureQaV5Storage = () => {
  if (typeof window === 'undefined') return;
  if (localStorage.getItem(QA_V5_MARKER) === '1') return;

  localStorage.setItem('fauna_guarantee_cases_v2', JSON.stringify(freshCases));
  localStorage.setItem('fauna_receivables_v2', JSON.stringify([]));
  localStorage.setItem('fauna_audit_logs_v2', JSON.stringify([]));
  localStorage.setItem(QA_V5_MARKER, '1');
};

const MainContent: React.FC = () => {
  const { activeView, selectedCaseId } = useApp();
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-100 font-sans text-slate-800 antialiased selection:bg-emerald-500 selection:text-white">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        <Header onOpenNewModal={() => setIsNewModalOpen(true)} />

        <main className="flex-1 pb-12">
          {activeView === 'dashboard' && <Dashboard />}
          {activeView === 'guarantees' && <GuaranteesList onOpenNewModal={() => setIsNewModalOpen(true)} />}
          {activeView === 'case-detail' && <GuaranteeCaseDetail caseId={selectedCaseId || ''} />}
          {activeView === 'receivables' && <ReceivablesList />}
          {activeView === 'settings' && <SettingsView />}
        </main>
      </div>

      <NewGuaranteeModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
      />
    </div>
  );
};

export default function App() {
  ensureQaV5Storage();

  return (
    <AppProvider>
      <LegacyReceivableReconciler />
      <CompletedCaseSync />
      <MainContent />
    </AppProvider>
  );
}