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
      <div className="hidden md:block border-b border-gray-200/80 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6">
          <nav className="flex space-x-1.5 py-2">
            {mainNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    isActive
                      ? 'bg-red-50 text-[#E31837] shadow-2xs'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-[#E31837]' : 'text-gray-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Sub-tabs on desktop if Record or More is active */}
          {activeTab === 'record' && (
            <div className="flex items-center gap-1 rounded-xl bg-gray-100 p-1 border border-gray-200/60 shadow-inner">
              {recordSubNav.map((sub) => {
                const SubIcon = sub.icon;
                const isSubActive = recordSubTab === sub.id;
                return (
                  <button
                    key={sub.id}
                    onClick={() => onRecordSubTabChange(sub.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      isSubActive
                        ? 'bg-white text-gray-900 shadow-xs'
                        : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    <SubIcon className={`h-3.5 w-3.5 ${isSubActive ? 'text-[#E31837]' : 'text-gray-400'}`} />
                    <span>{sub.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {activeTab === 'more' && (
            <div className="flex items-center gap-1 rounded-xl bg-gray-100 p-1 border border-gray-200/60 shadow-inner">
              {moreSubNav.map((sub) => {
                const SubIcon = sub.icon;
                const isSubActive = moreSubTab === sub.id;
                return (
                  <button
                    key={sub.id}
                    onClick={() => onMoreSubTabChange(sub.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      isSubActive
                        ? 'bg-white text-gray-900 shadow-xs'
                        : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    <SubIcon className={`h-3.5 w-3.5 ${isSubActive ? 'text-[#E31837]' : 'text-gray-400'}`} />
                    <span>{sub.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Sub-tabs Header Bar */}
      <div className="md:hidden border-b border-gray-200/80 bg-white px-3 py-2 overflow-x-auto no-scrollbar">
        {activeTab === 'record' && (
          <div className="flex items-center gap-1.5 min-w-max">
            {recordSubNav.map((sub) => {
              const SubIcon = sub.icon;
              const isSubActive = recordSubTab === sub.id;
              return (
                <button
                  key={sub.id}
                  onClick={() => onRecordSubTabChange(sub.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                    isSubActive
                      ? 'bg-[#E31837] text-white shadow-xs'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <SubIcon className="h-3.5 w-3.5" />
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
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                    isSubActive
                      ? 'bg-[#E31837] text-white shadow-xs'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <SubIcon className="h-3.5 w-3.5" />
                  <span>{sub.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Mobile Bottom Navigation Bar (Techcombank style bottom navigation with 48px touch targets) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white/98 backdrop-blur-md px-2 py-1 shadow-lg">
        <div className="grid grid-cols-5 gap-1">
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex flex-col items-center justify-center py-2 text-[10px] font-bold transition-all cursor-pointer min-h-[48px] ${
                  isActive ? 'text-[#E31837]' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-xl transition-all ${
                    isActive ? 'bg-red-50 text-[#E31837]' : 'text-gray-500'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <span className="mt-0.5 leading-tight tracking-tight">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
