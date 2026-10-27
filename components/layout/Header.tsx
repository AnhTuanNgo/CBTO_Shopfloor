'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import { SHIFTS, formatDateTime } from '@/lib/date-utils';
import { ShiftId, UserRole } from '@/lib/types';
import {
  Bell,
  Clock,
  RotateCcw,
  CheckCircle2,
  ChevronDown,
  Settings,
  Calendar,
  X,
  User,
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
          label: 'Giám sát',
          shortLabel: 'SV',
          class: 'bg-purple-50 text-purple-700 border-purple-200',
        };
      case 'LINE_LEADER':
        return {
          label: 'Tổ trưởng',
          shortLabel: 'Leader',
          class: 'bg-amber-50 text-amber-700 border-amber-200',
        };
      case 'OPERATOR':
        return {
          label: 'Vận hành',
          shortLabel: 'VH',
          class: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        };
    }
  };

  const roleBadge = getRoleBadge(currentUser.role);
  const shiftList = shifts && shifts.length > 0 ? shifts : SHIFTS;

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200/80 bg-white/95 backdrop-blur-md shadow-xs">
      {/* Top Banner for Unread Notification (Techcombank light banner) */}
      {unreadNotifications.length > 0 && (
        <div className="flex items-center justify-between bg-gradient-to-r from-red-50 via-rose-50/80 to-white px-3.5 py-1.5 text-xs text-red-900 border-b border-red-100">
          <div className="flex items-center gap-2 overflow-hidden flex-1 mr-2">
            <span className="flex h-2 w-2 rounded-full bg-[#E31837] animate-pulse shrink-0" />
            <span className="font-bold text-[11px] sm:text-xs text-[#E31837] shrink-0">Chú ý:</span>
            <span className="font-semibold text-[11px] sm:text-xs truncate">{unreadNotifications[0].title}</span>
            <span className="text-gray-600 truncate text-[11px] sm:text-xs hidden md:inline">
              — {unreadNotifications[0].message}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {unreadNotifications[0].linkTab && (
              <button
                onClick={() => {
                  markNotificationRead(unreadNotifications[0].id);
                  onTabChange(unreadNotifications[0].linkTab!);
                }}
                className="text-[11px] font-bold text-[#E31837] hover:underline cursor-pointer"
              >
                Xem ngay →
              </button>
            )}
            <button
              onClick={() => markNotificationRead(unreadNotifications[0].id)}
              className="text-gray-400 hover:text-gray-700 p-0.5 cursor-pointer"
              aria-label="Đóng thông báo"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Top Header Bar */}
      <div className="mx-auto flex max-w-7xl items-center justify-between px-3 py-2 sm:px-6">
        {/* Left: Brand & Time */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E31837] font-black text-white shadow-sm shadow-red-200 text-sm tracking-tight">
            CB
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-base font-extrabold tracking-tight text-gray-900 leading-tight">
                CBTO Shopfloor
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500 leading-tight">
              <span className="hidden sm:inline font-medium">Nhà máy CBTO</span>
              <span className="hidden sm:inline text-gray-300" aria-hidden="true">·</span>
              <span className="text-gray-600 font-mono tabular-nums flex items-center gap-1">
                <Clock className="h-3 w-3 text-gray-400" />
                {currentTime || '--:--:--'}
              </span>
            </div>
          </div>
        </div>

        {/* Center (Desktop): Shift, Production Date & Line Selector */}
        <div className="hidden md:flex items-center gap-2.5">
          {/* Production Date (06:00 cut-off) */}
          <div className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50/80 px-3 py-1.5 text-xs">
            <Calendar className="h-3.5 w-3.5 text-[#E31837]" />
            <span className="text-gray-500 font-medium hidden lg:inline">Ngày SX:</span>
            <input
              type="date"
              value={selectedProductionDate}
              onChange={(e) => setSelectedProductionDate(e.target.value)}
              className="bg-transparent text-gray-800 font-mono text-xs font-semibold focus:outline-none cursor-pointer"
              title="Ngày làm việc sản xuất (mốc 06:00 sáng)"
            />
          </div>

          {/* Shift Select - Segmented Control */}
          <div className="flex items-center rounded-xl border border-gray-200 bg-gray-50/80 p-0.5 text-xs">
            {shiftList.map((shift) => (
              <button
                key={shift.id}
                onClick={() => setSelectedShiftId(shift.id as ShiftId)}
                className={`px-3 py-1.5 font-semibold transition-all rounded-lg cursor-pointer ${
                  selectedShiftId === shift.id
                    ? 'bg-[#E31837] text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
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
              className="appearance-none rounded-xl border border-gray-200 bg-gray-50/80 py-1.5 pl-3 pr-8 text-xs font-bold text-gray-800 focus:border-[#E31837] focus:outline-none cursor-pointer shadow-xs"
            >
              {lines.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.code} - {l.name.split(' (')[0]}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
          </div>
        </div>

        {/* Right: Settings, Notifications, User Role Switcher */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Quick Settings Button */}
          <button
            onClick={() => onTabChange('settings')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold transition-colors cursor-pointer shadow-xs"
            title="Cài đặt chi tiết (Line, Ca, Máy, Lý do lỗi)"
          >
            <Settings className="h-3.5 w-3.5 text-gray-500" />
            <span className="hidden sm:inline">Cài đặt</span>
          </button>

          {/* Notifications Dropdown */}
          <div className="relative" ref={notifMenuRef}>
            <button
              onClick={() => setShowNotifMenu(!showNotifMenu)}
              className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 hover:text-gray-900 hover:bg-gray-50 cursor-pointer transition-colors shadow-xs"
              title="Thông báo hiện trường"
            >
              <Bell className="h-4 w-4" />
              {unreadNotifications.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#E31837] text-[9px] font-bold text-white shadow-xs">
                  {unreadNotifications.length}
                </span>
              )}
            </button>

            {showNotifMenu && (
              <div className="absolute right-0 mt-2 w-72 sm:w-84 rounded-2xl border border-gray-200 bg-white p-3 shadow-xl z-50 text-xs animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2 px-1 font-bold text-gray-900">
                  <span>Thông báo hiện trường</span>
                  <span className="text-[10px] font-medium text-gray-500">{notifications.length} tin</span>
                </div>
                <div className="max-h-64 overflow-y-auto divide-y divide-gray-100 py-1">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-gray-400">Không có thông báo mới</div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`p-2.5 transition-colors ${n.read ? 'opacity-60' : 'bg-red-50/40 rounded-xl my-0.5'}`}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <p className="font-bold text-gray-900 text-xs">{n.title}</p>
                          <button
                            onClick={() => clearNotification(n.id)}
                            className="text-gray-400 hover:text-red-500 text-[11px] p-0.5 cursor-pointer"
                          >
                            ✕
                          </button>
                        </div>
                        <p className="mt-0.5 text-gray-600 text-[11px] leading-relaxed">{n.message}</p>
                        <div className="mt-1.5 flex items-center justify-between text-[10px] text-gray-400">
                          <span>{formatDateTime(n.createdAt)}</span>
                          {n.linkTab && (
                            <button
                              onClick={() => {
                                markNotificationRead(n.id);
                                setShowNotifMenu(false);
                                onTabChange(n.linkTab!);
                              }}
                              className="text-[#E31837] hover:underline font-bold cursor-pointer"
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
              className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-left hover:bg-gray-50 transition-colors cursor-pointer shadow-xs"
              title="Chuyển đổi người dùng & vai trò"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 text-gray-700">
                <User className="h-4 w-4" />
              </div>
              <div className="hidden sm:block">
                <div className="font-bold text-gray-900 leading-tight text-xs">{currentUser.displayName}</div>
                <div className="text-[10px] text-gray-500 leading-none">{currentUser.employeeCode}</div>
              </div>
              <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-bold ${roleBadge.class}`}>
                <span className="sm:hidden">{roleBadge.shortLabel}</span>
                <span className="hidden sm:inline">{roleBadge.label}</span>
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
            </button>

            {showRoleMenu && (
              <div className="absolute right-0 mt-2 w-72 sm:w-80 rounded-2xl border border-gray-200 bg-white p-3 shadow-xl z-50 text-xs animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between px-1.5 pb-2 border-b border-gray-100 text-[11px] font-bold text-gray-500">
                  <span>Chuyển đổi nhân sự thao tác</span>
                  <span className="text-[10px] text-gray-400 font-normal">Chế độ thử nghiệm</span>
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
                        className={`w-full rounded-xl px-3 py-2 text-left transition-colors flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? 'bg-red-50 border border-red-200 text-[#E31837]'
                            : 'hover:bg-gray-50 text-gray-700'
                        }`}
                      >
                        <div className="pr-2">
                          <div className="font-bold text-gray-900 text-xs">{u.displayName}</div>
                          <div className="text-[10px] text-gray-500 font-mono">{u.email}</div>
                          <div className="text-[10px] text-gray-400 mt-0.5">
                            Phụ trách: {u.lineIds.join(', ')}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className={`rounded-md border px-1.5 py-0.5 text-[9px] font-bold ${b.class}`}>
                            {b.label}
                          </span>
                          {isSelected && <CheckCircle2 className="h-3.5 w-3.5 text-[#E31837]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="border-t border-gray-100 pt-2 px-1">
                  <button
                    onClick={() => {
                      resetToSampleData();
                      setShowRoleMenu(false);
                    }}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-gray-50 border border-gray-200 px-3 py-2 text-[11px] font-bold text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5 text-gray-500" />
                    Khôi phục dữ liệu mẫu ban đầu
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Sub-Header / Operational Control Row (md:hidden) */}
      <div className="md:hidden border-t border-gray-100 bg-gray-50/90 px-3 py-2 flex items-center justify-between gap-2">
        {/* Mobile Line Selector */}
        <div className="relative flex-1 min-w-0">
          <select
            value={selectedLineId}
            onChange={(e) => setSelectedLineId(e.target.value)}
            className="w-full appearance-none rounded-xl border border-gray-200 bg-white py-2 pl-2.5 pr-7 text-xs font-bold text-gray-800 focus:border-[#E31837] focus:outline-none truncate cursor-pointer shadow-2xs"
          >
            {lines.map((l) => (
              <option key={l.id} value={l.id}>
                {l.code} - {l.name.split(' (')[0]}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
        </div>

        {/* Mobile Shift Selector */}
        <div className="flex items-center rounded-xl border border-gray-200 bg-white p-0.5 shrink-0 shadow-2xs">
          {shiftList.map((shift) => (
            <button
              key={shift.id}
              onClick={() => setSelectedShiftId(shift.id as ShiftId)}
              className={`px-2.5 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                selectedShiftId === shift.id
                  ? 'bg-[#E31837] text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title={shift.displayTime}
            >
              {shift.name}
            </button>
          ))}
        </div>

        {/* Mobile Date Picker */}
        <div className="relative shrink-0 flex items-center rounded-xl border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-700 shadow-2xs">
          <Calendar className="h-3.5 w-3.5 text-[#E31837] mr-1.5 shrink-0" />
          <input
            type="date"
            value={selectedProductionDate}
            onChange={(e) => setSelectedProductionDate(e.target.value)}
            className="w-[90px] bg-transparent text-xs font-mono font-bold text-gray-800 focus:outline-none cursor-pointer"
            title="Ngày sản xuất"
          />
        </div>
      </div>
    </header>
  );
}
