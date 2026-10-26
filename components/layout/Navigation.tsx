'use client';

import React from 'react';
import {
  LayoutDashboard,
  ClipboardCheck,
  Timer,
  ArrowLeftRight,
  MoreHorizontal,
  AlertTriangle,
  ClockAlert,
  FileText,
  TrendingUp,
  CalendarDays,
  BarChart3,
  Settings,
} from 'lucide-react';

export type MainTab = 'dashboard' | 'record' | 'runtime' | 'handover' | 'more';
export type RecordSubTab = 'am' | 'abnormal' | 'loss' | 'log';
export type MoreSubTab = 'progress' | 'schedule' | 'kpi' | 'settings';

interface NavigationProps {
  activeTab: MainTab;
  onTabChange: (tab: MainTab) => void;
  recordSubTab: RecordSubTab;
  onRecordSubTabChange: (sub: RecordSubTab) => void;
  moreSubTab: MoreSubTab;
  onMoreSubTabChange: (sub: MoreSubTab) => void;
}

export function Navigation({
  activeTab,
  onTabChange,
  recordSubTab,
  onRecordSubTabChange,
  moreSubTab,
  onMoreSubTabChange,
}: NavigationProps) {
  const mainNavItems = [
    { id: 'dashboard' as MainTab, label: 'Tổng quan', icon: LayoutDashboard },
    { id: 'record' as MainTab, label: 'Ghi nhận', icon: ClipboardCheck },
    { id: 'runtime' as MainTab, label: 'Runtime/CIP', icon: Timer },
    { id: 'handover' as MainTab, label: 'Giao ca', icon: ArrowLeftRight },
    { id: 'more' as MainTab, label: 'Thêm', icon: MoreHorizontal },
  ];

  const recordSubNav = [
    { id: 'am' as RecordSubTab, label: 'Kiểm tra AM', icon: ClipboardCheck },
    { id: 'abnormal' as RecordSubTab, label: 'Bất thường', icon: AlertTriangle },
    { id: 'loss' as RecordSubTab, label: 'Loss Time', icon: ClockAlert },
    { id: 'log' as RecordSubTab, label: 'Nhật ký vận hành', icon: FileText },
  ];

  const moreSubNav = [
    { id: 'progress' as MoreSubTab, label: 'Tiến độ sản xuất', icon: TrendingUp },
    { id: 'schedule' as MoreSubTab, label: 'Lịch làm việc', icon: CalendarDays },
    { id: 'kpi' as MoreSubTab, label: 'KPI Vận hành', icon: BarChart3 },
    { id: 'settings' as MoreSubTab, label: 'Cài đặt chi tiết', icon: Settings },
  ];

  return (
    <div className="w-full">
      {/* Desktop Top Tabs Navigation */}
      <div className="hidden md:block border-b border-slate-800 bg-slate-900/60">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6">
          <nav className="flex space-x-1 py-1.5">
            {mainNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-orange-600/15 text-orange-400 border border-orange-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Sub-tabs on desktop if Record or More is active */}
          {activeTab === 'record' && (
            <div className="flex items-center gap-1 rounded-lg bg-slate-800/80 p-1 border border-slate-700/60">
              {recordSubNav.map((sub) => {
                const SubIcon = sub.icon;
                const isSubActive = recordSubTab === sub.id;
                return (
                  <button
                    key={sub.id}
                    onClick={() => onRecordSubTabChange(sub.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                      isSubActive
                        ? 'bg-orange-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <SubIcon className="h-3 w-3" />
                    <span>{sub.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {activeTab === 'more' && (
            <div className="flex items-center gap-1 rounded-lg bg-slate-800/80 p-1 border border-slate-700/60">
              {moreSubNav.map((sub) => {
                const SubIcon = sub.icon;
                const isSubActive = moreSubTab === sub.id;
                return (
                  <button
                    key={sub.id}
                    onClick={() => onMoreSubTabChange(sub.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                      isSubActive
                        ? 'bg-orange-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <SubIcon className="h-3 w-3" />
                    <span>{sub.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Sub-tabs Header Bar */}
      <div className="md:hidden border-b border-slate-800 bg-slate-900/90 px-3 py-2 overflow-x-auto no-scrollbar">
        {activeTab === 'record' && (
          <div className="flex items-center gap-1.5 min-w-max">
            {recordSubNav.map((sub) => {
              const SubIcon = sub.icon;
              const isSubActive = recordSubTab === sub.id;
              return (
                <button
                  key={sub.id}
                  onClick={() => onRecordSubTabChange(sub.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-all ${
                    isSubActive
                      ? 'bg-orange-600 text-white shadow-sm'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <SubIcon className="h-3 w-3" />
                  <span>{sub.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {activeTab === 'more' && (
          <div className="flex items-center gap-1.5 min-w-max">
            {moreSubNav.map((sub) => {
              const SubIcon = sub.icon;
              const isSubActive = moreSubTab === sub.id;
              return (
                <button
                  key={sub.id}
                  onClick={() => onMoreSubTabChange(sub.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-all ${
                    isSubActive
                      ? 'bg-orange-600 text-white shadow-sm'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <SubIcon className="h-3 w-3" />
                  <span>{sub.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Mobile Bottom Navigation Bar (Thumb friendly for operators on phone) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-slate-800 bg-slate-900/95 backdrop-blur-md px-2 py-1 safe-area-bottom">
        <div className="grid grid-cols-5 gap-1">
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex flex-col items-center justify-center py-1.5 text-[10px] font-medium transition-colors ${
                  isActive ? 'text-orange-400' : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                    isActive ? 'bg-orange-600/20 text-orange-400' : 'text-slate-400'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <span className="mt-0.5 leading-tight">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
