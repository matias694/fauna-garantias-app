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
import { initialSettings } from './data/initialData';
import { appDataGateway } from './services/appDataGateway';

const QA_V5_MARKER = 'fauna_guarantees_demo_v5_seeded';

/**
 * QA v5: sembrado antes de montar AppProvider, pero sin conocer el mecanismo
 * de persistencia. En la intranet, el gateway de backend simplemente no
 * implementará ensurePrototypeSeed y esta rutina quedará inerte.
 */
const ensureQaV5PrototypeData = () => {
  const current = appDataGateway.getBootstrapSnapshot({
    cases: freshCases,
    receivables: [],
    settings: initialSettings,
    auditLogs: []
  });

  appDataGateway.ensurePrototypeSeed?.(QA_V5_MARKER, {
    cases: freshCases,
    receivables: [],
    settings: current.settings,
    auditLogs: []
  });
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
  ensureQaV5PrototypeData();

  return (
    <AppProvider>
      <LegacyReceivableReconciler />
      <CompletedCaseSync />
      <MainContent />
    </AppProvider>
  );
}
