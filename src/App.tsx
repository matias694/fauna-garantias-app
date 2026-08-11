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
import { ExactBalanceDemoSeeder } from './components/ExactBalanceDemoSeeder';
import { FullCoverageDemoSeeder } from './components/FullCoverageDemoSeeder';
import { FullOwnerRecoveryDemoSeeder } from './components/FullOwnerRecoveryDemoSeeder';

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
  return (
    <AppProvider>
      <LegacyReceivableReconciler />
      <CompletedCaseSync />
      <ExactBalanceDemoSeeder />
      <FullCoverageDemoSeeder />
      <FullOwnerRecoveryDemoSeeder />
      <MainContent />
    </AppProvider>
  );
}
