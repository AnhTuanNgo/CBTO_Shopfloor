'use client';

import React, { useState, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import { ShiftId, ShiftHandover } from '@/lib/types';
import { SHIFTS, formatDateTime, formatDateVN, calculateImpactMetrics } from '@/lib/date-utils';
import { useCurrentTimestamp } from '@/hooks/use-current-time';
import {
  ArrowLeftRight,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ListTodo,
  ShieldCheck,
  Send,
  Eye,
  X,
  FileText,
} from 'lucide-react';

export function HandoverModule() {
  const {
    currentUser,
    selectedLineId,
    selectedShiftId,
    selectedProductionDate,
    lines,
    skus,
    runtimes,
    cips,
    abnormalLogs,
    lossLogs,
    handovers,
    createHandover,
    confirmReceiveHandover,
  } = useAppStore();

  const activeLine = lines.find((l) => l.id === selectedLineId);

  // New Handover Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [incomingShift, setIncomingShift] = useState<ShiftId>(() => {
    if (selectedShiftId === 'SHIFT_A') return 'SHIFT_B';
    if (selectedShiftId === 'SHIFT_B') return 'SHIFT_C';
    return 'SHIFT_A';
  });

  const [handoverNote, setHandoverNote] = useState('');
  const [tasks, setTasks] = useState<{ id: string; task: string; isCompleted: boolean }[]>([
    { id: 'T1', task: 'Kiểm tra mức bồn nước lạnh giải nhiệt Cooling Water', isCompleted: true },
    { id: 'T2', task: 'Theo dõi phốt cơ khí bồn nấu số 1 sau mẻ ớt', isCompleted: false },
    { id: 'T3', task: 'Chuẩn bị hóa chất xút nồng độ 2.0% cho chu kỳ CIP tiếp theo', isCompleted: false },
  ]);
  const [newTaskInput, setNewTaskInput] = useState('');

  // Auto-gathered live snapshot for draft
  const activeAbnormals = useMemo(() => {
    return abnormalLogs.filter((a) => a.lineId === selectedLineId && !a.acknowledgedAt);
  }, [abnormalLogs, selectedLineId]);

  const ongoingLosses = useMemo(() => {
    return lossLogs.filter((l) => l.lineId === selectedLineId && l.endedAt === null);
  }, [lossLogs, selectedLineId]);

  const nowMs = useCurrentTimestamp();

  const ongoingProvisionalLossMinutes = useMemo(() => {
    let sum = 0;
    ongoingLosses.forEach((l) => {
      (l.impacts || []).forEach((imp) => {
        const m = calculateImpactMetrics(imp, nowMs);
        if (m.convertedLossMinutes !== null) {
          sum += m.convertedLossMinutes;
        }
      });
    });
    return sum;
  }, [ongoingLosses, nowMs]);

  const activeRt = useMemo(() => {
    return runtimes.find((r) => r.lineId === selectedLineId && r.status === 'RUNNING');
  }, [runtimes, selectedLineId]);

  const activeCip = useMemo(() => {
    return cips.find((c) => c.lineId === selectedLineId);
  }, [cips, selectedLineId]);

  const currentSku = skus.find((s) => s.id === activeRt?.skuId);

  let remainingHours = 0;
  if (activeRt) {
    const sTime = new Date(activeRt.startedAt).getTime();
    const elapsed = ((nowMs || sTime) - sTime) / 3600000;
    remainingHours = Math.max(0, +(activeRt.limitHoursSnapshot - elapsed).toFixed(1));
  }

  const handleAddTask = () => {
    if (!newTaskInput.trim()) return;
    setTasks((prev) => [
      ...prev,
      {
        id: `T${Date.now()}`,
        task: newTaskInput.trim(),
        isCompleted: false,
      },
    ]);
    setNewTaskInput('');
  };

  const handleToggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isCompleted: !t.isCompleted } : t))
    );
  };

  const handleDeleteTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const handleSubmitHandover = (e: React.FormEvent) => {
    e.preventDefault();
    if (!handoverNote.trim()) return;

    createHandover({
      lineId: selectedLineId,
      productionDate: selectedProductionDate,
      outgoingShiftId: selectedShiftId,
      incomingShiftId: incomingShift,
      content: handoverNote.trim(),
      snapshot: {
        activeAbnormalitiesCount: activeAbnormals.length,
        ongoingLossCount: ongoingLosses.length,
        remainingRuntimeHours: remainingHours,
        skuName: currentSku?.name || 'Chưa chạy SKU',
        cipStatus: activeCip?.status || 'READY',
      },
      pendingTasks: tasks,
    });

    setIsModalOpen(false);
    setHandoverNote('');
  };

  const lineHandovers = useMemo(() => {
    return handovers.filter((h) => h.lineId === selectedLineId);
  }, [handovers, selectedLineId]);

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-[#E31837]">
              <ArrowLeftRight className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#202124]">Giao Ca Điện Tử (Shift Handover)</h2>
              <p className="mt-0.5 text-xs text-gray-500">
                Tự động gom Bất thường, Loss đang phát sinh, Runtime & CIP thành biên bản bàn giao bất biến trên {activeLine?.name}
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-[#E31837] px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-red-700 transition-all cursor-pointer active:scale-95"
        >
          <Plus className="h-4 w-4" />
          <span>Lập Biên bản Bàn giao Ca</span>
        </button>
      </div>

      {/* Auto-Draft Snapshot Banner */}
      <div className="rounded-3xl border border-gray-200/80 bg-white p-6 space-y-4 shadow-xs">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[#16865B]" />
            Dữ liệu Hiện trường gom tự động cho Ca {selectedShiftId.replace('SHIFT_', '')} ({activeLine?.name})
          </span>
          <span className="text-[11px] text-gray-400 font-medium">Thời điểm gom: Thời gian thực</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="rounded-2xl bg-gray-50 p-3.5 border border-gray-100">
            <span className="text-gray-500 text-[11px] font-medium block">Bất thường chưa xử lý</span>
            <span className="text-xl font-bold font-mono text-[#D97706] mt-1 block">
              {activeAbnormals.length}
            </span>
            <span className="text-[10px] text-gray-400">tồn đọng cần bàn giao</span>
          </div>

          <div className="rounded-2xl bg-gray-50 p-3.5 border border-gray-100">
            <span className="text-gray-500 text-[11px] font-medium block">Sự cố đang phát sinh</span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-bold font-mono text-[#C62828]">
                {ongoingLosses.length} lần
              </span>
              <span className="text-[10px] text-[#D97706] font-mono">
                ({ongoingProvisionalLossMinutes}m tạm tính)
              </span>
            </div>
            <span className="text-[10px] text-gray-400">Đang theo dõi ảnh hưởng</span>
          </div>

          <div className="rounded-2xl bg-gray-50 p-3.5 border border-gray-100">
            <span className="text-gray-500 text-[11px] font-medium block">Runtime còn lại</span>
            <span className="text-xl font-bold font-mono text-[#202124] mt-1 block">
              {remainingHours}h
            </span>
            <span className="text-[10px] text-gray-400 truncate block">SKU {currentSku?.name || 'N/A'}</span>
          </div>

          <div className="rounded-2xl bg-gray-50 p-3.5 border border-gray-100">
            <span className="text-gray-500 text-[11px] font-medium block">Trạng thái CIP</span>
            <span className="text-sm font-bold text-blue-700 mt-1.5 block">
              {activeCip?.status || 'READY'}
            </span>
            <span className="text-[10px] text-gray-400">Post-CIP 60m nếu có</span>
          </div>
        </div>
      </div>

      {/* Handovers History List */}
      <div className="space-y-3">
        <h3 className="font-bold text-sm text-[#202124]">
          Lịch sử Bàn giao / Nhận ca trên {activeLine?.name} ({lineHandovers.length})
        </h3>

        {lineHandovers.length === 0 ? (
          <div className="rounded-2xl border border-gray-200/80 bg-white p-10 text-center text-xs text-gray-400">
            Chưa có biên bản giao ca nào trên line này. Bấm &quot;Lập Biên bản Bàn giao Ca&quot; để bắt đầu.
          </div>
        ) : (
          lineHandovers.map((h) => {
            const isReceived = !!h.receivedAt;
            const canReceive =
              (currentUser.role === 'LINE_LEADER' || currentUser.role === 'SUPERVISOR') && !isReceived;

            return (
              <div
                key={h.id}
                className="rounded-2xl border border-gray-200/80 bg-white p-5 space-y-3.5 transition-all shadow-xs hover:border-gray-300"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-red-50 border border-red-200 px-3 py-0.5 text-xs font-bold text-[#E31837]">
                      {h.outgoingShiftId.replace('SHIFT_', 'Ca ')} → {h.incomingShiftId.replace('SHIFT_', 'Ca ')}
                    </span>
                    <span className="text-xs text-gray-600 font-medium">Ngày {formatDateVN(h.productionDate)}</span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Clock className="h-3.5 w-3.5 text-gray-400" />
                    <span>Giao lúc: {formatDateTime(h.handedAt)}</span>
                  </div>
                </div>

                {/* Content */}
                <p className="text-xs text-gray-800 leading-relaxed font-medium">{h.content}</p>

                {/* Snapshot badges */}
                <div className="flex flex-wrap items-center gap-2 text-[11px] bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <span className="text-gray-500 font-semibold">Snapshot thời điểm giao:</span>
                  <span className="text-[#D97706] font-bold">{h.snapshot.activeAbnormalitiesCount} bất thường</span>
                  <span>·</span>
                  <span className="text-[#C62828] font-bold">{h.snapshot.ongoingLossCount} lần dừng đang mở</span>
                  <span>·</span>
                  <span className="text-[#16865B] font-bold">{h.snapshot.remainingRuntimeHours}h Runtime ({h.snapshot.skuName})</span>
                  <span>·</span>
                  <span className="text-blue-700 font-bold">CIP: {h.snapshot.cipStatus}</span>
                </div>

                {/* Pending Tasks */}
                {h.pendingTasks.length > 0 && (
                  <div className="space-y-1.5 text-xs">
                    <span className="text-gray-500 font-bold flex items-center gap-1 text-[11px]">
                      <ListTodo className="h-3.5 w-3.5 text-gray-400" /> Công việc tồn bàn giao:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                      {h.pendingTasks.map((t) => (
                        <div
                          key={t.id}
                          className="flex items-center gap-2 text-gray-700 text-[11px] bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100"
                        >
                          <span className={t.isCompleted ? 'text-[#16865B] font-bold' : 'text-gray-400'}>
                            {t.isCompleted ? '✓' : '○'}
                          </span>
                          <span className={t.isCompleted ? 'line-through text-gray-400' : 'font-medium'}>{t.task}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Signatures & Confirmations */}
                <div className="pt-3 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="text-gray-500">
                    Người giao: <strong className="text-[#202124]">{h.outgoingUserName}</strong>
                  </div>

                  <div className="flex items-center gap-2">
                    {isReceived ? (
                      <div className="flex items-center gap-1.5 text-[#16865B] text-xs font-semibold">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>
                          Đã nhận ca bởi <strong>{h.incomingUserName}</strong> ({formatDateTime(h.receivedAt!)})
                        </span>
                      </div>
                    ) : canReceive ? (
                      <button
                        onClick={() => confirmReceiveHandover(h.id)}
                        className="rounded-xl bg-[#16865B] px-4 py-1.5 font-bold text-white hover:bg-emerald-700 shadow-sm cursor-pointer text-xs active:scale-95"
                      >
                        Xác nhận Nhận Ca ({currentUser.displayName})
                      </button>
                    ) : (
                      <span className="text-[#D97706] text-[11px] italic font-medium">
                        Chờ Tổ trưởng ca nhận ({h.incomingShiftId.replace('SHIFT_', 'Ca ')}) ký nhận
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Handover Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-xl rounded-3xl border border-gray-200 bg-white shadow-2xl p-6 space-y-4 my-6 text-xs">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-bold text-[#202124] text-base">Lập Biên bản Bàn giao Ca Điện tử</h3>
                <p className="text-gray-500 text-xs">
                  {activeLine?.name} · {selectedShiftId.replace('SHIFT_', 'Ca ')} → Ca nhận tiếp theo
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-700 rounded-full p-1 cursor-pointer hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitHandover} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-bold mb-1.5">Ca bàn giao (Hiện tại)</label>
                  <input
                    type="text"
                    disabled
                    value={selectedShiftId.replace('SHIFT_', 'Ca ')}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-gray-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1.5">Ca tiếp nhận</label>
                  <select
                    value={incomingShift}
                    onChange={(e) => setIncomingShift(e.target.value as ShiftId)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-[#202124] font-bold focus:border-[#E31837] focus:outline-none"
                  >
                    {SHIFTS.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.displayTime})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1.5">
                  Nội dung tóm tắt bàn giao ca <span className="text-[#E31837]">*</span>
                </label>
                <textarea
                  rows={3}
                  value={handoverNote}
                  onChange={(e) => setHandoverNote(e.target.value)}
                  placeholder="Ghi nhận tình trạng thiết bị, tiến độ mẻ, vấn đề tồn đọng cần lưu ý..."
                  className="w-full rounded-xl border border-gray-200 bg-white p-3 text-[#202124] placeholder-gray-400 focus:border-[#E31837] focus:outline-none"
                  required
                />
              </div>

              {/* Tasks checklist */}
              <div className="space-y-2">
                <label className="block text-gray-700 font-bold">Danh mục công việc tồn bàn giao</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTaskInput}
                    onChange={(e) => setNewTaskInput(e.target.value)}
                    placeholder="Thêm hạng mục công việc tồn ca sau tiếp tục..."
                    className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-[#202124] placeholder-gray-400 focus:border-[#E31837] focus:outline-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTask();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddTask}
                    className="rounded-xl bg-gray-100 px-4 py-2 font-bold text-gray-700 hover:bg-gray-200 cursor-pointer"
                  >
                    Thêm
                  </button>
                </div>

                <div className="max-h-32 overflow-y-auto space-y-1.5 pt-1">
                  {tasks.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between rounded-xl bg-gray-50 p-2.5 border border-gray-100 text-gray-700"
                    >
                      <button
                        type="button"
                        onClick={() => handleToggleTask(t.id)}
                        className="flex items-center gap-2 text-left cursor-pointer"
                      >
                        <span className={t.isCompleted ? 'text-[#16865B] font-bold' : 'text-gray-400 font-bold'}>
                          {t.isCompleted ? '✓' : '○'}
                        </span>
                        <span className={t.isCompleted ? 'line-through text-gray-400' : 'font-medium'}>{t.task}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTask(t.id)}
                        className="text-gray-400 hover:text-[#C62828] text-xs px-2 cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-gray-100 pt-3.5 flex items-center justify-between">
                <span className="text-gray-500 text-[11px]">
                  Người lập bàn giao: <strong className="text-[#202124]">{currentUser.displayName}</strong>
                </span>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="rounded-xl border border-gray-200 px-4 py-2 font-bold text-gray-700 hover:bg-gray-100 cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-[#E31837] px-5 py-2 font-bold text-white hover:bg-red-700 shadow-sm cursor-pointer active:scale-95"
                  >
                    Xác nhận Bàn giao Ca
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
