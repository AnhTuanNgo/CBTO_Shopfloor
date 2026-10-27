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
  ClipboardCheck,
  FileText,
  ArrowLeftRight,
  Activity,
  CheckCircle2,
  AlertCircle,
  Play,
  ArrowUpRight,
} from 'lucide-react';

interface SupervisorDashboardProps {
  onNavigateToTab: (tab: string, subTab?: string) => void;
}

export function SupervisorDashboard({ onNavigateToTab }: SupervisorDashboardProps) {
  const {
    selectedProductionDate,
    selectedShiftId,
    selectedLineId,
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
  const activeLine = lines.find((l) => l.id === selectedLineId);

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

  // Active line status calculation
  const activeLineRuntime = runtimes.find((r) => r.lineId === selectedLineId && r.status === 'RUNNING');
  const activeLineCip = cips.find(
    (c) => c.lineId === selectedLineId && (c.status === 'IN_CIP' || c.status === 'POST_CIP_SAMPLING')
  );
  const activeLineOngoingLoss = todayLogs.find((l) => l.lineId === selectedLineId && !l.endedAt);

  const activeLineStatus = useMemo(() => {
    if (activeLineOngoingLoss) {
      return {
        label: 'Đang Dừng Máy / Sự Cố',
        type: 'danger',
        desc: activeLineOngoingLoss.downtimeReason || activeLineOngoingLoss.lossGroup,
        color: 'text-red-700 bg-red-50 border-red-200',
        dot: 'bg-red-600',
      };
    }
    if (activeLineCip) {
      return {
        label: activeLineCip.status === 'IN_CIP' ? 'Đang Vệ Sinh CIP' : 'Đang Post-CIP Sampling',
        type: 'warning',
        desc: activeLineCip.note || 'Vệ sinh trạm',
        color: 'text-amber-800 bg-amber-50 border-amber-200',
        dot: 'bg-amber-500',
      };
    }
    if (activeLineRuntime) {
      return {
        label: 'Đang Chạy Sản Xuất',
        type: 'normal',
        desc: skus.find((s) => s.id === activeLineRuntime.skuId)?.name || 'SKU Đang Chạy',
        color: 'text-emerald-800 bg-emerald-50 border-emerald-200',
        dot: 'bg-emerald-600',
      };
    }
    return {
      label: 'Sẵn Sàng Sản Xuất',
      type: 'normal',
      desc: 'Line trống, sẵn sàng nhận mẻ mới',
      color: 'text-gray-700 bg-gray-50 border-gray-200',
      dot: 'bg-gray-400',
    };
  }, [activeLineOngoingLoss, activeLineCip, activeLineRuntime, skus]);

  // Operational Specific KPIs
  const operationalKpiStats = useMemo(() => {
    let stopCookMinutes = 0;
    let reduceCookMinutes = 0;
    let stopFeedPackingMinutes = 0;
    let coolingCongestionDuration = 0;
    let hasInsufficientCongestion = false;

    allTodayImpacts.forEach((imp) => {
      const m = calculateImpactMetrics(imp, nowMs);
      const minutes = m.convertedLossMinutes || 0;

      if (imp.impactType === 'STOP_COOK') {
        stopCookMinutes += minutes;
      } else if (imp.impactType === 'REDUCE_COOK_CAPACITY') {
        reduceCookMinutes += minutes;
      } else if (imp.impactType === 'STOP_FEED_PACKING') {
        stopFeedPackingMinutes += minutes;
      } else if (imp.impactType === 'COOLING_BUFFER_CONGESTION') {
        coolingCongestionDuration += m.durationMinutes;
        if (m.isInsufficientData) {
          hasInsufficientCongestion = true;
        }
      }
    });

    return {
      stopCookMinutes: Math.round(stopCookMinutes),
      reduceCookMinutes: Math.round(reduceCookMinutes),
      stopFeedPackingMinutes: Math.round(stopFeedPackingMinutes),
      coolingCongestionDuration: Math.round(coolingCongestionDuration),
      hasInsufficientCongestion,
    };
  }, [allTodayImpacts, nowMs]);

  // Pareto by Impact
  const paretoImpactData = useMemo(() => {
    const impactMap: { [key in ImpactType]?: number } = {};
    allTodayImpacts.forEach((imp) => {
      const m = calculateImpactMetrics(imp, nowMs);
      if (m.convertedLossMinutes && m.convertedLossMinutes > 0) {
        impactMap[imp.impactType] = (impactMap[imp.impactType] || 0) + m.convertedLossMinutes;
      }
    });

    const entries = Object.entries(impactMap)
      .map(([type, mins]) => ({
        type: type as ImpactType,
        label: getImpactLabel(type as ImpactType),
        minutes: Math.round(mins),
      }))
      .sort((a, b) => b.minutes - a.minutes);

    const totalMinutes = entries.reduce((acc, cur) => acc + cur.minutes, 0);
    let runningSum = 0;

    return entries.map((item) => {
      runningSum += item.minutes;
      const percent = totalMinutes > 0 ? +((item.minutes / totalMinutes) * 100).toFixed(1) : 0;
      const cumulativePercent = totalMinutes > 0 ? +((runningSum / totalMinutes) * 100).toFixed(1) : 0;
      return {
        ...item,
        percent,
        cumulativePercent,
      };
    });
  }, [allTodayImpacts, nowMs]);

  // Pareto by Cause Group
  const paretoCauseData = useMemo(() => {
    const causeMap: { [key in LossGroup]?: number } = {
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
      causeMap[l.lossGroup] = (causeMap[l.lossGroup] || 0) + (l.durationMinutes || 0);
    });

    const entries = Object.entries(causeMap)
      .map(([group, mins]) => ({
        group: group as LossGroup,
        label: group,
        minutes: mins,
      }))
      .filter((i) => i.minutes > 0)
      .sort((a, b) => b.minutes - a.minutes);

    const totalMinutes = entries.reduce((acc, cur) => acc + cur.minutes, 0);
    let runningSum = 0;

    return entries.map((item) => {
      runningSum += item.minutes;
      const percent = totalMinutes > 0 ? +((item.minutes / totalMinutes) * 100).toFixed(1) : 0;
      const cumulativePercent = totalMinutes > 0 ? +((runningSum / totalMinutes) * 100).toFixed(1) : 0;
      return {
        ...item,
        percent,
        cumulativePercent,
      };
    });
  }, [todayLogs]);

  // Top equipment failures
  const topFailureEquipments = useMemo(() => {
    const countMap: { [eqId: string]: { count: number; name: string; lineCode: string } } = {};

    abnormalLogs.forEach((a) => {
      const eqId = a.equipmentId;
      if (!countMap[eqId]) {
        const eq = equipments.find((e) => e.id === eqId);
        const line = lines.find((l) => l.id === a.lineId);
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
      {/* 1. TECHCOMBANK-STYLE HERO CARD: BẢNG ĐIỀU HÀNH SHOPFLOOR */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-white via-red-50/40 to-rose-50/30 border border-gray-200/90 p-5 sm:p-7 shadow-xs">
        {/* Subtle decorative background watermarks */}
        <div className="absolute right-0 top-0 -mt-8 -mr-8 h-48 w-48 rounded-full bg-red-100/30 blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-5">
          {/* Top Line of Hero: Current active Line & Operating Status */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Dây Chuyền Trọng Điểm:
                </span>
                <span className="text-base font-extrabold text-gray-900">
                  {activeLine?.name} ({activeLine?.code})
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Ngày SX: <strong className="text-gray-800">{formatDateVN(selectedProductionDate)}</strong> · Ca làm việc:{' '}
                <strong className="text-gray-800">{selectedShiftId}</strong>
              </p>
            </div>

            {/* Operating status badge */}
            <div
              className={`inline-flex items-center gap-2 rounded-2xl border px-3.5 py-1.5 text-xs font-bold shadow-2xs self-start sm:self-center ${activeLineStatus.color}`}
            >
              <span className={`h-2.5 w-2.5 rounded-full ${activeLineStatus.dot} animate-pulse`} />
              <span>{activeLineStatus.label}</span>
              <span className="text-gray-400">·</span>
              <span className="font-medium text-gray-600 truncate max-w-[160px] sm:max-w-[200px]">
                {activeLineStatus.desc}
              </span>
            </div>
          </div>

          {/* Core Numbers Banner: Sản lượng & 3 Phạm Vi Loss */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Sản Lượng */}
            <div className="rounded-2xl bg-white p-4 border border-gray-200/70 shadow-2xs">
              <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
                <span>Sản lượng thực hiện</span>
                <TrendingUp className="h-4 w-4 text-[#E31837]" />
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-3xl font-black text-gray-900 font-mono tabular-nums">
                  {totalActualTons.toFixed(1)}
                </span>
                <span className="text-xs text-gray-500 font-medium">/ {totalPlannedTons.toFixed(1)} Tấn</span>
              </div>
              <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
                <span className="text-gray-500">Hoàn thành:</span>
                <span
                  className={`font-mono font-bold tabular-nums ${
                    prodCompletionRate === null
                      ? 'text-gray-400'
                      : prodCompletionRate >= 80
                      ? 'text-[#16865B]'
                      : 'text-[#D97706]'
                  }`}
                >
                  {prodCompletionRate !== null ? `${prodCompletionRate}%` : 'Chưa có kế hoạch'}
                </span>
              </div>
            </div>

            {/* Loss Nấu */}
            <div className="rounded-2xl bg-white p-4 border border-gray-200/70 shadow-2xs">
              <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
                <span>Loss Phạm vi Nấu</span>
                <ClockAlert className="h-4 w-4 text-rose-500" />
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-black text-rose-600 font-mono tabular-nums">
                  {scopeMetrics['Nấu'].totalConvertedLossMinutes}
                </span>
                <span className="text-xs text-gray-500 font-medium">phút quy đổi</span>
              </div>
              <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-500 flex items-center justify-between">
                <span>Trạng thái:</span>
                <span className="font-semibold text-gray-800">
                  {scopeMetrics['Nấu'].totalConvertedLossMinutes > 0 ? 'Có dừng/giảm nấu' : 'Bình thường'}
                </span>
              </div>
            </div>

            {/* Loss Cấp tương */}
            <div className="rounded-2xl bg-white p-4 border border-gray-200/70 shadow-2xs">
              <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
                <span>Loss Cấp Tương ĐG</span>
                <RotateCw className="h-4 w-4 text-teal-600" />
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-black text-teal-700 font-mono tabular-nums">
                  {scopeMetrics['Cấp tương'].totalConvertedLossMinutes}
                </span>
                <span className="text-xs text-gray-500 font-medium">phút quy đổi</span>
              </div>
              <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-500 flex items-center justify-between">
                <span>Tương xuống ĐG:</span>
                <span className="font-semibold text-gray-800">
                  {scopeMetrics['Cấp tương'].totalConvertedLossMinutes > 0 ? 'Dừng cấp tương' : 'Thông suốt'}
                </span>
              </div>
            </div>

            {/* Loss Đóng gói */}
            <div className="rounded-2xl bg-white p-4 border border-gray-200/70 shadow-2xs">
              <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
                <span>Loss Phạm vi Đóng Gói</span>
                <Layers className="h-4 w-4 text-amber-600" />
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-black text-amber-700 font-mono tabular-nums">
                  {scopeMetrics['Đóng gói'].totalConvertedLossMinutes}
                </span>
                <span className="text-xs text-gray-500 font-medium">phút quy đổi</span>
              </div>
              <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-500 flex items-center justify-between">
                <span>Độc lập:</span>
                <span className="font-semibold text-gray-800">Không cộng gộp sai</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. THAO TÁC NHANH (TECHCOMBANK QUICK ACTIONS BAR) */}
      <div className="rounded-3xl bg-white border border-gray-200/80 p-5 shadow-xs">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-700">
            Thao Tác Nhanh Hiện Trường
          </span>
          <span className="text-[11px] text-gray-400">Chạm để mở trực tiếp</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {/* Quick Action 1: Ghi nhận Loss */}
          <button
            onClick={() => onNavigateToTab('record', 'loss')}
            className="flex flex-col items-center justify-center p-3.5 rounded-2xl border border-gray-200/70 bg-gray-50/50 hover:bg-red-50/60 hover:border-red-200 transition-all cursor-pointer group text-center min-h-[96px]"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-[#E31837] group-hover:scale-105 transition-transform shadow-xs">
              <ClockAlert className="h-6 w-6" />
            </div>
            <span className="mt-2.5 text-xs font-bold text-gray-800 group-hover:text-[#E31837] transition-colors leading-tight">
              Ghi nhận Loss
            </span>
            <span className="text-[10px] text-gray-400 mt-0.5">Dừng máy & ảnh hưởng</span>
          </button>

          {/* Quick Action 2: Kiểm tra AM */}
          <button
            onClick={() => onNavigateToTab('record', 'am')}
            className="flex flex-col items-center justify-center p-3.5 rounded-2xl border border-gray-200/70 bg-gray-50/50 hover:bg-teal-50/60 hover:border-teal-200 transition-all cursor-pointer group text-center min-h-[96px]"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-100 text-teal-700 group-hover:scale-105 transition-transform shadow-xs">
              <ClipboardCheck className="h-6 w-6" />
            </div>
            <span className="mt-2.5 text-xs font-bold text-gray-800 group-hover:text-teal-700 transition-colors leading-tight">
              Kiểm tra AM
            </span>
            <span className="text-[10px] text-gray-400 mt-0.5">Checklist đầu ca</span>
          </button>

          {/* Quick Action 3: Báo Bất thường */}
          <button
            onClick={() => onNavigateToTab('record', 'abnormal')}
            className="flex flex-col items-center justify-center p-3.5 rounded-2xl border border-gray-200/70 bg-gray-50/50 hover:bg-amber-50/60 hover:border-amber-200 transition-all cursor-pointer group text-center min-h-[96px]"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 group-hover:scale-105 transition-transform shadow-xs">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <span className="mt-2.5 text-xs font-bold text-gray-800 group-hover:text-amber-700 transition-colors leading-tight">
              Báo Bất thường
            </span>
            <span className="text-[10px] text-gray-400 mt-0.5">Sự cố & hỏng hóc</span>
          </button>

          {/* Quick Action 4: Nhật ký vận hành */}
          <button
            onClick={() => onNavigateToTab('record', 'log')}
            className="flex flex-col items-center justify-center p-3.5 rounded-2xl border border-gray-200/70 bg-gray-50/50 hover:bg-purple-50/60 hover:border-purple-200 transition-all cursor-pointer group text-center min-h-[96px]"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-100 text-purple-700 group-hover:scale-105 transition-transform shadow-xs">
              <FileText className="h-6 w-6" />
            </div>
            <span className="mt-2.5 text-xs font-bold text-gray-800 group-hover:text-purple-700 transition-colors leading-tight">
              Nhật ký vận hành
            </span>
            <span className="text-[10px] text-gray-400 mt-0.5">Timeline sự kiện</span>
          </button>

          {/* Quick Action 5: Bàn giao ca */}
          <button
            onClick={() => onNavigateToTab('handover')}
            className="flex flex-col items-center justify-center p-3.5 rounded-2xl border border-gray-200/70 bg-gray-50/50 hover:bg-emerald-50/60 hover:border-emerald-200 transition-all cursor-pointer group text-center min-h-[96px]"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 group-hover:scale-105 transition-transform shadow-xs">
              <ArrowLeftRight className="h-6 w-6" />
            </div>
            <span className="mt-2.5 text-xs font-bold text-gray-800 group-hover:text-emerald-700 transition-colors leading-tight">
              Bàn giao ca
            </span>
            <span className="text-[10px] text-gray-400 mt-0.5">Biên bản ký 2 chiều</span>
          </button>
        </div>
      </div>

      {/* 3. VIỆC CẦN CHÚ Ý HIỆN TRƯỜNG (ATTENTION ALERTS) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
            <AlertCircle className="h-4 w-4 text-[#E31837]" />
            Việc Cần Chú Ý & Xử Lý Hiện Trường
          </span>
          <span className="text-[11px] text-gray-400">Dựa trên dữ liệu thực tế đang ghi nhận</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Alert 1: Pending AM */}
          <div
            onClick={() => onNavigateToTab('record', 'am')}
            className={`rounded-2xl border p-4 cursor-pointer transition-all shadow-2xs ${
              pendingAmEquipments.length > 0
                ? 'border-red-200 bg-red-50/40 hover:bg-red-50/70'
                : 'border-gray-200 bg-white hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-700 font-bold">Bảo trì AM ca này</span>
              <span className="text-[10px] text-gray-400 font-mono">Đầu ca</span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-rose-600 font-mono tabular-nums">
                {pendingAmEquipments.length}
              </span>
              <span className="text-xs text-gray-500 font-medium">thiết bị chưa kiểm</span>
            </div>
            <p className="mt-1 text-xs text-gray-500 truncate">
              {pendingAmEquipments.length > 0
                ? `${pendingAmEquipments[0].lineCode}: ${pendingAmEquipments[0].eqName}`
                : '✓ Toàn bộ thiết bị đã hoàn tất'}
            </p>
          </div>

          {/* Alert 2: High Runtime > 90% */}
          <div
            onClick={() => onNavigateToTab('runtime')}
            className={`rounded-2xl border p-4 cursor-pointer transition-all shadow-2xs ${
              highRuntimeLines.length > 0
                ? 'border-amber-200 bg-amber-50/40 hover:bg-amber-50/70'
                : 'border-gray-200 bg-white hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-700 font-bold">Cảnh báo Runtime</span>
              <span className="text-[10px] text-gray-400 font-mono">Ngưỡng &gt; 90%</span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-amber-600 font-mono tabular-nums">
                {highRuntimeLines.length}
              </span>
              <span className="text-xs text-gray-500 font-medium">line cận hạn CIP</span>
            </div>
            <p className="mt-1 text-xs text-gray-500 truncate">
              {highRuntimeLines.length > 0
                ? `${highRuntimeLines[0].line?.code}: còn ${highRuntimeLines[0].status.remainingHours}h`
                : '✓ Các line đều dưới ngưỡng 90%'}
            </p>
          </div>

          {/* Alert 3: Unread Abnormalities */}
          <div
            onClick={() => onNavigateToTab('record', 'abnormal')}
            className={`rounded-2xl border p-4 cursor-pointer transition-all shadow-2xs ${
              unreadAbnormals.length > 0
                ? 'border-amber-200 bg-amber-50/40 hover:bg-amber-50/70'
                : 'border-gray-200 bg-white hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-700 font-bold">Bất thường hiện trường</span>
              <span className="text-[10px] text-gray-400 font-mono">Chưa rà soát</span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-amber-600 font-mono tabular-nums">
                {unreadAbnormals.length}
              </span>
              <span className="text-xs text-gray-500 font-medium">sự việc ghi nhận</span>
            </div>
            <p className="mt-1 text-xs text-gray-500 truncate">
              {unreadAbnormals.length > 0 ? unreadAbnormals[0].description : '✓ Không có bất thường tồn đọng'}
            </p>
          </div>

          {/* Alert 4: Đang CIP / Post-CIP */}
          <div
            onClick={() => onNavigateToTab('runtime')}
            className={`rounded-2xl border p-4 cursor-pointer transition-all shadow-2xs ${
              activeCips.length > 0
                ? 'border-teal-200 bg-teal-50/40 hover:bg-teal-50/70'
                : 'border-gray-200 bg-white hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-700 font-bold">Tiến trình CIP / Vệ sinh</span>
              <span className="text-[10px] text-gray-400 font-mono">Trạm CIP</span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-teal-700 font-mono tabular-nums">
                {activeCips.length}
              </span>
              <span className="text-xs text-gray-500 font-medium">line đang vệ sinh</span>
            </div>
            <p className="mt-1 text-xs text-gray-500 truncate">
              {activeCips.length > 0
                ? `${activeCips[0].lineId}: ${activeCips[0].status}`
                : '✓ Các line sẵn sàng chạy'}
            </p>
          </div>
        </div>
      </div>

      {/* 4. CHỈ SỐ VẬN HÀNH TRỌNG YẾU HIỆN TRƯỜNG */}
      <div className="rounded-3xl bg-white border border-gray-200/80 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-800 uppercase tracking-wider">
            <Activity className="h-4 w-4 text-[#E31837]" />
            <span>Phân Rã Ảnh Hưởng Vận Hành Cụ Thể (CBTO Fact)</span>
          </div>
          <span className="text-[11px] text-gray-400 hidden sm:inline">
            Tách biệt nguyên nhân gốc vs ảnh hưởng thực tế
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 text-xs">
          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200/70 space-y-1">
            <span className="text-gray-500 block text-xs font-medium">Dừng nấu hoàn toàn (100%)</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-rose-600 font-mono tabular-nums">
                {operationalKpiStats.stopCookMinutes}
              </span>
              <span className="text-gray-500 text-xs">phút</span>
            </div>
            <span className="text-[11px] text-gray-400 block">Dừng toàn bộ cụm nồi</span>
          </div>

          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200/70 space-y-1">
            <span className="text-gray-500 block text-xs font-medium">Giảm năng lực nấu</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-amber-600 font-mono tabular-nums">
                {operationalKpiStats.reduceCookMinutes}
              </span>
              <span className="text-gray-500 text-xs">phút</span>
            </div>
            <span className="text-[11px] text-gray-400 block">Giảm tải công suất nấu</span>
          </div>

          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200/70 space-y-1">
            <span className="text-gray-500 block text-xs font-medium">Dừng cấp tương cho ĐG</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-teal-700 font-mono tabular-nums">
                {operationalKpiStats.stopFeedPackingMinutes}
              </span>
              <span className="text-gray-500 text-xs">phút</span>
            </div>
            <span className="text-[11px] text-gray-400 block">Không tự suy ra Dừng ĐG</span>
          </div>

          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200/70 space-y-1">
            <span className="text-gray-500 block text-xs font-medium">Thời gian ứ bồn làm nguội</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-purple-700 font-mono tabular-nums">
                {operationalKpiStats.coolingCongestionDuration}
              </span>
              <span className="text-gray-500 text-xs">phút</span>
            </div>
            <span className="text-[11px] text-purple-700 font-medium block">
              {operationalKpiStats.hasInsufficientCongestion ? 'Có sự kiện Chưa đủ dữ liệu' : 'Đã xác nhận %'}
            </span>
          </div>
        </div>
      </div>

      {/* 5. DUAL PARETO & TOP THIẾT BỊ BẤT THƯỜNG */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Dual Pareto Chart */}
        <div className="lg:col-span-2 rounded-3xl bg-white border border-gray-200/80 p-5 sm:p-6 space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3.5">
            <div>
              <h3 className="font-extrabold text-gray-900 text-sm flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-[#E31837]" />
                Biểu Đồ Phân Tích Pareto Shopfloor CBTO
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Hai góc nhìn: Phân bổ tổn thất vận hành (Loss quy đổi) vs. Nhóm sự cố gốc
              </p>
            </div>

            {/* Segmented Control */}
            <div className="flex items-center gap-1 rounded-xl bg-gray-100 p-1 border border-gray-200/60 self-start sm:self-center">
              <button
                type="button"
                onClick={() => setParetoView('IMPACT')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  paretoView === 'IMPACT'
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                Pareto Ảnh hưởng
              </button>
              <button
                type="button"
                onClick={() => setParetoView('CAUSE')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  paretoView === 'CAUSE'
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-gray-500 hover:text-gray-800'
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
                <div className="p-8 text-center text-gray-400 text-xs italic">
                  Chưa có dữ liệu tổn thất vận hành quy đổi trong ngày này.
                </div>
              ) : (
                paretoImpactData.map((item) => (
                  <div key={item.label} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-gray-800 truncate pr-2">{item.label}</span>
                      <div className="flex items-center gap-3 text-right font-mono shrink-0">
                        <span className="text-rose-600 font-bold">{item.minutes}m quy đổi</span>
                        <span className="text-gray-500 text-[11px] w-12">{item.percent}%</span>
                        <span className="text-amber-600 font-bold text-[11px] w-16">
                          (LK: {item.cumulativePercent}%)
                        </span>
                      </div>
                    </div>

                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden flex">
                      <div
                        className="h-full bg-[#E31837] rounded-full transition-all duration-500"
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
                <div className="p-8 text-center text-gray-400 text-xs italic">
                  Chưa có sự cố nào được ghi nhận trong ngày này.
                </div>
              ) : (
                paretoCauseData.map((item) => (
                  <div key={item.label} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-gray-800 w-32 truncate">{item.label}</span>
                      <div className="flex items-center gap-3 text-right font-mono shrink-0">
                        <span className="text-gray-800 font-bold">{item.minutes}m sự cố</span>
                        <span className="text-gray-500 text-[11px] w-12">{item.percent}%</span>
                        <span className="text-amber-600 font-bold text-[11px] w-16">
                          (LK: {item.cumulativePercent}%)
                        </span>
                      </div>
                    </div>

                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden flex">
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

          <div className="border-t border-gray-100 pt-3 text-[11px] text-gray-500 flex items-center justify-between">
            <span>
              {paretoView === 'IMPACT'
                ? 'Đang xem: Phân bổ tổn thất thực tế (Loss quy đổi) để tìm điểm nghẽn nghiêm trọng nhất.'
                : 'Đang xem: Phân bổ thời gian sự cố gốc (9 nhóm MVP) để hỗ trợ phân tích nguyên nhân.'}
            </span>
            <button
              onClick={() => onNavigateToTab('more', 'kpi')}
              className="text-xs text-[#E31837] hover:underline font-bold shrink-0 cursor-pointer"
            >
              Mở báo cáo KPI chi tiết →
            </button>
          </div>
        </div>

        {/* Top Thiết bị Bất thường */}
        <div className="rounded-3xl bg-white border border-gray-200/80 p-5 sm:p-6 space-y-4 shadow-xs">
          <div className="border-b border-gray-100 pb-3">
            <h3 className="font-extrabold text-gray-900 text-sm flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-amber-600" />
              Top Thiết Bị Phát Hiện Bất Thường
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">Tần suất xuất hiện từ kiểm tra AM & hiện trường</p>
          </div>

          <div className="space-y-3">
            {topFailureEquipments.length === 0 ? (
              <div className="text-xs text-gray-400 py-8 text-center">Chưa có phát hiện bất thường nào</div>
            ) : (
              topFailureEquipments.map((eq, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl bg-gray-50 p-3.5 border border-gray-200/60 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white font-bold text-gray-700 font-mono text-[11px] shadow-2xs border border-gray-200">
                      #{idx + 1}
                    </span>
                    <div>
                      <div className="font-bold text-gray-900">{eq.name}</div>
                      <div className="text-[10px] text-gray-500">Line: {eq.lineCode}</div>
                    </div>
                  </div>

                  <span className="rounded-lg bg-amber-50 border border-amber-200 px-2.5 py-1 text-xs font-bold text-amber-700 font-mono">
                    {eq.count} lần
                  </span>
                </div>
              ))
            )}
          </div>

          <button
            onClick={() => onNavigateToTab('record', 'abnormal')}
            className="w-full rounded-xl bg-gray-50 border border-gray-200 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors cursor-pointer"
          >
            Xem toàn bộ danh sách bất thường →
          </button>
        </div>
      </div>
    </div>
  );
}
