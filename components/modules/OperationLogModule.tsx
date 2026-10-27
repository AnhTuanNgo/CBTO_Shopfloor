'use client';

import React, { useState, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import { OperationEventGroup, OperationLog } from '@/lib/types';
import { formatDateTime, formatTime } from '@/lib/date-utils';
import {
  FileText,
  Plus,
  Clock,
  Sparkles,
  FlaskConical,
  ShieldAlert,
  Wrench,
  Zap,
  RotateCw,
  Sliders,
  Filter,
  X,
} from 'lucide-react';

const EVENT_GROUPS: OperationEventGroup[] = [
  'Sản xuất',
  'Hóa lý',
  'QA',
  'CIP',
  'Utility',
  'Bảo trì',
  'Điều chỉnh công nghệ',
  'Khác',
];

export function OperationLogModule() {
  const {
    currentUser,
    selectedLineId,
    lines,
    skus,
    operationLogs,
    addOperationLog,
  } = useAppStore();

  const activeLine = lines.find((l) => l.id === selectedLineId);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [eventGroup, setEventGroup] = useState<OperationEventGroup>('Sản xuất');
  const [skuId, setSkuId] = useState<string>('');
  const [content, setContent] = useState('');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>('ALL');

  const lineLogs = useMemo(() => {
    return operationLogs
      .filter((l) => l.lineId === selectedLineId)
      .filter((l) => (selectedGroupFilter === 'ALL' ? true : l.eventGroup === selectedGroupFilter))
      .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
  }, [operationLogs, selectedLineId, selectedGroupFilter]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    addOperationLog({
      lineId: selectedLineId,
      skuId: skuId || undefined,
      eventGroup,
      content: content.trim(),
    });

    setContent('');
    setIsModalOpen(false);
  };

  const getEventBadge = (group: OperationEventGroup) => {
    switch (group) {
      case 'Sản xuất':
        return { icon: Sparkles, color: 'text-blue-700 bg-blue-50 border-blue-200' };
      case 'Hóa lý':
        return { icon: FlaskConical, color: 'text-purple-700 bg-purple-50 border-purple-200' };
      case 'QA':
        return { icon: ShieldAlert, color: 'text-[#16865B] bg-emerald-50 border-emerald-200' };
      case 'CIP':
        return { icon: RotateCw, color: 'text-teal-700 bg-teal-50 border-teal-200' };
      case 'Utility':
        return { icon: Zap, color: 'text-[#D97706] bg-amber-50 border-amber-200' };
      case 'Bảo trì':
        return { icon: Wrench, color: 'text-[#C62828] bg-red-50 border-red-200' };
      case 'Điều chỉnh công nghệ':
        return { icon: Sliders, color: 'text-indigo-700 bg-indigo-50 border-indigo-200' };
      default:
        return { icon: FileText, color: 'text-gray-700 bg-gray-50 border-gray-200' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-[#E31837]">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#202124]">Nhật ký Vận hành Hiện trường (Timeline)</h2>
              <p className="mt-0.5 text-xs text-gray-500">
                Ghi nhận dòng thời gian các sự kiện: Sản xuất, Hóa lý, QA, CIP, Công nghệ... trên {activeLine?.name}
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            setContent('');
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 rounded-xl bg-[#E31837] px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-red-700 transition-all cursor-pointer active:scale-95"
        >
          <Plus className="h-4 w-4" />
          <span>Ghi Nhật ký Mới</span>
        </button>
      </div>

      {/* Filter by event group */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs scrollbar-none">
        <span className="text-gray-500 font-medium flex items-center gap-1 shrink-0 mr-1">
          <Filter className="h-3.5 w-3.5" /> Lọc:
        </span>
        <button
          onClick={() => setSelectedGroupFilter('ALL')}
          className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
            selectedGroupFilter === 'ALL'
              ? 'bg-[#E31837] text-white shadow-xs'
              : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}
        >
          Tất cả ({operationLogs.filter((l) => l.lineId === selectedLineId).length})
        </button>
        {EVENT_GROUPS.map((g) => {
          const count = operationLogs.filter((l) => l.lineId === selectedLineId && l.eventGroup === g).length;
          return (
            <button
              key={g}
              onClick={() => setSelectedGroupFilter(g)}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedGroupFilter === g
                  ? 'bg-[#E31837] text-white shadow-xs'
                  : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {g} {count > 0 && `(${count})`}
            </button>
          );
        })}
      </div>

      {/* Timeline List */}
      <div className="relative border-l-2 border-gray-200 ml-4 pl-6 space-y-5">
        {lineLogs.length === 0 ? (
          <div className="text-xs text-gray-400 py-6">
            Chưa có ghi nhận nhật ký nào theo bộ lọc trên {activeLine?.name}.
          </div>
        ) : (
          lineLogs.map((log) => {
            const badge = getEventBadge(log.eventGroup);
            const Icon = badge.icon;
            const sku = skus.find((s) => s.id === log.skuId);

            return (
              <div key={log.id} className="relative group">
                {/* Timeline node icon */}
                <div className="absolute -left-[37px] top-2 flex h-6 w-6 items-center justify-center rounded-full bg-white border-2 border-gray-300 text-gray-600 shadow-xs">
                  <Icon className="h-3 w-3" />
                </div>

                <div className="rounded-2xl border border-gray-200/80 bg-white p-4.5 transition-all shadow-xs hover:border-gray-300">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-gray-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${badge.color}`}>
                        {log.eventGroup}
                      </span>
                      {sku && (
                        <span className="text-[11px] font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-md">
                          SKU: {sku.name}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-gray-500 font-mono">
                      <Clock className="h-3.5 w-3.5 text-gray-400" />
                      <span>{formatDateTime(log.occurredAt)}</span>
                      <span>·</span>
                      <span className="font-sans font-medium text-[#202124]">{log.shiftId.replace('SHIFT_', 'Ca ')}</span>
                    </div>
                  </div>

                  <p className="mt-2.5 text-xs text-gray-800 leading-relaxed font-medium">{log.content}</p>

                  <div className="mt-2.5 text-[11px] text-gray-400">
                    Ghi nhận bởi: <span className="text-gray-700 font-semibold">{log.reportedByName}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Log Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-3xl border border-gray-200 bg-white shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 bg-gray-50/70">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-[#E31837]" />
                <h3 className="font-bold text-[#202124] text-sm">Ghi nhận Sự kiện Nhật ký Vận hành</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-700 rounded-full p-1 cursor-pointer hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1.5">Nhóm sự kiện</label>
                  <select
                    value={eventGroup}
                    onChange={(e) => setEventGroup(e.target.value as OperationEventGroup)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-[#202124] font-semibold focus:border-[#E31837] focus:outline-none"
                  >
                    {EVENT_GROUPS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1.5">SKU liên quan (tùy chọn)</label>
                  <select
                    value={skuId}
                    onChange={(e) => setSkuId(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-[#202124] font-semibold focus:border-[#E31837] focus:outline-none"
                  >
                    <option value="">-- Không chọn SKU --</option>
                    {skus.map((sku) => (
                      <option key={sku.id} value={sku.id}>
                        {sku.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1.5">
                  Nội dung sự kiện hiện trường <span className="text-[#E31837]">*</span>
                </label>
                <textarea
                  rows={3}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Ví dụ: 09:15 Điều chỉnh pH, QA lấy mẫu kiểm tra vi sinh, đạt tiêu chuẩn màu sắc..."
                  className="w-full rounded-xl border border-gray-200 bg-white p-3 text-[#202124] placeholder-gray-400 focus:border-[#E31837] focus:outline-none"
                  required
                />
              </div>

              <div className="border-t border-gray-100 pt-3.5 flex items-center justify-between">
                <span className="text-gray-500 text-[11px]">
                  Người ghi: <strong className="text-[#202124]">{currentUser.displayName}</strong>
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
                    Lưu vào Timeline
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
