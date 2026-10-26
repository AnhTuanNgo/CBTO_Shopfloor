'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import { computeRuntimeStatus, formatDateTime } from '@/lib/date-utils';
import { useCurrentTimestamp } from '@/hooks/use-current-time';
import {
  Timer,
  RotateCw,
  Play,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Settings2,
  ShieldAlert,
  ArrowRight,
  Flame,
} from 'lucide-react';

export function RuntimeCipModule() {
  const {
    currentUser,
    selectedLineId,
    lines,
    skus,
    runtimes,
    cips,
    startProductionRun,
    stopForCIP,
    completeCIPCycle,
    verifyAndSetReady,
    updateSkuLimit,
  } = useAppStore();

  const activeLine = lines.find((l) => l.id === selectedLineId);

  // Live timer tick every 5 seconds to update remaining hours & post-cip sampling countdown
  const tick = useCurrentTimestamp();

  // Modal states
  const [isStartRunOpen, setIsStartRunOpen] = useState(false);
  const [selectedSkuToRun, setSelectedSkuToRun] = useState(skus[0]?.id || '');
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [configSkuId, setConfigSkuId] = useState(skus[0]?.id || '');
  const [newLimitInput, setNewLimitInput] = useState(72);

  // Active runtime & active CIP for the currently selected line
  const activeRuntime = useMemo(() => {
    return runtimes.find((r) => r.lineId === selectedLineId && r.status === 'RUNNING');
  }, [runtimes, selectedLineId]);

  const activeCip = useMemo(() => {
    return cips.find((c) => c.lineId === selectedLineId);
  }, [cips, selectedLineId]);

  const activeSku = skus.find((s) => s.id === activeRuntime?.skuId);

  // Runtime calculation (AC-08, AC-10)
  const runtimeStatus = useMemo(() => {
    if (!activeRuntime || !activeSku) {
      return computeRuntimeStatus(null, null, null, tick);
    }
    return computeRuntimeStatus(activeRuntime.startedAt, activeRuntime.limitHoursSnapshot, null, tick);
  }, [activeRuntime, activeSku, tick]);

  // Post-CIP 60 min countdown (AC-09: uses saved timestamp, refresh does not reset!)
  const samplingCountdown = useMemo(() => {
    if (!activeCip || activeCip.status !== 'POST_CIP_SAMPLING' || !activeCip.samplingStartedAt) {
      return null;
    }

    const startMs = new Date(activeCip.samplingStartedAt).getTime();
    const targetMs = startMs + activeCip.samplingMinutes * 60 * 1000;
    const diffMs = targetMs - tick;

    if (diffMs <= 0) {
      return {
        completed: true,
        minutesLeft: 0,
        secondsLeft: 0,
        text: 'Đã đủ thời gian chờ 60 phút',
      };
    }

    const totalSeconds = Math.floor(diffMs / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return {
      completed: false,
      minutesLeft: m,
      secondsLeft: s,
      text: `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`,
    };
  }, [activeCip, tick]);

  const handleStartRun = (e: React.FormEvent) => {
    e.preventDefault();
    const res = startProductionRun(selectedLineId, selectedSkuToRun);
    if (!res.success) {
      alert(res.message);
      return;
    }
    setIsStartRunOpen(false);
  };

  const handleStopCIP = () => {
    if (confirm(`Dừng máy ${activeLine?.name} để bắt đầu chu trình vệ sinh CIP?`)) {
      stopForCIP(selectedLineId, 'Dừng máy định kỳ thực hiện chu trình CIP');
    }
  };

  const handleCompleteCIP = () => {
    if (confirm('Xác nhận đã hoàn thành các bước xả, tuần hoàn kiềm/axit và tráng tiệt trùng nước nóng?')) {
      const res = completeCIPCycle(selectedLineId);
      if (!res.success) alert(res.message);
    }
  };

  const handleVerifyReady = () => {
    const res = verifyAndSetReady(selectedLineId);
    if (!res.success) {
      alert(res.message);
    }
  };

  const handleSaveConfigLimit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUser.role !== 'SUPERVISOR') {
      alert('Chỉ Supervisor mới có quyền thay đổi giới hạn Runtime chuẩn!');
      return;
    }
    updateSkuLimit(configSkuId, Number(newLimitInput));
    setIsConfigOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <div>
          <div className="flex items-center gap-2">
            <Timer className="h-5 w-5 text-orange-400" />
            <h2 className="text-base font-bold text-white">Theo dõi Chu kỳ Sản xuất & Hạn CIP</h2>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Kiểm soát Runtime liên tục theo 7 SKU chuẩn, quy tắc cảnh báo màu & quy trình Post-CIP 60 phút trên {activeLine?.name}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {currentUser.role === 'SUPERVISOR' && (
            <button
              onClick={() => {
                setConfigSkuId(skus[0]?.id || '');
                setNewLimitInput(skus[0]?.limitHours || 72);
                setIsConfigOpen(true);
              }}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 cursor-pointer"
            >
              <Settings2 className="h-3.5 w-3.5 text-slate-400" />
              <span>Cấu hình mốc SKU</span>
            </button>
          )}

          <button
            onClick={() => {
              setSelectedSkuToRun(skus[0]?.id || '');
              setIsStartRunOpen(true);
            }}
            className="flex items-center gap-1.5 rounded-lg bg-orange-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-orange-950/40 hover:bg-orange-500 cursor-pointer"
          >
            <Play className="h-3.5 w-3.5" />
            <span>Khởi động Phiên SKU mới</span>
          </button>
        </div>
      </div>

      {/* Hero Runtime Gauge & Status Box */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl relative overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
          {/* Main Runtime Gauge */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <span className="text-xs text-slate-400">Đang chạy trên {activeLine?.name}:</span>
                <h3 className="text-xl font-black text-white flex items-center gap-2 mt-0.5">
                  <Flame className="h-5 w-5 text-orange-500" />
                  {activeSku ? activeSku.name : 'Chưa có phiên SKU đang chạy'}
                </h3>
              </div>

              {/* Status Badge (AC-08, AC-10) */}
              <div
                className={`rounded-lg border px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 ${runtimeStatus.badgeColorClass}`}
              >
                {runtimeStatus.badgeLevel === 'OVERDUE' || runtimeStatus.badgeLevel === 'DUE' ? (
                  <AlertTriangle className="h-4 w-4 animate-bounce" />
                ) : (
                  <Clock className="h-4 w-4" />
                )}
                <span>{runtimeStatus.badgeLabel}</span>
              </div>
            </div>

            {/* Gauge bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-400">Tiến trình Runtime:</span>
                <span className="font-mono text-slate-200">{runtimeStatus.usagePercent}% giới hạn</span>
              </div>

              <div className="h-4 w-full bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700/80">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    runtimeStatus.badgeLevel === 'OVERDUE'
                      ? 'bg-rose-500'
                      : runtimeStatus.badgeLevel === 'DUE' || runtimeStatus.badgeLevel === 'WARNING'
                      ? 'bg-orange-500'
                      : runtimeStatus.badgeLevel === 'NOTICE'
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, runtimeStatus.usagePercent)}%` }}
                />
              </div>

              {/* Threshold indicator marks */}
              <div className="flex justify-between text-[10px] text-slate-400 font-mono px-1">
                <span>0h</span>
                <span className="text-emerald-400">80%</span>
                <span className="text-amber-400">90%</span>
                <span className="text-orange-400">100% (Đến hạn CIP)</span>
              </div>
            </div>

            {/* Metric numbers */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="rounded-xl bg-slate-850 p-3 border border-slate-800">
                <span className="text-[11px] text-slate-400 block">Thời gian đã chạy</span>
                <span className="text-lg font-black font-mono text-white mt-0.5 block">
                  {runtimeStatus.elapsedHours}h
                </span>
                <span className="text-[10px] text-slate-400">tính liên tục</span>
              </div>

              <div className="rounded-xl bg-slate-850 p-3 border border-slate-800">
                <span className="text-[11px] text-slate-400 block">Runtime còn lại</span>
                <span
                  className={`text-lg font-black font-mono mt-0.5 block ${
                    runtimeStatus.remainingHours <= 0 ? 'text-rose-400' : 'text-emerald-400'
                  }`}
                >
                  {runtimeStatus.remainingHours}h
                </span>
                <span className="text-[10px] text-slate-400">trước khi phải CIP</span>
              </div>

              <div className="rounded-xl bg-slate-850 p-3 border border-slate-800">
                <span className="text-[11px] text-slate-400 block">Giới hạn SKU</span>
                <span className="text-lg font-black font-mono text-slate-200 mt-0.5 block">
                  {activeRuntime?.limitHoursSnapshot || '--'}h
                </span>
                <span className="text-[10px] text-slate-400">Snapshot phiên</span>
              </div>

              <div className="rounded-xl bg-slate-850 p-3 border border-slate-800">
                <span className="text-[11px] text-slate-400 block">Dự kiến thời điểm CIP</span>
                <span className="text-xs font-bold font-mono text-orange-300 mt-1 block">
                  {runtimeStatus.expectedCipTime}
                </span>
                <span className="text-[10px] text-slate-400">Bắt đầu + Giới hạn</span>
              </div>
            </div>
          </div>

          {/* Right action block: CIP Workflow */}
          <div className="rounded-xl border border-slate-700 bg-slate-850/80 p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-700/80 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                <RotateCw className="h-3.5 w-3.5 text-teal-400" />
                Trạng thái CIP Line
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                  activeCip?.status === 'POST_CIP_SAMPLING'
                    ? 'bg-amber-950 text-amber-300 border-amber-700'
                    : activeCip?.status === 'IN_CIP'
                    ? 'bg-sky-950 text-sky-300 border-sky-700'
                    : 'bg-emerald-950 text-emerald-300 border-emerald-700'
                }`}
              >
                {activeCip?.status || 'READY'}
              </span>
            </div>

            {/* Post-CIP sampling active countdown (AC-09) */}
            {activeCip?.status === 'POST_CIP_SAMPLING' && (
              <div className="rounded-lg border border-amber-500/40 bg-amber-950/30 p-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-amber-300">Post-CIP Sampling:</span>
                  <span className="font-mono text-amber-400 text-sm font-black">
                    {samplingCountdown?.text}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300">
                  Thời gian chờ ổn định vi sinh & kiểm pH mẫu nước tráng (60 phút). Tải lại trang sẽ không reset đếm từ đầu.
                </p>

                {samplingCountdown?.completed ? (
                  <div className="pt-2">
                    <div className="rounded bg-emerald-950/60 border border-emerald-600/50 p-2 text-center text-xs text-emerald-300 font-semibold mb-2">
                      ✓ Đã đủ thời gian chờ 60 phút
                    </div>
                    {currentUser.role === 'SUPERVISOR' ? (
                      <button
                        onClick={handleVerifyReady}
                        className="w-full rounded bg-emerald-600 py-2 text-xs font-bold text-white hover:bg-emerald-500 shadow cursor-pointer"
                      >
                        Supervisor: Xác nhận Sẵn sàng sản xuất
                      </button>
                    ) : (
                      <div className="text-[11px] text-amber-400 text-center italic">
                        Chờ Supervisor xác nhận kết quả QC để mở line.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 animate-pulse"
                      style={{
                        width: `${Math.min(
                          100,
                          ((((tick || new Date(activeCip.samplingStartedAt!).getTime()) - new Date(activeCip.samplingStartedAt!).getTime()) / 60000) / 60) * 100
                        )}%`,
                      }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Action buttons based on current state */}
            <div className="space-y-2 pt-1">
              {activeRuntime?.status === 'RUNNING' && (
                <button
                  onClick={handleStopCIP}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-orange-600/20 border border-orange-500/50 py-2.5 text-xs font-bold text-orange-300 hover:bg-orange-600 hover:text-white transition-all cursor-pointer"
                >
                  <RotateCw className="h-4 w-4" />
                  <span>Dừng máy chuyển sang CIP</span>
                </button>
              )}

              {activeCip?.status === 'IN_CIP' && (
                <button
                  onClick={handleCompleteCIP}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-teal-600 py-2.5 text-xs font-bold text-white hover:bg-teal-500 transition-all cursor-pointer shadow-lg shadow-teal-950/50"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>CIP hoàn tất → Chuyển Post-CIP 60m</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 7 Standard SKUs Reference Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-200">Bảng Giới hạn Runtime 7 SKU Chuẩn CBTO</h3>
          <span className="text-xs text-slate-400">Đơn vị cấu hình: Giờ chạy liên tục</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {skus.map((sku) => {
            const isCurrentlyRunning = activeSku?.id === sku.id;
            return (
              <div
                key={sku.id}
                className={`rounded-xl border p-3.5 transition-all ${
                  isCurrentlyRunning
                    ? 'border-orange-500/60 bg-orange-950/20'
                    : 'border-slate-800 bg-slate-900/50'
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-[11px] text-slate-400">{sku.code}</span>
                  {isCurrentlyRunning && (
                    <span className="rounded bg-orange-600/80 px-1.5 py-0.5 text-[9px] font-bold text-white">
                      Đang chạy
                    </span>
                  )}
                </div>

                <h4 className="font-bold text-slate-200 text-sm mt-1">{sku.name}</h4>
                <p className="text-[11px] text-slate-400 mt-0.5 truncate">{sku.description}</p>

                <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Giới hạn tối đa:</span>
                  <span className="font-mono font-bold text-white text-sm">{sku.limitHours} giờ</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Start Run Modal */}
      {isStartRunOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl p-5 space-y-4 text-xs">
            <h3 className="font-bold text-white text-base">Khởi động Phiên Sản xuất SKU Mới</h3>
            <p className="text-slate-400">
              Chọn SKU bắt đầu chạy trên {activeLine?.name}. Đồng hồ Runtime sẽ tính từ thời điểm hiện tại:
            </p>

            <form onSubmit={handleStartRun} className="space-y-4">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">SKU Sản xuất</label>
                <select
                  value={selectedSkuToRun}
                  onChange={(e) => setSelectedSkuToRun(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white font-medium focus:border-orange-500 focus:outline-none"
                >
                  {skus.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} — Giới hạn {s.limitHours} giờ
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-lg bg-slate-800/60 p-3 border border-slate-700/60 text-slate-300 text-[11px]">
                Phiên chạy sẽ lưu snapshot giới hạn tại thời điểm này. Đổi SKU sau khi CIP sẽ làm mới đồng hồ Runtime.
              </div>

              <div className="border-t border-slate-800 pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsStartRunOpen(false)}
                  className="rounded-lg border border-slate-700 px-3 py-1.5 text-slate-300 hover:bg-slate-800"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-orange-600 px-4 py-1.5 font-bold text-white hover:bg-orange-500 shadow cursor-pointer"
                >
                  Bắt đầu chạy SKU
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Supervisor Config Modal */}
      {isConfigOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl p-5 space-y-4 text-xs">
            <h3 className="font-bold text-white text-base">Cấu hình Giới hạn Runtime Chuẩn (Supervisor)</h3>
            <p className="text-slate-400">
              Quyền quản trị của Supervisor: thay đổi giới hạn Runtime cho SKU. Các phiên đã chạy trước đây vẫn giữ snapshot giới hạn cũ.
            </p>

            <form onSubmit={handleSaveConfigLimit} className="space-y-4">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Chọn SKU cấu hình</label>
                <select
                  value={configSkuId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setConfigSkuId(id);
                    const matched = skus.find((s) => s.id === id);
                    if (matched) setNewLimitInput(matched.limitHours);
                  }}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white font-medium focus:border-purple-500 focus:outline-none"
                >
                  {skus.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} (hiện tại: {s.limitHours}h)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Giới hạn Runtime mới (giờ)</label>
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={newLimitInput}
                  onChange={(e) => setNewLimitInput(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white font-mono font-bold focus:border-purple-500 focus:outline-none"
                  required
                />
              </div>

              <div className="border-t border-slate-800 pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsConfigOpen(false)}
                  className="rounded-lg border border-slate-700 px-3 py-1.5 text-slate-300 hover:bg-slate-800"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-purple-600 px-4 py-1.5 font-bold text-white hover:bg-purple-500 shadow cursor-pointer"
                >
                  Lưu cấu hình
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
