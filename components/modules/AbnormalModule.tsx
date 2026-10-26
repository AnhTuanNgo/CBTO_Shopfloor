'use client';

import React, { useState, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import { formatDateTime } from '@/lib/date-utils';
import {
  AlertTriangle,
  Plus,
  CheckCircle,
  Clock,
  Eye,
  Filter,
  Layers,
} from 'lucide-react';

const COMMON_ABNORMAL_TYPES = [
  'Vacuum yếu',
  'Nhiệt độ bất thường',
  'Tiếng ồn lớn / Rung giật',
  'Rò rỉ cơ khí / Phốt bồn',
  'Steam không ổn định',
  'Cảm biến sai lệch',
  'Áp suất khí nén sụt áp',
  'Khác',
];

export function AbnormalModule() {
  const {
    currentUser,
    selectedLineId,
    lines,
    getEquipmentsByLine,
    abnormalLogs,
    addAbnormalLog,
    acknowledgeAbnormalLog,
  } = useAppStore();

  const lineEquipments = useMemo(() => getEquipmentsByLine(selectedLineId), [getEquipmentsByLine, selectedLineId]);
  const activeLine = lines.find((l) => l.id === selectedLineId);

  // New log form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [targetEquipmentId, setTargetEquipmentId] = useState(lineEquipments[0]?.id || '');
  const [abnormalType, setAbnormalType] = useState(COMMON_ABNORMAL_TYPES[0]);
  const [description, setDescription] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');

  const filteredLogs = useMemo(() => {
    return abnormalLogs
      .filter((log) => log.lineId === selectedLineId)
      .filter((log) => {
        if (filterType === 'UNACKNOWLEDGED') return !log.acknowledgedAt;
        if (filterType === 'ACKNOWLEDGED') return !!log.acknowledgedAt;
        return true;
      });
  }, [abnormalLogs, selectedLineId, filterType]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !targetEquipmentId) return;

    addAbnormalLog({
      lineId: selectedLineId,
      equipmentId: targetEquipmentId,
      abnormalType,
      description: description.trim(),
    });

    setDescription('');
    setIsModalOpen(false);
  };

  const unacknowledgedCount = abnormalLogs.filter((a) => a.lineId === selectedLineId && !a.acknowledgedAt).length;

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-400" />
            <h2 className="text-base font-bold text-white">Ghi nhận Bất thường Hiện trường</h2>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Ghi nhận dấu hiệu bất thường thực tế (dưới 30s) trên {activeLine?.name}. Không tạo Work Order phức tạp.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {unacknowledgedCount > 0 && (
            <div className="flex items-center gap-1.5 rounded-lg bg-amber-950/50 border border-amber-800/60 px-3 py-1.5 text-xs text-amber-300 font-semibold">
              <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
              <span>{unacknowledgedCount} chưa xem</span>
            </div>
          )}

          <button
            onClick={() => {
              setTargetEquipmentId(lineEquipments[0]?.id || '');
              setDescription('');
              setIsModalOpen(true);
            }}
            className="flex items-center gap-1.5 rounded-lg bg-orange-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-orange-950/40 hover:bg-orange-500 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Ghi nhận Bất thường</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-slate-400 flex items-center gap-1">
          <Filter className="h-3.5 w-3.5" /> Lọc trạng thái:
        </span>
        <button
          onClick={() => setFilterType('ALL')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
            filterType === 'ALL' ? 'bg-orange-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          Tất cả ({abnormalLogs.filter((l) => l.lineId === selectedLineId).length})
        </button>
        <button
          onClick={() => setFilterType('UNACKNOWLEDGED')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
            filterType === 'UNACKNOWLEDGED' ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          Mới / Chưa xem ({unacknowledgedCount})
        </button>
        <button
          onClick={() => setFilterType('ACKNOWLEDGED')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
            filterType === 'ACKNOWLEDGED' ? 'bg-slate-700 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          Đã xem
        </button>
      </div>

      {/* Abnormal Logs List */}
      <div className="space-y-3">
        {filteredLogs.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-8 text-center text-xs text-slate-500">
            Không có ghi nhận bất thường nào trên {activeLine?.name}.
          </div>
        ) : (
          filteredLogs.map((log) => {
            const isAcknowledged = !!log.acknowledgedAt;
            const canAcknowledge =
              (currentUser.role === 'LINE_LEADER' || currentUser.role === 'SUPERVISOR') && !isAcknowledged;

            return (
              <div
                key={log.id}
                className={`rounded-xl border p-4 transition-all ${
                  isAcknowledged
                    ? 'border-slate-800 bg-slate-900/40 opacity-80'
                    : 'border-amber-500/40 bg-amber-950/20 shadow-sm'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/60 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">{log.equipmentName}</span>
                    <span className="text-[11px] font-semibold text-amber-400 bg-amber-950/60 border border-amber-800/40 px-2 py-0.5 rounded">
                      {log.abnormalType}
                    </span>
                    {log.sourceAmId && (
                      <span className="text-[10px] text-sky-400 bg-sky-950/50 border border-sky-800/40 px-1.5 py-0.5 rounded">
                        Nguồn AM
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1 font-mono text-[11px]">
                      <Clock className="h-3 w-3" />
                      {formatDateTime(log.occurredAt)}
                    </span>
                    <span>·</span>
                    <span>{log.shiftId.replace('SHIFT_', 'Ca ')}</span>
                  </div>
                </div>

                <div className="mt-2.5 text-xs text-slate-200 leading-relaxed">{log.description}</div>

                <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]">
                  <div className="text-slate-400">
                    Người ghi nhận: <strong className="text-slate-300">{log.reportedByName}</strong>
                  </div>

                  <div className="flex items-center gap-3">
                    {isAcknowledged ? (
                      <div className="flex items-center gap-1.5 text-emerald-400">
                        <CheckCircle className="h-3.5 w-3.5" />
                        <span>
                          Đã xem bởi <strong>{log.acknowledgedByName}</strong> ({formatDateTime(log.acknowledgedAt!)})
                        </span>
                      </div>
                    ) : canAcknowledge ? (
                      <button
                        onClick={() => acknowledgeAbnormalLog(log.id)}
                        className="flex items-center gap-1.5 rounded bg-amber-600 px-3 py-1 font-bold text-white hover:bg-amber-500 shadow-sm cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Xác nhận đã xem</span>
                      </button>
                    ) : (
                      <span className="text-amber-400/80 italic">Chờ Tổ trưởng/Supervisor xem</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Quick Add Abnormality Modal (< 30s) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3.5 bg-slate-850">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                <h3 className="font-bold text-white text-sm">Ghi nhận Bất thường Hiện trường</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white rounded p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Thiết bị phát hiện bất thường</label>
                <select
                  value={targetEquipmentId}
                  onChange={(e) => setTargetEquipmentId(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white font-medium focus:border-orange-500 focus:outline-none"
                  required
                >
                  {lineEquipments.map((eq) => (
                    <option key={eq.id} value={eq.id}>
                      [{eq.code}] {eq.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Loại bất thường</label>
                <select
                  value={abnormalType}
                  onChange={(e) => setAbnormalType(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white font-medium focus:border-orange-500 focus:outline-none"
                >
                  {COMMON_ABNORMAL_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Mô tả dấu hiệu bất thường thực tế <span className="text-rose-400">*</span>
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ví dụ: Áp suất hơi sụt dưới 3.5 bar, tiếng rít lớn tại van giảm áp, cánh khuấy bị giật nhẹ..."
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 p-2.5 text-white placeholder-slate-500 focus:border-orange-500 focus:outline-none"
                  required
                />
              </div>

              <div className="border-t border-slate-800 pt-3 flex items-center justify-between">
                <span className="text-slate-400 text-[11px]">
                  Người ghi nhận: <strong className="text-white">{currentUser.displayName}</strong>
                </span>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="rounded-lg border border-slate-700 px-3 py-1.5 font-semibold text-slate-300 hover:bg-slate-800"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-orange-600 px-4 py-1.5 font-bold text-white hover:bg-orange-500 shadow-md cursor-pointer"
                  >
                    Lưu ghi nhận
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
