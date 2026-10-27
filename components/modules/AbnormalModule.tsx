'use client';

import React, { useState, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import { formatDateTime } from '@/lib/date-utils';
import {
  AlertTriangle,
  Plus,
  CheckCircle2,
  Clock,
  Eye,
  Filter,
  Layers,
  X,
  AlertCircle,
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-[#D97706]">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#202124]">Ghi nhận Bất thường Hiện trường</h2>
              <p className="mt-0.5 text-xs text-gray-500">
                Ghi nhận dấu hiệu bất thường thực tế (dưới 30s) trên {activeLine?.name}. Tinh gọn, không tạo Work Order rườm rà.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {unacknowledgedCount > 0 && (
            <div className="flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs text-[#D97706] font-bold">
              <span className="h-2 w-2 rounded-full bg-[#D97706] animate-pulse" />
              <span>{unacknowledgedCount} chưa xem</span>
            </div>
          )}

          <button
            onClick={() => {
              setTargetEquipmentId(lineEquipments[0]?.id || '');
              setDescription('');
              setIsModalOpen(true);
            }}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 rounded-xl bg-[#E31837] px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-red-700 transition-all cursor-pointer active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>Ghi nhận Bất thường</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-gray-500 font-medium flex items-center gap-1 mr-1">
          <Filter className="h-3.5 w-3.5" /> Lọc trạng thái:
        </span>
        <button
          onClick={() => setFilterType('ALL')}
          className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
            filterType === 'ALL'
              ? 'bg-[#E31837] text-white shadow-xs'
              : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}
        >
          Tất cả ({abnormalLogs.filter((l) => l.lineId === selectedLineId).length})
        </button>
        <button
          onClick={() => setFilterType('UNACKNOWLEDGED')}
          className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
            filterType === 'UNACKNOWLEDGED'
              ? 'bg-[#D97706] text-white shadow-xs'
              : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}
        >
          Mới / Chưa xem ({unacknowledgedCount})
        </button>
        <button
          onClick={() => setFilterType('ACKNOWLEDGED')}
          className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
            filterType === 'ACKNOWLEDGED'
              ? 'bg-gray-800 text-white shadow-xs'
              : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}
        >
          Đã xem
        </button>
      </div>

      {/* Abnormal Logs List */}
      <div className="space-y-3">
        {filteredLogs.length === 0 ? (
          <div className="rounded-2xl border border-gray-200/80 bg-white p-10 text-center text-xs text-gray-400">
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
                className={`rounded-2xl border p-4 transition-all bg-white shadow-xs ${
                  isAcknowledged
                    ? 'border-gray-200/80 hover:border-gray-300'
                    : 'border-amber-300 bg-amber-50/20 ring-1 ring-amber-200/50'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#202124] text-sm">{log.equipmentName}</span>
                    <span className="text-[11px] font-bold text-[#D97706] bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                      {log.abnormalType}
                    </span>
                    {log.sourceAmId && (
                      <span className="text-[10px] text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full font-bold">
                        Nguồn AM
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1 font-mono text-[11px]">
                      <Clock className="h-3 w-3 text-gray-400" />
                      {formatDateTime(log.occurredAt)}
                    </span>
                    <span>·</span>
                    <span className="font-medium text-[#202124]">{log.shiftId.replace('SHIFT_', 'Ca ')}</span>
                  </div>
                </div>

                <div className="mt-3 text-xs text-gray-800 leading-relaxed font-medium">{log.description}</div>

                <div className="mt-3.5 pt-3 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]">
                  <div className="text-gray-500">
                    Người ghi nhận: <strong className="text-[#202124]">{log.reportedByName}</strong>
                  </div>

                  <div className="flex items-center gap-3">
                    {isAcknowledged ? (
                      <div className="flex items-center gap-1.5 text-[#16865B] font-semibold">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>
                          Đã xem bởi <strong>{log.acknowledgedByName}</strong> ({formatDateTime(log.acknowledgedAt!)})
                        </span>
                      </div>
                    ) : canAcknowledge ? (
                      <button
                        onClick={() => acknowledgeAbnormalLog(log.id)}
                        className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-3.5 py-1.5 font-bold text-white hover:bg-amber-600 shadow-xs cursor-pointer transition-colors active:scale-95"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Xác nhận đã xem</span>
                      </button>
                    ) : (
                      <span className="text-[#D97706] italic font-medium">Chờ Tổ trưởng/Supervisor xem</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Quick Add Abnormality Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-3xl border border-gray-200 bg-white shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 bg-gray-50/70">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-[#D97706]" />
                <h3 className="font-bold text-[#202124] text-sm">Ghi nhận Bất thường Hiện trường</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-700 rounded-full p-1 cursor-pointer hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1.5">Thiết bị phát hiện bất thường</label>
                <select
                  value={targetEquipmentId}
                  onChange={(e) => setTargetEquipmentId(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-[#202124] font-semibold focus:border-[#E31837] focus:outline-none"
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
                <label className="block font-bold text-gray-700 mb-1.5">Loại bất thường</label>
                <select
                  value={abnormalType}
                  onChange={(e) => setAbnormalType(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-[#202124] font-semibold focus:border-[#E31837] focus:outline-none"
                >
                  {COMMON_ABNORMAL_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1.5">
                  Mô tả dấu hiệu bất thường thực tế <span className="text-[#E31837]">*</span>
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ví dụ: Áp suất hơi sụt dưới 3.5 bar, tiếng rít lớn tại van giảm áp, cánh khuấy bị giật nhẹ..."
                  className="w-full rounded-xl border border-gray-200 bg-white p-3 text-[#202124] placeholder-gray-400 focus:border-[#E31837] focus:outline-none"
                  required
                />
              </div>

              <div className="border-t border-gray-100 pt-3.5 flex items-center justify-between">
                <span className="text-gray-500 text-[11px]">
                  Người ghi nhận: <strong className="text-[#202124]">{currentUser.displayName}</strong>
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
