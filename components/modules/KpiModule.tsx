'use client';

import React, { useState, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import {
  formatDateVN,
  calculateImpactMetrics,
  calculateScopeLossMetrics,
  getImpactLabel,
} from '@/lib/date-utils';
import { useCurrentTimestamp } from '@/hooks/use-current-time';
import { LossGroup, ImpactType } from '@/lib/types';
import {
  BarChart3,
  ClipboardCheck,
  ClockAlert,
  Flame,
  RotateCw,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Activity,
} from 'lucide-react';

export function KpiModule() {
  const {
    selectedProductionDate,
    lines,
    equipments,
    amChecklists,
    lossLogs,
    runtimes,
    cips,
  } = useAppStore();

  const nowMs = useCurrentTimestamp();
  const [paretoTableMode, setParetoTableMode] = useState<'IMPACT' | 'CAUSE'>('IMPACT');

  // 1. KPI AM
  const totalEquipments = equipments.length;
  const amCompletedCount = amChecklists.filter((c) => c.status === 'COMPLETED').length;
  const amComplianceRate = totalEquipments > 0 ? +((amCompletedCount / totalEquipments) * 100).toFixed(1) : 0;

  let totalPass = 0;
  let totalPassTag = 0;
  let totalFail = 0;
  amChecklists.forEach((c) => {
    c.items.forEach((i) => {
      if (i.result === 'PASS') totalPass++;
      if (i.result === 'PASS_TAG') totalPassTag++;
      if (i.result === 'FAIL') totalFail++;
    });
  });

  // 2. KPI Loss: Scope-separated & Specific Operational Impacts
  const todayLogs = useMemo(() => {
    return lossLogs.filter((l) => l.productionDate === selectedProductionDate);
  }, [lossLogs, selectedProductionDate]);

  const allTodayImpacts = useMemo(() => {
    return todayLogs.flatMap((l) => l.impacts || []);
  }, [todayLogs]);

  const scopeMetrics = useMemo(() => {
    return calculateScopeLossMetrics(allTodayImpacts, nowMs);
  }, [allTodayImpacts, nowMs]);

  // Operational metrics
  const opStats = useMemo(() => {
    let stopCook = 0;
    let reduceCook = 0;
    let stopFeed = 0;
    let congestionDuration = 0;

    allTodayImpacts.forEach((imp) => {
      const m = calculateImpactMetrics(imp, nowMs);
      if (imp.impactType === 'STOP_COOK') stopCook += m.durationMinutes;
      if (imp.impactType === 'REDUCE_COOK_CAPACITY') reduceCook += m.durationMinutes;
      if (imp.impactType === 'STOP_FEED_PACKING') stopFeed += m.durationMinutes;
      if (imp.impactType === 'COOLING_BUFFER_CONGESTION') congestionDuration += m.durationMinutes;
    });

    return { stopCook, reduceCook, stopFeed, congestionDuration };
  }, [allTodayImpacts, nowMs]);

  // Pareto Table 1: Ảnh hưởng vận hành (Loss quy đổi)
  const paretoImpactTable = useMemo(() => {
    const map: Partial<Record<ImpactType, number>> = {};

    allTodayImpacts.forEach((imp) => {
      if (imp.impactType === 'NONE') return;
      const m = calculateImpactMetrics(imp, nowMs);
      if (m.convertedLossMinutes !== null && m.convertedLossMinutes > 0) {
        map[imp.impactType] = (map[imp.impactType] || 0) + m.convertedLossMinutes;
      }
    });

    const list = Object.entries(map).map(([t, m]) => ({
      name: getImpactLabel(t as ImpactType),
      minutes: m || 0,
      scope:
        t === 'STOP_COOK' || t === 'REDUCE_COOK_CAPACITY'
          ? 'Nấu'
          : t === 'STOP_FEED_PACKING'
          ? 'Cấp tương'
          : t === 'STOP_PACKING' || t === 'REDUCE_PACKING_SPEED'
          ? 'Đóng gói'
          : 'Buffer',
    }));

    list.sort((a, b) => b.minutes - a.minutes);
    const grand = list.reduce((acc, i) => acc + i.minutes, 0);

    return list.reduce<Array<{
      name: string;
      scope: string;
      minutes: number;
      rate: number;
      cumRate: number;
    }>>((acc, item) => {
      const prevMinutes = acc.reduce((sum, x) => sum + x.minutes, 0);
      const cumMinutes = prevMinutes + item.minutes;
      const rate = grand > 0 ? +((item.minutes / grand) * 100).toFixed(1) : 0;
      const cumRate = grand > 0 ? +((cumMinutes / grand) * 100).toFixed(1) : 0;
      acc.push({
        ...item,
        rate,
        cumRate,
      });
      return acc;
    }, []);
  }, [allTodayImpacts, nowMs]);

  // Pareto Table 2: 9 Nhóm Nguyên nhân MVP (Thời gian sự cố gốc)
  const paretoCauseTable = useMemo(() => {
    const map: Record<LossGroup, number> = {
      'Cơ khí': 0,
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
      map[l.lossGroup] = (map[l.lossGroup] || 0) + Math.max(0, Math.round((e - s) / 60000));
    });

    const list = Object.entries(map).map(([g, m]) => ({ name: g, minutes: m, scope: 'Toàn xưởng' }));
    list.sort((a, b) => b.minutes - a.minutes);
    const grand = list.reduce((acc, i) => acc + i.minutes, 0);

    return list.reduce<Array<{
      name: string;
      scope: string;
      minutes: number;
      rate: number;
      cumRate: number;
    }>>((acc, item) => {
      const prevMinutes = acc.reduce((sum, x) => sum + x.minutes, 0);
      const cumMinutes = prevMinutes + item.minutes;
      const rate = grand > 0 ? +((item.minutes / grand) * 100).toFixed(1) : 0;
      const cumRate = grand > 0 ? +((cumMinutes / grand) * 100).toFixed(1) : 0;
      acc.push({
        ...item,
        rate,
        cumRate,
      });
      return acc;
    }, []);
  }, [todayLogs, nowMs]);

  // 3. KPI Runtime
  const completedRuns = runtimes.filter((r) => r.status === 'COMPLETED' && r.stoppedAt);
  const avgCompletedRuntimeHours = useMemo(() => {
    if (completedRuns.length === 0) return null;
    const totalHours = completedRuns.reduce((acc, r) => {
      const s = new Date(r.startedAt).getTime();
      const e = new Date(r.stoppedAt!).getTime();
      return acc + (e - s) / 3600000;
    }, 0);
    return +(totalHours / completedRuns.length).toFixed(1);
  }, [completedRuns]);

  const reached90Runs = useMemo(() => {
    return runtimes.filter((r) => {
      const s = new Date(r.startedAt).getTime();
      const e = r.stoppedAt ? new Date(r.stoppedAt).getTime() : (nowMs || s);
      const elapsed = (e - s) / 3600000;
      return (elapsed / r.limitHoursSnapshot) >= 0.9;
    });
  }, [runtimes, nowMs]);

  // 4. KPI CIP
  const completedCips = cips.filter((c) => c.status === 'READY');
  const onTimeCipCount = cips.filter((c) => {
    const rt = runtimes.find((r) => r.id === c.runtimeId);
    if (!rt || !rt.stoppedAt) return true;
    const elapsed = (new Date(rt.stoppedAt).getTime() - new Date(rt.startedAt).getTime()) / 3600000;
    return elapsed <= rt.limitHoursSnapshot;
  }).length;

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="rounded-2xl border border-gray-200/80 bg-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-[#E31837]">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#202124]">Chỉ Số Hiệu Suất Shopfloor (KPI)</h2>
              <p className="mt-0.5 text-xs text-gray-500">
                Tổng hợp dữ liệu sản xuất ngày: <strong>{formatDateVN(selectedProductionDate)}</strong> (Mốc đổi ngày 06:00 sáng)
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-700 font-bold border border-gray-200">
            Loss theo 3 phạm vi độc lập · Không cộng trùng
          </span>
        </div>
      </div>

      {/* 4 Cards KPI */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* AM KPI */}
        <div className="rounded-3xl border border-gray-200/80 bg-white p-5 space-y-3.5 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-bold text-[#16865B] border-b border-gray-100 pb-2.5">
            <ClipboardCheck className="h-4 w-4" />
            <span>KPI BẢO TRÌ TỰ QUẢN (AM)</span>
          </div>

          <div>
            <span className="text-[11px] text-gray-400 font-medium">Tỷ lệ hoàn thành checklist ca</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-3xl font-black text-[#202124] font-mono">{amComplianceRate}%</span>
              <span className="text-xs text-gray-500">({amCompletedCount}/{totalEquipments} máy)</span>
            </div>
          </div>

          <div className="space-y-1.5 text-xs pt-1 border-t border-gray-100">
            <div className="flex justify-between text-gray-600">
              <span>Đạt chuẩn (Pass):</span>
              <span className="text-[#16865B] font-bold font-mono">{totalPass}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Pass Tag (Theo dõi):</span>
              <span className="text-[#D97706] font-bold font-mono">{totalPassTag}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Bất thường (Fail):</span>
              <span className="text-[#C62828] font-bold font-mono">{totalFail}</span>
            </div>
          </div>
        </div>

        {/* Loss KPI - Scope-separated */}
        <div className="rounded-3xl border border-gray-200/80 bg-white p-5 space-y-3.5 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-bold text-[#E31837] border-b border-gray-100 pb-2.5">
            <ClockAlert className="h-4 w-4" />
            <span>KPI TỔN THẤT (3 PHẠM VI)</span>
          </div>

          <div className="grid grid-cols-3 gap-1.5 text-center bg-gray-50 p-2.5 rounded-2xl border border-gray-100">
            <div>
              <span className="text-[10px] text-gray-500 block font-bold">Nấu</span>
              <span className="text-base font-black text-[#202124] font-mono">
                {scopeMetrics['Nấu'].totalConvertedLossMinutes}m
              </span>
            </div>
            <div>
              <span className="text-[10px] text-gray-500 block font-bold">Cấp tương</span>
              <span className="text-base font-black text-[#202124] font-mono">
                {scopeMetrics['Cấp tương'].totalConvertedLossMinutes}m
              </span>
            </div>
            <div>
              <span className="text-[10px] text-gray-500 block font-bold">Đóng gói</span>
              <span className="text-base font-black text-[#202124] font-mono">
                {scopeMetrics['Đóng gói'].totalConvertedLossMinutes}m
              </span>
            </div>
          </div>

          <div className="space-y-1.5 text-xs pt-1 border-t border-gray-100">
            <div className="flex justify-between text-gray-600">
              <span>Dừng nấu (100%):</span>
              <span className="text-[#C62828] font-bold font-mono">{opStats.stopCook}m</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Giảm năng lực nấu:</span>
              <span className="text-[#D97706] font-bold font-mono">{opStats.reduceCook}m</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Dừng cấp tương ĐG:</span>
              <span className="text-blue-700 font-bold font-mono">{opStats.stopFeed}m</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Ứ bồn làm nguội:</span>
              <span className="text-purple-700 font-bold font-mono">{opStats.congestionDuration}m</span>
            </div>
          </div>
        </div>

        {/* Runtime KPI */}
        <div className="rounded-3xl border border-gray-200/80 bg-white p-5 space-y-3.5 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-bold text-[#E31837] border-b border-gray-100 pb-2.5">
            <Flame className="h-4 w-4" />
            <span>KPI RUNTIME CHU KỲ</span>
          </div>

          <div>
            <span className="text-[11px] text-gray-400 font-medium">Runtime TB các phiên đã chốt</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black text-[#202124] font-mono">
                {avgCompletedRuntimeHours !== null ? `${avgCompletedRuntimeHours}h` : 'Chưa có phiên chốt'}
              </span>
            </div>
          </div>

          <div className="space-y-1.5 text-xs pt-1 border-t border-gray-100">
            <div className="flex justify-between text-gray-600">
              <span>Phiên từng đạt &ge; 90%:</span>
              <span className="text-[#D97706] font-bold font-mono">{reached90Runs.length} phiên</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Phiên đang chạy:</span>
              <span className="text-[#16865B] font-bold font-mono">
                {runtimes.filter((r) => r.status === 'RUNNING').length}
              </span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Đếm phiên:</span>
              <span className="text-gray-400 font-medium">Mỗi phiên 1 lần</span>
            </div>
          </div>
        </div>

        {/* CIP KPI */}
        <div className="rounded-3xl border border-gray-200/80 bg-white p-5 space-y-3.5 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-bold text-blue-700 border-b border-gray-100 pb-2.5">
            <RotateCw className="h-4 w-4" />
            <span>KPI VỆ SINH ĐỊNH KỲ (CIP)</span>
          </div>

          <div>
            <span className="text-[11px] text-gray-400 font-medium">Số chu trình CIP hoàn tất</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black text-blue-700 font-mono">{completedCips.length}</span>
              <span className="text-xs text-gray-500">chu trình đạt</span>
            </div>
          </div>

          <div className="space-y-1.5 text-xs pt-1 border-t border-gray-100">
            <div className="flex justify-between text-gray-600">
              <span>Chuyển sang CIP đúng hạn:</span>
              <span className="text-[#16865B] font-bold font-mono">{onTimeCipCount}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Đang trong giai đoạn:</span>
              <span className="text-[#D97706] font-bold font-mono">
                {cips.filter((c) => c.status === 'POST_CIP_SAMPLING').length} Post-CIP
              </span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Quy ước:</span>
              <span className="text-gray-400 font-medium">Post-CIP 60m đếm rời</span>
            </div>
          </div>
        </div>
      </div>

      {/* Dual Pareto Table Section */}
      <div className="rounded-3xl border border-gray-200/80 bg-white shadow-xs overflow-hidden">
        <div className="border-b border-gray-100 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-[#202124] text-sm">
              {paretoTableMode === 'IMPACT'
                ? 'Bảng Dữ Liệu Pareto Ảnh Hưởng Vận Hành Thực Tế (Loss Quy Đổi)'
                : 'Bảng Dữ Liệu Pareto 9 Nhóm Nguyên Nhân MVP'}
            </h3>
            <p className="text-xs text-gray-500">
              {paretoTableMode === 'IMPACT'
                ? 'Phân tích tổn thất quy đổi theo từng công đoạn và loại ảnh hưởng'
                : 'Phân tích thời lượng sự cố gốc theo 9 nhóm chính thức CBTO'}
            </p>
          </div>

          <div className="flex items-center gap-1.5 rounded-2xl bg-gray-100 p-1 border border-gray-200">
            <button
              type="button"
              onClick={() => setParetoTableMode('IMPACT')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                paretoTableMode === 'IMPACT'
                  ? 'bg-white text-[#202124] shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Góc nhìn Ảnh hưởng
            </button>
            <button
              type="button"
              onClick={() => setParetoTableMode('CAUSE')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                paretoTableMode === 'CAUSE'
                  ? 'bg-white text-[#202124] shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Góc nhìn Nguyên nhân
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-700">
            <thead className="border-b border-gray-100 bg-gray-50/70 text-gray-500 font-semibold">
              <tr>
                <th className="px-5 py-3">Thứ hạng</th>
                <th className="px-5 py-3">
                  {paretoTableMode === 'IMPACT' ? 'Loại Ảnh Hưởng Vận Hành' : 'Nhóm Nguyên Nhân'}
                </th>
                <th className="px-5 py-3">Phạm vi</th>
                <th className="px-5 py-3 text-right">
                  {paretoTableMode === 'IMPACT' ? 'Loss quy đổi (phút)' : 'Thời gian sự cố (phút)'}
                </th>
                <th className="px-5 py-3 text-right">Tỷ trọng (%)</th>
                <th className="px-5 py-3 text-right">Lũy kế (%)</th>
                <th className="px-5 py-3">Đánh giá 80/20</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(paretoTableMode === 'IMPACT' ? paretoImpactTable : paretoCauseTable).map((item, idx) => (
                <tr key={item.name} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-5 py-3.5 font-mono font-bold text-gray-400">#{idx + 1}</td>
                  <td className="px-5 py-3.5 font-bold text-[#202124]">{item.name}</td>
                  <td className="px-5 py-3.5 text-gray-500">{item.scope}</td>
                  <td className="px-5 py-3.5 text-right font-mono font-bold text-[#C62828]">
                    {item.minutes}m
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono font-semibold text-gray-700">{item.rate}%</td>
                  <td className="px-5 py-3.5 text-right font-mono font-bold text-[#E31837]">
                    {item.cumRate}%
                  </td>
                  <td className="px-5 py-3.5">
                    {item.cumRate <= 80 ? (
                      <span className="rounded-full bg-red-50 border border-red-200 px-2.5 py-0.5 text-[10px] font-bold text-[#C62828]">
                        Ưu tiên xử lý (80% tổn thất)
                      </span>
                    ) : (
                      <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[10px] text-gray-500 font-medium">
                        Thứ yếu
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
