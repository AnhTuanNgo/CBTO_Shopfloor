'use client';

import React, { useState, useMemo } from 'react';
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
  Flame,
  ShieldCheck,
  X,
  FileText,
  Sparkles,
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

  // In-app interactive CIP Modals (replaces window.confirm & window.alert for iframe sandbox safety)
  const [isStopCipModalOpen, setIsStopCipModalOpen] = useState(false);
  const [selectedCipType, setSelectedCipType] = useState('CIP Full');
  const [stopCipNote, setStopCipNote] = useState('');
  const [autoRecordLoss, setAutoRecordLoss] = useState(true);

  const [isCompleteCipModalOpen, setIsCompleteCipModalOpen] = useState(false);
  const [isVerifyReadyModalOpen, setIsVerifyReadyModalOpen] = useState(false);

  // Notification / Feedback banner
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Active runtime & active CIP for the currently selected line
  const activeRunningRuntime = useMemo(() => {
    return runtimes.find((r) => r.lineId === selectedLineId && r.status === 'RUNNING');
  }, [runtimes, selectedLineId]);

  const latestRuntime = useMemo(() => {
    return runtimes.find((r) => r.lineId === selectedLineId);
  }, [runtimes, selectedLineId]);

  // Priority: find ongoing CIP (IN_CIP or POST_CIP_SAMPLING) first
  const activeCip = useMemo(() => {
    const ongoing = cips.find(
      (c) => c.lineId === selectedLineId && (c.status === 'IN_CIP' || c.status === 'POST_CIP_SAMPLING')
    );
    if (ongoing) return ongoing;
    return cips.find((c) => c.lineId === selectedLineId);
  }, [cips, selectedLineId]);

  const activeSku = skus.find((s) => s.id === (activeRunningRuntime?.skuId || latestRuntime?.skuId));

  // Runtime calculation (AC-08, AC-10)
  const runtimeStatus = useMemo(() => {
    if (activeRunningRuntime && activeSku) {
      return computeRuntimeStatus(activeRunningRuntime.startedAt, activeRunningRuntime.limitHoursSnapshot, null, tick);
    }
    if (latestRuntime && latestRuntime.status === 'STOPPED_FOR_CIP' && activeSku) {
      return computeRuntimeStatus(latestRuntime.startedAt, latestRuntime.limitHoursSnapshot, latestRuntime.stoppedAt, tick);
    }
    return computeRuntimeStatus(null, null, null, tick);
  }, [activeRunningRuntime, latestRuntime, activeSku, tick]);

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

  // Handlers
  const handleStartRun = (e: React.FormEvent) => {
    e.preventDefault();
    const res = startProductionRun(selectedLineId, selectedSkuToRun);
    if (!res.success) {
      setFeedback({ type: 'error', message: res.message || 'Không thể khởi động phiên chạy!' });
      return;
    }
    setFeedback({
      type: 'success',
      message: `Đã khởi động phiên sản xuất mới trên ${activeLine?.name}! Đồng hồ Runtime bắt đầu tính giờ.`,
    });
    setIsStartRunOpen(false);
  };

  const handleConfirmStopCIP = () => {
    const finalNote = stopCipNote.trim() || `Dừng máy định kỳ thực hiện ${selectedCipType}`;
    const res = stopForCIP(selectedLineId, finalNote, {
      autoRecordLoss,
      cipType: selectedCipType,
    });

    if (!res.success) {
      setFeedback({ type: 'error', message: res.message || 'Lỗi khi dừng máy chuyển CIP!' });
      return;
    }

    setFeedback({
      type: 'success',
      message: `Đã dừng máy ${activeLine?.name} và chuyển sang chu trình ${selectedCipType}.${
        autoRecordLoss ? ' Đã tự động ghi nhận dừng máy Loss Time (CIP).' : ''
      }`,
    });
    setIsStopCipModalOpen(false);
    setStopCipNote('');
  };

  const handleConfirmCompleteCIP = () => {
    const res = completeCIPCycle(selectedLineId);
    if (!res.success) {
      setFeedback({ type: 'error', message: res.message || 'Lỗi khi hoàn thành CIP!' });
      return;
    }

    setFeedback({
      type: 'success',
      message: `Đã hoàn thành các bước CIP trên ${activeLine?.name}! Đang đếm ngược Post-CIP Sampling 60 phút.`,
    });
    setIsCompleteCipModalOpen(false);
  };

  const handleConfirmVerifyReady = () => {
    const res = verifyAndSetReady(selectedLineId);
    if (!res.success) {
      setFeedback({ type: 'error', message: res.message || 'Lỗi khi xác nhận sẵn sàng!' });
      return;
    }

    setFeedback({
      type: 'success',
      message: `Supervisor đã xác nhận kết quả QC đạt chuẩn! ${activeLine?.name} đã sẵn sàng khởi động phiên SKU mới.`,
    });
    setIsVerifyReadyModalOpen(false);
  };

  const handleSaveConfigLimit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUser.role !== 'SUPERVISOR') {
      setFeedback({ type: 'error', message: 'Chỉ Supervisor mới có quyền thay đổi giới hạn Runtime chuẩn!' });
      return;
    }
    updateSkuLimit(configSkuId, Number(newLimitInput));
    setFeedback({ type: 'success', message: 'Đã cập nhật giới hạn Runtime thành công!' });
    setIsConfigOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Feedback Notification Toast */}
      {feedback && (
        <div
          className={`flex items-center justify-between p-4 rounded-2xl border text-xs font-semibold ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-[#16865B]'
              : 'bg-red-50 border-red-200 text-[#C62828]'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-[#16865B] shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-[#C62828] shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-gray-400 hover:text-gray-700 ml-2 p-1 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-[#E31837]">
              <Timer className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#202124]">Theo dõi Chu kỳ Sản xuất & Hạn CIP</h2>
              <p className="mt-0.5 text-xs text-gray-500">
                Kiểm soát Runtime liên tục theo 7 SKU chuẩn, quy tắc cảnh báo & Post-CIP 60 phút trên {activeLine?.name}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {currentUser.role === 'SUPERVISOR' && (
            <button
              onClick={() => {
                setConfigSkuId(skus[0]?.id || '');
                setNewLimitInput(skus[0]?.limitHours || 72);
                setIsConfigOpen(true);
              }}
              className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 cursor-pointer shadow-xs transition-colors"
            >
              <Settings2 className="h-3.5 w-3.5 text-gray-500" />
              <span>Cấu hình SKU</span>
            </button>
          )}

          <button
            onClick={() => {
              setSelectedSkuToRun(skus[0]?.id || '');
              setIsStartRunOpen(true);
            }}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 rounded-xl bg-[#E31837] px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-red-700 cursor-pointer transition-colors active:scale-95"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            <span>Khởi động Phiên SKU mới</span>
          </button>
        </div>
      </div>

      {/* Hero Runtime Gauge & Status Box */}
      <div className="rounded-3xl border border-gray-200/80 bg-white p-6 shadow-xs relative overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
          {/* Main Runtime Gauge */}
          <div className="lg:col-span-2 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4">
              <div>
                <span className="text-xs font-semibold text-gray-400">Trạng thái vận hành {activeLine?.name}:</span>
                <h3 className="text-xl font-black text-[#202124] flex items-center gap-2 mt-1">
                  {activeCip?.status === 'IN_CIP' ? (
                    <>
                      <RotateCw className="h-5 w-5 text-blue-600 animate-spin" />
                      <span className="text-blue-700">Đang Vệ sinh CIP ({activeCip.note || 'Định kỳ'})</span>
                    </>
                  ) : activeCip?.status === 'POST_CIP_SAMPLING' ? (
                    <>
                      <Clock className="h-5 w-5 text-amber-600 animate-pulse" />
                      <span className="text-amber-700">Đang Post-CIP Sampling (Chờ QC)</span>
                    </>
                  ) : activeRunningRuntime && activeSku ? (
                    <>
                      <Flame className="h-5 w-5 text-[#E31837]" />
                      <span>{activeSku.name}</span>
                    </>
                  ) : latestRuntime?.status === 'STOPPED_FOR_CIP' && activeSku ? (
                    <>
                      <RotateCw className="h-5 w-5 text-gray-500" />
                      <span className="text-gray-700">Dừng từ SKU {activeSku.name} để CIP</span>
                    </>
                  ) : (
                    <span className="text-gray-400">Chưa có phiên SKU đang chạy</span>
                  )}
                </h3>
              </div>

              {/* Status Badge */}
              <div
                className={`rounded-full px-3.5 py-1 text-xs font-bold flex items-center gap-1.5 border ${
                  activeCip?.status === 'IN_CIP'
                    ? 'border-blue-200 bg-blue-50 text-blue-700'
                    : activeCip?.status === 'POST_CIP_SAMPLING'
                    ? 'border-amber-200 bg-amber-50 text-[#D97706]'
                    : runtimeStatus.badgeLevel === 'OVERDUE'
                    ? 'border-red-200 bg-red-50 text-[#C62828]'
                    : runtimeStatus.badgeLevel === 'DUE' || runtimeStatus.badgeLevel === 'WARNING'
                    ? 'border-amber-200 bg-amber-50 text-[#D97706]'
                    : 'border-emerald-200 bg-emerald-50 text-[#16865B]'
                }`}
              >
                {activeCip?.status === 'IN_CIP' ? (
                  <>
                    <RotateCw className="h-3.5 w-3.5 animate-spin text-blue-600" />
                    <span>ĐANG CHẠY CIP</span>
                  </>
                ) : activeCip?.status === 'POST_CIP_SAMPLING' ? (
                  <>
                    <Clock className="h-3.5 w-3.5 text-amber-600 animate-pulse" />
                    <span>POST-CIP 60 PHÚT</span>
                  </>
                ) : runtimeStatus.badgeLevel === 'OVERDUE' || runtimeStatus.badgeLevel === 'DUE' ? (
                  <>
                    <AlertTriangle className="h-3.5 w-3.5 text-[#C62828]" />
                    <span>{runtimeStatus.badgeLabel}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#16865B]" />
                    <span>{runtimeStatus.badgeLabel}</span>
                  </>
                )}
              </div>
            </div>

            {/* Gauge bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-gray-500">Tiến trình Runtime:</span>
                <span className="font-mono text-[#202124] text-sm">{runtimeStatus.usagePercent}% giới hạn</span>
              </div>

              <div className="h-3.5 w-full bg-gray-100 rounded-full overflow-hidden p-0.5 border border-gray-200">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    activeCip?.status === 'IN_CIP'
                      ? 'bg-blue-500'
                      : activeCip?.status === 'POST_CIP_SAMPLING'
                      ? 'bg-amber-500'
                      : runtimeStatus.badgeLevel === 'OVERDUE'
                      ? 'bg-[#C62828]'
                      : runtimeStatus.badgeLevel === 'DUE' || runtimeStatus.badgeLevel === 'WARNING'
                      ? 'bg-[#D97706]'
                      : runtimeStatus.badgeLevel === 'NOTICE'
                      ? 'bg-amber-400'
                      : 'bg-[#16865B]'
                  }`}
                  style={{ width: `${Math.min(100, runtimeStatus.usagePercent)}%` }}
                />
              </div>

              {/* Threshold indicator marks */}
              <div className="flex justify-between text-[11px] text-gray-400 font-mono px-1">
                <span>0h</span>
                <span className="text-[#16865B] font-semibold">80% An toàn</span>
                <span className="text-[#D97706] font-semibold">90% Cảnh báo</span>
                <span className="text-[#C62828] font-semibold">100% Đến hạn CIP</span>
              </div>
            </div>

            {/* Metric numbers */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="rounded-2xl bg-gray-50 p-3.5 border border-gray-100">
                <span className="text-[11px] text-gray-500 font-medium block">Thời gian đã chạy</span>
                <span className="text-xl font-black font-mono text-[#202124] mt-1 block">
                  {runtimeStatus.elapsedHours}h
                </span>
                <span className="text-[10px] text-gray-400">
                  {latestRuntime?.status === 'STOPPED_FOR_CIP' ? 'đã chốt khi dừng' : 'tính liên tục'}
                </span>
              </div>

              <div className="rounded-2xl bg-gray-50 p-3.5 border border-gray-100">
                <span className="text-[11px] text-gray-500 font-medium block">Runtime còn lại</span>
                <span
                  className={`text-xl font-black font-mono mt-1 block ${
                    runtimeStatus.remainingHours <= 0 ? 'text-[#C62828]' : 'text-[#16865B]'
                  }`}
                >
                  {runtimeStatus.remainingHours}h
                </span>
                <span className="text-[10px] text-gray-400">trước khi phải CIP</span>
              </div>

              <div className="rounded-2xl bg-gray-50 p-3.5 border border-gray-100">
                <span className="text-[11px] text-gray-500 font-medium block">Giới hạn SKU</span>
                <span className="text-xl font-black font-mono text-gray-700 mt-1 block">
                  {activeRunningRuntime?.limitHoursSnapshot || latestRuntime?.limitHoursSnapshot || '--'}h
                </span>
                <span className="text-[10px] text-gray-400">Snapshot phiên</span>
              </div>

              <div className="rounded-2xl bg-gray-50 p-3.5 border border-gray-100">
                <span className="text-[11px] text-gray-500 font-medium block">Dự kiến hạn CIP</span>
                <span className="text-xs font-bold font-mono text-[#E31837] mt-1.5 block truncate">
                  {runtimeStatus.expectedCipTime}
                </span>
                <span className="text-[10px] text-gray-400">Thời điểm chốt</span>
              </div>
            </div>
          </div>

          {/* Right action block: CIP Workflow */}
          <div className="rounded-2xl border border-gray-200/90 bg-gray-50/70 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-200/80 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                <RotateCw className="h-4 w-4 text-[#E31837]" />
                Trạng thái CIP Line
              </span>
              <span
                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                  activeCip?.status === 'POST_CIP_SAMPLING'
                    ? 'bg-amber-50 text-[#D97706] border-amber-200'
                    : activeCip?.status === 'IN_CIP'
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-emerald-50 text-[#16865B] border-emerald-200'
                }`}
              >
                {activeCip?.status === 'IN_CIP'
                  ? 'ĐANG VỆ SINH'
                  : activeCip?.status === 'POST_CIP_SAMPLING'
                  ? 'POST-CIP 60M'
                  : 'SẴN SÀNG'}
              </span>
            </div>

            {/* In CIP Active Status */}
            {activeCip?.status === 'IN_CIP' && (
              <div className="rounded-xl border border-blue-200 bg-white p-3.5 space-y-2 shadow-xs">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-blue-700">Chu trình CIP đang chạy:</span>
                  <span className="font-mono text-blue-600 text-xs font-bold">
                    {formatDateTime(activeCip.cipStartedAt)}
                  </span>
                </div>
                <p className="text-[11px] text-gray-600">
                  {activeCip.note || 'Dừng máy định kỳ thực hiện chu trình CIP.'}
                </p>
                {activeCip.linkedLossId && (
                  <div className="flex items-center gap-1.5 text-[10px] text-amber-700 pt-1 font-medium">
                    <FileText className="h-3.5 w-3.5" />
                    <span>Đã liên kết Loss Time (tự động chốt khi hoàn tất)</span>
                  </div>
                )}
              </div>
            )}

            {/* Post-CIP sampling active countdown (AC-09) */}
            {activeCip?.status === 'POST_CIP_SAMPLING' && (
              <div className="rounded-xl border border-amber-200 bg-white p-3.5 space-y-2 shadow-xs">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-amber-800">Post-CIP Sampling:</span>
                  <span className="font-mono text-[#D97706] text-sm font-black">
                    {samplingCountdown?.text}
                  </span>
                </div>
                <p className="text-[11px] text-gray-500">
                  Thời gian chờ ổn định vi sinh & kiểm pH mẫu nước tráng (60 phút). Tải lại trang sẽ không reset đếm.
                </p>

                {samplingCountdown?.completed ? (
                  <div className="pt-2">
                    <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-2.5 text-center text-xs text-[#16865B] font-bold mb-2">
                      ✓ Đã đủ thời gian chờ 60 phút
                    </div>
                    {currentUser.role === 'SUPERVISOR' ? (
                      <button
                        onClick={() => setIsVerifyReadyModalOpen(true)}
                        className="w-full rounded-xl bg-[#16865B] py-2.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-sm cursor-pointer"
                      >
                        Supervisor: Xác nhận Sẵn sàng sản xuất
                      </button>
                    ) : (
                      <div className="text-[11px] text-[#D97706] text-center italic font-medium">
                        Chờ Supervisor xác nhận kết quả QC để mở line.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#D97706]"
                      style={{
                        width: `${Math.min(
                          100,
                          ((((tick || new Date(activeCip.samplingStartedAt!).getTime()) -
                            new Date(activeCip.samplingStartedAt!).getTime()) /
                            60000) /
                            60) *
                            100
                        )}%`,
                      }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Action buttons based on current state */}
            <div className="space-y-2 pt-1">
              {/* Button 1: Dừng máy chuyển sang CIP */}
              {activeRunningRuntime?.status === 'RUNNING' && (
                <button
                  type="button"
                  onClick={() => setIsStopCipModalOpen(true)}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-white border border-red-200 py-3 text-xs font-bold text-[#E31837] hover:bg-red-50 transition-all cursor-pointer shadow-xs active:scale-95"
                >
                  <RotateCw className="h-4 w-4" />
                  <span>Dừng máy chuyển sang CIP</span>
                </button>
              )}

              {/* Button 2: When Line is idle / ready without running SKU and without active CIP */}
              {!activeRunningRuntime &&
                activeCip?.status !== 'IN_CIP' &&
                activeCip?.status !== 'POST_CIP_SAMPLING' && (
                  <button
                    type="button"
                    onClick={() => setIsStopCipModalOpen(true)}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#202124] text-white py-3 text-xs font-bold hover:bg-black transition-all cursor-pointer shadow-sm active:scale-95"
                  >
                    <RotateCw className="h-4 w-4 text-emerald-400" />
                    <span>Kích hoạt Chu trình CIP</span>
                  </button>
                )}

              {/* Button 3: CIP hoàn tất */}
              {activeCip?.status === 'IN_CIP' && (
                <button
                  type="button"
                  onClick={() => setIsCompleteCipModalOpen(true)}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-xs font-bold text-white hover:bg-blue-700 transition-all cursor-pointer shadow-sm active:scale-95"
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
          <h3 className="font-bold text-sm text-[#202124]">Bảng Giới hạn Runtime 7 SKU Chuẩn CBTO</h3>
          <span className="text-xs text-gray-400 font-medium">Đơn vị: Giờ chạy liên tục</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {skus.map((sku) => {
            const isCurrentlyRunning = activeRunningRuntime?.skuId === sku.id;
            return (
              <div
                key={sku.id}
                className={`rounded-2xl border p-4 transition-all bg-white ${
                  isCurrentlyRunning
                    ? 'border-red-300 ring-2 ring-red-100'
                    : 'border-gray-200/80 hover:border-gray-300'
                } shadow-xs`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-[11px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                    {sku.code}
                  </span>
                  {isCurrentlyRunning && (
                    <span className="rounded-full bg-red-50 text-[#E31837] border border-red-200 px-2 py-0.5 text-[9px] font-bold">
                      Đang chạy
                    </span>
                  )}
                </div>

                <h4 className="font-bold text-[#202124] text-sm mt-2">{sku.name}</h4>
                <p className="text-[11px] text-gray-500 mt-0.5 truncate">{sku.description}</p>

                <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-xs">
                  <span className="text-gray-400 font-medium">Giới hạn tối đa:</span>
                  <span className="font-mono font-bold text-[#202124] text-sm">{sku.limitHours} giờ</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL 1: Interactive Dừng máy chuyển sang CIP Modal */}
      {isStopCipModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-3xl border border-gray-200 bg-white shadow-2xl p-6 space-y-5 text-xs">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <RotateCw className="h-5 w-5 text-[#E31837]" />
                <h3 className="font-bold text-[#202124] text-base">Xác nhận Dừng máy Chuyển sang CIP</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsStopCipModalOpen(false)}
                className="text-gray-400 hover:text-gray-700 p-1 cursor-pointer rounded-full hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded-2xl bg-gray-50 p-4 border border-gray-100 space-y-2">
              <div className="flex items-center justify-between text-gray-600 font-semibold">
                <span>Dây chuyền thực hiện:</span>
                <span className="font-bold text-[#202124] text-sm">{activeLine?.name}</span>
              </div>
              <div className="flex items-center justify-between text-gray-500">
                <span>Phiên sản xuất:</span>
                <span className="text-[#202124] font-medium">
                  {activeSku
                    ? `${activeSku.name} (${runtimeStatus.elapsedHours}h / ${activeSku.limitHours}h)`
                    : 'Chưa có phiên đang chạy'}
                </span>
              </div>
              <div className="flex items-center justify-between text-gray-500">
                <span>Thời điểm ghi nhận:</span>
                <span className="font-mono text-[#E31837] font-bold">{formatDateTime(new Date())}</span>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-gray-700 font-bold mb-1.5">Loại chu trình CIP:</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    'CIP Full',
                    'CIP tuần hoàn bồn nấu định kỳ',
                    'CIP đường ống chuyển tương',
                    'Vệ sinh CIP sau đổi mẻ sản xuất',
                  ].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setSelectedCipType(type)}
                      className={`p-3 rounded-xl border text-left font-medium transition-all cursor-pointer text-xs ${
                        selectedCipType === type
                          ? 'border-[#E31837] bg-red-50/50 text-[#E31837] font-bold shadow-xs'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Ghi chú / Căn cứ vận hành:</label>
                <input
                  type="text"
                  value={stopCipNote}
                  onChange={(e) => setStopCipNote(e.target.value)}
                  placeholder="Ví dụ: Dừng máy CIP định kỳ sau chu kỳ chạy liên tục..."
                  className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-[#202124] placeholder-gray-400 focus:border-[#E31837] focus:outline-none"
                />
              </div>

              <label className="flex items-start gap-2.5 p-3.5 rounded-2xl border border-gray-200 bg-gray-50/70 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoRecordLoss}
                  onChange={(e) => setAutoRecordLoss(e.target.checked)}
                  className="mt-0.5 rounded border-gray-300 text-[#E31837] focus:ring-[#E31837] cursor-pointer"
                />
                <div className="text-gray-700">
                  <span className="font-bold text-[#202124] block">Tự động ghi nhận tổn thất dừng máy (Loss Time - CIP)</span>
                  <span className="text-[11px] text-gray-500">
                    Hệ thống sẽ tạo bản ghi sự cố nhóm CIP (Phạm vi Cụm Nấu, mức 100%) và tự động chốt thời lượng khi CIP hoàn tất.
                  </span>
                </div>
              </label>
            </div>

            <div className="border-t border-gray-100 pt-3.5 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsStopCipModalOpen(false)}
                className="rounded-xl border border-gray-200 px-4 py-2.5 font-bold text-gray-700 hover:bg-gray-100 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmStopCIP}
                className="rounded-xl bg-[#E31837] px-5 py-2.5 font-bold text-white hover:bg-red-700 shadow-sm cursor-pointer flex items-center gap-1.5 active:scale-95"
              >
                <RotateCw className="h-4 w-4" />
                <span>Xác nhận Dừng & Chạy CIP</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Interactive Complete CIP Modal */}
      {isCompleteCipModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white shadow-2xl p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2 text-blue-700">
                <CheckCircle2 className="h-5 w-5" />
                <h3 className="font-bold text-[#202124] text-base">Hoàn tất Chu trình Vệ sinh CIP</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCompleteCipModalOpen(false)}
                className="text-gray-400 hover:text-gray-700 p-1 cursor-pointer rounded-full hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-gray-600">
              Xác nhận đã thực hiện đầy đủ các bước kỹ thuật trên <strong>{activeLine?.name}</strong>:
            </p>

            <div className="rounded-2xl bg-gray-50 p-4 border border-gray-100 space-y-2 text-gray-700">
              <div className="flex items-center gap-2">
                <span className="text-[#16865B] font-bold">✓</span>
                <span>Xả cặn tương và tráng nước sơ bộ</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#16865B] font-bold">✓</span>
                <span>Tuần hoàn xút nóng (NaOH 1.5 - 2.0%, nhiệt độ 80 - 85°C)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#16865B] font-bold">✓</span>
                <span>Tuần hoàn axit trung hòa (HNO3 1.0 - 1.5%)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#16865B] font-bold">✓</span>
                <span>Tráng tiệt trùng nước nóng (&gt;90°C)</span>
              </div>
            </div>

            <p className="text-[11px] text-[#D97706] bg-amber-50 p-3 rounded-xl border border-amber-200">
              Sau khi bấm xác nhận, hệ thống chuyển sang giai đoạn <strong>Post-CIP Sampling 60 phút</strong> để kiểm tra ổn định vi sinh & độ pH nước tráng.
            </p>

            <div className="border-t border-gray-100 pt-3 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsCompleteCipModalOpen(false)}
                className="rounded-xl border border-gray-200 px-4 py-2.5 font-bold text-gray-700 hover:bg-gray-100 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmCompleteCIP}
                className="rounded-xl bg-blue-600 px-5 py-2.5 font-bold text-white hover:bg-blue-700 shadow-sm cursor-pointer flex items-center gap-1.5 active:scale-95"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Xác nhận & Chuyển Post-CIP 60m</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Interactive Supervisor Verify Ready Modal */}
      {isVerifyReadyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white shadow-2xl p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2 text-[#16865B]">
                <ShieldCheck className="h-5 w-5" />
                <h3 className="font-bold text-[#202124] text-base">Supervisor Xác nhận Sẵn sàng</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsVerifyReadyModalOpen(false)}
                className="text-gray-400 hover:text-gray-700 p-1 cursor-pointer rounded-full hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-gray-600">
              Xác nhận kết quả mẫu xét nghiệm vi sinh (ATP &lt; 30 RLU, pH nước tráng 6.8 - 7.2) đạt yêu cầu kỹ thuật trên <strong>{activeLine?.name}</strong>.
            </p>

            <div className="rounded-2xl bg-gray-50 p-4 border border-gray-100 space-y-2 text-gray-700">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Người phê duyệt:</span>
                <span className="text-[#202124] font-bold">{currentUser.displayName} ({currentUser.role})</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Thời điểm mở line:</span>
                <span className="font-mono text-[#16865B] font-bold">{formatDateTime(new Date())}</span>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-3 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsVerifyReadyModalOpen(false)}
                className="rounded-xl border border-gray-200 px-4 py-2.5 font-bold text-gray-700 hover:bg-gray-100 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmVerifyReady}
                className="rounded-xl bg-[#16865B] px-5 py-2.5 font-bold text-white hover:bg-emerald-700 shadow-sm cursor-pointer flex items-center gap-1.5 active:scale-95"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Mở Line & Chuyển Sẵn sàng</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Start Run Modal */}
      {isStartRunOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white shadow-2xl p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-bold text-[#202124] text-base">Khởi động Phiên Sản xuất SKU Mới</h3>
              <button
                type="button"
                onClick={() => setIsStartRunOpen(false)}
                className="text-gray-400 hover:text-gray-700 p-1 cursor-pointer rounded-full hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-gray-500">
              Chọn SKU bắt đầu chạy trên {activeLine?.name}. Đồng hồ Runtime sẽ tính từ thời điểm hiện tại:
            </p>

            <form onSubmit={handleStartRun} className="space-y-4">
              <div>
                <label className="block text-gray-700 font-bold mb-1.5">SKU Sản xuất</label>
                <select
                  value={selectedSkuToRun}
                  onChange={(e) => setSelectedSkuToRun(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-[#202124] font-semibold focus:border-[#E31837] focus:outline-none"
                >
                  {skus.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} — Giới hạn {s.limitHours} giờ
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-2xl bg-gray-50 p-3.5 border border-gray-100 text-gray-600 text-[11px]">
                Phiên chạy sẽ lưu snapshot giới hạn tại thời điểm này. Đổi SKU sau khi CIP sẽ làm mới đồng hồ Runtime.
              </div>

              <div className="border-t border-gray-100 pt-3.5 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsStartRunOpen(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2 font-bold text-gray-700 hover:bg-gray-100 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#E31837] px-5 py-2 font-bold text-white hover:bg-red-700 shadow-sm cursor-pointer active:scale-95"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white shadow-2xl p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-bold text-[#202124] text-base">Cấu hình Giới hạn Runtime Chuẩn</h3>
              <button
                type="button"
                onClick={() => setIsConfigOpen(false)}
                className="text-gray-400 hover:text-gray-700 p-1 cursor-pointer rounded-full hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-gray-500">
              Quyền quản trị Supervisor: cập nhật mốc Runtime tối đa cho từng SKU.
            </p>

            <form onSubmit={handleSaveConfigLimit} className="space-y-4">
              <div>
                <label className="block text-gray-700 font-bold mb-1.5">Chọn SKU cấu hình</label>
                <select
                  value={configSkuId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setConfigSkuId(id);
                    const matched = skus.find((s) => s.id === id);
                    if (matched) setNewLimitInput(matched.limitHours);
                  }}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-[#202124] font-semibold focus:border-[#E31837] focus:outline-none"
                >
                  {skus.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} (hiện tại: {s.limitHours}h)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1.5">Giới hạn Runtime mới (giờ)</label>
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={newLimitInput}
                  onChange={(e) => setNewLimitInput(Number(e.target.value))}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-[#202124] font-mono font-bold focus:border-[#E31837] focus:outline-none"
                  required
                />
              </div>

              <div className="border-t border-gray-100 pt-3.5 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsConfigOpen(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2 font-bold text-gray-700 hover:bg-gray-100 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#E31837] px-5 py-2 font-bold text-white hover:bg-red-700 shadow-sm cursor-pointer active:scale-95"
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
