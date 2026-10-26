'use client';

import React, { useState, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import {
  computeRuntimeStatus,
  formatDateVN,
  calculateImpactMetrics,
  calculateScopeLossMetrics,
  getImpactLabel,
} from '@/lib/date-utils';
import { useCurrentTimestamp } from '@/hooks/use-current-time';
import { LossGroup, ImpactType, EventImpactItem } from '@/lib/types';
import {
  LayoutDashboard,
  AlertTriangle,
  ClockAlert,
  Flame,
  RotateCw,
  TrendingUp,
  BarChart3,
  Layers,
  ChevronRight,
  ShieldAlert,
  Sparkles,
  Activity,
} from 'lucide-react';

interface SupervisorDashboardProps {
  onNavigateToTab: (tab: string, subTab?: string) => void;
}

export function SupervisorDashboard({ onNavigateToTab }: SupervisorDashboardProps) {
  const {
    selectedProductionDate,
    selectedShiftId,
    lines,
    skus,
    equipments,
    amChecklists,
    abnormalLogs,
    lossLogs,
    runtimes,
    cips,
    productionProgress,
  } = useAppStore();

  const nowMs = useCurrentTimestamp();

  // Pareto view mode: Cause (Nguyên nhân) vs Impact (Ảnh hưởng vận hành)
  const [paretoView, setParetoView] = useState<'IMPACT' | 'CAUSE'>('IMPACT');

  // 1. Alerts calculations
  // A. AM chưa thực hiện trong ca hiện tại trên các line
  const pendingAmEquipments = useMemo(() => {
    const list: { lineCode: string; eqName: string; lineId: string }[] = [];
    lines.forEach((line) => {
      const lineEqs = equipments.filter((e) => e.lineId === line.id);
      lineEqs.forEach((eq) => {
        const completed = amChecklists.find(
          (c) =>
            c.equipmentId === eq.id &&
            c.productionDate === selectedProductionDate &&
            c.shiftId === selectedShiftId
        );
        if (!completed) {
          list.push({ lineCode: line.code, eqName: eq.name, lineId: line.id });
        }
      });
    });
    return list;
  }, [lines, equipments, amChecklists, selectedProductionDate, selectedShiftId]);

  // B. Runtimes > 90%
  const highRuntimeLines = useMemo(() => {
    return runtimes
      .filter((r) => r.status === 'RUNNING')
      .map((r) => {
        const sTime = new Date(r.startedAt).getTime();
        const status = computeRuntimeStatus(r.startedAt, r.limitHoursSnapshot, null, nowMs || sTime);
        const line = lines.find((l) => l.id === r.lineId);
        const sku = skus.find((s) => s.id === r.skuId);
        return {
          runtime: r,
          status,
          line,
          sku,
        };
      })
      .filter((item) => item.status.usagePercent > 90);
  }, [runtimes, lines, skus, nowMs]);

  // C. Unread abnormalities
  const unreadAbnormals = useMemo(() => {
    return abnormalLogs.filter((a) => !a.acknowledgedAt);
  }, [abnormalLogs]);

  // D. CIP active / sampling
  const activeCips = useMemo(() => {
    return cips.filter((c) => c.status === 'IN_CIP' || c.status === 'POST_CIP_SAMPLING');
  }, [cips]);

  // 2. Core Metrics: Sản lượng
  const totalPlannedTons = productionProgress
    .filter((p) => p.productionDate === selectedProductionDate)
    .reduce((acc, p) => acc + p.plannedQty, 0);

  const totalActualTons = productionProgress
    .filter((p) => p.productionDate === selectedProductionDate)
    .reduce((acc, p) => acc + p.actualQty, 0);

  const prodCompletionRate = totalPlannedTons > 0 ? +((totalActualTons / totalPlannedTons) * 100).toFixed(1) : null;

  // 3. Operational Impact KPIs & Scope Separation (Anti-Duplication Principle)
  const todayLogs = useMemo(() => {
    return lossLogs.filter((l) => l.productionDate === selectedProductionDate);
  }, [lossLogs, selectedProductionDate]);

  const allTodayImpacts = useMemo(() => {
    return todayLogs.flatMap((l) => l.impacts || []);
  }, [todayLogs]);

  const scopeMetrics = useMemo(() => {
    return calculateScopeLossMetrics(allTodayImpacts, nowMs);
  }, [allTodayImpacts, nowMs]);

  // Specific Operational Impact KPIs requested in Change Request:
  const operationalKpiStats = useMemo(() => {
    let stopCookMinutes = 0;
    let reduceCookMinutes = 0;
    let stopFeedPackingMinutes = 0;
    let coolingCongestionDuration = 0;
    let hasInsufficientCongestion = false;

    allTodayImpacts.forEach((imp) => {
      const metrics = calculateImpactMetrics(imp, nowMs);
      if (imp.impactType === 'STOP_COOK') {
        stopCookMinutes += metrics.durationMinutes;
      } else if (imp.impactType === 'REDUCE_COOK_CAPACITY') {
        reduceCookMinutes += metrics.durationMinutes;
      } else if (imp.impactType === 'STOP_FEED_PACKING') {
        stopFeedPackingMinutes += metrics.durationMinutes;
      } else if (imp.impactType === 'COOLING_BUFFER_CONGESTION') {
        coolingCongestionDuration += metrics.durationMinutes;
        if (metrics.convertedLossMinutes === null) {
          hasInsufficientCongestion = true;
        }
      }
    });

    return {
      stopCookMinutes,
      reduceCookMinutes,
      stopFeedPackingMinutes,
      coolingCongestionDuration,
      hasInsufficientCongestion,
    };
  }, [allTodayImpacts, nowMs]);

  // 4. Dual Pareto Analysis
  // Pareto 1: Nhóm Nguyên Nhân (9 Nhóm MVP)
  const paretoCauseData = useMemo(() => {
    const map: Record<LossGroup, number> = {
      Breakdown: 0,
      'Chờ NVL': 0,
      Utility: 0,
      CIP: 0,
      'Hóa lý': 0,
      'Chờ tương': 0,
      Changeover: 0,
      'Vệ sinh': 0,
      Khác: 0,
    };

    todayLogs.forEach((l) => {
      const s = new Date(l.startedAt).getTime();
      const e = l.endedAt ? new Date(l.endedAt).getTime() : (nowMs || s);
      const mins = Math.max(0, Math.round((e - s) / 60000));
      map[l.lossGroup] = (map[l.lossGroup] || 0) + mins;
    });

    const sorted = Object.entries(map)
      .map(([group, minutes]) => ({
        label: group,
        minutes,
      }))
      .filter((item) => item.minutes > 0)
      .sort((a, b) => b.minutes - a.minutes);

    const grandTotal = sorted.reduce((acc, item) => acc + item.minutes, 0);

    return sorted.reduce<Array<{
      label: string;
      minutes: number;
      percent: number;
      cumulativePercent: number;
    }>>((acc, item) => {
      const prevCumMinutes = acc.reduce((sum, x) => sum + x.minutes, 0);
      const cumMinutes = prevCumMinutes + item.minutes;
      const percent = grandTotal > 0 ? +((item.minutes / grandTotal) * 100).toFixed(1) : 0;
      const cumulativePercent = grandTotal > 0 ? +((cumMinutes / grandTotal) * 100).toFixed(1) : 0;
      acc.push({
        ...item,
        percent,
        cumulativePercent,
      });
      return acc;
    }, []);
  }, [todayLogs, nowMs]);

  // Pareto 2: Ảnh Hưởng Vận Hành (Loss Quy Đổi Thực Tế)
  const paretoImpactData = useMemo(() => {
    const map: Partial<Record<ImpactType, number>> = {};

    allTodayImpacts.forEach((imp) => {
      if (imp.impactType === 'NONE') return; // Exclude NONE (0% loss)
      const metrics = calculateImpactMetrics(imp, nowMs);
      if (metrics.convertedLossMinutes !== null && metrics.convertedLossMinutes > 0) {
        map[imp.impactType] = (map[imp.impactType] || 0) + metrics.convertedLossMinutes;
      }
    });

    const sorted = Object.entries(map)
      .map(([type, minutes]) => ({
        label: getImpactLabel(type as ImpactType),
        minutes: minutes || 0,
      }))
      .sort((a, b) => b.minutes - a.minutes);

    const grandTotal = sorted.reduce((acc, item) => acc + item.minutes, 0);

    return sorted.reduce<Array<{
      label: string;
      minutes: number;
      percent: number;
      cumulativePercent: number;
    }>>((acc, item) => {
      const prevCumMinutes = acc.reduce((sum, x) => sum + x.minutes, 0);
      const cumMinutes = prevCumMinutes + item.minutes;
      const percent = grandTotal > 0 ? +((item.minutes / grandTotal) * 100).toFixed(1) : 0;
      const cumulativePercent = grandTotal > 0 ? +((cumMinutes / grandTotal) * 100).toFixed(1) : 0;
      acc.push({
        ...item,
        percent,
        cumulativePercent,
      });
      return acc;
    }, []);
  }, [allTodayImpacts, nowMs]);

  // Top thiết bị phát hiện bất thường
  const topFailureEquipments = useMemo(() => {
    const countMap: Record<string, { count: number; name: string; lineCode: string }> = {};

    abnormalLogs.forEach((a) => {
      const eq = equipments.find((e) => e.id === a.equipmentId);
      const line = lines.find((l) => l.id === a.lineId);
      const eqId = a.equipmentId;
      if (!countMap[eqId]) {
        countMap[eqId] = {
          count: 0,
          name: eq?.name || eqId,
          lineCode: line?.code || a.lineId,
        };
      }
      countMap[eqId].count++;
    });

    return Object.values(countMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [abnormalLogs, equipments, lines]);

  return (
    <div className="space-y-6">
      {/* Dashboard Top Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <LayoutDashboard className="h-5 w-5 text-orange-400" />
            <h1 className="text-lg font-black text-white">Dashboard Điều Hành Shopfloor CBTO</h1>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Giám sát 4 thông tin cốt lõi: <strong>Sản lượng — Loss quy đổi — Runtime — CIP</strong> (Ngày {formatDateVN(selectedProductionDate)})
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="rounded bg-slate-800 px-2.5 py-1 text-slate-300 border border-slate-700 font-medium">
            Mô hình: Ảnh hưởng vận hành CBTO (AC-06/07)
          </span>
        </div>
      </div>

      {/* Alert Center */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Alert 1: Pending AM */}
        <div
          onClick={() => onNavigateToTab('record', 'am')}
          className={`rounded-xl border p-3.5 cursor-pointer transition-all hover:scale-[1.01] ${
            pendingAmEquipments.length > 0
              ? 'border-rose-500/50 bg-rose-950/20'
              : 'border-slate-800 bg-slate-900/40'
          }`}
        >
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-semibold">Bảo Trì AM Ca Này</span>
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                pendingAmEquipments.length > 0 ? 'bg-rose-500/20 text-rose-400' : 'text-slate-500'
              }`}
            >
              Checklist Ca
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-rose-400 font-mono">
              {pendingAmEquipments.length}
            </span>
            <span className="text-xs text-slate-400">thiết bị chưa kiểm</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400 truncate">
            {pendingAmEquipments.length > 0
              ? `${pendingAmEquipments[0].lineCode} - ${pendingAmEquipments[0].eqName}`
              : 'Đã hoàn tất AM toàn bộ thiết bị'}
          </p>
        </div>

        {/* Alert 2: High Runtime > 90% */}
        <div
          onClick={() => onNavigateToTab('runtime')}
          className={`rounded-xl border p-3.5 cursor-pointer transition-all hover:scale-[1.01] ${
            highRuntimeLines.length > 0
              ? 'border-orange-500/50 bg-orange-950/20'
              : 'border-slate-800 bg-slate-900/40'
          }`}
        >
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-semibold">Cảnh Báo Runtime</span>
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                highRuntimeLines.length > 0 ? 'bg-orange-500/20 text-orange-400' : 'text-slate-500'
              }`}
            >
              Mốc &gt; 90% CIP
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-orange-400 font-mono">
              {highRuntimeLines.length}
            </span>
            <span className="text-xs text-slate-400">line cận kề hạn CIP</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400 truncate">
            {highRuntimeLines.length > 0
              ? `${highRuntimeLines[0].line?.code}: ${highRuntimeLines[0].status.remainingHours}h còn lại`
              : 'Chưa có line nào vượt ngưỡng 90%'}
          </p>
        </div>

        {/* Alert 3: Unread Abnormalities */}
        <div
          onClick={() => onNavigateToTab('record', 'abnormal')}
          className={`rounded-xl border p-3.5 cursor-pointer transition-all hover:scale-[1.01] ${
            unreadAbnormals.length > 0
              ? 'border-amber-500/50 bg-amber-950/20'
              : 'border-slate-800 bg-slate-900/40'
          }`}
        >
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-semibold">Bất Thường Mới</span>
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                unreadAbnormals.length > 0 ? 'bg-amber-500/20 text-amber-400' : 'text-slate-500'
              }`}
            >
              Chưa Xác Nhận
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-300 font-mono">
              {unreadAbnormals.length}
            </span>
            <span className="text-xs text-slate-400">phát hiện hiện trường</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400 truncate">
            {unreadAbnormals.length > 0 ? unreadAbnormals[0].description : 'Hiện trường ổn định'}
          </p>
        </div>

        {/* Alert 4: Đang CIP / Post-CIP */}
        <div
          onClick={() => onNavigateToTab('runtime')}
          className={`rounded-xl border p-3.5 cursor-pointer transition-all hover:scale-[1.01] ${
            activeCips.length > 0
              ? 'border-teal-500/50 bg-teal-950/20'
              : 'border-slate-800 bg-slate-900/40'
          }`}
        >
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-semibold">Tiến Trình CIP</span>
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                activeCips.length > 0 ? 'bg-teal-500/20 text-teal-400' : 'text-slate-500'
              }`}
            >
              Vệ sinh & Test
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-teal-400 font-mono">
              {activeCips.length}
            </span>
            <span className="text-xs text-slate-400">line đang CIP / Post-CIP</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400 truncate">
            {activeCips.length > 0
              ? `${activeCips[0].lineId}: ${activeCips[0].status}`
              : 'Tất cả line sẵn sàng sản xuất'}
          </p>
        </div>
      </div>

      {/* 4 CORE METRIC CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Sản lượng hôm nay */}
        <div
          onClick={() => onNavigateToTab('more', 'progress')}
          className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg hover:border-slate-700 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              <span>SẢN LƯỢNG HÔM NAY</span>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-white transition-colors" />
          </div>

          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-white font-mono">{totalActualTons.toFixed(1)}</span>
            <span className="text-xs text-slate-400">/ {totalPlannedTons.toFixed(1)} Tấn</span>
          </div>

          <div className="mt-2 flex items-center justify-between text-xs pt-2 border-t border-slate-800">
            <span className="text-slate-400">Tỷ lệ hoàn thành:</span>
            <span
              className={`font-mono font-bold ${
                prodCompletionRate === null
                  ? 'text-slate-400'
                  : prodCompletionRate >= 80
                  ? 'text-emerald-400'
                  : 'text-amber-400'
              }`}
            >
              {prodCompletionRate !== null ? `${prodCompletionRate}%` : 'Không áp dụng'}
            </span>
          </div>
        </div>

        {/* Card 2: Loss Hôm Nay Theo Phạm Vi (Anti-Duplication Principle) */}
        <div
          onClick={() => onNavigateToTab('record', 'loss')}
          className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg hover:border-slate-700 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
              <ClockAlert className="h-4 w-4 text-rose-400" />
              <span>LOSS QUY ĐỔI THEO PHẠM VI</span>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-white transition-colors" />
          </div>

          <div className="mt-3 grid grid-cols-3 gap-1 text-center">
            <div className="bg-sky-950/40 p-1.5 rounded border border-sky-800/40">
              <span className="text-[10px] text-sky-400 uppercase font-semibold block">Nấu</span>
              <span className="text-lg font-black text-white font-mono">
                {scopeMetrics['Nấu'].totalConvertedLossMinutes}m
              </span>
            </div>
            <div className="bg-teal-950/40 p-1.5 rounded border border-teal-800/40">
              <span className="text-[10px] text-teal-400 uppercase font-semibold block">Cấp tương</span>
              <span className="text-lg font-black text-white font-mono">
                {scopeMetrics['Cấp tương'].totalConvertedLossMinutes}m
              </span>
            </div>
            <div className="bg-amber-950/40 p-1.5 rounded border border-amber-800/40">
              <span className="text-[10px] text-amber-400 uppercase font-semibold block">Đóng gói</span>
              <span className="text-lg font-black text-white font-mono">
                {scopeMetrics['Đóng gói'].totalConvertedLossMinutes}m
              </span>
            </div>
          </div>

          <div className="mt-2 flex items-center justify-between text-[11px] pt-2 border-t border-slate-800 text-slate-400">
            <span>Nguyên tắc:</span>
            <span className="text-amber-300 font-semibold">Tách biệt, không gộp mù quáng</span>
          </div>
        </div>

        {/* Card 3: Runtime hiện tại */}
        <div
          onClick={() => onNavigateToTab('runtime')}
          className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg hover:border-slate-700 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
              <Flame className="h-4 w-4 text-orange-400" />
              <span>RUNTIME HIỆN TẠI</span>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-white transition-colors" />
          </div>

          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white font-mono">
              {runtimes.filter((r) => r.status === 'RUNNING').length} Line
            </span>
            <span className="text-xs text-slate-400">đang chạy liên tục</span>
          </div>

          <div className="mt-2 flex items-center justify-between text-xs pt-2 border-t border-slate-800">
            <span className="text-slate-400">Mốc cao nhất:</span>
            <span className="text-orange-400 font-mono font-bold">
              {highRuntimeLines.length > 0 ? `${highRuntimeLines[0].status.usagePercent}%` : '< 80%'}
            </span>
          </div>
        </div>

        {/* Card 4: CIP hiện tại */}
        <div
          onClick={() => onNavigateToTab('runtime')}
          className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg hover:border-slate-700 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
              <RotateCw className="h-4 w-4 text-teal-400" />
              <span>CIP & POST-CIP</span>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-white transition-colors" />
          </div>

          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-teal-400 font-mono">
              {activeCips.length > 0 ? activeCips[0].lineId : 'Line 3 Sẵn sàng'}
            </span>
          </div>

          <div className="mt-2 flex items-center justify-between text-xs pt-2 border-t border-slate-800">
            <span className="text-slate-400">Post-CIP 60 phút:</span>
            <span className="text-teal-300 font-semibold font-mono">
              {activeCips.length > 0 ? activeCips[0].status : 'Hoàn tất'}
            </span>
          </div>
        </div>
      </div>

      {/* SPECIFIC OPERATIONAL IMPACT STATS ROW */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
            <Activity className="h-4 w-4 text-amber-400" />
            <span>Chỉ Số Vận Hành Trọng Yếu Hiện Trường (Change Request)</span>
          </div>
          <span className="text-[11px] text-slate-400">Truy nguyên từ timestamp & mức độ %</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-700/60">
            <span className="text-slate-400 block text-[11px]">Tổng Giờ Dừng Nấu (100%)</span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-xl font-black text-rose-400 font-mono">
                {operationalKpiStats.stopCookMinutes}
              </span>
              <span className="text-slate-400 text-[11px]">phút</span>
            </div>
            <span className="text-[10px] text-slate-500">Dừng toàn bộ cụm nồi</span>
          </div>

          <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-700/60">
            <span className="text-slate-400 block text-[11px]">Tổng Giờ Giảm Năng Lực Nấu</span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-xl font-black text-amber-400 font-mono">
                {operationalKpiStats.reduceCookMinutes}
              </span>
              <span className="text-slate-400 text-[11px]">phút</span>
            </div>
            <span className="text-[10px] text-slate-500">Giảm tải công suất nấu</span>
          </div>

          <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-700/60">
            <span className="text-slate-400 block text-[11px]">Tổng Giờ Dừng Cấp Tương ĐG</span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-xl font-black text-teal-400 font-mono">
                {operationalKpiStats.stopFeedPackingMinutes}
              </span>
              <span className="text-slate-400 text-[11px]">phút</span>
            </div>
            <span className="text-[10px] text-slate-500">Không tự suy ra Dừng ĐG</span>
          </div>

          <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-700/60">
            <span className="text-slate-400 block text-[11px]">Thời Gian Ứ Bồn Làm Nguội</span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-xl font-black text-purple-400 font-mono">
                {operationalKpiStats.coolingCongestionDuration}
              </span>
              <span className="text-slate-400 text-[11px]">phút tồn tại</span>
            </div>
            <span className="text-[10px] text-purple-300">
              {operationalKpiStats.hasInsufficientCongestion ? 'Có sự kiện Chưa đủ dữ liệu' : 'Đã xác nhận %'}
            </span>
          </div>
        </div>
      </div>

      {/* DUAL PARETO & TOP THIẾT BỊ BẤT THƯỜNG */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Dual Pareto Chart */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-orange-400" />
                Biểu Đồ Phân Tích Pareto Shopfloor CBTO
              </h3>
              <p className="text-xs text-slate-400">
                Hai góc nhìn độc lập: Nhóm sự cố gốc vs. Tổn thất vận hành thực tế (Loss quy đổi)
              </p>
            </div>

            {/* Toggle Switch between Cause and Impact */}
            <div className="flex items-center gap-1 rounded-xl bg-slate-800 p-1 border border-slate-700 self-start sm:self-center">
              <button
                type="button"
                onClick={() => setParetoView('IMPACT')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  paretoView === 'IMPACT'
                    ? 'bg-amber-500 text-slate-950 shadow font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Pareto Ảnh Hưởng
              </button>
              <button
                type="button"
                onClick={() => setParetoView('CAUSE')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  paretoView === 'CAUSE'
                    ? 'bg-amber-500 text-slate-950 shadow font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Pareto Nguyên Nhân (9 Nhóm)
              </button>
            </div>
          </div>

          {/* Pareto Chart Bars */}
          {paretoView === 'IMPACT' ? (
            <div className="space-y-3 pt-1">
              {paretoImpactData.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs italic">
                  Chưa có dữ liệu tổn thất vận hành quy đổi trong ngày này.
                </div>
              ) : (
                paretoImpactData.map((item) => (
                  <div key={item.label} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-200 truncate pr-2">{item.label}</span>
                      <div className="flex items-center gap-3 text-right font-mono shrink-0">
                        <span className="text-rose-400 font-bold">{item.minutes}m quy đổi</span>
                        <span className="text-slate-400 text-[11px] w-12">{item.percent}%</span>
                        <span className="text-amber-400 font-semibold text-[11px] w-16">
                          (LK: {item.cumulativePercent}%)
                        </span>
                      </div>
                    </div>

                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden flex">
                      <div
                        className="h-full bg-rose-500 rounded-full transition-all duration-500"
                        style={{ width: `${item.percent}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-3 pt-1">
              {paretoCauseData.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs italic">
                  Chưa có sự cố nào được ghi nhận trong ngày này.
                </div>
              ) : (
                paretoCauseData.map((item) => (
                  <div key={item.label} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-200 w-32 truncate">{item.label}</span>
                      <div className="flex items-center gap-3 text-right font-mono shrink-0">
                        <span className="text-slate-300 font-bold">{item.minutes}m sự cố</span>
                        <span className="text-slate-400 text-[11px] w-12">{item.percent}%</span>
                        <span className="text-orange-400 font-semibold text-[11px] w-16">
                          (LK: {item.cumulativePercent}%)
                        </span>
                      </div>
                    </div>

                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden flex">
                      <div
                        className="h-full bg-orange-500 rounded-full transition-all duration-500"
                        style={{ width: `${item.percent}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          <div className="border-t border-slate-800 pt-3 text-[11px] text-slate-400 flex items-center justify-between">
            <span>
              {paretoView === 'IMPACT'
                ? 'Đang xem: Phân bổ tổn thất thực tế (Loss quy đổi) để tìm điểm nghẽn nghiêm trọng nhất.'
                : 'Đang xem: Phân bổ thời gian sự cố gốc (9 nhóm MVP) để hỗ trợ phân tích nguyên nhân.'}
            </span>
            <button
              onClick={() => onNavigateToTab('more', 'kpi')}
              className="text-xs text-orange-400 hover:underline font-semibold shrink-0"
            >
              Mở báo cáo KPI chi tiết →
            </button>
          </div>
        </div>

        {/* Top Thiết bị Bất thường */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-amber-400" />
              Top Thiết Bị Phát Hiện Bất Thường
            </h3>
            <p className="text-xs text-slate-400">Tần suất xuất hiện từ kiểm tra AM & hiện trường</p>
          </div>

          <div className="space-y-3">
            {topFailureEquipments.length === 0 ? (
              <div className="text-xs text-slate-500 py-6 text-center">Chưa có phát hiện bất thường nào</div>
            ) : (
              topFailureEquipments.map((eq, idx) => (
                <div
                  key={idx}
                  className="rounded-xl bg-slate-850 p-3 border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 font-bold text-slate-300 font-mono text-[11px]">
                      #{idx + 1}
                    </span>
                    <div>
                      <div className="font-bold text-white">{eq.name}</div>
                      <div className="text-[10px] text-slate-400">Line: {eq.lineCode}</div>
                    </div>
                  </div>

                  <span className="rounded bg-amber-500/15 border border-amber-500/40 px-2 py-0.5 text-xs font-bold text-amber-300 font-mono">
                    {eq.count} lần
                  </span>
                </div>
              ))
            )}
          </div>

          <button
            onClick={() => onNavigateToTab('record', 'abnormal')}
            className="w-full rounded-lg bg-slate-800 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white"
          >
            Xem toàn bộ danh sách bất thường →
          </button>
        </div>
      </div>
    </div>
  );
}
