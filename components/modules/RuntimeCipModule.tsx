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
  LayoutGrid,
  Layers,
  FlaskConical,
  AlertOctagon,
  Calendar,
  Check,
  ExternalLink,
  Info,
} from 'lucide-react';

export function RuntimeCipModule() {
  const {
    currentUser,
    selectedLineId,
    setSelectedLineId,
    lines,
    skus,
    equipments,
    runtimes,
    cips,
    cipTypes,
    forcedCipRules,
    postCipInspections,
    startProductionRun,
    stopForCIP,
    completeCIPCycle,
    verifyAndSetReady,
    updateSkuLimit,
    startPostCipSampling,
    updatePostCipQc,
    grantProductionPermission,
  } = useAppStore();

  const activeLine = lines.find((l) => l.id === selectedLineId) || lines[0];

  // Live timer tick every 5 seconds to update remaining hours & post-cip sampling countdown
  const tick = useCurrentTimestamp();

  // Tab switcher
  const [subTab, setSubTab] = useState<'OVERVIEW' | 'LINE_DETAIL' | 'FORCED_CIP' | 'CIP_MASTER'>('OVERVIEW');

  // Modal states
  const [isStartRunOpen, setIsStartRunOpen] = useState(false);
  const [targetLineIdForAction, setTargetLineIdForAction] = useState<string>(selectedLineId);
  const [selectedSkuToRun, setSelectedSkuToRun] = useState(skus[0]?.id || '');

  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [configSkuId, setConfigSkuId] = useState(skus[0]?.id || '');
  const [newLimitInput, setNewLimitInput] = useState(72);

  // Stop for CIP modal state
  const [isStopCipModalOpen, setIsStopCipModalOpen] = useState(false);
  const [selectedCipType, setSelectedCipType] = useState('CIP_AV');
  const [stopCipNote, setStopCipNote] = useState('');
  const [autoRecordLoss, setAutoRecordLoss] = useState(true);

  // Post-CIP QC inspection modal
  const [isQcModalOpen, setIsQcModalOpen] = useState(false);
  const [qcTargetInspectionId, setQcTargetInspectionId] = useState<string>('');
  const [qcResultInput, setQcResultInput] = useState<'PENDING' | 'PASSED' | 'FAILED'>('PENDING');
  const [qcNotesInput, setQcNotesInput] = useState('');
  const [qcInspectorInput, setQcInspectorInput] = useState('');

  // Notification / Feedback banner
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Active runtime & active CIP for the currently selected line
  const activeRunningRuntime = useMemo(() => {
    return runtimes.find((r) => r.lineId === selectedLineId && r.status === 'RUNNING');
  }, [runtimes, selectedLineId]);

  const latestRuntime = useMemo(() => {
    return runtimes.find((r) => r.lineId === selectedLineId);
  }, [runtimes, selectedLineId]);

  const activeCip = useMemo(() => {
    const ongoing = cips.find(
      (c) => c.lineId === selectedLineId && (c.status === 'IN_CIP' || c.status === 'POST_CIP_SAMPLING')
    );
    if (ongoing) return ongoing;
    return cips.find((c) => c.lineId === selectedLineId);
  }, [cips, selectedLineId]);

  const activeSku = skus.find((s) => s.id === (activeRunningRuntime?.skuId || latestRuntime?.skuId));

  // Current Post-CIP inspection for active line
  const activePostCipInspection = useMemo(() => {
    if (!activeCip) return null;
    return postCipInspections.find((i) => i.cipTrackingId === activeCip.id) || null;
  }, [postCipInspections, activeCip]);

  // Runtime calculation for active line
  const runtimeStatus = useMemo(() => {
    if (activeRunningRuntime && activeSku) {
      return computeRuntimeStatus(activeRunningRuntime.startedAt, activeRunningRuntime.limitHoursSnapshot, null, tick);
    }
    if (latestRuntime && latestRuntime.status === 'STOPPED_FOR_CIP' && activeSku) {
      return computeRuntimeStatus(latestRuntime.startedAt, latestRuntime.limitHoursSnapshot, latestRuntime.stoppedAt, tick);
    }
    return computeRuntimeStatus(null, null, null, tick);
  }, [activeRunningRuntime, latestRuntime, activeSku, tick]);

  // Plant-wide line status summary
  const plantSummary = useMemo(() => {
    let runningNormal = 0;
    let runningWarning = 0;
    let runningOverdue = 0;
    let inCip = 0;
    let inSampling = 0;
    let forcedCipDueCount = 0;

    lines.forEach((line) => {
      const lineCip = cips.find(
        (c) => c.lineId === line.id && (c.status === 'IN_CIP' || c.status === 'POST_CIP_SAMPLING')
      );
      if (lineCip?.status === 'IN_CIP') {
        inCip++;
      } else if (lineCip?.status === 'POST_CIP_SAMPLING') {
        inSampling++;
      } else {
        const lineRt = runtimes.find((r) => r.lineId === line.id && r.status === 'RUNNING');
        if (lineRt) {
          const sku = skus.find((s) => s.id === lineRt.skuId);
          const st = computeRuntimeStatus(lineRt.startedAt, lineRt.limitHoursSnapshot, null, tick);
          if (st.badgeLevel === 'OVERDUE') runningOverdue++;
          else if (st.badgeLevel === 'WARNING' || st.badgeLevel === 'DUE') runningWarning++;
          else runningNormal++;
        }
      }

      // Check forced CIP for this line
      const lineRules = forcedCipRules.filter((r) => r.lineId === line.id && r.active);
      const isDue = lineRules.some((r) => {
        if (!r.lastCipAt) return false;
        const daysSinceCip = Math.floor((tick - new Date(r.lastCipAt).getTime()) / (24 * 3600 * 1000));
        return daysSinceCip >= r.maxDaysSinceLastCip;
      });
      if (isDue) forcedCipDueCount++;
    });

    return {
      runningNormal,
      runningWarning,
      runningOverdue,
      inCip,
      inSampling,
      forcedCipDueCount,
    };
  }, [lines, runtimes, cips, skus, forcedCipRules, tick]);

  // Handlers
  const handleOpenStartRun = (lineId?: string) => {
    setTargetLineIdForAction(lineId || selectedLineId);
    setSelectedSkuToRun(skus[0]?.id || '');
    setIsStartRunOpen(true);
  };

  const handleConfirmStartRun = () => {
    const res = startProductionRun(targetLineIdForAction, selectedSkuToRun);
    if (!res.success) {
      setFeedback({ type: 'error', message: res.message || 'Lỗi khi bắt đầu phiên sản xuất!' });
      return;
    }
    const targetLine = lines.find((l) => l.id === targetLineIdForAction);
    setFeedback({
      type: 'success',
      message: `Đã khởi động phiên sản xuất mới trên ${targetLine?.name || targetLineIdForAction}!`,
    });
    setIsStartRunOpen(false);
  };

  const handleOpenStopCip = (lineId?: string) => {
    setTargetLineIdForAction(lineId || selectedLineId);
    setSelectedCipType('CIP_AV');
    setStopCipNote('');
    setAutoRecordLoss(true);
    setIsStopCipModalOpen(true);
  };

  const handleConfirmStopCIP = () => {
    const cipMaster = cipTypes.find((c) => c.code === selectedCipType);
    const cipTypeName = cipMaster?.name || selectedCipType;
    const finalNote = stopCipNote.trim() || `Dừng máy định kỳ thực hiện ${cipTypeName}`;

    const res = stopForCIP(targetLineIdForAction, finalNote, {
      autoRecordLoss,
      cipType: cipTypeName,
    });

    if (!res.success) {
      setFeedback({ type: 'error', message: res.message || 'Lỗi khi dừng máy chuyển CIP!' });
      return;
    }

    const targetLine = lines.find((l) => l.id === targetLineIdForAction);
    setFeedback({
      type: 'success',
      message: `Đã dừng máy ${targetLine?.name} và chuyển sang chu trình ${cipTypeName}.${
        autoRecordLoss ? ' Đã tự động tạo Loss Time.' : ''
      }`,
    });
    setIsStopCipModalOpen(false);
  };

  const handleConfirmCompleteCIP = (lineId: string) => {
    const res = completeCIPCycle(lineId);
    if (!res.success) {
      setFeedback({ type: 'error', message: res.message || 'Lỗi khi hoàn thành CIP!' });
      return;
    }

    // Auto start post-CIP sampling record
    const ongoingCip = cips.find((c) => c.lineId === lineId && c.status === 'IN_CIP');
    if (ongoingCip) {
      startPostCipSampling(ongoingCip.id, lineId, 60, currentUser.displayName);
    }

    const targetLine = lines.find((l) => l.id === lineId);
    setFeedback({
      type: 'success',
      message: `Đã hoàn tất bước tẩy rửa CIP trên ${targetLine?.name}! Đang trong giai đoạn lấy mẫu Post-CIP 60 phút chờ QC kiểm nghiệm.`,
    });
  };

  const handleOpenQcModal = (inspectionId: string) => {
    const ins = postCipInspections.find((i) => i.id === inspectionId);
    if (!ins) return;
    setQcTargetInspectionId(inspectionId);
    setQcResultInput(ins.qcResult);
    setQcNotesInput(ins.qcNotes || '');
    setQcInspectorInput(ins.inspectorName || currentUser.displayName);
    setIsQcModalOpen(true);
  };

  const handleSaveQcResult = (e: React.FormEvent) => {
    e.preventDefault();
    updatePostCipQc(qcTargetInspectionId, qcResultInput, qcNotesInput.trim(), qcInspectorInput.trim());
    setFeedback({
      type: 'success',
      message: `Đã cập nhật kết quả kiểm nghiệm QC (${qcResultInput === 'PASSED' ? 'ĐẠT' : qcResultInput === 'FAILED' ? 'KHÔNG ĐẠT' : 'CHỜ KẾT QUẢ'})!`,
    });
    setIsQcModalOpen(false);
  };

  const handleGrantPermission = (inspectionId: string) => {
    const res = grantProductionPermission(inspectionId, currentUser.displayName);
    if (!res.success) {
      setFeedback({ type: 'error', message: res.message || 'Lỗi khi cấp phép sản xuất!' });
      return;
    }
    setFeedback({
      type: 'success',
      message: 'Supervisor đã cấp phép sản xuất lại thành công! Line đã sẵn sàng cho phiên SKU mới.',
    });
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Toast Feedback */}
      {feedback && (
        <div
          className={`flex items-center justify-between p-4 rounded-2xl border text-xs font-semibold shadow-xs ${
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
          <button onClick={() => setFeedback(null)} className="text-gray-400 hover:text-gray-700 ml-2 p-1 cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Hero Header with Techcombank Style */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-red-600 to-[#E31837] p-6 text-white shadow-md">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-white animate-pulse"></span>
              <p className="text-xs font-semibold tracking-wider uppercase text-red-100">
                Runtime Tracking & CIP Hygiene
              </p>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">Theo dõi Chu kỳ Vận hành & Hạn CIP</h1>
            <p className="mt-1 text-xs md:text-sm text-red-100 max-w-2xl">
              Kiểm soát ngưỡng Runtime liên tục theo từng SKU (72h/48h), quy tắc CIP cưỡng bức thiết bị và quy trình kiểm nghiệm Post-CIP có xác nhận QC.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleOpenStartRun()}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-white text-[#E31837] hover:bg-red-50 rounded-xl shadow-md transition-all cursor-pointer"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>Khởi động SKU Mới</span>
            </button>
            <button
              onClick={() => handleOpenStopCip()}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-white/15 hover:bg-white/25 text-white border border-white/20 rounded-xl backdrop-blur-md transition-all cursor-pointer"
            >
              <RotateCw className="h-3.5 w-3.5" />
              <span>Dừng máy sang CIP</span>
            </button>
          </div>
        </div>

        {/* View mode sub-tabs */}
        <div className="mt-6 flex items-center gap-1 overflow-x-auto border-t border-white/20 pt-3">
          {[
            { id: 'OVERVIEW', label: 'Toàn xưởng (Tổng quan các Line)', icon: LayoutGrid },
            { id: 'LINE_DETAIL', label: `Chi tiết Line: ${activeLine.name}`, icon: Layers },
            { id: 'FORCED_CIP', label: 'Quy tắc CIP Cưỡng Bức', icon: AlertOctagon },
            { id: 'CIP_MASTER', label: 'Danh mục Loại CIP & Hóa chất', icon: FlaskConical },
          ].map((tab) => {
            const Icon = tab.icon;
            const isTabActive = subTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSubTab(tab.id as typeof subTab)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                  isTabActive
                    ? 'bg-white text-[#E31837] shadow-sm'
                    : 'text-red-100 hover:bg-white/10'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* SUB-TAB 1: PLANT-WIDE OVERVIEW */}
      {subTab === 'OVERVIEW' && (
        <div className="space-y-6">
          {/* Health Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-2xs">
              <div className="flex items-center justify-between text-emerald-700">
                <span className="text-xs font-medium">Bình thường (&lt;80%)</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="mt-2 text-2xl font-black text-gray-900">{plantSummary.runningNormal}</div>
              <div className="mt-1 text-[11px] text-gray-500">Chuyền chạy ổn định</div>
            </div>

            <div className="rounded-2xl border border-amber-100 bg-white p-4 shadow-2xs">
              <div className="flex items-center justify-between text-amber-700">
                <span className="text-xs font-medium">Cảnh báo (80-100%)</span>
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              </div>
              <div className="mt-2 text-2xl font-black text-amber-800">{plantSummary.runningWarning}</div>
              <div className="mt-1 text-[11px] text-amber-600">Sắp đến hạn CIP</div>
            </div>

            <div className="rounded-2xl border border-red-100 bg-white p-4 shadow-2xs">
              <div className="flex items-center justify-between text-red-700">
                <span className="text-xs font-medium">Quá hạn (&gt;100%)</span>
                <AlertOctagon className="h-4 w-4 text-red-600" />
              </div>
              <div className="mt-2 text-2xl font-black text-red-800">{plantSummary.runningOverdue}</div>
              <div className="mt-1 text-[11px] text-red-600">Cần dừng máy CIP ngay</div>
            </div>

            <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-2xs">
              <div className="flex items-center justify-between text-blue-700">
                <span className="text-xs font-medium">Đang CIP</span>
                <RotateCw className="h-4 w-4 text-blue-600" />
              </div>
              <div className="mt-2 text-2xl font-black text-blue-800">{plantSummary.inCip}</div>
              <div className="mt-1 text-[11px] text-blue-600">Đang tẩy rửa tuần hoàn</div>
            </div>

            <div className="col-span-2 md:col-span-1 rounded-2xl border border-purple-100 bg-white p-4 shadow-2xs">
              <div className="flex items-center justify-between text-purple-700">
                <span className="text-xs font-medium">Post-CIP Sampling</span>
                <FlaskConical className="h-4 w-4 text-purple-600" />
              </div>
              <div className="mt-2 text-2xl font-black text-purple-800">{plantSummary.inSampling}</div>
              <div className="mt-1 text-[11px] text-purple-600">Chờ kết quả xét nghiệm QC</div>
            </div>
          </div>

          {/* Plant-wide Lines Table / Cards */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Bảng theo dõi toàn bộ Chuyền chế biến & Đóng gói</h3>
                <p className="text-xs text-gray-500">Giám sát Runtime, hạn CIP và trạng thái lấy mẫu toàn xưởng</p>
              </div>
              <div className="text-xs text-gray-500 font-mono">
                Tổng cộng: <strong className="text-gray-900">{lines.length} Chuyền</strong>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {lines.map((line) => {
                const lineRt = runtimes.find((r) => r.lineId === line.id && r.status === 'RUNNING');
                const lastRt = runtimes.find((r) => r.lineId === line.id);
                const lineCip = cips.find(
                  (c) => c.lineId === line.id && (c.status === 'IN_CIP' || c.status === 'POST_CIP_SAMPLING')
                ) || cips.find((c) => c.lineId === line.id);

                const currentSku = skus.find((s) => s.id === (lineRt?.skuId || lastRt?.skuId));
                const rtStatus = lineRt && currentSku
                  ? computeRuntimeStatus(lineRt.startedAt, lineRt.limitHoursSnapshot, null, tick)
                  : lastRt?.status === 'STOPPED_FOR_CIP' && currentSku
                  ? computeRuntimeStatus(lastRt.startedAt, lastRt.limitHoursSnapshot, lastRt.stoppedAt, tick)
                  : computeRuntimeStatus(null, null, null, tick);

                const postCipIns = postCipInspections.find((i) => i.lineId === line.id && i.cipTrackingId === lineCip?.id);

                // Forced CIP rules check for line
                const lineRules = forcedCipRules.filter((r) => r.lineId === line.id && r.active);
                const hasForcedCipDue = lineRules.some((r) => {
                  if (!r.lastCipAt) return false;
                  const days = Math.floor((tick - new Date(r.lastCipAt).getTime()) / (24 * 3600 * 1000));
                  return days >= r.maxDaysSinceLastCip;
                });

                return (
                  <div
                    key={line.id}
                    className={`rounded-2xl border p-5 transition-all flex flex-col justify-between ${
                      lineCip?.status === 'IN_CIP'
                        ? 'border-blue-300 bg-blue-50/20'
                        : lineCip?.status === 'POST_CIP_SAMPLING'
                        ? 'border-purple-300 bg-purple-50/20'
                        : rtStatus.badgeLevel === 'OVERDUE'
                        ? 'border-red-300 bg-red-50/20'
                        : rtStatus.badgeLevel === 'WARNING' || rtStatus.badgeLevel === 'DUE'
                        ? 'border-amber-300 bg-amber-50/20'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div>
                      {/* Line header */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-gray-100 text-gray-700">
                              {line.code}
                            </span>
                            <h4 className="text-sm font-bold text-gray-900">{line.name}</h4>
                          </div>
                          <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                            <span>SKU: <strong className="text-gray-900">{currentSku?.name || 'Chưa chọn'}</strong></span>
                            <span>•</span>
                            <span>Hạn: <strong className="text-gray-700">{lineRt?.limitHoursSnapshot || currentSku?.limitHours || '--'}h</strong></span>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div>
                          {lineCip?.status === 'IN_CIP' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                              <RotateCw className="h-3 w-3 animate-spin" />
                              ĐANG CIP
                            </span>
                          ) : lineCip?.status === 'POST_CIP_SAMPLING' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                              <FlaskConical className="h-3 w-3" />
                              CHỜ MẪU QC
                            </span>
                          ) : rtStatus.badgeLevel === 'OVERDUE' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-full bg-red-50 text-red-700 border border-red-200">
                              <AlertOctagon className="h-3 w-3" />
                              QUÁ HẠN RUNTIME
                            </span>
                          ) : rtStatus.badgeLevel === 'WARNING' || rtStatus.badgeLevel === 'DUE' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                              <AlertTriangle className="h-3 w-3" />
                              SẮP HẾT GIỜ
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="h-3 w-3" />
                              BÌNH THƯỜNG
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Runtime Gauge Progress */}
                      <div className="mt-4 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500">
                            Runtime: <strong>{rtStatus.elapsedHours}h</strong> / {lineRt?.limitHoursSnapshot || currentSku?.limitHours || '--'}h
                          </span>
                          <span className="font-mono font-bold text-gray-900">{rtStatus.usagePercent}%</span>
                        </div>
                        <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden border border-gray-200/60">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              lineCip?.status === 'IN_CIP'
                                ? 'bg-blue-500'
                                : lineCip?.status === 'POST_CIP_SAMPLING'
                                ? 'bg-purple-500'
                                : rtStatus.badgeLevel === 'OVERDUE'
                                ? 'bg-red-600'
                                : rtStatus.badgeLevel === 'WARNING' || rtStatus.badgeLevel === 'DUE'
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(100, rtStatus.usagePercent)}%` }}
                          />
                        </div>
                      </div>

                      {/* Equipment Forced CIP alert if any */}
                      {hasForcedCipDue && (
                        <div className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800 font-medium">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                          <span>Có thiết bị đã đến hạn CIP cưỡng bức theo ngày!</span>
                        </div>
                      )}

                      {/* Sampling Status if in Post-CIP */}
                      {lineCip?.status === 'POST_CIP_SAMPLING' && postCipIns && (
                        <div className="mt-3 rounded-xl bg-purple-50 p-2.5 border border-purple-200 text-[11px] text-purple-900 space-y-1">
                          <div className="flex items-center justify-between font-bold">
                            <span>Trạng thái QC:</span>
                            <span
                              className={`px-2 py-0.5 rounded-md ${
                                postCipIns.qcResult === 'PASSED'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : postCipIns.qcResult === 'FAILED'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}
                            >
                              {postCipIns.qcResult === 'PASSED' ? 'ĐẠT' : postCipIns.qcResult === 'FAILED' ? 'KHÔNG ĐẠT' : 'CHỜ KẾT QUẢ'}
                            </span>
                          </div>
                          <div className="text-purple-700 text-[10px]">
                            {postCipIns.qcNotes || 'Đang nuôi cấy vi sinh & kiểm pH'}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Inline Quick Actions */}
                    <div className="mt-5 pt-3 border-t border-gray-100 flex flex-wrap items-center gap-2">
                      {lineCip?.status === 'IN_CIP' ? (
                        <button
                          onClick={() => handleConfirmCompleteCIP(line.id)}
                          className="flex-1 px-3 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all cursor-pointer shadow-xs"
                        >
                          Hoàn tất CIP → Lấy mẫu QC
                        </button>
                      ) : lineCip?.status === 'POST_CIP_SAMPLING' ? (
                        <div className="flex-1 flex items-center gap-2">
                          <button
                            onClick={() => postCipIns && handleOpenQcModal(postCipIns.id)}
                            className="flex-1 px-3 py-2 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-all cursor-pointer shadow-xs"
                          >
                            Nhập KQ QC
                          </button>
                          {postCipIns?.qcResult === 'PASSED' && !postCipIns.permissionGranted && (
                            <button
                              onClick={() => handleGrantPermission(postCipIns.id)}
                              className="px-3 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all cursor-pointer shadow-xs"
                            >
                              Cấp phép SX
                            </button>
                          )}
                        </div>
                      ) : lineRt ? (
                        <button
                          onClick={() => handleOpenStopCip(line.id)}
                          className="flex-1 px-3 py-2 text-xs font-bold bg-white border border-red-200 text-[#E31837] hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                        >
                          Dừng máy sang CIP
                        </button>
                      ) : (
                        <button
                          onClick={() => handleOpenStartRun(line.id)}
                          className="flex-1 px-3 py-2 text-xs font-bold bg-[#E31837] hover:bg-red-700 text-white rounded-xl transition-all cursor-pointer shadow-xs"
                        >
                          Bắt đầu SKU mới
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setSelectedLineId(line.id);
                          setSubTab('LINE_DETAIL');
                        }}
                        className="px-3 py-2 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all cursor-pointer"
                      >
                        Chi tiết →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: LINE DETAIL TELEMETRY & QC SAMPLING */}
      {subTab === 'LINE_DETAIL' && (
        <div className="space-y-6">
          {/* Line Selector Bar */}
          <div className="flex items-center justify-between bg-white p-3.5 rounded-2xl border border-gray-200 shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-500">Đang xem:</span>
              <span className="text-sm font-black text-gray-900">{activeLine.name}</span>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {lines.map((l) => (
                <button
                  key={l.id}
                  onClick={() => setSelectedLineId(l.id)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    selectedLineId === l.id
                      ? 'bg-[#E31837] text-white shadow-xs'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {l.code}
                </button>
              ))}
            </div>
          </div>

          {/* Main Gauge & Actions */}
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-2xs space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Telemetry Gauge */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div>
                    <span className="text-xs text-gray-400 font-semibold">SKU đang chạy:</span>
                    <h3 className="text-xl font-bold text-gray-900 mt-0.5">
                      {activeSku ? activeSku.name : 'Chưa có phiên chạy'}
                    </h3>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-gray-400 font-semibold">Tiến độ Runtime:</span>
                    <div className="text-xl font-black text-gray-900 font-mono">
                      {runtimeStatus.usagePercent}%
                    </div>
                  </div>
                </div>

                <div className="h-4 w-full bg-gray-100 rounded-full overflow-hidden p-0.5 border border-gray-200">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      runtimeStatus.badgeLevel === 'OVERDUE'
                        ? 'bg-red-600'
                        : runtimeStatus.badgeLevel === 'WARNING' || runtimeStatus.badgeLevel === 'DUE'
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, runtimeStatus.usagePercent)}%` }}
                  />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="text-[11px] text-gray-500">Đã chạy</div>
                    <div className="text-lg font-black text-gray-900 font-mono mt-0.5">
                      {runtimeStatus.elapsedHours}h
                    </div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="text-[11px] text-gray-500">Còn lại</div>
                    <div className="text-lg font-black text-emerald-700 font-mono mt-0.5">
                      {runtimeStatus.remainingHours}h
                    </div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="text-[11px] text-gray-500">Giới hạn SKU</div>
                    <div className="text-lg font-black text-gray-700 font-mono mt-0.5">
                      {activeRunningRuntime?.limitHoursSnapshot || activeSku?.limitHours || '--'}h
                    </div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="text-[11px] text-gray-500">Hạn CIP dự kiến</div>
                    <div className="text-xs font-bold text-[#E31837] font-mono mt-1 truncate">
                      {runtimeStatus.expectedCipTime}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Sidebar */}
              <div className="rounded-2xl bg-gray-50 p-5 border border-gray-200 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Thao tác Vận hành Line
                  </h4>
                  <p className="text-xs text-gray-500 mt-1">
                    Khởi động phiên SKU, dừng máy sang CIP hoặc chốt kiểm nghiệm.
                  </p>

                  <div className="mt-4 space-y-2.5">
                    {activeRunningRuntime ? (
                      <button
                        onClick={() => handleOpenStopCip(selectedLineId)}
                        className="w-full flex items-center justify-center gap-2 py-3 px-4 text-xs font-bold text-[#E31837] bg-white hover:bg-red-50 border border-red-200 rounded-xl transition-all cursor-pointer shadow-xs"
                      >
                        <RotateCw className="h-4 w-4" />
                        <span>Dừng máy chuyển sang CIP</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleOpenStartRun(selectedLineId)}
                        className="w-full flex items-center justify-center gap-2 py-3 px-4 text-xs font-bold text-white bg-[#E31837] hover:bg-red-700 rounded-xl transition-all cursor-pointer shadow-xs"
                      >
                        <Play className="h-4 w-4 fill-current" />
                        <span>Khởi động Phiên SKU Mới</span>
                      </button>
                    )}

                    {activeCip?.status === 'IN_CIP' && (
                      <button
                        onClick={() => handleConfirmCompleteCIP(selectedLineId)}
                        className="w-full flex items-center justify-center gap-2 py-3 px-4 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all cursor-pointer shadow-xs"
                      >
                        <Check className="h-4 w-4" />
                        <span>Hoàn tất CIP → Lấy mẫu QC</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-200 text-[11px] text-gray-500">
                  Line: <strong className="text-gray-900">{activeLine.code}</strong> • Trạng thái: {activeCip?.status || 'SẴN SÀNG'}
                </div>
              </div>
            </div>

            {/* Post-CIP Sampling & QC Results Box (Module 9) */}
            <div className="rounded-2xl border border-purple-200 bg-purple-50/40 p-5 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-purple-200 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-purple-100 text-purple-700">
                    <FlaskConical className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-purple-950">
                      Lấy mẫu & Kiểm nghiệm QC Sau CIP (Post-CIP Sampling)
                    </h4>
                    <p className="text-xs text-purple-700">
                      Thời gian chờ 60 phút là hướng dẫn thực hành lấy mẫu vi sinh & đo pH; <strong>KHÔNG TỰ ĐỘNG</strong> tính là ĐẠT hoặc tự động cho phép sản xuất.
                    </p>
                  </div>
                </div>

                {activePostCipInspection && (
                  <span
                    className={`px-3 py-1 text-xs font-bold rounded-full ${
                      activePostCipInspection.qcResult === 'PASSED'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : activePostCipInspection.qcResult === 'FAILED'
                        ? 'bg-red-100 text-red-800 border border-red-300'
                        : 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                    }`}
                  >
                    Kết quả QC: {activePostCipInspection.qcResult === 'PASSED' ? 'ĐẠT' : activePostCipInspection.qcResult === 'FAILED' ? 'KHÔNG ĐẠT' : 'CHỜ KẾT QUẢ'}
                  </span>
                )}
              </div>

              {activePostCipInspection ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="p-3 bg-white rounded-xl border border-purple-100">
                    <span className="text-gray-500 font-medium">Bắt đầu lấy mẫu:</span>
                    <div className="font-bold text-gray-900 mt-1">
                      {formatDateTime(activePostCipInspection.samplingStartedAt)}
                    </div>
                    <span className="text-[10px] text-gray-400">Thời gian chờ chuẩn: 60 phút</span>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-purple-100">
                    <span className="text-gray-500 font-medium">Người kiểm nghiệm QC:</span>
                    <div className="font-bold text-gray-900 mt-1">
                      {activePostCipInspection.inspectorName || 'Chưa cập nhật'}
                    </div>
                    <span className="text-[10px] text-purple-700 font-medium">
                      Ghi chú: {activePostCipInspection.qcNotes || 'Đang nuôi cấy'}
                    </span>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-purple-100 flex flex-col justify-between">
                    <div>
                      <span className="text-gray-500 font-medium">Cấp phép sản xuất:</span>
                      <div className="font-bold text-gray-900 mt-1">
                        {activePostCipInspection.permissionGranted ? (
                          <span className="text-emerald-700">✓ Đã duyệt bởi {activePostCipInspection.approvedBy}</span>
                        ) : (
                          <span className="text-amber-700">Chưa cấp phép</span>
                        )}
                      </div>
                    </div>

                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => handleOpenQcModal(activePostCipInspection.id)}
                        className="px-2.5 py-1 text-xs font-bold bg-purple-600 text-white rounded-lg hover:bg-purple-700 cursor-pointer"
                      >
                        Nhập KQ QC
                      </button>
                      {activePostCipInspection.qcResult === 'PASSED' && !activePostCipInspection.permissionGranted && (
                        <button
                          onClick={() => handleGrantPermission(activePostCipInspection.id)}
                          className="px-2.5 py-1 text-xs font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 cursor-pointer"
                        >
                          Cấp phép SX
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-white rounded-xl border border-purple-100 text-center text-xs text-gray-500">
                  Chưa có chu trình CIP nào đang trong giai đoạn lấy mẫu Post-CIP trên Line này.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: FORCED CIP RULES */}
      {subTab === 'FORCED_CIP' && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Quy tắc CIP Cưỡng Bức Thiết Bị (Forced CIP Rules)</h3>
              <p className="text-xs text-gray-500">
                Quy định số ngày tối đa sau CIP và số ngày dừng máy tối đa trước khi bắt buộc phải thực hiện CIP lại.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-gray-200 rounded-xl overflow-hidden">
              <thead className="bg-gray-50 text-gray-600 font-bold border-b border-gray-200">
                <tr>
                  <th className="p-3">Mã TB</th>
                  <th className="p-3">Chuyền</th>
                  <th className="p-3">Ngày Tối Đa Sau CIP</th>
                  <th className="p-3">Ngày Dừng Tối Đa</th>
                  <th className="p-3">Loại CIP Bắt Buộc</th>
                  <th className="p-3">Lần CIP Cuối</th>
                  <th className="p-3">Trạng Thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {forcedCipRules.map((r) => {
                  const eq = equipments.find((e) => e.id === r.equipmentId);
                  const line = lines.find((l) => l.id === r.lineId);
                  const daysSinceCip = r.lastCipAt
                    ? Math.floor((tick - new Date(r.lastCipAt).getTime()) / (24 * 3600 * 1000))
                    : null;
                  const isOverdue = daysSinceCip !== null && daysSinceCip >= r.maxDaysSinceLastCip;

                  return (
                    <tr key={r.id} className="hover:bg-gray-50/60">
                      <td className="p-3">
                        <span className="font-bold text-gray-900">{r.equipmentCode}</span>
                        <div className="text-[10px] text-gray-500">{eq?.name}</div>
                      </td>
                      <td className="p-3 text-gray-700">{line?.code}</td>
                      <td className="p-3 font-mono font-bold text-gray-900">{r.maxDaysSinceLastCip} ngày</td>
                      <td className="p-3 font-mono font-bold text-gray-900">{r.maxIdleDaysWithoutCip} ngày</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold text-[10px]">
                          {r.requiredCipType}
                        </span>
                      </td>
                      <td className="p-3 text-gray-600">
                        {r.lastCipAt ? `${daysSinceCip} ngày trước` : 'Chưa đủ dữ liệu'}
                      </td>
                      <td className="p-3">
                        {daysSinceCip === null ? (
                          <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-bold text-[10px]">
                            Chưa đủ dữ liệu
                          </span>
                        ) : isOverdue ? (
                          <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold text-[10px]">
                            ĐẾN HẠN CIP
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[10px]">
                            Bình thường
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: CIP MASTER & CHEMICALS */}
      {subTab === 'CIP_MASTER' && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Danh mục Loại CIP & Nồng độ Hóa chất Chuẩn</h3>
              <p className="text-xs text-gray-500">
                Master quy trình CIP, thời gian định mức và hóa chất yêu cầu (NaOH, HNO3, Oxonia).
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cipTypes.map((ct) => (
              <div key={ct.code} className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="px-2 py-0.5 rounded bg-red-50 text-[#E31837] font-bold text-[10px]">
                      {ct.code}
                    </span>
                    <h4 className="font-bold text-sm text-gray-900 mt-1">{ct.name}</h4>
                  </div>
                  <span className="text-xs font-mono font-bold text-gray-700 bg-white px-2.5 py-1 rounded-lg border border-gray-200">
                    {ct.standardDurationMin} - {ct.standardDurationMax} phút
                  </span>
                </div>

                <p className="text-xs text-gray-600">{ct.description}</p>

                {/* Chemicals */}
                <div>
                  <div className="text-[11px] font-bold text-gray-700">Hóa chất sử dụng:</div>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {ct.chemicals.length > 0 ? (
                      ct.chemicals.map((ch, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded-md bg-white border border-gray-200 text-gray-700 text-[11px]">
                          <strong>{ch.chemicalName}</strong>: {ch.concentration}{ch.unit}
                        </span>
                      ))
                    ) : (
                      <span className="text-gray-400 text-xs italic">Không dùng hóa chất (Nước nóng)</span>
                    )}
                  </div>
                </div>

                {/* Reset rules */}
                <div className="text-[10px] text-gray-500 border-t border-gray-200 pt-2 flex items-center gap-3">
                  <span>Reset SKU: <strong>{ct.resetRules.resetsSkuRuntime ? 'Có' : 'Không'}</strong></span>
                  <span>•</span>
                  <span>Lấy mẫu QC: <strong>{ct.requiredSampling ? `Có (${ct.samplingWaitMinutes}m)` : 'Không'}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: Start Production Run */}
      {isStartRunOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900">Khởi động Phiên Sản xuất SKU Mới</h3>
              <button onClick={() => setIsStartRunOpen(false)} className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700">Chuyền sản xuất</label>
                <select
                  value={targetLineIdForAction}
                  onChange={(e) => setTargetLineIdForAction(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 p-2.5 font-bold"
                >
                  {lines.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.code} - {l.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700">Chọn sản phẩm (SKU)</label>
                <select
                  value={selectedSkuToRun}
                  onChange={(e) => setSelectedSkuToRun(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-200 bg-white p-2.5 font-bold focus:ring-2 focus:ring-[#E31837]"
                >
                  {skus.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code}) - Giới hạn {s.limitHours}h
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsStartRunOpen(false)}
                className="px-4 py-2 text-xs font-bold text-gray-600 bg-gray-100 rounded-xl"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmStartRun}
                className="px-5 py-2 text-xs font-bold text-white bg-[#E31837] hover:bg-red-700 rounded-xl shadow-xs"
              >
                Bắt đầu Chạy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Stop For CIP */}
      {isStopCipModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900">Dừng máy chuyển sang CIP</h3>
              <button onClick={() => setIsStopCipModalOpen(false)} className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700">Chuyền thực hiện</label>
                <div className="mt-1 p-2 bg-gray-50 rounded-xl font-bold text-gray-900">
                  {lines.find((l) => l.id === targetLineIdForAction)?.name}
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700">Chọn quy trình CIP</label>
                <select
                  value={selectedCipType}
                  onChange={(e) => setSelectedCipType(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-200 bg-white p-2.5 font-bold focus:ring-2 focus:ring-[#E31837]"
                >
                  {cipTypes.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name} ({c.standardDurationMin}-{c.standardDurationMax} phút)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700">Ghi chú hiện trường</label>
                <input
                  type="text"
                  value={stopCipNote}
                  onChange={(e) => setStopCipNote(e.target.value)}
                  placeholder="Lý do dừng CIP, ghi chú đặc biệt..."
                  className="mt-1 w-full rounded-xl border border-gray-200 p-2.5"
                />
              </div>

              <label className="flex items-center gap-2 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoRecordLoss}
                  onChange={(e) => setAutoRecordLoss(e.target.checked)}
                  className="rounded text-[#E31837] focus:ring-[#E31837]"
                />
                <span className="font-semibold text-gray-700">Tự động ghi nhận sự kiện dừng máy Loss Time (CIP)</span>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsStopCipModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-gray-600 bg-gray-100 rounded-xl"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmStopCIP}
                className="px-5 py-2 text-xs font-bold text-white bg-[#E31837] hover:bg-red-700 rounded-xl shadow-xs"
              >
                Xác nhận Dừng máy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Input Post-CIP QC Result */}
      {isQcModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900">Cập nhật Kết quả Kiểm nghiệm QC</h3>
              <button onClick={() => setIsQcModalOpen(false)} className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveQcResult} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700">Đánh giá kết quả vi sinh & hóa lý</label>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  {[
                    { id: 'PENDING', label: 'Chờ KQ' },
                    { id: 'PASSED', label: 'ĐẠT' },
                    { id: 'FAILED', label: 'LỖI' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setQcResultInput(opt.id as typeof qcResultInput)}
                      className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                        qcResultInput === opt.id
                          ? opt.id === 'PASSED'
                            ? 'bg-emerald-600 text-white'
                            : opt.id === 'FAILED'
                            ? 'bg-red-600 text-white'
                            : 'bg-yellow-500 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700">Tên chuyên viên QA kiểm nghiệm</label>
                <input
                  type="text"
                  value={qcInspectorInput}
                  onChange={(e) => setQcInspectorInput(e.target.value)}
                  placeholder="Tên nhân viên QA..."
                  className="mt-1 w-full rounded-xl border border-gray-200 p-2.5"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700">Ghi chú kết quả test (pH, vi sinh...)</label>
                <textarea
                  rows={2}
                  value={qcNotesInput}
                  onChange={(e) => setQcNotesInput(e.target.value)}
                  placeholder="pH nước tráng đạt 7.0, test nhanh ATP âm tính..."
                  className="mt-1 w-full rounded-xl border border-gray-200 p-2.5"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsQcModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 bg-gray-100 rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-xs"
                >
                  Lưu Kết quả
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
