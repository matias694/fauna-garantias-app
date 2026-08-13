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
import { buildFreshDemoCases, FRESH_DEMO_DATASET_VERSION } from './data/freshDemoCases';

const ensureFreshDemoDataset = () => {
  if (typeof window === 'undefined') return;
  const versionKey = 'fauna_demo_dataset_version';
  if (localStorage.getItem(versionKey) === FRESH_DEMO_DATASET_VERSION) return;

  localStorage.setItem('fauna_guarantee_cases_v2', JSON.stringify(buildFreshDemoCases()));
  localStorage.setItem('fauna_receivables_v2', JSON.stringify([]));
  localStorage.setItem('fauna_audit_logs_v2', JSON.stringify([]));
  localStorage.setItem(versionKey, FRESH_DEMO_DATASET_VERSION);
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
  ensureFreshDemoDataset();

  return (
    <AppProvider>
      <LegacyReceivableReconciler />
      <CompletedCaseSync />
      <MainContent />
    </AppProvider>
  );
}
