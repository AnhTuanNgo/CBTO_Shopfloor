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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <LayoutDashboard className="h-5 w-5 text-orange-500" />
            <h1 className="text-lg font-bold text-white tracking-tight">
              Dashboard Điều Hành Shopfloor CBTO
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Giám sát 4 chỉ số cốt lõi: Sản lượng · Loss quy đổi theo phạm vi · Runtime · Chu kỳ CIP (Ngày {formatDateVN(selectedProductionDate)})
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-xs font-medium text-slate-300 bg-slate-800/90 px-3 py-1.5 rounded-lg border border-slate-700">
            Mô hình: Tách biệt Nguồn & Ảnh hưởng Vận hành
          </span>
        </div>
      </div>

      {/* Alert Center - Spacious, ergonomic clickable status cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Alert 1: Pending AM */}
        <div
          onClick={() => onNavigateToTab('record', 'am')}
          className={`rounded-xl border p-4 cursor-pointer transition-colors ${
            pendingAmEquipments.length > 0
              ? 'border-rose-900/60 bg-rose-950/20 hover:bg-rose-950/30'
              : 'border-slate-800 bg-slate-900/70 hover:bg-slate-900'
          }`}
        >
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-semibold">Bảo trì AM ca này</span>
            <span className="text-[11px] text-slate-400 font-mono">
              Checklist Ca
            </span>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-rose-400 font-mono tabular-nums">
              {pendingAmEquipments.length}
            </span>
            <span className="text-xs text-slate-400">thiết bị chưa kiểm</span>
          </div>
          <p className="mt-1 text-xs text-slate-400 truncate">
            {pendingAmEquipments.length > 0
              ? `${pendingAmEquipments[0].lineCode} - ${pendingAmEquipments[0].eqName}`
              : 'Đã hoàn tất AM toàn bộ thiết bị'}
          </p>
        </div>

        {/* Alert 2: High Runtime > 90% */}
        <div
          onClick={() => onNavigateToTab('runtime')}
          className={`rounded-xl border p-4 cursor-pointer transition-colors ${
            highRuntimeLines.length > 0
              ? 'border-orange-900/60 bg-orange-950/20 hover:bg-orange-950/30'
              : 'border-slate-800 bg-slate-900/70 hover:bg-slate-900'
          }`}
        >
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-semibold">Cảnh báo Runtime</span>
            <span className="text-[11px] text-slate-400 font-mono">
              Ngưỡng &gt; 90%
            </span>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-orange-400 font-mono tabular-nums">
              {highRuntimeLines.length}
            </span>
            <span className="text-xs text-slate-400">line cận hạn CIP</span>
          </div>
          <p className="mt-1 text-xs text-slate-400 truncate">
            {highRuntimeLines.length > 0
              ? `${highRuntimeLines[0].line?.code}: còn ${highRuntimeLines[0].status.remainingHours}h`
              : 'Tất cả dây chuyền dưới ngưỡng 90%'}
          </p>
        </div>

        {/* Alert 3: Unread Abnormalities */}
        <div
          onClick={() => onNavigateToTab('record', 'abnormal')}
          className={`rounded-xl border p-4 cursor-pointer transition-colors ${
            unreadAbnormals.length > 0
              ? 'border-amber-900/60 bg-amber-950/20 hover:bg-amber-950/30'
              : 'border-slate-800 bg-slate-900/70 hover:bg-slate-900'
          }`}
        >
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-semibold">Bất thường hiện trường</span>
            <span className="text-[11px] text-slate-400 font-mono">
              Chưa xác nhận
            </span>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-amber-300 font-mono tabular-nums">
              {unreadAbnormals.length}
            </span>
            <span className="text-xs text-slate-400">sự việc ghi nhận</span>
          </div>
          <p className="mt-1 text-xs text-slate-400 truncate">
            {unreadAbnormals.length > 0 ? unreadAbnormals[0].description : 'Hiện trường vận hành ổn định'}
          </p>
        </div>

        {/* Alert 4: Đang CIP / Post-CIP */}
        <div
          onClick={() => onNavigateToTab('runtime')}
          className={`rounded-xl border p-4 cursor-pointer transition-colors ${
            activeCips.length > 0
              ? 'border-teal-900/60 bg-teal-950/20 hover:bg-teal-950/30'
              : 'border-slate-800 bg-slate-900/70 hover:bg-slate-900'
          }`}
        >
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-semibold">Tiến trình CIP / Tiệt trùng</span>
            <span className="text-[11px] text-slate-400 font-mono">
              Vệ sinh trạm
            </span>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-teal-400 font-mono tabular-nums">
              {activeCips.length}
            </span>
            <span className="text-xs text-slate-400">line đang vệ sinh</span>
          </div>
          <p className="mt-1 text-xs text-slate-400 truncate">
            {activeCips.length > 0
              ? `${activeCips[0].lineId}: ${activeCips[0].status}`
              : 'Các line sẵn sàng phục vụ sản xuất'}
          </p>
        </div>
      </div>

      {/* 4 CORE METRIC CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Sản lượng hôm nay */}
        <div
          onClick={() => onNavigateToTab('more', 'progress')}
          className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 hover:border-slate-700 transition-colors cursor-pointer group space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              <span>Sản lượng thực tế</span>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-white transition-colors" />
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white font-mono tabular-nums">{totalActualTons.toFixed(1)}</span>
            <span className="text-xs text-slate-400 font-mono tabular-nums">/ {totalPlannedTons.toFixed(1)} Tấn</span>
          </div>

          <div className="flex items-center justify-between text-xs pt-2.5 border-t border-slate-800">
            <span className="text-slate-400">Hoàn thành:</span>
            <span
              className={`font-mono font-bold tabular-nums ${
                prodCompletionRate === null
                  ? 'text-slate-400'
                  : prodCompletionRate >= 80
                  ? 'text-emerald-400'
                  : 'text-amber-400'
              }`}
            >
              {prodCompletionRate !== null ? `${prodCompletionRate}%` : 'Chưa có kế hoạch'}
            </span>
          </div>
        </div>

        {/* Card 2: Loss Hôm Nay Theo Phạm Vi (Anti-Duplication Principle) */}
        <div
          onClick={() => onNavigateToTab('record', 'loss')}
          className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 hover:border-slate-700 transition-colors cursor-pointer group space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
              <ClockAlert className="h-4 w-4 text-rose-400" />
              <span>Loss quy đổi theo phạm vi</span>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-white transition-colors" />
          </div>

          <div className="grid grid-cols-3 gap-1.5 text-center">
            <div className="bg-slate-950/60 p-2 rounded border border-slate-800">
              <span className="text-[11px] text-sky-400 font-medium block">Nấu</span>
              <span className="text-base font-bold text-white font-mono tabular-nums">
                {scopeMetrics['Nấu'].totalConvertedLossMinutes}m
              </span>
            </div>
            <div className="bg-slate-950/60 p-2 rounded border border-slate-800">
              <span className="text-[11px] text-teal-400 font-medium block">Cấp tương</span>
              <span className="text-base font-bold text-white font-mono tabular-nums">
                {scopeMetrics['Cấp tương'].totalConvertedLossMinutes}m
              </span>
            </div>
            <div className="bg-slate-950/60 p-2 rounded border border-slate-800">
              <span className="text-[11px] text-amber-400 font-medium block">Đóng gói</span>
              <span className="text-base font-bold text-white font-mono tabular-nums">
                {scopeMetrics['Đóng gói'].totalConvertedLossMinutes}m
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-2.5 border-t border-slate-800 text-slate-400">
            <span>Nguyên tắc:</span>
            <span className="text-slate-300 font-medium">Tách biệt 3 phạm vi</span>
          </div>
        </div>

        {/* Card 3: Runtime hiện tại */}
        <div
          onClick={() => onNavigateToTab('runtime')}
          className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 hover:border-slate-700 transition-colors cursor-pointer group space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
              <Flame className="h-4 w-4 text-orange-400" />
              <span>Runtime vận hành</span>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-white transition-colors" />
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white font-mono tabular-nums">
              {runtimes.filter((r) => r.status === 'RUNNING').length}
            </span>
            <span className="text-xs text-slate-400">Line đang chạy</span>
          </div>

          <div className="flex items-center justify-between text-xs pt-2.5 border-t border-slate-800">
            <span className="text-slate-400">Mốc cao nhất:</span>
            <span className="text-orange-400 font-mono font-semibold tabular-nums">
              {highRuntimeLines.length > 0 ? `${highRuntimeLines[0].status.usagePercent}%` : '< 80%'}
            </span>
          </div>
        </div>

        {/* Card 4: CIP hiện tại */}
        <div
          onClick={() => onNavigateToTab('runtime')}
          className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 hover:border-slate-700 transition-colors cursor-pointer group space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
              <RotateCw className="h-4 w-4 text-teal-400" />
              <span>Trạng thái CIP</span>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-white transition-colors" />
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-teal-400 font-mono tabular-nums">
              {activeCips.length > 0 ? activeCips.length : '0'}
            </span>
            <span className="text-xs text-slate-400">trạm đang CIP</span>
          </div>

          <div className="flex items-center justify-between text-xs pt-2.5 border-t border-slate-800">
            <span className="text-slate-400">Sẵn sàng:</span>
            <span className="text-teal-300 font-medium">
              {activeCips.length === 0 ? 'Toàn bộ xưởng' : 'Một phần'}
            </span>
          </div>
        </div>
      </div>

      {/* SPECIFIC OPERATIONAL IMPACT STATS ROW */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 space-y-3.5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
            <Activity className="h-4 w-4 text-orange-400" />
            <span>Chỉ Số Vận Hành Trọng Yếu Hiện Trường</span>
          </div>
          <span className="text-xs text-slate-400">Truy nguyên từ timestamp & mức độ %</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-950/60 p-3.5 rounded-lg border border-slate-800 space-y-1">
            <span className="text-slate-400 block text-xs">Tổng giờ dừng nấu (100%)</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-rose-400 font-mono tabular-nums">
                {operationalKpiStats.stopCookMinutes}
              </span>
              <span className="text-slate-400 text-xs">phút</span>
            </div>
            <span className="text-[11px] text-slate-500">Dừng toàn bộ cụm nồi</span>
          </div>

          <div className="bg-slate-950/60 p-3.5 rounded-lg border border-slate-800 space-y-1">
            <span className="text-slate-400 block text-xs">Tổng giờ giảm năng lực nấu</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-amber-400 font-mono tabular-nums">
                {operationalKpiStats.reduceCookMinutes}
              </span>
              <span className="text-slate-400 text-xs">phút</span>
            </div>
            <span className="text-[11px] text-slate-500">Giảm tải công suất nấu</span>
          </div>

          <div className="bg-slate-950/60 p-3.5 rounded-lg border border-slate-800 space-y-1">
            <span className="text-slate-400 block text-xs">Tổng giờ dừng cấp tương ĐG</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-teal-400 font-mono tabular-nums">
                {operationalKpiStats.stopFeedPackingMinutes}
              </span>
              <span className="text-slate-400 text-xs">phút</span>
            </div>
            <span className="text-[11px] text-slate-500">Không tự suy ra Dừng ĐG</span>
          </div>

          <div className="bg-slate-950/60 p-3.5 rounded-lg border border-slate-800 space-y-1">
            <span className="text-slate-400 block text-xs">Thời gian ứ bồn làm nguội</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-purple-400 font-mono tabular-nums">
                {operationalKpiStats.coolingCongestionDuration}
              </span>
              <span className="text-slate-400 text-xs">phút tồn tại</span>
            </div>
            <span className="text-[11px] text-purple-300">
              {operationalKpiStats.hasInsufficientCongestion ? 'Có sự kiện Chưa đủ dữ liệu' : 'Đã xác nhận %'}
            </span>
          </div>
        </div>
      </div>

      {/* DUAL PARETO & TOP THIẾT BỊ BẤT THƯỜNG */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Dual Pareto Chart */}
        <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-slate-900/90 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3.5">
            <div>
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-orange-400" />
                Biểu đồ phân tích Pareto Shopfloor CBTO
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Hai góc nhìn độc lập: Nhóm sự cố gốc vs. Tổn thất vận hành thực tế (Loss quy đổi)
              </p>
            </div>

            {/* Segmented Control */}
            <div className="flex items-center gap-1 rounded-lg bg-slate-800/90 p-1 border border-slate-700/70 self-start sm:self-center">
              <button
                type="button"
                onClick={() => setParetoView('IMPACT')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  paretoView === 'IMPACT'
                    ? 'bg-orange-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                Pareto Ảnh hưởng
              </button>
              <button
                type="button"
                onClick={() => setParetoView('CAUSE')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  paretoView === 'CAUSE'
                    ? 'bg-orange-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                Pareto Nguyên nhân
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
