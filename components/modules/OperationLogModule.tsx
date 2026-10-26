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
        return { icon: Sparkles, color: 'text-sky-400 bg-sky-950/60 border-sky-800/60' };
      case 'Hóa lý':
        return { icon: FlaskConical, color: 'text-purple-400 bg-purple-950/60 border-purple-800/60' };
      case 'QA':
        return { icon: ShieldAlert, color: 'text-emerald-400 bg-emerald-950/60 border-emerald-800/60' };
      case 'CIP':
        return { icon: RotateCw, color: 'text-teal-400 bg-teal-950/60 border-teal-800/60' };
      case 'Utility':
        return { icon: Zap, color: 'text-amber-400 bg-amber-950/60 border-amber-800/60' };
      case 'Bảo trì':
        return { icon: Wrench, color: 'text-rose-400 bg-rose-950/60 border-rose-800/60' };
      case 'Điều chỉnh công nghệ':
        return { icon: Sliders, color: 'text-indigo-400 bg-indigo-950/60 border-indigo-800/60' };
      default:
        return { icon: FileText, color: 'text-slate-400 bg-slate-800/60 border-slate-700/60' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-sky-400" />
            <h2 className="text-base font-bold text-white">Nhật ký Vận hành Hiện trường (Timeline)</h2>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Ghi nhận dòng thời gian các sự kiện: Sản xuất, Hóa lý, QA, CIP, Công nghệ... trên {activeLine?.name}
          </p>
        </div>

        <button
          onClick={() => {
            setContent('');
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-orange-950/40 hover:bg-orange-500 transition-all cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Ghi Nhật ký Mới</span>
        </button>
      </div>

      {/* Filter by event group */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
        <span className="text-slate-400 flex items-center gap-1 shrink-0">
          <Filter className="h-3.5 w-3.5" /> Lọc:
        </span>
        <button
          onClick={() => setSelectedGroupFilter('ALL')}
          className={`px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-colors ${
            selectedGroupFilter === 'ALL'
              ? 'bg-orange-600 text-white'
              : 'bg-slate-800 text-slate-400 hover:text-white'
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
              className={`px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-colors ${
                selectedGroupFilter === g
                  ? 'bg-orange-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {g} {count > 0 && `(${count})`}
            </button>
          );
        })}
      </div>

      {/* Timeline List */}
      <div className="relative border-l-2 border-slate-800 ml-4 pl-6 space-y-6">
        {lineLogs.length === 0 ? (
          <div className="text-xs text-slate-500 py-6">
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
                <div className="absolute -left-[35px] top-1 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 border-2 border-slate-700 text-slate-300">
                  <Icon className="h-3 w-3" />
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3.5 transition-all hover:border-slate-700">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-slate-800/60 pb-2">
                    <div className="flex items-center gap-2">
                      <span className={`rounded border px-2 py-0.5 text-[10px] font-bold ${badge.color}`}>
                        {log.eventGroup}
                      </span>
                      {sku && (
                        <span className="text-[11px] font-semibold text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded">
                          SKU: {sku.name}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                      <Clock className="h-3 w-3" />
                      <span>{formatDateTime(log.occurredAt)}</span>
                      <span>·</span>
                      <span className="font-sans">{log.shiftId.replace('SHIFT_', 'Ca ')}</span>
                    </div>
                  </div>

                  <p className="mt-2 text-xs text-slate-200 leading-relaxed font-sans">{log.content}</p>

                  <div className="mt-2 text-[10px] text-slate-500">
                    Ghi nhận bởi: <span className="text-slate-400 font-medium">{log.reportedByName}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Log Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3.5 bg-slate-850">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-sky-400" />
                <h3 className="font-bold text-white text-sm">Ghi nhận Sự kiện Nhật ký Vận hành</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white rounded p-1">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Nhóm sự kiện</label>
                  <select
                    value={eventGroup}
                    onChange={(e) => setEventGroup(e.target.value as OperationEventGroup)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white font-medium focus:border-sky-500 focus:outline-none"
                  >
                    {EVENT_GROUPS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">SKU liên quan (tùy chọn)</label>
                  <select
                    value={skuId}
                    onChange={(e) => setSkuId(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white font-medium focus:border-sky-500 focus:outline-none"
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
                <label className="block font-semibold text-slate-300 mb-1">
                  Nội dung sự kiện hiện trường <span className="text-rose-400">*</span>
                </label>
                <textarea
                  rows={3}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Ví dụ: 09:15 Điều chỉnh pH, QA lấy mẫu kiểm tra vi sinh, đạt tiêu chuẩn màu sắc..."
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 p-2.5 text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
                  required
                />
              </div>

              <div className="border-t border-slate-800 pt-3 flex items-center justify-between">
                <span className="text-slate-400 text-[11px]">
                  Người ghi: <strong className="text-white">{currentUser.displayName}</strong>
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
