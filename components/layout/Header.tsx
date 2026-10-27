'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import { SHIFTS, formatDateTime } from '@/lib/date-utils';
import { ShiftId, UserRole } from '@/lib/types';
import {
  Bell,
  Clock,
  RotateCcw,
  UserCheck,
  CheckCircle2,
  ChevronDown,
  Layers,
  Settings,
  Calendar,
  X,
} from 'lucide-react';

export function Header({ onTabChange }: { onTabChange: (tab: string) => void }) {
  const {
    currentUser,
    setCurrentUser,
    availableUsers,
    selectedLineId,
    setSelectedLineId,
    selectedShiftId,
    setSelectedShiftId,
    selectedProductionDate,
    setSelectedProductionDate,
    lines,
    shifts,
    notifications,
    markNotificationRead,
    clearNotification,
    resetToSampleData,
  } = useAppStore();

  const [currentTime, setCurrentTime] = useState<string>('');
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);

  const roleMenuRef = useRef<HTMLDivElement>(null);
  const notifMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (roleMenuRef.current && !roleMenuRef.current.contains(event.target as Node)) {
        setShowRoleMenu(false);
      }
      if (notifMenuRef.current && !notifMenuRef.current.contains(event.target as Node)) {
        setShowNotifMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadNotifications = notifications.filter((n) => !n.read);

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'SUPERVISOR':
        return {
          label: 'Supervisor',
          shortLabel: 'SV',
          class: 'bg-purple-950/80 text-purple-300 border-purple-500/40',
        };
      case 'LINE_LEADER':
        return {
          label: 'Tổ trưởng',
          shortLabel: 'Leader',
          class: 'bg-amber-950/80 text-amber-300 border-amber-500/40',
        };
      case 'OPERATOR':
        return {
          label: 'Công nhân',
          shortLabel: 'CN',
          class: 'bg-sky-950/80 text-sky-300 border-sky-500/40',
        };
    }
  };

  const roleBadge = getRoleBadge(currentUser.role);
  const shiftList = shifts && shifts.length > 0 ? shifts : SHIFTS;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-900/98 backdrop-blur-md shadow-lg">
      {/* Top Banner for Unread Notification */}
      {unreadNotifications.length > 0 && (
        <div className="flex items-center justify-between bg-gradient-to-r from-amber-950 via-amber-900/80 to-slate-900 px-3 py-1.5 text-xs text-amber-200 border-b border-amber-700/40">
          <div className="flex items-center gap-2 overflow-hidden flex-1 mr-2">
            <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
            <span className="font-semibold text-[11px] sm:text-xs truncate">{unreadNotifications[0].title}:</span>
            <span className="text-amber-300/85 truncate text-[11px] sm:text-xs hidden xs:inline">
              {unreadNotifications[0].message}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {unreadNotifications[0].linkTab && (
              <button
                onClick={() => {
                  markNotificationRead(unreadNotifications[0].id);
                  onTabChange(unreadNotifications[0].linkTab!);
                }}
                className="text-[11px] underline hover:text-white font-medium cursor-pointer"
              >
                Xem chi tiết
              </button>
            )}
            <button
              onClick={() => markNotificationRead(unreadNotifications[0].id)}
              className="text-amber-400/70 hover:text-white p-0.5"
              aria-label="Đóng thông báo"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Top Header Bar */}
      <div className="mx-auto flex max-w-7xl items-center justify-between px-2.5 py-2 sm:px-6">
        {/* Left: Brand & Time */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-600 font-bold text-white shadow-sm text-sm">
            CB
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-sm sm:text-base font-bold tracking-tight text-white leading-tight">
                CBTO Shopfloor
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400 leading-tight">
              <span className="hidden sm:inline">Nhà máy CBTO</span>
              <span className="hidden sm:inline" aria-hidden="true">·</span>
              <span className="text-slate-300 font-mono tabular-nums flex items-center gap-1">
                <Clock className="h-3 w-3 text-slate-400" />
                {currentTime || '--:--:--'}
              </span>
            </div>
          </div>
        </div>

        {/* Center (Desktop Only - lg & md): Shift, Production Date & Line Selector */}
        <div className="hidden md:flex items-center gap-2">
          {/* Production Date (06:00 cut-off) */}
          <div className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-xs">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-slate-400 hidden lg:inline">Ngày SX:</span>
            <input
              type="date"
              value={selectedProductionDate}
              onChange={(e) => setSelectedProductionDate(e.target.value)}
              className="bg-transparent text-slate-200 font-mono text-xs focus:outline-none cursor-pointer"
              title="Ngày làm việc sản xuất (mốc 06:00 sáng)"
            />
          </div>

          {/* Shift Select */}
          <div className="flex items-center rounded-lg border border-slate-700 bg-slate-800/80 p-0.5 text-xs">
            {shiftList.map((shift) => (
              <button
                key={shift.id}
                onClick={() => setSelectedShiftId(shift.id as ShiftId)}
                className={`px-2.5 py-1 font-medium transition-colors rounded ${
                  selectedShiftId === shift.id
                    ? 'bg-orange-600 text-white shadow-sm font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title={shift.displayTime}
              >
                {shift.name}
              </button>
            ))}
          </div>

          {/* Line Select */}
          <div className="relative">
            <select
              value={selectedLineId}
              onChange={(e) => setSelectedLineId(e.target.value)}
              className="appearance-none rounded-lg border border-slate-700 bg-slate-800/90 py-1.5 pl-2.5 pr-7 text-xs font-semibold text-slate-200 focus:border-orange-500 focus:outline-none cursor-pointer"
            >
              {lines.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.code} - {l.name.split(' (')[0]}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-2.5 h-3.5 w-3.5 text-slate-400" />
          </div>
        </div>

        {/* Right: Settings, Notifications, User Role Switcher */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Quick Settings Button */}
          <button
            onClick={() => onTabChange('settings')}
            className="flex items-center gap-1 px-2 py-1.5 sm:px-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 text-xs font-medium transition-colors cursor-pointer"
            title="Cài đặt chi tiết (Line, Ca, Máy, Lý do lỗi)"
          >
            <Settings className="h-3.5 w-3.5 text-amber-400" />
            <span className="hidden sm:inline">Cài đặt</span>
          </button>

          {/* Notifications Dropdown */}
          <div className="relative" ref={notifMenuRef}>
            <button
              onClick={() => setShowNotifMenu(!showNotifMenu)}
              className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 cursor-pointer transition-colors"
              title="Thông báo hệ thống"
            >
              <Bell className="h-4 w-4" />
              {unreadNotifications.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[9px] font-bold text-white shadow">
                  {unreadNotifications.length}
                </span>
              )}
            </button>

            {showNotifMenu && (
              <div className="absolute right-0 mt-2 w-72 sm:w-80 rounded-xl border border-slate-700 bg-slate-900 p-2 shadow-2xl z-50 text-xs">
                <div className="flex items-center justify-between border-b border-slate-800 px-2 py-1.5 font-bold text-slate-200">
                  <span>Thông báo hiện trường</span>
                  <span className="text-[10px] text-slate-400">{notifications.length} tin</span>
                </div>
                <div className="max-h-64 overflow-y-auto divide-y divide-slate-800/60 py-1">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-slate-500">Không có thông báo mới</div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`p-2 transition-colors ${n.read ? 'opacity-60' : 'bg-slate-800/50 rounded-lg'}`}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <p className="font-semibold text-slate-200 text-xs">{n.title}</p>
                          <button
                            onClick={() => clearNotification(n.id)}
                            className="text-slate-500 hover:text-rose-400 text-[11px] p-0.5"
                          >
                            ✕
                          </button>
                        </div>
                        <p className="mt-0.5 text-slate-400 text-[11px]">{n.message}</p>
                        <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500">
                          <span>{formatDateTime(n.createdAt)}</span>
                          {n.linkTab && (
                            <button
                              onClick={() => {
                                markNotificationRead(n.id);
                                setShowNotifMenu(false);
                                onTabChange(n.linkTab!);
                              }}
                              className="text-orange-400 hover:underline font-medium"
                            >
                              Mở xem →
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User & Role Switcher */}
          <div className="relative" ref={roleMenuRef}>
            <button
              onClick={() => setShowRoleMenu(!showRoleMenu)}
              className="flex items-center gap-1.5 sm:gap-2 rounded-lg border border-slate-700 bg-slate-800/90 px-2 sm:px-2.5 py-1.5 text-xs text-left hover:bg-slate-700/80 transition-colors cursor-pointer"
              title="Chuyển đổi người dùng & vai trò"
            >
              <div className="hidden sm:block">
                <div className="font-semibold text-slate-200 leading-tight text-xs">{currentUser.displayName}</div>
                <div className="text-[10px] text-slate-400 leading-none">{currentUser.employeeCode}</div>
              </div>
              <span className={`rounded border px-1.5 py-0.5 text-[10px] font-bold ${roleBadge.class}`}>
                <span className="sm:hidden">{roleBadge.shortLabel}</span>
                <span className="hidden sm:inline">{roleBadge.label}</span>
              </span>
              <ChevronDown className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-slate-400" />
            </button>

            {showRoleMenu && (
              <div className="absolute right-0 mt-2 w-72 sm:w-80 rounded-xl border border-slate-700 bg-slate-900 p-2.5 shadow-2xl z-50 text-xs">
                <div className="flex items-center justify-between px-1.5 py-1 border-b border-slate-800 text-[11px] font-semibold text-slate-400">
                  <span>Chuyển đổi người dùng & vai trò</span>
                  <span className="text-[10px] text-slate-500">AC-01</span>
                </div>
                <div className="space-y-1 py-1.5 max-h-72 overflow-y-auto">
                  {availableUsers.map((u) => {
                    const isSelected = u.uid === currentUser.uid;
                    const b = getRoleBadge(u.role);
                    return (
                      <button
                        key={u.uid}
                        onClick={() => {
                          setCurrentUser(u);
                          setShowRoleMenu(false);
                        }}
                        className={`w-full rounded-lg px-2.5 py-2 text-left transition-colors flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? 'bg-orange-600/20 border border-orange-500/40 text-white'
                            : 'hover:bg-slate-800 text-slate-300'
                        }`}
                      >
                        <div className="pr-2">
                          <div className="font-semibold text-slate-200 text-xs">{u.displayName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{u.email}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            Phụ trách: {u.lineIds.join(', ')}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className={`rounded border px-1.5 py-0.5 text-[9px] font-bold ${b.class}`}>
                            {b.label}
                          </span>
                          {isSelected && <CheckCircle2 className="h-3.5 w-3.5 text-orange-400" />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="border-t border-slate-800 pt-2 px-1">
                  <button
                    onClick={() => {
                      if (confirm('Khôi phục toàn bộ dữ liệu mẫu ban đầu của nhà máy CBTO?')) {
                        resetToSampleData();
                        setShowRoleMenu(false);
                      }
                    }}
                    className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-slate-800 px-2.5 py-2 text-[11px] font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5 text-slate-400" />
                    Khôi phục dữ liệu mẫu ban đầu
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Sub-Header / Operational Control Row (md:hidden) */}
      <div className="md:hidden border-t border-slate-800 bg-slate-950/80 px-3 py-2 flex items-center justify-between gap-2">
        {/* Mobile Line Selector */}
        <div className="relative flex-1 min-w-0">
          <select
            value={selectedLineId}
            onChange={(e) => setSelectedLineId(e.target.value)}
            className="w-full appearance-none rounded-lg border border-slate-700 bg-slate-800/95 py-2 pl-2.5 pr-7 text-xs font-semibold text-slate-200 focus:border-orange-500 focus:outline-none truncate cursor-pointer"
          >
            {lines.map((l) => (
              <option key={l.id} value={l.id}>
                {l.code} - {l.name.split(' (')[0]}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-2.5 h-3.5 w-3.5 text-slate-400" />
        </div>

        {/* Mobile Shift Selector */}
        <div className="flex items-center rounded-lg border border-slate-700 bg-slate-800/90 p-0.5 shrink-0">
          {shiftList.map((shift) => (
            <button
              key={shift.id}
              onClick={() => setSelectedShiftId(shift.id as ShiftId)}
              className={`px-2.5 py-1.5 text-xs font-medium rounded transition-colors ${
                selectedShiftId === shift.id
                  ? 'bg-orange-600 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title={shift.displayTime}
            >
              {shift.name}
            </button>
          ))}
        </div>

        {/* Mobile Date Picker */}
        <div className="relative shrink-0 flex items-center rounded-lg border border-slate-700 bg-slate-800/90 px-2.5 py-1.5 text-xs text-slate-300">
          <Calendar className="h-3.5 w-3.5 text-orange-400 mr-1.5 shrink-0" />
          <input
            type="date"
            value={selectedProductionDate}
            onChange={(e) => setSelectedProductionDate(e.target.value)}
            className="w-[90px] bg-transparent text-xs font-mono text-slate-200 focus:outline-none cursor-pointer"
            title="Ngày sản xuất"
          />
        </div>
      </div>
    </header>
  );
}
