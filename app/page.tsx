'use client';

import React, { useState, useEffect } from 'react';
import { AppStoreProvider } from '@/lib/store';
import { Header } from '@/components/layout/Header';
import {
  Navigation,
  MainTab,
  RecordSubTab,
  MoreSubTab,
} from '@/components/layout/Navigation';

import { SupervisorDashboard } from '@/components/modules/SupervisorDashboard';
import { AMModule } from '@/components/modules/AMModule';
import { AbnormalModule } from '@/components/modules/AbnormalModule';
import { LossModule } from '@/components/modules/LossModule';
import { OperationLogModule } from '@/components/modules/OperationLogModule';
import { RuntimeCipModule } from '@/components/modules/RuntimeCipModule';
import { HandoverModule } from '@/components/modules/HandoverModule';
import { ProductionProgressModule } from '@/components/modules/ProductionProgressModule';
import { WorkScheduleModule } from '@/components/modules/WorkScheduleModule';
import { KpiModule } from '@/components/modules/KpiModule';
import { SettingsModule } from '@/components/modules/SettingsModule';

function AppContent() {
  const [activeTab, setActiveTab] = useState<MainTab>('dashboard');
  const [recordSubTab, setRecordSubTab] = useState<RecordSubTab>('am');
  const [moreSubTab, setMoreSubTab] = useState<MoreSubTab>('progress');

  const handleGlobalNavigate = (tab: string, sub?: string) => {
    if (tab === 'dashboard') {
      setActiveTab('dashboard');
    } else if (tab === 'record') {
      setActiveTab('record');
      if (sub) setRecordSubTab(sub as RecordSubTab);
    } else if (tab === 'runtime') {
      setActiveTab('runtime');
    } else if (tab === 'handover') {
      setActiveTab('handover');
    } else if (tab === 'more') {
      setActiveTab('more');
      if (sub) setMoreSubTab(sub as MoreSubTab);
    } else if (tab === 'schedules') {
      setActiveTab('more');
      setMoreSubTab('schedule');
    } else if (tab === 'abnormals') {
      setActiveTab('record');
      setRecordSubTab('abnormal');
    } else if (tab === 'settings') {
      setActiveTab('more');
      setMoreSubTab('settings');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F6F8] text-[#202124] overflow-x-hidden w-full max-w-full">
      {/* Top Header */}
      <Header onTabChange={handleGlobalNavigate} />

      {/* Primary & Sub Navigation */}
      <Navigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        recordSubTab={recordSubTab}
        onRecordSubTabChange={setRecordSubTab}
        moreSubTab={moreSubTab}
        onMoreSubTabChange={setMoreSubTab}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 pb-24 md:pb-10">
        {activeTab === 'dashboard' && (
          <SupervisorDashboard onNavigateToTab={handleGlobalNavigate} />
        )}

        {activeTab === 'record' && (
          <div>
            {recordSubTab === 'am' && <AMModule />}
            {recordSubTab === 'abnormal' && <AbnormalModule />}
            {recordSubTab === 'loss' && <LossModule />}
            {recordSubTab === 'log' && <OperationLogModule />}
          </div>
        )}

        {activeTab === 'runtime' && <RuntimeCipModule />}

        {activeTab === 'handover' && <HandoverModule />}

        {activeTab === 'more' && (
          <div>
            {moreSubTab === 'progress' && <ProductionProgressModule />}
            {moreSubTab === 'schedule' && <WorkScheduleModule />}
            {moreSubTab === 'kpi' && <KpiModule />}
            {moreSubTab === 'settings' && <SettingsModule />}
          </div>
        )}
      </main>

      {/* Honest Shopfloor Data Storage Notice (Section 9) */}
      <footer className="border-t border-gray-200/80 bg-white/80 py-3 px-4 text-center text-xs text-gray-500 hidden md:block">
        <span className="font-semibold text-gray-700">CBTO Shopfloor Operations</span> · Dữ liệu lưu trên trình duyệt (LocalStorage / Bản thử nghiệm hiện trường FACT)
      </footer>
    </div>
  );
}

const emptySubscribe = () => () => {};

export default function Home() {
  const isMounted = React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-[#F5F6F8] flex flex-col items-center justify-center text-gray-500 p-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E31837] font-black text-white text-lg shadow-lg shadow-red-200 animate-pulse">
          CB
        </div>
        <div className="mt-4 text-xs font-bold tracking-wider uppercase text-gray-800">
          CBTO Shopfloor Operations Web App
        </div>
        <div className="mt-1 text-[11px] text-gray-500">
          Đang khởi tạo giao diện hiện trường...
        </div>
      </div>
    );
  }

  return (
    <AppStoreProvider>
      <AppContent />
    </AppStoreProvider>
  );
}
