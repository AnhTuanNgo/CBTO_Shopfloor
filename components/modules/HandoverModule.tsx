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

  // Selected detail view
  const [selectedHandoverId, setSelectedHandoverId] = useState<string | null>(null);

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
      { id: `T_${Date.now()}`, task: newTaskInput.trim(), isCompleted: false },
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
    if (!handoverNote.trim()) {
      alert('Vui lòng nhập nội dung tóm tắt bàn giao ca!');
      return;
    }

    createHandover({
      lineId: selectedLineId,
      outgoingShiftId: selectedShiftId,
      incomingShiftId: incomingShift,
      content: handoverNote.trim(),
      pendingTasks: tasks,
    });

    setIsModalOpen(false);
    setHandoverNote('');
  };

  const lineHandovers = useMemo(() => {
    return handovers.filter((h) => h.lineId === selectedLineId);
  }, [handovers, selectedLineId]);

  const detailItem = handovers.find((h) => h.id === selectedHandoverId);

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <div>
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5 text-orange-400" />
            <h2 className="text-base font-bold text-white">Giao Ca Điện Tử (Shift Handover)</h2>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Tự động tổng hợp Bất thường, Loss đang phát sinh, Runtime & CIP thành biên bản bàn giao bất biến (AC-15)
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-orange-950/40 hover:bg-orange-500 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Lập Biên bản Bàn giao Ca</span>
        </button>
      </div>

      {/* Auto-Draft Snapshot Banner */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            Dữ liệu Hiện trường gom tự động cho Ca {selectedShiftId.replace('SHIFT_', '')} ({activeLine?.name})
          </span>
          <span className="text-[11px] text-slate-400">Thời điểm gom: Thời gian thực</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="rounded-xl bg-slate-850 p-3 border border-slate-800">
            <span className="text-slate-400 text-[11px] block">Bất thường chưa xử lý</span>
            <span className="text-xl font-bold font-mono text-amber-400 mt-1 block">
              {activeAbnormals.length}
            </span>
            <span className="text-[10px] text-slate-400">tồn đọng cần bàn giao</span>
          </div>

          <div className="rounded-xl bg-slate-850 p-3 border border-slate-800">
            <span className="text-slate-400 text-[11px] block">Sự cố đang phát sinh</span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-bold font-mono text-rose-400">
                {ongoingLosses.length} lần
              </span>
              <span className="text-[10px] text-amber-300 font-mono">
                ({ongoingProvisionalLossMinutes}m tạm tính)
              </span>
            </div>
            <span className="text-[10px] text-slate-400">Đang theo dõi ảnh hưởng</span>
          </div>

          <div className="rounded-xl bg-slate-850 p-3 border border-slate-800">
            <span className="text-slate-400 text-[11px] block">Runtime còn lại</span>
            <span className="text-xl font-bold font-mono text-white mt-1 block">
              {remainingHours}h
            </span>
            <span className="text-[10px] text-slate-400">SKU {currentSku?.name || 'N/A'}</span>
          </div>

          <div className="rounded-xl bg-slate-850 p-3 border border-slate-800">
            <span className="text-slate-400 text-[11px] block">Trạng thái CIP</span>
            <span className="text-sm font-bold text-teal-400 mt-1.5 block">
              {activeCip?.status || 'READY'}
            </span>
            <span className="text-[10px] text-slate-400">Post-CIP 60m nếu có</span>
          </div>
        </div>
      </div>

      {/* Handovers History List */}
      <div className="space-y-3">
        <h3 className="font-bold text-sm text-slate-200">
          Lịch sử Bàn giao / Nhận ca trên {activeLine?.name} ({lineHandovers.length})
        </h3>

        {lineHandovers.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-8 text-center text-xs text-slate-500">
            Chưa có biên bản giao ca nào trên line này. Bấm &quot;Lập Biên bản Bàn giao Ca&quot; để bàn giao.
          </div>
        ) : (
          lineHandovers.map((h) => {
            const isReceived = !!h.receivedAt;
            const canReceive =
              (currentUser.role === 'LINE_LEADER' || currentUser.role === 'SUPERVISOR') && !isReceived;

            return (
              <div
                key={h.id}
                className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3 transition-all hover:border-slate-700"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-orange-600/20 border border-orange-500/40 px-2 py-0.5 text-xs font-bold text-orange-300">
                      {h.outgoingShiftId.replace('SHIFT_', 'Ca ')} → {h.incomingShiftId.replace('SHIFT_', 'Ca ')}
                    </span>
                    <span className="text-xs text-slate-300 font-medium">Ngày {formatDateVN(h.productionDate)}</span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Giao lúc: {formatDateTime(h.handedAt)}</span>
                  </div>
                </div>

                {/* Content */}
                <p className="text-xs text-slate-200 leading-relaxed font-sans">{h.content}</p>

                {/* Snapshot badges */}
                <div className="flex flex-wrap items-center gap-2 text-[11px] bg-slate-850 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-slate-400">Snapshot thời điểm giao:</span>
                  <span className="text-amber-400 font-semibold">{h.snapshot.activeAbnormalitiesCount} bất thường</span>
                  <span>·</span>
                  <span className="text-rose-400 font-semibold">{h.snapshot.ongoingLossCount} lần dừng đang mở</span>
                  <span>·</span>
                  <span className="text-emerald-400 font-semibold">{h.snapshot.remainingRuntimeHours}h Runtime ({h.snapshot.skuName})</span>
                  <span>·</span>
                  <span className="text-teal-400 font-semibold">CIP: {h.snapshot.cipStatus}</span>
                </div>

                {/* Pending Tasks */}
                {h.pendingTasks.length > 0 && (
                  <div className="space-y-1 text-xs">
                    <span className="text-slate-400 font-medium flex items-center gap-1 text-[11px]">
                      <ListTodo className="h-3 w-3" /> Công việc tồn bàn giao:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-0.5">
                      {h.pendingTasks.map((t) => (
                        <div
                          key={t.id}
                          className="flex items-center gap-1.5 text-slate-300 text-[11px] bg-slate-900 px-2 py-1 rounded"
                        >
                          <span className={t.isCompleted ? 'text-emerald-400' : 'text-slate-500'}>
                            {t.isCompleted ? '☑' : '☐'}
                          </span>
                          <span className={t.isCompleted ? 'line-through text-slate-500' : ''}>{t.task}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Signatures & Confirmations (AC-15: electronic user identity, no signature image required) */}
                <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="text-slate-400">
                    Người giao: <strong className="text-white">{h.outgoingUserName}</strong>
                  </div>

                  <div className="flex items-center gap-2">
                    {isReceived ? (
                      <div className="flex items-center gap-1.5 text-emerald-400 text-xs">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>
                          Đã nhận ca bởi <strong>{h.incomingUserName}</strong> ({formatDateTime(h.receivedAt!)})
                        </span>
                      </div>
                    ) : canReceive ? (
                      <button
                        onClick={() => confirmReceiveHandover(h.id)}
                        className="rounded bg-emerald-600 px-3 py-1 font-bold text-white hover:bg-emerald-500 shadow cursor-pointer text-xs"
                      >
                        Xác nhận Nhận Ca ({currentUser.displayName})
                      </button>
                    ) : (
                      <span className="text-amber-400 text-[11px] italic">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl p-5 space-y-4 my-6 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-base">Lập Biên bản Bàn giao Ca Điện tử</h3>
                <p className="text-slate-400 text-xs">
                  {activeLine?.name} · {selectedShiftId.replace('SHIFT_', 'Ca ')} → Ca nhận tiếp theo
                </p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white rounded p-1">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitHandover} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Ca bàn giao (Hiện tại)</label>
                  <input
                    type="text"
                    disabled
                    value={selectedShiftId.replace('SHIFT_', 'Ca ')}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-400 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Ca tiếp nhận</label>
                  <select
                    value={incomingShift}
                    onChange={(e) => setIncomingShift(e.target.value as ShiftId)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white font-bold focus:border-orange-500 focus:outline-none"
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
                <label className="block text-slate-300 font-semibold mb-1">
                  Nội dung tóm tắt bàn giao ca <span className="text-rose-400">*</span>
                </label>
                <textarea
                  rows={3}
                  value={handoverNote}
                  onChange={(e) => setHandoverNote(e.target.value)}
                  placeholder="Ghi nhận tình trạng thiết bị, tiến độ mẻ, vấn đề tồn đọng cần lưu ý..."
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 p-2.5 text-white placeholder-slate-500 focus:border-orange-500 focus:outline-none"
                  required
                />
              </div>

              {/* Tasks checklist */}
              <div className="space-y-2">
                <label className="block text-slate-300 font-semibold">Danh mục công việc tồn bàn giao</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTaskInput}
                    onChange={(e) => setNewTaskInput(e.target.value)}
                    placeholder="Thêm hạng mục công việc tồn ca sau tiếp tục..."
                    className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-white placeholder-slate-500"
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
                    className="rounded-lg bg-slate-800 px-3 py-1.5 font-bold text-slate-200 hover:bg-slate-700"
                  >
                    Thêm
                  </button>
                </div>

                <div className="max-h-32 overflow-y-auto space-y-1 pt-1">
                  {tasks.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between rounded bg-slate-850 p-2 border border-slate-800 text-slate-200"
                    >
                      <button
                        type="button"
                        onClick={() => handleToggleTask(t.id)}
                        className="flex items-center gap-2 text-left"
                      >
                        <span className={t.isCompleted ? 'text-emerald-400 font-bold' : 'text-slate-500 font-bold'}>
                          {t.isCompleted ? '✓' : '○'}
                        </span>
                        <span className={t.isCompleted ? 'line-through text-slate-500' : ''}>{t.task}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTask(t.id)}
                        className="text-slate-500 hover:text-rose-400 text-xs px-1"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-800 pt-3 flex items-center justify-between">
                <span className="text-slate-400 text-[11px]">
                  Người lập bàn giao: <strong className="text-white">{currentUser.displayName}</strong>
                </span>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="rounded-lg border border-slate-700 px-3 py-1.5 text-slate-300 hover:bg-slate-800"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-orange-600 px-4 py-1.5 font-bold text-white hover:bg-orange-500 shadow cursor-pointer"
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
